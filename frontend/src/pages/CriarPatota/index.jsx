import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import ibgeApi from '../../services/ibgeApi.js'

// Modalidades hardcodadas (IDs correspondem ao banco)
const arrayModalidades = [
  { id: 1, nome: 'Futebol de campo' },
  { id: 2, nome: 'Futebol society' },
  { id: 3, nome: 'Futebol de salão' }
]

// Dias da semana
const arrayDiasSemana = [
  { id: 1, nome: 'Segunda-feira' },
  { id: 2, nome: 'Terça-feira' },
  { id: 3, nome: 'Quarta-feira' },
  { id: 4, nome: 'Quinta-feira' },
  { id: 5, nome: 'Sexta-feira' },
  { id: 6, nome: 'Sábado' },
  { id: 7, nome: 'Domingo' }
]

function CriarPatota() {
  const { id } = useParams()
  const modoEdicao = !!id

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [modalidadeId, setModalidadeId] = useState('')
  const [rua, setRua] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [arrayEstados, setArrayEstados] = useState([])
  const [arrayCidades, setArrayCidades] = useState([])
  const [diaHabitual, setDiaHabitual] = useState('')
  const [horaHabitual, setHoraHabitual] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(modoEdicao)

  const navigate = useNavigate()

  useEffect(() => {
    carregarEstados()
  }, [])

  useEffect(() => {
    if (estado) {
      carregarCidades(estado)
    } else {
      setArrayCidades([])
    }
  }, [estado])

  useEffect(() => {
    if (modoEdicao) {
      carregarPatota()
    }
  }, [id])

  async function carregarEstados() {
    try {
      const resposta = await ibgeApi.get('/estados?orderBy=nome')
      setArrayEstados(resposta.data)
    }
    catch (erro) {
      console.error('Erro ao carregar estados:', erro)
      setErro('Erro ao carregar estados.')
    }
  }

  async function carregarCidades(estado) {
    try {
      const resposta = await ibgeApi.get('/estados/' + estado + '/municipios?orderBy=nome')
      setArrayCidades(resposta.data)
    }
    catch (erro) {
      console.error('Erro ao carregar cidades:', erro)
      setErro('Erro ao carregar cidades.')
    }
  }

  function alterarEstado(novoEstado) {
    setCidade('')
    setEstado(novoEstado)
  }

  async function carregarPatota() {
    try {
      const resposta = await api.get('/patotas/' + id)
      const patota = resposta.data

      setNome(patota.nome || '')
      setDescricao(patota.descricao || '')
      setModalidadeId(String(patota.modalidadeId) || '')
      setRua(patota.rua || '')
      setCidade(patota.cidade || '')
      setEstado(patota.estado || '')
      setDiaHabitual(patota.diaHabitual ? String(patota.diaHabitual) : '')
      setHoraHabitual(patota.horaHabitual ? patota.horaHabitual.substring(0, 5) : '')

      setCarregandoDados(false)
    } catch (erroRequisicao) {
      console.error('Erro ao carregar patota:', erroRequisicao)
      setErro('Erro ao carregar dados da patota.')
      setCarregandoDados(false)
    }
  }

  async function handleSubmit(evento) {
    evento.preventDefault()
    setErro('')

    if (!modalidadeId) {
      setErro('Selecione uma modalidade.')
      return
    }

    setCarregando(true)

    if (modoEdicao) {
      // Modo edição: PUT
      try {
        const dadosPatota = {
          nome: nome,
          descricao: descricao,
          modalidadeId: Number(modalidadeId),
          rua: rua,
          cidade: cidade,
          estado: estado,
          diaHabitual: diaHabitual ? Number(diaHabitual) : null,
          horaHabitual: horaHabitual || null
        }

        await api.put('/patotas/' + id, dadosPatota)

        setCarregando(false)
        navigate('/patota/' + id)
      } catch (erroRequisicao) {
        console.error('Erro ao atualizar patota:', erroRequisicao)
        setErro('Erro ao atualizar patota. Tente novamente.')
        setCarregando(false)
      }
    } else {
      // Modo criação: POST
      const { data } = await supabase.auth.getUser()

      if (!data || !data.user) {
        setErro('Usuário não autenticado. Faça login novamente.')
        setCarregando(false)
        return
      }

      const presidenteId = data.user.id

      try {
        const dadosPatota = {
          nome: nome,
          descricao: descricao,
          modalidadeId: Number(modalidadeId),
          rua: rua,
          cidade: cidade,
          estado: estado,
          diaHabitual: diaHabitual ? Number(diaHabitual) : null,
          horaHabitual: horaHabitual || null,
          presidenteId: presidenteId
        }

        await api.post('/patotas', dadosPatota)

        setCarregando(false)
        navigate('/home')
      } catch (erroRequisicao) {
        console.error('Erro ao criar patota:', erroRequisicao)
        setErro('Erro ao criar patota. Tente novamente.')
        setCarregando(false)
      }
    }
  }

  if (carregandoDados) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-gray-500 text-center">Carregando...</p>
      </main>
    )
  }

  const rotaCancelar = modoEdicao ? '/patota/' + id : '/home'

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Título */}
        <h1 className="text-2xl font-bold text-green-700 mb-2">
          {modoEdicao ? 'Editar Patota' : 'Criar Patota'}
        </h1>
        <p className="text-gray-500 mb-8">
          {modoEdicao ? 'Altere os dados da sua patota' : 'Preencha os dados para criar sua patota'}
        </p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nome da patota */}
          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium text-gray-700">
              Nome da patota
            </label>
            <input
              id="nome"
              type="text"
              placeholder="Ex: Pelada do Sábado"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1">
            <label htmlFor="descricao" className="text-sm font-medium text-gray-700">
              Descrição (opcional)
            </label>
            <textarea
              id="descricao"
              placeholder="Descreva sua patota..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Modalidade */}
          <div className="flex flex-col gap-1">
            <label htmlFor="modalidade" className="text-sm font-medium text-gray-700">
              Modalidade
            </label>
            <select
              id="modalidade"
              value={modalidadeId}
              onChange={(e) => setModalidadeId(e.target.value)}
              required
              className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${modalidadeId ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <option value="" disabled>Selecione a modalidade</option>
              {arrayModalidades.map((modalidade) => (
                <option key={modalidade.id} value={modalidade.id}>
                  {modalidade.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Rua */}
          <div className="flex flex-col gap-1">
            <label htmlFor="rua" className="text-sm font-medium text-gray-700">
              Rua
            </label>
            <input
              id="rua"
              type="text"
              placeholder="Ex: Rua das Flores, 123"
              value={rua}
              onChange={(e) => setRua(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Estado */}
          <div className="flex flex-col gap-1">
            <label htmlFor="estado" className="text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              id="estado"
              value={estado}
              onChange={(e) => alterarEstado(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="" disabled>Selecione o estado</option>
              {arrayEstados.map((estadoOpcao) => (
                <option key={estadoOpcao.id} value={estadoOpcao.sigla}>
                  {estadoOpcao.nome} ({estadoOpcao.sigla})
                </option>
              ))}
            </select>
          </div>

          {/* Cidade */}
          <div className="flex flex-col gap-1">
            <label htmlFor="cidade" className="text-sm font-medium text-gray-700">
              Cidade
            </label>
            <select
              id="cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              required
              disabled={!estado}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="" disabled>
                {estado ? 'Selecione a cidade' : 'Selecione primeiro o estado'}
              </option>
              {arrayCidades.map((cidadeOpcao) => (
                <option key={cidadeOpcao.id} value={cidadeOpcao.nome}>
                  {cidadeOpcao.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Dia habitual */}
          <div className="flex flex-col gap-1">
            <label htmlFor="diaHabitual" className="text-sm font-medium text-gray-700">
              Dia habitual (opcional)
            </label>
            <select
              id="diaHabitual"
              value={diaHabitual}
              onChange={(e) => setDiaHabitual(e.target.value)}
              className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${diaHabitual ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <option value="" disabled>Selecione o dia</option>
              {arrayDiasSemana.map((dia) => (
                <option key={dia.id} value={dia.id}>
                  {dia.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Hora habitual */}
          <div className="flex flex-col gap-1">
            <label htmlFor="horaHabitual" className="text-sm font-medium text-gray-700">
              Horário habitual (opcional)
            </label>
            <input
              id="horaHabitual"
              type="time"
              value={horaHabitual}
              onChange={(e) => setHoraHabitual(e.target.value)}
              className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${horaHabitual ? 'text-gray-900' : 'text-gray-400'}`}
            />
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <p className="text-red-500 text-sm text-center">{erro}</p>
          )}

          {/* Botões */}
          <div className="flex gap-3 mt-2">
            <Link
              to={rotaCancelar}
              className="flex-1 text-center border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={carregando}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando
                ? (modoEdicao ? 'Salvando...' : 'Criando...')
                : (modoEdicao ? 'Salvar' : 'Criar Patota')
              }
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default CriarPatota
