import pool from '../db.js'

export async function buscarRelatorioMensalidades(patotaId, mesReferencia) {
  const querySelectRelatorio = `
    SELECT u.id AS "usuarioId", u.nome, u.foto,
           COALESCE(me.valor, p.valor_mensalidade)::float AS valor,
           COALESCE(me.status, 'PENDENTE') AS status,
           me.pago_em AS "dataPagamento"
    FROM membro_patotas mp
    JOIN usuarios u ON u.id = mp.usuario_id
    JOIN patotas p ON p.id = mp.patota_id
    LEFT JOIN mensalidades me
      ON me.patota_id = mp.patota_id
      AND me.usuario_id = mp.usuario_id
      AND me.mes_referencia = TO_DATE($2 || '-01', 'YYYY-MM-DD')
    WHERE mp.patota_id = $1 AND mp.ativo = true
    ORDER BY u.nome ASC
  `
  const resultado = await pool.query(querySelectRelatorio, [patotaId, mesReferencia])

  const querySelectValor = `
    SELECT valor_mensalidade::float AS "valorMensalidade"
    FROM patotas
    WHERE id = $1
  `
  const resultadoValor = await pool.query(querySelectValor, [patotaId])
  const arrayMensalidades = resultado.rows
  let quantidadePagas = 0
  let totalRecebido = 0

  for (const mensalidade of arrayMensalidades) {
    if (mensalidade.status === 'PAGO') {
      quantidadePagas = quantidadePagas + 1
      totalRecebido = totalRecebido + mensalidade.valor
    }
  }

  const relatorio = {}
  relatorio.mesReferencia = mesReferencia
  relatorio.valorMensalidade = resultadoValor.rows[0].valorMensalidade
  relatorio.quantidadeMembros = arrayMensalidades.length
  relatorio.quantidadePagas = quantidadePagas
  relatorio.quantidadePendentes = arrayMensalidades.length - quantidadePagas
  relatorio.totalRecebido = totalRecebido
  relatorio.mensalidades = arrayMensalidades
  return relatorio
}

export async function atualizarValorMensalidade(patotaId, valor) {
  const queryUpdateValor = `
    UPDATE patotas
    SET valor_mensalidade = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING valor_mensalidade::float AS "valorMensalidade"
  `
  const resultado = await pool.query(queryUpdateValor, [patotaId, valor])
  return resultado.rows[0]
}

export async function atualizarStatusMensalidade(patotaId, usuarioId, mesReferencia, status, presidenteId) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const querySelectMensalidade = `
      SELECT id, status
      FROM mensalidades
      WHERE patota_id = $1
        AND usuario_id = $2
        AND mes_referencia = TO_DATE($3 || '-01', 'YYYY-MM-DD')
      FOR UPDATE
    `
    const resultadoExistente = await client.query(querySelectMensalidade, [patotaId, usuarioId, mesReferencia])
    let statusAnterior = null
    if (resultadoExistente.rows.length > 0) {
      statusAnterior = resultadoExistente.rows[0].status
    }

    const queryUpsertMensalidade = `
      INSERT INTO mensalidades (patota_id, usuario_id, mes_referencia, valor, status, pago_em, baixa_por)
      SELECT $1, $2, TO_DATE($3 || '-01', 'YYYY-MM-DD'), valor_mensalidade,
             $4::"StatusMensalidade",
             CASE WHEN $4::"StatusMensalidade" = 'PAGO'::"StatusMensalidade" THEN NOW() ELSE NULL END,
             CASE WHEN $4::"StatusMensalidade" = 'PAGO'::"StatusMensalidade" THEN $5::uuid ELSE NULL END
      FROM patotas
      WHERE id = $1 AND valor_mensalidade > 0
      ON CONFLICT (patota_id, usuario_id, mes_referencia)
      DO UPDATE SET status = EXCLUDED.status,
                    pago_em = EXCLUDED.pago_em,
                    baixa_por = EXCLUDED.baixa_por,
                    updated_at = NOW()
      RETURNING id, usuario_id AS "usuarioId", TO_CHAR(mes_referencia, 'YYYY-MM') AS "mesReferencia",
                valor::float, status, pago_em AS "dataPagamento"
    `
    const arrayValores = [patotaId, usuarioId, mesReferencia, status, presidenteId]
    const resultado = await client.query(queryUpsertMensalidade, arrayValores)
    if (resultado.rows.length === 0) {
      await client.query('ROLLBACK')
      return null
    }

    const mensalidade = resultado.rows[0]
    if (status === 'PAGO' && statusAnterior !== 'PAGO') {
      const queryInsertMovimentacao = `
        INSERT INTO movimentacoes_financeiras
          (patota_id, tipo, valor, descricao, data_movimentacao, mensalidade_id, registrado_por)
        SELECT me.patota_id, 'RECEITA', me.valor,
               'Mensalidade de ' || u.nome || ' - ' || TO_CHAR(me.mes_referencia, 'MM/YYYY'),
               CURRENT_DATE, me.id, $2
        FROM mensalidades me
        JOIN usuarios u ON u.id = me.usuario_id
        WHERE me.id = $1
      `
      await client.query(queryInsertMovimentacao, [mensalidade.id, presidenteId])
    }
    if (status === 'PENDENTE' && statusAnterior === 'PAGO') {
      const queryDeleteMovimentacao = `
        DELETE FROM movimentacoes_financeiras
        WHERE mensalidade_id = $1
      `
      await client.query(queryDeleteMovimentacao, [mensalidade.id])
    }

    await client.query('COMMIT')
    return mensalidade
  }
  catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  }
  finally {
    client.release()
  }
}
