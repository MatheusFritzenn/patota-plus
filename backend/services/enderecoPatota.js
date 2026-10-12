const arrayCamposEndereco = ['cep', 'numero', 'complemento', 'rua', 'cidade', 'estado']

function erroEndereco(mensagem) {
  const erro = new Error(mensagem)
  erro.status = 400
  return erro
}

// Normaliza apenas campos enviados; edições de emblema não exigem atualizar o endereço legado.
export function prepararEndereco(dados, existente) {
  let enderecoEnviado = !existente
  const endereco = {}
  for (const campo of arrayCamposEndereco) {
    let valor = ''
    if (existente && existente[campo]) valor = existente[campo]
    if (dados[campo] !== undefined) {
      enderecoEnviado = true
      if (typeof dados[campo] !== 'string' && dados[campo] !== null) {
        throw erroEndereco('O campo ' + campo + ' deve ser um texto.')
      }
      valor = dados[campo] || ''
    }
    endereco[campo] = valor.trim()
  }
  if (!enderecoEnviado) return null

  if (!/^\d{5}-?\d{3}$/.test(endereco.cep)) {
    throw erroEndereco('Informe um CEP válido com oito dígitos.')
  }
  endereco.cep = endereco.cep.replace('-', '')
  endereco.estado = endereco.estado.toUpperCase()
  if (!endereco.numero || endereco.numero.length > 30) {
    throw erroEndereco('Informe o número do local (até 30 caracteres) ou S/N.')
  }
  if (/^s\/?n$/i.test(endereco.numero)) endereco.numero = 'S/N'
  if (!endereco.rua || endereco.rua.length > 200 || !endereco.cidade || endereco.cidade.length > 100) {
    throw erroEndereco('Informe rua (até 200 caracteres) e cidade (até 100 caracteres).')
  }
  if (!/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(endereco.estado)) {
    throw erroEndereco('Informe uma UF válida para o estado.')
  }
  if (endereco.complemento.length > 120) throw erroEndereco('O complemento deve ter até 120 caracteres.')

  for (const campo of arrayCamposEndereco) {
    dados[campo] = endereco[campo]
  }
  // Complemento não muda a localização geográfica do estabelecimento.
  const arrayCamposPonto = ['cep', 'numero', 'rua', 'cidade', 'estado']
  let pontoAlterado = !existente || !existente.temLocalizacao
  for (const campo of arrayCamposPonto) {
    if (existente && endereco[campo] !== existente[campo]) pontoAlterado = true
  }
  if (!pontoAlterado) return null
  return endereco
}

export function lerCoordenadasBusca(parametros) {
  if (parametros.latitude === undefined && parametros.longitude === undefined) return null
  const arrayCampos = ['latitude', 'longitude']
  const coordenadas = {}
  for (const campo of arrayCampos) {
    const valor = parametros[campo]
    if (typeof valor !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(valor)) {
      throw erroEndereco('Informe latitude e longitude válidas juntas.')
    }
    coordenadas[campo] = Number(valor)
  }
  if (!Number.isFinite(coordenadas.latitude) || Math.abs(coordenadas.latitude) > 90 ||
      !Number.isFinite(coordenadas.longitude) || Math.abs(coordenadas.longitude) > 180) {
    throw erroEndereco('Latitude deve estar entre -90 e 90; longitude, entre -180 e 180.')
  }
  return coordenadas
}
