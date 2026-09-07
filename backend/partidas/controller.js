import { criarPartida, buscarPartidasPorPatota, buscarPartidaPorId, buscarParticipantes, confirmarPresenca, removerParticipacao, finalizarPartida, usuarioParticipouDaPartida, buscarAvaliaveis, registrarAvaliacoes, encerrarAvaliacoes, buscarResultadoAvaliacoes, gerarTimes, buscarTimes, desfazerTimes } from './model.js'
import { buscarPatotaPorId } from '../patotas/model.js'

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

    const patota = await buscarPatotaPorId(patotaId)
    if (!patota) {
      return res.status(404).json({ erro: 'Patota não encontrada' })
    }

    if (patota.presidenteId !== req.usuarioId) {
      return res.status(403).json({ erro: 'Apenas o presidente pode criar partidas' })
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
    const usuarioId = req.usuarioId

    const arrayPartidas = await buscarPartidasPorPatota(patotaId, usuarioId)

    // Separa entre próximos jogos e jogos finalizados
    const arrayProximos = []
    const arrayFinalizados = []

    // A query traz as partidas da mais recente para a mais antiga (data DESC).
    // Finalizados: mantém essa ordem (jogo mais recente no topo).
    // Próximos: monta na ordem inversa (jogo mais próximo no topo).
    for (const partida of arrayPartidas) {
      if (partida.status === 'AGENDADA' || partida.status === 'EM_ANDAMENTO') {
        arrayProximos.unshift(partida)
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
    const usuarioId = req.usuarioId

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
    const usuarioId = req.usuarioId

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

// DELETE /partidas/:id/participar — Cancela a própria presença.
// DELETE /partidas/:id/participantes/:usuarioId — Presidente remove outro jogador.
export async function removerPresenca(req, res) {
  try {
    const partidaId = req.params.id
    const solicitanteId = req.usuarioId
    let usuarioId = solicitanteId

    if (req.params.usuarioId) {
      const partida = await buscarPartidaPorId(partidaId)

      if (!partida) {
        return res.status(404).json({ erro: 'Partida não encontrada' })
      }

      if (partida.presidenteId !== solicitanteId) {
        return res.status(403).json({ erro: 'Apenas o presidente pode remover outro participante' })
      }

      usuarioId = req.params.usuarioId
    }

    await removerParticipacao(partidaId, usuarioId)

    return res.json({ mensagem: 'Participação removida com sucesso' })
  }
  catch (erro) {
    console.error('Erro ao remover participação:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// GET /partidas/:id/avaliacoes — Estado das avaliações + companheiros avaliáveis pelo usuário
export async function listarAvaliacoes(req, res) {
  try {
    const partidaId = req.params.id
    const usuarioId = req.usuarioId

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
    const avaliadorId = req.usuarioId
    const arrayAvaliacoesRecebidas = req.body.avaliacoes

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

    // Pela regra de negócio, só é possível avaliar companheiros do MESMO time.
    // Monta o conjunto de ids avaliáveis (companheiros de time do avaliador).
    const arrayAvaliaveis = await buscarAvaliaveis(partidaId, avaliadorId, partida.modalidadeId)

    if (arrayAvaliaveis.length === 0) {
      return res.status(409).json({ erro: 'As avaliações só ficam disponíveis após a formação dos times' })
    }

    const mapaAvaliaveis = {}
    for (const avaliavel of arrayAvaliaveis) {
      mapaAvaliaveis[avaliavel.id] = true
    }

    // Valida cada avaliação: nota no intervalo, sem auto-avaliação, avaliado é companheiro de time
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

      if (!mapaAvaliaveis[avaliadoId]) {
        return res.status(400).json({ erro: 'Só é possível avaliar companheiros do seu próprio time' })
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
    const usuarioId = req.usuarioId

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

// ===================== Times (Fase 4 — geração automática) =====================

// GET /partidas/:id/times — Retorna a formação de times atual (se existir)
export async function listarTimes(req, res) {
  try {
    const partidaId = req.params.id

    const partida = await buscarPartidaPorId(partidaId)

    if (!partida) {
      return res.status(404).json({ erro: 'Partida não encontrada' })
    }

    const arrayTimes = await buscarTimes(partidaId)

    const resposta = {
      times: arrayTimes,
      totalTimes: arrayTimes.length
    }

    return res.json(resposta)
  }
  catch (erro) {
    console.error('Erro ao listar times:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// POST /partidas/:id/times/gerar — Gera/regenera os times (somente presidente)
export async function gerar(req, res) {
  try {
    const partidaId = req.params.id
    const usuarioId = req.usuarioId

    const partida = await buscarPartidaPorId(partidaId)

    if (!partida) {
      return res.status(404).json({ erro: 'Partida não encontrada' })
    }

    // Apenas o presidente da patota pode gerar os times
    if (partida.presidenteId !== usuarioId) {
      return res.status(403).json({ erro: 'Apenas o presidente da patota pode gerar os times' })
    }

    // O sistema sempre forma 2 times, então são necessários ao menos 2 jogadores
    if (partida.vagasPreenchidas < 2) {
      return res.status(409).json({ erro: 'É preciso ao menos 2 jogadores confirmados para formar os times' })
    }

    const arrayTimes = await gerarTimes(partidaId)

    const resposta = {
      times: arrayTimes,
      totalTimes: arrayTimes.length
    }

    return res.status(201).json(resposta)
  }
  catch (erro) {
    console.error('Erro ao gerar times:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

// DELETE /partidas/:id/times — Desfaz a formação de times (somente presidente)
export async function desfazer(req, res) {
  try {
    const partidaId = req.params.id
    const usuarioId = req.usuarioId

    const partida = await buscarPartidaPorId(partidaId)

    if (!partida) {
      return res.status(404).json({ erro: 'Partida não encontrada' })
    }

    if (partida.presidenteId !== usuarioId) {
      return res.status(403).json({ erro: 'Apenas o presidente da patota pode desfazer os times' })
    }

    await desfazerTimes(partidaId)

    return res.json({ mensagem: 'Times desfeitos com sucesso' })
  }
  catch (erro) {
    console.error('Erro ao desfazer times:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}
