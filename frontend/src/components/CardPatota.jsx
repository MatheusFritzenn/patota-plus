import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import EmblemaPatota from './EmblemaPatota.jsx'

function CardPatota({ patota }) {
  return (
    <Link
      to={'/patota/' + patota.id}
      className="block rounded-2xl border border-gray-100 border-t-4 border-t-green-600 bg-white p-5 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:p-6"
    >
      <div className="flex min-w-0 items-center gap-4">
        <EmblemaPatota nome={patota.nome} emblemaPath={patota.emblemaPath} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 wrap-break-word text-lg font-semibold leading-snug text-gray-800">
              {patota.nome}
            </h3>
            {patota.role === 'PRESIDENTE' && (
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                Presidente
              </span>
            )}
          </div>
          <span className="mt-2 inline-block max-w-full rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
            {patota.modalidadeNome}
          </span>
        </div>
      </div>
      <div className="my-4 h-px bg-gray-100" />
      <p className="flex items-start gap-1.5 text-sm leading-relaxed text-gray-500">
        <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{patota.rua && <>{patota.rua} · </>}{patota.cidade}/{patota.estado}</span>
      </p>
    </Link>
  )
}

export default CardPatota
