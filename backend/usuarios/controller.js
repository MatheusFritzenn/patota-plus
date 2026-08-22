import { criarUsuario, buscarUsuarioPorId, emailJaExiste, atualizarUsuario } from './model.js'

// POST /usuarios — Cadastrar novo usuário
export async function cadastrar(req, res) {
  try {
    const id = req.body.id
    const nome = req.body.nome
    const email = req.body.email
    const telefone = req.body.telefone
    const dataNascimento = req.body.dataNascimento
    const foto = req.body.foto
    const modalidades = req.body.modalidades
    const posicoes = req.body.posicoes

    if (!id || !nome || !email) {
      return res.status(400).json({ erro: 'Campos obrigatórios: id, nome, email' })
    }

    // Verifica se já existe usuário com esse email
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
      modalidades: modalidades,
      posicoes: posicoes
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
    const id = req.params.id

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
    const id = req.params.id
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
