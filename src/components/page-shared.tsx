import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { formatEth, parseEth } from '../lib/api'

export const panel = 'rounded-xl border border-white/5 bg-[#2C1E17] p-5 sm:p-6'
export const label = 'mb-1.5 block text-[11px] font-semibold text-[#A69C8F]'
export const input = 'w-full rounded-md border border-white/10 bg-[#1C1310] px-3 py-2.5 text-[12px] text-white outline-none transition placeholder:text-[#766960] focus:border-[#E8834A]'
export const primary = 'inline-flex items-center justify-center rounded-md bg-[#E8834A] px-5 py-2.5 text-[11px] font-bold uppercase text-[#1A1411] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
export const secondary = 'inline-flex items-center justify-center rounded-md border border-[#E8834A]/50 px-4 py-2 text-[11px] font-bold text-[#E8834A] transition hover:bg-white/5'
export const lineTotal = (priceEth: string, quantity: number) => formatEth(parseEth(priceEth) * BigInt(quantity))

export function Frame({ title, children, hideHeading = false, hideBreadcrumbs = false, breadcrumbs }: { title: string; children: ReactNode; hideHeading?: boolean; hideBreadcrumbs?: boolean; breadcrumbs?: string[] }) {
  return <main className="mx-auto w-full max-w-[1500px] px-4 py-3 sm:px-8 sm:py-8 lg:px-12">
    {!hideBreadcrumbs && <div className="mb-6 hidden items-center gap-2 text-[11px] text-[#A69C8F] md:flex">{(breadcrumbs ?? ['Início', title]).map((crumb, index, list) => <span key={crumb} className="flex items-center gap-2">{index > 0 && <span>/</span>}{index === list.length - 1 ? <span className="text-white">{crumb}</span> : crumb === 'Início' ? <Link to="/" className="hover:text-white">{crumb}</Link> : <span>{crumb}</span>}</span>)}</div>}
    {!hideHeading && <h1 className="mb-6 hidden text-2xl font-black text-white md:block md:text-[28px]">{title}</h1>}
    {children}
  </main>
}
