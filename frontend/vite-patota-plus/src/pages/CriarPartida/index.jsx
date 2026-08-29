import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../../services/api.js'
import './style.css'

function CriarPartida() {
  const { id } = useParams()

  const [data, setData] = useState('')
  const [horario, setHorario] = useState('')
  const [local, setLocal] = useState('')
  const [vagasTotal, setVagasTotal] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const navigate = useNavigate()

  async function handleSubmit(evento) {
    evento.preventDefault()
    setErro('')

    const vagasNumero = Number(vagasTotal)

    if (!Number.isInteger(vagasNumero) || vagasNumero <= 0) {
      setErro('A quantidade de vagas deve ser um número inteiro maior que zero.')
      return
    }

    setCarregando(true)

    try {
      const dadosPartida = {
        patotaId: id,
        data: data,
        horario: horario,
        local: local,
        vagasTotal: vagasNumero
      }

      await api.post('/partidas', dadosPartida)

      setCarregando(false)
      navigate('/patota/' + id)
    }
    catch (erroRequisicao) {
      console.error('Erro ao criar partida:', erroRequisicao)
      setErro('Erro ao criar partida. Tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Título */}
        <h1 className="text-2xl font-bold text-green-700 mb-2">Criar Partida</h1>
        <p className="text-gray-500 mb-8">Preencha os dados para agendar uma nova partida</p>

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
              min="1"
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
              to={'/patota/' + id}
              className="flex-1 text-center border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={carregando}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Criando...' : 'Criar Partida'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default CriarPartida
