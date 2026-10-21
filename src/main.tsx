import { StrictMode, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, createRootRoute, createRoute, RouterProvider, Link, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DetalhesNFT } from './pages/DetalhesNFT'
import { Inicio } from './pages/Inicio'
import { Carrinho } from './pages/Carrinho'
import { Carteiras } from './pages/Carteiras'
import { Confirmacao } from './pages/Confirmacao'
import { Cadastro } from './pages/Cadastro'
import { Login } from './pages/Login'
import { Pagamento } from './pages/Pagamento'
import { Perfil } from './pages/Perfil'
import { ShopProvider, useShop } from './store'
import { getSession } from './lib/api'
import { socket } from './lib/socket'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
})

// Reuse the actual home page as the non-interactive backdrop for access dialogs.
const AccessBackdrop = () => <Inicio backdrop />

// ================= LAYOUT COM HEADER E FOOTER =================
const rootRoute = createRootRoute({
  component: function RootLayout() {
    const { cart, account } = useShop()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const pathname = useRouterState({ select: (state) => state.location.pathname })
    const isAccessRoute = pathname === '/login' || pathname === '/cadastro'
    const mobileTitle = pathname === '/' ? 'Explorar coleções' : pathname.startsWith('/mercado/') || pathname === '/mercado' ? 'Detalhes do NFT' : pathname === '/carrinho' ? 'Carrinho de NFTs' : pathname === '/pagamento' ? 'Pagamento com carteira' : pathname.startsWith('/confirmacao/') ? 'Confirmação do pedido' : pathname === '/perfil' ? 'Meu perfil' : pathname === '/carteiras' ? 'Carteiras' : 'Kurio'
    useEffect(() => {
      const seenVersions = new Map<string, number>()
      const subscribe = () => socket.emit('session:subscribe', localStorage.getItem('token'))
      const onNftUpdated = (event: { id: string; version?: number; nft?: unknown }) => {
        const incoming = event.nft as { version?: number } | undefined
        const eventVersion = event.version ?? incoming?.version ?? 0
        const eventKey = `nft:${event.id}`
        const knownVersion = Math.max(seenVersions.get(eventKey) ?? 0, queryClient.getQueryData<{ version?: number }>(['nft', event.id])?.version ?? 0)
        if (eventVersion <= knownVersion) return
        seenVersions.set(eventKey, eventVersion)
        const cached = queryClient.getQueryData<{ version?: number }>(['nft', event.id])
        if (event.nft && (!cached || eventVersion > (cached.version ?? 0))) queryClient.setQueryData(['nft', event.id], event.nft)
        void queryClient.invalidateQueries({ queryKey: ['catalog'] })
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
        void queryClient.invalidateQueries({ queryKey: ['quote'] })
      }
      const onOrderUpdated = (event: { id: string; version?: number; status?: 'pending' | 'confirmed' | 'rejected'; transaction?: string }) => {
        const eventKey = `order:${event.id}`
        const cached = queryClient.getQueryData<{ version?: number; status?: 'pending' | 'confirmed' | 'rejected'; transaction?: string }>(['order', event.id])
        const knownVersion = Math.max(seenVersions.get(eventKey) ?? 0, cached?.version ?? 0)
        if ((event.version ?? 0) <= knownVersion) return
        seenVersions.set(eventKey, event.version ?? 0)
        if (cached && cached.status !== 'pending') return
        if (cached && event.status) queryClient.setQueryData(['order', event.id], { ...cached, status: event.status, transaction: event.transaction ?? cached.transaction, version: event.version })
        void queryClient.invalidateQueries({ queryKey: ['order', event.id] })
      }
      const reconcile = () => {
        subscribe()
        void queryClient.invalidateQueries({ queryKey: ['catalog'] })
        void queryClient.invalidateQueries({ queryKey: ['nft'] })
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
        void queryClient.invalidateQueries({ queryKey: ['order'] })
      }
      socket.on('connect', reconcile)
      socket.on('nft.updated', onNftUpdated)
      socket.on('order.updated', onOrderUpdated)
      if (!socket.connected) socket.connect()
      else reconcile()
      return () => {
        socket.off('connect', reconcile)
        socket.off('nft.updated', onNftUpdated)
        socket.off('order.updated', onOrderUpdated)
        socket.disconnect()
      }
    }, [account?.id])
    return (
    <div className="mx-auto min-h-screen w-full max-w-[1810px] bg-[#1C1310] text-[#F5F0E6] font-mono selection:bg-[#E8834A] selection:text-black pb-0 border-none flex flex-col">
      
      {/* HEADER */}
      <header className="relative z-30 mx-auto hidden w-full max-w-[1500px] items-center justify-between border-b border-[#6B4228] px-4 py-4 md:flex lg:px-8">
        <Link to="/" className="font-black text-sm tracking-[0.2em] uppercase text-[#F5F0E6]">KURIO</Link>
        
        <nav className="hidden items-center gap-8 text-base font-medium ml-10 md:flex">
          <Link to="/" className="text-[#A69C8F] hover:text-[#F5F0E6] transition pb-4" activeProps={{ className: "text-[#E8834A] relative pb-4 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[#E8834A]" }}>
            Início
          </Link>
          {/* LINK DO MERCADO */}
          <Link to="/mercado" className="text-[#A69C8F] hover:text-[#F5F0E6] transition pb-4" activeProps={{ className: "text-[#E8834A] relative pb-4 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[#E8834A]" }}>
            Mercado
          </Link>
          <span aria-disabled="true" className="cursor-default pb-4 text-[#A69C8F]">Criadores</span>
          <span aria-disabled="true" className="cursor-default pb-4 text-[#A69C8F]">Aprenda</span>
        </nav>

        <div className="flex items-center gap-5">
          <svg className="w-5 h-5 text-[#A69C8F] cursor-pointer hover:text-[#F5F0E6] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <Link to="/carrinho" className="relative cursor-pointer group">
            <span className="sr-only">Abrir carrinho, {cart.length} itens</span>
            <svg className="w-5 h-5 text-[#A69C8F] group-hover:text-[#F5F0E6] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            {cart.length > 0 && <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-[#E8834A] px-0.5 text-[7px] font-black text-black">{cart.length}</span>}
          </Link>
          <Link to={account ? '/perfil' : '/login'} className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-[#E8834A] px-4 py-2 text-[13px] font-bold text-[#E8834A] transition hover:bg-[#E8834A] hover:text-black">
            {account ? account.name.split(' ')[0] : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>Entrar</>}
          </Link>
          {account && <Link to="/perfil" aria-label="Abrir perfil" className="ml-1 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-[#E8834A]/50 bg-[#2C1E17] text-[10px] font-bold text-[#E8834A]">
            {account.name.slice(0, 1).toUpperCase()}
          </Link>}
        </div>
        <button type="button" aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} className="ml-3 flex h-8 w-8 items-center justify-center rounded border border-white/10 text-[#F5F0E6] md:hidden">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
        </button>
        {mobileMenuOpen && <nav className="absolute left-4 right-4 top-full flex flex-col gap-1 rounded-lg border border-white/10 bg-[#241711] p-2 shadow-xl md:hidden">
          {[
            ['Início', '/'],
            ['Detalhes do NFT', '/mercado'],
            ['Carrinho de NFTs', '/carrinho'],
            ['Pagamento', '/pagamento'],
            ['Perfil do Colecionador', '/perfil'],
            ['Carteiras', '/carteiras'],
            ['Login', '/login'],
            ['Cadastro', '/cadastro'],
          ].map(([label, to]) => <Link key={to} to={to} onClick={() => setMobileMenuOpen(false)} className="rounded px-3 py-2.5 text-sm text-[#A69C8F] transition hover:bg-white/5 hover:text-[#E8834A]">{label}</Link>)}
        </nav>}
      </header>

      {!isAccessRoute && <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#6B4228] bg-[#1C1310] px-4 py-3 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {pathname !== '/' && <Link to={pathname === '/pagamento' ? '/carrinho' : '/'} aria-label="Voltar" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2C1E17] text-lg text-[#E8834A]">‹</Link>}
          <span className="truncate text-xs font-bold tracking-wide text-white">{mobileTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {pathname === '/' && <button type="button" aria-label="Ir para o catálogo" onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })} className="flex h-8 w-8 items-center justify-center rounded bg-[#E8834A] text-[#1A1411]"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></button>}
          <Link to="/carrinho" aria-label={`Abrir carrinho, ${cart.length} itens`} className="relative flex h-8 w-8 items-center justify-center rounded bg-[#2C1E17] text-[#E8834A]"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5m1.6 8-2 2h12"/></svg>{cart.length > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#E8834A] px-1 text-[8px] font-bold text-black">{cart.length}</span>}</Link>
        </div>
      </header>}

      <div className={`${isAccessRoute ? 'relative min-h-[calc(100vh-64px)]' : 'flex-1 pb-20 md:pb-0'}`}>
        {isAccessRoute && <div className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block" aria-hidden="true"><AccessBackdrop /></div>}
        <div className={isAccessRoute ? 'relative z-40' : ''}><Outlet /></div>
      </div>

      {!isAccessRoute && <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#6B4228] bg-[#1C1310]/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        {[
          { label: 'Início', to: '/', icon: '⌂' },
          { label: 'NFT', to: '/mercado', icon: '◇' },
          { label: 'Carrinho', to: '/carrinho', icon: '▱' },
          { label: 'Perfil', to: account ? '/perfil' : '/login', icon: '◉' },
        ].map((item) => <Link key={item.label} to={item.to} className={`flex flex-col items-center gap-0.5 py-1 text-[9px] ${pathname === item.to || (item.to === '/' && pathname === '/') ? 'text-[#E8834A]' : 'text-[#A69C8F]'}`}><span aria-hidden="true" className="text-lg leading-5">{item.icon}</span>{item.label}</Link>)}
      </nav>}

      {/* FOOTER */}
      {!isAccessRoute && pathname !== '/perfil' && pathname !== '/carteiras' && !pathname.startsWith('/confirmacao/') && <div className="mx-auto mt-2 hidden w-full px-8 pb-1 md:block lg:pl-8 lg:pr-[56px]">
        <footer className="overflow-hidden bg-[#241611] font-mono">
          <div className="px-8 sm:px-[60px] py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr] gap-8">
              <div className="flex flex-col gap-2 lg:border-r lg:border-[#E8834A]/60 lg:pr-8">
                <div className="h-[92px] w-[92px] rounded-full bg-[#E8834A] flex items-center justify-center text-[#1A1411] font-black text-2xl">W</div>
                <h2 className="text-white font-bold text-xl">Segurança da carteira</h2>
                <p className="text-[#A69C8F] text-lg leading-[1.6] pr-4">Proteja sua carteira e colecione arte digital verificada com confiança.</p>
              </div>
              <div className="flex flex-col gap-2 lg:border-r lg:border-[#E8834A]/60 lg:pr-8">
                <div className="h-[92px] w-[92px] rounded-full bg-[#E8834A] flex items-center justify-center text-[#1A1411] font-black text-2xl">C</div>
                <h2 className="text-white font-bold text-xl">Criadores em destaque</h2>
                <p className="text-[#A69C8F] text-lg leading-[1.6] pr-4">Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.</p>
              </div>
              <div className="flex flex-col gap-2 lg:border-r lg:border-[#E8834A]/60 lg:pr-8">
                <div className="h-[92px] w-[92px] rounded-full bg-[#E8834A] flex items-center justify-center text-[#1A1411] font-black text-2xl">D</div>
                <h2 className="text-white font-bold text-xl">Alertas de lançamentos</h2>
                <p className="text-[#A69C8F] text-lg leading-[1.6] pr-4">Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.</p>
              </div>
              <div className="flex flex-col gap-4">
                <h2 className="text-white font-bold text-xl">Antecipe-se ao próximo lançamento</h2>
                <div className="flex w-full items-center rounded-xl border border-white/5 bg-[#1F130E] p-2">
                  <input type="email" placeholder="digite seu e-mail..." className="min-w-0 flex-1 border-none bg-transparent px-3 py-2 text-sm text-[#A69C8F] outline-none placeholder:whitespace-nowrap placeholder:text-[13px] placeholder:text-[#A69C8F]/50 font-mono" />
                  <button className="shrink-0 rounded bg-[#E08A53] px-4 py-2 text-sm font-bold text-[#1A1411] transition hover:brightness-110 whitespace-nowrap">Enviar</button>
                </div>
                <p className="text-[#A69C8F] text-lg leading-relaxed mt-4 pr-6">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
              </div>
            </div>
          </div>
          <div className="w-full bg-[#3B2415]">
            <div className="flex flex-col md:flex-row justify-between items-center py-8 px-10 text-lg text-[#A69C8F] gap-4">
              <div className="font-black text-lg tracking-[0.15em] uppercase text-[#F5F0E6] w-full md:w-auto font-mono">KURIO</div>
              <p className="w-full md:w-auto max-w-[240px] text-left font-mono">Feito para colecionadores, criadores e cultura.</p>
              <p className="w-full md:w-auto text-left font-mono">contato@email.com</p>
              <p className="w-full md:w-auto text-left font-mono">+55 11 4002 8922</p>
            </div>
          </div>
          <div className="px-6 sm:px-10">
            <div className="grid grid-cols-2 gap-8 py-8 text-sm md:grid-cols-4 md:gap-6 lg:py-10">
              <section aria-labelledby="footer-profile-title">
                <h2 id="footer-profile-title" className="mb-3 text-lg font-bold text-white">Meu perfil</h2>
                <ul className="flex flex-col gap-3 text-[#F5F0E6]">
                  <li><Link to="/perfil" className="hover:text-[#E8834A]">Meu perfil</Link></li>
                  <li>Minha coleção</li><li>Atividade</li><li>Estúdio do criador</li><li>Lista de interesse</li>
                </ul>
              </section>
              <section aria-labelledby="footer-help-title">
                <h2 id="footer-help-title" className="mb-3 text-lg font-bold text-white">Central de ajuda</h2>
                <ul className="flex flex-col gap-3 text-[#F5F0E6]">
                  <li>Central de ajuda</li><li>Como comprar NFTs</li><li>Carteira e segurança</li><li>Política do mercado</li><li>Denunciar item</li>
                </ul>
              </section>
              <section aria-labelledby="footer-collections-title">
                <h2 id="footer-collections-title" className="mb-3 text-lg font-bold text-white">Coleções</h2>
                <ul className="flex flex-col gap-3 text-[#F5F0E6]">
                  <li>Arte digital</li><li>Fotografia</li><li>Música</li><li>Arte 3D</li><li>Utilidade</li>
                </ul>
              </section>
              <section aria-labelledby="footer-social-title">
                <h2 id="footer-social-title" className="mb-3 text-lg font-bold text-white">Redes sociais</h2>
                <div role="group" aria-label="Ícones ilustrativos de redes sociais" className="mb-6 flex items-center gap-2 text-sm font-bold text-[#E8834A]">
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-md border border-[#E8834A]/60">f</span>
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-md border border-[#E8834A]/60">◎</span>
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-md border border-[#E8834A]/60">♥</span>
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-md border border-[#E8834A]/60">in</span>
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-md border border-[#E8834A]/60">▶</span>
                </div>
                <h2 className="mb-3 text-lg font-bold text-white">Carteiras compatíveis</h2>
                <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-[#23150F] px-3 py-3 text-[10px] font-bold text-[#D9824B] sm:text-xs">
                  <span>METAMASK</span><span aria-hidden="true" className="text-[#A69C8F]/40">•</span><span>WALLETCONNECT</span><span aria-hidden="true" className="text-[#A69C8F]/40">•</span><span>COINBASE</span>
                </div>
              </section>
            </div>
          </div>
        </footer>
        <p className="pt-5 text-center text-sm text-[#A69C8F]">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>}
    </div>
  )
  },
})

// ================= ROTAS =================
type CatalogSearch = { q?: string; category?: string; network?: string; minPrice?: string; maxPrice?: string; sort?: string; page?: number }
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    category: typeof search.category === 'string' ? search.category : undefined,
    network: typeof search.network === 'string' ? search.network : undefined,
    minPrice: typeof search.minPrice === 'string' ? search.minPrice : undefined,
    maxPrice: typeof search.maxPrice === 'string' ? search.maxPrice : undefined,
    sort: typeof search.sort === 'string' ? search.sort : undefined,
    page: Number.isInteger(Number(search.page)) && Number(search.page) > 0 ? Number(search.page) : 1,
  }),
  component: Inicio,
})
const requireAccount = async ({ location }: { location: { href: string } }) => {
  const loginHref = `/login?returnTo=${encodeURIComponent(location.href)}`
  if (!localStorage.getItem('token')) throw redirect({ href: loginHref })
  try {
    await queryClient.fetchQuery({
      queryKey: ['session'],
      queryFn: ({ signal }) => getSession(signal),
      staleTime: 0,
      retry: false,
    })
  } catch {
    localStorage.removeItem('token')
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'catalog' && query.queryKey[0] !== 'nft' })
    throw redirect({ href: loginHref })
  }
}
const mercadoRoute = createRoute({ getParentRoute: () => rootRoute, path: '/mercado', component: DetalhesNFT })
const nftRoute = createRoute({ getParentRoute: () => rootRoute, path: '/mercado/$nftId', component: DetalhesNFT })
const carrinhoRoute = createRoute({ getParentRoute: () => rootRoute, path: '/carrinho', component: Carrinho })
const pagamentoRoute = createRoute({ getParentRoute: () => rootRoute, path: '/pagamento', beforeLoad: requireAccount, component: Pagamento })
const confirmacaoRoute = createRoute({ getParentRoute: () => rootRoute, path: '/confirmacao/$orderId', beforeLoad: requireAccount, component: Confirmacao })
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: Login })
const cadastroRoute = createRoute({ getParentRoute: () => rootRoute, path: '/cadastro', component: Cadastro })
const perfilRoute = createRoute({ getParentRoute: () => rootRoute, path: '/perfil', beforeLoad: requireAccount, component: Perfil })
const carteirasRoute = createRoute({ getParentRoute: () => rootRoute, path: '/carteiras', beforeLoad: requireAccount, component: Carteiras })

const routeTree = rootRoute.addChildren([homeRoute, mercadoRoute, nftRoute, carrinhoRoute, pagamentoRoute, confirmacaoRoute, loginRoute, cadastroRoute, perfilRoute, carteirasRoute])
const router = createRouter({ routeTree })

const rootElement = document.getElementById('root')!
const appRoot = ReactDOM.createRoot(rootElement)
const startApp = async () => {
  if (import.meta.env.VITE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass', serviceWorker: { url: '/mockServiceWorker.js' } })
  } else if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration('/mockServiceWorker.js')
    await registration?.unregister()
  }
  appRoot.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ShopProvider><RouterProvider router={router} /></ShopProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}
void startApp()


