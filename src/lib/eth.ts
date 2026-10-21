export const parseEth = (s: string): bigint => {
  const [i='', d=''] = s.split('.')
  const pad = (d + '0'.repeat(18)).slice(0,18)
  return BigInt(i||'0')*10n**18n + BigInt(pad||'0')
}
export const formatEth = (b: bigint) => {
  const base = 10n**18n
  const int = b / base
  const dec = (b % base).toString().padStart(18,'0').replace(/0+$/,'')
  return dec ? `${int}.${dec}` : `${int}`
}