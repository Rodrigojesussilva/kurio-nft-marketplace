import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addWallet, getApiError, getWallets, removeWallet, updateWallet } from '../lib/api'
import type { Wallet } from '../mocks/fixtures'
import { useShop } from '../store'
import { Frame, input, label, panel, primary } from '../components/page-shared'

export function Carteiras() {
  const { signOut, account } = useShop()
  const client = useQueryClient()
  const key = ['wallets', account?.id]
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => getWallets(signal), enabled: Boolean(account) })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(true)
  const wallets = query.data?.wallets ?? []
  const editing = wallets.find((wallet) => wallet.id === editingId)
  const refresh = (result: { wallets: typeof wallets }) => client.setQueryData(key, result)
  const create = useMutation({ mutationFn: addWallet, onSuccess: refresh })
  const update = useMutation({ mutationFn: ({ id, ...body }: { id: string } & Partial<Omit<Wallet, 'id'>>) => updateWallet(id, body), onSuccess: refresh })
  const remove = useMutation({ mutationFn: removeWallet, onSuccess: refresh })

  if (!account) return <Frame title="Minhas carteiras"><section className={panel}><p className="mb-4 text-xs text-[#A69C8F]">Entre ou crie uma conta para gerenciar suas carteiras.</p><Link to="/login" className={primary}>Entrar</Link></section></Frame>

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const values: Omit<Wallet, 'id'> = { name: String(data.get('walletAlias')).trim(), address: String(data.get('address')).trim(), network: String(data.get('network')), primary: wallets.length === 0 || Boolean(editing?.primary), displayName: String(data.get('displayName')).trim(), profileName: String(data.get('profileName')).trim(), secondaryWallet: String(data.get('secondaryWallet')).trim(), walletType: String(data.get('walletType')), referralCode: String(data.get('referralCode')).trim(), email: String(data.get('email')).trim(), ensName: `${String(data.get('ensName')).trim()}.eth` }
    const done = () => { form.reset(); setFormOpen(false); setEditingId(null) }
    if (editingId) update.mutate({ id: editingId, ...values }, { onSuccess: done })
    else create.mutate(values, { onSuccess: done })
  }

  const error = create.error ?? update.error ?? remove.error ?? query.error
  return <Frame title="Minhas carteiras" hideHeading hideBreadcrumbs>
    <div className="grid gap-8 lg:grid-cols-[minmax(280px,388px)_minmax(0,1fr)] xl:gap-9">
      <aside className="h-fit bg-[#241611] py-4">
        <h2 className="mb-2 px-3 text-lg font-bold text-white">Meu perfil</h2>
        <nav className="flex flex-wrap gap-1 md:flex-col md:gap-0" aria-label="Menu do perfil">
          <Link to="/perfil" className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982] hover:border-[#E8834A] hover:text-white"><span aria-hidden="true" className="w-5 text-center">♙</span>Dados do perfil</Link>
          <span aria-current="page" className="flex items-center gap-4 border-l-[6px] border-[#E8834A] bg-[#E8834A]/5 px-4 py-3 text-sm text-[#E8834A]"><span aria-hidden="true" className="w-5 text-center">♧</span>Carteiras</span>
          <span className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982]"><span aria-hidden="true" className="w-5 text-center">♧</span>Atividade</span>
          <span className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982]"><span aria-hidden="true" className="w-5 text-center">♡</span>Lista de interesse</span>
          <span className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982]"><span aria-hidden="true" className="w-5 text-center">♧</span>Ofertas</span>
          <span className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982]"><span aria-hidden="true" className="w-5 text-center">⇩</span>Arquivos baixados</span>
          <span className="flex items-center gap-4 border-l-[6px] border-transparent px-4 py-3 text-sm text-[#C9A982]"><span aria-hidden="true" className="w-5 text-center">⚠</span>Suporte</span>
          <button type="button" onClick={signOut} className="mt-1 flex items-center gap-4 border-t border-[#6B4228] px-4 py-3 text-left text-sm text-[#E8834A]"><span aria-hidden="true" className="w-5 text-center">⇥</span>Sair</button>
        </nav>
      </aside>
      <section className="min-w-0">
        <div className="mb-10 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-white">Carteira principal</h2><p className="mt-1 text-sm text-[#C9A982]">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p></div><button type="button" className="shrink-0 text-base font-bold text-[#E8834A] hover:text-white" onClick={() => { setEditingId(null); setFormOpen(true) }}>Adicionar</button></div>
      {formOpen && <form key={editing?.id ?? 'new'} onSubmit={submit} className="mb-7 grid gap-x-9 gap-y-7 sm:grid-cols-2">
        <label><span className={`${label} text-sm text-white`}>Nome de exibição <span className="text-[#E8834A]">*</span></span><input className={`${input} h-[50px] text-sm`} name="displayName" defaultValue={editing?.displayName ?? account.name} required /></label>
        <label><span className={`${label} text-sm text-white`}>Apelido da carteira <span className="text-[#E8834A]">*</span></span><input aria-label="Nome da carteira" className={`${input} h-[50px] text-sm`} name="walletAlias" defaultValue={editing?.name} required minLength={2} /></label>
        <label><span className={`${label} text-sm text-white`}>Rede <span className="text-[#E8834A]">*</span></span><select className={`${input} h-[50px] text-sm`} name="network" defaultValue={editing?.network ?? 'Ethereum'} required>{['Ethereum', 'Polygon', 'Solana'].map((network) => <option key={network}>{network}</option>)}</select></label>
        <label><span className={`${label} text-sm text-white`}>Nome do perfil <span className="text-[#E8834A]">*</span></span><input className={`${input} h-[50px] text-sm`} name="profileName" defaultValue={editing?.profileName ?? account.name} required /></label>
        <label><span className={`${label} text-sm text-white`}>Endereço da carteira <span className="text-[#E8834A]">*</span></span><input className={`${input} h-[50px] font-mono text-sm`} name="address" defaultValue={editing?.address} placeholder="Endereço 0x da carteira" required pattern="0x[a-fA-F0-9]{8,}" title="Informe um endereço que começa com 0x e contém ao menos 8 caracteres hexadecimais." /></label>
        <label><span className={`${label} text-sm text-white`}>ENS ou carteira secundária (opcional)</span><input className={`${input} h-[50px] text-sm`} name="secondaryWallet" defaultValue={editing?.secondaryWallet ?? ''} placeholder="" /></label>
        <label><span className={`${label} text-sm text-white`}>Tipo de carteira <span className="text-[#E8834A]">*</span></span><select className={`${input} h-[50px] text-sm`} name="walletType" defaultValue={editing?.walletType ?? 'MetaMask'} required>{['MetaMask', 'WalletConnect', 'Coinbase Wallet'].map((type) => <option key={type}>{type}</option>)}</select></label>
        <label><span className={`${label} text-sm text-white`}>Código de indicação <span className="text-[#E8834A]">*</span></span><input className={`${input} h-[50px] text-sm`} name="referralCode" defaultValue={editing?.referralCode ?? 'KURIO10'} required /></label>
        <label><span className={`${label} text-sm text-white`}>E-mail <span className="text-[#E8834A]">*</span></span><input className={`${input} h-[50px] text-sm`} name="email" type="email" defaultValue={editing?.email ?? account.email} required /></label>
        <label><span className={`${label} text-sm text-white`}>Nome ENS <span className="text-[#E8834A]">*</span></span><div className="flex gap-3"><select aria-label="Sufixo ENS" className={`${input} h-[50px] w-24 text-sm`} defaultValue=".eth"><option>.eth</option></select><input className={`${input} h-[50px] text-sm`} name="ensName" defaultValue={editing?.ensName?.replace(/\.eth$/, '') ?? account.name.toLowerCase().replace(/[^a-z0-9]+/g, '')} required /></div></label>
        <button className={`${primary} justify-self-start text-sm normal-case`} disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? 'Salvando…' : editingId ? 'Salvar carteira' : 'Salvar carteira'}</button>
      </form>}
      {error && <p role="alert" className="mb-4 text-sm text-red-400">{getApiError(error).message}</p>}
      {query.isLoading ? <p className="text-sm text-[#A69C8F]">Carregando carteiras…</p> : wallets.length === 0 ? <p className="text-sm text-[#A69C8F]">Nenhuma carteira cadastrada.</p> : <div className="space-y-3">{wallets.map((wallet) => <article key={wallet.id} className={`${panel} flex flex-wrap items-center gap-3`}>
        <div className="min-w-0 flex-1"><p className="font-semibold text-white">{wallet.name}{wallet.primary ? ' · Principal' : ''}</p><p className="mt-1 break-all font-mono text-xs text-[#A69C8F]">{wallet.address} · {wallet.network}</p></div>
        <button type="button" className="text-sm text-[#E8834A]" onClick={() => { setEditingId(wallet.id); setFormOpen(true) }}>Editar</button>
        {!wallet.primary && <button type="button" className="text-sm text-[#E8834A]" onClick={() => update.mutate({ id: wallet.id, name: wallet.name, address: wallet.address, network: wallet.network, primary: true })}>Definir principal</button>}
        <button type="button" className="text-sm text-[#A69C8F] hover:text-red-300" onClick={() => remove.mutate(wallet.id)}>Remover</button>
      </article>)}</div>}
      </section>
    </div>
  </Frame>
}
