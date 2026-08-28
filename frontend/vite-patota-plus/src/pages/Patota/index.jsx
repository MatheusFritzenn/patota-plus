import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import ModalConfirmacao from '../../components/ModalConfirmacao.jsx'
import ModalMensagem from '../../components/ModalMensagem.jsx'

// Dias da semana para exibição
const arrayDiasSemana = [
  { id: 1, nome: 'Segunda-feira' },
  { id: 2, nome: 'Terça-feira' },
  { id: 3, nome: 'Quarta-feira' },
  { id: 4, nome: 'Quinta-feira' },
  { id: 5, nome: 'Sexta-feira' },
  { id: 6, nome: 'Sábado' },
  { id: 7, nome: 'Domingo' }
]

function Patota() {
  const { id } = useParams()
  const [patota, setPatota] = useState(null)
  const [arrayMembros, setArrayMembros] = useState([])
  const [arraySolicitacoes, setArraySolicitacoes] = useState([])
  const [abaAtiva, setAbaAtiva] = useState('visao-geral')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [ehPresidente, setEhPresidente] = useState(false)
  const [ehMembro, setEhMembro] = useState(false)
  const [solicitacaoPendente, setSolicitacaoPendente] = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalMensagem, setModalMensagem] = useState({ aberto: false, titulo: '', mensagem: '' })
  const [userId, setUserId] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    carregarDados()
  }, [id])

  async function carregarDados() {
    const { data } = await supabase.auth.getUser()

    if (!data || !data.user) {
      setErro('Usuário não autenticado.')
      setCarregando(false)
      return
    }

    setUserId(data.user.id)

    try {
      // Busca dados da patota
      const respostaPatota = await api.get('/patotas/' + id)
      setPatota(respostaPatota.data)

      // Verifica membresia do usuário
      const respostaMembresia = await api.get('/patotas/' + id + '/verificar-membro/' + data.user.id)
      const membresia = respostaMembresia.data

      setEhMembro(membresia.ehMembro)
      setSolicitacaoPendente(membresia.solicitacaoPendente)

      if (membresia.role === 'PRESIDENTE') {
        setEhPresidente(true)
      }

      // Se é membro, busca membros e solicitações (se presidente)
      if (membresia.ehMembro) {
        const respostaMembros = await api.get('/patotas/' + id + '/membros')
        setArrayMembros(respostaMembros.data)

        if (membresia.role === 'PRESIDENTE') {
          const respostaSolicitacoes = await api.get('/patotas/' + id + '/solicitacoes')
          setArraySolicitacoes(respostaSolicitacoes.data)
        }
      }

      setCarregando(false)
    } 
    catch (erroRequisicao) {
      console.error('Erro ao carregar patota:', erroRequisicao)
      setErro('Erro ao carregar dados da patota.')
      setCarregando(false)
    }
  }

  async function handleExcluir() {
    try {
      await api.delete('/patotas/' + id)
      navigate('/minhas-patotas')
    } catch (erroRequisicao) {
      console.error('Erro ao excluir patota:', erroRequisicao)
      setErro('Erro ao excluir patota.')
      setModalExcluirAberto(false)
    }
  }

  async function handleSolicitar() {
    setErro('')
    try {
      await api.post('/patotas/' + id + '/solicitar', { usuarioId: userId })
      setSolicitacaoPendente(true)
    } 
    catch (erroRequisicao) {
      console.error('Erro ao solicitar entrada:', erroRequisicao)
      if (erroRequisicao.response && erroRequisicao.response.status === 409) {
        setSolicitacaoPendente(true)
      } else if (erroRequisicao.response && erroRequisicao.response.status === 403) {
        setModalMensagem({ aberto: true, titulo: 'Modalidade incompatível', mensagem: erroRequisicao.response.data.erro })
      } else {
        setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao solicitar entrada. Tente novamente.' })
      }
    }
  }

  async function handleResponderSolicitacao(solicitacaoId, decisao) {
    try {
      await api.put('/patotas/' + id + '/solicitacoes/' + solicitacaoId, { decisao: decisao })

      // Remove a solicitação da lista
      const arrayAtualizado = []
      for (const sol of arraySolicitacoes) {
        if (sol.id !== solicitacaoId) {
          arrayAtualizado.push(sol)
        }
      }
      setArraySolicitacoes(arrayAtualizado)

      // Se aceitou, recarrega membros
      if (decisao === 'ACEITO') {
        const respostaMembros = await api.get('/patotas/' + id + '/membros')
        setArrayMembros(respostaMembros.data)
      }
    } catch (erroRequisicao) {
      console.error('Erro ao responder solicitação:', erroRequisicao)
    }
  }

  function obterNomeDia(diaId) {
    for (const dia of arrayDiasSemana) {
      if (dia.id === diaId) {
        return dia.nome
      }
    }
    return ''
  }

  function formatarHora(hora) {
    if (!hora) return ''
    return hora.substring(0, 5)
  }

  if (carregando) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-gray-500 text-center">Carregando...</p>
      </main>
    )
  }

  if (erro) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-red-500 text-center">{erro}</p>
      </main>
    )
  }

  // Se NÃO é membro, exibe apenas visão geral + botão solicitar
  if (!ehMembro) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{patota.nome}</h1>
          <p className="text-sm text-gray-500">{patota.modalidadeNome}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Modalidade</p>
              <p className="text-gray-800 font-medium">{patota.modalidadeNome}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Presidente</p>
              <p className="text-gray-800 font-medium">{patota.presidenteNome}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Endereço</p>
              <p className="text-gray-800 font-medium">{patota.rua} — {patota.cidade}/{patota.estado}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Membros</p>
              <p className="text-gray-800 font-medium">{patota.quantidadeMembros} jogador(es)</p>
            </div>

            {patota.diaHabitual && (
              <div>
                <p className="text-sm text-gray-500">Dia habitual</p>
                <p className="text-gray-800 font-medium">{obterNomeDia(patota.diaHabitual)}</p>
              </div>
            )}

            {patota.horaHabitual && (
              <div>
                <p className="text-sm text-gray-500">Horário habitual</p>
                <p className="text-gray-800 font-medium">{formatarHora(patota.horaHabitual)}</p>
              </div>
            )}

            {patota.descricao && (
              <div className="sm:col-span-2">
                <p className="text-sm text-gray-500">Descrição</p>
                <p className="text-gray-800">{patota.descricao}</p>
              </div>
            )}
          </div>

          {/* Botão solicitar entrada */}
          <div className="mt-6">
            {solicitacaoPendente ? (
              <p className="text-sm text-yellow-600 font-medium bg-yellow-50 px-4 py-2 rounded-lg inline-block">
                Solicitação enviada — aguardando aprovação do presidente
              </p>
            ) : (
              <button
                onClick={handleSolicitar}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Solicitar entrada
              </button>
            )}
          </div>
        </div>

        {/* Modal de mensagem */}
        <ModalMensagem
          aberto={modalMensagem.aberto}
          titulo={modalMensagem.titulo}
          mensagem={modalMensagem.mensagem}
          onFechar={() => setModalMensagem({ aberto: false, titulo: '', mensagem: '' })}
        />
      </main>
    )
  }

  // Se É membro, exibe tela completa com abas
  const arrayAbas = [
    { id: 'visao-geral', nome: 'Visão Geral' },
    { id: 'jogos', nome: 'Jogos' },
    { id: 'membros', nome: 'Membros' }
  ]

  if (ehPresidente) {
    arrayAbas.push({ id: 'relatorios', nome: 'Relatórios' })
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      {/* Nome da patota */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{patota.nome}</h1>
        <p className="text-sm text-gray-500">{patota.modalidadeNome}</p>
      </div>

      {/* Abas */}
      <div className="flex border-b border-gray-200 mb-6">
        {arrayAbas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${abaAtiva === aba.id ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {aba.nome}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      {abaAtiva === 'visao-geral' && (
        <AbaVisaoGeral patota={patota} ehPresidente={ehPresidente} obterNomeDia={obterNomeDia} formatarHora={formatarHora} onExcluir={() => setModalExcluirAberto(true)} />
      )}

      {abaAtiva === 'jogos' && (
        <AbaJogos ehPresidente={ehPresidente} />
      )}

      {abaAtiva === 'membros' && (
        <AbaMembros arrayMembros={arrayMembros} ehPresidente={ehPresidente} arraySolicitacoes={arraySolicitacoes} onResponder={handleResponderSolicitacao} />
      )}

      {abaAtiva === 'relatorios' && (
        <AbaRelatorios />
      )}

      {/* Modal de confirmação de exclusão */}
      <ModalConfirmacao
        aberto={modalExcluirAberto}
        titulo="Excluir patota"
        mensagem="Tem certeza que deseja excluir esta patota? Essa ação não pode ser desfeita."
        textoBotaoConfirmar="Excluir"
        onConfirmar={handleExcluir}
        onCancelar={() => setModalExcluirAberto(false)}
      />
    </main>
  )
}

// Aba Visão Geral
function AbaVisaoGeral({ patota, ehPresidente, obterNomeDia, formatarHora, onExcluir }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Modalidade</p>
          <p className="text-gray-800 font-medium">{patota.modalidadeNome}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Presidente</p>
          <p className="text-gray-800 font-medium">{patota.presidenteNome}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Endereço</p>
          <p className="text-gray-800 font-medium">{patota.rua} — {patota.cidade}/{patota.estado}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Membros</p>
          <p className="text-gray-800 font-medium">{patota.quantidadeMembros} jogador(es)</p>
        </div>

        {patota.diaHabitual && (
          <div>
            <p className="text-sm text-gray-500">Dia habitual</p>
            <p className="text-gray-800 font-medium">{obterNomeDia(patota.diaHabitual)}</p>
          </div>
        )}

        {patota.horaHabitual && (
          <div>
            <p className="text-sm text-gray-500">Horário habitual</p>
            <p className="text-gray-800 font-medium">{formatarHora(patota.horaHabitual)}</p>
          </div>
        )}

        {patota.descricao && (
          <div className="sm:col-span-2">
            <p className="text-sm text-gray-500">Descrição</p>
            <p className="text-gray-800">{patota.descricao}</p>
          </div>
        )}
      </div>

      {/* Ações do presidente */}
      {ehPresidente && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-3">
            <Link
              to={'/patota/' + patota.id + '/editar'}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Editar patota
            </Link>
            <Link
              to={'/patota/' + patota.id + '/criar-partida'}
              className="border border-green-600 text-green-600 hover:bg-green-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Criar partida
            </Link>
          </div>
          <button
            onClick={onExcluir}
            className="border border-red-500 text-red-500 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Excluir patota
          </button>
        </div>
      )}
    </div>
  )
}

// Aba Jogos (placeholder)
function AbaJogos({ ehPresidente }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
      <p className="text-gray-500 text-lg mb-2">Nenhuma partida registrada ainda.</p>
      <p className="text-gray-400 text-sm">As partidas aparecerão aqui quando forem criadas.</p>
    </div>
  )
}

// Aba Membros
function AbaMembros({ arrayMembros, ehPresidente, arraySolicitacoes, onResponder }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
      {/* Solicitações pendentes (apenas presidente) */}
      {ehPresidente && arraySolicitacoes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-yellow-700 mb-3">
            Solicitações pendentes ({arraySolicitacoes.length})
          </h3>
          <div className="flex flex-col gap-3">
            {arraySolicitacoes.map((solicitacao) => (
              <div key={solicitacao.id} className="flex items-center gap-4 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                {/* Foto */}
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-yellow-200 flex-shrink-0">
                  {solicitacao.foto ? (
                    <img
                      src={solicitacao.foto}
                      alt={solicitacao.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-yellow-100 flex items-center justify-center">
                      <span className="text-yellow-700 font-bold text-sm">
                        {solicitacao.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Nome */}
                <div className="flex-1">
                  <p className="text-gray-800 font-medium text-sm">{solicitacao.nome}</p>
                </div>

                {/* Botões aceitar/recusar */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onResponder(solicitacao.id, 'ACEITO')}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => onResponder(solicitacao.id, 'RECUSADO')}
                    className="border border-red-500 text-red-500 hover:bg-red-50 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <hr className="mt-6 border-gray-200" />
        </div>
      )}

      {/* Lista de membros */}
      {arrayMembros.length === 0 && (
        <p className="text-gray-500 text-center">Nenhum membro encontrado.</p>
      )}

      {arrayMembros.length > 0 && (
        <div className="flex flex-col gap-4">
          {arrayMembros.map((membro) => (
            <div key={membro.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              {/* Foto */}
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-green-200 flex-shrink-0">
                {membro.foto ? (
                  <img
                    src={membro.foto}
                    alt={membro.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">
                      {membro.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Dados */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-gray-800 font-medium">{membro.nome}</p>
                  {membro.role === 'PRESIDENTE' && (
                    <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                      Presidente
                    </span>
                  )}
                </div>
                {membro.posicoes.length > 0 && (
                  <p className="text-sm text-gray-500">{membro.posicoes.join(', ')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Aba Relatórios (placeholder - somente presidente)
function AbaRelatorios() {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
      <p className="text-gray-500 text-lg mb-2">Em breve</p>
      <p className="text-gray-400 text-sm">Os relatórios estarão disponíveis nas próximas atualizações.</p>
    </div>
  )
}

export default Patota
