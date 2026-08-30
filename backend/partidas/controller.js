import { criarPartida, buscarPartidasPorPatota, buscarPartidaPorId, buscarParticipantes, confirmarPresenca, removerParticipacao, finalizarPartida } from './model.js'

// POST /partidas — Criar nova partida
export async function cadastrar(req, res) {
  try {
    const patotaId = req.body.patotaId
    const data = req.body.data
    const horario = req.body.horario
    const local = req.body.local
    const vagasTotal = req.body.vagasTotal

    if (!patotaId || !data || !horario || !local || vagasTotal === undefined || vagasTotal === null) {
      return res.status(400).json({ erro: 'Campos obrigatórios: patotaId, data, horario, local, vagasTotal' })
    }

    const vagasNumero = Number(vagasTotal)

    if (!Number.isInteger(vagasNumero) || vagasNumero <= 0) {
      return res.status(400).json({ erro: 'A quantidade de vagas deve ser um número inteiro maior que zero' })
    }

    const dadosPartida = {
      patotaId: patotaId,
      data: data,
      horario: horario,
      local: local,
      vagasTotal: vagasNumero
    }

    const partida = await criarPartida(dadosPartida)

    return res.status(201).json(partida)
  }
  catch (erro) {
    console.error('Erro ao criar partida:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /partidas/patota/:patotaId — Lista as partidas de uma patota separadas por situação
export async function listarPorPatota(req, res) {
  try {
    const patotaId = req.params.patotaId

    const arrayPartidas = await buscarPartidasPorPatota(patotaId)

    // Separa entre próximos jogos e jogos finalizados
    const arrayProximos = []
    const arrayFinalizados = []

    for (const partida of arrayPartidas) {
      if (partida.status === 'AGENDADA' || partida.status === 'EM_ANDAMENTO') {
        arrayProximos.push(partida)
      }
      if (partida.status === 'FINALIZADA') {
        arrayFinalizados.push(partida)
      }
    }

    const resposta = {
      proximos: arrayProximos,
      finalizados: arrayFinalizados
    }

    return res.json(resposta)
  }
  catch (erro) {
    console.error('Erro ao listar partidas da patota:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /partidas/:id — Detalhes de uma partida
export async function buscarPorId(req, res) {
  try {
    const partidaId = req.params.id

    const partida = await buscarPartidaPorId(partidaId)

    if (!partida) {
      return res.status(404).json({ erro: 'Partida não encontrada' })
    }

    return res.json(partida)
  }
  catch (erro) {
    console.error('Erro ao buscar partida:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /partidas/:id/participantes — Lista de participantes confirmados e vagas restantes
export async function listarParticipantes(req, res) {
  try {
    const partidaId = req.params.id

    const partida = await buscarPartidaPorId(partidaId)

    if (!partida) {
      return res.status(404).json({ erro: 'Partida não encontrada' })
    }

    const arrayParticipantes = await buscarParticipantes(partidaId, partida.modalidadeId)

    const vagasRestantes = partida.vagasTotal - partida.vagasPreenchidas

    const resposta = {
      participantes: arrayParticipantes,
      vagasTotal: partida.vagasTotal,
      vagasPreenchidas: partida.vagasPreenchidas,
      vagasRestantes: vagasRestantes
    }

    return res.json(resposta)
  }
  catch (erro) {
    console.error('Erro ao listar participantes:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// POST /partidas/:id/participar — Confirmar presença na partida
export async function participar(req, res) {
  try {
    const partidaId = req.params.id
    const usuarioId = req.body.usuarioId

    if (!usuarioId) {
      return res.status(400).json({ erro: 'Campo obrigatório: usuarioId' })
    }

    const resultado = await confirmarPresenca(partidaId, usuarioId)

    if (resultado.naoEncontrada) {
      return res.status(404).json({ erro: 'Partida não encontrada' })
    }

    if (resultado.jaConfirmado) {
      return res.status(409).json({ erro: 'Você já está confirmado nesta partida' })
    }

    if (resultado.semVagas) {
      return res.status(409).json({ erro: 'Não há vagas disponíveis nesta partida' })
    }

    return res.status(201).json(resultado.participacao)
  }
  catch (erro) {
    console.error('Erro ao confirmar presença:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// PUT /partidas/:id/finalizar — Finaliza a partida (somente presidente da patota)
export async function finalizar(req, res) {
  try {
    const partidaId = req.params.id
    const usuarioId = req.body.usuarioId

    if (!usuarioId) {
      return res.status(400).json({ erro: 'Campo obrigatório: usuarioId' })
    }

    const partida = await buscarPartidaPorId(partidaId)

    if (!partida) {
      return res.status(404).json({ erro: 'Partida não encontrada' })
    }

    // Apenas o presidente da patota pode finalizar a partida
    if (partida.presidenteId !== usuarioId) {
      return res.status(403).json({ erro: 'Apenas o presidente da patota pode finalizar a partida' })
    }

    if (partida.status === 'FINALIZADA') {
      return res.status(409).json({ erro: 'Esta partida já está finalizada' })
    }

    const resultado = await finalizarPartida(partidaId)

    if (!resultado) {
      return res.status(409).json({ erro: 'Não foi possível finalizar a partida' })
    }

    return res.json(resultado)
  }
  catch (erro) {
    console.error('Erro ao finalizar partida:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// DELETE /partidas/:id/participar/:usuarioId — Recusar/cancelar presença ou presidente remover jogador
export async function removerPresenca(req, res) {
  try {
    const partidaId = req.params.id
    const usuarioId = req.params.usuarioId

    await removerParticipacao(partidaId, usuarioId)

    return res.json({ mensagem: 'Participação removida com sucesso' })
  }
  catch (erro) {
    console.error('Erro ao remover participação:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}
