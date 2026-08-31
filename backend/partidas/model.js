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
// - ehGoleiro: se o jogador tem a posição de goleiro cadastrada
async function buscarParticipantesParaFormacao(partidaId) {
  const querySelect = `
    SELECT u.id, u.nome, u.foto,
           mu.media_geral AS "mediaGeral",
           mu.total_avaliacoes AS "totalAvaliacoes",
           EXISTS (
             SELECT 1 FROM usuario_posicoes up
             WHERE up.usuario_id = u.id AND up.posicao_id = 1
           ) AS "ehGoleiro"
    FROM participacoes pt
    JOIN usuarios u ON u.id = pt.usuario_id
    LEFT JOIN media_usuarios mu ON mu.usuario_id = u.id
    WHERE pt.partida_id = $1
    ORDER BY u.nome ASC
  `
  const resultado = await pool.query(querySelect, [partidaId])

  const arrayParticipantes = []
  for (const linha of resultado.rows) {
    const participante = {}
    participante.id = linha.id
    participante.nome = linha.nome
    participante.foto = linha.foto
    participante.ehGoleiro = linha.ehGoleiro

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

// Quantidade de times formados. O sistema sempre divide os jogadores em 2 times.
const QUANTIDADE_TIMES = 2

// Algoritmo de balanceamento. Recebe a lista de participantes e retorna um array
// com os 2 times formados, cada um com seus jogadores.
//
// Estratégia (explicável, sem "caixa preta"):
// 1. Jogadores sem avaliação recebem uma força neutra = média das forças
//    conhecidas do grupo (ou 5 se ninguém tiver avaliação), para não serem
//    penalizados nem favorecidos.
// 2. Goleiros são distribuídos primeiro, um por time, começando pelos mais
//    fortes. Isso evita um time com dois goleiros e outro sem nenhum.
// 3. Os demais são ordenados por força (desc) e alocados de forma gulosa:
//    cada jogador vai para o time com menor força acumulada no momento
//    (desempate pela menor quantidade de jogadores). Isso mantém a soma de
//    forças e o tamanho dos times equilibrados.
export function balancearTimes(arrayParticipantes) {
  // Calcula a força neutra a partir das forças conhecidas
  let somaConhecidas = 0
  let qtdConhecidas = 0
  for (const participante of arrayParticipantes) {
    if (participante.forca !== null && participante.forca !== undefined) {
      somaConhecidas = somaConhecidas + participante.forca
      qtdConhecidas = qtdConhecidas + 1
    }
  }

  let forcaNeutra = 5
  if (qtdConhecidas > 0) {
    forcaNeutra = somaConhecidas / qtdConhecidas
  }

  // Aplica a força efetiva (usa a neutra para quem não tem avaliação)
  const arrayComForca = []
  for (const participante of arrayParticipantes) {
    const copia = {}
    copia.id = participante.id
    copia.nome = participante.nome
    copia.foto = participante.foto
    copia.ehGoleiro = participante.ehGoleiro
    copia.forca = participante.forca
    if (copia.forca === null || copia.forca === undefined) {
      copia.forcaEfetiva = forcaNeutra
    }
    else {
      copia.forcaEfetiva = copia.forca
    }
    arrayComForca.push(copia)
  }

  // Inicializa os times
  const arrayTimes = []
  let indice = 0
  while (indice < QUANTIDADE_TIMES) {
    const time = {}
    time.numero = indice + 1
    time.jogadores = []
    time.somaForca = 0
    arrayTimes.push(time)
    indice = indice + 1
  }

  // Função auxiliar: encontra o time "mais fraco" no momento
  // (menor soma de força; desempate pela menor quantidade de jogadores)
  function encontrarTimeMaisFraco() {
    let timeMaisFraco = arrayTimes[0]
    for (const time of arrayTimes) {
      if (time.somaForca < timeMaisFraco.somaForca) {
        timeMaisFraco = time
      }
      else if (time.somaForca === timeMaisFraco.somaForca && time.jogadores.length < timeMaisFraco.jogadores.length) {
        timeMaisFraco = time
      }
    }
    return timeMaisFraco
  }

  // Função auxiliar: adiciona um jogador a um time
  function adicionarJogador(time, jogador) {
    time.jogadores.push(jogador)
    time.somaForca = time.somaForca + jogador.forcaEfetiva
  }

  // Separa goleiros e linha
  const arrayGoleiros = []
  const arrayLinha = []
  for (const jogador of arrayComForca) {
    if (jogador.ehGoleiro) {
      arrayGoleiros.push(jogador)
    }
    else {
      arrayLinha.push(jogador)
    }
  }

  // Ordena por força efetiva (desc)
  arrayGoleiros.sort(function (a, b) {
    return b.forcaEfetiva - a.forcaEfetiva
  })
  arrayLinha.sort(function (a, b) {
    return b.forcaEfetiva - a.forcaEfetiva
  })

  // 1) Distribui os goleiros: um por time (mais fortes primeiro). Goleiros
  //    excedentes entram na fila de linha para o balanceamento guloso.
  let indiceGoleiro = 0
  for (const goleiro of arrayGoleiros) {
    if (indiceGoleiro < arrayTimes.length) {
      adicionarJogador(arrayTimes[indiceGoleiro], goleiro)
      indiceGoleiro = indiceGoleiro + 1
    }
    else {
      arrayLinha.push(goleiro)
    }
  }

  // Reordena a linha (pode ter recebido goleiros excedentes)
  arrayLinha.sort(function (a, b) {
    return b.forcaEfetiva - a.forcaEfetiva
  })

  // 2) Distribui os jogadores de linha de forma gulosa
  for (const jogador of arrayLinha) {
    const time = encontrarTimeMaisFraco()
    adicionarJogador(time, jogador)
  }

  return arrayTimes
}

// Gera (ou regenera) os times de uma partida e persiste o resultado.
// Apaga os times anteriores, cria os novos e atualiza o time_id das participações.
// Retorna a estrutura dos times criados com seus jogadores.
export async function gerarTimes(partidaId) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Busca os participantes com os insumos de formação
    const arrayParticipantes = await buscarParticipantesParaFormacao(partidaId)

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
// Retorna também a soma e a média de força de cada time (útil para a UI mostrar
// o quão equilibrada ficou a divisão).
export async function buscarTimes(partidaId) {
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
             EXISTS (
               SELECT 1 FROM usuario_posicoes up
               WHERE up.usuario_id = u.id AND up.posicao_id = 1
             ) AS "ehGoleiro"
      FROM participacoes pt
      JOIN usuarios u ON u.id = pt.usuario_id
      LEFT JOIN media_usuarios mu ON mu.usuario_id = u.id
      WHERE pt.partida_id = $1 AND pt.time_id = $2
      ORDER BY u.nome ASC
    `
    const resultadoJogadores = await pool.query(querySelectJogadores, [partidaId, time.id])

    const arrayJogadores = []
    let somaForca = 0
    let qtdComForca = 0
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
        somaForca = somaForca + forca
        qtdComForca = qtdComForca + 1
      }

      const jogador = {}
      jogador.id = linha.id
      jogador.nome = linha.nome
      jogador.foto = linha.foto
      jogador.ehGoleiro = linha.ehGoleiro
      jogador.posicoes = arrayPosicoes
      jogador.forca = forca
      arrayJogadores.push(jogador)
    }

    let mediaForca = null
    if (qtdComForca > 0) {
      mediaForca = Number((somaForca / qtdComForca).toFixed(2))
    }

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
