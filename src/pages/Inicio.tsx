import { Link } from '@tanstack/react-router'
import { CatalogGrid } from '../components/CatalogGrid'
import heroImage from '../assets/images/image.png'
import offerImage from '../assets/images/oferta.png'
import emeraldImage from '../assets/images/Emerald.png'
import ivoryImage from '../assets/images/ivory.png'
import sageImage from '../assets/images/Sage.png'
import neonImage from '../assets/images/neon.png'
import goldenImage from '../assets/images/Golden.png'
import cosmicImage from '../assets/images/cosmic.png'

const catalogPreviewItems = [
  { name: 'Emerald Ape #042', price: '1.19', image: emeraldImage },
  { name: 'Sage Nomad #009', price: '1.69', image: sageImage },
  { name: 'Neon Vessel #552', price: '1.99', image: neonImage },
  { name: 'Ivory Baron #188', price: '1.79', image: ivoryImage },
  { name: 'Golden Beat #207', price: '0.99', image: goldenImage },
  { name: 'Cosmic Bloom #118', price: '1.29', image: cosmicImage },
]

function CatalogPreview() {
  return <div className="mb-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-6 md:grid-cols-3 lg:gap-x-10 lg:gap-y-20">
    {catalogPreviewItems.map((item) => <article key={item.name} className="flex min-w-0 flex-col gap-2 md:gap-3"><div className="aspect-square overflow-hidden rounded-lg md:rounded-xl"><img src={item.image} alt="" className="h-full w-full object-cover md:rounded-xl" /></div><p className="truncate text-[10px] text-[#F5F0E6] md:text-lg">{item.name}</p><p className="mt-0.5 text-xs font-bold text-[#E8834A] md:mt-1 md:text-[22px]">{item.price} ETH</p></article>)}
  </div>
}

export function Inicio({ backdrop = false }: { backdrop?: boolean }) {
  return (
  <div>
    <main className="relative mx-auto flex min-h-0 w-full flex-row items-center justify-between gap-3 px-4 pb-6 pt-5 md:min-h-[680px] md:flex-row md:gap-12 md:px-8 md:pb-16 md:pt-10 lg:px-[5.4vw]">
      <div className="min-w-0 flex-1 md:max-w-[760px]">
        <p className="mb-2 hidden text-base font-bold tracking-[0.15em] text-[#F5F0E6] md:mb-6 md:block">Bem-vindo à Kurio</p>
        <h1 className="mb-2 text-[clamp(1.05rem,5vw,1.45rem)] font-black uppercase leading-[1.12] tracking-tight text-[#F5F0E6] md:mb-1 md:text-[56px] md:leading-[1.7]">
          Seja dono do futuro <br /> da arte digital
        </h1>
        <p className="mb-3 line-clamp-3 max-w-[700px] text-[10px] leading-[1.45] text-[#C9A982] md:mb-10 md:text-lg md:leading-[1.65]">
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
        </p>
        <div className="mt-2 flex items-center md:mt-4">
          {/* BOTÃO EXPLORAR -> MERCADO */}
          <Link to="/mercado" className="rounded-md bg-[#E8834A] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[#1A1411] transition hover:brightness-110 md:rounded-[8px] md:px-9 md:py-3.5 md:text-lg">Explorar</Link>
        </div>
      </div>
      <div role="group" aria-label="Slide 1 de 3" className="absolute right-[47%] bottom-16 hidden items-center gap-3 md:flex">
        <span className="h-[10px] w-[10px] rounded-full bg-[#725342]" />
        <span className="h-[10px] w-[10px] rounded-full bg-[#725342]" />
        <span className="h-[10px] w-[10px] rounded-full bg-[#E8834A]" />
      </div>
      <div className="w-[42%] max-w-[170px] shrink-0 md:w-[min(36.5vw,700px)] md:max-w-none">
        <div className="aspect-square overflow-hidden rounded-xl bg-[#2C1E17] shadow-2xl md:rounded-[28px]">
          <img src={heroImage} alt="Macaco de óculos com jaqueta verde" fetchPriority="high" loading="eager" className="w-full h-full object-cover" />
        </div>
      </div>
    </main>

    <section id="catalog" className="mx-auto flex w-full flex-col gap-4 border-0 px-4 pt-3 lg:flex-row lg:gap-[60px] lg:pl-8 lg:pr-[56px] lg:pt-12">
      <aside className="hidden w-full shrink-0 flex-col gap-10 self-start bg-[#241611] px-6 py-6 lg:flex lg:w-[388px]">
        <div>
          <h2 className="text-[22px] font-bold text-[#F5F0E6] mb-5">Coleções</h2>
          <ul className="flex flex-col gap-5 text-lg">
            <li className="flex justify-between text-[#E8834A] cursor-pointer"><span>Arte digital</span><span className="text-[#A69C8F]">(33)</span></li>
            <li className="flex justify-between text-[#A69C8F] hover:text-[#F5F0E6] cursor-pointer transition"><span>Fotografia</span><span className="text-[#A69C8F]">(12)</span></li>
            <li className="flex justify-between text-[#A69C8F] hover:text-[#F5F0E6] cursor-pointer transition"><span>Música</span><span className="text-[#A69C8F]">(65)</span></li>
            <li className="flex justify-between text-[#A69C8F] hover:text-[#F5F0E6] cursor-pointer transition"><span>Arte 3D</span><span className="text-[#A69C8F]">(39)</span></li>
            <li className="flex justify-between text-[#A69C8F] hover:text-[#F5F0E6] cursor-pointer transition"><span>Colecionáveis</span><span className="text-[#A69C8F]">(23)</span></li>
            <li className="flex justify-between text-[#A69C8F] hover:text-[#F5F0E6] cursor-pointer transition"><span>Generativa</span><span className="text-[#A69C8F]">(17)</span></li>
            <li className="flex justify-between text-[#A69C8F] hover:text-[#F5F0E6] cursor-pointer transition"><span>Jogos</span><span className="text-[#A69C8F]">(19)</span></li>
            <li className="flex justify-between text-[#A69C8F] hover:text-[#F5F0E6] cursor-pointer transition"><span>Assinaturas</span><span className="text-[#A69C8F]">(13)</span></li>
            <li className="flex justify-between text-[#A69C8F] hover:text-[#F5F0E6] cursor-pointer transition"><span>Utilidade</span><span className="text-[#A69C8F]">(18)</span></li>
          </ul>
        </div>
        <div>
          <h2 className="text-[22px] font-bold text-[#F5F0E6] mb-6">Faixa de preço</h2>
          <div className="relative w-full h-1 bg-white/10 rounded-full mb-4">
            <div className="absolute left-0 top-0 h-full w-2/3 bg-[#E8834A] rounded-full"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#E8834A] rounded-full border-2 border-[#1C1310]"></div>
            <div className="absolute left-2/3 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#E8834A] rounded-full border-2 border-[#1C1310]"></div>
          </div>
          <p className="text-base text-[#A69C8F] mb-4">
            Preço: <span className="text-[#F5F0E6]">0,02 – 12,30 ETH</span>
          </p>
          <button className="bg-[#E8834A] text-[#1A1411] px-5 py-2 rounded-md font-bold text-[11px] hover:brightness-110 transition">Aplicar</button>
        </div>
        <div>
          <h2 className="text-[22px] font-bold text-[#F5F0E6] mb-5">Rede</h2>
          <ul className="flex flex-col gap-4 text-lg">
            <li className="flex justify-between text-[#A69C8F] hover:text-[#F5F0E6] cursor-pointer transition"><span>Ethereum</span><span className="text-[#A69C8F]">(119)</span></li>
            <li className="flex justify-between text-[#A69C8F] hover:text-[#F5F0E6] cursor-pointer transition"><span>Polygon</span><span className="text-[#A69C8F]">(78)</span></li>
            <li className="flex justify-between text-[#A69C8F] hover:text-[#F5F0E6] cursor-pointer transition"><span>Solana</span><span className="text-[#A69C8F]">(65)</span></li>
          </ul>
        </div>
        <div className="rounded-2xl bg-[#2C1E17] p-4 text-center cursor-pointer group transition">
          <p className="text-base text-[#E8834A] font-black tracking-wide mb-1">NFT EM DESTAQUE</p>
          <p className="text-base font-bold uppercase text-[#F5F0E6] mb-2">Oferta Limitada</p>
          <div className="w-full aspect-[5/6] overflow-hidden rounded-xl">
            <img src={offerImage} alt="NFT em oferta" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
          </div>
        </div>
      </aside>
      <div className="w-full min-w-0 max-w-[1053px] flex-1">
        <div className="mb-3 flex items-center justify-between gap-3 lg:mb-8">
          <h2 className="text-xs font-bold text-white md:hidden">Todos os NFTs</h2>
          <div className="hidden items-center gap-6 text-[13px] lg:flex">
            <button className="text-[#E8834A] font-bold">Todos os NFTs</button>
            <button className="text-[#A69C8F] hover:text-[#F5F0E6] transition">Novos lançamentos</button>
            <button className="text-[#A69C8F] hover:text-[#F5F0E6] transition">Em alta</button>
          </div>
          <div className="text-[12px] text-[#A69C8F] flex items-center gap-2">
            Ordenar por: 
            <span className="text-[#F5F0E6] font-medium cursor-pointer flex items-center gap-1">
              Listados recentemente
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </span>
          </div>
        </div>
        {backdrop ? <CatalogPreview /> : <CatalogGrid />}
      </div>
    </section>

    <div className="mx-auto mt-12 w-full px-8 pb-12 lg:pl-8 lg:pr-[56px]">
      <section aria-label="Destaques" className="mb-14 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="flex min-h-[170px] items-center gap-5 rounded-md bg-[#241611] p-3 sm:min-h-[190px] sm:gap-7">
          <img src={emeraldImage} alt="Emerald Ape" className="h-24 w-24 shrink-0 rounded-md object-cover sm:h-36 sm:w-36 lg:h-40 lg:w-40" />
          <div className="flex-1 text-right">
            <h2 className="text-sm font-bold text-[#F5F0E6]">Lançamentos gênesis de edição limitada</h2>
            <p className="my-2 text-xs leading-relaxed text-[#C9A982]">Colecionáveis exclusivos diretamente dos criadores, com revelação para colecionadores.</p>
            <Link to="/mercado" className="rounded bg-[#E8834A] px-4 py-1.5 text-xs font-bold text-[#1A1411]">Explorar →</Link>
          </div>
        </article>
        <article className="flex min-h-[170px] items-center gap-5 rounded-md bg-[#241611] p-3 sm:min-h-[190px] sm:gap-7">
          <img src={ivoryImage} alt="Ivory Baron" className="h-24 w-24 shrink-0 rounded-md object-cover sm:h-36 sm:w-36 lg:h-40 lg:w-40" />
          <div className="flex-1 text-right">
            <h2 className="text-sm font-bold text-[#F5F0E6]">Arte digital selecionada e muito mais</h2>
            <p className="my-2 text-xs leading-relaxed text-[#C9A982]">Explore novas artistas, coleções verificadas e obras digitais que definem a cultura.</p>
            <Link to="/mercado" className="rounded bg-[#E8834A] px-4 py-1.5 text-xs font-bold text-[#1A1411]">Explorar →</Link>
          </div>
        </article>
      </section>

    </div>
  </div>
  )
}
