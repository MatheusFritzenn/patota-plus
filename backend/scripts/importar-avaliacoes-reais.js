import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import dotenv from 'dotenv'
import pg from 'pg'
import { validarFonteHistorica } from './analise-times/historico.js'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

async function executar() {
  const arrayArgumentos = process.argv.slice(2)
  assert.ok(arrayArgumentos.length === 1 || (arrayArgumentos.length === 2 && arrayArgumentos[1] === '--aplicar'), 'Use: node backend/scripts/importar-avaliacoes-reais.js <fonte.json> [--aplicar]')
  const aplicar = arrayArgumentos.length === 2
  const caminhoFonte = path.resolve(raiz, arrayArgumentos[0])
  const bruto = await fs.readFile(caminhoFonte, 'utf8')
  const fonte = JSON.parse(bruto)
  const fonteSha256 = createHash('sha256').update(bruto).digest('hex')
  const protocolo = JSON.parse(await fs.readFile(path.join(raiz, 'backend/scripts/analise-times/protocolo.json'), 'utf8'))
  assert.equal(fonte.avaliacoes.length, 624, 'Importação restrita à massa real de 624 avaliações revisadas')
  assert.ok(/^[a-f0-9]{64}$/.test(fonte.arquivoOriginalSha256), 'Hash da planilha ausente')
  const arrayDatas = protocolo.baseline.map(function (rodada) { return rodada.data })
  const arrayUsuarios = Array.from(new Set(fonte.avaliacoes.map(function (a) { return a.avaliadoId }))).sort()
  dotenv.config({ path: path.join(raiz, 'backend/.env'), quiet: true })
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL ausente')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
  let confirmado = false
  let pastaBackup = null
  let resumo = null
  try {
    await client.connect()
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    await client.query("SET LOCAL lock_timeout = '10s'")
    await client.query("SET LOCAL statement_timeout = '30s'")
    await client.query("SET LOCAL TIME ZONE 'America/Sao_Paulo'")
    // Impede edição concorrente das notas/cache durante o snapshot e a conferência.
    await client.query('LOCK TABLE avaliacoes, media_usuarios IN SHARE ROW EXCLUSIVE MODE')
    const queryPartidas = `SELECT id, data::date::text AS data, status, avaliacoes_encerradas AS "avaliacoesEncerradas"
      FROM partidas WHERE patota_id=$1 AND data::date=ANY($2::date[]) ORDER BY data,id FOR UPDATE`
    const arrayPartidas = (await client.query(queryPartidas, [protocolo.patotaId, arrayDatas])).rows
    assert.deepEqual(arrayPartidas.map(function (p) { return p.data }), arrayDatas)
    const arrayPartidasIds = arrayPartidas.map(function (p) { return p.id })
    const queryParticipantes = `SELECT pt.partida_id AS "partidaId",u.id,u.nome,pt.time_id AS "timeId",t.nome AS "timeNome"
      FROM participacoes pt JOIN usuarios u ON u.id=pt.usuario_id
      JOIN times t ON t.id=pt.time_id AND t.partida_id=pt.partida_id
      WHERE pt.partida_id=ANY($1::uuid[]) ORDER BY pt.partida_id,u.id`
    const arrayParticipantes = (await client.query(queryParticipantes, [arrayPartidasIds])).rows
    let paresEsperados = 0
    for (const partida of arrayPartidas) {
      assert.equal(partida.status, 'FINALIZADA')
      assert.equal(partida.avaliacoesEncerradas, true)
      partida.jogadores = arrayParticipantes.filter(function (jogador) { return jogador.partidaId === partida.id })
      const baseline = protocolo.baseline.find(function (rodada) { return rodada.data === partida.data })
      assert.deepEqual(partida.jogadores.map(function (j) { return j.nome + '|' + j.timeNome }).sort(), baseline.jogadores.map(function (j) { return j.nome + '|' + j.time }).sort(), 'Escalação mudou em ' + partida.data)
      const mapaTimes = new Map()
      for (const jogador of partida.jogadores) mapaTimes.set(jogador.timeId, (mapaTimes.get(jogador.timeId) || 0) + 1)
      assert.equal(mapaTimes.size, 2)
      for (const quantidade of mapaTimes.values()) paresEsperados += quantidade * (quantidade - 1)
    }
    validarFonteHistorica(fonte, arrayPartidas)
    assert.equal(fonte.avaliacoes.length, paresEsperados, 'A fonte não cobre todos os pares das oito rodadas')
    for (const avaliacao of fonte.avaliacoes) assert.ok(Math.abs(avaliacao.nota * 100 - Math.round(avaliacao.nota * 100)) < 1e-8, 'Nota tem mais de duas casas decimais')

    const queryAvaliacoes = `SELECT to_jsonb(a) AS registro FROM avaliacoes a WHERE partida_id=ANY($1::uuid[]) ORDER BY partida_id,avaliador_id,avaliado_id`
    const queryMedias = `SELECT to_jsonb(m) AS registro FROM media_usuarios m WHERE usuario_id=ANY($1::uuid[]) ORDER BY usuario_id`
    const queryDemaisAvaliacoes = `SELECT to_jsonb(a) AS registro FROM avaliacoes a WHERE NOT (partida_id=ANY($1::uuid[])) ORDER BY id`
    const queryDemaisMedias = `SELECT to_jsonb(m) AS registro FROM media_usuarios m WHERE NOT (usuario_id=ANY($1::uuid[])) ORDER BY id`
    const queryEstrutura = `SELECT
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM partidas p WHERE p.id=ANY($1::uuid[])) AS partidas,
      (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM times t WHERE t.partida_id=ANY($1::uuid[])) AS times,
      (SELECT jsonb_agg(to_jsonb(pt) ORDER BY pt.id) FROM participacoes pt WHERE pt.partida_id=ANY($1::uuid[])) AS participacoes`
    const arrayAntes = (await client.query(queryAvaliacoes, [arrayPartidasIds])).rows.map(function (linha) { return linha.registro })
    const arrayMediasAntes = (await client.query(queryMedias, [arrayUsuarios])).rows.map(function (linha) { return linha.registro })
    const arrayDemaisAvaliacoes = (await client.query(queryDemaisAvaliacoes, [arrayPartidasIds])).rows
    const arrayDemaisMedias = (await client.query(queryDemaisMedias, [arrayUsuarios])).rows
    const estruturaAntes = (await client.query(queryEstrutura, [arrayPartidasIds])).rows[0]
    const mapaFonte = new Map()
    for (const avaliacao of fonte.avaliacoes) mapaFonte.set(avaliacao.partidaId + '|' + avaliacao.avaliadorId + '|' + avaliacao.avaliadoId, avaliacao)
    for (const anterior of arrayAntes) assert.ok(mapaFonte.has(anterior.partida_id + '|' + anterior.avaliador_id + '|' + anterior.avaliado_id), 'Existe avaliação não prevista na fonte; importação interrompida sem excluir dados')
    resumo = { avaliacoesAntes: arrayAntes.length, avaliacoesReais: fonte.avaliacoes.length, insercoes: fonte.avaliacoes.length - arrayAntes.length, usuariosAfetados: arrayUsuarios.length, partidas: arrayPartidas.length }
    if (!aplicar) {
      await client.query('ROLLBACK')
      console.log('Simulação validada, sem alterações: ' + JSON.stringify(resumo))
      return
    }
    pastaBackup = path.join(raiz, 'outputs/importacao-avaliacoes-reais', new Date().toISOString().replaceAll(':', '-'))
    await fs.mkdir(pastaBackup, { recursive: true })
    const backup = {
      geradoEm: new Date().toISOString(), fonteSha256: fonteSha256, fonte: fonte,
      resumo: resumo, avaliacoes: arrayAntes, medias: arrayMediasAntes,
      estrutura: estruturaAntes,
      observacaoTemporal: 'created_at recebe a data histórica com 00:00:00 como convenção de data sem horário conhecido. Não representa a hora real de coleta. Importação registrada separadamente neste comprovante.'
    }
    const caminhoBackup = path.join(pastaBackup, 'backup-antes.json')
    await fs.writeFile(caminhoBackup, JSON.stringify(backup, null, 2), { encoding: 'utf8', flag: 'wx' })
    assert.equal(JSON.parse(await fs.readFile(caminhoBackup, 'utf8')).avaliacoes.length, arrayAntes.length)

    const queryImportar = `INSERT INTO avaliacoes (partida_id,avaliador_id,avaliado_id,nota,created_at)
      SELECT a."partidaId",a."avaliadorId",a."avaliadoId",a.nota,a.data::timestamp
      FROM jsonb_to_recordset($1::jsonb) AS a("partidaId" uuid,"avaliadorId" uuid,"avaliadoId" uuid,nota numeric,data date)
      ON CONFLICT (partida_id,avaliador_id,avaliado_id)
      DO UPDATE SET nota=EXCLUDED.nota,created_at=EXCLUDED.created_at`
    await client.query(queryImportar, [JSON.stringify(fonte.avaliacoes)])
    const queryMedia = `SELECT COALESCE(SUM(total),0)::int AS total,COALESCE(AVG(media_partida),0) AS media
      FROM (SELECT COUNT(*)::int AS total,AVG(nota) AS media_partida FROM avaliacoes WHERE avaliado_id=$1 GROUP BY partida_id) medias_partidas`
    const querySalvarMedia = `INSERT INTO media_usuarios (usuario_id,media_geral,total_avaliacoes,updated_at)
      VALUES ($1,$2,$3,NOW()) ON CONFLICT (usuario_id)
      DO UPDATE SET media_geral=EXCLUDED.media_geral,total_avaliacoes=EXCLUDED.total_avaliacoes,updated_at=EXCLUDED.updated_at`
    for (const usuarioId of arrayUsuarios) {
      const agregado = (await client.query(queryMedia, [usuarioId])).rows[0]
      await client.query(querySalvarMedia, [usuarioId, Number(agregado.media).toFixed(2), agregado.total])
    }
    const arrayDepois = (await client.query(queryAvaliacoes, [arrayPartidasIds])).rows.map(function (linha) { return linha.registro })
    assert.equal(arrayDepois.length, fonte.avaliacoes.length)
    const mapaIdsAntes = new Map(arrayAntes.map(function (a) { return [a.partida_id + '|' + a.avaliador_id + '|' + a.avaliado_id, a.id] }))
    for (const avaliacao of arrayDepois) {
      const chave = avaliacao.partida_id + '|' + avaliacao.avaliador_id + '|' + avaliacao.avaliado_id
      const original = mapaFonte.get(chave)
      assert.ok(original)
      assert.equal(Number(avaliacao.nota), original.nota)
      assert.equal(avaliacao.created_at.slice(0, 10), original.data)
      if (mapaIdsAntes.has(chave)) assert.equal(avaliacao.id, mapaIdsAntes.get(chave), 'ID de avaliação existente foi alterado')
    }
    assert.deepEqual((await client.query(queryDemaisAvaliacoes, [arrayPartidasIds])).rows, arrayDemaisAvaliacoes)
    assert.deepEqual((await client.query(queryDemaisMedias, [arrayUsuarios])).rows, arrayDemaisMedias)
    assert.deepEqual((await client.query(queryEstrutura, [arrayPartidasIds])).rows[0], estruturaAntes, 'Estrutura das partidas foi alterada')
    await client.query('COMMIT')
    confirmado = true
    // Confere também em nova transação, após o commit.
    assert.deepEqual((await client.query(queryAvaliacoes, [arrayPartidasIds])).rows.map(function (linha) { return linha.registro }), arrayDepois)
    const arrayMediasDepois = (await client.query(queryMedias, [arrayUsuarios])).rows.map(function (linha) { return linha.registro })
    await fs.writeFile(path.join(pastaBackup, 'comprovante.json'), JSON.stringify({ confirmadoEm: new Date().toISOString(), fonteSha256: fonteSha256, resumo: resumo, mediasDepois: arrayMediasDepois, preservado: 'IDs anteriores, partidas, times, participações e dados de outras rodadas/usuários', dataHistorica: 'created_at normalizado para 00:00:00 na data declarada; horário real não informado' }, null, 2), { encoding: 'utf8', flag: 'wx' })
    console.log('Importação confirmada: ' + JSON.stringify(resumo))
    console.log('Backup e comprovante: ' + pastaBackup)
  } catch (erro) {
    if (!confirmado) await client.query('ROLLBACK').catch(function () {})
    if (confirmado) console.error('O COMMIT foi concluído; houve falha na conferência posterior ou no comprovante. Backup: ' + pastaBackup)
    throw erro
  } finally {
    await client.end()
  }
}

executar().catch(function (erro) { console.error(erro.message); process.exitCode = 1 })
