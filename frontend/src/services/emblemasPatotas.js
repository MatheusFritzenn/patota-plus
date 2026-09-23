import supabase from './supabaseClient.js'

const bucket = 'patota-emblemas'
const tamanhoMaximo = 2 * 1024 * 1024
const extensoesPorTipo = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
}

export function validarArquivoEmblema(arquivo) {
  if (!extensoesPorTipo[arquivo.type]) {
    return 'Escolha uma imagem PNG, JPG ou WebP.'
  }

  if (arquivo.size === 0) {
    return 'A imagem selecionada está vazia.'
  }

  if (arquivo.size > tamanhoMaximo) {
    return 'O emblema deve ter no máximo 2 MB.'
  }

  return ''
}

export function obterUrlEmblema(caminho) {
  if (!caminho) return ''

  const resultado = supabase.storage.from(bucket).getPublicUrl(caminho)
  return resultado.data.publicUrl
}

export async function enviarEmblema(patotaId, arquivo) {
  const mensagemErro = validarArquivoEmblema(arquivo)
  if (mensagemErro) {
    throw new Error(mensagemErro)
  }

  const extensao = extensoesPorTipo[arquivo.type]
  const caminho = patotaId + '/' + crypto.randomUUID() + '.' + extensao
  const resultado = await supabase.storage.from(bucket).upload(caminho, arquivo, {
    contentType: arquivo.type,
    upsert: false
  })

  if (resultado.error) {
    throw resultado.error
  }

  return caminho
}

export async function excluirEmblema(caminho) {
  if (!caminho) return

  const resultado = await supabase.storage.from(bucket).remove([caminho])
  if (resultado.error) {
    throw resultado.error
  }
}
