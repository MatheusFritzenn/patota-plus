import { CarregamentoConteudo } from '../../components/Carregamento.jsx'
import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import CardPatota from '../../components/CardPatota.jsx'
import './style.css'

const arrayModalidades = [
  { id: 1, nome: 'Futebol de campo' },
  { id: 2, nome: 'Futebol society' },
  { id: 3, nome: 'Futebol de salão' }
]

function BuscarPatotas() {
  const [arrayPatotas, setArrayPatotas] = useState([])
  const [modalidadeId, setModalidadeId] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const controlador = new AbortController()
    buscarPatotas(controlador.signal)
    return function () {
      controlador.abort()
    }
  }, [modalidadeId])

  async function buscarPatotas(sinal) {
    setCarregando(true)
    setErro('')

    try {
      const { data } = await supabase.auth.getUser()
      if (sinal.aborted) return

      if (!data || !data.user) {
        setErro('Usuário não autenticado.')
        setCarregando(false)
        return
      }

      const parametros = {}
      if (modalidadeId) {
        parametros.modalidadeId = modalidadeId
      }
      const resposta = await api.get('/patotas/buscar', {
        params: parametros,
        signal: sinal
      })
      if (sinal.aborted) return
      setArrayPatotas(resposta.data)
      setCarregando(false)
    }
    catch (erroRequisicao) {
      if (sinal.aborted) return
      console.error('Erro ao buscar patotas:', erroRequisicao)
      setErro('Erro ao carregar patotas disponíveis.')
      setCarregando(false)
    }
  }

  let mensagemVazia = 'Não há patotas disponíveis no momento.'
  if (modalidadeId) {
    mensagemVazia = 'Nenhuma patota encontrada nessa modalidade.'
  }

  let textoContagem = arrayPatotas.length + ' patotas encontradas'
  if (arrayPatotas.length === 1) {
    textoContagem = '1 patota encontrada'
  }
  if (carregando) {
    textoContagem = ''
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Buscar Patotas</h2>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div className="w-full sm:max-w-xs">
          <label htmlFor="modalidadeBusca" className="block text-sm font-medium text-gray-700 mb-2">
            Modalidade
          </label>
          <div className="relative">
            <select
              id="modalidadeBusca"
              value={modalidadeId}
              onChange={(evento) => setModalidadeId(evento.target.value)}
              className="w-full appearance-none border border-gray-300 bg-white text-gray-800 rounded-lg pl-4 pr-12 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Todas as modalidades</option>
              {arrayModalidades.map((modalidade) => (
                <option key={modalidade.id} value={String(modalidade.id)}>{modalidade.nome}</option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              size={18}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
            />
          </div>
        </div>
        {!erro && (
          <p className="text-sm text-gray-500" aria-live="polite">{textoContagem}</p>
        )}
      </div>

      {carregando && (
        <CarregamentoConteudo tipo="patotas" mensagem="Carregando patotas disponíveis..." />
      )}

      {!carregando && erro && (
        <p className="text-red-500 text-center py-16" role="alert">{erro}</p>
      )}

      {!carregando && !erro && arrayPatotas.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">{mensagemVazia}</p>
        </div>
      )}

      {!carregando && !erro && arrayPatotas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {arrayPatotas.map((patota) => (
            <CardPatota key={patota.id} patota={patota} />
          ))}
        </div>
      )}
    </main>
  )
}

export default BuscarPatotas
