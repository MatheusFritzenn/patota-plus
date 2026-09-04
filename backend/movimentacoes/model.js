import pool from '../db.js'

export async function buscarCaixaPatota(patotaId) {
  const querySelectMovimentacoes = `
    SELECT mf.id, mf.tipo, mf.valor::float, mf.descricao,
           mf.data_movimentacao AS "dataMovimentacao",
           mf.mensalidade_id AS "mensalidadeId",
           mf.registrado_por AS "registradoPor",
           u.nome AS "registradoPorNome"
    FROM movimentacoes_financeiras mf
    LEFT JOIN usuarios u ON u.id = mf.registrado_por
    WHERE mf.patota_id = $1
    ORDER BY mf.data_movimentacao DESC, mf.created_at DESC
  `
  const resultadoMovimentacoes = await pool.query(querySelectMovimentacoes, [patotaId])

  const querySelectTotais = `
    SELECT COALESCE(SUM(valor) FILTER (WHERE tipo = 'RECEITA'), 0)::float AS receitas,
           COALESCE(SUM(valor) FILTER (WHERE tipo = 'DESPESA'), 0)::float AS despesas
    FROM movimentacoes_financeiras
    WHERE patota_id = $1
  `
  const resultadoTotais = await pool.query(querySelectTotais, [patotaId])
  const totais = resultadoTotais.rows[0]

  const caixa = {}
  caixa.saldo = totais.receitas - totais.despesas
  caixa.receitas = totais.receitas
  caixa.despesas = totais.despesas
  caixa.movimentacoes = resultadoMovimentacoes.rows
  return caixa
}

export async function criarMovimentacao(dados) {
  const queryInsertMovimentacao = `
    INSERT INTO movimentacoes_financeiras
      (patota_id, tipo, valor, descricao, data_movimentacao, registrado_por)
    VALUES ($1, $2::"TipoMovimentacao", $3, $4, $5::date, $6::uuid)
    RETURNING id, patota_id AS "patotaId", tipo, valor::float, descricao,
              data_movimentacao AS "dataMovimentacao", mensalidade_id AS "mensalidadeId",
              registrado_por AS "registradoPor"
  `
  const arrayValores = [
    dados.patotaId,
    dados.tipo,
    dados.valor,
    dados.descricao,
    dados.dataMovimentacao,
    dados.registradoPor
  ]
  const resultado = await pool.query(queryInsertMovimentacao, arrayValores)
  return resultado.rows[0]
}
