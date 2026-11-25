import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
import pg from 'pg'
import { compararRodada } from './comparar.js'
import { salvarRelatorio } from './analisar.js'
import { validarFonteHistorica, prepararRodadaHistorica, criarFonteDoBanco } from './historico.js'

const pasta = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(pasta, '../../..')
const arrayArgumentos = process.argv.slice(2)

async function executar() {
  let fonteHistorica = null
  let fonteHistoricaSha256 = null
  const usarMediasAtuais = arrayArgumentos.length === 1 && arrayArgumentos[0] === '--medias-atuais'
  if (arrayArgumentos.length > 0) {
    assert.ok(usarMediasAtuais || (arrayArgumentos.length === 2 && arrayArgumentos[0] === '--avaliacoes'), 'Use sem argumentos (histórico do banco), --medias-atuais ou --avaliacoes <arquivo.json>')
    if (!usarMediasAtuais) {
      const bruto = await fs.readFile(path.resolve(raiz, arrayArgumentos[1]), 'utf8')
      fonteHistorica = JSON.parse(bruto)
      fonteHistoricaSha256 = createHash('sha256').update(bruto).digest('hex')
    }
  }
  dotenv.config({ path: path.join(raiz, 'backend/.env'), quiet: true })
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL ausente no backend/.env')
  const protocolo = JSON.parse(await fs.readFile(path.join(pasta, 'protocolo.json'), 'utf8'))
  if (!usarMediasAtuais) {
    protocolo.cenario = 'medias_anteriores_reais'
    protocolo.regraMedia = 'partidas'
    protocolo.precisaoForca = 2
    protocolo.origemNotas = 'Avaliações reais declaradas pelo usuário, coletadas após cada jogo na mesma data da partida. As médias usam somente jogos estritamente anteriores, com média das médias por partida e força arredondada a duas casas. Na ausência de média anterior, aceita-se exclusivamente nota temporária da própria participação com atribuição anterior ao jogo declarada pelo presidente e registrada no protocolo: Ferraz, 15/09, nota 9. A nota temporária não é avaliação e não integra as médias. O cache de médias atuais não entra neste cenário.'
    protocolo.fonteHistorica = 'postgresql'
    if (fonteHistorica) protocolo.fonteHistorica = 'arquivo_json'
    protocolo.criterioInclusao = 'Preservar escalações completas. Usar média anterior quando disponível; sem média, aceitar somente nota temporária da própria participação com atribuição anterior ao jogo declarada pelo presidente e registrada no protocolo. Nunca usar nota futura, simulada ou zero como substituto. Excluir rodadas ainda sem cobertura completa; empates e pioras permanecem na análise. 08/09 continua como ponto de partida, sem notas iniciais simuladas.'
  } else {
    protocolo.cenario = 'notas_atuais_referencia'
  }
  assert.equal(protocolo.alternativa, 'bilateral', 'Esta rotina implementa somente o protocolo bilateral')
  assert.equal(protocolo.alfa, 0.05)
  const arrayDatas = protocolo.baseline.map(function (r) { return r.data })
  assert.equal(new Set(arrayDatas).size, arrayDatas.length, 'Data duplicada no protocolo')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
  const arrayRodadas = []
  const arrayPartidasFonte = []
  const arrayRodadasExcluidas = []
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
      mu.media_geral AS "mediaGeral",mu.total_avaliacoes AS "totalAvaliacoes",pt.posicao_id AS "posicaoTemporariaId",pt.nota_temporaria AS "notaTemporaria",
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
        const jogador = { id: linha.id, nome: linha.nome, posicoesIds: linha.posicoesIds, posicaoTemporariaId: linha.posicaoTemporariaId, timeId: linha.timeId, timeNome: linha.timeNome }
        jogador.notaTemporaria = null
        if (linha.notaTemporaria !== null) jogador.notaTemporaria = Number(linha.notaTemporaria)
        if (usarMediasAtuais) {
          assert.ok(linha.totalAvaliacoes > 0 && linha.mediaGeral !== null, 'Nota atual ausente: ' + linha.nome)
          jogador.forca = Number(linha.mediaGeral)
          jogador.totalAvaliacoes = linha.totalAvaliacoes
        }
        arrayJogadores.push(jogador)
      }
      partida.jogadores = arrayJogadores
      arrayPartidasFonte.push(partida)
    }
    if (!usarMediasAtuais && !fonteHistorica) {
      const arrayPartidasIds = arrayPartidasFonte.map(function (partida) { return partida.id })
      const queryAvaliacoes = `SELECT a.partida_id AS "partidaId",pa.data::date::text AS data,
        a.created_at::date::text AS "dataAvaliacao",a.avaliador_id AS "avaliadorId",a.avaliado_id AS "avaliadoId",a.nota
        FROM avaliacoes a JOIN partidas pa ON pa.id=a.partida_id
        WHERE a.partida_id=ANY($1::uuid[]) ORDER BY pa.data,a.partida_id,a.avaliado_id,a.avaliador_id`
      fonteHistorica = criarFonteDoBanco((await client.query(queryAvaliacoes, [arrayPartidasIds])).rows)
      fonteHistoricaSha256 = createHash('sha256').update(JSON.stringify(fonteHistorica)).digest('hex')
    }
    await client.query('ROLLBACK')
  } finally {
    await client.end()
  }
  if (fonteHistorica) validarFonteHistorica(fonteHistorica, arrayPartidasFonte)
  for (const partida of arrayPartidasFonte) {
    if (!fonteHistorica) {
      arrayRodadas.push(compararRodada(partida, partida.jogadores))
      continue
    }
    const preparacao = prepararRodadaHistorica(partida, fonteHistorica.avaliacoes, protocolo.regraMedia, protocolo.notasTemporariasHistoricas)
    if (preparacao.semMediaAnterior.length > 0) {
      arrayRodadasExcluidas.push({ partidaId: partida.id, data: partida.data, participantes: partida.jogadores.length, motivo: 'Participantes sem avaliação anterior', semMediaAnterior: preparacao.semMediaAnterior })
      continue
    }
    arrayRodadas.push(compararRodada(partida, preparacao.jogadores))
  }
  assert.ok(arrayRodadas.length > 0, 'Nenhuma rodada possui cobertura completa de médias anteriores; confira a fonte histórica')
  const modelo = await fs.readFile(path.join(raiz, 'backend/partidas/model.js'))
  const dados = { geradoEm: new Date().toISOString(), algoritmoSha256: createHash('sha256').update(modelo).digest('hex'), protocolo: protocolo, rodadas: arrayRodadas }
  if (fonteHistorica) {
    dados.fonteAvaliacoes = fonteHistorica
    dados.fonteAvaliacoesSha256 = fonteHistoricaSha256
    dados.partidasFonte = arrayPartidasFonte
    dados.rodadasExcluidas = arrayRodadasExcluidas
    dados.reconstrucaoSha256 = createHash('sha256').update(await fs.readFile(path.join(pasta, 'historico.js'))).digest('hex')
  }
  const destino = path.join(raiz, 'outputs/analise-times', dados.geradoEm.replaceAll(':', '-'))
  const resultado = await salvarRelatorio(dados, destino)
  console.log('Análise concluída sem gravações no banco.')
  console.log('Cenário: ' + protocolo.cenario)
  if (fonteHistorica) console.log('Fonte: ' + protocolo.fonteHistorica + '; avaliações: ' + fonteHistorica.avaliacoes.length)
  for (const rodada of arrayRodadasExcluidas) console.log('Excluída ' + rodada.data + ': sem nota anterior para ' + rodada.semMediaAnterior.map(function (jogador) { return jogador.nome }).join(', '))
  console.log('Rodadas: ' + arrayRodadas.length + '; n efetivo: ' + resultado.nEfetivo + '; p: ' + resultado.pValor + '; r: ' + resultado.r)
  console.log('Relatório: ' + path.join(destino, 'relatorio.html'))
}

executar().catch(function (erro) {
  console.error(erro.message)
  process.exitCode = 1
})
