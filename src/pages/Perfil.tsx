import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changePassword, getApiError, getProfile, updateProfile } from '../lib/api'
import { useShop } from '../store'
import { Frame, input, label, panel, primary, secondary } from '../components/page-shared'

export function Perfil() {
  const { account, signOut, updateAccount } = useShop()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState(false)
  const profileQuery = useQuery({ queryKey: ['profile', account?.id], queryFn: ({ signal }) => getProfile(signal), enabled: Boolean(account) })
  const saveProfile = useMutation({ mutationFn: updateProfile, onSuccess: (result) => { queryClient.setQueryData(['profile', account?.id], result); updateAccount(result.user); setMessage('Perfil atualizado.') } })
  const savePassword = useMutation({ mutationFn: changePassword, onSuccess: () => setMessage('Senha alterada com sucesso.') })
  if (!account) return <Frame title="Meu perfil"><section className={panel}><p className="mb-4 text-xs text-[#A69C8F]">Entre ou crie uma conta para ver seu perfil.</p><div className="flex gap-3"><Link to="/login" className={primary}>Entrar</Link><Link to="/cadastro" className={secondary}>Criar conta</Link></div></section></Frame>
  const profile = profileQuery.data?.user ?? account
  return <Frame title="Perfil do Colecionador" hideHeading hideBreadcrumbs>
    <div className="grid gap-8 lg:grid-cols-[minmax(280px,388px)_minmax(0,1fr)] xl:gap-9">
      <aside className="h-fit bg-[#241611] py-4">
        <h2 className="mb-2 px-3 text-lg font-bold text-white">Meu perfil</h2>
        <nav className="flex flex-wrap gap-1 md:flex-col md:gap-0" aria-label="Menu do perfil">
          <span aria-current="page" className="flex items-center gap-4 border-l-[6px] border-[#E8834A] bg-[#E8834A]/5 px-4 py-3 text-sm text-[#E8834A]"><span aria-hidden="true" className="w-5 text-center">♙</span>Dados do perfil</span>
          <Link to="/carteiras" className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982] hover:border-[#E8834A] hover:text-white"><span aria-hidden="true" className="w-5 text-center">♧</span>Carteiras</Link>
          <span className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982]"><span aria-hidden="true" className="w-5 text-center">♧</span>Atividade</span>
          <span className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982]"><span aria-hidden="true" className="w-5 text-center">♡</span>Lista de interesse</span>
          <span className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982]"><span aria-hidden="true" className="w-5 text-center">♧</span>Ofertas</span>
          <span className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982]"><span aria-hidden="true" className="w-5 text-center">⇩</span>Arquivos baixados</span>
          <span className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982]"><span aria-hidden="true" className="w-5 text-center">⚠</span>Suporte</span>
          <button type="button" onClick={signOut} className="mt-1 flex items-center gap-4 border-t border-[#6B4228] px-4 py-3 text-left text-sm text-[#E8834A]"><span aria-hidden="true" className="w-5 text-center">⇥</span>Sair</button>
        </nav>
      </aside>
      <div className="min-w-0">
        <div className="space-y-7">
          <form id="profile" className="space-y-7 scroll-mt-8" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const currentPassword = String(data.get('currentPassword') ?? ''); const newPassword = String(data.get('newPassword') ?? ''); const confirmPassword = String(data.get('confirmPassword') ?? ''); if ((currentPassword || newPassword || confirmPassword) && (!currentPassword || !newPassword || !confirmPassword)) { setMessage('Preencha os três campos para alterar a senha.'); return } if (newPassword && newPassword !== confirmPassword) { setMessage('As senhas novas não coincidem.'); return } setMessage(''); saveProfile.mutate({ name: String(data.get('name')), username: String(data.get('username')), email: String(data.get('email')), ens: `${String(data.get('ens')).trim()}.eth`, walletAlias: String(data.get('walletAlias')), avatar: String(data.get('avatar')) }); if (currentPassword && newPassword) savePassword.mutate({ currentPassword, newPassword }) }}>
            <h2 className="mb-10 text-lg font-bold text-white">Perfil do colecionador</h2>
            <div className="grid gap-x-9 gap-y-7 sm:grid-cols-2">
              <label><span className={`${label} text-sm text-white`}>Nome de exibição <span className="text-[#E8834A]">*</span></span><input className={`${input} h-[50px] text-sm`} name="name" autoComplete="name" defaultValue={profile.name} minLength={2} required /></label>
              <label><span className={`${label} text-sm text-white`}>Nome de usuário <span className="text-[#E8834A]">*</span></span><input className={`${input} h-[50px] text-sm`} name="username" defaultValue={profile.username ?? profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')} required /></label>
              <label><span className={`${label} text-sm text-white`}>E-mail <span className="text-[#E8834A]">*</span></span><input className={`${input} h-[50px] text-sm`} name="email" type="email" autoComplete="email" defaultValue={profile.email} required /></label>
              <label><span className={`${label} text-sm text-white`}>Nome ENS <span className="text-[#E8834A]">*</span></span><div className="flex gap-3"><select aria-label="Sufixo ENS" className={`${input} h-[50px] w-24 text-sm`} defaultValue=".eth"><option>.eth</option></select><input aria-label="Nome ENS" className={`${input} h-[50px] text-sm`} name="ens" placeholder="" defaultValue={profile.ens?.replace(/\.eth$/, '')} required /></div></label>
              <label><span className={`${label} text-sm text-white`}>Apelido da carteira <span className="text-[#E8834A]">*</span></span><input className={`${input} h-[50px] text-sm`} name="walletAlias" defaultValue={profile.walletAlias ?? ''} required /></label>
              <div><span className={`${label} text-sm text-white`}>Avatar</span><div className="flex items-center gap-4"><img src={avatarOverride || profile.avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=kurio'} alt="Avatar do perfil" className="h-16 w-16 rounded-full border border-[#6B4228] bg-[#2C1E17] object-cover p-3"/><input type="hidden" name="avatar" value={avatarOverride ?? profile.avatar}/><label htmlFor="profile-avatar-upload" className={primary + ' cursor-pointer normal-case'}>Alterar</label><input id="profile-avatar-upload" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { setMessage('Escolha uma imagem de até 2 MB.'); event.currentTarget.value = ''; return } const reader = new FileReader(); reader.onload = () => setAvatarOverride(String(reader.result ?? '')); reader.readAsDataURL(file) }}/><button type="button" onClick={() => setAvatarOverride('')} className="text-sm text-[#F5F0E6] hover:text-white">Remover</button></div></div>
            </div>
            <section id="security" className="max-w-[520px] scroll-mt-8 pt-7">
            <h2 className="mb-5 text-lg font-bold text-white">Alterar senha</h2>
            <div className="space-y-3">
              {([['currentPassword', 'Senha atual', 'current-password'], ['newPassword', 'Nova senha', 'new-password'], ['confirmPassword', 'Confirmar nova senha', 'new-password']] as const).map(([name, title, autocomplete]) => <label key={name} className="block"><span className={`${label} text-sm text-white`}>{title}</span><span className="relative block"><input className={`${input} h-[50px] pr-12 text-sm`} name={name} type={visiblePasswords ? 'text' : 'password'} autoComplete={autocomplete} minLength={8} /><button type="button" aria-label={visiblePasswords ? 'Ocultar senhas' : 'Mostrar senhas'} onClick={() => setVisiblePasswords((visible) => !visible)} className="absolute inset-y-0 right-3 text-[#C9A982]">◉</button></span></label>)}
            </div>
            </section>
            <button disabled={saveProfile.isPending || savePassword.isPending} className={primary + ' mt-5'}>{saveProfile.isPending || savePassword.isPending ? 'Salvando...' : 'Salvar'}</button>
          </form>
        </div>
        {(saveProfile.isError || savePassword.isError) && <p role="alert" className="mt-4 text-sm text-red-400">{getApiError(saveProfile.error ?? savePassword.error).message}</p>}
        {message && <p role="status" className="mt-3 text-sm text-[#E8834A]">{message}</p>}
      </div>
    </div>
  </Frame>
}
