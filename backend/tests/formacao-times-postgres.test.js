import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pool from '../db.js'
import { gerarTimes, buscarTimes, desfazerTimes, atualizarPosicaoTemporaria } from '../partidas/model.js'

// Execução optativa: TESTAR_POSTGRES=1 e node --env-file=.env --test
// tests/formacao-times-postgres.test.js. Todas as gravações usam tabelas temporárias.
test('PostgreSQL: gerar, ler, regenerar e desfazer preservam perfil e posição temporária', {
  skip: process.env.TESTAR_POSTGRES !== '1'
}, async function (contexto) {
  const client = await pool.connect()
  try {
    // Mantém a sessão do servidor reservada, inclusive em um pool transacional.
    await client.query('BEGIN')
    await client.query('DISCARD TEMP')
    const queryVerificarMigration = `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'participacoes'
        AND column_name IN ('posicao_formacao_id', 'extra_formacao')
    `
    assert.equal((await client.query(queryVerificarMigration)).rows.length, 2)
    // pg_temp tem precedência sobre public. Nenhum dado real é alterado.
    const queryPrepararTabelas = `
      CREATE TEMP TABLE usuarios (id uuid PRIMARY KEY, nome text, foto text);
      CREATE TEMP TABLE posicoes (id integer PRIMARY KEY, nome text);
      CREATE TEMP TABLE patotas (id uuid PRIMARY KEY, modalidade_id integer);
      CREATE TEMP TABLE partidas (id uuid PRIMARY KEY, patota_id uuid REFERENCES patotas);
      CREATE TEMP TABLE times (id uuid PRIMARY KEY, partida_id uuid REFERENCES partidas, nome text);
      CREATE TEMP TABLE participacoes (
        partida_id uuid REFERENCES partidas, usuario_id uuid REFERENCES usuarios,
        time_id uuid REFERENCES times ON DELETE SET NULL,
        posicao_id integer REFERENCES posicoes,
        posicao_formacao_id integer REFERENCES posicoes ON DELETE SET NULL,
        extra_formacao boolean, PRIMARY KEY (partida_id, usuario_id)
      );
      CREATE TEMP TABLE usuario_posicoes (usuario_id uuid REFERENCES usuarios, posicao_id integer REFERENCES posicoes);
      CREATE TEMP TABLE media_usuarios (usuario_id uuid REFERENCES usuarios, media_geral numeric(4,2), total_avaliacoes integer);
      INSERT INTO pg_temp.posicoes VALUES (1, 'Goleiro'), (7, 'Fixo'), (8, 'Ala'), (9, 'Pivô');
    `
    await client.query(queryPrepararTabelas)
    const partidaId = randomUUID()
    const patotaId = randomUUID()
    await client.query('INSERT INTO pg_temp.patotas VALUES ($1, 2)', [patotaId])
    await client.query('INSERT INTO pg_temp.partidas VALUES ($1, $2)', [partidaId, patotaId])
    const arrayPosicoes = [1, 1, 7, 7, 8, 8, 8, 8, 9, 9, 8, 9]
    const arrayUsuarios = []
    for (let indice = 0; indice < arrayPosicoes.length; indice += 1) {
      const usuarioId = randomUUID()
      arrayUsuarios.push(usuarioId)
      await client.query('INSERT INTO pg_temp.usuarios VALUES ($1, $2, NULL)', [usuarioId, 'Jogador ' + indice])
      await client.query('INSERT INTO pg_temp.usuario_posicoes VALUES ($1, $2)', [usuarioId, arrayPosicoes[indice]])
      await client.query('INSERT INTO pg_temp.participacoes (partida_id, usuario_id) VALUES ($1, $2)', [partidaId, usuarioId])
      if (indice < 10) {
        await client.query('INSERT INTO pg_temp.media_usuarios VALUES ($1, $2, 1)', [usuarioId, indice])
      }
    }
    await client.query('UPDATE pg_temp.participacoes SET posicao_id = 7 WHERE usuario_id = $1', [arrayUsuarios[2]])
    // Transações do model viram savepoints dentro da transação de isolamento.
    // As queries de dados continuam reais, inclusive a leitura após cada gravação.
    async function executarQueryIsolada(queryComando, arrayValores) {
      if (queryComando === 'BEGIN') {
        return await client.query('SAVEPOINT formacao_teste')
      }
      if (queryComando === 'COMMIT') {
        return await client.query('RELEASE SAVEPOINT formacao_teste')
      }
      if (queryComando === 'ROLLBACK') {
        return await client.query('ROLLBACK TO SAVEPOINT formacao_teste')
      }
      return await client.query(queryComando, arrayValores)
    }
    contexto.mock.method(pool, 'connect', async function () {
      return { query: executarQueryIsolada, release: function () {} }
    })
    contexto.mock.method(pool, 'query', client.query.bind(client))
    const arrayGerados = await gerarTimes(partidaId, 2)
    assert.deepEqual(await buscarTimes(partidaId), arrayGerados)
    assert.equal(arrayGerados.length, 2)
    for (const time of arrayGerados) {
      assert.equal(time.jogadores.length, 6)
      assert.equal(time.jogadores.filter(function (jogador) {
        return jogador.extraFormacao
      }).length, 1)
      assert.equal(time.jogadores.at(-1).extraFormacao, true)
      const mediaEsperada = time.jogadores.reduce(function (soma, jogador) {
        return soma + jogador.forcaEfetiva
      }, 0) / 6
      assert.equal(time.mediaForca, Number(mediaEsperada.toFixed(2)))
      for (const jogador of time.jogadores) {
        assert.ok(jogador.posicaoFormacaoNome)
        if (jogador.forca === null) {
          assert.equal(jogador.forcaEfetiva, 4.5)
        }
      }
    }
    const arrayRegenerados = await gerarTimes(partidaId, 2)
    for (let indice = 0; indice < 2; indice += 1) {
      assert.notEqual(arrayGerados[indice].id, arrayRegenerados[indice].id)
      assert.deepEqual(arrayGerados[indice].jogadores, arrayRegenerados[indice].jogadores)
    }
    await atualizarPosicaoTemporaria(partidaId, arrayUsuarios[2], 9)
    const arrayAposRemanejamento = await buscarTimes(partidaId)
    const jogadorRemanejado = arrayAposRemanejamento.flatMap(function (time) {
      return time.jogadores
    })
      .find(function (jogador) {
        return jogador.id === arrayUsuarios[2]
      })
    assert.equal(jogadorRemanejado.posicaoTemporariaId, 9)
    assert.equal(jogadorRemanejado.posicaoFormacaoId, 7)
    await gerarTimes(partidaId, 2)
    const resultadoRegenerado = await client.query('SELECT posicao_formacao_id FROM pg_temp.participacoes WHERE usuario_id = $1', [arrayUsuarios[2]])
    assert.equal(resultadoRegenerado.rows[0].posicao_formacao_id, 9)
    await desfazerTimes(partidaId)
    assert.deepEqual(await buscarTimes(partidaId), [])
    const resultado = await client.query('SELECT * FROM pg_temp.participacoes')
    assert.equal(resultado.rows.length, 12)
    for (const linha of resultado.rows) {
      assert.equal(linha.time_id, null)
      assert.equal(linha.posicao_formacao_id, null)
      assert.equal(linha.extra_formacao, null)
    }
    const resultadoPerfil = await client.query('SELECT posicao_id FROM pg_temp.usuario_posicoes WHERE usuario_id = $1', [arrayUsuarios[2]])
    assert.equal(resultadoPerfil.rows[0].posicao_id, 7)
    assert.equal(resultado.rows.find(function (linha) {
      return linha.usuario_id === arrayUsuarios[2]
    }).posicao_id, 9)
  }
  finally {
    try {
      await client.query('ROLLBACK')
      // O pool remoto pode reutilizar a sessão após fechar a conexão do pg.
      await client.query('DISCARD TEMP')
    }
    finally {
      client.release(true)
      await pool.end()
    }
  }
})
