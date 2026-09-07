import { buscarRelatorioMensalidades, atualizarValorMensalidade, atualizarStatusMensalidade } from './model.js'
import { buscarPatotaPorId, verificarMembro } from '../patotas/model.js'

function mesValido(mesReferencia) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mesReferencia)
}

async function validarPresidente(patotaId, usuarioId, res) {
  const patota = await buscarPatotaPorId(patotaId)
  if (!patota) {
    res.status(404).json({ erro: 'Patota nao encontrada' })
    return false
  }

  const membro = await verificarMembro(usuarioId, patotaId)
  if (!membro || membro.role !== 'PRESIDENTE') {
    res.status(403).json({ erro: 'Apenas o presidente pode acessar o relatorio de mensalidades' })
    return false
  }

  return true
}

export async function consultarRelatorio(req, res) {
  try {
    const patotaId = req.params.patotaId
    const usuarioId = req.usuarioId
    const mesReferencia = req.query.mesReferencia

    if (!mesReferencia || !mesValido(mesReferencia)) {
      return res.status(400).json({ erro: 'mesReferencia deve estar no formato YYYY-MM' })
    }

    const autorizado = await validarPresidente(patotaId, usuarioId, res)
    if (!autorizado) return

    const relatorio = await buscarRelatorioMensalidades(patotaId, mesReferencia)
    return res.json(relatorio)
  }
  catch (erro) {
    console.error('Erro ao consultar relatorio de mensalidades:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

export async function alterarValor(req, res) {
  try {
    const patotaId = req.params.patotaId
    const usuarioId = req.usuarioId
    const valor = Number(req.body.valor)

    if (!Number.isFinite(valor) || valor <= 0) {
      return res.status(400).json({ erro: 'O valor da mensalidade deve ser maior que zero' })
    }

    const autorizado = await validarPresidente(patotaId, usuarioId, res)
    if (!autorizado) return

    const resultado = await atualizarValorMensalidade(patotaId, valor)
    return res.json(resultado)
  }
  catch (erro) {
    console.error('Erro ao atualizar valor da mensalidade:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

export async function alterarStatus(req, res) {
  try {
    const patotaId = req.params.patotaId
    const membroId = req.params.usuarioId
    const presidenteId = req.usuarioId
    const mesReferencia = req.body.mesReferencia
    const status = req.body.status

    if (!mesReferencia || !mesValido(mesReferencia)) {
      return res.status(400).json({ erro: 'mesReferencia deve estar no formato YYYY-MM' })
    }
    if (status !== 'PAGO' && status !== 'PENDENTE') {
      return res.status(400).json({ erro: 'Status deve ser PAGO ou PENDENTE' })
    }

    const autorizado = await validarPresidente(patotaId, presidenteId, res)
    if (!autorizado) return

    const membro = await verificarMembro(membroId, patotaId)
    if (!membro) {
      return res.status(404).json({ erro: 'Membro nao encontrado nesta patota' })
    }

    const mensalidade = await atualizarStatusMensalidade(patotaId, membroId, mesReferencia, status, presidenteId)
    if (!mensalidade) {
      return res.status(400).json({ erro: 'Defina um valor de mensalidade antes de alterar o status' })
    }
    return res.json(mensalidade)
  }
  catch (erro) {
    console.error('Erro ao atualizar status da mensalidade:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}
