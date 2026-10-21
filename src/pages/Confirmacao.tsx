import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrder } from '../lib/api'
import { Frame, lineTotal, primary } from '../components/page-shared'

export function Confirmacao() {
  const { orderId } = useParams({ strict: false }) as { orderId?: string }
  const queryClient = useQueryClient()
  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: async ({ signal }) => {
      const fresh = await getOrder(orderId!, signal)
      const current = queryClient.getQueryData<typeof fresh>(['order', orderId])
      if (current && (current.status !== 'pending' || fresh.version < current.version)) return current
      return fresh
    },
    enabled: Boolean(orderId),
    refetchInterval: (query) => query.state.data?.status === 'pending' ? 1000 : false,
  })
  const order = orderQuery.data
  useEffect(() => {
    if (order?.status === 'rejected' || order?.status === 'confirmed') {
      const lines = order.items.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity }))
      localStorage.removeItem(`kurio-checkout-attempt:${JSON.stringify(lines)}`)
    }
  }, [order])
  const title = order?.status === 'confirmed' ? 'Pedido confirmado' : order?.status === 'rejected' ? 'Pagamento recusado' : 'Pedido em processamento'
  const statusLabel = order?.status === 'confirmed' ? 'Confirmado' : order?.status === 'rejected' ? 'Recusado' : 'Pendente'
  return <Frame title={title} hideHeading>
    <section className="mx-auto max-w-[850px] overflow-hidden rounded-lg border border-[#6B4228] bg-[#211612]">
      <h1 className="sr-only">{title}</h1>
      <header className="relative border-b border-[#8A5937] bg-[#261711] px-4 py-6 text-center sm:px-10 sm:py-7">
        <Link to="/" aria-label="Fechar confirmação" className="absolute right-5 top-4 text-3xl leading-none text-[#D9824B] hover:text-white">×</Link>
        {order?.status === 'confirmed' ? <svg aria-hidden="true" viewBox="0 0 88 104" className="mx-auto mb-4 h-[104px] w-[88px]" fill="none" stroke="#D9824B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 12h58a5 5 0 0 1 5 5v75a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5V17a5 5 0 0 1 5-5Z" />
          <path d="m10 35 34 35 34-35M10 92l25-27m43 27L53 65M32 12a12 12 0 0 1 24 0" />
          <path d="M24 28h40v24H24z" fill="#261711" />
          <text x="44" y="39" textAnchor="middle" fill="#D9824B" stroke="none" fontSize="11" fontWeight="800">THANK</text>
          <text x="44" y="51" textAnchor="middle" fill="#D9824B" stroke="none" fontSize="11" fontWeight="800">YOU</text>
        </svg> : <div className={"mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border-2 text-2xl font-black " + (order?.status === 'rejected' ? 'border-red-400 text-red-400' : 'border-[#E8834A] text-[#E8834A]')} aria-hidden="true">{order?.status === 'rejected' ? '×' : '…'}</div>}
        {order?.status !== 'confirmed' && <h2 className="text-xl font-bold text-white">{order?.status === 'rejected' ? 'Não foi possível concluir o pagamento' : 'Aguardando confirmação do pedido'}</h2>}
        <p className="mt-1 text-lg font-bold text-[#C9A982]">{order?.status === 'confirmed' ? 'Seus NFTs agora estão na sua carteira' : statusLabel}</p>
      </header>
      {orderQuery.isLoading && <p role="status" className="p-8 text-center text-sm text-[#C9A982]">Carregando pedido…</p>}
      {orderQuery.isError && <div className="p-8 text-center"><p role="alert" className="mb-4 text-sm text-red-400">Não foi possível carregar este pedido.</p><Link to="/" className={primary}>Voltar ao início</Link></div>}
      {!orderQuery.isLoading && !orderQuery.isError && !order && <div className="p-8 text-center"><p role="alert" className="mb-4 text-sm text-red-400">Pedido não encontrado.</p><Link to="/" className={primary}>Voltar ao início</Link></div>}
      {order && <>
        <div className="grid grid-cols-2 border-b border-[#6B4228] text-xs sm:grid-cols-4">
          <div className="border-b border-r border-[#6B4228] px-4 py-3 sm:border-b-0"><p className="text-[#A69C8F]">ID da transação</p><p className="mt-1 font-mono text-white">{order.transaction ? order.transaction.slice(0, 7) + '…' + order.transaction.slice(-4) : order.id}</p></div>
          <div className="border-b border-[#6B4228] px-4 py-3 sm:border-b-0 sm:border-r"><p className="text-[#A69C8F]">Data</p><p className="mt-1 text-white">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(order.createdAt))}</p></div>
          <div className="border-r border-[#6B4228] px-4 py-3"><p className="text-[#A69C8F]">Total</p><p className="mt-1 text-white">{order.totalEth} ETH</p></div>
          <div className="px-4 py-3"><p className="text-[#A69C8F]">Carteira</p><p className="mt-1 truncate text-white">{order.payment.split(' · ')[0]}</p></div>
        </div>
        <div className="p-3 sm:p-7">
          <h3 className="mb-3 text-sm font-bold text-white">Detalhes da transação</h3>
          <div className="grid grid-cols-[minmax(0,1fr)_72px_92px] gap-2 border-b border-[#6B4228] pb-2 text-xs font-bold text-[#D8C9BC] sm:grid-cols-[minmax(0,1fr)_120px_130px] sm:gap-3 sm:text-base">
            <span>NFTs</span><span className="text-center">Edições</span><span className="text-right">Subtotal</span>
          </div>
          <div className="divide-y divide-[#4B3022]">
            {order.items.map((item) => <div key={item.nftId + ':' + item.editionId} className="grid grid-cols-[minmax(0,1fr)_72px_92px] items-center gap-2 py-2.5 text-xs sm:grid-cols-[minmax(0,1fr)_120px_130px] sm:gap-3 sm:py-3.5 sm:text-base">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3"><img src={item.nft.image} alt={item.nft.name} className="h-12 w-12 shrink-0 rounded-md object-cover sm:h-[86px] sm:w-[86px]"/><div className="min-w-0"><p className="truncate font-semibold text-white sm:text-lg">{item.nft.name}</p><p className="mt-0.5 text-[#A69C8F]">ID do token: #{item.nft.id}</p></div></div>
              <span className="text-center text-[#C9A982]">(x {item.quantity})</span>
              <span className="text-right font-bold text-[#E8834A]">{lineTotal(item.nft.priceEth, item.quantity)} ETH</span>
            </div>)}
          </div>
          <div className="ml-auto mt-3 max-w-[250px] space-y-2 text-sm">
            <p className="flex justify-between text-[#D8C9BC]"><span>Taxa de rede</span><span>{order.networkFeeEth} ETH</span></p>
            <p className="flex justify-between border-b border-[#6B4228] pb-2 font-bold text-white"><span>Total</span><span className="text-[#E8834A]">{order.totalEth} ETH</span></p>
          </div>
          <div className="mt-5 border-t border-[#8A5937] px-2 pb-2 pt-4 text-center">
            <p className="mx-auto max-w-xl text-sm leading-6 text-[#C9A982]">{order.status === 'confirmed' ? 'Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira conectada e registrada na rede.' : order.status === 'rejected' ? 'A transação não foi concluída. Seus NFTs permanecem no carrinho.' : 'Aguardando confirmação da transação na rede.'}</p>
            {order.transaction && <a href={'https://etherscan.io/tx/' + order.transaction} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-14 items-center justify-center rounded-md bg-[#D9824B] px-6 text-base font-bold text-[#1A1411] transition hover:brightness-110">Ver no Etherscan</a>}
          </div>
        </div>
      </>}
    </section>
  </Frame>
}
