import pool from '../db.js'

// Cria um novo usuário com modalidades e posições
export async function criarUsuario(dados) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Usa a string de data diretamente (formato YYYY-MM-DD) para evitar problema de fuso horário
    let dataNascimentoConvertida = null
    if (dados.dataNascimento) {
      dataNascimentoConvertida = dados.dataNascimento
    }

    // Insere o usuário
    const queryInsertUsuario = `
      INSERT INTO usuarios (id, nome, email, telefone, data_nascimento, foto, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, nome, email, telefone, data_nascimento AS "dataNascimento", foto, created_at AS "createdAt", updated_at AS "updatedAt"
    `
    const arrayValoresUsuario = [
      dados.id,
      dados.nome,
      dados.email,
      dados.telefone || null,
      dataNascimentoConvertida,
      dados.foto || null
    ]

    const resultadoUsuario = await client.query(queryInsertUsuario, arrayValoresUsuario)
    const usuario = resultadoUsuario.rows[0]

    // Insere modalidades do usuário
    const arrayModalidades = []
    if (dados.modalidades && dados.modalidades.length > 0) {
      for (const modalidadeId of dados.modalidades) {
        const queryInsertModalidade = `
          INSERT INTO usuario_modalidades (usuario_id, modalidade_id)
          VALUES ($1, $2)
        `
        await client.query(queryInsertModalidade, [dados.id, modalidadeId])
      }

      // Busca as modalidades inseridas com seus nomes
      const querySelectModalidades = `
        SELECT m.id, m.nome
        FROM usuario_modalidades um
        JOIN modalidades m ON m.id = um.modalidade_id
        WHERE um.usuario_id = $1
      `
      const resultadoModalidades = await client.query(querySelectModalidades, [dados.id])
      for (const row of resultadoModalidades.rows) {
        arrayModalidades.push({ modalidade: { id: row.id, nome: row.nome } })
      }
    }

    // Insere posições do usuário
    const arrayPosicoes = []
    if (dados.posicoes && dados.posicoes.length > 0) {
      for (const posicaoId of dados.posicoes) {
        const queryInsertPosicao = `
          INSERT INTO usuario_posicoes (usuario_id, posicao_id)
          VALUES ($1, $2)
        `
        await client.query(queryInsertPosicao, [dados.id, posicaoId])
      }

      // Busca as posições inseridas com seus nomes
      const querySelectPosicoes = `
        SELECT p.id, p.nome
        FROM usuario_posicoes up
        JOIN posicoes p ON p.id = up.posicao_id
        WHERE up.usuario_id = $1
      `
      const resultadoPosicoes = await client.query(querySelectPosicoes, [dados.id])
      for (const row of resultadoPosicoes.rows) {
        arrayPosicoes.push({ posicao: { id: row.id, nome: row.nome } })
      }
    }

    await client.query('COMMIT')

    usuario.modalidades = arrayModalidades
    usuario.posicoes = arrayPosicoes

    return usuario
  }
  catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  }
  finally {
    client.release()
  }
}

// Busca usuário por ID com modalidades e posições
export async function buscarUsuarioPorId(id) {
  // Busca o usuário
  const querySelectUsuario = `
    SELECT id, nome, email, telefone, data_nascimento AS "dataNascimento", foto, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM usuarios
    WHERE id = $1
  `
  const resultadoUsuario = await pool.query(querySelectUsuario, [id])

  if (resultadoUsuario.rows.length === 0) {
    return null
  }

  const usuario = resultadoUsuario.rows[0]

  // Busca modalidades do usuário
  const querySelectModalidades = `
    SELECT m.id, m.nome
    FROM usuario_modalidades um
    JOIN modalidades m ON m.id = um.modalidade_id
    WHERE um.usuario_id = $1
  `
  const resultadoModalidades = await pool.query(querySelectModalidades, [id])
  const arrayModalidades = []
  for (const row of resultadoModalidades.rows) {
    arrayModalidades.push({ modalidade: { id: row.id, nome: row.nome } })
  }

  // Busca posições do usuário
  const querySelectPosicoes = `
    SELECT p.id, p.nome
    FROM usuario_posicoes up
    JOIN posicoes p ON p.id = up.posicao_id
    WHERE up.usuario_id = $1
  `
  const resultadoPosicoes = await pool.query(querySelectPosicoes, [id])
  const arrayPosicoes = []
  for (const row of resultadoPosicoes.rows) {
    arrayPosicoes.push({ posicao: { id: row.id, nome: row.nome } })
  }

  // Busca a média geral do usuário (cache media_usuarios). Se não houver registro
  // (usuário nunca avaliado), retorna média 0 e nenhuma avaliação.
  const querySelectMedia = `
    SELECT media_geral AS "mediaGeral", total_avaliacoes AS "totalAvaliacoes"
    FROM media_usuarios
    WHERE usuario_id = $1
  `
  const resultadoMedia = await pool.query(querySelectMedia, [id])

  let mediaGeral = 0
  let totalAvaliacoes = 0
  if (resultadoMedia.rows.length > 0) {
    mediaGeral = Number(resultadoMedia.rows[0].mediaGeral)
    totalAvaliacoes = resultadoMedia.rows[0].totalAvaliacoes
  }

  usuario.modalidades = arrayModalidades
  usuario.posicoes = arrayPosicoes
  usuario.mediaGeral = mediaGeral
  usuario.totalAvaliacoes = totalAvaliacoes

  return usuario
}

// Verifica se já existe um usuário com esse email
export async function emailJaExiste(email) {
  const queryContarEmail = 'SELECT COUNT(*)::int AS total FROM usuarios WHERE email = $1'
  const resultado = await pool.query(queryContarEmail, [email])
  return resultado.rows[0].total > 0
}

// Atualiza dados do usuário
export async function atualizarUsuario(id, dados) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Monta a query de update dinamicamente apenas com os campos enviados
    const arrayCampos = []
    const arrayValores = []
    let indice = 1

    if (dados.nome !== undefined) {
      arrayCampos.push('nome = $' + indice)
      arrayValores.push(dados.nome)
      indice = indice + 1
    }
    if (dados.email !== undefined) {
      arrayCampos.push('email = $' + indice)
      arrayValores.push(dados.email)
      indice = indice + 1
    }
    if (dados.telefone !== undefined) {
      arrayCampos.push('telefone = $' + indice)
      arrayValores.push(dados.telefone)
      indice = indice + 1
    }
    if (dados.dataNascimento !== undefined) {
      arrayCampos.push('data_nascimento = $' + indice)
      arrayValores.push(dados.dataNascimento)
      indice = indice + 1
    }
    if (dados.foto !== undefined) {
      arrayCampos.push('foto = $' + indice)
      arrayValores.push(dados.foto)
      indice = indice + 1
    }

    // Sempre atualiza updated_at
    arrayCampos.push('updated_at = NOW()')

    // Executa o update se há campos para atualizar
    if (arrayCampos.length > 0) {
      const queryUpdate = 'UPDATE usuarios SET ' + arrayCampos.join(', ') + ' WHERE id = $' + indice
      arrayValores.push(id)
      await client.query(queryUpdate, arrayValores)
    }

    // Se modalidades foram enviadas, apaga as antigas e insere as novas
    if (dados.modalidades) {
      await client.query('DELETE FROM usuario_modalidades WHERE usuario_id = $1', [id])

      for (const modalidadeId of dados.modalidades) {
        const queryInsertModalidade = `
          INSERT INTO usuario_modalidades (usuario_id, modalidade_id)
          VALUES ($1, $2)
        `
        await client.query(queryInsertModalidade, [id, modalidadeId])
      }
    }

    // Se posições foram enviadas, apaga as antigas e insere as novas
    if (dados.posicoes) {
      await client.query('DELETE FROM usuario_posicoes WHERE usuario_id = $1', [id])

      for (const posicaoId of dados.posicoes) {
        const queryInsertPosicao = `
          INSERT INTO usuario_posicoes (usuario_id, posicao_id)
          VALUES ($1, $2)
        `
        await client.query(queryInsertPosicao, [id, posicaoId])
      }
    }

    await client.query('COMMIT')

    // Busca o usuário atualizado com relações
    const usuario = await buscarUsuarioPorId(id)

    return usuario
  }
  catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  }
  finally {
    client.release()
  }
}
