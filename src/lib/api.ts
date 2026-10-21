import axios, { type AxiosError } from 'axios'
import type { Account, CartEntry, CartLine, NFT, Order, Wallet } from '../mocks/fixtures'

export type ApiError = { code: string; message: string; details?: unknown }
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number }
export type Quote = {
  quoteId: string
  items: CartEntry[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  versions: Record<string, number>
  requiresReconfirmation: boolean
}
export type NftFilters = { q?: string; category?: string; network?: string; artist?: string; minPrice?: string; maxPrice?: string; sort?: string; page?: number; pageSize?: number }

export const api = axios.create({ baseURL: '/api', timeout: 8000 })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(undefined, (error: AxiosError) => {
  const apiCode = (error.response?.data as { error?: ApiError } | undefined)?.error?.code
  if (error.response?.status === 401 && (apiCode === 'SESSION_EXPIRED' || apiCode === 'SESSION_INVALID')) {
    localStorage.removeItem('token')
    window.dispatchEvent(new Event('kurio:session-expired'))
  }
  return Promise.reject(error)
})

export const getApiError = (error: unknown): ApiError => {
  const response = (error as AxiosError<{ error?: ApiError }>).response?.data?.error
  if (response) return response
  if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') return { code: 'TIMEOUT', message: 'A solicitação demorou demais. Tente novamente.' }
  return { code: 'NETWORK_ERROR', message: 'Não foi possível conectar. Verifique a conexão e tente novamente.' }
}

export const parseEth = (value: string): bigint => {
  const [integer = '0', decimal = ''] = value.split('.')
  if (!/^\d+$/.test(integer) || (decimal && !/^\d+$/.test(decimal))) throw new Error('Valor ETH inválido.')
  return BigInt(integer) * 10n ** 18n + BigInt((decimal + '0'.repeat(18)).slice(0, 18))
}
export const formatEth = (value: bigint): string => {
  const unit = 10n ** 18n
  const integer = value / unit
  const decimal = (value % unit).toString().padStart(18, '0').replace(/0+$/, '')
  return decimal ? `${integer}.${decimal}` : `${integer}`
}

export async function getNfts(filters: NftFilters, signal?: AbortSignal) {
  return (await api.get<Page<NFT>>('/nfts', { params: filters, signal })).data
}
export async function getNft(id: string, signal?: AbortSignal) {
  return (await api.get<NFT>(`/nfts/${id}`, { signal })).data
}
export async function getCart(signal?: AbortSignal) {
  return (await api.get<{ items: CartEntry[] }>('/cart', { signal })).data
}
export async function addCartItem(line: CartLine) {
  return (await api.post<{ items: CartEntry[] }>('/cart/items', line)).data
}
export async function updateCartItem(line: CartLine) {
  return (await api.patch<{ items: CartEntry[] }>(`/cart/items/${line.nftId}/${line.editionId}`, { quantity: line.quantity })).data
}
export async function removeCartItem(nftId: string, editionId: string) {
  return (await api.delete<{ items: CartEntry[] }>(`/cart/items/${nftId}/${editionId}`)).data
}
export async function quoteCart(body: { items: CartLine[]; coupon?: string; expectedVersions?: Record<string, number> }, signal?: AbortSignal) {
  return (await api.post<Quote>('/quote', body, { signal })).data
}
export async function getSession(signal?: AbortSignal) {
  return (await api.get<{ user: Account; expiresAt: number }>('/session', { signal })).data
}
export async function login(body: { email: string; password: string }) {
  return (await api.post<{ user: Account; token: string }>('/session/login', body)).data
}
export async function register(body: { name: string; email: string; password: string }) {
  return (await api.post<{ user: Account; token: string }>('/session/register', body)).data
}
export async function logout() { return (await api.post<{ ok: true }>('/session/logout')).data }
export async function getFavorites(signal?: AbortSignal) { return (await api.get<{ ids: string[] }>('/favorites', { signal })).data }
export async function addFavorite(id: string) { return (await api.post<{ ids: string[] }>(`/favorites/${id}`)).data }
export async function removeFavorite(id: string) { return (await api.delete<{ ids: string[] }>(`/favorites/${id}`)).data }
export async function createOrder(body: { items: CartLine[]; payment: string; walletAddress: string; coupon?: string; quote: Quote; collector: { name: string; email: string } }, idempotencyKey: string) {
  return (await api.post<Order>('/orders', body, { headers: { 'Idempotency-Key': idempotencyKey } })).data
}
export async function getOrder(id: string, signal?: AbortSignal) { return (await api.get<Order>(`/orders/${id}`, { signal })).data }
export async function getProfile(signal?: AbortSignal) { return (await api.get<{ user: Account }>('/profile', { signal })).data }
export async function updateProfile(body: Partial<Pick<Account, 'name' | 'email' | 'avatar' | 'username' | 'ens' | 'walletAlias'>>) { return (await api.patch<{ user: Account }>('/profile', body)).data }
export async function changePassword(body: { currentPassword: string; newPassword: string }) { return (await api.post<{ ok: true }>('/profile/password', body)).data }
export async function getWallets(signal?: AbortSignal) { return (await api.get<{ wallets: Wallet[] }>('/wallets', { signal })).data }
export async function addWallet(body: Omit<Wallet, 'id'>) { return (await api.post<{ wallets: Wallet[] }>('/wallets', body)).data }
export async function updateWallet(id: string, body: Partial<Omit<Wallet, 'id'>>) { return (await api.patch<{ wallets: Wallet[] }>(`/wallets/${id}`, body)).data }
export async function removeWallet(id: string) { return (await api.delete<{ wallets: Wallet[] }>(`/wallets/${id}`)).data }
