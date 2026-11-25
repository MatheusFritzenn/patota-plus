import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { analisarWilcoxon } from '../../lib/wilcoxon.js'
import { gerarHtml } from './relatorio.js'

export function analisarComparacao(dados, entradaOriginal) {
  if (dados.protocolo.alternativa !== 'bilateral' || dados.protocolo.alfa !== 0.05) {
    throw new Error('Protocolo incompatível: esperado bilateral com alfa 0,05')
  }
  if (!Array.isArray(dados.rodadas)) throw new Error('Informe uma lista de rodadas')
  const ids = new Set()
  const arrayDiferencas = []
  for (const rodada of dados.rodadas) {
    if (typeof rodada.partidaId !== 'string' || rodada.partidaId.length === 0) throw new Error('Identificador de rodada ausente')
    if (ids.has(rodada.partidaId)) throw new Error('Rodada duplicada')
    ids.add(rodada.partidaId)
    for (const campo of ['manual', 'automatico']) {
      const valor = rodada[campo]
      if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > 10) {
        throw new Error('Métrica inválida: ' + campo)
      }
    }
    arrayDiferencas.push(rodada.manual - rodada.automatico)
  }
  const resultado = analisarWilcoxon(arrayDiferencas)
  resultado.versoes = { node: process.versions.node, implementacao: 'patota-wilcoxon-js-v1' }
  resultado.entradaSha256 = createHash('sha256').update(entradaOriginal).digest('hex')
  resultado.protocolo = dados.protocolo
  return resultado
}

export async function salvarRelatorio(dados, destino, entradaOriginal = JSON.stringify(dados, null, 2)) {
  const resultado = analisarComparacao(dados, entradaOriginal)
  const documento = gerarHtml(dados, resultado, entradaOriginal)
  await fs.mkdir(destino, { recursive: true })
  await fs.writeFile(path.join(destino, 'relatorio.html'), documento, 'utf8')
  return resultado
}

export async function lerEntrada(entrada) {
  const bruto = await fs.readFile(entrada, 'utf8')
  if (path.extname(entrada).toLowerCase() !== '.html') return bruto
  const trecho = bruto.match(/<pre\s+id="entrada-original">([\s\S]*?)<\/pre>/)
  if (!trecho) throw new Error('HTML sem dados incorporados da comparação')
  // Uma única passagem evita interpretar novamente entidades que pertencem ao JSON.
  return trecho[1].replace(/&(amp|lt|gt|quot|#39|#x27);/g, function (entidade) {
    const mapa = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" }
    return mapa[entidade]
  })
}

async function reproduzir() {
  const arrayArgumentos = process.argv.slice(2)
  if (arrayArgumentos.length !== 2) throw new Error('Use: node analisar.js <relatorio.html ou comparacao.json> <pasta-destino>')
  const entradaOriginal = await lerEntrada(arrayArgumentos[0])
  const resultado = await salvarRelatorio(JSON.parse(entradaOriginal), arrayArgumentos[1], entradaOriginal)
  console.log(JSON.stringify(resultado))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  reproduzir().catch(function (erro) { console.error(erro.message); process.exitCode = 1 })
}
