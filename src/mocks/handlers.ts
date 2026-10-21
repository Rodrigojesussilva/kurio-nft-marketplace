import { http, HttpResponse, delay, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { formatEth, parseEth } from '../lib/eth'
import { catalogNfts, demoAccounts, defaultCart, type Account, type CartEntry, type CartLine, type NFT, type Order, type Wallet } from './fixtures'

type User = Account & { passwordHash: string; version: number }
type Session = { userId: string; expiresAt: number }
type Idempotency = { fingerprint: string; orderId: string; userId: string; firstAttemptReturnedTimeout: boolean }
type Database = {
  users: User[]
  sessions: Record<string, Session>
  nfts: NFT[]
  carts: Record<string, CartLine[]>
  favorites: Record<string, string[]>
  wallets: Record<string, Wallet[]>
  orders: Record<string, Order & { userId: string; purchased: CartLine[] }>
  idempotency: Record<string, Idempotency>
  eventSequence: number
}

const DB_KEY = 'kurio-mock-database-v1'
const demoPassword = 'kurio123'
const networkFeeEth = '0.016'
const socketClients = new Set<{ userId: string | null; emit: (name: string, payload: unknown) => void; close: () => void }>()
let database: Database | undefined
let requestSequence = 0
let priceScenarioChanged = false
let socketDisconnectTriggered = false

const hashPassword = async (password: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const toPublicAccount = (user: User): Account => {
  const { passwordHash: _passwordHash, version: _version, ...account } = user
  return account
}

const saveDatabase = () => {
  if (!database) return
  try { localStorage.setItem(DB_KEY, JSON.stringify(database)) } catch { /* storage can be disabled in private mode */ }
}

const getDatabase = async (): Promise<Database> => {
  if (database) return database
  try {
    const saved = localStorage.getItem(DB_KEY)
    if (saved) {
      database = JSON.parse(saved) as Database
      database.users = database.users.map((user) => ({ username: user.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), ens: `${user.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.eth`, walletAlias: 'Minha carteira', ...user }))
      const savedById = new Map(database.nfts.map((nft) => [nft.id, nft]))
      database.nfts = catalogNfts.map((fixture) => {
        const savedNft = savedById.get(fixture.id)
        return savedNft ? { ...fixture, ...savedNft, name: fixture.name, image: fixture.image } : structuredClone(fixture)
      })
      saveDatabase()
      return database
    }
  } catch { /* reset to the deterministic fixture below */ }

  const passwordHash = await hashPassword(demoPassword)
  database = {
    users: demoAccounts.map((account) => ({ ...account, passwordHash, version: 1 })),
    sessions: {},
    nfts: structuredClone(catalogNfts),
    carts: { guest: structuredClone(defaultCart) },
    favorites: {},
    wallets: {
      'user-ana': [{ id: 'wallet-ana-1', name: 'Minha carteira', address: '0x71C7000000000000000000000000000000009A42', network: 'Ethereum', primary: true, displayName: 'Ana Colecionadora', profileName: 'Ana Colecionadora', secondaryWallet: '', walletType: 'MetaMask', referralCode: 'KURIO10', email: 'ana@kurio.test', ensName: 'ana.eth' }],
      'user-caio': [],
    },
    orders: {},
    idempotency: {},
    eventSequence: 0,
  }
  saveDatabase()
  return database
}

const scenario = () => {
  try { return localStorage.getItem('kurio-scenario') ?? new URL(location.href).searchParams.get('scenario') ?? 'standard' }
  catch { return 'standard' }
}

const scenarioDelay = async () => {
  const current = scenario()
  if (current === 'offline') throw new Error('Simulated offline connection.')
  if (current === 'network-timeout') { await delay(10_000); return }
  if (current === 'slow') await delay(1400)
  else if (current === 'variable-latency') {
    requestSequence += 1
    await delay(requestSequence % 2 === 0 ? 700 : 100)
  } else await delay(180)
}

const error = (status: number, code: string, message: string, details?: unknown) =>
  HttpResponse.json({ error: { code, message, details } }, { status })

type Identity = { userId: string; user: Account | null }
type AuthorizedIdentity = Identity | { response: Response }
function getIdentity(request: Request, required: true): Promise<AuthorizedIdentity>
function getIdentity(request: Request, required?: false): Promise<Identity>
async function getIdentity(request: Request, required = false): Promise<AuthorizedIdentity> {
  const db = await getDatabase()
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const session = token ? db.sessions[token] : undefined
  if (!token || !session || session.expiresAt <= Date.now() || scenario() === 'expired-session') {
    if (required) return { response: error(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') }
    return { userId: 'guest', user: null }
  }
  const user = db.users.find((candidate) => candidate.id === session.userId)
  if (!user) return required
    ? { response: error(401, 'SESSION_INVALID', 'Sessão inválida.') }
    : { userId: 'guest', user: null }
  return { userId: user.id, user: toPublicAccount(user) }
}

const emitEvent = (name: string, payload: unknown, userId?: string) => {
  for (const client of socketClients) {
    if (userId && client.userId !== userId) continue
    client.emit(name, payload)
  }
}

const getNft = (db: Database, id: string) => db.nfts.find((nft) => nft.id === id)
const getCartEntries = (db: Database, userId: string): CartEntry[] => (db.carts[userId] ?? []).flatMap((line) => {
  const nft = getNft(db, line.nftId)
  return nft ? [{ ...line, nft }] : []
})
const subtotalOf = (lines: CartEntry[]) => lines.reduce((sum, line) => sum + parseEth(line.nft.priceEth) * BigInt(line.quantity), 0n)
const validateAvailability = (db: Database, lines: CartLine[]) => {
  for (const line of lines) {
    const nft = getNft(db, line.nftId)
    const edition = nft?.edition.find((item) => item.id === line.editionId)
    if (scenario() === 'sold-out' && nft?.id === '042') return { code: 'EDITION_SOLD_OUT', message: 'Esta edição esgotou durante a compra.' }
    if (!nft || !edition) return { code: 'NFT_NOT_FOUND', message: `NFT ${line.nftId} não encontrado.` }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > edition.maxPerOrder) return { code: 'QUANTITY_LIMIT', message: `Quantidade inválida para ${nft.name}.` }
    if (line.quantity > edition.available) return { code: 'EDITION_SOLD_OUT', message: `A edição ${edition.label} de ${nft.name} não tem essa quantidade disponível.` }
  }
  return null
}

const applyPurchase = (db: Database, order: Order & { userId: string; purchased: CartLine[] }) => {
  for (const line of order.purchased) {
    const nft = getNft(db, line.nftId)
    const edition = nft?.edition.find((item) => item.id === line.editionId)
    if (nft && edition) {
      edition.available = Math.max(0, edition.available - line.quantity)
      nft.version += 1
      emitEvent('nft.updated', { id: nft.id, resource: 'nft', version: nft.version, nft }, order.userId)
    }
  }
  const remaining = db.carts[order.userId] ?? []
  db.carts[order.userId] = remaining.flatMap((line) => {
    const bought = order.purchased.find((item) => item.nftId === line.nftId && item.editionId === line.editionId)
    const quantity = line.quantity - (bought?.quantity ?? 0)
    return quantity > 0 ? [{ ...line, quantity }] : []
  })
  order.status = 'confirmed'
  order.version += 1
  order.transaction = `0x${order.id.replace(/\D/g, '').padEnd(64, 'a').slice(0, 64)}`
  saveDatabase()
  emitEvent('order.updated', { id: order.id, resource: 'order', version: order.version, status: order.status, transaction: order.transaction }, order.userId)
}

const listNfts = http.get('/api/nfts', async ({ request }) => {
  await scenarioDelay()
  if (scenario() === 'http-500') return error(500, 'CATALOG_UNAVAILABLE', 'Catálogo temporariamente indisponível.')
  const db = await getDatabase()
  const params = new URL(request.url).searchParams
  const query = (params.get('q') ?? '').trim().toLocaleLowerCase('pt-BR')
  const category = params.get('category')
  const network = params.get('network')
  const artist = params.get('artist')
  const minPrice = params.get('minPrice')
  const maxPrice = params.get('maxPrice')
  const sort = params.get('sort') ?? 'recent'
  const page = Math.max(1, Number(params.get('page') ?? 1))
  const pageSize = Math.min(24, Math.max(1, Number(params.get('pageSize') ?? 9)))
  let items = scenario() === 'empty' ? [] : db.nfts.filter((nft) => {
    const matchesQuery = !query || `${nft.name} ${nft.collection} ${nft.artist}`.toLocaleLowerCase('pt-BR').includes(query)
    return matchesQuery && (!category || nft.category === category) && (!network || nft.network === network) && (!artist || nft.artist === artist)
      && (!minPrice || parseEth(nft.priceEth) >= parseEth(minPrice)) && (!maxPrice || parseEth(nft.priceEth) <= parseEth(maxPrice))
  })
  if (sort === 'price-asc') items = [...items].sort((a, b) => parseEth(a.priceEth) < parseEth(b.priceEth) ? -1 : parseEth(a.priceEth) > parseEth(b.priceEth) ? 1 : 0)
  if (sort === 'price-desc') items = [...items].sort((a, b) => parseEth(a.priceEth) > parseEth(b.priceEth) ? -1 : parseEth(a.priceEth) < parseEth(b.priceEth) ? 1 : 0)
  if (sort === 'rating') items = [...items].sort((a, b) => b.rating - a.rating)
  const total = items.length
  return HttpResponse.json({ items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, scenario: scenario() })
})

const handlers = [
  http.get('/api/health', () => HttpResponse.json({ ok: true, transport: 'msw-rest+socket.io-binding' })),
  listNfts,
  http.get('/api/nfts/:id', async ({ params }) => {
    await scenarioDelay()
    const db = await getDatabase()
    const nft = getNft(db, String(params.id))
    if (!nft) return error(404, 'NFT_NOT_FOUND', 'NFT não encontrado.')
    if (scenario() === 'sold-out' && nft.id === '042') return HttpResponse.json({ ...nft, edition: nft.edition.map((item) => ({ ...item, available: 0 })) })
    return HttpResponse.json(nft, { headers: { ETag: `"nft-${nft.id}-${nft.version}"` } })
  }),

  http.post('/api/session/register', async ({ request }) => {
    await scenarioDelay()
    const db = await getDatabase()
    const body = await request.json() as { name?: string; email?: string; password?: string }
    if (!body.name?.trim() || !body.email?.includes('@') || (body.password?.length ?? 0) < 8) return error(422, 'VALIDATION_ERROR', 'Revise nome, e-mail e senha.', { fields: { password: 'Use ao menos 8 caracteres.' } })
    if (db.users.some((user) => user.email.toLowerCase() === body.email!.toLowerCase())) return error(409, 'EMAIL_IN_USE', 'Este e-mail já está cadastrado.')
    const id = `user-${crypto.randomUUID()}`
    const normalizedName = body.name.trim()
    const user: User = { id, name: normalizedName, email: body.email.trim().toLowerCase(), avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(body.name)}`, username: normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '_'), ens: `${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.eth`, walletAlias: 'Minha carteira', passwordHash: await hashPassword(body.password!), version: 1 }
    db.users.push(user)
    db.carts[id] = db.carts.guest ?? []
    db.carts.guest = []
    db.favorites[id] = []
    db.wallets[id] = []
    const token = `demo-${crypto.randomUUID()}`
    db.sessions[token] = { userId: id, expiresAt: Date.now() + 60 * 60 * 1000 }
    localStorage.setItem('token', token)
    saveDatabase()
    return HttpResponse.json({ user: toPublicAccount(user), token }, { status: 201 })
  }),
  http.post('/api/session/login', async ({ request }) => {
    await scenarioDelay()
    const db = await getDatabase()
    const body = await request.json() as { email?: string; password?: string }
    const user = db.users.find((candidate) => candidate.email.toLowerCase() === body.email?.toLowerCase())
    if (!user || user.passwordHash !== await hashPassword(body.password ?? '')) return error(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    const guestCart = db.carts.guest ?? []
    const userCart = db.carts[user.id] ?? []
    for (const guestLine of guestCart) {
      const nft = getNft(db, guestLine.nftId)
      const edition = nft?.edition.find((item) => item.id === guestLine.editionId)
      const limit = edition ? Math.min(edition.available, edition.maxPerOrder) : 0
      if (!limit) continue
      const existing = userCart.find((line) => line.nftId === guestLine.nftId && line.editionId === guestLine.editionId)
      if (existing) existing.quantity = Math.min(limit, existing.quantity + guestLine.quantity)
      else userCart.push({ ...guestLine, quantity: Math.min(limit, guestLine.quantity) })
    }
    db.carts[user.id] = userCart
    db.carts.guest = []
    const token = `demo-${crypto.randomUUID()}`
    db.sessions[token] = { userId: user.id, expiresAt: Date.now() + (scenario() === 'short-session' ? 30_000 : 60 * 60 * 1000) }
    localStorage.setItem('token', token)
    saveDatabase()
    return HttpResponse.json({ user: toPublicAccount(user), token })
  }),
  http.get('/api/session', async ({ request }) => {
    await scenarioDelay()
    const identity = await getIdentity(request, true)
    if ('response' in identity) { localStorage.removeItem('token'); return identity.response }
    const db = await getDatabase()
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    return HttpResponse.json({ user: identity.user, expiresAt: db.sessions[token]?.expiresAt })
  }),
  http.post('/api/session/logout', async ({ request }) => {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    const db = await getDatabase()
    if (token) delete db.sessions[token]
    localStorage.removeItem('token')
    saveDatabase()
    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/favorites', async ({ request }) => {
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    const db = await getDatabase()
    return HttpResponse.json({ ids: db.favorites[identity.userId] ?? [] })
  }),
  http.post('/api/favorites/:id', async ({ request, params }) => {
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    const db = await getDatabase()
    const id = String(params.id)
    if (!getNft(db, id)) return error(404, 'NFT_NOT_FOUND', 'NFT não encontrado.')
    if (scenario() === 'mutation-failure') return error(503, 'FAVORITE_UNAVAILABLE', 'Não foi possível salvar o favorito.')
    db.favorites[identity.userId] ??= []
    if (!db.favorites[identity.userId].includes(id)) db.favorites[identity.userId].push(id)
    saveDatabase()
    return HttpResponse.json({ ids: db.favorites[identity.userId] }, { status: 201 })
  }),
  http.delete('/api/favorites/:id', async ({ request, params }) => {
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    const db = await getDatabase()
    db.favorites[identity.userId] = (db.favorites[identity.userId] ?? []).filter((id) => id !== params.id)
    saveDatabase()
    return HttpResponse.json({ ids: db.favorites[identity.userId] })
  }),

  http.get('/api/cart', async ({ request }) => {
    await scenarioDelay()
    const identity = await getIdentity(request)
    const db = await getDatabase()
    return HttpResponse.json({ items: getCartEntries(db, identity.userId) })
  }),
  http.post('/api/cart/items', async ({ request }) => {
    const db = await getDatabase()
    const identity = await getIdentity(request)
    const line = await request.json() as CartLine
    const validation = validateAvailability(db, [line])
    if (validation) return error(409, validation.code, validation.message)
    const cart = db.carts[identity.userId] ?? []
    const existing = cart.find((item) => item.nftId === line.nftId && item.editionId === line.editionId)
    const quantity = (existing?.quantity ?? 0) + line.quantity
    const quantityValidation = validateAvailability(db, [{ ...line, quantity }])
    if (quantityValidation) return error(409, quantityValidation.code, quantityValidation.message)
    if (existing) existing.quantity = quantity
    else cart.push(line)
    db.carts[identity.userId] = cart
    saveDatabase()
    return HttpResponse.json({ items: getCartEntries(db, identity.userId) }, { status: 201 })
  }),
  http.patch('/api/cart/items/:nftId/:editionId', async ({ request, params }) => {
    const identity = await getIdentity(request)
    const db = await getDatabase()
    const body = await request.json() as { quantity: number }
    const line = { nftId: String(params.nftId), editionId: String(params.editionId), quantity: body.quantity }
    const validation = validateAvailability(db, [line])
    if (validation) return error(409, validation.code, validation.message)
    db.carts[identity.userId] = (db.carts[identity.userId] ?? []).map((item) => item.nftId === line.nftId && item.editionId === line.editionId ? line : item)
    saveDatabase()
    return HttpResponse.json({ items: getCartEntries(db, identity.userId) })
  }),
  http.delete('/api/cart/items/:nftId/:editionId', async ({ request, params }) => {
    const identity = await getIdentity(request)
    const db = await getDatabase()
    db.carts[identity.userId] = (db.carts[identity.userId] ?? []).filter((item) => item.nftId !== params.nftId || item.editionId !== params.editionId)
    saveDatabase()
    return HttpResponse.json({ items: getCartEntries(db, identity.userId) })
  }),

  http.post('/api/quote', async ({ request }) => {
    await scenarioDelay()
    const db = await getDatabase()
    const body = await request.json() as { items?: CartLine[]; coupon?: string; expectedVersions?: Record<string, number> }
    const lines = body.items ?? []
    const validation = validateAvailability(db, lines)
    if (validation) return error(409, validation.code, validation.message)
    const changedNft = getNft(db, lines[0]?.nftId ?? '')
    if (scenario() === 'price-changed' && changedNft && !priceScenarioChanged) { priceScenarioChanged = true; changedNft.priceEth = formatEth(parseEth(changedNft.priceEth) + parseEth('0.1')); changedNft.version += 1; saveDatabase(); emitEvent('nft.updated', { id: changedNft.id, resource: 'nft', version: changedNft.version, nft: changedNft }) }
    const currentLines = lines.flatMap((line) => { const nft = getNft(db, line.nftId); return nft ? [{ ...line, nft }] : [] })
    const subtotal = subtotalOf(currentLines)
    const code = body.coupon?.trim().toUpperCase() ?? ''
    if (code && code !== 'KURIO10') return error(422, code === 'EXPIRED' ? 'COUPON_EXPIRED' : 'COUPON_INVALID', code === 'EXPIRED' ? 'Cupom expirado.' : 'Cupom inválido.')
    const discount = code === 'KURIO10' ? subtotal / 10n : 0n
    const fee = parseEth(networkFeeEth)
    const versions = Object.fromEntries(currentLines.map((line) => [line.nftId, line.nft.version]))
    const stale = Object.entries(body.expectedVersions ?? {}).some(([id, version]) => versions[id] !== version)
    return HttpResponse.json({ quoteId: crypto.randomUUID(), items: currentLines, subtotalEth: formatEth(subtotal), discountEth: formatEth(discount), networkFeeEth: networkFeeEth, totalEth: formatEth(subtotal - discount + fee), versions, requiresReconfirmation: stale })
  }),

  http.post('/api/orders', async ({ request }) => {
    await scenarioDelay()
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    const key = request.headers.get('Idempotency-Key')
    if (!key) return error(400, 'IDEMPOTENCY_KEY_REQUIRED', 'A chave de idempotência é obrigatória.')
    const db = await getDatabase()
    const body = await request.json() as { items?: CartLine[]; payment?: string; walletAddress?: string; coupon?: string; collector?: { name: string; email: string }; quote?: { subtotalEth: string; discountEth: string; networkFeeEth: string; totalEth: string; versions: Record<string, number> } }
    if (!body.quote) return error(422, 'QUOTE_REQUIRED', 'Atualize a cotação antes de finalizar.')
    if (!body.collector?.name?.trim() || !body.collector.email?.includes('@')) return error(422, 'COLLECTOR_REQUIRED', 'Informe os dados do colecionador.')
    const fingerprint = JSON.stringify({
      items: body.items, payment: body.payment, walletAddress: body.walletAddress, coupon: body.coupon, collector: body.collector,
      quote: { subtotalEth: body.quote.subtotalEth, discountEth: body.quote.discountEth, networkFeeEth: body.quote.networkFeeEth, totalEth: body.quote.totalEth, versions: body.quote.versions },
    })
    const previous = db.idempotency[key]
    if (previous) {
      if (previous.userId !== identity.userId) return error(403, 'FORBIDDEN', 'Esta chave de idempotência pertence a outra conta.')
      if (previous.fingerprint !== fingerprint) return error(409, 'IDEMPOTENCY_CONFLICT', 'A chave já foi usada com outro pedido.')
      if (scenario() === 'timeout-after-create' && !previous.firstAttemptReturnedTimeout) { previous.firstAttemptReturnedTimeout = true; saveDatabase(); return error(504, 'REQUEST_TIMEOUT', 'A resposta expirou; repita a mesma tentativa para recuperar o pedido.') }
      return HttpResponse.json(db.orders[previous.orderId])
    }
    const purchased = body.items ?? db.carts[identity.userId] ?? []
    const validation = validateAvailability(db, purchased)
    if (validation) return error(409, validation.code, validation.message)
    const entries = purchased.flatMap((line) => { const nft = getNft(db, line.nftId); return nft ? [{ ...line, nft }] : [] })
    const versions = Object.fromEntries(entries.map((line) => [line.nftId, line.nft.version]))
    const quoteVersions = body.quote.versions
    const quoteStale = Object.keys(quoteVersions).length !== Object.keys(versions).length || Object.entries(versions).some(([id, version]) => quoteVersions[id] !== version)
    if (quoteStale) return error(409, 'QUOTE_STALE', 'Preço ou disponibilidade mudou. Revise o novo total antes de continuar.', { versions })
    const code = body.coupon?.trim().toUpperCase() ?? ''
    if (code && code !== 'KURIO10') return error(422, code === 'EXPIRED' ? 'COUPON_EXPIRED' : 'COUPON_INVALID', 'O cupom não pode ser aplicado.')
    const currentSubtotal = subtotalOf(entries)
    const currentDiscount = code === 'KURIO10' ? currentSubtotal / 10n : 0n
    const currentFee = parseEth(networkFeeEth)
    if (body.quote.subtotalEth !== formatEth(currentSubtotal) || body.quote.discountEth !== formatEth(currentDiscount) || body.quote.networkFeeEth !== formatEth(currentFee) || body.quote.totalEth !== formatEth(currentSubtotal - currentDiscount + currentFee)) return error(409, 'QUOTE_STALE', 'A cotação mudou. Confira os valores e confirme novamente.', { versions })
    if (scenario() === 'payment-rejected') return error(402, 'PAYMENT_REJECTED', 'O pagamento foi recusado. Os itens continuam no carrinho.')
    const orderId = `KUR-${Date.now().toString().slice(-8)}`
    const order: Order & { userId: string; purchased: CartLine[] } = {
      id: orderId,
      status: 'pending',
      transaction: '',
      items: structuredClone(entries),
      subtotalEth: body.quote.subtotalEth,
      discountEth: body.quote.discountEth,
      networkFeeEth: body.quote.networkFeeEth,
      totalEth: body.quote.totalEth,
      payment: body.payment ?? 'Carteira Ethereum',
      walletAddress: body.walletAddress ?? '',
      collector: { name: body.collector.name.trim(), email: body.collector.email.trim().toLowerCase() },
      createdAt: new Date().toISOString(),
      version: 1,
      userId: identity.userId,
      purchased,
    }
    db.orders[orderId] = order
    db.idempotency[key] = { fingerprint, orderId, userId: identity.userId, firstAttemptReturnedTimeout: false }
    saveDatabase()
    if (scenario() === 'socket-disconnect-pending-order') {
      const pendingClient = [...socketClients].find((client) => client.userId === identity.userId)
      setTimeout(() => pendingClient?.close(), 100)
    }
    setTimeout(async () => {
      const current = await getDatabase()
      const currentOrder = current.orders[orderId]
      if (!currentOrder || currentOrder.status !== 'pending') return
      if (scenario() === 'payment-rejected-after-pending') {
        currentOrder.status = 'rejected'
        currentOrder.version += 1
        saveDatabase()
        emitEvent('order.updated', { id: orderId, resource: 'order', version: currentOrder.version, status: 'rejected' }, identity.userId)
      } else applyPurchase(current, currentOrder)
    }, scenario() === 'socket-disconnect-pending-order' ? 5000 : 1600)
    if (scenario() === 'timeout-after-create') {
      db.idempotency[key].firstAttemptReturnedTimeout = true
      saveDatabase()
      return error(504, 'REQUEST_TIMEOUT', 'A resposta expirou; repita a mesma tentativa para recuperar o pedido.')
    }
    return HttpResponse.json(order, { status: 201 })
  }),
  http.get('/api/orders/:id', async ({ request, params }) => {
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    const db = await getDatabase()
    const order = db.orders[String(params.id)]
    if (!order) return error(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.')
    if (order.userId !== identity.userId) return error(403, 'FORBIDDEN', 'Sem permissão para consultar este pedido.')
    return HttpResponse.json(order)
  }),

  http.get('/api/profile', async ({ request }) => {
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    return HttpResponse.json({ user: identity.user })
  }),
  http.patch('/api/profile', async ({ request }) => {
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    const db = await getDatabase()
    const user = db.users.find((candidate) => candidate.id === identity.userId)!
    const body = await request.json() as Partial<Pick<Account, 'name' | 'email' | 'avatar' | 'username' | 'ens' | 'walletAlias'>>
    const emailConflict = body.email !== undefined && db.users.some((candidate) => candidate.id !== user.id && candidate.email.toLowerCase() === body.email!.trim().toLowerCase())
    if (body.email !== undefined && !body.email.includes('@')) return error(422, 'VALIDATION_ERROR', 'Informe um e-mail válido.')
    if (emailConflict) return error(409, 'EMAIL_IN_USE', 'Este e-mail já está em uso.')
    if (body.name !== undefined && !body.name.trim()) return error(422, 'VALIDATION_ERROR', 'O nome não pode ficar vazio.')
    if (body.username !== undefined && body.username.trim().length < 3) return error(422, 'VALIDATION_ERROR', 'O nome de usuário deve ter ao menos 3 caracteres.')
    if (body.ens !== undefined && !/^[a-z0-9-]+\.eth$/i.test(body.ens)) return error(422, 'VALIDATION_ERROR', 'Informe um nome ENS válido.')
    if (body.walletAlias !== undefined && !body.walletAlias.trim()) return error(422, 'VALIDATION_ERROR', 'O apelido da carteira não pode ficar vazio.')
    Object.assign(user, body)
    user.version += 1
    saveDatabase()
    return HttpResponse.json({ user: toPublicAccount(user) })
  }),
  http.post('/api/profile/password', async ({ request }) => {
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    const db = await getDatabase()
    const user = db.users.find((candidate) => candidate.id === identity.userId)!
    const body = await request.json() as { currentPassword: string; newPassword: string }
    if (user.passwordHash !== await hashPassword(body.currentPassword)) return error(422, 'PASSWORD_MISMATCH', 'A senha atual não confere.')
    if (body.newPassword.length < 8) return error(422, 'VALIDATION_ERROR', 'A nova senha deve ter ao menos 8 caracteres.')
    user.passwordHash = await hashPassword(body.newPassword)
    user.version += 1
    saveDatabase()
    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/wallets', async ({ request }) => {
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    const db = await getDatabase()
    return HttpResponse.json({ wallets: db.wallets[identity.userId] ?? [] })
  }),
  http.post('/api/wallets', async ({ request }) => {
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    const body = await request.json() as Omit<Wallet, 'id'>
    if (!body.name?.trim() || !/^0x[a-f\d]{8,}$/i.test(body.address)) return error(422, 'VALIDATION_ERROR', 'Informe um nome e um endereço de carteira válido.')
    const db = await getDatabase()
    const wallet: Wallet = { ...body, id: crypto.randomUUID() }
    const list = db.wallets[identity.userId] ?? []
    if (wallet.primary) list.forEach((item) => { item.primary = false })
    list.push(wallet)
    db.wallets[identity.userId] = list
    saveDatabase()
    return HttpResponse.json({ wallets: list }, { status: 201 })
  }),
  http.patch('/api/wallets/:id', async ({ request, params }) => {
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    const db = await getDatabase()
    const wallets = db.wallets[identity.userId] ?? []
    const wallet = wallets.find((item) => item.id === params.id)
    if (!wallet) return error(404, 'WALLET_NOT_FOUND', 'Carteira não encontrada.')
    const body = await request.json() as Partial<Omit<Wallet, 'id'>>
    if ((body.name !== undefined && !body.name.trim()) || (body.address !== undefined && !/^0x[a-f\d]{8,}$/i.test(body.address)) || (body.network !== undefined && !['Ethereum', 'Polygon', 'Solana'].includes(body.network))) return error(422, 'VALIDATION_ERROR', 'Confira os dados da carteira.')
    if (body.primary) wallets.forEach((item) => { item.primary = false })
    Object.assign(wallet, body)
    saveDatabase()
    return HttpResponse.json({ wallets })
  }),
  http.delete('/api/wallets/:id', async ({ request, params }) => {
    const identity = await getIdentity(request, true)
    if ('response' in identity) return identity.response
    const db = await getDatabase()
    const previous = db.wallets[identity.userId] ?? []
    const removedPrimary = previous.some((item) => item.id === params.id && item.primary)
    db.wallets[identity.userId] = previous.filter((item) => item.id !== params.id)
    if (removedPrimary && db.wallets[identity.userId][0]) db.wallets[identity.userId][0].primary = true
    saveDatabase()
    return HttpResponse.json({ wallets: db.wallets[identity.userId] })
  }),

  http.post('/api/scenario/reset', () => {
    localStorage.removeItem(DB_KEY)
    localStorage.removeItem('token')
    localStorage.removeItem('kurio-scenario')
    localStorage.removeItem('kurio-wallet')
    localStorage.removeItem('kurio-coupon')
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('kurio-profile-extra:') || key.startsWith('kurio-wallet-extra:') || key.startsWith('kurio-checkout-attempt:')) localStorage.removeItem(key)
    }
    database = undefined
    requestSequence = 0
    priceScenarioChanged = false
    socketDisconnectTriggered = false
    return HttpResponse.json({ ok: true, scenario: 'standard' })
  }),
]

const socketLink = ws.link(/\/socket\.io/)
socketLink.addEventListener('connection', (connection) => {
  const binding = toSocketIo(connection)
  if (scenario() === 'socket-disconnect-once' && !socketDisconnectTriggered) {
    socketDisconnectTriggered = true
    setTimeout(() => connection.server.close(), 100)
  }
  const client = { userId: null as string | null, emit: (name: string, payload: unknown) => binding.server.emit(name, payload), close: () => connection.server.close() }
  socketClients.add(client)
  binding.client.on('session:subscribe', (_event, token?: string) => {
    const session = token ? database?.sessions[token] : undefined
    client.userId = session?.userId ?? null
    client.emit('session:ready', { authenticated: Boolean(client.userId) })
    if (scenario() === 'rejected-order') client.emit('order.updated', { id: 'demo-order', resource: 'order', version: 2, status: 'rejected' })
  })
  connection.client.addEventListener('close', () => socketClients.delete(client))
})

export { emitEvent, getDatabase, handlers, socketLink }
