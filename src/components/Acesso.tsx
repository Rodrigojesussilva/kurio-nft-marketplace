import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Button } from './ui/button'
import { getApiError } from '../lib/api'
import { useShop } from '../store'
import { input, label } from './page-shared'

export function Acesso({ cadastro = false }: { cadastro?: boolean }) {
  const { signIn, register } = useShop()
  const dialogRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []).filter((element) => element.getClientRects().length > 0)
    focusable()[0]?.focus()
    const trapDialogFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { void router.navigate({ to: '/' }); return }
      if (event.key !== 'Tab') return
      const elements = focusable()
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (!first || !last) { event.preventDefault(); dialogRef.current?.focus(); return }
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', trapDialogFocus)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', trapDialogFocus); previousFocus?.focus() }
  }, [router])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') || '')
    const email = String(data.get('email') || '')
    const password = String(data.get('password') || '')
    const confirmPassword = String(data.get('confirmPassword') || '')
    if (!email.includes('@')) { setError('Informe um e-mail válido.'); return }
    if (cadastro && password.length < 8) { setError('A senha precisa ter pelo menos 8 caracteres.'); return }
    if (cadastro && password !== confirmPassword) { setError('As senhas não coincidem.'); return }
    if (!cadastro) {
      localStorage.removeItem('kurio-scenario')
      const url = new URL(window.location.href)
      url.searchParams.delete('scenario')
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    }
    setBusy(true)
    setError('')
    try {
      if (cadastro) await register(name, email, password)
      else await signIn(email, password)
      const returnTo = new URLSearchParams(window.location.search).get('returnTo')
      let destination = '/perfil'
      if (returnTo) {
        try {
          const target = new URL(returnTo, window.location.origin)
          const allowedPath = target.pathname === '/carrinho' || target.pathname === '/pagamento' || target.pathname === '/perfil' || target.pathname === '/carteiras' || /^\/confirmacao\/[A-Za-z0-9-]+$/.test(target.pathname)
          if (target.origin === window.location.origin && allowedPath) destination = `${target.pathname}${target.search}${target.hash}`
        } catch { /* Invalid return locations fall back to the profile. */ }
      }
      router.history.push(destination)
    } catch (cause) {
      setError(getApiError(cause).message)
    } finally {
      setBusy(false)
    }
  }
  return <main className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-y-auto bg-[#120B08] px-0 py-4 sm:bg-[#120B08]/75 sm:px-4 sm:py-2" onMouseDown={(event) => { if (event.target === event.currentTarget) void router.navigate({ to: '/' }) }}>
    <form ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="access-dialog-title" onSubmit={submit} className={`relative z-10 my-auto w-full rounded-none border-0 bg-transparent p-6 shadow-none sm:rounded-none sm:border sm:border-[#70452D]/70 sm:bg-[#211510]/[.98] sm:shadow-2xl ${cadastro ? 'max-w-[420px] sm:p-8' : 'max-w-[360px] sm:min-h-[750px] sm:max-w-[625px] sm:px-[100px] sm:pb-10 sm:pt-[55px]'}`}>
      <p className="mb-10 text-center text-sm font-black tracking-[0.3em] text-white sm:hidden">KURIO</p>
      <div className={`mb-4 hidden items-center sm:flex ${cadastro ? 'justify-between border-b border-[#6B4228] pb-3' : 'justify-center'}`}>
        <div className={`flex items-center gap-3 font-bold ${cadastro ? 'text-xs' : 'text-[26px]'}`}><Link to="/login" className={!cadastro ? 'text-[#E8834A]' : 'text-[#A69C8F] hover:text-white'}>Entrar</Link><span className="font-normal text-[#6B4228]">|</span><Link to="/cadastro" className={cadastro ? 'text-[#E8834A]' : 'text-white hover:text-[#E8834A]'}>Criar conta</Link></div>
        {cadastro && <button type="button" aria-label="Voltar ao início" onClick={() => void router.navigate({ to: '/' })} className="text-lg leading-none text-[#A69C8F] transition hover:text-white">×</button>}
        {!cadastro && <button type="button" aria-label="Fechar login" onClick={() => void router.navigate({ to: '/' })} className="absolute right-4 top-4 text-3xl leading-none text-[#D9824B] transition hover:text-white">×</button>}
      </div>
      <h1 id="access-dialog-title" className={`mb-2 text-center font-black text-white ${!cadastro ? 'sm:sr-only' : 'text-sm sm:text-left sm:text-base'}`}>{cadastro ? 'Criar conta' : 'Entrar'}</h1>
      <p className={`mb-6 text-center text-[10px] leading-4 text-[#A69C8F] sm:mb-7 ${cadastro ? 'sm:text-left' : 'sm:text-base sm:leading-5'}`}>{cadastro ? 'Crie seu acesso para acompanhar compras, coleções e seu perfil.' : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}</p>
      {cadastro && <label className="mb-3 block"><span className={label}>Nome</span><input name="name" className={`${input} py-3 text-[11px]`} autoComplete="name" required placeholder="Seu nome" /></label>}
      <label className="mb-3 block"><span className={cadastro ? label : 'sr-only'}>E-mail</span><input name="email" className={`${input} py-3 text-[11px] ${!cadastro ? 'sm:h-[50px] sm:px-5 sm:text-base' : ''}`} autoComplete="email" type="email" required placeholder={cadastro ? 'voce@email.com' : 'contato@email.com'} /></label>
      <label className="mb-2 block"><span className={cadastro ? label : 'sr-only'}>Senha</span><span className="relative block"><input aria-label="Senha" name="password" className={`${input} py-3 pr-12 text-[11px] ${!cadastro ? 'sm:h-[50px] sm:px-5 sm:text-base' : ''}`} autoComplete={cadastro ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} required minLength={cadastro ? 8 : undefined} placeholder={cadastro ? 'Sua senha' : '***********'} /><button type="button" aria-label={showPassword ? 'Ocultar' : 'Exibir'} onClick={() => setShowPassword((shown) => !shown)} className="absolute inset-y-0 right-3 flex items-center text-[#C9A982]" title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" d="m3 21 18-18"/></svg></button></span></label>
      {cadastro ? <label className="mb-3 block"><span className={label}>Confirmar senha</span><input name="confirmPassword" className={`${input} py-3 text-[11px]`} autoComplete="new-password" type="password" required minLength={8} placeholder="Confirme sua senha" /></label> : <div className="mb-3 text-right sm:mb-7"><button type="button" onClick={() => setError('A recuperação de senha ainda não está disponível.')} className="text-[9px] text-[#E8834A] hover:underline sm:text-base">Esqueceu a senha?</button></div>}
      {error && <p role="alert" className="mb-3 text-xs text-red-400">{error}</p>}
      <Button disabled={busy} className={`w-full ${!cadastro ? 'sm:min-h-14 sm:text-xl' : ''}`} type="submit">{busy ? 'Aguarde…' : cadastro ? 'Criar conta' : 'Entrar'}</Button>
      <div className="my-3 flex items-center gap-2 text-[9px] text-[#A69C8F] sm:my-8 sm:text-base"><span className="h-px flex-1 bg-[#6B4228]"/><span>Ou continue com</span><span className="h-px flex-1 bg-[#6B4228]"/></div>
      <div className="grid gap-2 sm:gap-4"><button type="button" onClick={() => setError('O acesso com Google ainda não está disponível.')} className="flex min-h-10 items-center justify-center gap-3 rounded-md border border-[#4B3022] px-3 py-2 text-[10px] text-[#C9A982] hover:border-[#E8834A]/60 sm:min-h-[50px] sm:text-base"><span aria-hidden="true" className="bg-gradient-to-br from-blue-500 via-green-500 to-yellow-400 bg-clip-text text-xl font-black text-transparent">G</span>Continuar com Google</button><button type="button" onClick={() => setError('O acesso com Facebook ainda não está disponível.')} className="flex min-h-10 items-center justify-center gap-3 rounded-md border border-[#4B3022] px-3 py-2 text-[10px] text-[#C9A982] hover:border-[#E8834A]/60 sm:min-h-[50px] sm:text-base"><span aria-hidden="true" className="text-2xl font-black text-[#4267B2]">f</span>Continuar com Facebook</button></div>
      <p className="mt-10 text-center text-base text-[#C9A982] sm:hidden">{cadastro ? <>Já tem uma conta? <Link className="font-semibold text-[#E8834A] hover:underline" to="/login">Entre</Link></> : <>Novo na Kurio? <Link className="font-semibold text-[#E8834A] hover:underline" to="/cadastro">Crie uma conta</Link></>}</p>
    </form>
  </main>
}
