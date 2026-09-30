import './carregamento.css'

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={'patota-skeleton rounded-lg ' + className} />
}

export function IndicadorCarregamento({ texto = 'Carregando...' }) {
  return (
    <span role="status" className="inline-flex max-w-full items-center justify-center gap-2 align-middle">
      <span aria-hidden="true" className="patota-spinner" />
      <span>{texto}</span>
    </span>
  )
}

function LinhasSkeleton({ quantidade = 4 }) {
  const arrayLinhas = Array.from({ length: quantidade }, (_, indice) => indice)
  return (
    <div className="space-y-4">
      {arrayLinhas.map((indice) => (
        <div key={indice} className="flex items-center gap-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-7 w-12 shrink-0" />
        </div>
      ))}
    </div>
  )
}

function CamposSkeleton({ quantidade = 6, colunas = true }) {
  const arrayCampos = Array.from({ length: quantidade }, (_, indice) => indice)
  let classe = 'grid grid-cols-1 gap-5'
  if (colunas) classe += ' sm:grid-cols-2'
  return (
    <div className={classe}>
      {arrayCampos.map((indice) => (
        <div key={indice} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

function ConteudoSkeleton({ tipo }) {
  if (tipo === 'patotas') {
    const arrayCards = [0, 1, 2, 3]
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {arrayCards.map((indice) => (
          <div key={indice} className="rounded-2xl border border-gray-100 border-t-4 border-t-green-600 bg-white p-5 shadow-md sm:p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 shrink-0 rounded-2xl sm:h-20 sm:w-20" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-7 w-24 max-w-full rounded-full" />
              </div>
            </div>
            <div className="my-4 h-px bg-gray-100" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (tipo === 'formulario' || tipo === 'partida-formulario' || tipo === 'perfil') {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        {tipo === 'perfil' && (
          <div className="mb-7 flex items-center gap-4 border-b border-gray-100 pb-6">
            <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
            <div className="flex-1 space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
          </div>
        )}
        <CamposSkeleton quantidade={tipo === 'partida-formulario' ? 4 : 6} colunas={tipo !== 'partida-formulario'} />
        <div className="mt-7 border-t border-gray-100 pt-6"><Skeleton className="h-4 w-36" /><Skeleton className="mt-4 h-10 w-full" /></div>
      </div>
    )
  }

  if (tipo === 'detalhes') {
    return (
      <div className="space-y-6">
        <div className="flex gap-3"><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md"><CamposSkeleton /></div>
      </div>
    )
  }

  if (tipo === 'times') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6"><Skeleton className="h-5 w-40" /><Skeleton className="mt-3 h-4 w-3/4" /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6"><LinhasSkeleton quantidade={5} /></div>
          <div className="rounded-2xl border border-gray-100 bg-white p-6"><LinhasSkeleton quantidade={5} /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {(tipo === 'financeiro' || tipo === 'mensalidades') && (
        <div className={tipo === 'mensalidades' ? 'grid grid-cols-2 gap-3 lg:grid-cols-4' : 'grid grid-cols-1 gap-3 sm:grid-cols-3'}>
          {Array.from({ length: tipo === 'mensalidades' ? 4 : 3 }, (_, indice) => (
            <div key={indice} className="rounded-2xl border border-gray-100 bg-white p-5"><Skeleton className="h-3 w-2/3" /><Skeleton className="mt-3 h-7 w-1/2" /></div>
          ))}
        </div>
      )}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
        <Skeleton className="mb-6 h-4 w-40" />
        <LinhasSkeleton />
      </div>
    </div>
  )
}

export function CarregamentoConteudo({ tipo = 'lista', mensagem = 'Carregando informações...' }) {
  return (
    <div>
      <span role="status" className="sr-only">{mensagem}</span>
      <div aria-busy="true" aria-hidden="true"><ConteudoSkeleton tipo={tipo} /></div>
    </div>
  )
}

export function CarregamentoPagina({ tipo = 'lista', titulo, mensagem, className = 'max-w-4xl mx-auto px-6 py-10' }) {
  return (
    <main className={className}>
      {titulo ? <h1 className="mb-6 text-2xl font-bold text-gray-800">{titulo}</h1> : <Skeleton className="mb-6 h-8 w-56 max-w-full" />}
      <CarregamentoConteudo tipo={tipo} mensagem={mensagem} />
    </main>
  )
}

export function CarregamentoSessao() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-green-50 px-6 text-green-800">
      <div className="flex items-center gap-2 text-3xl font-bold"><img src="/favicon.png" alt="" className="h-11 w-11" /><span>Patota<span className="text-green-600">+</span></span></div>
      <IndicadorCarregamento texto="Preparando seu acesso..." />
    </main>
  )
}
