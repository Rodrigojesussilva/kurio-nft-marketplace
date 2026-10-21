import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { quoteCart } from '../lib/api'
import { useShop } from '../store'
import cosmicImage from '../assets/images/cosmic.png'
import violetImage from '../assets/images/violet.png'
import ivoryImage from '../assets/images/ivory.png'
import goldenImage from '../assets/images/Golden.png'
import { Frame, lineTotal, panel, primary } from '../components/page-shared'

export function Carrinho() {
  const { cart, coupon, applyCoupon, connectWallet, wallet, removeFromCart, setQuantity, cartLoading } = useShop()
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = useState(coupon)
  const [couponMessage, setCouponMessage] = useState('')
  const lines = cart.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity }))
  const quoteQuery = useQuery({ queryKey: ['quote', lines, coupon], queryFn: ({ signal }) => quoteCart({ items: lines, coupon: coupon || undefined }, signal), enabled: lines.length > 0 })
  const quote = quoteQuery.data
  const applyCode = async () => {
    const valid = await applyCoupon(couponCode)
    setCouponMessage(valid ? `Cupom ${couponCode.trim().toUpperCase()} aplicado.` : 'Cupom inválido ou expirado.')
  }
  if (cartLoading) return <Frame title="Carrinho" hideHeading><div role="status" aria-label="Carregando carrinho" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_375px]"><div className={`${panel} space-y-4`}>{[1, 2, 3].map((item) => <div key={item} className="skeleton-shimmer h-20 rounded" />)}</div><div className={`${panel} skeleton-shimmer h-72`} /></div></Frame>
  const suggestions = [
    { name: 'Cosmic Bloom #118', price: '1.29 ETH', image: cosmicImage },
    { name: 'Violet Nomad #314', price: '1.10 ETH', image: violetImage },
    { name: 'Ivory Baron #088', price: '1.79 ETH', image: ivoryImage },
    { name: 'Golden Beat #207', price: '0.99 ETH', image: goldenImage },
    { name: 'Golden Signal #160', price: '0.39 ETH', image: goldenImage },
  ]
  return <Frame title="Carrinho" hideHeading breadcrumbs={['Início', 'Mercado', 'Carrinho']}>
    {!cart.length ? <section className={`${panel} text-center`}>
      <p className="mb-4 text-sm text-[#A69C8F]">Seu carrinho está vazio.</p>
      <Link to="/mercado" className={primary}>Explorar o mercado</Link>
    </section> : <>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 xl:gap-12">
        <section className="min-w-0">
          <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_100px_120px_120px] gap-4 border-b border-[#4B3022] pb-3 text-sm font-bold tracking-wide text-[#D8C9BC] md:grid">
            <span>NFTs</span><span>Preço</span><span>Edições</span><span className="text-right">Total</span>
          </div>
          {cart.map((item) => <article key={`${item.nftId}:${item.editionId}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1.5 border-b border-[#4B3022] bg-[#211612] px-2 py-3 md:grid-cols-[minmax(0,1fr)_100px_120px_120px] md:gap-4 md:px-4 md:py-4 md:items-center">
            <div className="col-span-2 flex min-w-0 items-center gap-2 md:col-span-1 md:gap-3">
              <img src={item.image} alt={item.name} className="h-12 w-12 shrink-0 rounded-lg bg-[#1C1310] object-cover sm:h-14 sm:w-14 md:h-20 md:w-20" />
              <div className="min-w-0"><h2 className="truncate text-xs font-bold text-white md:text-base">{item.name}</h2><p className="mt-0.5 text-[10px] text-[#A69C8F] md:mt-1 md:text-sm">ID do token: #{item.nft.id}</p><p className="text-[10px] text-[#A69C8F] md:hidden">{item.nft.priceEth} ETH · {item.editionId}</p></div>
            </div>
            <div className="hidden justify-between text-sm md:block"><span className="text-[#A69C8F] md:hidden">Preço</span><span className="text-white">{item.nft.priceEth} ETH</span></div>
            <div className="col-start-1 flex items-center justify-between text-xs md:col-start-auto md:justify-start"><span className="text-[#A69C8F] md:hidden">Qtd.</span><div className="flex items-center gap-1.5"><button type="button" aria-label="Diminuir quantidade" onClick={() => item.quantity === 1 ? removeFromCart(item.nftId, item.editionId) : setQuantity(item.nftId, item.quantity - 1, item.editionId)} className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8834A] text-[12px] font-bold text-[#1A1411] hover:brightness-110">−</button><span className="min-w-5 text-center text-white">{item.quantity}</span><button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantity(item.nftId, item.quantity + 1, item.editionId)} className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8834A] text-[12px] font-bold text-[#1A1411] hover:brightness-110">+</button></div></div>
            <div className="col-start-2 row-span-2 flex items-end justify-end text-xs md:col-start-auto md:row-span-1 md:block md:text-right"><span className="font-bold text-[#E8834A]">{lineTotal(item.nft.priceEth, item.quantity)} ETH</span><button type="button" aria-label={`Remover ${item.name}`} onClick={() => removeFromCart(item.nftId, item.editionId)} className="ml-2 text-[#A69C8F] hover:text-[#E8834A] md:ml-4"><svg className="inline h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg></button></div>
          </article>)}
        </section>
        <aside className="sticky bottom-[4.25rem] z-10 rounded-lg border-t border-[#4B3022] bg-[#1C1310]/95 pt-3 backdrop-blur lg:static lg:rounded-none lg:border-l lg:border-t-0 lg:bg-transparent lg:pl-8 lg:pt-0 lg:backdrop-blur-none">
          <h2 className="mb-3 border-b border-[#4B3022] pb-2 text-sm font-bold text-white md:mb-4 md:pb-3 md:text-base">Resumo da carteira</h2>
          
          <label className="mb-1.5 block text-xs font-semibold text-[#A69C8F]" htmlFor="coupon">Código promocional</label>
          <div className="mb-4 flex rounded border border-[#A66A3E] bg-transparent p-1">
            <input id="coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} className="min-w-0 flex-1 bg-transparent px-2 text-xs text-white outline-none placeholder:text-[#766960]" placeholder="Digite o código promocional..." />
            <button type="button" onClick={() => void applyCode()} className="bg-[#D9824B] px-4 py-2 text-xs font-bold text-[#1A1411] hover:brightness-110">Aplicar</button>
          </div>
          {couponMessage && <p role="status" className="mb-3 text-[11px] text-[#E8834A]">{couponMessage}</p>}
          
          <div className="mb-4 space-y-3 text-xs text-[#F5F0E6]">
            <div className="flex justify-between"><span>Subtotal</span><span>{quote ? `${quote.subtotalEth} ETH` : quoteQuery.isFetching ? <span aria-hidden="true" className="skeleton-shimmer inline-block h-3 w-16 rounded" /> : '—'}</span></div>
            <div className="flex justify-between"><span>Desconto do lançamento</span><span>(−) {quote ? quote.discountEth : quoteQuery.isFetching ? <span aria-hidden="true" className="skeleton-shimmer inline-block h-3 w-12 rounded" /> : '0'}</span></div>
            <div className="flex justify-between"><span>Taxa de rede</span><span>{quote ? `${quote.networkFeeEth} ETH` : quoteQuery.isFetching ? <span aria-hidden="true" className="skeleton-shimmer inline-block h-3 w-16 rounded" /> : '—'}</span></div>
            <div className="text-right text-[10px] text-[#C9A982]">Taxa estimada</div>
          </div>

          <div className="mb-6 flex justify-between text-sm font-bold text-white">
            <span>Total</span>
            <span className="text-[#E8834A]">{quote ? `${quote.totalEth} ETH` : quoteQuery.isFetching ? <span aria-hidden="true" className="skeleton-shimmer inline-block h-4 w-20 rounded" /> : '—'}</span>
          </div>

          <button type="button" disabled={!quote || quoteQuery.isFetching} onClick={() => { if (!wallet) void connectWallet(); void navigate({ to: '/pagamento' }) }} className={`${primary} w-full py-3`}>Conectar e finalizar</button>
          <Link to="/mercado" className="mt-4 block text-center text-xs text-[#E8834A] hover:underline">Continuar explorando</Link>
        </aside>
      </div>
      <section className="mt-16">
        <h2 className="mb-4 border-b border-[#4B3022] pb-3 text-base font-bold tracking-wide text-[#E8834A]">Colecionadores também viram</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {suggestions.map((item) => <Link to="/mercado" key={item.name} className="group min-w-0">
            <div className="aspect-square overflow-hidden rounded-lg bg-[#2C1E17]"><img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /></div>
            <p className="mt-2 truncate text-sm font-bold text-white">{item.name}</p><p className="text-sm font-bold text-[#E8834A]">{item.price}</p>
          </Link>)}
        </div>
        <div aria-hidden="true" className="mt-3 flex justify-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#E8834A]"/><span className="h-1.5 w-1.5 rounded-full bg-[#76523F]"/><span className="h-1.5 w-1.5 rounded-full bg-[#76523F]"/></div>
      </section>
    </>}
  </Frame>
}
