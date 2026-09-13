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

// Etapas da formação. As funções auxiliares abaixo detalham cada uma delas.
// A ordem dos critérios permanece: goleiros, posições e força média.
export function balancearTimes(arrayParticipantes) {
  // 1. Define a força usada quando um participante ainda não foi avaliado.
  const forcaNeutra = calcularForcaNeutra(arrayParticipantes)

  // 2. Prepara cópias dos jogadores, usando a posição temporária quando existir.
  const arrayJogadores = prepararJogadoresParaFormacao(arrayParticipantes, forcaNeutra)

  // 3. Coloca goleiros primeiro, depois os mais fortes, com desempate pelo ID.
  arrayJogadores.sort(compararJogadoresParaFormacao)

  // 4. Distribui os jogadores respeitando o limite de tamanho de cada time.
  const arrayTimes = criarTimesVazios()
  distribuirJogadoresNosTimes(arrayJogadores, arrayTimes)

  // 5. Experimenta trocas e mantém somente as que melhoram o equilíbrio.
  melhorarTimesPorTrocas(arrayTimes)

  // 6. Até 22 jogadores, compara todas as divisões para encontrar a melhor
  // combinação de posições e, entre as equivalentes, a menor diferença de força.
  if (arrayJogadores.length <= 22) {
    return encontrarMelhorDivisaoCompleta(arrayJogadores, arrayTimes)
  }

  return arrayTimes
}

function copiarFormacao(arrayTimes) {
  const arrayCopia = criarTimesVazios()
  for (let indice = 0; indice < arrayTimes.length; indice += 1) {
    for (const jogador of arrayTimes[indice].jogadores) {
      adicionarJogadorAoTime(arrayCopia[indice], jogador)
    }
  }
  return arrayCopia
}

// Experimenta cada jogador em um dos dois times, respeitando seus tamanhos.
// Diferentemente das trocas isoladas, encontra melhorias que exigem mover
// vários jogadores juntos. As prioridades são as mesmas da avaliação existente.
function encontrarMelhorDivisaoCompleta(arrayJogadores, arrayFormacaoInicial) {
  let arrayMelhorFormacao = copiarFormacao(arrayFormacaoInicial)
  let melhorAvaliacao = avaliarEquilibrioDosTimes(arrayMelhorFormacao)
  const arrayTimesEmMontagem = criarTimesVazios()
  const limiteJogadoresPorTime = Math.ceil(arrayJogadores.length / 2)

  function experimentarDivisoes(indiceJogador) {
    // Todos os jogadores foram alocados: compara a formação completa.
    if (indiceJogador === arrayJogadores.length) {
      const avaliacaoCandidata = avaliarEquilibrioDosTimes(arrayTimesEmMontagem)
      if (formacaoCandidataEhMelhor(avaliacaoCandidata, melhorAvaliacao)) {
        melhorAvaliacao = avaliacaoCandidata
        arrayMelhorFormacao = copiarFormacao(arrayTimesEmMontagem)
      }
      return
    }

    const jogador = arrayJogadores[indiceJogador]
    for (const time of arrayTimesEmMontagem) {
      if (time.jogadores.length >= limiteJogadoresPorTime) {
        continue
      }

      // Guarda a soma para restaurá-la sem acumular resíduos de subtrações.
      const somaAntesDaSimulacao = time.somaForca
      adicionarJogadorAoTime(time, jogador)
      experimentarDivisoes(indiceJogador + 1)
      time.jogadores.pop()
      time.somaForca = somaAntesDaSimulacao
    }
  }

  if (arrayJogadores.length > 0) {
    // O primeiro jogador (goleiro, quando disponível) fica no Time 1.
    // Inverter os nomes dos times não muda o equilíbrio: evita divisões repetidas.
    adicionarJogadorAoTime(arrayTimesEmMontagem[0], arrayJogadores[0])
    experimentarDivisoes(1)
  }

  return arrayMelhorFormacao
}

function calcularForcaNeutra(arrayParticipantes) {
  let somaForcasConhecidas = 0 // Soma da força dos jogadores já avaliados.
  let quantidadeJogadoresAvaliados = 0
  for (const participante of arrayParticipantes) {
    if (Number.isFinite(participante.forca)) {
      somaForcasConhecidas += participante.forca
      quantidadeJogadoresAvaliados += 1
    }
  }

  if (quantidadeJogadoresAvaliados === 0) {
    return 5
  }

  return somaForcasConhecidas / quantidadeJogadoresAvaliados
}

function identificarPosicoesParaFormacao(participante) {
  const arrayPosicoes = []

  // A posição temporária substitui todas as posições do perfil nesta partida.
  if (participante.posicaoTemporariaId !== null && participante.posicaoTemporariaId !== undefined) {
    arrayPosicoes.push(participante.posicaoTemporariaId)
    return arrayPosicoes
  }

  // Sem remanejamento, cada posição do perfil representa uma opção de atuação.
  // A consulta ao banco já filtrou essas posições pela modalidade da partida.
  if (Array.isArray(participante.posicoesIds)) {
    for (const posicaoId of participante.posicoesIds) {
      if (!arrayPosicoes.includes(posicaoId)) {
        arrayPosicoes.push(posicaoId)
      }
    }
  }

  return arrayPosicoes
}

function prepararJogadoresParaFormacao(arrayParticipantes, forcaNeutra) {
  const arrayJogadores = []
  for (const participante of arrayParticipantes) {
    const arrayPosicoes = identificarPosicoesParaFormacao(participante)

    const jogador = {
      id: participante.id,
      nome: participante.nome,
      foto: participante.foto,
      forca: participante.forca,
      forcaEfetiva: forcaNeutra,
      posicoesIds: arrayPosicoes,
      ehGoleiro: arrayPosicoes.includes(1) // ID 1 corresponde a Goleiro.
    }

    if (Number.isFinite(participante.forca)) {
      jogador.forcaEfetiva = participante.forca
    }
    arrayJogadores.push(jogador)
  }
  return arrayJogadores
}

// O sort coloca o primeiro jogador antes do segundo quando retornamos -1.
function compararJogadoresParaFormacao(primeiroJogador, segundoJogador) {
  if (primeiroJogador.ehGoleiro && !segundoJogador.ehGoleiro) {
    return -1
  }
  if (!primeiroJogador.ehGoleiro && segundoJogador.ehGoleiro) {
    return 1
  }

  if (primeiroJogador.forcaEfetiva > segundoJogador.forcaEfetiva) {
    return -1
  }
  if (primeiroJogador.forcaEfetiva < segundoJogador.forcaEfetiva) {
    return 1
  }

  // Forças iguais: o ID garante uma ordem independente da lista recebida.
  return String(primeiroJogador.id).localeCompare(String(segundoJogador.id))
}

function contarJogadoresPorPosicao(time) {
  const contagemPorPosicao = new Map()

  for (const jogador of time.jogadores) {
    for (const posicaoId of jogador.posicoesIds) {
      if (!contagemPorPosicao.has(posicaoId)) {
        contagemPorPosicao.set(posicaoId, 0)
      }
      const quantidadeAtual = contagemPorPosicao.get(posicaoId)
      contagemPorPosicao.set(posicaoId, quantidadeAtual + 1)
    }
  }

  return contagemPorPosicao
}

function obterQuantidadeNaPosicao(contagemPorPosicao, posicaoId) {
  if (!contagemPorPosicao.has(posicaoId)) {
    return 0
  }
  return contagemPorPosicao.get(posicaoId)
}

function calcularDesequilibrioPosicoes(contagemTimeA, contagemTimeB) {
  // Reúne as posições presentes em qualquer um dos times, sem repetições.
  const arrayPosicoes = Array.from(contagemTimeA.keys())
  for (const posicaoId of contagemTimeB.keys()) {
    if (!arrayPosicoes.includes(posicaoId)) {
      arrayPosicoes.push(posicaoId)
    }
  }

  let desequilibrioPosicoes = 0
  for (const posicaoId of arrayPosicoes) {
    const quantidadeTimeA = obterQuantidadeNaPosicao(contagemTimeA, posicaoId)
    const quantidadeTimeB = obterQuantidadeNaPosicao(contagemTimeB, posicaoId)
    const diferenca = quantidadeTimeA - quantidadeTimeB

    // O quadrado evita que diferenças opostas se anulem e penaliza concentrações.
    desequilibrioPosicoes += diferenca * diferenca
  }
  return desequilibrioPosicoes
}

function calcularForcaMedia(time) {
  if (time.jogadores.length === 0) {
    return 0
  }
  return time.somaForca / time.jogadores.length
}

function avaliarEquilibrioDosTimes(arrayTimes) {
  const timeA = arrayTimes[0]
  const timeB = arrayTimes[1]
  const contagemTimeA = contarJogadoresPorPosicao(timeA)
  const contagemTimeB = contarJogadoresPorPosicao(timeB)

  const goleirosTimeA = obterQuantidadeNaPosicao(contagemTimeA, 1)
  const goleirosTimeB = obterQuantidadeNaPosicao(contagemTimeB, 1)
  const mediaTimeA = calcularForcaMedia(timeA)
  const mediaTimeB = calcularForcaMedia(timeB)

  return {
    diferencaGoleiros: Math.abs(goleirosTimeA - goleirosTimeB),
    desequilibrioPosicoes: calcularDesequilibrioPosicoes(contagemTimeA, contagemTimeB),
    diferencaForcaMedia: Math.abs(mediaTimeA - mediaTimeB)
  }
}

function formacaoCandidataEhMelhor(avaliacaoCandidata, avaliacaoAtual) {
  // Primeiro critério: menor diferença na quantidade de goleiros.
  if (avaliacaoCandidata.diferencaGoleiros !== avaliacaoAtual.diferencaGoleiros) {
    return avaliacaoCandidata.diferencaGoleiros < avaliacaoAtual.diferencaGoleiros
  }

  // Segundo critério: menor concentração de jogadores nas mesmas posições.
  if (avaliacaoCandidata.desequilibrioPosicoes !== avaliacaoAtual.desequilibrioPosicoes) {
    return avaliacaoCandidata.desequilibrioPosicoes < avaliacaoAtual.desequilibrioPosicoes
  }

  // Terceiro critério: forças médias mais próximas. Ignora resíduos decimais
  // muito pequenos produzidos pelas somas e subtrações do JavaScript.
  const toleranciaDecimal = 0.000000001
  const diferencaEntreAvaliacoes = Math.abs(
    avaliacaoCandidata.diferencaForcaMedia - avaliacaoAtual.diferencaForcaMedia
  )
  if (diferencaEntreAvaliacoes > toleranciaDecimal) {
    return avaliacaoCandidata.diferencaForcaMedia < avaliacaoAtual.diferencaForcaMedia
  }

  // Um empate não justifica mudar a formação.
  return false
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

function removerUltimoJogadorDoTime(time) {
  const jogadorRemovido = time.jogadores.pop()
  time.somaForca -= jogadorRemovido.forcaEfetiva
}

function distribuirJogadoresNosTimes(arrayJogadores, arrayTimes) {
  const limiteJogadoresPorTime = Math.ceil(arrayJogadores.length / 2)
  for (const jogador of arrayJogadores) {
    let timeEscolhido = null
    let melhorAvaliacao = null
    for (const time of arrayTimes) {
      if (time.jogadores.length >= limiteJogadoresPorTime) {
        continue
      }

      // Simula a entrada neste time e depois desfaz a simulação.
      adicionarJogadorAoTime(time, jogador)
      const avaliacaoCandidata = avaliarEquilibrioDosTimes(arrayTimes)
      removerUltimoJogadorDoTime(time)

      if (melhorAvaliacao === null) {
        timeEscolhido = time
        melhorAvaliacao = avaliacaoCandidata
      }
      else if (formacaoCandidataEhMelhor(avaliacaoCandidata, melhorAvaliacao)) {
        timeEscolhido = time
        melhorAvaliacao = avaliacaoCandidata
      }
    }

    // Efetiva a entrada somente no time que produziu a melhor avaliação.
    adicionarJogadorAoTime(timeEscolhido, jogador)
  }
}

function trocarJogadoresEntreTimes(arrayTimes, indiceJogadorTimeA, indiceJogadorTimeB) {
  const timeA = arrayTimes[0]
  const timeB = arrayTimes[1]
  const jogadorTimeA = timeA.jogadores[indiceJogadorTimeA]
  const jogadorTimeB = timeB.jogadores[indiceJogadorTimeB]

  timeA.jogadores[indiceJogadorTimeA] = jogadorTimeB
  timeB.jogadores[indiceJogadorTimeB] = jogadorTimeA
  timeA.somaForca += jogadorTimeB.forcaEfetiva - jogadorTimeA.forcaEfetiva
  timeB.somaForca += jogadorTimeA.forcaEfetiva - jogadorTimeB.forcaEfetiva
}

function encontrarMelhorTroca(arrayTimes) {
  const timeA = arrayTimes[0]
  const timeB = arrayTimes[1]
  let melhorAvaliacao = avaliarEquilibrioDosTimes(arrayTimes)
  let melhorTroca = null

  // Experimenta cada par: um jogador do Time 1 e um do Time 2.
  for (let indiceA = 0; indiceA < timeA.jogadores.length; indiceA += 1) {
    for (let indiceB = 0; indiceB < timeB.jogadores.length; indiceB += 1) {
      trocarJogadoresEntreTimes(arrayTimes, indiceA, indiceB)
      const avaliacaoCandidata = avaliarEquilibrioDosTimes(arrayTimes)

      // Trocar o mesmo par novamente restaura os jogadores aos times anteriores.
      trocarJogadoresEntreTimes(arrayTimes, indiceA, indiceB)

      if (formacaoCandidataEhMelhor(avaliacaoCandidata, melhorAvaliacao)) {
        melhorAvaliacao = avaliacaoCandidata
        melhorTroca = {
          indiceJogadorTimeA: indiceA,
          indiceJogadorTimeB: indiceB
        }
      }
    }
  }

  return melhorTroca
}

function melhorarTimesPorTrocas(arrayTimes) {
  // Cada rodada efetiva no máximo uma troca. O limite evita trabalho excessivo.
  const limiteRodadas = 100
  for (let rodada = 0; rodada < limiteRodadas; rodada += 1) {
    const melhorTroca = encontrarMelhorTroca(arrayTimes)
    if (melhorTroca === null) {
      break
    }

    trocarJogadoresEntreTimes(
      arrayTimes,
      melhorTroca.indiceJogadorTimeA,
      melhorTroca.indiceJogadorTimeB
    )
  }
}

// Gera (ou regenera) os times de uma partida e persiste o resultado.
// Apaga os times anteriores, cria os novos e atualiza o time_id das participações.
// Retorna a estrutura dos times criados com seus jogadores.
export async function gerarTimes(partidaId) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Busca os participantes com os insumos de formação
    const arrayParticipantes = await buscarParticipantesParaFormacao(partidaId, client)

    // Calcula os times em memória (sempre 2 times)
    const arrayTimesCalculados = balancearTimes(arrayParticipantes)

    // Limpa a formação anterior: zera o time_id das participações e apaga os times
    await client.query('UPDATE participacoes SET time_id = NULL WHERE partida_id = $1', [partidaId])
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
          UPDATE participacoes SET time_id = $1
          WHERE partida_id = $2 AND usuario_id = $3
        `
        await client.query(queryUpdateParticipacao, [timeId, partidaId, jogador.id])
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
    let arrayPosicoes = jogador.posicoes
    if (jogador.posicaoTemporariaNome) {
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
             CASE WHEN pt.posicao_id IS NOT NULL THEN pt.posicao_id = 1
             ELSE EXISTS (
               SELECT 1 FROM usuario_posicoes up
               WHERE up.usuario_id = u.id AND up.posicao_id = 1
             ) END AS "ehGoleiro"
      FROM participacoes pt
      JOIN usuarios u ON u.id = pt.usuario_id
      LEFT JOIN media_usuarios mu ON mu.usuario_id = u.id
      LEFT JOIN posicoes posicao_temporaria ON posicao_temporaria.id = pt.posicao_id
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
    await client.query('UPDATE participacoes SET time_id = NULL WHERE partida_id = $1', [partidaId])
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
