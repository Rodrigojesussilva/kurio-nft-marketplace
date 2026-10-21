import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiError, getWallets, quoteCart, type Quote } from '../lib/api'
import { useShop } from '../store'
import { Frame, input, label, lineTotal, panel, primary } from '../components/page-shared'

export function Pagamento() {
  const { cart, coupon, applyCoupon, createOrder, account, connectWallet } = useShop()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [network, setNetwork] = useState('Ethereum')
  const [walletId, setWalletId] = useState('')
  const [walletType, setWalletType] = useState('Coinbase Wallet')
  const [useOtherWallet, setUseOtherWallet] = useState(false)
  const [otherWalletAddress, setOtherWalletAddress] = useState('')
  const [couponCode, setCouponCode] = useState(coupon)
  const [couponMessage, setCouponMessage] = useState('')
  const [couponOpen, setCouponOpen] = useState(Boolean(coupon))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const walletsQuery = useQuery({ queryKey: ['wallets', account?.id], queryFn: ({ signal }) => getWallets(signal), enabled: Boolean(account) })
  const wallets = walletsQuery.data?.wallets ?? []
  const compatible = wallets.filter((wallet) => wallet.network === network)
  const wallet = compatible.find((item) => item.id === walletId) ?? compatible.find((item) => item.primary) ?? compatible[0]
  const selectedWalletAddress = useOtherWallet ? otherWalletAddress.trim() : wallet?.address ?? ''
  const lines = cart.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity }))
  const quoteKey = ['quote', lines, coupon]
  const quoteQuery = useQuery({ queryKey: quoteKey, queryFn: ({ signal }) => {
    const previous = client.getQueryData<Quote>(quoteKey)
    return quoteCart({ items: lines, coupon: coupon || undefined, expectedVersions: previous?.versions }, signal)
  }, enabled: lines.length > 0 && Boolean(account) })
  const quote = quoteQuery.data
  const applyCheckoutCoupon = async () => {
    const valid = await applyCoupon(couponCode)
    setCouponMessage(valid ? `Cupom ${couponCode.trim().toUpperCase()} aplicado.` : 'Cupom inválido ou expirado.')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!quote || busy) return
    if (!selectedWalletAddress) { setError(useOtherWallet ? 'Informe o endereço da carteira.' : `Cadastre uma carteira na rede ${network} antes de continuar.`); return }
    const data = new FormData(event.currentTarget)
    const collector = { name: String(data.get('collectorName') ?? '').trim(), email: String(data.get('collectorEmail') ?? '').trim() }
    setBusy(true)
    setError('')
    try {
      await connectWallet(selectedWalletAddress)
      const key = `kurio-checkout-attempt:${JSON.stringify(lines)}`
      const attempt = localStorage.getItem(key) ?? crypto.randomUUID()
      localStorage.setItem(key, attempt)
      const order = await createOrder(`${walletType} · ${network}`, quote, attempt, collector, selectedWalletAddress)
      void navigate({ to: '/confirmacao/$orderId', params: { orderId: order.id } })
    } catch (cause) {
      const apiError = getApiError(cause)
      setError(apiError.code === 'QUOTE_STALE' ? `${apiError.message} Os valores foram atualizados; revise e confirme outra vez.` : apiError.message)
      if (apiError.code === 'QUOTE_STALE') void client.invalidateQueries({ queryKey: ['quote'] })
    } finally { setBusy(false) }
  }

  if (!cart.length) return <Frame title="Pagamento"><section className={panel}><p className="mb-4 text-sm text-[#A69C8F]">Adicione um NFT ao carrinho antes de pagar.</p><Link to="/mercado" className={primary}>Ir ao mercado</Link></section></Frame>
  if (!account) return <Frame title="Pagamento"><section className={panel}><p className="mb-4 text-sm text-[#A69C8F]">Entre na sua conta para continuar; seu carrinho será preservado.</p><a href="/login?returnTo=%2Fpagamento" className={primary}>Entrar e continuar</a></section></Frame>

  return <Frame title="Pagamento" hideHeading breadcrumbs={['Início', 'Mercado', 'Pagamento']}>
    <form onSubmit={submit} className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_506px] lg:items-start lg:gap-10">
      <section className="order-2 min-w-0 lg:order-1">
        <h2 className="mb-5 text-lg font-bold text-white">Perfil do colecionador</h2>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <label><span className={label}>Nome de exibição <span className="text-[#E8834A]">*</span></span><input className={input} name="collectorName" autoComplete="name" defaultValue={account.name} minLength={2} required /></label>
          <label><span className={label}>Nome de usuário <span className="text-[#E8834A]">*</span></span><input className={input} name="username" defaultValue={account.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')} required /></label>
          <label><span className={label}>Rede <span className="text-[#E8834A]">*</span></span><select aria-label="Rede *" className={input} name="network" value={network} onChange={(event) => { setNetwork(event.target.value); setWalletId('') }} required>{['Ethereum', 'Polygon', 'Solana'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span className={label}>Nome do perfil <span className="text-[#E8834A]">*</span></span><input className={input} name="profileName" defaultValue={account.name} required /></label>
          <label><span className={label}>Endereço da carteira <span className="text-[#E8834A]">*</span></span><input className={`${input} font-mono`} name="walletAddress" value={useOtherWallet ? otherWalletAddress : wallet?.address ?? ''} onChange={(event) => setOtherWalletAddress(event.target.value)} readOnly={!useOtherWallet} pattern="0x[a-fA-F0-9]{8,}" title="Informe um endereço hexadecimal iniciado por 0x." required /></label>
          <label><span className={label}>ENS ou carteira secundária (opcional)</span><input className={input} name="secondaryWallet" placeholder="nome.eth ou endereço 0x..." /></label>
          <label><span className={label}>Tipo de carteira <span className="text-[#E8834A]">*</span></span><select className={input} name="walletType" value={walletType} onChange={(event) => setWalletType(event.target.value)} required>{['MetaMask', 'WalletConnect', 'Coinbase Wallet'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span className={label}>Código de indicação <span className="text-[#E8834A]">*</span></span><input className={input} name="referralCode" defaultValue="KURIO10" required /></label>
          <label><span className={label}>E-mail <span className="text-[#E8834A]">*</span></span><input className={input} name="collectorEmail" type="email" autoComplete="email" defaultValue={account.email} required /></label>
          <label><span className={label}>Nome ENS <span className="text-[#E8834A]">*</span></span><div className="flex gap-2"><input className={`${input} min-w-0 flex-1`} name="ensName" defaultValue={`${account.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.eth`} required /><select aria-label="Sufixo ENS" className={`${input} w-24`} defaultValue=".eth"><option>.eth</option><option>.nft</option></select></div></label>
        </div>
        <label className="mt-6 flex items-center gap-3 text-sm text-[#F5F0E6]"><input type="checkbox" checked={useOtherWallet} onChange={(event) => setUseOtherWallet(event.target.checked)} className="h-5 w-5 accent-[#E8834A]" />Usar outra carteira?</label>
        {quote?.requiresReconfirmation && <p role="status" className="mt-5 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">O preço ou a disponibilidade mudou. Confira o resumo atualizado antes de confirmar.</p>}
        <label className="mt-6 block"><span className={label}>Observação do colecionador (opcional)</span><textarea className={`${input} min-h-40 max-w-[440px]`} name="note" /></label>
        {error && <div className="mt-4"><p role="alert" className="text-sm text-red-400">{error}</p>{error.includes('Cadastre uma carteira') && <Link to="/carteiras" className="mt-2 inline-block text-sm text-[#E8834A]">Gerenciar carteiras</Link>}</div>}
      </section>
      <aside className="order-1 min-w-0 rounded-lg border border-white/5 bg-[#241611] p-4 lg:order-2 lg:rounded-none lg:border-0 lg:border-l lg:bg-transparent lg:p-0 lg:pl-8">
        <h2 className="mb-3 text-lg font-bold text-white">Seus NFTs</h2>
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] border-b border-[#6B4228] pb-2 text-sm text-white"><span>NFTs</span><span>Subtotal</span></div>
        <div className="mb-3 space-y-3">{cart.map((item) => <div key={`${item.nftId}:${item.editionId}`} className="flex min-w-0 items-center gap-2 bg-[#241611] p-2"><img src={item.image} alt={item.name} className="h-14 w-14 shrink-0 rounded-lg object-cover sm:h-20 sm:w-20"/><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white sm:text-base">{item.name}</p><p className="text-[10px] text-[#C9A982] sm:text-sm">ID do token: #{item.nft.id} <span className="ml-2">(x {item.quantity})</span></p></div><span className="shrink-0 text-xs font-bold text-[#E8834A] sm:text-base">{lineTotal(item.nft.priceEth, item.quantity)} ETH</span></div>)}</div>
        <div className="mb-4 text-center">
          <button type="button" onClick={() => setCouponOpen((open) => !open)} className="text-xs text-white hover:text-[#E8834A]">Tem um código promocional? Aplique aqui</button>
          {couponOpen && <div className="mt-2 flex gap-2"><input aria-label="Código promocional" className={`${input} min-w-0`} value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Código promocional"/><button type="button" onClick={() => void applyCheckoutCoupon()} className={`${primary} shrink-0 px-3`}>Aplicar</button></div>}
          {couponMessage && <p role="status" className="mt-2 text-xs text-[#E8834A]">{couponMessage}</p>}
        </div>
        {quote ? <div className="mb-5 space-y-3 text-sm text-[#F5F0E6]"><p className="flex justify-between"><span>Subtotal</span><span>{quote.subtotalEth} ETH</span></p><p className="flex justify-between"><span>Desconto do lançamento</span><span>(−) {quote.discountEth} ETH</span></p><p className="flex justify-between"><span>Taxa de rede</span><span>{quote.networkFeeEth} ETH</span></p><p className="text-right text-xs text-[#E8834A]">Taxa estimada</p><p className="flex justify-between border-t border-[#6B4228] pt-3 text-base font-bold"><span>Total</span><span className="text-[#E8834A]">{quote.totalEth} ETH</span></p></div> : <p role="status" className="mb-4 text-sm text-[#A69C8F]">Calculando valores…</p>}
        <fieldset className="mb-5 space-y-4">
          <legend className="mb-4 w-full text-center text-lg font-bold text-white">Carteira e rede</legend>
          <div aria-label="Carteiras compatíveis" className="flex min-h-14 items-center gap-3 rounded border border-[#4B3022] px-3 py-3">
            <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-full border-2 border-[#D9824B]" />
            <span className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#704322] bg-[#3A2413] px-2.5 py-2 text-[9px] font-bold text-[#D9824B] sm:text-[10px]">
              <span>METAMASK</span><span aria-hidden="true">·</span><span>WALLETCONNECT</span><span aria-hidden="true">·</span><span>COINBASE</span>
            </span>
          </div>
          {walletsQuery.isLoading && <p className="text-xs text-[#A69C8F]">Carregando carteiras…</p>}
          {(['MetaMask', 'Coinbase Wallet'] as const).map((provider) => {
            const selected = walletType === provider
            return <label key={provider} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded border px-3 py-3 text-base text-white transition-colors ${selected ? 'border-[#D9824B]' : 'border-[#4B3022]'}`}>
              <input type="radio" name="wallet" aria-label={provider === 'Coinbase Wallet' && wallet ? wallet.name : provider} value={provider} checked={selected} onChange={() => { setWalletType(provider); setUseOtherWallet(false) }} className="h-5 w-5 shrink-0 accent-[#D9824B]" />
              <span className="flex-1 text-center">{provider}</span>
            </label>
          })}
          {compatible.length > 1 && <label className="block text-xs text-[#C9A982]">Carteira cadastrada<select aria-label="Carteira cadastrada" className={`${input} mt-2`} value={wallet?.id ?? ''} onChange={(event) => setWalletId(event.target.value)}>{compatible.map((item) => <option key={item.id} value={item.id}>{item.name}{item.primary ? ' · Principal' : ''}</option>)}</select></label>}
          {!walletsQuery.isLoading && compatible.length === 0 && <p className="text-xs text-[#A69C8F]">Nenhuma carteira cadastrada nesta rede. <Link to="/carteiras" className="text-[#E8834A]">Gerenciar carteiras</Link></p>}
        </fieldset>
        <button disabled={busy || !quote || quoteQuery.isFetching} className={`${primary} w-full py-3 text-sm`}>{busy ? 'Enviando pedido…' : 'Confirmar compra'}</button>
      </aside>
    </form>
  </Frame>
}
