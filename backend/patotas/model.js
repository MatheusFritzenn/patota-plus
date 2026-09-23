import pool from '../db.js'

// Cria uma nova patota e insere o criador como presidente na tabela membro_patotas
export async function criarPatota(dados) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Insere a patota
    const queryInsertPatota = `
      INSERT INTO patotas (id, nome, descricao, modalidade_id, rua, cidade, estado, dia_habitual, hora_habitual, presidente_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, nome, descricao, modalidade_id AS "modalidadeId", rua, cidade, estado, dia_habitual AS "diaHabitual", hora_habitual AS "horaHabitual", presidente_id AS "presidenteId", created_at AS "createdAt", updated_at AS "updatedAt"
    `
    const arrayValoresPatota = [
      dados.nome,
      dados.descricao || null,
      dados.modalidadeId,
      dados.rua,
      dados.cidade,
      dados.estado,
      dados.diaHabitual || null,
      dados.horaHabitual || null,
      dados.presidenteId
    ]

    const resultadoPatota = await client.query(queryInsertPatota, arrayValoresPatota)
    const patota = resultadoPatota.rows[0]

    // Insere o criador como membro com role PRESIDENTE
    const queryInsertMembro = `
      INSERT INTO membro_patotas (id, usuario_id, patota_id, role, data_entrada, ativo)
      VALUES (gen_random_uuid(), $1, $2, 'PRESIDENTE', NOW(), true)
    `
    await client.query(queryInsertMembro, [dados.presidenteId, patota.id])

    await client.query('COMMIT')

    return patota
  }
  catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  }
  finally {
    client.release()
  }
}

// Busca todas as patotas das quais o usuário é membro ativo
export async function buscarPatotasDoUsuario(usuarioId) {
  const querySelectPatotas = `
    SELECT p.id, p.nome, p.descricao, p.modalidade_id AS "modalidadeId", p.rua, p.cidade, p.estado,
           p.presidente_id AS "presidenteId", p.created_at AS "createdAt", p.updated_at AS "updatedAt",
           m.nome AS "modalidadeNome",
           mp.role
    FROM membro_patotas mp
    JOIN patotas p ON p.id = mp.patota_id
    JOIN modalidades m ON m.id = p.modalidade_id
    WHERE mp.usuario_id = $1 AND mp.ativo = true
    ORDER BY p.nome
  `

  const resultado = await pool.query(querySelectPatotas, [usuarioId])

  return resultado.rows
}

// Busca patotas das quais o usuário NÃO participa, filtrando a modalidade quando informada
export async function buscarPatotasDisponiveis(usuarioId, modalidadeId) {
  const querySelectPatotas = `
    SELECT p.id, p.nome, p.modalidade_id AS "modalidadeId", p.rua, p.cidade, p.estado,
           p.presidente_id AS "presidenteId", p.created_at AS "createdAt", p.updated_at AS "updatedAt",
           m.nome AS "modalidadeNome"
    FROM patotas p
    JOIN modalidades m ON m.id = p.modalidade_id
    WHERE p.id NOT IN (
      SELECT mp.patota_id FROM membro_patotas mp WHERE mp.usuario_id = $1 AND mp.ativo = true
    )
      AND ($2::int IS NULL OR p.modalidade_id = $2)
    ORDER BY p.nome
  `

  const arrayValoresBusca = [usuarioId, modalidadeId]
  const resultado = await pool.query(querySelectPatotas, arrayValoresBusca)

  return resultado.rows
}

// Busca uma patota específica por ID com nome da modalidade e nome do presidente
export async function buscarPatotaPorId(patotaId) {
  const querySelectPatota = `
    SELECT p.id, p.nome, p.descricao, p.modalidade_id AS "modalidadeId", p.rua, p.cidade, p.estado,
           p.dia_habitual AS "diaHabitual", p.hora_habitual AS "horaHabitual",
           p.presidente_id AS "presidenteId", p.created_at AS "createdAt", p.updated_at AS "updatedAt",
           m.nome AS "modalidadeNome",
           u.nome AS "presidenteNome"
    FROM patotas p
    JOIN modalidades m ON m.id = p.modalidade_id
    JOIN usuarios u ON u.id = p.presidente_id
    WHERE p.id = $1
  `

  const resultado = await pool.query(querySelectPatota, [patotaId])

  if (resultado.rows.length === 0) {
    return null
  }

  const patota = resultado.rows[0]

  // Conta quantidade de membros ativos
  const queryContarMembros = `
    SELECT COUNT(*)::int AS total FROM membro_patotas WHERE patota_id = $1 AND ativo = true
  `
  const resultadoMembros = await pool.query(queryContarMembros, [patotaId])
  patota.quantidadeMembros = resultadoMembros.rows[0].total

  return patota
}

// Busca todos os membros ativos de uma patota
export async function buscarMembrosPatota(patotaId, modalidadeId) {
  const querySelectMembros = `
    SELECT u.id, u.nome, u.foto, mp.role, mp.data_entrada AS "dataEntrada"
    FROM membro_patotas mp
    JOIN usuarios u ON u.id = mp.usuario_id
    WHERE mp.patota_id = $1 AND mp.ativo = true
    ORDER BY mp.role ASC, u.nome ASC
  `

  const resultado = await pool.query(querySelectMembros, [patotaId])

  // Mapa de posições por modalidade
  const posicoesPorModalidade = {
    1: [1, 2, 3, 4, 5, 6],
    2: [1, 7, 8, 9],
    3: [1, 7, 8, 9]
  }

  const arrayIdsPosicoes = posicoesPorModalidade[modalidadeId] || []

  // Busca posições de cada membro (filtradas pela modalidade da patota)
  const arrayMembros = []
  for (const membro of resultado.rows) {
    const querySelectPosicoes = `
      SELECT p.id, p.nome
      FROM usuario_posicoes up
      JOIN posicoes p ON p.id = up.posicao_id
      WHERE up.usuario_id = $1 AND up.posicao_id = ANY($2)
    `
    const resultadoPosicoes = await pool.query(querySelectPosicoes, [membro.id, arrayIdsPosicoes])
    const arrayPosicoes = []
    for (const row of resultadoPosicoes.rows) {
      arrayPosicoes.push(row.nome)
    }

    const membroCompleto = {
      id: membro.id,
      nome: membro.nome,
      foto: membro.foto,
      role: membro.role,
      dataEntrada: membro.dataEntrada,
      posicoes: arrayPosicoes
    }
    arrayMembros.push(membroCompleto)
  }

  return arrayMembros
}

// Verifica se um usuário é membro de uma patota
export async function membroExiste(patotaId, usuarioId) {
  const querySelect = `
    SELECT 1 FROM membro_patotas
    WHERE patota_id = $1 AND usuario_id = $2 AND ativo = true
  `
  const resultado = await pool.query(querySelect, [patotaId, usuarioId])

  return resultado.rows.length > 0
}

// Exclui membro da patota
export async function removerMembro(patotaId, usuarioId) {
  const queryDelete = 'DELETE FROM membro_patotas WHERE patota_id = $1 AND usuario_id = $2'
  await pool.query(queryDelete, [patotaId, usuarioId])
}

// Atualiza dados de uma patota
export async function atualizarPatota(patotaId, dados) {
  const arrayCampos = []
  const arrayValores = []
  let indice = 1

  // Monta o array de campos/valores a serem atualizados somente com campos enviados pelo front
  if (dados.nome !== undefined) {
    arrayCampos.push('nome = $' + indice)
    arrayValores.push(dados.nome)
    indice = indice + 1
  }
  if (dados.descricao !== undefined) {
    arrayCampos.push('descricao = $' + indice)
    arrayValores.push(dados.descricao)
    indice = indice + 1
  }
  if (dados.modalidadeId !== undefined) {
    arrayCampos.push('modalidade_id = $' + indice)
    arrayValores.push(dados.modalidadeId)
    indice = indice + 1
  }
  if (dados.rua !== undefined) {
    arrayCampos.push('rua = $' + indice)
    arrayValores.push(dados.rua)
    indice = indice + 1
  }
  if (dados.cidade !== undefined) {
    arrayCampos.push('cidade = $' + indice)
    arrayValores.push(dados.cidade)
    indice = indice + 1
  }
  if (dados.estado !== undefined) {
    arrayCampos.push('estado = $' + indice)
    arrayValores.push(dados.estado)
    indice = indice + 1
  }
  if (dados.diaHabitual !== undefined) {
    arrayCampos.push('dia_habitual = $' + indice)
    arrayValores.push(dados.diaHabitual)
    indice = indice + 1
  }
  if (dados.horaHabitual !== undefined) {
    arrayCampos.push('hora_habitual = $' + indice)
    arrayValores.push(dados.horaHabitual)
    indice = indice + 1
  }

  // Sempre atualiza updated_at
  arrayCampos.push('updated_at = NOW()')

  const queryUpdate = 'UPDATE patotas SET ' + arrayCampos.join(', ') + ' WHERE id = $' + indice
  arrayValores.push(patotaId)

  await pool.query(queryUpdate, arrayValores)

  // Retorna a patota atualizada
  const patota = await buscarPatotaPorId(patotaId)
  return patota
}

// Exclui uma patota e seus registros relacionados
export async function excluirPatota(patotaId) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Remove membros da patota
    await client.query('DELETE FROM membro_patotas WHERE patota_id = $1', [patotaId])

    // Remove a patota
    await client.query('DELETE FROM patotas WHERE id = $1', [patotaId])

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

// Cria uma solicitação de entrada na patota
export async function criarSolicitacaoEntrada(usuarioId, patotaId) {
  // Verifica se o usuário pratica a modalidade da patota
  const queryVerificarModalidade = `
    SELECT p.modalidade_id, m.nome AS modalidade_nome
    FROM patotas p
    JOIN modalidades m ON m.id = p.modalidade_id
    WHERE p.id = $1
  `
  const resultadoModalidade = await pool.query(queryVerificarModalidade, [patotaId])

  if (resultadoModalidade.rows.length > 0) {
    const modalidadeIdPatota = resultadoModalidade.rows[0].modalidade_id
    const modalidadeNome = resultadoModalidade.rows[0].modalidade_nome

    const queryVerificarUsuarioModalidade = `
      SELECT 1 FROM usuario_modalidades
      WHERE usuario_id = $1 AND modalidade_id = $2
    `
    const resultadoUsuarioModalidade = await pool.query(queryVerificarUsuarioModalidade, [usuarioId, modalidadeIdPatota])

    if (resultadoUsuarioModalidade.rows.length === 0) {
      return { modalidadeIncompativel: true, modalidadeNome: modalidadeNome }
    }
  }

  // Verifica se já existe uma solicitação pendente
  const queryVerificar = `
    SELECT id FROM solicitacoes_entrada
    WHERE usuario_id = $1 AND patota_id = $2 AND status = 'PENDENTE'
  `
  const resultadoVerificar = await pool.query(queryVerificar, [usuarioId, patotaId])

  if (resultadoVerificar.rows.length > 0) {
    return { jaExiste: true }
  }

  const queryInsert = `
    INSERT INTO solicitacoes_entrada (usuario_id, patota_id, status, created_at, updated_at)
    VALUES ($1, $2, 'PENDENTE', NOW(), NOW())
    RETURNING id, usuario_id AS "usuarioId", patota_id AS "patotaId", status, created_at AS "createdAt"
  `
  const resultado = await pool.query(queryInsert, [usuarioId, patotaId])

  return resultado.rows[0]
}

// Busca solicitações pendentes de uma patota
export async function buscarSolicitacoesPendentes(patotaId) {
  const querySelect = `
    SELECT s.id, s.usuario_id AS "usuarioId", s.status, s.created_at AS "createdAt",
           u.nome, u.foto
    FROM solicitacoes_entrada s
    JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.patota_id = $1 AND s.status = 'PENDENTE'
    ORDER BY s.created_at ASC
  `
  const resultado = await pool.query(querySelect, [patotaId])

  return resultado.rows
}

// Responde uma solicitação (aceitar ou recusar)
export async function responderSolicitacao(solicitacaoId, patotaId, decisao) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Atualiza o status da solicitação
    const queryUpdate = `
      UPDATE solicitacoes_entrada SET status = $1, updated_at = NOW()
      WHERE id = $2 AND patota_id = $3
      RETURNING id, usuario_id AS "usuarioId", status
    `
    const resultado = await client.query(queryUpdate, [decisao, solicitacaoId, patotaId])

    if (resultado.rows.length === 0) {
      await client.query('ROLLBACK')
      return null
    }

    const solicitacao = resultado.rows[0]

    // Se aceitou, insere o usuário como membro da patota
    if (decisao === 'ACEITO') {
      const queryInsertMembro = `
        INSERT INTO membro_patotas (id, usuario_id, patota_id, role, data_entrada, ativo)
        VALUES (gen_random_uuid(), $1, $2, 'JOGADOR', NOW(), true)
      `
      await client.query(queryInsertMembro, [solicitacao.usuarioId, patotaId])
    }

    await client.query('COMMIT')

    return solicitacao
  }
  catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  }
  finally {
    client.release()
  }
}

// Verifica se o usuário é membro ativo de uma patota
export async function verificarMembro(usuarioId, patotaId) {
  const querySelect = `
    SELECT id, role FROM membro_patotas
    WHERE usuario_id = $1 AND patota_id = $2 AND ativo = true
  `
  const resultado = await pool.query(querySelect, [usuarioId, patotaId])

  if (resultado.rows.length === 0) {
    return null
  }

  return resultado.rows[0]
}

// Verifica se o usuário já tem solicitação pendente
export async function verificarSolicitacaoPendente(usuarioId, patotaId) {
  const querySelect = `
    SELECT id FROM solicitacoes_entrada
    WHERE usuario_id = $1 AND patota_id = $2 AND status = 'PENDENTE'
  `
  const resultado = await pool.query(querySelect, [usuarioId, patotaId])

  return resultado.rows.length > 0
}

// Monta o relatório de presença de uma patota:
// - partidas realizadas (FINALIZADA)
// - presença de cada membro por partida
// - frequência de cada membro (quantidade e percentual)
export async function buscarRelatorioPresenca(patotaId) {
  // Busca as partidas realizadas (finalizadas) da patota, mais recentes primeiro
  const querySelectPartidas = `
    SELECT pa.id, pa.data, pa.horario, pa.local
    FROM partidas pa
    WHERE pa.patota_id = $1 AND pa.status = 'FINALIZADA'
    ORDER BY pa.data DESC, pa.horario DESC
  `
  const resultadoPartidas = await pool.query(querySelectPartidas, [patotaId])
  const arrayPartidas = resultadoPartidas.rows

  // Busca os membros ativos da patota
  const querySelectMembros = `
    SELECT u.id, u.nome, u.foto
    FROM membro_patotas mp
    JOIN usuarios u ON u.id = mp.usuario_id
    WHERE mp.patota_id = $1 AND mp.ativo = true
    ORDER BY u.nome ASC
  `
  const resultadoMembros = await pool.query(querySelectMembros, [patotaId])
  const arrayMembros = resultadoMembros.rows

  const totalPartidas = arrayPartidas.length

  // Monta o conjunto de ids das partidas realizadas para filtrar as participações
  const arrayIdsPartidas = []
  for (const partida of arrayPartidas) {
    arrayIdsPartidas.push(partida.id)
  }

  // Busca todas as participações confirmadas nessas partidas
  let arrayParticipacoes = []
  if (arrayIdsPartidas.length > 0) {
    const querySelectParticipacoes = `
      SELECT partida_id AS "partidaId", usuario_id AS "usuarioId"
      FROM participacoes
      WHERE partida_id = ANY($1)
    `
    const resultadoParticipacoes = await pool.query(querySelectParticipacoes, [arrayIdsPartidas])
    arrayParticipacoes = resultadoParticipacoes.rows
  }

  // Índice de presença: mapa usuarioId -> conjunto de partidaId em que esteve presente
  const mapaPresenca = {}
  for (const participacao of arrayParticipacoes) {
    if (!mapaPresenca[participacao.usuarioId]) {
      mapaPresenca[participacao.usuarioId] = {}
    }
    mapaPresenca[participacao.usuarioId][participacao.partidaId] = true
  }

  // Monta a frequência por membro
  const arrayFrequencia = []
  for (const membro of arrayMembros) {
    let quantidadePresencas = 0
    const presencasDoMembro = mapaPresenca[membro.id]

    if (presencasDoMembro) {
      for (const partida of arrayPartidas) {
        if (presencasDoMembro[partida.id]) {
          quantidadePresencas = quantidadePresencas + 1
        }
      }
    }

    let percentual = 0
    if (totalPartidas > 0) {
      percentual = Math.round((quantidadePresencas / totalPartidas) * 100)
    }

    const frequenciaMembro = {}
    frequenciaMembro.id = membro.id
    frequenciaMembro.nome = membro.nome
    frequenciaMembro.foto = membro.foto
    frequenciaMembro.presencas = quantidadePresencas
    frequenciaMembro.totalPartidas = totalPartidas
    frequenciaMembro.percentual = percentual
    arrayFrequencia.push(frequenciaMembro)
  }

  // Monta os presentes por partida
  const arrayPartidasComPresenca = []
  for (const partida of arrayPartidas) {
    const arrayPresentes = []
    for (const membro of arrayMembros) {
      const presencasDoMembro = mapaPresenca[membro.id]
      if (presencasDoMembro && presencasDoMembro[partida.id]) {
        const presente = {}
        presente.id = membro.id
        presente.nome = membro.nome
        presente.foto = membro.foto
        arrayPresentes.push(presente)
      }
    }

    const partidaComPresenca = {}
    partidaComPresenca.id = partida.id
    partidaComPresenca.data = partida.data
    partidaComPresenca.horario = partida.horario
    partidaComPresenca.local = partida.local
    partidaComPresenca.totalPresentes = arrayPresentes.length
    partidaComPresenca.presentes = arrayPresentes
    arrayPartidasComPresenca.push(partidaComPresenca)
  }

  const relatorio = {}
  relatorio.totalPartidas = totalPartidas
  relatorio.frequencia = arrayFrequencia
  relatorio.partidas = arrayPartidasComPresenca

  return relatorio
}
