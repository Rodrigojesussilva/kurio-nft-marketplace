import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'default', type = 'button', ...props },
  ref,
) {
  return <button
    ref={ref}
    type={type}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8834A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1310] disabled:pointer-events-none disabled:opacity-50',
      variant === 'default' && 'bg-[#E8834A] text-[#1A1411] hover:brightness-110',
      variant === 'outline' && 'border border-[#E8834A]/50 text-[#E8834A] hover:bg-white/5',
      variant === 'ghost' && 'text-[#A69C8F] hover:bg-white/5 hover:text-white',
      size === 'default' && 'min-h-10 px-5 py-2.5 text-[11px]',
      size === 'sm' && 'min-h-8 px-3 py-1.5 text-[10px]',
      className,
    )}
    {...props}
  />
})
