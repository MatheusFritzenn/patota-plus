export function formatarDataNascimentoDigitada(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 8)
  if (digitos.length <= 2) return digitos
  if (digitos.length <= 4) return digitos.slice(0, 2) + '/' + digitos.slice(2)
  return digitos.slice(0, 2) + '/' + digitos.slice(2, 4) + '/' + digitos.slice(4)
}

export function dataNascimentoParaIso(valor) {
  const arrayPartes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor)
  if (!arrayPartes) return null

  const dia = Number(arrayPartes[1])
  const mes = Number(arrayPartes[2])
  const ano = Number(arrayPartes[3])
  if (ano < 1000 || mes < 1 || mes > 12 || dia < 1) return null

  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  if (dia > diasNoMes) return null

  return arrayPartes[3] + '-' + arrayPartes[2] + '-' + arrayPartes[1]
}

export function dataNascimentoParaExibicao(valor) {
  if (!valor) return ''
  const dataIso = valor.slice(0, 10)
  const arrayPartes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataIso)
  if (!arrayPartes) return ''
  return arrayPartes[3] + '/' + arrayPartes[2] + '/' + arrayPartes[1]
}
