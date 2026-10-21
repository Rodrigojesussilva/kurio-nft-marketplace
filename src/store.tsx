import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from './lib/api'
import type { Account, CartEntry, Order } from './mocks/fixtures'
import type { Quote } from './lib/api'

export type StoreCartItem = CartEntry & { id: string; name: string; image: string }
export const NETWORK_FEE_ETH = 0.016
type ShopState = {
  cart: StoreCartItem[]
  account: Account | null
  updateAccount: (account: Account) => void
  wallet: string | null
  coupon: string
  cartLoading: boolean
  addToCart: (nftId?: string, editionId?: string, quantity?: number) => Promise<void>
  removeFromCart: (id: string, editionId?: string) => Promise<void>
  setQuantity: (id: string, quantity: number, editionId?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<Account>
  register: (name: string, email: string, password: string) => Promise<Account>
  signOut: () => Promise<void>
  connectWallet: (address?: string) => Promise<string>
  createOrder: (payment: string, quote: Quote, idempotencyKey: string, collector: { name: string; email: string }, walletAddress?: string) => Promise<Order>
  applyCoupon: (code: string) => Promise<boolean>
}

const ShopContext = createContext<ShopState | null>(null)
const tokenExists = () => typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('token'))
const cartKey = (userId: string | null) => ['cart', userId ?? 'guest'] as const
const toStoreItem = (entry: CartEntry): StoreCartItem => ({ ...entry, id: entry.nftId, name: entry.nft.name, image: entry.nft.image })

export function ShopProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [hasToken, setHasToken] = useState(tokenExists)
  const [accountOverride, setAccountOverride] = useState<Account | null>(null)
  const [coupon, setCoupon] = useState(() => {
    try { return localStorage.getItem('kurio-coupon') ?? '' } catch { return '' }
  })
  const [wallet, setWallet] = useState<string | null>(() => {
    try { return localStorage.getItem('kurio-wallet') } catch { return null }
  })

  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: ({ signal }) => service.getSession(signal),
    enabled: hasToken,
    retry: false,
    staleTime: 30_000,
  })
  useEffect(() => {
    if (sessionQuery.isError) {
      localStorage.removeItem('token')
      setHasToken(false)
      setAccountOverride(null)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'catalog' && query.queryKey[0] !== 'nft' })
    }
  }, [sessionQuery.isError, queryClient])
  useEffect(() => {
    const expireSession = () => {
      setHasToken(false)
      setAccountOverride(null)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'catalog' && query.queryKey[0] !== 'nft' })
    }
    window.addEventListener('kurio:session-expired', expireSession)
    return () => window.removeEventListener('kurio:session-expired', expireSession)
  }, [queryClient])

  const account = accountOverride ?? sessionQuery.data?.user ?? null
  const updateAccount = (next: Account) => {
    setAccountOverride(next)
    queryClient.setQueryData(['session'], (previous: { user: Account; expiresAt: number } | undefined) => previous ? { ...previous, user: next } : previous)
  }
  const cartQuery = useQuery({
    queryKey: cartKey(account?.id ?? null),
    queryFn: ({ signal }) => service.getCart(signal),
    staleTime: 0,
    refetchInterval: 15_000,
  })
  const cart = useMemo(() => (cartQuery.data?.items ?? []).map(toStoreItem), [cartQuery.data])

  const syncCart = (items: CartEntry[]) => queryClient.setQueryData(cartKey(account?.id ?? null), { items })

  const addToCart = async (nftId = '042', editionId = '1-10', quantity = 1) => {
    const current = cart.find((line) => line.nftId === nftId && line.editionId === editionId)
    const result = await service.addCartItem({ nftId, editionId, quantity })
    syncCart(result.items)
    if (current) queryClient.invalidateQueries({ queryKey: cartKey(account?.id ?? null) })
  }

  const removeFromCart = async (id: string, editionId?: string) => {
    const current = cart.find((line) => line.nftId === id && (!editionId || line.editionId === editionId))
    if (!current) return
    await service.removeCartItem(current.nftId, current.editionId)
    queryClient.setQueryData(cartKey(account?.id ?? null), (previous: { items: CartEntry[] } | undefined) => ({ items: (previous?.items ?? []).filter((line) => !(line.nftId === current.nftId && line.editionId === current.editionId)) }))
  }

  const setQuantity = async (id: string, quantity: number, editionId?: string) => {
    const current = cart.find((line) => line.nftId === id && (!editionId || line.editionId === editionId))
    if (!current) return
    const result = await service.updateCartItem({ nftId: current.nftId, editionId: current.editionId, quantity })
    syncCart(result.items)
  }

  const signIn = async (email: string, password: string) => {
    const result = await service.login({ email, password })
    if (account?.id !== result.user.id) queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'catalog' && query.queryKey[0] !== 'nft' })
    localStorage.setItem('token', result.token)
    setHasToken(true)
    setAccountOverride(result.user)
    queryClient.setQueryData(['session'], { user: result.user, expiresAt: Date.now() + 3_600_000 })
    await queryClient.invalidateQueries({ queryKey: cartKey(result.user.id) })
    return result.user
  }

  const register = async (name: string, email: string, password: string) => {
    const result = await service.register({ name, email, password })
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'catalog' && query.queryKey[0] !== 'nft' })
    localStorage.setItem('token', result.token)
    setHasToken(true)
    setAccountOverride(result.user)
    queryClient.setQueryData(['session'], { user: result.user, expiresAt: Date.now() + 3_600_000 })
    await queryClient.invalidateQueries({ queryKey: cartKey(result.user.id) })
    return result.user
  }

  const signOut = async () => {
    try { await service.logout() } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('kurio-wallet')
      localStorage.removeItem('kurio-coupon')
      setHasToken(false)
      setAccountOverride(null)
      setWallet(null)
      setCoupon('')
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'catalog' && query.queryKey[0] !== 'nft' })
      await queryClient.invalidateQueries({ queryKey: cartKey(null) })
    }
  }

  const connectWallet = async (address?: string) => {
    if (!account) throw new Error('Entre na sua conta para conectar uma carteira.')
    const result = await service.getWallets()
    let primary = result.wallets.find((item) => item.address === address) ?? result.wallets.find((item) => item.primary)
    if (!primary) {
      const created = await service.addWallet({ name: 'Carteira de demonstração', address: '0x71c79a42', network: 'Ethereum', primary: true })
      primary = created.wallets[0]
    }
    setWallet(primary.address)
    localStorage.setItem('kurio-wallet', primary.address)
    return primary.address
  }

  const applyCoupon = async (code: string) => {
    try {
      await service.quoteCart({ items: cart.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity })), coupon: code })
      setCoupon(code.trim().toUpperCase())
      localStorage.setItem('kurio-coupon', code.trim().toUpperCase())
      return true
    } catch { return false }
  }

  const createOrder = (payment: string, quote: Quote, idempotencyKey: string, collector: { name: string; email: string }, walletAddress?: string) => service.createOrder({
    items: cart.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity })),
    payment,
    walletAddress: walletAddress ?? wallet ?? '',
    coupon: coupon || undefined,
    quote,
    collector,
  }, idempotencyKey)

  const value: ShopState = {
    cart, account, updateAccount, wallet, coupon, cartLoading: cartQuery.isLoading,
    addToCart, removeFromCart, setQuantity, signIn, register, signOut,
    connectWallet, createOrder, applyCoupon,
  }
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const value = useContext(ShopContext)
  if (!value) throw new Error('useShop deve ser usado dentro de ShopProvider.')
  return value
}
