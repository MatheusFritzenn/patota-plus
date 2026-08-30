import pool from '../db.js'

// Cria uma nova partida vinculada a uma patota
export async function criarPartida(dados) {
  const queryInsertPartida = `
    INSERT INTO partidas (id, patota_id, data, horario, local, vagas_total, status, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'AGENDADA', NOW(), NOW())
    RETURNING id, patota_id AS "patotaId", data, horario, local, vagas_total AS "vagasTotal", status, created_at AS "createdAt", updated_at AS "updatedAt"
  `

  const arrayValoresPartida = [
    dados.patotaId,
    dados.data,
    dados.horario,
    dados.local,
    dados.vagasTotal
  ]

  const resultado = await pool.query(queryInsertPartida, arrayValoresPartida)

  return resultado.rows[0]
}

// Busca os detalhes de uma partida específica, incluindo dados da patota e vagas preenchidas
export async function buscarPartidaPorId(partidaId) {
  const querySelectPartida = `
    SELECT pa.id, pa.patota_id AS "patotaId", pa.data, pa.horario, pa.local,
           pa.vagas_total AS "vagasTotal", pa.status,
           pa.avaliacoes_encerradas AS "avaliacoesEncerradas",
           pa.created_at AS "createdAt", pa.updated_at AS "updatedAt",
           p.nome AS "patotaNome", p.modalidade_id AS "modalidadeId",
           p.presidente_id AS "presidenteId"
    FROM partidas pa
    JOIN patotas p ON p.id = pa.patota_id
    WHERE pa.id = $1
  `

  const resultado = await pool.query(querySelectPartida, [partidaId])

  if (resultado.rows.length === 0) {
    return null
  }

  const partida = resultado.rows[0]

  // Conta vagas preenchidas (cada participação representa um jogador confirmado)
  const queryContarConfirmados = `
    SELECT COUNT(*)::int AS total FROM participacoes
    WHERE partida_id = $1
  `
  const resultadoConfirmados = await pool.query(queryContarConfirmados, [partidaId])
  partida.vagasPreenchidas = resultadoConfirmados.rows[0].total

  return partida
}

// Busca os participantes confirmados de uma partida, com nome, foto e posições
export async function buscarParticipantes(partidaId, modalidadeId) {
  const querySelectParticipantes = `
    SELECT u.id, u.nome, u.foto
    FROM participacoes pt
    JOIN usuarios u ON u.id = pt.usuario_id
    WHERE pt.partida_id = $1
    ORDER BY u.nome ASC
  `

  const resultado = await pool.query(querySelectParticipantes, [partidaId])

  // Mapa de posições por modalidade (mesmo critério usado em membros da patota)
  const posicoesPorModalidade = {
    1: [1, 2, 3, 4, 5, 6],
    2: [1, 7, 8, 9],
    3: [1, 7, 8, 9]
  }

  const arrayIdsPosicoes = posicoesPorModalidade[modalidadeId] || []

  const arrayParticipantes = []
  for (const participante of resultado.rows) {
    const querySelectPosicoes = `
      SELECT p.nome
      FROM usuario_posicoes up
      JOIN posicoes p ON p.id = up.posicao_id
      WHERE up.usuario_id = $1 AND up.posicao_id = ANY($2)
    `
    const resultadoPosicoes = await pool.query(querySelectPosicoes, [participante.id, arrayIdsPosicoes])

    const arrayPosicoes = []
    for (const row of resultadoPosicoes.rows) {
      arrayPosicoes.push(row.nome)
    }

    const participanteCompleto = {
      id: participante.id,
      nome: participante.nome,
      foto: participante.foto,
      posicoes: arrayPosicoes
    }
    arrayParticipantes.push(participanteCompleto)
  }

  return arrayParticipantes
}

// Verifica se um usuário já é participante confirmado da partida
export async function participacaoExiste(partidaId, usuarioId) {
  const querySelect = `
    SELECT 1 FROM participacoes
    WHERE partida_id = $1 AND usuario_id = $2
  `
  const resultado = await pool.query(querySelect, [partidaId, usuarioId])

  return resultado.rows.length > 0
}

// Confirma a presença de um usuário na partida respeitando o limite de vagas
export async function confirmarPresenca(partidaId, usuarioId) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Bloqueia a linha da partida para leitura consistente do total de vagas
    const querySelectPartida = `
      SELECT vagas_total FROM partidas WHERE id = $1 FOR UPDATE
    `
    const resultadoPartida = await client.query(querySelectPartida, [partidaId])

    if (resultadoPartida.rows.length === 0) {
      await client.query('ROLLBACK')
      return { naoEncontrada: true }
    }

    const vagasTotal = resultadoPartida.rows[0].vagas_total

    // Verifica se já está confirmado
    const queryJaConfirmado = `
      SELECT 1 FROM participacoes
      WHERE partida_id = $1 AND usuario_id = $2
    `
    const resultadoJaConfirmado = await client.query(queryJaConfirmado, [partidaId, usuarioId])

    if (resultadoJaConfirmado.rows.length > 0) {
      await client.query('ROLLBACK')
      return { jaConfirmado: true }
    }

    // Conta vagas preenchidas
    const queryContar = `
      SELECT COUNT(*)::int AS total FROM participacoes
      WHERE partida_id = $1
    `
    const resultadoContar = await client.query(queryContar, [partidaId])
    const vagasPreenchidas = resultadoContar.rows[0].total

    if (vagasPreenchidas >= vagasTotal) {
      await client.query('ROLLBACK')
      return { semVagas: true }
    }

    // Insere a participação (cada registro representa um jogador confirmado)
    const queryInsert = `
      INSERT INTO participacoes (id, partida_id, usuario_id)
      VALUES (gen_random_uuid(), $1, $2)
      RETURNING id, partida_id AS "partidaId", usuario_id AS "usuarioId"
    `
    const resultadoInsert = await client.query(queryInsert, [partidaId, usuarioId])

    await client.query('COMMIT')

    return { participacao: resultadoInsert.rows[0] }
  }
  catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  }
  finally {
    client.release()
  }
}

// Remove a participação de um usuário na partida (recusar/cancelar ou remoção pelo presidente)
export async function removerParticipacao(partidaId, usuarioId) {
  const queryDelete = 'DELETE FROM participacoes WHERE partida_id = $1 AND usuario_id = $2'
  await pool.query(queryDelete, [partidaId, usuarioId])
}

// Busca todas as partidas de uma patota, com a contagem de vagas preenchidas
export async function buscarPartidasPorPatota(patotaId) {
  const querySelectPartidas = `
    SELECT pa.id, pa.patota_id AS "patotaId", pa.data, pa.horario, pa.local,
           pa.vagas_total AS "vagasTotal", pa.status,
           pa.created_at AS "createdAt", pa.updated_at AS "updatedAt",
           COUNT(pt.id)::int AS "vagasPreenchidas"
    FROM partidas pa
    LEFT JOIN participacoes pt ON pt.partida_id = pa.id
    WHERE pa.patota_id = $1
    GROUP BY pa.id
    ORDER BY pa.data ASC
  `

  const resultado = await pool.query(querySelectPartidas, [patotaId])

  return resultado.rows
}

// Finaliza uma partida (muda o status de AGENDADA/EM_ANDAMENTO para FINALIZADA)
export async function finalizarPartida(partidaId) {
  const queryUpdate = `
    UPDATE partidas
    SET status = 'FINALIZADA', updated_at = NOW()
    WHERE id = $1 AND status <> 'FINALIZADA'
    RETURNING id, patota_id AS "patotaId", status
  `
  const resultado = await pool.query(queryUpdate, [partidaId])

  if (resultado.rows.length === 0) {
    return null
  }

  return resultado.rows[0]
}

// ===================== Avaliações (Fase 2) =====================

// Verifica se um usuário participou de uma partida (está em participacoes)
export async function usuarioParticipouDaPartida(partidaId, usuarioId) {
  const querySelect = `
    SELECT 1 FROM participacoes
    WHERE partida_id = $1 AND usuario_id = $2
  `
  const resultado = await pool.query(querySelect, [partidaId, usuarioId])

  return resultado.rows.length > 0
}

// Lista os participantes que o avaliador PODE avaliar (todos os outros participantes,
// menos ele mesmo). Inclui a nota já dada por este avaliador, se existir.
//
// PENDÊNCIA (Fase 4 — geração automática de times): quando os times forem formados,
// esta busca deve filtrar apenas os participantes com o MESMO time_id do avaliador.
export async function buscarAvaliaveis(partidaId, avaliadorId, modalidadeId) {
  const querySelectParticipantes = `
    SELECT u.id, u.nome, u.foto
    FROM participacoes pt
    JOIN usuarios u ON u.id = pt.usuario_id
    WHERE pt.partida_id = $1 AND pt.usuario_id <> $2
    ORDER BY u.nome ASC
  `
  const resultado = await pool.query(querySelectParticipantes, [partidaId, avaliadorId])

  // Busca as notas já dadas por este avaliador nesta partida
  const querySelectNotas = `
    SELECT avaliado_id AS "avaliadoId", nota
    FROM avaliacoes
    WHERE partida_id = $1 AND avaliador_id = $2
  `
  const resultadoNotas = await pool.query(querySelectNotas, [partidaId, avaliadorId])

  // Índice avaliadoId -> nota
  const mapaNotas = {}
  for (const linha of resultadoNotas.rows) {
    mapaNotas[linha.avaliadoId] = linha.nota
  }

  // Mapa de posições por modalidade (mesmo critério das demais telas)
  const posicoesPorModalidade = {
    1: [1, 2, 3, 4, 5, 6],
    2: [1, 7, 8, 9],
    3: [1, 7, 8, 9]
  }
  const arrayIdsPosicoes = posicoesPorModalidade[modalidadeId] || []

  const arrayAvaliaveis = []
  for (const participante of resultado.rows) {
    const querySelectPosicoes = `
      SELECT p.nome
      FROM usuario_posicoes up
      JOIN posicoes p ON p.id = up.posicao_id
      WHERE up.usuario_id = $1 AND up.posicao_id = ANY($2)
    `
    const resultadoPosicoes = await pool.query(querySelectPosicoes, [participante.id, arrayIdsPosicoes])
    const arrayPosicoes = []
    for (const row of resultadoPosicoes.rows) {
      arrayPosicoes.push(row.nome)
    }

    let notaExistente = null
    if (mapaNotas[participante.id] !== undefined) {
      notaExistente = Number(mapaNotas[participante.id])
    }

    const avaliavel = {}
    avaliavel.id = participante.id
    avaliavel.nome = participante.nome
    avaliavel.foto = participante.foto
    avaliavel.posicoes = arrayPosicoes
    avaliavel.notaDada = notaExistente
    arrayAvaliaveis.push(avaliavel)
  }

  return arrayAvaliaveis
}

// Registra (insere ou atualiza) as avaliações feitas por um avaliador em uma partida.
// arrayAvaliacoes: [{ avaliadoId, nota }]
export async function registrarAvaliacoes(partidaId, avaliadorId, arrayAvaliacoes) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    for (const item of arrayAvaliacoes) {
      const queryUpsert = `
        INSERT INTO avaliacoes (id, partida_id, avaliador_id, avaliado_id, nota, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
        ON CONFLICT (partida_id, avaliador_id, avaliado_id)
        DO UPDATE SET nota = EXCLUDED.nota, created_at = NOW()
      `
      await client.query(queryUpsert, [partidaId, avaliadorId, item.avaliadoId, item.nota])
    }

    await client.query('COMMIT')
  }
  catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  }
  finally {
    client.release()
  }
}

// Encerra as avaliações de uma partida e recalcula o cache de média geral (media_usuarios)
// de cada jogador que recebeu avaliação nesta partida.
export async function encerrarAvaliacoes(partidaId) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Marca as avaliações como encerradas
    const queryUpdatePartida = `
      UPDATE partidas
      SET avaliacoes_encerradas = true, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `
    const resultadoPartida = await client.query(queryUpdatePartida, [partidaId])

    if (resultadoPartida.rows.length === 0) {
      await client.query('ROLLBACK')
      return null
    }

    // Descobre quais jogadores foram avaliados nesta partida
    const querySelectAvaliados = `
      SELECT DISTINCT avaliado_id AS "avaliadoId"
      FROM avaliacoes
      WHERE partida_id = $1
    `
    const resultadoAvaliados = await client.query(querySelectAvaliados, [partidaId])

    // Para cada avaliado, recalcula a média geral com base em TODAS as avaliações
    // que ele já recebeu (em qualquer partida) e atualiza o cache media_usuarios.
    for (const linha of resultadoAvaliados.rows) {
      const avaliadoId = linha.avaliadoId

      const queryAgregado = `
        SELECT COUNT(*)::int AS total, COALESCE(AVG(nota), 0) AS media
        FROM avaliacoes
        WHERE avaliado_id = $1
      `
      const resultadoAgregado = await client.query(queryAgregado, [avaliadoId])
      const totalAvaliacoes = resultadoAgregado.rows[0].total
      const mediaGeral = Number(resultadoAgregado.rows[0].media).toFixed(2)

      const queryUpsertMedia = `
        INSERT INTO media_usuarios (id, usuario_id, media_geral, total_avaliacoes, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, NOW())
        ON CONFLICT (usuario_id)
        DO UPDATE SET media_geral = EXCLUDED.media_geral, total_avaliacoes = EXCLUDED.total_avaliacoes, updated_at = NOW()
      `
      await client.query(queryUpsertMedia, [avaliadoId, mediaGeral, totalAvaliacoes])
    }

    await client.query('COMMIT')

    return { partidaId: partidaId, avaliadosAtualizados: resultadoAvaliados.rows.length }
  }
  catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  }
  finally {
    client.release()
  }
}

// Busca o resultado das avaliações de uma partida: para cada participante avaliado,
// a média das notas recebidas NAQUELA partida e a quantidade de avaliações recebidas.
export async function buscarResultadoAvaliacoes(partidaId) {
  const querySelect = `
    SELECT u.id, u.nome, u.foto,
           COUNT(a.id)::int AS "totalAvaliacoes",
           COALESCE(AVG(a.nota), 0) AS "mediaPartida"
    FROM participacoes pt
    JOIN usuarios u ON u.id = pt.usuario_id
    LEFT JOIN avaliacoes a ON a.avaliado_id = u.id AND a.partida_id = pt.partida_id
    WHERE pt.partida_id = $1
    GROUP BY u.id, u.nome, u.foto
    ORDER BY "mediaPartida" DESC, u.nome ASC
  `
  const resultado = await pool.query(querySelect, [partidaId])

  const arrayResultado = []
  for (const linha of resultado.rows) {
    const item = {}
    item.id = linha.id
    item.nome = linha.nome
    item.foto = linha.foto
    item.totalAvaliacoes = linha.totalAvaliacoes
    item.mediaPartida = Number(Number(linha.mediaPartida).toFixed(2))
    arrayResultado.push(item)
  }

  return arrayResultado
}
