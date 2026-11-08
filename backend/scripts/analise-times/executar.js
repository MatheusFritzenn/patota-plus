import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
import pg from 'pg'
import { compararRodada } from './comparar.js'

const pasta = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(pasta, '../../..')
let pythonLocal = path.join(raiz, '.venv-wilcoxon/bin/python')
if (process.platform === 'win32') pythonLocal = path.join(raiz, '.venv-wilcoxon/Scripts/python.exe')
const python = process.env.PATOTA_PYTHON || pythonLocal
const arrayArgumentos = process.argv.slice(2)
function executarPython(arrayArgs, entrada = undefined) {
  const resultado = spawnSync(python, arrayArgs, { input: entrada, encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 })
  if (resultado.error) throw new Error('Python indisponível. Prepare .venv-wilcoxon conforme backend/scripts/analise-times/README.md. ' + resultado.error.message)
  if (resultado.status !== 0) throw new Error(resultado.stderr || resultado.stdout || 'Falha no Python')
  if (resultado.stderr) process.stderr.write(resultado.stderr)
  return resultado.stdout
}

async function executar() {
  assert.equal(arrayArgumentos.length, 0, 'Argumento desconhecido. Use sem argumentos.')
  executarPython(['-c', 'import scipy, numpy; assert scipy.__version__ == "1.16.3" and numpy.__version__ == "2.3.4", "Instale requirements.txt"'])
  dotenv.config({ path: path.join(raiz, 'backend/.env'), quiet: true })
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL ausente no backend/.env')
  const protocolo = JSON.parse(await fs.readFile(path.join(pasta, 'protocolo.json'), 'utf8'))
  assert.equal(protocolo.alternativa, 'bilateral', 'Esta rotina implementa somente o protocolo bilateral')
  assert.equal(protocolo.alfa, 0.05)
  const arrayDatas = protocolo.baseline.map(function (r) { return r.data })
  assert.equal(new Set(arrayDatas).size, arrayDatas.length, 'Data duplicada no protocolo')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
  const arrayRodadas = []
  try {
    await client.connect()
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    await client.query("SET LOCAL statement_timeout = '30s'")
    await client.query("SET LOCAL TIME ZONE 'America/Sao_Paulo'")
    const queryPartidas = `SELECT pa.id,pa.data::date::text AS data,pa.status,p.nome AS "patotaNome",p.modalidade_id AS "modalidadeId"
      FROM partidas pa JOIN patotas p ON p.id=pa.patota_id
      WHERE pa.patota_id=$1 AND pa.data::date=ANY($2::date[]) ORDER BY pa.data,pa.id`
    const arrayPartidas = (await client.query(queryPartidas, [protocolo.patotaId, arrayDatas])).rows
    assert.deepEqual(arrayPartidas.map(function (p) { return p.data }), arrayDatas, 'Rodadas ausentes ou duplicadas')
    const queryJogadores = `SELECT u.id,u.nome,pt.time_id AS "timeId",t.nome AS "timeNome",t.partida_id AS "timePartidaId",
      mu.media_geral AS "mediaGeral",mu.total_avaliacoes AS "totalAvaliacoes",pt.posicao_id AS "posicaoTemporariaId",
      ARRAY(SELECT up.posicao_id FROM usuario_posicoes up WHERE up.usuario_id=u.id ORDER BY up.posicao_id) AS "posicoesIds"
      FROM participacoes pt JOIN usuarios u ON u.id=pt.usuario_id LEFT JOIN times t ON t.id=pt.time_id
      LEFT JOIN media_usuarios mu ON mu.usuario_id=u.id WHERE pt.partida_id=$1 ORDER BY u.id`
    for (const partida of arrayPartidas) {
      assert.equal(partida.patotaNome, protocolo.patotaNome)
      assert.equal(partida.status, 'FINALIZADA')
      const arrayFonte = (await client.query(queryJogadores, [partida.id])).rows
      const esperado = protocolo.baseline.find(function (r) { return r.data === partida.data })
      const arrayEsperado = esperado.jogadores.map(function (j) { return j.nome + '|' + j.time }).sort()
      assert.deepEqual(arrayFonte.map(function (j) { return j.nome + '|' + j.timeNome }).sort(), arrayEsperado, 'Escalação manual diverge da fonte histórica: ' + partida.data)
      const arrayJogadores = []
      for (const linha of arrayFonte) {
        assert.equal(linha.timePartidaId, partida.id)
        assert.ok(linha.totalAvaliacoes > 0 && linha.mediaGeral !== null, 'Nota atual ausente: ' + linha.nome)
        arrayJogadores.push({ id: linha.id, nome: linha.nome, forca: Number(linha.mediaGeral), totalAvaliacoes: linha.totalAvaliacoes, posicoesIds: linha.posicoesIds, posicaoTemporariaId: linha.posicaoTemporariaId, timeId: linha.timeId, timeNome: linha.timeNome })
      }
      arrayRodadas.push(compararRodada(partida, arrayJogadores))
    }
    await client.query('ROLLBACK')
  } finally {
    await client.end()
  }
  const modelo = await fs.readFile(path.join(raiz, 'backend/partidas/model.js'))
  const dados = { geradoEm: new Date().toISOString(), algoritmoSha256: createHash('sha256').update(modelo).digest('hex'), protocolo: protocolo, rodadas: arrayRodadas }
  const destino = path.join(raiz, 'outputs/analise-times', dados.geradoEm.replaceAll(':', '-'))
  await fs.mkdir(destino, { recursive: true })
  const resultado = JSON.parse(executarPython([path.join(pasta, 'wilcoxon.py'), '-', destino], JSON.stringify(dados, null, 2)))
  console.log('Análise concluída sem gravações no banco.')
  console.log('Rodadas: ' + arrayRodadas.length + '; n efetivo: ' + resultado.nEfetivo + '; p: ' + resultado.pValor + '; r: ' + resultado.r)
  console.log('Relatório: ' + path.join(destino, 'relatorio.html'))
}

executar().catch(function (erro) {
  console.error(erro.message)
  process.exitCode = 1
})
