import emeraldImage from '../assets/images/Emerald.png'
import sageImage from '../assets/images/Sage.png'
import neonImage from '../assets/images/neon.png'
import cosmicImage from '../assets/images/cosmic.png'
import violetImage from '../assets/images/violet.png'
import ivoryImage from '../assets/images/ivory.png'
import goldenImage from '../assets/images/Golden.png'
import offerImage from '../assets/images/oferta.png'

export type Edition = { id: string; label: string; available: number; maxPerOrder: number }
export type NFT = {
  id: string
  name: string
  priceEth: string
  image: string
  artist: string
  collection: string
  category: 'Arte digital' | 'Fotografia' | 'Música' | 'Arte 3D'
  network: 'Ethereum' | 'Polygon' | 'Solana'
  rating: number
  reviewCount: number
  edition: Edition[]
  version: number
}
export type CartLine = { nftId: string; editionId: string; quantity: number }
export type CartEntry = CartLine & { nft: NFT }
export type Account = { id: string; name: string; email: string; avatar: string; username?: string; ens?: string; walletAlias?: string }
export type Wallet = { id: string; name: string; address: string; network: string; primary: boolean; displayName?: string; profileName?: string; secondaryWallet?: string; walletType?: string; referralCode?: string; email?: string; ensName?: string }
export type Order = {
  id: string
  status: 'pending' | 'confirmed' | 'rejected'
  transaction: string
  items: CartEntry[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  payment: string
  walletAddress: string
  collector: { name: string; email: string }
  createdAt: string
  version: number
}

const image = (seed: string) => `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}`
export const initialNfts: NFT[] = [
  { id: '042', name: 'Emerald Ape #042', priceEth: '1.19', image: emeraldImage, artist: 'Nova Sato', collection: 'Kurio Apes', category: 'Arte digital', network: 'Ethereum', rating: 5, reviewCount: 19, edition: [{ id: '1-1', label: '1/1', available: 1, maxPerOrder: 1 }, { id: '1-10', label: '1/10', available: 8, maxPerOrder: 3 }, { id: '1-30', label: '1/30', available: 24, maxPerOrder: 5 }], version: 1 },
  { id: '009', name: 'Sage Nomad #009', priceEth: '1.69', image: sageImage, artist: 'Ari Moon', collection: 'Kurio Nomads', category: 'Arte digital', network: 'Ethereum', rating: 4.8, reviewCount: 12, edition: [{ id: '1-1', label: '1/1', available: 1, maxPerOrder: 1 }, { id: '1-10', label: '1/10', available: 10, maxPerOrder: 4 }], version: 1 },
  { id: '552', name: 'Neon Vessel #552', priceEth: '1.99', image: neonImage, artist: 'K. Ren', collection: 'Neon Vessels', category: 'Arte 3D', network: 'Polygon', rating: 4.7, reviewCount: 9, edition: [{ id: '1-10', label: '1/10', available: 7, maxPerOrder: 3 }], version: 1 },
  { id: '118', name: 'Cosmic Bloom #118', priceEth: '1.29', image: cosmicImage, artist: 'Loraine Brown', collection: 'Cosmic Bloom', category: 'Arte digital', network: 'Ethereum', rating: 4.9, reviewCount: 22, edition: [{ id: '1-10', label: '1/10', available: 9, maxPerOrder: 4 }], version: 1 },
  { id: '314', name: 'Violet Nomad #314', priceEth: '1.39', image: violetImage, artist: 'Violet Nomad', collection: 'Kurio Nomads', category: 'Fotografia', network: 'Ethereum', rating: 4.6, reviewCount: 14, edition: [{ id: '1-10', label: '1/10', available: 20, maxPerOrder: 10 }], version: 1 },
  { id: '188', name: 'Ivory Baron #188', priceEth: '1.79', image: ivoryImage, artist: 'M. Ikeda', collection: 'Ivory Series', category: 'Fotografia', network: 'Solana', rating: 4.8, reviewCount: 16, edition: [{ id: '1-10', label: '1/10', available: 20, maxPerOrder: 10 }], version: 1 },
  { id: '207', name: 'Golden Beat #207', priceEth: '0.99', image: goldenImage, artist: 'Omar Vale', collection: 'Golden Signals', category: 'Arte 3D', network: 'Polygon', rating: 4.5, reviewCount: 7, edition: [{ id: '1-10', label: '1/10', available: 6, maxPerOrder: 4 }], version: 1 },
  { id: '999', name: 'Crystal Ape #999', priceEth: '1.49', image: offerImage, artist: 'Nova Sato', collection: 'Kurio Apes', category: 'Arte digital', network: 'Ethereum', rating: 4.9, reviewCount: 31, edition: [{ id: '1-1', label: '1/1', available: 0, maxPerOrder: 1 }], version: 1 },
  { id: '160', name: 'Golden Signal #160', priceEth: '0.39', image: goldenImage, artist: 'Omar Vale', collection: 'Golden Signals', category: 'Música', network: 'Ethereum', rating: 4.7, reviewCount: 11, edition: [{ id: '1-10', label: '1/10', available: 5, maxPerOrder: 4 }], version: 1 },
]

const generatedPrices = ['0.24', '0.38', '0.52', '0.76', '1.05', '1.38', '1.82', '2.14']
const generatedCategories: NFT['category'][] = ['Arte digital', 'Fotografia', 'Música', 'Arte 3D']
const generatedNetworks: NFT['network'][] = ['Ethereum', 'Polygon', 'Solana']
const generatedNfts: NFT[] = Array.from({ length: 36 }, (_, index) => {
  const source = initialNfts[index % initialNfts.length]
  const id = String(600 + index)
  return {
    ...source,
    id,
    name: `${source.name.split('#')[0].trim()} Edition #${id}`,
    priceEth: generatedPrices[index % generatedPrices.length],
    artist: index % 2 === 0 ? source.artist : `Studio ${source.artist}`,
    collection: `${source.collection} Editions`,
    category: generatedCategories[index % generatedCategories.length],
    network: generatedNetworks[index % generatedNetworks.length],
    rating: 4 + (index % 10) / 10,
    reviewCount: 3 + index * 2,
    edition: [{ id: '1-10', label: '1/10', available: 2 + (index % 19), maxPerOrder: 1 + (index % 5) }],
    version: 1,
  }
})
export const catalogNfts: NFT[] = [...initialNfts, ...generatedNfts]

export const demoAccounts = [
  { id: 'user-ana', name: 'Ana Colecionadora', email: 'ana@kurio.test', avatar: image('ana'), username: 'ana_colecionadora', ens: 'ana.eth', walletAlias: 'Minha carteira' },
  { id: 'user-caio', name: 'Caio Artista', email: 'caio@kurio.test', avatar: image('caio'), username: 'caio_artista', ens: 'caio.eth', walletAlias: 'Carteira principal' },
]

export const defaultCart: CartLine[] = [
  { nftId: '118', editionId: '1-10', quantity: 2 },
  { nftId: '314', editionId: '1-10', quantity: 6 },
  { nftId: '188', editionId: '1-10', quantity: 9 },
]
