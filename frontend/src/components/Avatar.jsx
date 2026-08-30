// Componente de avatar compartilhado.
//
// Props:
// - nome: string usada para a inicial de fallback (ex.: "Ana" -> "A")
// - foto: URL da imagem (se ausente/null, cai no fallback)
// - tamanho: 'sm' (32px) | 'md' (40px) | 'lg' (48px) | 'xl' (96px). Padrão 'lg'.
// - corBorda: 'verde' | 'amarela' | 'branca'. Padrão 'verde'.
// - fallback: 'inicial' (letra do nome) | 'icone' (elemento passado em iconeFallback) | 'nenhum'. Padrão 'inicial'.
// - iconeFallback: elemento React exibido quando fallback === 'icone' (ex.: <User />).
//
// Observação: as classes Tailwind são mapeadas por strings completas para que o
// build gere o CSS corretamente (Tailwind não entende classes montadas por concatenação).

function Avatar({ nome, foto, tamanho, corBorda, fallback, iconeFallback }) {
  // Tamanho do container
  let classeTamanho = 'w-12 h-12'
  if (tamanho === 'sm') {
    classeTamanho = 'w-8 h-8'
  } else if (tamanho === 'md') {
    classeTamanho = 'w-10 h-10'
  } else if (tamanho === 'xl') {
    classeTamanho = 'w-24 h-24'
  }

  // Tamanho da letra de fallback (proporcional ao container)
  let classeTexto = 'text-sm'
  if (tamanho === 'sm') {
    classeTexto = 'text-xs'
  } else if (tamanho === 'xl') {
    classeTexto = 'text-3xl'
  }

  // Espessura da borda: xl usa borda mais grossa (border-4), demais usam border-2
  let espessuraBorda = 'border-2'
  if (tamanho === 'xl') {
    espessuraBorda = 'border-4'
  }

  // Cor/estilo da borda
  let classeBorda = espessuraBorda + ' border-green-200'
  if (corBorda === 'amarela') {
    classeBorda = espessuraBorda + ' border-yellow-200'
  } else if (corBorda === 'branca') {
    classeBorda = espessuraBorda + ' border-white'
  }

  // Cor do fundo e da letra no fallback de inicial (acompanha a cor da borda)
  let classeFundoInicial = 'bg-green-100'
  let classeCorLetra = 'text-green-600'
  if (corBorda === 'amarela') {
    classeFundoInicial = 'bg-yellow-100'
    classeCorLetra = 'text-yellow-700'
  }

  const classeContainer = 'rounded-full overflow-hidden shrink-0 ' + classeTamanho + ' ' + classeBorda

  let inicial = ''
  if (nome && nome.length > 0) {
    inicial = nome.charAt(0).toUpperCase()
  }

  // Se há foto, exibe a imagem
  if (foto) {
    return (
      <div className={classeContainer}>
        <img src={foto} alt={nome || 'avatar'} className="w-full h-full object-cover" />
      </div>
    )
  }

  // Fallback por ícone (ex.: Header)
  if (fallback === 'icone') {
    return (
      <div className={classeContainer}>
        <div className="w-full h-full bg-green-500 flex items-center justify-center text-white">
          {iconeFallback}
        </div>
      </div>
    )
  }

  // Fallback vazio (sem inicial, sem ícone)
  if (fallback === 'nenhum') {
    return (
      <div className={classeContainer}>
        <div className={'w-full h-full ' + classeFundoInicial}></div>
      </div>
    )
  }

  // Fallback padrão: inicial do nome
  return (
    <div className={classeContainer}>
      <div className={'w-full h-full flex items-center justify-center ' + classeFundoInicial}>
        <span className={'font-bold ' + classeCorLetra + ' ' + classeTexto}>
          {inicial}
        </span>
      </div>
    </div>
  )
}

export default Avatar
