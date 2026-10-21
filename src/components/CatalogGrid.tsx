import { useMemo } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getNfts, type NftFilters } from '../lib/api'

export function CatalogGrid() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const filters: NftFilters = { ...search, page: search.page ?? 1, pageSize: 9 }
  const query = useQuery({ queryKey: ['catalog', filters], queryFn: ({ signal }) => getNfts(filters, signal), placeholderData: (previous) => previous })
  const update = (patch: Partial<NftFilters>) => {
    const next = { ...filters, ...patch, page: patch.page ?? (Object.keys(patch).some((key) => key !== 'page') ? 1 : filters.page) }
    void navigate({ search: { ...next, pageSize: undefined } })
  }
  const nfts = useMemo(() => query.data?.items ?? [], [query.data])
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / (filters.pageSize ?? 9)))

  return <div className="mb-6">
    <details className="group mb-3 md:mb-4">
      <summary className="cursor-pointer text-sm text-[#A69C8F] hover:text-[#E8834A]">Busca e filtros</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_170px_150px_150px_150px]">
      <label className="sr-only" htmlFor="catalog-search">Buscar NFTs</label>
      <input id="catalog-search" value={filters.q ?? ''} onChange={(event) => update({ q: event.target.value })} placeholder="Buscar NFT, coleção ou artista" className="rounded-md border border-white/10 bg-[#2C1E17] px-3 py-2 text-xs text-white outline-none focus:border-[#E8834A]" />
      <select aria-label="Categoria" value={filters.category ?? ''} onChange={(event) => update({ category: event.target.value })} className="rounded-md border border-white/10 bg-[#2C1E17] px-3 py-2 text-xs text-white"><option value="">Todas as categorias</option>{['Arte digital', 'Fotografia', 'Música', 'Arte 3D'].map((value) => <option key={value}>{value}</option>)}</select>
      <select aria-label="Rede" value={filters.network ?? ''} onChange={(event) => update({ network: event.target.value })} className="rounded-md border border-white/10 bg-[#2C1E17] px-3 py-2 text-xs text-white"><option value="">Todas as redes</option>{['Ethereum', 'Polygon', 'Solana'].map((value) => <option key={value}>{value}</option>)}</select>
      <input aria-label="Preço mínimo em ETH" inputMode="decimal" value={filters.minPrice ?? ''} onChange={(event) => update({ minPrice: event.target.value })} placeholder="Mín. ETH" className="rounded-md border border-white/10 bg-[#2C1E17] px-3 py-2 text-xs text-white outline-none focus:border-[#E8834A]" />
      <input aria-label="Preço máximo em ETH" inputMode="decimal" value={filters.maxPrice ?? ''} onChange={(event) => update({ maxPrice: event.target.value })} placeholder="Máx. ETH" className="rounded-md border border-white/10 bg-[#2C1E17] px-3 py-2 text-xs text-white outline-none focus:border-[#E8834A]" />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[#A69C8F]">{query.isFetching ? 'Atualizando catálogo…' : `${query.data?.total ?? 0} NFTs encontrados`}</p>
      <select aria-label="Ordenar NFTs" value={filters.sort ?? 'recent'} onChange={(event) => update({ sort: event.target.value })} className="rounded-md border border-white/10 bg-[#2C1E17] px-3 py-2 text-xs text-white"><option value="recent">Listados recentemente</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="rating">Melhor avaliados</option></select>
      </div>
    </details>
    {query.isLoading ? <div role="status" aria-label="Carregando NFTs" className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i}><div className="skeleton-shimmer aspect-square rounded-lg md:rounded-2xl"/><div className="skeleton-shimmer mt-3 h-3 w-2/3 rounded"/><div className="skeleton-shimmer mt-2 h-3 w-1/3 rounded"/></div>)}</div>
      : query.isError ? <div role="alert" className="rounded-lg border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-200">Não foi possível carregar o catálogo. <button onClick={() => void query.refetch()} className="ml-2 underline">Tentar novamente</button></div>
      : nfts.length === 0 ? <p className="rounded-lg border border-white/10 p-8 text-center text-sm text-[#A69C8F]">Nenhum NFT corresponde aos filtros.</p>
      : <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-6 sm:gap-y-8 md:grid-cols-3 lg:gap-x-10 lg:gap-y-20">{nfts.map((nft) => <Link key={nft.id} to="/mercado/$nftId" params={{ nftId: nft.id }} className="group flex min-w-0 cursor-pointer flex-col gap-2 md:gap-3"><div className="aspect-square overflow-hidden rounded-lg md:rounded-xl"><img src={nft.image} alt={nft.name} className="h-full w-full rounded-lg object-cover transition duration-500 group-hover:scale-[1.02] md:rounded-xl" /></div>{nft.id !== '999' && <div><p className="truncate text-[10px] text-[#F5F0E6] md:text-lg">{nft.name}</p><p className="mt-0.5 text-xs font-bold text-[#E8834A] md:mt-1 md:text-[22px]">{nft.priceEth} ETH</p></div>}</Link>)}</div>}
    {query.data && totalPages > 1 && <nav aria-label="Paginação do catálogo" className="mt-8 flex flex-wrap items-center justify-end gap-2">
      <button type="button" disabled={filters.page! <= 1} onClick={() => update({ page: filters.page! - 1 })} className="rounded border border-white/10 px-3 py-2 text-xs text-[#A69C8F] hover:text-white disabled:opacity-40">Anterior</button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <button key={page} type="button" aria-current={page === filters.page ? 'page' : undefined} onClick={() => update({ page })} className={page === filters.page ? 'h-8 min-w-8 rounded bg-[#E8834A] px-2 text-xs font-bold text-[#1A1411]' : 'h-8 min-w-8 rounded border border-white/10 px-2 text-xs text-[#A69C8F] hover:text-white'}>{page}</button>)}
      <button type="button" disabled={filters.page! >= totalPages} onClick={() => update({ page: filters.page! + 1 })} className="rounded border border-white/10 px-3 py-2 text-xs text-[#A69C8F] hover:text-white disabled:opacity-40">Próxima</button>
    </nav>}
  </div>
}
