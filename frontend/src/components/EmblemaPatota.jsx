import { useState } from 'react'
import { obterUrlEmblema } from '../services/emblemasPatotas.js'

function obterIniciais(nome) {
  const arrayPalavras = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (arrayPalavras.length === 0) return 'P+'
  if (arrayPalavras.length === 1) return arrayPalavras[0].slice(0, 2).toUpperCase()

  return (arrayPalavras[0][0] + arrayPalavras[arrayPalavras.length - 1][0]).toUpperCase()
}

function EmblemaPatota({ nome, emblemaPath, previewUrl, tamanho }) {
  const [urlComErro, setUrlComErro] = useState('')
  const urlImagem = previewUrl || obterUrlEmblema(emblemaPath)

  let classeTamanho = 'h-16 w-16 sm:h-20 sm:w-20'
  if (tamanho === 'formulario') {
    classeTamanho = 'h-28 w-28'
  }

  return (
    <div
      className={'flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-green-100 bg-amber-50 ' + classeTamanho}
      role="img"
      aria-label={'Emblema da patota ' + (nome || 'sem nome')}
    >
      {urlImagem && urlImagem !== urlComErro ? (
        <img
          src={urlImagem}
          alt=""
          className="h-full w-full object-contain p-2"
          onError={() => setUrlComErro(urlImagem)}
        />
      ) : (
        <span className="flex h-14 w-12 items-center justify-center bg-green-800 text-lg font-bold tracking-wide text-white [clip-path:polygon(8%_0,92%_0,100%_10%,94%_70%,50%_100%,6%_70%,0_10%)]">
          {obterIniciais(nome)}
        </span>
      )}
    </div>
  )
}

export default EmblemaPatota
