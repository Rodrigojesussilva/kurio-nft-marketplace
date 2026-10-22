import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addFavorite, getApiError, getFavorites, getNft, removeFavorite } from '../lib/api'
import { useShop } from '../store'
import cosmicImage from '../assets/images/cosmic.webp'
import violetImage from '../assets/images/violet.webp'
import ivoryImage from '../assets/images/ivory.webp'
import goldenImage from '../assets/images/Golden.webp'

export function DetalhesNFT() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { nftId?: string }
  const nftId = params.nftId ?? '042'
  const { addToCart, account } = useShop()
  const queryClient = useQueryClient()
  const nftQuery = useQuery({ queryKey: ['nft', nftId], queryFn: ({ signal }) => getNft(nftId, signal) })
  const favoritesQuery = useQuery({ queryKey: ['favorites', account?.id], queryFn: ({ signal }) => getFavorites(signal), enabled: Boolean(account) })
  const favoriteMutation = useMutation({
    mutationFn: (next: boolean) => next ? addFavorite(nftId) : removeFavorite(nftId),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', account?.id] })
      const previous = queryClient.getQueryData<{ ids: string[] }>(['favorites', account?.id])
      queryClient.setQueryData(['favorites', account?.id], { ids: next ? [...new Set([...(previous?.ids ?? []), nftId])] : (previous?.ids ?? []).filter((id) => id !== nftId) })
      return { previous }
    },
    onError: (_error, _next, context) => queryClient.setQueryData(['favorites', account?.id], context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['favorites', account?.id] }),
  })
  const [quantity, setQuantity] = useState(1)
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0)
  const favorite = favoritesQuery.data?.ids.includes(nftId) ?? false
  const nft = nftQuery.data
  const [selectedEdition, setSelectedEdition] = useState('')
  const editions = Array.isArray(nft?.edition) ? nft.edition : []
  const currentEdition = editions.find((edition) => edition.id === selectedEdition && edition.available > 0) ?? editions.find((edition) => edition.available > 0)
  const maxQuantity = currentEdition ? Math.min(currentEdition.available, currentEdition.maxPerOrder) : 0
  const collectionItems = [
    { id: '118', name: 'Cosmic Bloom #118', price: '1.29 ETH', image: cosmicImage },
    { id: '314', name: 'Violet Nomad #314', price: '1.39 ETH', image: violetImage },
    { id: '188', name: 'Ivory Baron #188', price: '1.79 ETH', image: ivoryImage },
    { id: '207', name: 'Golden Beat #207', price: '0.99 ETH', image: goldenImage },
    { id: '160', name: 'Golden Signal #160', price: '0.39 ETH', image: goldenImage },
  ]

  if (nftQuery.isLoading) return <main className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1500px] px-3 py-8 lg:min-h-[1623px] lg:px-[13px]"><div role="status" aria-label="Carregando detalhes do NFT" className="grid gap-8 lg:grid-cols-2"><div className="skeleton-shimmer aspect-square rounded-2xl"/><div className="space-y-5 py-2"><div className="skeleton-shimmer h-8 w-2/3 rounded"/><div className="skeleton-shimmer h-4 w-1/3 rounded"/><div className="skeleton-shimmer h-24 rounded"/><div className="skeleton-shimmer h-12 rounded"/><div className="skeleton-shimmer h-10 w-1/2 rounded"/></div></div></main>
  if (nftQuery.isError) return <main className="mx-auto max-w-4xl px-6 py-16"><p role="alert" className="text-sm text-red-300">NFT não encontrado ou indisponível.</p><button onClick={() => void navigate({ to: '/' })} className="mt-4 text-sm text-[#E8834A]">Voltar ao início</button></main>

  return (
    <main className="mx-auto w-full max-w-[1500px] border-none px-3 pb-8 pt-3 md:pt-6 lg:px-[13px]">
      
      {/* BREADCRUMB */}
      <div className="mb-4 hidden items-center gap-2 border-none text-[13px] text-[#A69C8F] md:flex">
        <span className="hover:text-white cursor-pointer">Início</span>
        <span>/</span>
        <span className="text-white">Mercado</span>
      </div>

      {/* ================= PARTE 1: CARD PRINCIPAL ================= */}
      <div className="mb-8 flex flex-col gap-4 border-none md:mb-10 md:gap-8 lg:flex-row lg:gap-[42px]">
        
        {/* COLUNA ESQUERDA: Galeria */}
        <div className="flex w-full shrink-0 gap-[35px] lg:w-[716px]">
          <div role="group" aria-label="Galeria de imagens do NFT" className="hidden w-[125px] shrink-0 flex-col gap-[18px] lg:flex">
            {Array.from({ length: 4 }, (_, index) => <button key={index} type="button" aria-label={`Ver imagem ${index + 1} de ${nft?.name ?? 'NFT'}`} aria-pressed={selectedGalleryIndex === index} onClick={() => setSelectedGalleryIndex(index)} className={`aspect-square w-full overflow-hidden rounded-lg border-2 transition ${selectedGalleryIndex === index ? 'border-[#E8834A]' : 'border-transparent hover:border-[#6B4228]'}`}>
              <img src={nft?.image ?? 'https://api.dicebear.com/9.x/bottts/svg?seed=pirate'} alt="" className="h-full w-full object-cover" />
            </button>)}
          </div>
          <div className="min-w-0 flex-1 rounded-lg bg-[#241611] p-2 md:p-6">
            <div className="relative aspect-square w-full overflow-hidden rounded-[28px]">
              <img src={nft?.image ?? 'https://api.dicebear.com/9.x/bottts/svg?seed=pirate'} alt={nft?.name ?? 'Imagem do NFT'} fetchPriority="high" loading="eager" className="h-full w-full object-cover" />
              <div className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#1C1310]/90 text-white shadow">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Informações */}
        <div className="flex min-w-0 flex-1 flex-col border-none pt-0 lg:max-w-[716px]">
          <h1 className="mb-1 text-xl font-black text-white md:mb-2 md:text-4xl">{nft?.name ?? 'Carregando NFT…'}</h1>
          
          <div className="mb-4 flex items-center gap-2 border-b border-[#6B4228] pb-3 text-base text-[#A69C8F]">
            <span className="text-xl font-bold text-[#E8834A] md:text-[28px]">{nft?.priceEth ?? '—'} ETH</span>
            <span className="text-white/20 ml-2">•</span>
            <div className="flex items-center gap-1 ml-2">
              <span className="text-base tracking-tighter text-[#E8834A]">★★★★★</span>
              <span className="ml-1 text-[10px] md:text-base">19 avaliações de colecionadores</span>
            </div>
          </div>

          <div className="mb-4 border-none">
            <h2 className="mb-1 text-sm font-bold text-white md:mb-1.5 md:text-lg">Sobre este NFT:</h2>
            <p className="max-w-[720px] text-xs leading-relaxed text-[#C9A982] md:text-base md:leading-[1.7]">
              Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.
            </p>
          </div>

          <div className="mb-5 border-none">
            <h2 className="mb-2 text-sm font-bold text-white md:text-lg">Edição:</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#A69C8F] md:text-base">
              {editions.map((edition) => <button key={edition.id} type="button" disabled={edition.available === 0} aria-label={`${edition.label}${edition.available === 0 ? ' (esgotada)' : ` (${edition.available} disponíveis)`}`} aria-pressed={currentEdition?.id === edition.id} onClick={() => { setSelectedEdition(edition.id); setQuantity(1) }} className={`rounded-full border px-3 py-1 ${currentEdition?.id === edition.id ? 'border-[#E8834A] text-[#E8834A]' : 'border-[#6B4228] text-[#A69C8F]'} disabled:opacity-40`}>{edition.label}</button>)}
              <span className="ml-1 text-sm tracking-wider text-[#C9A982]">{currentEdition ? 'ABERTA' : 'ESGOTADA'}</span>
            </div>
            {!currentEdition && <p role="status" className="mt-2 text-sm text-amber-200">Todas as edições deste NFT estão esgotadas.</p>}
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-base text-[#A69C8F]">
              <button type="button" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D9824B] text-xl leading-none text-[#1A1411] disabled:opacity-50 md:h-[60px] md:w-10 md:text-3xl">−</button>
              <output aria-live="polite" className="min-w-7 text-center text-lg text-white md:text-2xl">{quantity}</output>
              <button type="button" aria-label="Aumentar quantidade" disabled={quantity >= maxQuantity} onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D9824B] text-xl leading-none text-[#1A1411] disabled:opacity-50 md:h-[60px] md:w-10 md:text-3xl">+</button>
            </div>
            <div className="flex items-center gap-3">
            <button disabled={!nft || nftQuery.isFetching || !currentEdition || quantity > maxQuantity} onClick={() => { if (currentEdition) void addToCart(nftId, currentEdition.id, quantity).then(() => navigate({ to: '/carrinho' })).catch(() => undefined) }} className="rounded bg-[#D9824B] px-6 py-3 text-xs font-bold uppercase text-[#1A1411] transition hover:brightness-110 disabled:opacity-50 md:px-10 md:text-base">
              Comprar
            </button>
            <button type="button" aria-pressed={favorite} onClick={() => { if (!account) { void navigate({ to: '/login' }); return } favoriteMutation.mutate(!favorite) }} className={`flex items-center justify-center gap-2 rounded border px-3 py-2.5 text-xs font-bold transition md:px-5 md:py-3 md:text-base ${favorite ? 'border-[#E8834A] bg-[#E8834A]/10 text-[#E8834A]' : 'border-[#E8834A]/70 text-[#E8834A] hover:bg-white/5'}`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              Favoritar
            </button>
            {favoriteMutation.isError && <span role="alert" className="text-xs text-red-400">{getApiError(favoriteMutation.error).message}</span>}
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-3 border-none text-xs leading-relaxed text-[#C9A982] md:text-base">
            <p>ID do token: <span className="text-white font-mono">#0842</span></p>
            <p>Coleção: <span className="text-white font-mono">Kurio Apes</span></p>
            <p>Atributos: <span className="text-white font-mono">Óculos, Esmeralda, Raro</span></p>
          </div>

          <div className="flex items-center gap-2 border-none text-base font-bold text-white">
            <span>Compartilhar este NFT:</span>
            <div className="flex gap-1.5">
              <div className="w-4 h-4 bg-white/10 rounded-sm flex items-center justify-center hover:bg-white/20 cursor-pointer transition">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </div>
              <div className="w-4 h-4 bg-white/10 rounded-sm flex items-center justify-center hover:bg-white/20 cursor-pointer transition">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </div>
              <div className="w-4 h-4 bg-white/10 rounded-sm flex items-center justify-center hover:bg-white/20 cursor-pointer transition">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ================= PARTE 2: DETALHES DO NFT ================= */}
      <div className="w-full pt-2 border-none">
        
        {/* Abas SEM a linha laranja no container */}
        <div className="mb-5 flex items-center gap-8 border-b border-[#6B4228] text-sm font-bold md:gap-10 md:text-lg">
          <span className="relative -mb-px border-b-2 border-[#E8834A] pb-3 text-[#E8834A]">
            Detalhes do NFT
          </span>
          <span className="pb-3 text-[#A69C8F]">Avaliações de colecionadores (19)</span>
        </div>

        {/* Texto Descritivo */}
        <div className="w-full space-y-5 border-none text-justify text-sm leading-relaxed text-[#C9A982] md:text-base">
          <p>
            Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.
          </p>
          <p>
            A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.
          </p>
          <div>
            <p className="font-bold text-white mb-1">Rede:</p>
            <p>Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.</p>
          </div>
          <div>
            <p className="font-bold text-white mb-1">Contrato:</p>
            <p>Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p>
          </div>
          <div>
            <p className="font-bold text-white mb-1">Direitos autorais:</p>
            <p className="font-mono text-xs mt-1 text-white/80">0x7A42...19E8 • Contrato inteligente ERC-721 verificado.</p>
          </div>
        </div>

      </div>

      {/* COLEÇÃO */}
      <section className="relative mt-16 mb-12 border-0">
        <h2 className="mb-8 border-b border-[#6B4228] pb-2 text-base font-bold tracking-wide text-[#E8834A]">Mais desta coleção</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {collectionItems.map((item) => (
            <article key={item.name} className="group min-w-0 cursor-pointer">
              <button type="button" onClick={() => void navigate({ to: '/mercado/$nftId', params: { nftId: item.id } })} aria-label={`Ver detalhes de ${item.name}`} className="block aspect-square w-full overflow-hidden rounded-xl bg-[#2C1E17] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8834A]">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </button>
              <h3 className="mt-2 truncate text-sm font-bold text-[#F5F0E6]">{item.name}</h3>
              <p className="text-sm font-bold text-[#E8834A]">{item.price}</p>
            </article>
          ))}
        </div>
        <div role="group" className="mt-8 flex justify-center gap-2" aria-label="Página 2 de 3">
          <span className="h-3.5 w-3.5 rounded-full border border-[#E8834A]" />
          <span className="h-3.5 w-3.5 rounded-full border border-[#E8834A] bg-[#E8834A]" />
          <span className="h-3.5 w-3.5 rounded-full border border-[#E8834A]" />
        </div>
      </section>

    </main>
  )
}
