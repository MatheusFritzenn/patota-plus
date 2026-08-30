import { criarPartida, buscarPartidasPorPatota, buscarPartidaPorId, buscarParticipantes, confirmarPresenca, removerParticipacao, finalizarPartida, usuarioParticipouDaPartida, buscarAvaliaveis, registrarAvaliacoes, encerrarAvaliacoes, buscarResultadoAvaliacoes } from './model.js'

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

// GET /partidas/:id/avaliacoes?usuarioId= — Estado das avaliações + companheiros avaliáveis pelo usuário
export async function listarAvaliacoes(req, res) {
  try {
    const partidaId = req.params.id
    const usuarioId = req.query.usuarioId

    if (!usuarioId) {
      return res.status(400).json({ erro: 'Campo obrigatório: usuarioId' })
    }

    const partida = await buscarPartidaPorId(partidaId)

    if (!partida) {
      return res.status(404).json({ erro: 'Partida não encontrada' })
    }

    // Avaliações só existem para partidas finalizadas
    const avaliacoesLiberadas = partida.status === 'FINALIZADA'
    const ehPresidente = partida.presidenteId === usuarioId
    const participou = await usuarioParticipouDaPartida(partidaId, usuarioId)

    let arrayAvaliaveis = []

    // Só monta a lista de avaliáveis se as avaliações estão liberadas, não encerradas,
    // e o usuário participou da partida (só quem jogou pode avaliar).
    if (avaliacoesLiberadas && !partida.avaliacoesEncerradas && participou) {
      arrayAvaliaveis = await buscarAvaliaveis(partidaId, usuarioId, partida.modalidadeId)
    }

    const resposta = {
      avaliacoesLiberadas: avaliacoesLiberadas,
      avaliacoesEncerradas: partida.avaliacoesEncerradas,
      ehPresidente: ehPresidente,
      participou: participou,
      avaliaveis: arrayAvaliaveis
    }

    return res.json(resposta)
  }
  catch (erro) {
    console.error('Erro ao listar avaliações:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// POST /partidas/:id/avaliacoes — Registra as avaliações feitas pelo usuário
export async function salvarAvaliacoes(req, res) {
  try {
    const partidaId = req.params.id
    const avaliadorId = req.body.avaliadorId
    const arrayAvaliacoesRecebidas = req.body.avaliacoes

    if (!avaliadorId) {
      return res.status(400).json({ erro: 'Campo obrigatório: avaliadorId' })
    }

    if (!Array.isArray(arrayAvaliacoesRecebidas) || arrayAvaliacoesRecebidas.length === 0) {
      return res.status(400).json({ erro: 'Campo obrigatório: avaliacoes (lista não vazia)' })
    }

    const partida = await buscarPartidaPorId(partidaId)

    if (!partida) {
      return res.status(404).json({ erro: 'Partida não encontrada' })
    }

    if (partida.status !== 'FINALIZADA') {
      return res.status(409).json({ erro: 'As avaliações só ficam disponíveis após a partida ser finalizada' })
    }

    if (partida.avaliacoesEncerradas) {
      return res.status(409).json({ erro: 'As avaliações desta partida já foram encerradas' })
    }

    // O avaliador precisa ter participado da partida
    const avaliadorParticipou = await usuarioParticipouDaPartida(partidaId, avaliadorId)
    if (!avaliadorParticipou) {
      return res.status(403).json({ erro: 'Apenas quem participou da partida pode avaliar' })
    }

    // Valida cada avaliação: nota no intervalo, sem auto-avaliação, avaliado participou
    const arrayAvaliacoesValidadas = []
    for (const item of arrayAvaliacoesRecebidas) {
      const avaliadoId = item.avaliadoId
      const notaNumero = Number(item.nota)

      if (!avaliadoId) {
        return res.status(400).json({ erro: 'Cada avaliação precisa de um avaliadoId' })
      }

      if (avaliadoId === avaliadorId) {
        return res.status(400).json({ erro: 'Não é permitido avaliar a si mesmo' })
      }

      if (Number.isNaN(notaNumero) || notaNumero < 0 || notaNumero > 10) {
        return res.status(400).json({ erro: 'A nota deve ser um número entre 0 e 10' })
      }

      const avaliadoParticipou = await usuarioParticipouDaPartida(partidaId, avaliadoId)
      if (!avaliadoParticipou) {
        return res.status(400).json({ erro: 'Só é possível avaliar jogadores que participaram da partida' })
      }

      const avaliacaoValidada = {}
      avaliacaoValidada.avaliadoId = avaliadoId
      avaliacaoValidada.nota = notaNumero
      arrayAvaliacoesValidadas.push(avaliacaoValidada)
    }

    await registrarAvaliacoes(partidaId, avaliadorId, arrayAvaliacoesValidadas)

    return res.status(201).json({ mensagem: 'Avaliações registradas com sucesso' })
  }
  catch (erro) {
    console.error('Erro ao salvar avaliações:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// PUT /partidas/:id/avaliacoes/encerrar — Encerra as avaliações (somente presidente) e calcula médias
export async function encerrar(req, res) {
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

    if (partida.presidenteId !== usuarioId) {
      return res.status(403).json({ erro: 'Apenas o presidente da patota pode encerrar as avaliações' })
    }

    if (partida.status !== 'FINALIZADA') {
      return res.status(409).json({ erro: 'A partida precisa estar finalizada para encerrar as avaliações' })
    }

    if (partida.avaliacoesEncerradas) {
      return res.status(409).json({ erro: 'As avaliações desta partida já foram encerradas' })
    }

    const resultado = await encerrarAvaliacoes(partidaId)

    if (!resultado) {
      return res.status(409).json({ erro: 'Não foi possível encerrar as avaliações' })
    }

    return res.json(resultado)
  }
  catch (erro) {
    console.error('Erro ao encerrar avaliações:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /partidas/:id/avaliacoes/resultado — Médias por jogador na partida (após encerramento)
export async function resultadoAvaliacoes(req, res) {
  try {
    const partidaId = req.params.id

    const partida = await buscarPartidaPorId(partidaId)

    if (!partida) {
      return res.status(404).json({ erro: 'Partida não encontrada' })
    }

    const arrayResultado = await buscarResultadoAvaliacoes(partidaId)

    const resposta = {
      avaliacoesEncerradas: partida.avaliacoesEncerradas,
      resultado: arrayResultado
    }

    return res.json(resposta)
  }
  catch (erro) {
    console.error('Erro ao buscar resultado das avaliações:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}
