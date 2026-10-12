import axios from 'axios'
import { createHash } from 'node:crypto'
import pool from '../db.js'

function erroGeocodificacao(mensagem, status) {
  const erro = new Error(mensagem)
  erro.status = status
  return erro
}

// Cache e bloqueio transacional são compartilhados inclusive entre instâncias serverless.
export async function geocodificarEndereco(endereco) {
  const baseUrl = process.env.GEOCODIFICACAO_URL || 'https://nominatim.openstreetmap.org'
  let ruaNumero = endereco.rua
  if (endereco.numero !== 'S/N') ruaNumero = endereco.numero + ' ' + endereco.rua
  const parametros = {
    street: ruaNumero,
    city: endereco.cidade,
    state: endereco.estado,
    postalcode: endereco.cep,
    country: 'Brasil',
    countrycodes: 'br',
    format: 'jsonv2',
    limit: 1
  }
  const chave = createHash('sha256').update(baseUrl + JSON.stringify(parametros)).digest('hex')
  const client = await pool.connect()
  let transacaoAberta = false
  try {
    await client.query('BEGIN')
    transacaoAberta = true
    // Uma única fila para toda a aplicação; o timestamp é confirmado mesmo em falhas HTTP.
    await client.query('SELECT pg_advisory_xact_lock(728401, 1)')
    const queryCache = `SELECT latitude, longitude FROM privado.geocodificacoes
      WHERE chave = $1 AND expira_em > clock_timestamp()`
    const resultadoCache = await client.query(queryCache, [chave])
    let coordenadas = null
    let erroConsulta = null
    if (resultadoCache.rows.length > 0) {
      coordenadas = resultadoCache.rows[0]
    } else {
      const queryIntervalo = `SELECT GREATEST(0, 1100 - EXTRACT(EPOCH FROM
        (clock_timestamp() - ultima_consulta)) * 1000)::float8 AS espera
        FROM privado.geocodificacao_controles WHERE id = 1`
      const resultadoIntervalo = await client.query(queryIntervalo)
      const espera = resultadoIntervalo.rows[0].espera
      if (espera > 0) await new Promise(function (resolver) { setTimeout(resolver, espera) })
      await client.query('UPDATE privado.geocodificacao_controles SET ultima_consulta = clock_timestamp() WHERE id = 1')
      try {
        const resposta = await axios.get(baseUrl + '/search', {
          params: parametros,
          timeout: 10000,
          headers: { 'User-Agent': process.env.GEOCODIFICACAO_USER_AGENT || 'PatotaPlus-TCC/1.0', 'Accept-Language': 'pt-BR' }
        })
        if (!Array.isArray(resposta.data)) throw new Error('Resposta inválida do geocodificador')
        if (resposta.data.length > 0) {
          if (!resposta.data[0] || resposta.data[0].lat === null || resposta.data[0].lon === null ||
              resposta.data[0].lat === undefined || resposta.data[0].lon === undefined ||
              resposta.data[0].lat === '' || resposta.data[0].lon === '') {
            throw new Error('Coordenadas ausentes do geocodificador')
          }
          const latitude = Number(resposta.data[0].lat)
          const longitude = Number(resposta.data[0].lon)
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            throw new Error('Coordenadas inválidas do geocodificador')
          }
          coordenadas = { latitude: latitude, longitude: longitude }
        } else {
          coordenadas = { latitude: null, longitude: null }
        }
      } catch {
        erroConsulta = erroGeocodificacao('Não foi possível consultar a localização do endereço. Tente novamente em instantes.', 503)
      }
      // Medir também ao terminar evita chamadas próximas mesmo após pausas do processo.
      await client.query('UPDATE privado.geocodificacao_controles SET ultima_consulta = clock_timestamp() WHERE id = 1')
      if (!erroConsulta) {
        let validadeSegundos = 30 * 24 * 60 * 60
        if (coordenadas.latitude === null) validadeSegundos = 60 * 60
        const querySalvarCache = `INSERT INTO privado.geocodificacoes (chave, latitude, longitude, expira_em)
          VALUES ($1, $2, $3, clock_timestamp() + $4 * interval '1 second')
          ON CONFLICT (chave) DO UPDATE SET latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude, expira_em = EXCLUDED.expira_em`
        await client.query(querySalvarCache, [chave, coordenadas.latitude, coordenadas.longitude, validadeSegundos])
      }
    }
    await client.query('COMMIT')
    transacaoAberta = false
    if (erroConsulta) throw erroConsulta
    if (coordenadas.latitude === null) {
      throw erroGeocodificacao('Não encontramos a localização desse endereço. Confira CEP, rua, número, cidade e estado antes de tentar novamente.', 422)
    }
    return coordenadas
  } catch (erro) {
    if (transacaoAberta) await client.query('ROLLBACK')
    throw erro
  } finally {
    client.release()
  }
}
