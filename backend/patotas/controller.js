import { criarPatota, buscarPatotasDoUsuario, buscarPatotasDisponiveis, buscarPatotaPorId, buscarMembrosPatota, atualizarPatota, excluirPatota, criarSolicitacaoEntrada, buscarSolicitacoesPendentes, responderSolicitacao, verificarMembro, verificarSolicitacaoPendente, removerMembro, membroExiste, buscarRelatorioPresenca } from './model.js'

// POST /patotas — Criar nova patota
export async function cadastrar(req, res) {
  try {
    const nome = req.body.nome
    const descricao = req.body.descricao
    const modalidadeId = req.body.modalidadeId
    const rua = req.body.rua
    const cidade = req.body.cidade
    const estado = req.body.estado
    const diaHabitual = req.body.diaHabitual
    const horaHabitual = req.body.horaHabitual
    const presidenteId = req.usuarioId

    if (!nome || !modalidadeId || !rua || !cidade || !estado || !presidenteId) {
      return res.status(400).json({ erro: 'Campos obrigatórios: nome, modalidadeId, rua, cidade, estado, presidenteId' })
    }

    const dadosPatota = {
      nome: nome,
      descricao: descricao,
      modalidadeId: modalidadeId,
      rua: rua,
      cidade: cidade,
      estado: estado,
      diaHabitual: diaHabitual,
      horaHabitual: horaHabitual,
      presidenteId: presidenteId
    }

    const patota = await criarPatota(dadosPatota)

    return res.status(201).json(patota)
  }
  catch (erro) {
    console.error('Erro ao criar patota:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /patotas/minhas — Listar patotas do usuário autenticado
export async function listarPorUsuario(req, res) {
  try {
    const usuarioId = req.usuarioId

    const arrayPatotas = await buscarPatotasDoUsuario(usuarioId)

    return res.json(arrayPatotas)
  }
  catch (erro) {
    console.error('Erro ao listar patotas do usuário:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /patotas/buscar — Listar patotas disponíveis, com filtro opcional por modalidade
export async function listarDisponiveis(req, res) {
  try {
    const usuarioId = req.usuarioId
    const modalidadeRecebida = req.query.modalidadeId
    let modalidadeId = null

    if (modalidadeRecebida !== undefined) {
      if (typeof modalidadeRecebida !== 'string' || !/^[1-9]\d*$/.test(modalidadeRecebida)) {
        return res.status(400).json({ erro: 'A modalidade informada é inválida' })
      }

      modalidadeId = Number(modalidadeRecebida)
      if (!Number.isSafeInteger(modalidadeId) || modalidadeId > 2147483647) {
        return res.status(400).json({ erro: 'A modalidade informada é inválida' })
      }
    }

    const arrayPatotas = await buscarPatotasDisponiveis(usuarioId, modalidadeId)

    return res.json(arrayPatotas)
  }
  catch (erro) {
    console.error('Erro ao buscar patotas disponíveis:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /patotas/:id — Buscar patota por ID
export async function buscarPorId(req, res) {
  try {
    const patotaId = req.params.id

    const patota = await buscarPatotaPorId(patotaId)

    if (!patota) {
      return res.status(404).json({ erro: 'Patota não encontrada' })
    }

    return res.json(patota)
  }
  catch (erro) {
    console.error('Erro ao buscar patota:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /patotas/:id/membros — Listar membros da patota
export async function listarMembros(req, res) {
  try {
    const patotaId = req.params.id

    // Busca a patota para obter a modalidade
    const patota = await buscarPatotaPorId(patotaId)

    if (!patota) {
      return res.status(404).json({ erro: 'Patota não encontrada' })
    }

    const arrayMembros = await buscarMembrosPatota(patotaId, patota.modalidadeId)

    return res.json(arrayMembros)
  }
  catch (erro) {
    console.error('Erro ao listar membros:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// DELETE /patotas/:id/membros/:usuarioID - Exlcuir membro da patota
export async function excluirMembro(req, res) {
  try {
    const patotaId = req.params.id
    const usuarioId = req.params.usuarioId
    const solicitanteId = req.usuarioId

    const patota = await buscarPatotaPorId(patotaId)
    if (!patota) {
      return res.status(404).json({ erro: 'Patota não encontrada' })
    }

    if (patota.presidenteId !== solicitanteId) {
      return res.status(403).json({ erro: 'Apenas o presidente pode remover membros' })
    }

    if (usuarioId === solicitanteId) {
      return res.status(409).json({ erro: 'O presidente não pode remover a si mesmo da patota' })
    }

    // Valida se o membro existe na patota antes de excluir
    const existe = await membroExiste(patotaId, usuarioId)
    if (!existe) {
      return res.status(404).json({ erro: 'Membro não encontrado nesta patota' })
    }

    await removerMembro(patotaId, usuarioId)

    return res.json({ mensagem: 'Membro excluído da patota com sucesso' })
  }
  catch (erro) {
    console.error('Erro ao excluir membro:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// PUT /patotas/:id — Atualizar dados da patota
export async function atualizar(req, res) {
  try {
    const patotaId = req.params.id

    const existente = await buscarPatotaPorId(patotaId)
    if (!existente) {
      return res.status(404).json({ erro: 'Patota não encontrada' })
    }

    if (existente.presidenteId !== req.usuarioId) {
      return res.status(403).json({ erro: 'Apenas o presidente pode editar a patota' })
    }

    const dados = {
      nome: req.body.nome,
      descricao: req.body.descricao,
      modalidadeId: req.body.modalidadeId,
      rua: req.body.rua,
      cidade: req.body.cidade,
      estado: req.body.estado,
      diaHabitual: req.body.diaHabitual,
      horaHabitual: req.body.horaHabitual
    }

    const patota = await atualizarPatota(patotaId, dados)

    return res.json(patota)
  }
  catch (erro) {
    console.error('Erro ao atualizar patota:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// DELETE /patotas/:id — Excluir patota
export async function excluir(req, res) {
  try {
    const patotaId = req.params.id

    const existente = await buscarPatotaPorId(patotaId)
    if (!existente) {
      return res.status(404).json({ erro: 'Patota não encontrada' })
    }

    if (existente.presidenteId !== req.usuarioId) {
      return res.status(403).json({ erro: 'Apenas o presidente pode excluir a patota' })
    }

    await excluirPatota(patotaId)

    return res.json({ mensagem: 'Patota excluída com sucesso' })
  }
  catch (erro) {
    console.error('Erro ao excluir patota:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// POST /patotas/:id/solicitar — Solicitar entrada na patota
export async function solicitar(req, res) {
  try {
    const patotaId = req.params.id
    const usuarioId = req.usuarioId

    const resultado = await criarSolicitacaoEntrada(usuarioId, patotaId)

    if (resultado.modalidadeIncompativel) {
      return res.status(403).json({ erro: 'Você não pratica a modalidade desta patota (' + resultado.modalidadeNome + '). Atualize seu perfil para solicitar entrada.' })
    }

    if (resultado.jaExiste) {
      return res.status(409).json({ erro: 'Você já possui uma solicitação pendente para esta patota' })
    }

    return res.status(201).json(resultado)
  }
  catch (erro) {
    console.error('Erro ao solicitar entrada:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /patotas/:id/solicitacoes — Listar solicitações pendentes
export async function listarSolicitacoes(req, res) {
  try {
    const patotaId = req.params.id

    const patota = await buscarPatotaPorId(patotaId)
    if (!patota) {
      return res.status(404).json({ erro: 'Patota não encontrada' })
    }

    if (patota.presidenteId !== req.usuarioId) {
      return res.status(403).json({ erro: 'Apenas o presidente pode listar as solicitações' })
    }

    const arraySolicitacoes = await buscarSolicitacoesPendentes(patotaId)

    return res.json(arraySolicitacoes)
  }
  catch (erro) {
    console.error('Erro ao listar solicitações:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// PUT /patotas/:id/solicitacoes/:solicitacaoId — Aceitar ou recusar solicitação
export async function responderSolicitacaoEntrada(req, res) {
  try {
    const patotaId = req.params.id
    const solicitacaoId = req.params.solicitacaoId
    const decisao = req.body.decisao

    const patota = await buscarPatotaPorId(patotaId)
    if (!patota) {
      return res.status(404).json({ erro: 'Patota não encontrada' })
    }

    if (patota.presidenteId !== req.usuarioId) {
      return res.status(403).json({ erro: 'Apenas o presidente pode responder às solicitações' })
    }

    if (!decisao || (decisao !== 'ACEITO' && decisao !== 'RECUSADO')) {
      return res.status(400).json({ erro: 'Campo obrigatório: decisao (ACEITO ou RECUSADO)' })
    }

    const resultado = await responderSolicitacao(solicitacaoId, patotaId, decisao)

    if (!resultado) {
      return res.status(404).json({ erro: 'Solicitação não encontrada' })
    }

    return res.json(resultado)
  }
  catch (erro) {
    console.error('Erro ao responder solicitação:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /patotas/:id/relatorios/presenca — Relatório de presença (somente presidente)
export async function relatorioPresenca(req, res) {
  try {
    const patotaId = req.params.id
    const usuarioId = req.usuarioId

    const patota = await buscarPatotaPorId(patotaId)
    if (!patota) {
      return res.status(404).json({ erro: 'Patota não encontrada' })
    }

    // Apenas o presidente pode acessar relatórios
    const membro = await verificarMembro(usuarioId, patotaId)
    if (!membro || membro.role !== 'PRESIDENTE') {
      return res.status(403).json({ erro: 'Apenas o presidente pode acessar os relatórios' })
    }

    const relatorio = await buscarRelatorioPresenca(patotaId)

    return res.json(relatorio)
  }
  catch (erro) {
    console.error('Erro ao gerar relatório de presença:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /patotas/:id/verificar-membro — Verifica se o usuário autenticado é membro
export async function verificarMembresia(req, res) {
  try {
    const patotaId = req.params.id
    const usuarioId = req.usuarioId

    const membro = await verificarMembro(usuarioId, patotaId)
    const solicitacaoPendente = await verificarSolicitacaoPendente(usuarioId, patotaId)

    return res.json({
      ehMembro: !!membro,
      role: membro ? membro.role : null,
      solicitacaoPendente: solicitacaoPendente
    })
  }
  catch (erro) {
    console.error('Erro ao verificar membresia:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}
