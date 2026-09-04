import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import ModalConfirmacao from '../../components/ModalConfirmacao.jsx'
import ModalMensagem from '../../components/ModalMensagem.jsx'
import Avatar from '../../components/Avatar.jsx'
import { Trash2 } from 'lucide-react';

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
  const [membroParaExcluir, setMembroParaExcluir] = useState(null)
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

  async function handleExcluirPatota() {
    try {
      await api.delete('/patotas/' + id)
      navigate('/minhas-patotas')
    } catch (erroRequisicao) {
      console.error('Erro ao excluir patota:', erroRequisicao)
      setErro('Erro ao excluir patota.')
      setModalExcluirAberto(false)
    }
  }

  async function handleExcluirMembro() {
    if (!membroParaExcluir) return

    try {
      await api.delete('/patotas/' + id + '/membros/' + membroParaExcluir.id)

      // Remove o membro da lista local
      const arrayAtualizado = []
      for (const membro of arrayMembros) {
        if (membro.id !== membroParaExcluir.id) {
          arrayAtualizado.push(membro)
        }
      }
      setArrayMembros(arrayAtualizado)

      setMembroParaExcluir(null)
    } 
    catch (erroRequisicao) {
      console.error('Erro ao excluir membro da patota:', erroRequisicao)
      setMembroParaExcluir(null)
      setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao excluir membro da patota.' })
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
              <p className="text-gray-800 font-medium">{patota.quantidadeMembros} jogadores</p>
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
        <AbaJogos patotaId={id} usuarioId={userId} />
      )}

      {abaAtiva === 'membros' && (
        <AbaMembros arrayMembros={arrayMembros} ehPresidente={ehPresidente} arraySolicitacoes={arraySolicitacoes} onResponder={handleResponderSolicitacao} onExcluirMembro={(membro) => setMembroParaExcluir(membro)} />
      )}

      {abaAtiva === 'relatorios' && (
        <AbaRelatorios patotaId={id} usuarioId={userId} formatarData={formatarData} formatarHora={formatarHora} />
      )}

      {/* Modal de confirmação de exclusão */}
      <ModalConfirmacao
        aberto={modalExcluirAberto}
        titulo="Excluir patota"
        mensagem="Tem certeza que deseja excluir esta patota? Essa ação não pode ser desfeita."
        textoBotaoConfirmar="Excluir"
        onConfirmar={handleExcluirPatota}
        onCancelar={() => setModalExcluirAberto(false)}
      />

      {/* Modal de confirmação de exclusão de membro */}
      <ModalConfirmacao
        aberto={!!membroParaExcluir}
        titulo="Excluir membro"
        mensagem={membroParaExcluir ? 'Tem certeza que deseja remover ' + membroParaExcluir.nome + ' da patota?' : ''}
        textoBotaoConfirmar="Excluir"
        onConfirmar={handleExcluirMembro}
        onCancelar={() => setMembroParaExcluir(null)}
      />

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
          <p className="text-gray-800 font-medium">{patota.quantidadeMembros} jogadores</p>
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

// Formata a data (timestamp) para o padrão dd/mm/aaaa
function formatarData(data) {
  if (!data) return ''
  const dataObj = new Date(data)
  const dia = String(dataObj.getUTCDate()).padStart(2, '0')
  const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0')
  const ano = dataObj.getUTCFullYear()
  return dia + '/' + mes + '/' + ano
}

// Card de uma partida (data, horário, local, vagas) — clicável para a tela DetalhesPartida.
// Quando há avaliação pendente do usuário logado, o card recebe um destaque âmbar
// e exibe um selo "Avaliação pendente" para lembrar o jogador de avaliar seus companheiros.
function CardPartida({ partida }) {
  let classeCard = 'flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer '
  if (partida.avaliacaoPendente) {
    classeCard = classeCard + 'border-amber-300 bg-amber-50 hover:bg-amber-100'
  }
  else {
    classeCard = classeCard + 'border-gray-100 bg-gray-50 hover:bg-gray-100'
  }

  return (
    <Link
      to={'/partida/' + partida.id}
      className={classeCard}
    >
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-gray-800 font-medium">
            {formatarData(partida.data)} às {partida.horario}
          </p>
          {partida.avaliacaoPendente && (
            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
              Avaliação pendente
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{partida.local}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-500">Vagas</p>
        <p className="text-gray-800 font-medium">
          {partida.vagasPreenchidas}/{partida.vagasTotal}
        </p>
      </div>
    </Link>
  )
}

// Aba Jogos
function AbaJogos({ patotaId, usuarioId }) {
  const [arrayProximos, setArrayProximos] = useState([])
  const [arrayFinalizados, setArrayFinalizados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregarPartidas()
  }, [patotaId, usuarioId])

  async function carregarPartidas() {
    setCarregando(true)
    setErro('')
    try {
      const resposta = await api.get('/partidas/patota/' + patotaId, {
        params: { usuarioId: usuarioId }
      })
      setArrayProximos(resposta.data.proximos)
      setArrayFinalizados(resposta.data.finalizados)
      setCarregando(false)
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar partidas:', erroRequisicao)
      setErro('Erro ao carregar partidas.')
      setCarregando(false)
    }
  }

  if (carregando) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
        <p className="text-gray-500">Carregando partidas...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
        <p className="text-red-500">{erro}</p>
      </div>
    )
  }

  const semPartidas = arrayProximos.length === 0 && arrayFinalizados.length === 0

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
      {semPartidas && (
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-2">Nenhuma partida registrada ainda.</p>
          <p className="text-gray-400 text-sm">As partidas aparecerão aqui quando forem criadas.</p>
        </div>
      )}

      {/* Próximos jogos */}
      {arrayProximos.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Próximos jogos</h3>
          <div className="flex flex-col gap-3">
            {arrayProximos.map((partida) => (
              <CardPartida key={partida.id} partida={partida} />
            ))}
          </div>
        </div>
      )}

      {/* Jogos finalizados */}
      {arrayFinalizados.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Jogos finalizados</h3>
          <div className="flex flex-col gap-3">
            {arrayFinalizados.map((partida) => (
              <CardPartida key={partida.id} partida={partida} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Aba Membros
function AbaMembros({ arrayMembros, ehPresidente, arraySolicitacoes, onResponder, onExcluirMembro }) {
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
                <Avatar nome={solicitacao.nome} foto={solicitacao.foto} tamanho="md" corBorda="amarela" />

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
              <Avatar nome={membro.nome} foto={membro.foto} tamanho="lg" corBorda="verde" />

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

              {ehPresidente && membro.role !== 'PRESIDENTE' && (
                <div>
                  <button
                    onClick={() => onExcluirMembro(membro)}
                    className="text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                    title="Excluir membro"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Barra de percentual de frequência
function BarraFrequencia({ percentual }) {
  let classeCor = 'bg-red-400'
  if (percentual >= 75) {
    classeCor = 'bg-green-500'
  } else if (percentual >= 40) {
    classeCor = 'bg-yellow-400'
  }

  const estiloLargura = { width: percentual + '%' }

  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={'h-2 rounded-full transition-all ' + classeCor} style={estiloLargura}></div>
    </div>
  )
}

// Aba Relatórios (somente presidente)
function AbaRelatorios({ patotaId, usuarioId, formatarData, formatarHora }) {
  const [subAba, setSubAba] = useState('presenca')

  const arraySubAbas = [
    { id: 'presenca', nome: 'Presença' },
    { id: 'mensalidades', nome: 'Mensalidades' },
    { id: 'caixa', nome: 'Caixa' }
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-abas do relatório */}
      <div className="flex gap-2 flex-wrap">
        {arraySubAbas.map((item) => (
          <button
            key={item.id}
            onClick={() => setSubAba(item.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer ${subAba === item.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {item.nome}
          </button>
        ))}
      </div>

      {subAba === 'presenca' && (
        <RelatorioPresenca patotaId={patotaId} usuarioId={usuarioId} formatarData={formatarData} formatarHora={formatarHora} />
      )}

      {subAba === 'mensalidades' && (
        <RelatorioMensalidades patotaId={patotaId} usuarioId={usuarioId} />
      )}

      {subAba === 'caixa' && (
        <RelatorioCaixa patotaId={patotaId} usuarioId={usuarioId} />
      )}
    </div>
  )
}

function obterDataAtual() {
  const dataAtual = new Date()
  const ano = dataAtual.getFullYear()
  const mes = String(dataAtual.getMonth() + 1).padStart(2, '0')
  const dia = String(dataAtual.getDate()).padStart(2, '0')
  return ano + '-' + mes + '-' + dia
}

// Sub-relatório: Caixa
function RelatorioCaixa({ patotaId, usuarioId }) {
  const [caixa, setCaixa] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [tipo, setTipo] = useState('RECEITA')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataMovimentacao, setDataMovimentacao] = useState(obterDataAtual())
  const [cadastrando, setCadastrando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregarCaixa()
  }, [patotaId, usuarioId])

  async function carregarCaixa() {
    if (!usuarioId) return
    setCarregando(true)
    setErro('')
    try {
      const resposta = await api.get('/movimentacoes/patota/' + patotaId, {
        params: { usuarioId: usuarioId }
      })
      setCaixa(resposta.data)
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar caixa da patota:', erroRequisicao)
      setErro('Erro ao carregar o caixa da patota.')
    }
    finally {
      setCarregando(false)
    }
  }

  function limparFormulario() {
    setTipo('RECEITA')
    setDescricao('')
    setValor('')
    setDataMovimentacao(obterDataAtual())
  }

  function fecharFormulario() {
    limparFormulario()
    setFormularioAberto(false)
    setErro('')
  }

  async function cadastrarMovimentacao(evento) {
    evento.preventDefault()
    const valorNumerico = Number(valor)
    if (!descricao.trim() || !Number.isFinite(valorNumerico) || valorNumerico <= 0 || !dataMovimentacao) {
      setErro('Preencha corretamente todos os campos da movimentação.')
      return
    }

    setCadastrando(true)
    setErro('')
    try {
      await api.post('/movimentacoes/patota/' + patotaId, {
        usuarioId: usuarioId,
        tipo: tipo,
        descricao: descricao.trim(),
        valor: valorNumerico,
        dataMovimentacao: dataMovimentacao
      })
      limparFormulario()
      setFormularioAberto(false)
      await carregarCaixa()
    }
    catch (erroRequisicao) {
      console.error('Erro ao cadastrar movimentação:', erroRequisicao)
      setErro('Erro ao registrar a movimentação.')
    }
    finally {
      setCadastrando(false)
    }
  }

  if (carregando && !caixa) {
    return <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center text-gray-500">Carregando caixa...</div>
  }

  return (
    <div className="flex flex-col gap-5">
      {caixa && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ResumoCaixa rotulo="Saldo atual" valor={caixa.saldo} tipo="SALDO" />
          <ResumoCaixa rotulo="Total de receitas" valor={caixa.receitas} tipo="RECEITA" />
          <ResumoCaixa rotulo="Total de despesas" valor={caixa.despesas} tipo="DESPESA" />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md p-5 sm:p-6 border border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Movimentações</h3>
            <p className="text-xs text-gray-500 mt-1">Registre receitas e despesas da patota.</p>
          </div>
          {!formularioAberto && (
            <button type="button" onClick={() => setFormularioAberto(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer">Nova movimentação</button>
          )}
        </div>

        {formularioAberto && (
          <form onSubmit={cadastrarMovimentacao} className="mt-5 pt-5 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tipo-movimentacao" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select id="tipo-movimentacao" value={tipo} onChange={(evento) => setTipo(evento.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="RECEITA">Receita</option>
                  <option value="DESPESA">Despesa</option>
                </select>
              </div>
              <div>
                <label htmlFor="data-movimentacao" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input id="data-movimentacao" type="date" value={dataMovimentacao} onChange={(evento) => setDataMovimentacao(evento.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label htmlFor="descricao-movimentacao" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input id="descricao-movimentacao" type="text" value={descricao} onChange={(evento) => setDescricao(evento.target.value)} placeholder="Ex.: Aluguel da quadra" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label htmlFor="valor-movimentacao" className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <input id="valor-movimentacao" type="number" min="0.01" step="0.01" value={valor} onChange={(evento) => setValor(evento.target.value)} placeholder="0,00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={fecharFormulario} disabled={cadastrando} className="border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer">Cancelar</button>
              <button type="submit" disabled={cadastrando} className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer">{cadastrando ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </form>
        )}

        {erro && <p className="mt-4 text-sm text-red-500">{erro}</p>}
      </div>

      {caixa && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Histórico</h3>
          </div>
          {caixa.movimentacoes.length === 0 && <p className="p-6 text-center text-gray-500">Nenhuma movimentação registrada.</p>}
          <div className="divide-y divide-gray-100">
            {caixa.movimentacoes.map((movimentacao) => (
              <LinhaMovimentacao key={movimentacao.id} movimentacao={movimentacao} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ResumoCaixa({ rotulo, valor, tipo }) {
  let classeValor = 'text-gray-800'
  if (tipo === 'RECEITA') classeValor = 'text-green-700'
  if (tipo === 'DESPESA') classeValor = 'text-red-600'
  if (tipo === 'SALDO' && valor < 0) classeValor = 'text-red-600'

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{rotulo}</p>
      <p className={'text-xl font-bold ' + classeValor}>{formatarMoeda(valor)}</p>
    </div>
  )
}

function LinhaMovimentacao({ movimentacao }) {
  const receita = movimentacao.tipo === 'RECEITA'
  let classeTipo = 'bg-red-100 text-red-700'
  let textoTipo = 'Despesa'
  let prefixoValor = '- '
  if (receita) {
    classeTipo = 'bg-green-100 text-green-700'
    textoTipo = 'Receita'
    prefixoValor = '+ '
  }

  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-gray-800 font-medium">{movimentacao.descricao}</p>
          {movimentacao.mensalidadeId && <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">Mensalidade</span>}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {formatarData(movimentacao.dataMovimentacao)}
          {movimentacao.registradoPorNome && ' · Registrado por ' + movimentacao.registradoPorNome}
        </p>
      </div>
      <span className={'self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-full ' + classeTipo}>{textoTipo}</span>
      <p className={receita ? 'font-semibold text-green-700 sm:w-32 sm:text-right' : 'font-semibold text-red-600 sm:w-32 sm:text-right'}>{prefixoValor}{formatarMoeda(movimentacao.valor)}</p>
    </div>
  )
}

function obterMesAtual() {
  const dataAtual = new Date()
  return dataAtual.getFullYear() + '-' + String(dataAtual.getMonth() + 1).padStart(2, '0')
}

function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Sub-relatório: Mensalidades
function RelatorioMensalidades({ patotaId, usuarioId }) {
  const [mesReferencia, setMesReferencia] = useState(obterMesAtual())
  const [relatorio, setRelatorio] = useState(null)
  const [valorMensalidade, setValorMensalidade] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvandoValor, setSalvandoValor] = useState(false)
  const [membroAtualizando, setMembroAtualizando] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregarRelatorio()
  }, [patotaId, usuarioId, mesReferencia])

  async function carregarRelatorio() {
    if (!usuarioId) return
    setCarregando(true)
    setErro('')
    try {
      const resposta = await api.get('/mensalidades/patota/' + patotaId, {
        params: { usuarioId: usuarioId, mesReferencia: mesReferencia }
      })
      setRelatorio(resposta.data)
      setValorMensalidade(String(resposta.data.valorMensalidade))
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar relatório de mensalidades:', erroRequisicao)
      setErro('Erro ao carregar o relatório de mensalidades.')
    }
    finally {
      setCarregando(false)
    }
  }

  async function salvarValor(evento) {
    evento.preventDefault()
    const valor = Number(valorMensalidade)
    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Informe um valor de mensalidade válido.')
      return
    }

    setSalvandoValor(true)
    setErro('')
    try {
      await api.put('/mensalidades/patota/' + patotaId + '/valor', { usuarioId: usuarioId, valor: valor })
      await carregarRelatorio()
    }
    catch (erroRequisicao) {
      console.error('Erro ao salvar valor da mensalidade:', erroRequisicao)
      setErro('Erro ao salvar o valor da mensalidade.')
    }
    finally {
      setSalvandoValor(false)
    }
  }

  async function alternarStatus(mensalidade) {
    let novoStatus = 'PAGO'
    if (mensalidade.status === 'PAGO') novoStatus = 'PENDENTE'

    setMembroAtualizando(mensalidade.usuarioId)
    setErro('')
    try {
      await api.put('/mensalidades/patota/' + patotaId + '/membros/' + mensalidade.usuarioId, {
        usuarioId: usuarioId,
        mesReferencia: mesReferencia,
        status: novoStatus
      })
      await carregarRelatorio()
    }
    catch (erroRequisicao) {
      console.error('Erro ao atualizar mensalidade:', erroRequisicao)
      setErro('Erro ao atualizar o status da mensalidade.')
    }
    finally {
      setMembroAtualizando(null)
    }
  }

  if (carregando && !relatorio) {
    return <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center text-gray-500">Carregando relatório...</div>
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-2xl shadow-md p-5 sm:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <div>
            <label htmlFor="mes-mensalidades" className="block text-sm font-medium text-gray-700 mb-1">Mês de referência</label>
            <input id="mes-mensalidades" type="month" value={mesReferencia} onChange={(evento) => setMesReferencia(evento.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <form onSubmit={salvarValor}>
            <label htmlFor="valor-mensalidade" className="block text-sm font-medium text-gray-700 mb-1">Valor vigente</label>
            <div className="flex gap-2">
              <input id="valor-mensalidade" type="number" min="0.01" step="0.01" value={valorMensalidade} onChange={(evento) => setValorMensalidade(evento.target.value)} className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
              <button type="submit" disabled={salvandoValor} className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer">
                {salvandoValor ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
        {erro && <p className="mt-4 text-sm text-red-500">{erro}</p>}
      </div>

      {relatorio && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ResumoMensalidade rotulo="Membros" valor={relatorio.quantidadeMembros} />
            <ResumoMensalidade rotulo="Pagas" valor={relatorio.quantidadePagas} cor="verde" />
            <ResumoMensalidade rotulo="Pendentes" valor={relatorio.quantidadePendentes} cor="amarelo" />
            <ResumoMensalidade rotulo="Recebido" valor={formatarMoeda(relatorio.totalRecebido)} />
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            {relatorio.mensalidades.length === 0 && <p className="p-6 text-center text-gray-500">Nenhum membro ativo nesta patota.</p>}
            <div className="divide-y divide-gray-100">
              {relatorio.mensalidades.map((mensalidade) => (
                <LinhaMensalidade key={mensalidade.usuarioId} mensalidade={mensalidade} atualizando={membroAtualizando === mensalidade.usuarioId} onAlternar={alternarStatus} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function LinhaMensalidade({ mensalidade, atualizando, onAlternar }) {
  const pago = mensalidade.status === 'PAGO'
  let classeStatus = 'bg-yellow-100 text-yellow-700'
  let classeBotao = 'border-green-600 text-green-700 hover:bg-green-50'
  let textoStatus = 'Pendente'
  let textoBotao = 'Marcar como paga'
  if (pago) {
    classeStatus = 'bg-green-100 text-green-700'
    classeBotao = 'border-red-500 text-red-600 hover:bg-red-50'
    textoStatus = 'Pago'
    textoBotao = 'Reverter para pendente'
  }
  if (atualizando) textoBotao = 'Atualizando...'

  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar nome={mensalidade.nome} foto={mensalidade.foto} tamanho="md" />
        <div className="min-w-0">
          <p className="text-gray-800 font-medium truncate">{mensalidade.nome}</p>
          <p className="text-sm text-gray-500">{formatarMoeda(mensalidade.valor)}</p>
        </div>
      </div>
      <span className={'self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-full ' + classeStatus}>{textoStatus}</span>
      <button type="button" disabled={atualizando} onClick={() => onAlternar(mensalidade)} className={'sm:w-48 border disabled:opacity-50 text-sm font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer ' + classeBotao}>{textoBotao}</button>
    </div>
  )
}

function ResumoMensalidade({ rotulo, valor, cor }) {
  let classeValor = 'text-gray-800'
  if (cor === 'verde') classeValor = 'text-green-700'
  if (cor === 'amarelo') classeValor = 'text-yellow-600'
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{rotulo}</p>
      <p className={'text-xl font-bold ' + classeValor}>{valor}</p>
    </div>
  )
}

// Sub-relatório: Presença
function RelatorioPresenca({ patotaId, usuarioId, formatarData, formatarHora }) {
  const [relatorio, setRelatorio] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [partidaExpandida, setPartidaExpandida] = useState(null)

  useEffect(() => {
    carregarRelatorio()
  }, [patotaId, usuarioId])

  async function carregarRelatorio() {
    if (!usuarioId) return

    setCarregando(true)
    setErro('')
    try {
      const resposta = await api.get('/patotas/' + patotaId + '/relatorios/presenca', {
        params: { usuarioId: usuarioId }
      })
      setRelatorio(resposta.data)
      setCarregando(false)
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar relatório de presença:', erroRequisicao)
      setErro('Erro ao carregar o relatório de presença.')
      setCarregando(false)
    }
  }

  function alternarPartida(partidaId) {
    if (partidaExpandida === partidaId) {
      setPartidaExpandida(null)
    } else {
      setPartidaExpandida(partidaId)
    }
  }

  if (carregando) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
        <p className="text-gray-500">Carregando relatório...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
        <p className="text-red-500">{erro}</p>
      </div>
    )
  }

  if (!relatorio || relatorio.totalPartidas === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
        <p className="text-gray-500 text-lg mb-2">Nenhuma partida realizada ainda.</p>
        <p className="text-gray-400 text-sm">A frequência dos jogadores aparecerá aqui após partidas finalizadas.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Frequência por jogador */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Frequência dos jogadores</h3>
          <span className="text-xs text-gray-500">
            {relatorio.totalPartidas} partida(s) realizada(s)
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {relatorio.frequencia.map((jogador) => (
            <div key={jogador.id} className="flex items-center gap-4">
              <Avatar nome={jogador.nome} foto={jogador.foto} tamanho="md" />

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-gray-800 font-medium text-sm">{jogador.nome}</p>
                  <p className="text-xs text-gray-500">
                    {jogador.presencas}/{jogador.totalPartidas} · {jogador.percentual}%
                  </p>
                </div>
                <BarraFrequencia percentual={jogador.percentual} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de partidas realizadas com presentes */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Partidas realizadas</h3>

        <div className="flex flex-col gap-3">
          {relatorio.partidas.map((partida) => (
            <div key={partida.id} className="rounded-lg border border-gray-100 bg-gray-50">
              <button
                onClick={() => alternarPartida(partida.id)}
                className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-gray-100 transition-colors rounded-lg"
              >
                <div>
                  <p className="text-gray-800 font-medium">
                    {formatarData(partida.data)} às {formatarHora(partida.horario) || partida.horario}
                  </p>
                  <p className="text-sm text-gray-500">{partida.local}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Presentes</p>
                  <p className="text-gray-800 font-medium">{partida.totalPresentes}</p>
                </div>
              </button>

              {partidaExpandida === partida.id && (
                <div className="px-4 pb-4">
                  {partida.presentes.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhum jogador presente nesta partida.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200">
                      {partida.presentes.map((jogador) => (
                        <div key={jogador.id} className="flex items-center gap-2 bg-white px-2 py-1 rounded-full border border-gray-100">
                          <Avatar nome={jogador.nome} foto={jogador.foto} tamanho="sm" />
                          <span className="text-sm text-gray-700 pr-1">{jogador.nome}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Patota
