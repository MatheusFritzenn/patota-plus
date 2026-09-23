import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../../services/api.js'
import supabase from '../../services/supabaseClient.js'
import { obterDataSugerida, obterLocalSugerido } from '../../utils/sugestoesPartida.js'
import './style.css'

function CriarPartida() {
  const { id, partidaId } = useParams()
  const modoEdicao = !!partidaId

  const [patotaId, setPatotaId] = useState(id || '')
  const [data, setData] = useState('')
  const [horario, setHorario] = useState('')
  const [local, setLocal] = useState('')
  const [vagasTotal, setVagasTotal] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState('')
  const [vagasPreenchidas, setVagasPreenchidas] = useState(0)

  const navigate = useNavigate()

  useEffect(() => {
    if (modoEdicao) {
      carregarPartida()
    }
    else {
      carregarPatota()
    }
  }, [id, partidaId])

  async function carregarPatota() {
    setCarregandoDados(true)
    setErroCarregamento('')

    try {
      const respostaPatota = await api.get('/patotas/' + id)
      const patota = respostaPatota.data

      setPatotaId(patota.id)
      setData(obterDataSugerida(patota.diaHabitual, patota.horaHabitual))
      setHorario(patota.horaHabitual ? patota.horaHabitual.substring(0, 5) : '')
      setLocal(obterLocalSugerido(patota))
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar patota:', erroRequisicao)
      setErroCarregamento('Erro ao carregar os dados da patota.')
    }
    finally {
      setCarregandoDados(false)
    }
  }

  async function carregarPartida() {
    setCarregandoDados(true)
    setErroCarregamento('')

    try {
      const respostaPartida = await api.get('/partidas/' + partidaId)
      const partida = respostaPartida.data
      const respostaUsuario = await supabase.auth.getUser()

      if (!respostaUsuario.data || !respostaUsuario.data.user ||
          partida.presidenteId !== respostaUsuario.data.user.id) {
        setErroCarregamento('Apenas o presidente da patota pode editar esta partida.')
        return
      }

      if (partida.status !== 'AGENDADA' && partida.status !== 'EM_ANDAMENTO') {
        setErroCarregamento('Esta partida já está encerrada e não pode ser editada.')
        return
      }

      setPatotaId(partida.patotaId)
      setData(partida.data ? String(partida.data).substring(0, 10) : '')
      setHorario(partida.horario ? partida.horario.substring(0, 5) : '')
      setLocal(partida.local || '')
      setVagasTotal(String(partida.vagasTotal))
      setVagasPreenchidas(partida.vagasPreenchidas)
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar partida:', erroRequisicao)
      setErroCarregamento('Erro ao carregar dados da partida.')
    }
    finally {
      setCarregandoDados(false)
    }
  }

  async function handleSubmit(evento) {
    evento.preventDefault()
    setErro('')

    const vagasNumero = Number(vagasTotal)

    if (!Number.isInteger(vagasNumero) || vagasNumero <= 0) {
      setErro('A quantidade de vagas deve ser um número inteiro maior que zero.')
      return
    }

    if (modoEdicao && vagasNumero < vagasPreenchidas) {
      setErro('A quantidade de vagas não pode ser menor que os ' + vagasPreenchidas + ' participantes confirmados.')
      return
    }

    setCarregando(true)

    try {
      const dadosPartida = {
        data: data,
        horario: horario,
        local: local,
        vagasTotal: vagasNumero
      }

      if (modoEdicao) {
        await api.put('/partidas/' + partidaId, dadosPartida)
      }
      else {
        dadosPartida.patotaId = patotaId
        await api.post('/partidas', dadosPartida)
      }

      setCarregando(false)
      if (modoEdicao) {
        navigate('/partida/' + partidaId)
      }
      else {
        navigate('/patota/' + patotaId)
      }
    }
    catch (erroRequisicao) {
      console.error('Erro ao salvar partida:', erroRequisicao)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        setErro(erroRequisicao.response.data.erro)
      }
      else {
        setErro('Erro ao salvar partida. Tente novamente.')
      }
      setCarregando(false)
    }
  }

  if (carregandoDados) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-gray-500 text-center">Carregando partida...</p>
      </main>
    )
  }

  if (erroCarregamento) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-red-500 text-center">{erroCarregamento}</p>
      </main>
    )
  }

  let destinoCancelar = '/patota/' + patotaId
  if (modoEdicao) {
    destinoCancelar = '/partida/' + partidaId
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Título */}
        <h1 className="text-2xl font-bold text-green-700 mb-2">{modoEdicao ? 'Editar Partida' : 'Criar Partida'}</h1>
        <p className="text-gray-500 mb-8">
          {modoEdicao ? 'Altere os dados da partida' : 'Preencha os dados para agendar uma nova partida'}
        </p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Data */}
          <div className="flex flex-col gap-1">
            <label htmlFor="data" className="text-sm font-medium text-gray-700">
              Data
            </label>
            <input
              id="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${data ? 'text-gray-900' : 'text-gray-400'}`}
            />
          </div>

          {/* Horário */}
          <div className="flex flex-col gap-1">
            <label htmlFor="horario" className="text-sm font-medium text-gray-700">
              Horário
            </label>
            <input
              id="horario"
              type="time"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              required
              className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${horario ? 'text-gray-900' : 'text-gray-400'}`}
            />
          </div>

          {/* Local */}
          <div className="flex flex-col gap-1">
            <label htmlFor="local" className="text-sm font-medium text-gray-700">
              Local
            </label>
            <input
              id="local"
              type="text"
              placeholder="Ex: Quadra do Centro Esportivo"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Quantidade de vagas */}
          <div className="flex flex-col gap-1">
            <label htmlFor="vagasTotal" className="text-sm font-medium text-gray-700">
              Quantidade de vagas
            </label>
            <input
              id="vagasTotal"
              type="number"
              min={modoEdicao ? Math.max(1, vagasPreenchidas) : 1}
              placeholder="Ex: 10"
              value={vagasTotal}
              onChange={(e) => setVagasTotal(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <p className="text-red-500 text-sm text-center">{erro}</p>
          )}

          {/* Botões */}
          <div className="flex gap-3 mt-2">
            <Link
              to={destinoCancelar}
              className="flex-1 text-center border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={carregando}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Salvando...' : (modoEdicao ? 'Salvar alterações' : 'Criar Partida')}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default CriarPartida
