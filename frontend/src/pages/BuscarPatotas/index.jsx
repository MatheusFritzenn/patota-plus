import { CarregamentoConteudo } from '../../components/Carregamento.jsx'
import { useState, useEffect, useRef } from 'react'
import { ChevronDown, LocateFixed } from 'lucide-react'
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
  const [coordenadas, setCoordenadas] = useState(null)
  const [localizando, setLocalizando] = useState(false)
  const [mensagemLocalizacao, setMensagemLocalizacao] = useState('Use sua localização para ver as patotas mais próximas.')
  const montadoRef = useRef(false)

  useEffect(() => {
    montadoRef.current = true
    return function () { montadoRef.current = false }
  }, [])

  function localizarUsuario() {
    if (!navigator.geolocation) {
      setMensagemLocalizacao('Seu navegador não disponibiliza a localização. A busca continua por nome.')
      return
    }
    setLocalizando(true)
    setMensagemLocalizacao('Aguardando sua localização. Autorize o acesso no navegador.')
    navigator.geolocation.getCurrentPosition(function (posicao) {
      if (!montadoRef.current) return
      setCoordenadas({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude })
      setMensagemLocalizacao('Patotas ordenadas pela menor distância em linha reta. Locais sem coordenadas aparecem ao final.')
      setLocalizando(false)
    }, function (erroLocalizacao) {
      if (!montadoRef.current) return
      setCoordenadas(null)
      let mensagem = 'Não foi possível obter sua localização. A busca continua por nome; você pode tentar novamente.'
      if (erroLocalizacao.code === 1) mensagem = 'Permissão de localização negada. A busca continua por nome. Para usar a proximidade, autorize o acesso nas configurações do navegador.'
      if (erroLocalizacao.code === 3) mensagem = 'O tempo para obter sua localização acabou. A busca continua por nome; tente novamente.'
      setMensagemLocalizacao(mensagem)
      setLocalizando(false)
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 })
  }

  useEffect(() => {
    const controlador = new AbortController()
    buscarPatotas(controlador.signal)
    return function () {
      controlador.abort()
    }
  }, [modalidadeId, coordenadas])

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
      if (coordenadas) {
        parametros.latitude = coordenadas.latitude
        parametros.longitude = coordenadas.longitude
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

      <div className="mb-6 rounded-xl border border-green-100 bg-green-50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={localizarUsuario} disabled={localizando} aria-busy={localizando} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60 cursor-pointer">
            <LocateFixed size={18} aria-hidden="true" />
            {localizando ? 'Obtendo localização...' : 'Usar minha localização'}
          </button>
          {coordenadas && !localizando && <button type="button" onClick={() => { setCoordenadas(null); setMensagemLocalizacao('Busca por nome. Use sua localização para ordenar por proximidade.') }} className="min-h-11 text-sm text-green-800 underline cursor-pointer">Limpar localização</button>}
        </div>
        <p role="status" className="mt-2 text-sm text-gray-600">{mensagemLocalizacao}</p>
        <p className="mt-1 text-xs text-gray-500">Sua localização é usada somente nesta busca e não é salva.</p>
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
            <CardPatota key={patota.id} patota={patota} mostrarDistancia={!!coordenadas} />
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-gray-500">Dados geográficos © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a>.</p>
    </main>
  )
}

export default BuscarPatotas
