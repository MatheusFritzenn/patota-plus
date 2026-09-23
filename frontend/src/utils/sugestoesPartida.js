const formatadorBrasilia = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
})

// diaHabitual: 1=segunda-feira, ..., 7=domingo.
export function obterDataSugerida(diaHabitual, horaHabitual, agora = new Date()) {
  const diaDesejado = Number(diaHabitual)
  if (!Number.isInteger(diaDesejado) || diaDesejado < 1 || diaDesejado > 7) {
    return ''
  }

  const partesBrasilia = {}
  const arrayPartes = formatadorBrasilia.formatToParts(agora)
  for (const parte of arrayPartes) {
    partesBrasilia[parte.type] = parte.value
  }

  const ano = Number(partesBrasilia.year)
  const mes = Number(partesBrasilia.month)
  const dia = Number(partesBrasilia.day)
  const dataBrasilia = new Date(Date.UTC(ano, mes - 1, dia))
  const diaAtual = dataBrasilia.getUTCDay() || 7
  let diasAte = (diaDesejado - diaAtual + 7) % 7

  if (diasAte === 0 && typeof horaHabitual === 'string') {
    const horarioValido = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(horaHabitual)
    if (horarioValido) {
      let segundoHabitual = 0
      if (horarioValido[3]) {
        segundoHabitual = Number(horarioValido[3])
      }
      const segundosHabitual = Number(horarioValido[1]) * 3600 + Number(horarioValido[2]) * 60 + segundoHabitual
      const segundosAgora = Number(partesBrasilia.hour) * 3600 + Number(partesBrasilia.minute) * 60 + Number(partesBrasilia.second)
      if (segundosAgora > segundosHabitual) {
        diasAte = 7
      }
    }
  }

  dataBrasilia.setUTCDate(dataBrasilia.getUTCDate() + diasAte)
  return dataBrasilia.toISOString().slice(0, 10)
}

export function obterLocalSugerido(patota) {
  const arrayPartesLocal = []
  if (patota.rua && patota.rua.trim()) {
    arrayPartesLocal.push(patota.rua.trim())
  }

  let cidadeEstado = ''
  if (patota.cidade && patota.estado) {
    cidadeEstado = patota.cidade + '/' + patota.estado
  }
  else if (patota.cidade) {
    cidadeEstado = patota.cidade
  }
  else if (patota.estado) {
    cidadeEstado = patota.estado
  }

  if (cidadeEstado) {
    arrayPartesLocal.push(cidadeEstado)
  }
  return arrayPartesLocal.join(' — ')
}
