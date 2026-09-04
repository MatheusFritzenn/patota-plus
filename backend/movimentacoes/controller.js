import { buscarCaixaPatota, criarMovimentacao } from './model.js'
import { buscarPatotaPorId, verificarMembro } from '../patotas/model.js'

async function validarPresidente(patotaId, usuarioId, res) {
  if (!usuarioId) {
    res.status(400).json({ erro: 'Campo obrigatório: usuarioId' })
    return false
  }

  const patota = await buscarPatotaPorId(patotaId)
  if (!patota) {
    res.status(404).json({ erro: 'Patota não encontrada' })
    return false
  }

  const membro = await verificarMembro(usuarioId, patotaId)
  if (!membro || membro.role !== 'PRESIDENTE') {
    res.status(403).json({ erro: 'Apenas o presidente pode acessar o caixa da patota' })
    return false
  }

  return true
}

function dataValida(dataMovimentacao) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataMovimentacao)) return false

  const data = new Date(dataMovimentacao + 'T00:00:00Z')
  if (Number.isNaN(data.getTime())) return false
  return data.toISOString().substring(0, 10) === dataMovimentacao
}

export async function consultarCaixa(req, res) {
  try {
    const patotaId = req.params.patotaId
    const usuarioId = req.query.usuarioId
    const autorizado = await validarPresidente(patotaId, usuarioId, res)
    if (!autorizado) return

    const caixa = await buscarCaixaPatota(patotaId)
    return res.json(caixa)
  }
  catch (erro) {
    console.error('Erro ao consultar caixa da patota:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

export async function cadastrarMovimentacao(req, res) {
  try {
    const patotaId = req.params.patotaId
    const usuarioId = req.body.usuarioId
    const tipo = req.body.tipo
    const descricao = String(req.body.descricao || '').trim()
    const valor = Number(req.body.valor)
    const dataMovimentacao = req.body.dataMovimentacao

    if (tipo !== 'RECEITA' && tipo !== 'DESPESA') {
      return res.status(400).json({ erro: 'Tipo deve ser RECEITA ou DESPESA' })
    }
    if (!descricao) {
      return res.status(400).json({ erro: 'Descrição é obrigatória' })
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      return res.status(400).json({ erro: 'O valor deve ser maior que zero' })
    }
    if (!dataMovimentacao || !dataValida(dataMovimentacao)) {
      return res.status(400).json({ erro: 'Data da movimentação inválida' })
    }

    const autorizado = await validarPresidente(patotaId, usuarioId, res)
    if (!autorizado) return

    const dados = {}
    dados.patotaId = patotaId
    dados.tipo = tipo
    dados.descricao = descricao
    dados.valor = valor
    dados.dataMovimentacao = dataMovimentacao
    dados.registradoPor = usuarioId

    const movimentacao = await criarMovimentacao(dados)
    return res.status(201).json(movimentacao)
  }
  catch (erro) {
    console.error('Erro ao cadastrar movimentação financeira:', erro)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}
