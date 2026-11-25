// Wilcoxon pareado bilateral exato, sem dependências estatísticas externas.
export const LIMITE_PARES_NAO_NULOS = 16

function arredondarDiferenca(valor) {
  const absolutoEscalado = Math.abs(valor) * 1e9
  if (absolutoEscalado > Number.MAX_SAFE_INTEGER) return valor
  const inteiro = Math.floor(absolutoEscalado)
  const fracao = absolutoEscalado - inteiro
  let arredondado = inteiro
  // Empates em meia unidade vão para o inteiro par, como no protocolo NumPy anterior.
  if (fracao > 0.5 || (fracao === 0.5 && inteiro % 2 !== 0)) arredondado += 1
  if (arredondado === 0) return 0
  return Math.sign(valor) * arredondado / 1e9
}

export function analisarWilcoxon(arrayDiferencas) {
  if (!Array.isArray(arrayDiferencas) || arrayDiferencas.length === 0) {
    throw new TypeError('Informe diferenças finitas em uma lista não vazia')
  }
  const arrayValores = []
  const arrayUteis = []
  for (const diferenca of arrayDiferencas) {
    if (typeof diferenca !== 'number' || !Number.isFinite(diferenca)) {
      throw new TypeError('Informe diferenças finitas em uma lista não vazia')
    }
    const valor = arredondarDiferenca(diferenca)
    arrayValores.push(valor)
    if (valor !== 0) arrayUteis.push({ valor: valor, posto: 0 })
  }
  const n = arrayUteis.length
  if (n > LIMITE_PARES_NAO_NULOS) {
    throw new RangeError('Rotina exata limitada a 16 pares não nulos; revise o protocolo antes de ampliar')
  }
  const resultado = {
    nTotal: arrayValores.length, nEfetivo: n, zerosDescartados: arrayValores.length - n,
    alternativa: 'bilateral', alfa: 0.05, casasDecimais: 9,
    metodo: 'permutação exaustiva dos sinais (backend JavaScript do Patota+)',
    diferencas: arrayValores, wMais: 0, wMenos: 0, pValor: null, z: null,
    r: null, rAbsoluto: null,
    formulaR: 'Z / sqrt(n efetivo); Z=(W+ - soma(postos)/2) / sqrt(soma(postos²)/4), sem correção de continuidade',
    significativo: false, aviso: null
  }
  if (n === 0) {
    resultado.aviso = 'Todos os pares empatados: teste e tamanho de efeito indisponíveis.'
    return resultado
  }
  arrayUteis.sort(function (a, b) { return Math.abs(a.valor) - Math.abs(b.valor) })
  let inicio = 0
  while (inicio < n) {
    let fim = inicio + 1
    while (fim < n && Math.abs(arrayUteis[fim].valor) === Math.abs(arrayUteis[inicio].valor)) fim += 1
    const postoMedio = (inicio + 1 + fim) / 2
    for (let indice = inicio; indice < fim; indice += 1) arrayUteis[indice].posto = postoMedio
    inicio = fim
  }
  let somaQuadrados = 0
  for (const item of arrayUteis) {
    if (item.valor > 0) resultado.wMais += item.posto
    else resultado.wMenos += item.posto
    somaQuadrados += item.posto * item.posto
  }
  const somaPostos = resultado.wMais + resultado.wMenos
  const desvioObservado = Math.abs(resultado.wMais - somaPostos / 2)
  const totalSinais = 2 ** n
  let extremos = 0
  // Cada máscara representa uma das 2^n atribuições equiprováveis de sinais.
  // Postos médios são múltiplos de 0,5: somas e comparações são exatas em binário.
  for (let mascara = 0; mascara < totalSinais; mascara += 1) {
    let somaPositivos = 0
    for (let indice = 0; indice < n; indice += 1) {
      if ((mascara & (1 << indice)) !== 0) somaPositivos += arrayUteis[indice].posto
    }
    if (Math.abs(somaPositivos - somaPostos / 2) >= desvioObservado) extremos += 1
  }
  resultado.pValor = extremos / totalSinais
  resultado.z = (resultado.wMais - somaPostos / 2) / Math.sqrt(somaQuadrados / 4)
  resultado.r = resultado.z / Math.sqrt(n)
  resultado.rAbsoluto = Math.abs(resultado.r)
  resultado.significativo = resultado.pValor <= resultado.alfa
  if (n < 6) resultado.aviso = 'Menos de seis pares não nulos: não é possível atingir 5% no bilateral exato.'
  return resultado
}
