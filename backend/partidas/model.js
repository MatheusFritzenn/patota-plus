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
    SELECT u.id, u.nome, u.foto,
           pt.posicao_id AS "posicaoTemporariaId",
           posicao_temporaria.nome AS "posicaoTemporariaNome"
    FROM participacoes pt
    JOIN usuarios u ON u.id = pt.usuario_id
    LEFT JOIN posicoes posicao_temporaria ON posicao_temporaria.id = pt.posicao_id
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
      posicoes: arrayPosicoes,
      posicaoTemporariaId: participante.posicaoTemporariaId,
      posicaoTemporariaNome: participante.posicaoTemporariaNome
    }
    arrayParticipantes.push(participanteCompleto)
  }

  return arrayParticipantes
}

// Lista as posições válidas para a modalidade da partida.
export async function buscarPosicoesDaModalidade(modalidadeId) {
  const posicoesPorModalidade = {
    1: [1, 2, 3, 4, 5, 6],
    2: [1, 7, 8, 9],
    3: [1, 7, 8, 9]
  }
  const arrayIdsPosicoes = posicoesPorModalidade[modalidadeId] || []

  if (arrayIdsPosicoes.length === 0) {
    return []
  }

  const querySelectPosicoes = `
    SELECT id, nome
    FROM posicoes
    WHERE id = ANY($1)
    ORDER BY id ASC
  `
  const resultado = await pool.query(querySelectPosicoes, [arrayIdsPosicoes])

  return resultado.rows
}

// Define ou remove a posição temporária de um participante nesta partida.
// A posição do perfil, armazenada em usuario_posicoes, não é alterada.
export async function atualizarPosicaoTemporaria(partidaId, usuarioId, posicaoId) {
  const queryUpdatePosicao = `
    UPDATE participacoes
    SET posicao_id = $3
    WHERE partida_id = $1 AND usuario_id = $2
    RETURNING usuario_id AS "usuarioId", posicao_id AS "posicaoTemporariaId"
  `
  const resultado = await pool.query(queryUpdatePosicao, [partidaId, usuarioId, posicaoId])

  if (resultado.rows.length === 0) {
    return null
  }

  return resultado.rows[0]
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

// Busca todas as partidas de uma patota, com a contagem de vagas preenchidas.
// Quando um usuarioId é informado, calcula também o campo "avaliacaoPendente":
// true quando a partida está FINALIZADA, as avaliações NÃO foram encerradas, e o
// usuário participou (com time definido) mas ainda tem ao menos um companheiro do
// mesmo time por avaliar.
export async function buscarPartidasPorPatota(patotaId, usuarioId) {
  const querySelectPartidas = `
    SELECT pa.id, pa.patota_id AS "patotaId", pa.data, pa.horario, pa.local,
           pa.vagas_total AS "vagasTotal", pa.status,
           pa.avaliacoes_encerradas AS "avaliacoesEncerradas",
           pa.created_at AS "createdAt", pa.updated_at AS "updatedAt",
           COUNT(pt.id)::int AS "vagasPreenchidas"
    FROM partidas pa
    LEFT JOIN participacoes pt ON pt.partida_id = pa.id
    WHERE pa.patota_id = $1
    GROUP BY pa.id
    ORDER BY pa.data DESC, pa.horario DESC
  `

  const resultado = await pool.query(querySelectPartidas, [patotaId])

  const arrayPartidas = resultado.rows

  // Sem usuário informado: não há como calcular pendência individual
  if (!usuarioId) {
    for (const partida of arrayPartidas) {
      partida.avaliacaoPendente = false
    }
    return arrayPartidas
  }

  // Descobre, entre as partidas retornadas, quais têm avaliação pendente para o usuário.
  // Regra: partida FINALIZADA, avaliacoes_encerradas = false, o usuário tem participação
  // com time_id definido, e existe ao menos um companheiro do mesmo time que ele ainda
  // não avaliou (não há linha em avaliacoes com avaliador_id = usuario para aquele avaliado).
  const queryPendentes = `
    SELECT pa.id AS "partidaId"
    FROM partidas pa
    JOIN participacoes eu ON eu.partida_id = pa.id AND eu.usuario_id = $2 AND eu.time_id IS NOT NULL
    JOIN participacoes companheiro ON companheiro.partida_id = pa.id
      AND companheiro.time_id = eu.time_id
      AND companheiro.usuario_id <> eu.usuario_id
    LEFT JOIN avaliacoes av ON av.partida_id = pa.id
      AND av.avaliador_id = $2
      AND av.avaliado_id = companheiro.usuario_id
    WHERE pa.patota_id = $1
      AND pa.status = 'FINALIZADA'
      AND pa.avaliacoes_encerradas = false
      AND av.id IS NULL
    GROUP BY pa.id
  `
  const resultadoPendentes = await pool.query(queryPendentes, [patotaId, usuarioId])

  const mapaPendentes = {}
  for (const linha of resultadoPendentes.rows) {
    mapaPendentes[linha.partidaId] = true
  }

  for (const partida of arrayPartidas) {
    if (mapaPendentes[partida.id]) {
      partida.avaliacaoPendente = true
    }
    else {
      partida.avaliacaoPendente = false
    }
  }

  return arrayPartidas
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

// Lista os participantes que o avaliador PODE avaliar. Pela regra de negócio,
// cada jogador avalia apenas os COMPANHEIROS DO SEU PRÓPRIO TIME.
//
// Comportamento:
// - Se os times já foram formados e o avaliador está em um time, retorna apenas
//   os companheiros do mesmo time (menos ele mesmo).
// - Se o avaliador não está em nenhum time (ex: times não gerados ainda), a lista
//   fica vazia — não há companheiros de time definidos para avaliar.
// Inclui a nota já dada por este avaliador, se existir.
export async function buscarAvaliaveis(partidaId, avaliadorId, modalidadeId) {
  // Descobre o time do avaliador nesta partida
  const querySelectTimeAvaliador = `
    SELECT time_id AS "timeId"
    FROM participacoes
    WHERE partida_id = $1 AND usuario_id = $2
  `
  const resultadoTimeAvaliador = await pool.query(querySelectTimeAvaliador, [partidaId, avaliadorId])

  // Sem participação ou sem time definido: não há companheiros para avaliar
  if (resultadoTimeAvaliador.rows.length === 0 || !resultadoTimeAvaliador.rows[0].timeId) {
    return []
  }

  const timeId = resultadoTimeAvaliador.rows[0].timeId

  // Busca os companheiros do MESMO time (exceto o próprio avaliador)
  const querySelectParticipantes = `
    SELECT u.id, u.nome, u.foto
    FROM participacoes pt
    JOIN usuarios u ON u.id = pt.usuario_id
    WHERE pt.partida_id = $1 AND pt.usuario_id <> $2 AND pt.time_id = $3
    ORDER BY u.nome ASC
  `
  const resultado = await pool.query(querySelectParticipantes, [partidaId, avaliadorId, timeId])

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

// ===================== Geração automática de times (Fase 4) =====================

// Busca os participantes confirmados de uma partida com os insumos usados na formação:
// - forca: média geral do jogador (cache media_usuarios); null se nunca avaliado
// - posições do perfil filtradas pela modalidade e posição temporária da partida
async function buscarParticipantesParaFormacao(partidaId, client) {
  const querySelect = `
    SELECT u.id, u.nome, u.foto,
           mu.media_geral AS "mediaGeral",
           mu.total_avaliacoes AS "totalAvaliacoes",
           pt.posicao_id AS "posicaoTemporariaId",
           ARRAY(
             SELECT up.posicao_id FROM usuario_posicoes up
             WHERE up.usuario_id = u.id
               AND up.posicao_id = ANY(CASE
                 WHEN p.modalidade_id = 1 THEN ARRAY[1, 2, 3, 4, 5, 6]
                 WHEN p.modalidade_id IN (2, 3) THEN ARRAY[1, 7, 8, 9]
                 ELSE ARRAY[]::integer[] END)
             ORDER BY up.posicao_id
           ) AS "posicoesIds"
    FROM participacoes pt
    JOIN usuarios u ON u.id = pt.usuario_id
    JOIN partidas pa ON pa.id = pt.partida_id
    JOIN patotas p ON p.id = pa.patota_id
    LEFT JOIN media_usuarios mu ON mu.usuario_id = u.id
    WHERE pt.partida_id = $1
    ORDER BY u.nome ASC
  `
  const resultado = await client.query(querySelect, [partidaId])

  const arrayParticipantes = []
  for (const linha of resultado.rows) {
    const participante = {}
    participante.id = linha.id
    participante.nome = linha.nome
    participante.foto = linha.foto
    participante.posicaoTemporariaId = linha.posicaoTemporariaId
    participante.posicoesIds = linha.posicoesIds

    // Só considera a média como força quando o jogador tem avaliações.
    // Quem nunca foi avaliado fica com força indefinida (null) para receber
    // depois a força neutra do grupo.
    if (linha.totalAvaliacoes && linha.totalAvaliacoes > 0) {
      participante.forca = Number(linha.mediaGeral)
    }
    else {
      participante.forca = null
    }
    arrayParticipantes.push(participante)
  }

  return arrayParticipantes
}

export const LIMITE_DIVISOES_COMPLETAS_AVALIADAS = 350000
const TOLERANCIA_FORCA = 0.000000001

function obterComposicaoReferencia(modalidadeId) {
  if (modalidadeId === 1) {
    return [
      { posicaoId: 1, quantidade: 1 },
      { posicaoId: 2, quantidade: 2 },
      { posicaoId: 3, quantidade: 2 },
      { posicaoId: 4, quantidade: 2 },
      { posicaoId: 5, quantidade: 1 },
      { posicaoId: 6, quantidade: 3 }
    ]
  }
  if (modalidadeId === 2 || modalidadeId === 3) {
    return [
      { posicaoId: 1, quantidade: 1 },
      { posicaoId: 7, quantidade: 1 },
      { posicaoId: 8, quantidade: 2 },
      { posicaoId: 9, quantidade: 1 }
    ]
  }
  throw new Error('Modalidade sem composição de referência')
}

function calcularForcaNeutra(arrayParticipantes) {
  let soma = 0
  let quantidade = 0
  for (const participante of arrayParticipantes) {
    if (Number.isFinite(participante.forca)) {
      soma += participante.forca
      quantidade += 1
    }
  }
  if (quantidade === 0) {
    return 5
  }
  return soma / quantidade
}

function compararIds(primeiro, segundo) {
  return String(primeiro.id).localeCompare(String(segundo.id))
}

function compararForca(primeiro, segundo) {
  const diferenca = segundo.forcaEfetiva - primeiro.forcaEfetiva
  if (diferenca !== 0) {
    return diferenca
  }
  return compararIds(primeiro, segundo)
}

function prepararJogadoresParaFormacao(arrayParticipantes, arrayReferencia) {
  const forcaNeutra = calcularForcaNeutra(arrayParticipantes)
  const arrayJogadores = []
  for (const participante of arrayParticipantes) {
    let arrayOpcoes = participante.posicoesIds || []
    if (participante.posicaoTemporariaId !== null && participante.posicaoTemporariaId !== undefined) {
      arrayOpcoes = [participante.posicaoTemporariaId]
    }
    // A ordem da referência também resolve empates, independentemente do perfil.
    const arrayPosicoes = []
    for (const vaga of arrayReferencia) {
      if (arrayOpcoes.includes(vaga.posicaoId)) {
        arrayPosicoes.push(vaga.posicaoId)
      }
    }
    let forcaEfetiva = forcaNeutra
    if (Number.isFinite(participante.forca)) {
      forcaEfetiva = participante.forca
    }
    arrayJogadores.push({
      id: participante.id,
      nome: participante.nome,
      foto: participante.foto,
      forca: participante.forca,
      forcaEfetiva: forcaEfetiva,
      posicoesIds: arrayPosicoes,
      posicaoFormacaoId: null,
      extraFormacao: true,
      ehGoleiro: false
    })
  }
  arrayJogadores.sort(compararIds)
  return arrayJogadores
}

function escolherPosicoesDeAtuacao(arrayJogadores, arrayReferencia) {
  const contagem = new Map()
  for (const vaga of arrayReferencia) {
    contagem.set(vaga.posicaoId, 0)
  }
  const arrayVersateis = []
  // Contabiliza todos os jogadores de posição única antes de escolher os versáteis.
  for (const jogador of arrayJogadores) {
    if (jogador.posicoesIds.length === 1) {
      jogador.posicaoFormacaoId = jogador.posicoesIds[0]
      contagem.set(jogador.posicaoFormacaoId, contagem.get(jogador.posicaoFormacaoId) + 1)
    }
    else if (jogador.posicoesIds.length > 1) {
      arrayVersateis.push(jogador)
    }
  }
  // Os menos flexíveis escolhem primeiro; empates são resolvidos pelo ID.
  arrayVersateis.sort(function (primeiro, segundo) {
    const diferenca = primeiro.posicoesIds.length - segundo.posicoesIds.length
    if (diferenca !== 0) {
      return diferenca
    }
    return compararIds(primeiro, segundo)
  })
  for (const jogador of arrayVersateis) {
    let menorOcupacao = Infinity
    for (const vaga of arrayReferencia) {
      if (!jogador.posicoesIds.includes(vaga.posicaoId)) {
        continue
      }
      // Havendo possibilidade, preenche primeiro os dois postos de goleiro.
      if (vaga.posicaoId === 1 && contagem.get(1) < 2) {
        jogador.posicaoFormacaoId = 1
        break
      }
      const ocupacao = contagem.get(vaga.posicaoId) / (2 * vaga.quantidade)
      if (ocupacao < menorOcupacao) {
        menorOcupacao = ocupacao
        jogador.posicaoFormacaoId = vaga.posicaoId
      }
    }
    contagem.set(jogador.posicaoFormacaoId, contagem.get(jogador.posicaoFormacaoId) + 1)
  }
  for (const jogador of arrayJogadores) {
    jogador.ehGoleiro = jogador.posicaoFormacaoId === 1
  }
}

function selecionarComposicaoEExtras(arrayJogadores, arrayReferencia) {
  let capacidadeReferencia = 0
  let selecionados = 0
  // Preenche as vagas de cada posição por ID, sem privilegiar força ou avaliações.
  for (const vaga of arrayReferencia) {
    capacidadeReferencia += 2 * vaga.quantidade
    let quantidade = 0
    for (const jogador of arrayJogadores) {
      if (jogador.posicaoFormacaoId === vaga.posicaoId && quantidade < 2 * vaga.quantidade) {
        jogador.extraFormacao = false
        quantidade += 1
        selecionados += 1
      }
    }
  }
  // Se faltam posições, adapta a referência com os demais jogadores por ID.
  // Não inventa posições: quem não tem opção válida continua sem posição.
  for (const jogador of arrayJogadores) {
    if (selecionados >= capacidadeReferencia) {
      break
    }
    if (jogador.extraFormacao) {
      jogador.extraFormacao = false
      selecionados += 1
    }
  }
}

function criarGruposDeComposicao(arrayJogadores, arrayReferencia) {
  const arrayGrupos = []
  for (const vaga of arrayReferencia) {
    arrayGrupos.push({ posicaoId: vaga.posicaoId, extra: false, arrayJogadores: [], quantidadeTimeA: 0 })
  }
  arrayGrupos.push({ posicaoId: null, extra: false, arrayJogadores: [], quantidadeTimeA: 0 })
  arrayGrupos.push({ posicaoId: null, extra: true, arrayJogadores: [], quantidadeTimeA: 0 })
  for (const jogador of arrayJogadores) {
    const grupo = arrayGrupos.find(function (candidato) {
      if (jogador.extraFormacao) {
        return candidato.extra
      }
      return !candidato.extra && candidato.posicaoId === jogador.posicaoFormacaoId
    })
    grupo.arrayJogadores.push(jogador)
  }
  return arrayGrupos.filter(function (grupo) {
    return grupo.arrayJogadores.length > 0
  })
}

function criarTimesVazios() {
  return [
    { numero: 1, jogadores: [], somaForca: 0 },
    { numero: 2, jogadores: [], somaForca: 0 }
  ]
}

function adicionarJogadorAoTime(time, jogador) {
  time.jogadores.push(jogador)
  time.somaForca += jogador.forcaEfetiva
}

function copiarFormacao(arrayTimes) {
  const arrayCopia = criarTimesVazios()
  for (let indice = 0; indice < 2; indice += 1) {
    for (const jogador of arrayTimes[indice].jogadores) {
      adicionarJogadorAoTime(arrayCopia[indice], jogador)
    }
  }
  return arrayCopia
}

function calcularDiferencaForca(arrayTimes) {
  const arrayMedias = [0, 0]
  for (let indice = 0; indice < 2; indice += 1) {
    if (arrayTimes[indice].jogadores.length > 0) {
      arrayMedias[indice] = arrayTimes[indice].somaForca / arrayTimes[indice].jogadores.length
    }
  }
  return Math.abs(arrayMedias[0] - arrayMedias[1])
}

function distribuirComposicaoInicial(arrayGrupos, quantidadeJogadores) {
  const arrayTimes = criarTimesVazios()
  const arrayLimites = [Math.ceil(quantidadeJogadores / 2), Math.floor(quantidadeJogadores / 2)]
  for (const grupo of arrayGrupos) {
    grupo.arrayJogadores.sort(compararForca)
    const arrayAlocados = [[], []]
    for (const jogador of grupo.arrayJogadores) {
      let indiceEscolhido = 0
      if (arrayTimes[0].jogadores.length >= arrayLimites[0]) {
        indiceEscolhido = 1
      }
      else if (arrayTimes[1].jogadores.length < arrayLimites[1]) {
        // Nas posições, equilibra primeiro quantidades. Extras ignoram posições.
        const diferencaPosicao = arrayAlocados[0].length - arrayAlocados[1].length
        if (!grupo.extra && diferencaPosicao !== 0) {
          if (diferencaPosicao > 0) {
            indiceEscolhido = 1
          }
        }
        else {
          const diferencaTamanho = arrayTimes[0].jogadores.length - arrayTimes[1].jogadores.length
          if (diferencaTamanho > 0) {
            indiceEscolhido = 1
          }
          else if (diferencaTamanho === 0 && arrayTimes[0].somaForca > arrayTimes[1].somaForca) {
            indiceEscolhido = 1
          }
        }
      }
      adicionarJogadorAoTime(arrayTimes[indiceEscolhido], jogador)
      arrayAlocados[indiceEscolhido].push(jogador)
    }
    grupo.quantidadeTimeA = arrayAlocados[0].length
    // A primeira combinação enumerada reproduz a inicial, que permanece disponível.
    grupo.arrayJogadores = arrayAlocados[0].concat(arrayAlocados[1])
  }
  return arrayTimes
}

function contarDivisoesValidas(arrayGrupos, inversaoEquivalente) {
  // Basta distinguir totais até o teto. O dobro preserva a divisão pela simetria.
  const limiteContagem = 2 * LIMITE_DIVISOES_COMPLETAS_AVALIADAS + 1
  let total = 1
  for (const grupo of arrayGrupos) {
    const quantidade = grupo.arrayJogadores.length
    const escolhas = Math.min(grupo.quantidadeTimeA, quantidade - grupo.quantidadeTimeA)
    let combinacoes = 1
    for (let indice = 1; indice <= escolhas; indice += 1) {
      combinacoes = combinacoes * (quantidade - escolhas + indice) / indice
      if (combinacoes >= limiteContagem) {
        break
      }
    }
    total *= Math.round(combinacoes)
    if (total >= limiteContagem) {
      return LIMITE_DIVISOES_COMPLETAS_AVALIADAS + 1
    }
  }
  if (inversaoEquivalente && arrayGrupos.length > 0) {
    total /= 2
  }
  return total
}

function buscarMelhorDivisao(arrayGrupos, arrayFormacaoInicial) {
  let arrayMelhorFormacao = copiarFormacao(arrayFormacaoInicial)
  let menorDiferenca = calcularDiferencaForca(arrayMelhorFormacao)
  let divisoesAvaliadas = 0
  const arrayTimes = criarTimesVazios()
  const inversaoEquivalente = arrayGrupos.every(function (grupo) {
    return grupo.quantidadeTimeA * 2 === grupo.arrayJogadores.length
  })
  const totalDivisoes = contarDivisoesValidas(arrayGrupos, inversaoEquivalente)

  function explorarGrupo(indiceGrupo) {
    if (divisoesAvaliadas >= LIMITE_DIVISOES_COMPLETAS_AVALIADAS) {
      return
    }
    if (indiceGrupo === arrayGrupos.length) {
      // Somente divisões COMPLETAS que preservam todas as vagas chegam aqui.
      divisoesAvaliadas += 1
      const diferenca = calcularDiferencaForca(arrayTimes)
      if (diferenca < menorDiferenca - TOLERANCIA_FORCA) {
        menorDiferenca = diferenca
        arrayMelhorFormacao = copiarFormacao(arrayTimes)
      }
      return
    }
    const grupo = arrayGrupos[indiceGrupo]
    function escolherJogador(indiceJogador, vagasTimeA) {
      if (divisoesAvaliadas >= LIMITE_DIVISOES_COMPLETAS_AVALIADAS) {
        return
      }
      const restantes = grupo.arrayJogadores.length - indiceJogador
      if (restantes === 0) {
        explorarGrupo(indiceGrupo + 1)
        return
      }
      const jogador = grupo.arrayJogadores[indiceJogador]
      for (let indiceTime = 0; indiceTime < 2; indiceTime += 1) {
        if (indiceTime === 0 && vagasTimeA === 0) {
          continue
        }
        if (indiceTime === 1 && restantes === vagasTimeA) {
          continue
        }
        // Só elimina inversões quando as composições dos dois times são iguais.
        if (inversaoEquivalente && indiceGrupo === 0 && indiceJogador === 0 && indiceTime === 1) {
          continue
        }
        const time = arrayTimes[indiceTime]
        const somaAnterior = time.somaForca
        adicionarJogadorAoTime(time, jogador)
        let proximasVagas = vagasTimeA
        if (indiceTime === 0) {
          proximasVagas -= 1
        }
        escolherJogador(indiceJogador + 1, proximasVagas)
        time.jogadores.pop()
        time.somaForca = somaAnterior
      }
    }
    escolherJogador(0, grupo.quantidadeTimeA)
  }
  explorarGrupo(0)
  return {
    times: arrayMelhorFormacao,
    divisoesAvaliadas: divisoesAvaliadas,
    buscaConcluida: divisoesAvaliadas === totalDivisoes
  }
}

// A garantia de menor diferença vale somente para a composição e as posições
// escolhidas nesta execução, e somente quando buscaConcluida é true.
export function balancearTimes(arrayParticipantes, modalidadeId) {
  const arrayReferencia = obterComposicaoReferencia(modalidadeId)
  const arrayJogadores = prepararJogadoresParaFormacao(arrayParticipantes, arrayReferencia)
  escolherPosicoesDeAtuacao(arrayJogadores, arrayReferencia)
  selecionarComposicaoEExtras(arrayJogadores, arrayReferencia)
  const arrayGrupos = criarGruposDeComposicao(arrayJogadores, arrayReferencia)
  const arrayFormacaoInicial = distribuirComposicaoInicial(arrayGrupos, arrayJogadores.length)
  return buscarMelhorDivisao(arrayGrupos, arrayFormacaoInicial)
}

// Gera (ou regenera) os times de uma partida e persiste o resultado.
// Apaga os times anteriores, cria os novos e atualiza o time_id das participações.
// Retorna a estrutura dos times criados com seus jogadores.
export async function gerarTimes(partidaId, modalidadeId) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Busca os participantes com os insumos de formação
    const arrayParticipantes = await buscarParticipantesParaFormacao(partidaId, client)

    // Calcula os times em memória (sempre 2 times)
    const formacao = balancearTimes(arrayParticipantes, modalidadeId)
    const arrayTimesCalculados = formacao.times

    // Limpa a formação anterior: zera o time_id das participações e apaga os times
    const queryLimparFormacao = `
      UPDATE participacoes
      SET time_id = NULL, posicao_formacao_id = NULL, extra_formacao = NULL
      WHERE partida_id = $1
    `
    await client.query(queryLimparFormacao, [partidaId])
    await client.query('DELETE FROM times WHERE partida_id = $1', [partidaId])

    // Cria cada time e associa os jogadores
    for (const timeCalculado of arrayTimesCalculados) {
      const queryInsertTime = `
        INSERT INTO times (id, partida_id, nome)
        VALUES (gen_random_uuid(), $1, $2)
        RETURNING id
      `
      const nomeTime = 'Time ' + timeCalculado.numero
      const resultadoTime = await client.query(queryInsertTime, [partidaId, nomeTime])
      const timeId = resultadoTime.rows[0].id

      // Atualiza a participação de cada jogador do time
      for (const jogador of timeCalculado.jogadores) {
        const queryUpdateParticipacao = `
          UPDATE participacoes SET time_id = $1, posicao_formacao_id = $4, extra_formacao = $5
          WHERE partida_id = $2 AND usuario_id = $3
        `
        await client.query(queryUpdateParticipacao, [
          timeId, partidaId, jogador.id, jogador.posicaoFormacaoId, jogador.extraFormacao
        ])
      }
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

  // Retorna a formação já persistida (fora da transação)
  return await buscarTimes(partidaId)
}

// Busca os times de uma partida com seus jogadores (nome, foto, posições e força).
// Retorna também a média de força de cada time (útil para a UI mostrar
// o quão equilibrada ficou a divisão).
function ordenarJogadoresParaExibicao(arrayJogadores, modalidadeId) {
  let arrayOrdemPosicoes = []
  if (modalidadeId === 1) {
    arrayOrdemPosicoes = ['Goleiro', 'Lateral', 'Zagueiro', 'Volante', 'Meia', 'Atacante']
  }
  else if (modalidadeId === 2 || modalidadeId === 3) {
    arrayOrdemPosicoes = ['Goleiro', 'Fixo', 'Ala', 'Pivô']
  }

  function identificarOrdemDoJogador(jogador) {
    if (jogador.extraFormacao === true) {
      return arrayOrdemPosicoes.length + 1
    }
    let arrayPosicoes = jogador.posicoes
    if (jogador.extraFormacao === false) {
      arrayPosicoes = []
      if (jogador.posicaoFormacaoNome) {
        arrayPosicoes.push(jogador.posicaoFormacaoNome)
      }
    }
    else if (jogador.posicaoTemporariaNome) {
      arrayPosicoes = [jogador.posicaoTemporariaNome]
    }

    // A primeira posição encontrada é a mais defensiva dentre as opções do perfil.
    for (let indice = 0; indice < arrayOrdemPosicoes.length; indice += 1) {
      if (arrayPosicoes.includes(arrayOrdemPosicoes[indice])) {
        return indice
      }
    }

    // Sem posição reconhecida para a modalidade, aparece depois dos demais.
    return arrayOrdemPosicoes.length
  }

  arrayJogadores.sort(function (primeiroJogador, segundoJogador) {
    const ordemPrimeiro = identificarOrdemDoJogador(primeiroJogador)
    const ordemSegundo = identificarOrdemDoJogador(segundoJogador)
    // Empates preservam a ordem por nome recebida da consulta.
    return ordemPrimeiro - ordemSegundo
  })
}

export async function buscarTimes(partidaId) {
  // Mesma força neutra usada pelo balanceamento, inclusive na média exibida.
  const queryForcaNeutra = `
    SELECT COALESCE(AVG(mu.media_geral), 5) AS "forcaNeutra"
    FROM participacoes pt
    JOIN media_usuarios mu ON mu.usuario_id = pt.usuario_id
    WHERE pt.partida_id = $1 AND mu.total_avaliacoes > 0
  `
  const resultadoForcaNeutra = await pool.query(queryForcaNeutra, [partidaId])
  const forcaNeutra = Number(resultadoForcaNeutra.rows[0].forcaNeutra)
  // Descobre a modalidade da partida (para filtrar as posições exibidas)
  const queryModalidade = `
    SELECT p.modalidade_id AS "modalidadeId"
    FROM partidas pa
    JOIN patotas p ON p.id = pa.patota_id
    WHERE pa.id = $1
  `
  const resultadoModalidade = await pool.query(queryModalidade, [partidaId])
  let modalidadeId = null
  if (resultadoModalidade.rows.length > 0) {
    modalidadeId = resultadoModalidade.rows[0].modalidadeId
  }

  const posicoesPorModalidade = {
    1: [1, 2, 3, 4, 5, 6],
    2: [1, 7, 8, 9],
    3: [1, 7, 8, 9]
  }
  const arrayIdsPosicoes = posicoesPorModalidade[modalidadeId] || []

  // Busca os times da partida
  const querySelectTimes = `
    SELECT id, nome FROM times
    WHERE partida_id = $1
    ORDER BY nome ASC
  `
  const resultadoTimes = await pool.query(querySelectTimes, [partidaId])

  const arrayTimes = []
  for (const time of resultadoTimes.rows) {
    // Busca os jogadores do time com sua força (média geral)
    const querySelectJogadores = `
      SELECT u.id, u.nome, u.foto,
             mu.media_geral AS "mediaGeral",
             mu.total_avaliacoes AS "totalAvaliacoes",
             pt.posicao_id AS "posicaoTemporariaId",
             posicao_temporaria.nome AS "posicaoTemporariaNome",
             pt.posicao_formacao_id AS "posicaoFormacaoId",
             posicao_formacao.nome AS "posicaoFormacaoNome",
             pt.extra_formacao AS "extraFormacao",
             CASE WHEN pt.extra_formacao IS NOT NULL THEN COALESCE(pt.posicao_formacao_id = 1, false)
             WHEN pt.posicao_id IS NOT NULL THEN pt.posicao_id = 1
             ELSE EXISTS (
               SELECT 1 FROM usuario_posicoes up
               WHERE up.usuario_id = u.id AND up.posicao_id = 1
             ) END AS "ehGoleiro"
      FROM participacoes pt
      JOIN usuarios u ON u.id = pt.usuario_id
      LEFT JOIN media_usuarios mu ON mu.usuario_id = u.id
      LEFT JOIN posicoes posicao_temporaria ON posicao_temporaria.id = pt.posicao_id
      LEFT JOIN posicoes posicao_formacao ON posicao_formacao.id = pt.posicao_formacao_id
      WHERE pt.partida_id = $1 AND pt.time_id = $2
      ORDER BY u.nome ASC
    `
    const resultadoJogadores = await pool.query(querySelectJogadores, [partidaId, time.id])

    const arrayJogadores = []
    let somaForca = 0
    for (const linha of resultadoJogadores.rows) {
      // Posições do jogador filtradas pela modalidade
      const querySelectPosicoes = `
        SELECT p.nome
        FROM usuario_posicoes up
        JOIN posicoes p ON p.id = up.posicao_id
        WHERE up.usuario_id = $1 AND up.posicao_id = ANY($2)
      `
      const resultadoPosicoes = await pool.query(querySelectPosicoes, [linha.id, arrayIdsPosicoes])
      const arrayPosicoes = []
      for (const row of resultadoPosicoes.rows) {
        arrayPosicoes.push(row.nome)
      }

      let forca = null
      if (linha.totalAvaliacoes && linha.totalAvaliacoes > 0) {
        forca = Number(Number(linha.mediaGeral).toFixed(2))
      }
      let forcaEfetiva = forcaNeutra
      if (forca !== null) {
        forcaEfetiva = forca
      }
      somaForca += forcaEfetiva

      const jogador = {}
      jogador.id = linha.id
      jogador.nome = linha.nome
      jogador.foto = linha.foto
      jogador.ehGoleiro = linha.ehGoleiro
      jogador.posicoes = arrayPosicoes
      jogador.posicaoTemporariaId = linha.posicaoTemporariaId
      jogador.posicaoTemporariaNome = linha.posicaoTemporariaNome
      jogador.posicaoFormacaoId = linha.posicaoFormacaoId
      jogador.posicaoFormacaoNome = linha.posicaoFormacaoNome
      jogador.extraFormacao = linha.extraFormacao
      jogador.forca = forca
      jogador.forcaEfetiva = forcaEfetiva
      arrayJogadores.push(jogador)
    }

    let mediaForca = null
    if (arrayJogadores.length > 0) {
      mediaForca = Number((somaForca / arrayJogadores.length).toFixed(2))
    }

    ordenarJogadoresParaExibicao(arrayJogadores, modalidadeId)

    const timeCompleto = {}
    timeCompleto.id = time.id
    timeCompleto.nome = time.nome
    timeCompleto.jogadores = arrayJogadores
    timeCompleto.mediaForca = mediaForca
    arrayTimes.push(timeCompleto)
  }

  return arrayTimes
}

// Desfaz a formação de times de uma partida (zera time_id e apaga os times).
export async function desfazerTimes(partidaId) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const queryLimparFormacao = `
      UPDATE participacoes
      SET time_id = NULL, posicao_formacao_id = NULL, extra_formacao = NULL
      WHERE partida_id = $1
    `
    await client.query(queryLimparFormacao, [partidaId])
    await client.query('DELETE FROM times WHERE partida_id = $1', [partidaId])
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
