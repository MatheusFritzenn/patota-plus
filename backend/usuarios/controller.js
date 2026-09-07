import { criarUsuario, buscarUsuarioPorId, emailJaExiste, atualizarUsuario } from './model.js'

// POST /usuarios — Cadastrar o perfil do usuário autenticado
export async function cadastrar(req, res) {
  try {
    const id = req.usuarioId
    const email = req.usuarioEmail
    const nome = req.body.nome
    const telefone = req.body.telefone
    const dataNascimento = req.body.dataNascimento
    const foto = req.body.foto
    const arrayModalidades = req.body.modalidades
    const arrayPosicoes = req.body.posicoes

    if (!id || !nome || !email || !Array.isArray(arrayModalidades) || !Array.isArray(arrayPosicoes)) {
      return res.status(400).json({ erro: 'Dados obrigatórios do perfil não informados' })
    }

    const existente = await buscarUsuarioPorId(req.usuarioId)
    if (existente) {
      return res.status(409).json({ erro: 'Email já cadastrado' })
    }

    const existeEmail = await emailJaExiste(email)
    if (existeEmail) {
      return res.status(409).json({ erro: 'Email já cadastrado' })
    }

    const dadosUsuario = {
      id: id,
      nome: nome,
      email: email,
      telefone: telefone,
      dataNascimento: dataNascimento,
      foto: foto,
      modalidades: arrayModalidades,
      posicoes: arrayPosicoes
    }

    const usuario = await criarUsuario(dadosUsuario)

    return res.status(201).json(usuario)
  }
  catch (erro) {
    console.error('Erro ao cadastrar usuário:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /usuarios/:id — Buscar usuário por ID
export async function buscarPorId(req, res) {
  try {
    const id = req.usuarioId

    const usuario = await buscarUsuarioPorId(id)

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' })
    }

    return res.json(usuario)
  }
  catch (erro) {
    console.error('Erro ao buscar usuário:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// PUT /usuarios/:id — Atualizar dados do usuário
export async function atualizar(req, res) {
  try {
    const id = req.usuarioId
    const dados = req.body

    const existente = await buscarUsuarioPorId(id)
    if (!existente) {
      return res.status(404).json({ erro: 'Usuário não encontrado' })
    }

    const usuario = await atualizarUsuario(id, dados)

    return res.json(usuario)
  }
  catch (erro) {
    console.error('Erro ao atualizar usuário:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}
