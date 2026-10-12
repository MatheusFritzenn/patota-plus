import { CarregamentoPagina, CarregamentoConteudo, IndicadorCarregamento } from '../../components/Carregamento.jsx'
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import ModalConfirmacao from '../../components/ModalConfirmacao.jsx'
import ModalMensagem from '../../components/ModalMensagem.jsx'
import Avatar from '../../components/Avatar.jsx'
import { excluirEmblema } from '../../services/emblemasPatotas.js'
import EmblemaPatota from '../../components/EmblemaPatota.jsx'
import { ArrowUpRight, CalendarDays, CalendarClock, ChartNoAxesCombined, ChevronRight, Crown, LayoutDashboard, LockKeyhole, LogOut, MapPin, Pencil, Plus, Trash2, UsersRound } from 'lucide-react'
import './style.css'

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
  const [modalSairAberto, setModalSairAberto] = useState(false)
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
      const respostaMembresia = await api.get('/patotas/' + id + '/verificar-membro')
      const membresia = respostaMembresia.data

      setEhMembro(membresia.ehMembro)
      setSolicitacaoPendente(membresia.solicitacaoPendente)

      setEhPresidente(membresia.role === 'PRESIDENTE')

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
      if (patota.emblemaPath) {
        try {
          await excluirEmblema(patota.emblemaPath)
        } catch (erroExclusao) {
          console.warn('Não foi possível remover o emblema da patota excluída:', erroExclusao)
        }
      }
      navigate('/minhas-patotas')
    } catch (erroRequisicao) {
      console.error('Erro ao excluir patota:', erroRequisicao)
      setErro('Erro ao excluir patota.')
      setModalExcluirAberto(false)
    }
  }

  async function handleSairDaPatota() {
    try {
      await api.delete('/patotas/' + id + '/sair')
      navigate('/minhas-patotas', { replace: true })
    }
    catch (erroRequisicao) {
      console.error('Erro ao sair da patota:', erroRequisicao)
      setModalSairAberto(false)
      let mensagem = 'Não foi possível sair da patota. Tente novamente.'
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        mensagem = erroRequisicao.response.data.erro
      }
      setModalMensagem({ aberto: true, titulo: 'Erro ao sair da patota', mensagem: mensagem })
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
      await api.post('/patotas/' + id + '/solicitar')
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
    return <CarregamentoPagina tipo="detalhes" mensagem="Carregando patota e membros..." />
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
      <main className="patota-pagina max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <CabecalhoPatota patota={patota} ehPresidente={false} obterNomeDia={obterNomeDia} formatarHora={formatarHora} />
        <AbaVisaoGeral patota={patota} ehPresidente={false} podeSair={false} obterNomeDia={obterNomeDia} formatarHora={formatarHora} />
        <div className="mt-5">
          {solicitacaoPendente ? (
            <p role="status" className="text-sm text-amber-800 font-medium bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
              Solicitação enviada — aguardando aprovação do presidente
            </p>
          ) : (
            <button type="button" onClick={handleSolicitar} className="patota-botao patota-botao-primario">
              <Plus size={17} aria-hidden="true" />Solicitar entrada
            </button>
          )}
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
    { id: 'visao-geral', nome: 'Visão geral', icone: LayoutDashboard },
    { id: 'jogos', nome: 'Jogos', icone: CalendarDays },
    { id: 'membros', nome: 'Membros', icone: UsersRound }
  ]

  if (ehPresidente) {
    arrayAbas.push({ id: 'relatorios', nome: 'Relatórios', icone: ChartNoAxesCombined })
  }

  return (
    <main className="patota-pagina max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
      <CabecalhoPatota patota={patota} ehPresidente={ehPresidente} obterNomeDia={obterNomeDia} formatarHora={formatarHora} />
      <AbasPatota arrayAbas={arrayAbas} abaAtiva={abaAtiva} onAlterar={setAbaAtiva} prefixo="patota" rotulo="Abas da patota" />

      <div id="patota-painel" role="tabpanel" tabIndex={0} aria-labelledby={'patota-aba-' + abaAtiva}>
      {/* Conteúdo das abas */}
      {abaAtiva === 'visao-geral' && (
        <AbaVisaoGeral patota={patota} ehPresidente={ehPresidente} podeSair={!ehPresidente && patota.presidenteId !== userId} obterNomeDia={obterNomeDia} formatarHora={formatarHora} onExcluir={() => setModalExcluirAberto(true)} onSair={() => setModalSairAberto(true)} />
      )}

      {abaAtiva === 'jogos' && (
        <AbaJogos patotaId={id} usuarioId={userId} ehPresidente={ehPresidente} />
      )}

      {abaAtiva === 'membros' && (
        <AbaMembros arrayMembros={arrayMembros} ehPresidente={ehPresidente} arraySolicitacoes={arraySolicitacoes} onResponder={handleResponderSolicitacao} onExcluirMembro={(membro) => setMembroParaExcluir(membro)} />
      )}

      {abaAtiva === 'relatorios' && (
        <AbaRelatorios patotaId={id} usuarioId={userId} formatarData={formatarData} formatarHora={formatarHora} />
      )}

      </div>

      {/* Modal de confirmação de exclusão */}
      <ModalConfirmacao
        aberto={modalExcluirAberto}
        titulo="Excluir patota"
        mensagem="Tem certeza que deseja excluir esta patota? Partidas, membros, solicitações de entrada e registros financeiros relacionados também serão removidos. Essa ação não pode ser desfeita."
        textoBotaoConfirmar="Excluir"
        onConfirmar={handleExcluirPatota}
        onCancelar={() => setModalExcluirAberto(false)}
      />

      <ModalConfirmacao
        aberto={modalSairAberto}
        titulo="Sair da patota"
        mensagem={'Tem certeza que deseja sair de ' + patota.nome + '? Você deixará de ser membro desta patota.'}
        textoBotaoConfirmar="Sair da patota"
        onConfirmar={handleSairDaPatota}
        onCancelar={() => setModalSairAberto(false)}
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

function CabecalhoPatota({ patota, ehPresidente, obterNomeDia, formatarHora }) {
  return (
    <header className="mb-6">
      <nav aria-label="Caminho da página" className="mb-4 flex items-center gap-2 text-xs text-gray-500">
        <Link to="/minhas-patotas" className="shrink-0 rounded hover:text-green-700 focus-visible:outline-green-600">Minhas patotas</Link>
        <ChevronRight size={14} className="shrink-0" aria-hidden="true" />
        <span aria-current="page" className="min-w-0 truncate">{patota.nome}</span>
      </nav>
      <div className="rounded-2xl border border-gray-100 border-t-4 border-t-green-600 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <EmblemaPatota nome={patota.nome} emblemaPath={patota.emblemaPath} />
          <div className="min-w-0">
            <h1 className="wrap-break-word text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl">{patota.nome}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="patota-etiqueta bg-green-50 text-green-700">{patota.modalidadeNome}</span>
              {ehPresidente && <span className="patota-etiqueta bg-gray-100 text-gray-600"><Crown size={14} aria-hidden="true" />Você é presidente</span>}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 border-t border-gray-100 pt-4 text-sm text-gray-500">
          <span className="flex min-w-0 items-center gap-2 wrap-break-word"><MapPin size={16} className="shrink-0" aria-hidden="true" />{patota.cidade}/{patota.estado}</span>
          <span className="flex items-center gap-2"><UsersRound size={16} aria-hidden="true" />{patota.quantidadeMembros} membros</span>
          {(patota.diaHabitual || patota.horaHabitual) && (
            <span className="flex items-center gap-2"><CalendarDays size={16} className="shrink-0" aria-hidden="true" />
              {obterNomeDia(patota.diaHabitual)}
              {patota.diaHabitual && patota.horaHabitual && ' · '}
              {formatarHora(patota.horaHabitual)}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}

function AbasPatota({ arrayAbas, abaAtiva, onAlterar, prefixo, rotulo, secundaria }) {
  function navegarComTeclado(evento, indice) {
    let proximoIndice = indice
    if (evento.key === 'ArrowRight') proximoIndice = (indice + 1) % arrayAbas.length
    else if (evento.key === 'ArrowLeft') proximoIndice = (indice + arrayAbas.length - 1) % arrayAbas.length
    else if (evento.key === 'Home') proximoIndice = 0
    else if (evento.key === 'End') proximoIndice = arrayAbas.length - 1
    else return

    evento.preventDefault()
    onAlterar(arrayAbas[proximoIndice].id)
    document.getElementById(prefixo + '-aba-' + arrayAbas[proximoIndice].id).focus()
  }

  let classeAbas = 'patota-abas'
  if (secundaria) classeAbas = 'patota-subabas'

  return (
    <div role="tablist" aria-label={rotulo} className={classeAbas}>
      {arrayAbas.map((aba, indice) => {
        const Icone = aba.icone
        let ordemFoco = -1
        if (abaAtiva === aba.id) ordemFoco = 0
        return (
          <button type="button" key={aba.id} role="tab" id={prefixo + '-aba-' + aba.id}
            aria-selected={abaAtiva === aba.id} aria-controls={prefixo + '-painel'}
            tabIndex={ordemFoco} onClick={() => onAlterar(aba.id)} onKeyDown={(evento) => navegarComTeclado(evento, indice)}>
            {Icone && <Icone size={18} aria-hidden="true" />}{aba.nome}
          </button>
        )
      })}
    </div>
  )
}

function InformacaoPatota({ icone: Icone, rotulo, children }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700"><Icone size={19} aria-hidden="true" /></span>
      <div className="min-w-0"><p className="mb-1 text-xs text-gray-500">{rotulo}</p><div className="wrap-break-word text-sm font-medium text-gray-800">{children}</div></div>
    </div>
  )
}

// Aba Visão Geral
function AbaVisaoGeral({ patota, ehPresidente, podeSair, obterNomeDia, formatarHora, onExcluir, onSair }) {
  return (
    <section className="patota-painel">
      <div className="patota-titulo">
        <div><h2>Sobre a patota</h2><p>As informações do nosso futebol.</p></div>
        {ehPresidente && <Link to={'/patota/' + patota.id + '/editar'} className="patota-botao"><Pencil size={16} aria-hidden="true" />Editar patota</Link>}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <InformacaoPatota icone={MapPin} rotulo="Local dos jogos">
          {patota.rua && <p>{patota.rua}</p>}<p>{patota.cidade}/{patota.estado}</p>
        </InformacaoPatota>
        <InformacaoPatota icone={CalendarClock} rotulo="Dia e horário habitual">
          {patota.diaHabitual || patota.horaHabitual ? (
            <p>{obterNomeDia(patota.diaHabitual)}{patota.diaHabitual && patota.horaHabitual && ', às '}{formatarHora(patota.horaHabitual)}</p>
          ) : <p className="text-gray-500">Não informado</p>}
        </InformacaoPatota>
        <InformacaoPatota icone={Crown} rotulo="Presidente">{patota.presidenteNome}</InformacaoPatota>
        <InformacaoPatota icone={UsersRound} rotulo="Nosso grupo">{patota.quantidadeMembros} jogadores</InformacaoPatota>
      </div>
      {patota.descricao && <div className="mt-6 border-t border-gray-100 pt-5"><h3 className="mb-2 text-sm font-semibold text-gray-800">Descrição</h3><p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-gray-600">{patota.descricao}</p></div>}
      {ehPresidente && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
          <Link to={'/patota/' + patota.id + '/criar-partida'} className="patota-botao patota-botao-primario"><Plus size={17} aria-hidden="true" />Criar partida</Link>
          <button type="button" onClick={onExcluir} className="patota-botao patota-botao-perigo"><Trash2 size={16} aria-hidden="true" />Excluir patota</button>
        </div>
      )}
      {podeSair && <div className="mt-6 border-t border-gray-100 pt-5"><button type="button" onClick={onSair} className="patota-botao patota-botao-perigo"><LogOut size={16} aria-hidden="true" />Sair da patota</button></div>}
    </section>
  )
}

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
  const dataFormatada = formatarData(partida.data)
  let mesAbreviado = ''
  if (partida.data) {
    mesAbreviado = new Date(partida.data).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase()
  }
  let percentualVagas = 0
  if (partida.vagasTotal > 0) percentualVagas = Math.min(100, Math.max(0, partida.vagasPreenchidas / partida.vagasTotal * 100))
  const estiloVagas = { width: percentualVagas + '%' }
  let classeCard = 'patota-jogo'
  if (partida.avaliacaoPendente) classeCard += ' patota-jogo-pendente'

  return (
    <Link to={'/partida/' + partida.id} className={classeCard}>
      <div className="patota-data" aria-hidden="true"><strong>{dataFormatada.slice(0, 2)}</strong><span>{mesAbreviado}</span></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800">{dataFormatada} às {partida.horario}</p>
        <p className="mt-1 wrap-break-word text-sm text-gray-500">{partida.local}</p>
        {partida.avaliacaoPendente && <span className="patota-etiqueta mt-2 bg-amber-100 text-amber-800">Avaliação pendente</span>}
      </div>
      <div className="patota-vagas"><p className="text-xs text-gray-500">Vagas preenchidas</p><p className="mt-1 text-sm font-semibold tabular-nums text-gray-800">{partida.vagasPreenchidas} / {partida.vagasTotal}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-green-100" aria-hidden="true"><div className="h-full rounded-full bg-green-500" style={estiloVagas} /></div></div>
      <span className="patota-ver-jogo">Ver jogo<ArrowUpRight size={16} aria-hidden="true" /></span>
    </Link>
  )
}

// Aba Jogos
function AbaJogos({ patotaId, usuarioId, ehPresidente }) {
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
      const resposta = await api.get('/partidas/patota/' + patotaId)
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
    return <CarregamentoConteudo tipo="lista" mensagem="Carregando partidas..." />
  }

  if (erro) {
    return (
      <div className="patota-painel text-center">
        <p className="text-red-500">{erro}</p>
      </div>
    )
  }

  const semPartidas = arrayProximos.length === 0 && arrayFinalizados.length === 0

  return (
    <section className="patota-painel">
      <div className="patota-titulo"><div><h2>Jogos da patota</h2><p>Próximos encontros e partidas realizadas.</p></div>
        {ehPresidente && <Link to={'/patota/' + patotaId + '/criar-partida'} className="patota-botao patota-botao-primario"><Plus size={17} aria-hidden="true" />Criar partida</Link>}
      </div>
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
    </section>
  )
}

// Aba Membros
function AbaMembros({ arrayMembros, ehPresidente, arraySolicitacoes, onResponder, onExcluirMembro }) {
  return (
    <div className="patota-painel">
      <div className="patota-titulo"><div><h2>Membros</h2><p>Quem faz parte da nossa patota.</p></div><span className="patota-etiqueta bg-green-50 text-green-700">{arrayMembros.length} jogadores</span></div>
      {/* Solicitações pendentes (apenas presidente) */}
      {ehPresidente && arraySolicitacoes.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">
            Solicitações pendentes ({arraySolicitacoes.length})
          </h3>
          <div className="flex flex-col gap-3">
            {arraySolicitacoes.map((solicitacao) => (
              <div key={solicitacao.id} className="flex flex-wrap items-center gap-3 border-t border-amber-100 py-3">
                {/* Foto */}
                <Avatar nome={solicitacao.nome} foto={solicitacao.foto} tamanho="md" corBorda="amarela" />

                {/* Nome */}
                <div className="min-w-0 flex-1">
                  <p className="wrap-break-word text-gray-800 font-medium text-sm">{solicitacao.nome}</p>
                </div>

                {/* Botões aceitar/recusar */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onResponder(solicitacao.id, 'ACEITO')}
                    className="patota-botao patota-botao-primario"
                  >
                    Aceitar
                  </button>
                  <button
                    type="button"
                    onClick={() => onResponder(solicitacao.id, 'RECUSADO')}
                    className="patota-botao"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Lista de membros */}
      {arrayMembros.length === 0 && (
        <p className="text-gray-500 text-center">Nenhum membro encontrado.</p>
      )}

      {arrayMembros.length > 0 && (
        <div className="flex flex-col">
          {arrayMembros.map((membro) => (
            <div key={membro.id} className="flex items-center gap-3 border-b border-gray-100 py-4 last:border-0">
              {/* Foto */}
              <Avatar nome={membro.nome} foto={membro.foto} tamanho="lg" corBorda="verde" />

              {/* Dados */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="wrap-break-word text-gray-800 font-medium">{membro.nome}</p>
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
                    type="button"
                    className="patota-botao patota-botao-perigo shrink-0"
                    aria-label={'Remover ' + membro.nome + ' da patota'}
                  >
                    <Trash2 size={18} aria-hidden="true" />
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

  const estiloLargura = { width: Math.min(100, Math.max(0, percentual)) + '%' }

  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden" aria-hidden="true">
      <div className={'h-1.5 rounded-full transition-all motion-reduce:transition-none ' + classeCor} style={estiloLargura}></div>
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
      <div className="patota-titulo"><div><h2>Relatórios</h2><p>Acompanhe a presença e o financeiro da patota.</p></div><span className="patota-etiqueta bg-gray-100 text-gray-600"><LockKeyhole size={14} aria-hidden="true" />Presidente</span></div>
      <AbasPatota arrayAbas={arraySubAbas} abaAtiva={subAba} onAlterar={setSubAba} prefixo="relatorios" rotulo="Tipos de relatório" secundaria={true} />
      <div id="relatorios-painel" role="tabpanel" tabIndex={0} aria-labelledby={'relatorios-aba-' + subAba}>
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
      const resposta = await api.get('/movimentacoes/patota/' + patotaId)
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
    return <CarregamentoConteudo tipo="financeiro" mensagem="Carregando caixa..." />
  }

  return (
    <div className="flex flex-col gap-5">
      {carregando && <div className="text-sm text-green-700"><IndicadorCarregamento texto="Atualizando caixa..." /></div>}
      {caixa && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ResumoCaixa rotulo="Saldo atual" valor={caixa.saldo} tipo="SALDO" />
          <ResumoCaixa rotulo="Total de receitas" valor={caixa.receitas} tipo="RECEITA" />
          <ResumoCaixa rotulo="Total de despesas" valor={caixa.despesas} tipo="DESPESA" />
        </div>
      )}

      <div className="patota-painel">
        <div className="flex flex-wrap items-center justify-between gap-4">
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
              <button type="submit" disabled={cadastrando} aria-busy={cadastrando} className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer">{cadastrando ? <IndicadorCarregamento texto="Registrando..." /> : 'Registrar'}</button>
            </div>
          </form>
        )}

        {erro && <p className="mt-4 text-sm text-red-500">{erro}</p>}
      </div>

      {caixa && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
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
    <div className="patota-resumo rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
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
        params: { mesReferencia: mesReferencia }
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
      await api.put('/mensalidades/patota/' + patotaId + '/valor', { valor: valor })
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
    return <CarregamentoConteudo tipo="mensalidades" mensagem="Carregando mensalidades..." />
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="patota-painel">
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div>
            <label htmlFor="mes-mensalidades" className="block text-sm font-medium text-gray-700 mb-1">Mês de referência</label>
            <input id="mes-mensalidades" type="month" value={mesReferencia} disabled={carregando || membroAtualizando !== null || salvandoValor} onChange={(evento) => setMesReferencia(evento.target.value)} className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <form onSubmit={salvarValor}>
            <label htmlFor="valor-mensalidade" className="block text-sm font-medium text-gray-700 mb-1">Valor vigente</label>
            <div className="flex gap-2">
              <input id="valor-mensalidade" type="number" min="0.01" step="0.01" value={valorMensalidade} onChange={(evento) => setValorMensalidade(evento.target.value)} className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500" />
              <button type="submit" disabled={salvandoValor || carregando || membroAtualizando !== null} aria-busy={salvandoValor} className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer">
                {salvandoValor ? <IndicadorCarregamento texto="Salvando..." /> : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
        {erro && <p className="mt-4 text-sm text-red-500">{erro}</p>}
      </div>

      {relatorio && (
        <>
          {carregando && <div className="text-sm text-green-700"><IndicadorCarregamento texto="Atualizando mensalidades..." /></div>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ResumoMensalidade rotulo="Membros" valor={relatorio.quantidadeMembros} />
            <ResumoMensalidade rotulo="Pagas" valor={relatorio.quantidadePagas} cor="verde" />
            <ResumoMensalidade rotulo="Pendentes" valor={relatorio.quantidadePendentes} cor="amarelo" />
            <ResumoMensalidade rotulo="Recebido" valor={formatarMoeda(relatorio.totalRecebido)} />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <h3 className="border-b border-gray-100 px-5 py-4 text-sm font-semibold text-gray-800">Pagamentos do mês</h3>
            {relatorio.mensalidades.length === 0 && <p className="p-6 text-center text-gray-500">Nenhum membro ativo nesta patota.</p>}
            <div className="divide-y divide-gray-100">
              {relatorio.mensalidades.map((mensalidade) => (
                <LinhaMensalidade key={mensalidade.usuarioId} mensalidade={mensalidade} atualizando={membroAtualizando === mensalidade.usuarioId} desabilitado={carregando || membroAtualizando !== null || salvandoValor} onAlternar={alternarStatus} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function LinhaMensalidade({ mensalidade, atualizando, desabilitado, onAlternar }) {
  const pago = mensalidade.status === 'PAGO'
  let classeStatus = 'bg-yellow-100 text-yellow-700'
  let classeBotao = 'border-green-600 text-green-700 hover:bg-green-50'
  let textoStatus = 'Pendente'
  let textoBotao = 'Dar baixa'
  if (pago) {
    classeStatus = 'bg-green-100 text-green-700'
    classeBotao = 'border-red-500 text-red-600 hover:bg-red-50'
    textoStatus = 'Pago'
    textoBotao = 'Desfazer baixa'
  }

  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar nome={mensalidade.nome} foto={mensalidade.foto} tamanho="md" />
        <div className="min-w-0">
          <p className="wrap-break-word text-gray-800 font-medium">{mensalidade.nome}</p>
          <p className="text-sm text-gray-500">{formatarMoeda(mensalidade.valor)}</p>
        </div>
      </div>
      <span className={'self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-full ' + classeStatus}>{textoStatus}</span>
      <button type="button" disabled={desabilitado} aria-busy={atualizando} onClick={() => onAlternar(mensalidade)} className={'sm:w-40 border disabled:opacity-50 text-sm font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer ' + classeBotao}>{atualizando ? <IndicadorCarregamento texto="Atualizando..." /> : textoBotao}</button>
    </div>
  )
}

function ResumoMensalidade({ rotulo, valor, cor }) {
  let classeValor = 'text-gray-800'
  if (cor === 'verde') classeValor = 'text-green-700'
  if (cor === 'amarelo') classeValor = 'text-yellow-600'
  return (
    <div className="patota-resumo rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
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
      const resposta = await api.get('/patotas/' + patotaId + '/relatorios/presenca')
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
    return <CarregamentoConteudo tipo="lista" mensagem="Carregando relatório..." />
  }

  if (erro) {
    return (
      <div className="patota-painel text-center">
        <p className="text-red-500">{erro}</p>
      </div>
    )
  }

  if (!relatorio || relatorio.totalPartidas === 0) {
    return (
      <div className="patota-painel text-center">
        <p className="text-gray-500 text-lg mb-2">Nenhuma partida realizada ainda.</p>
        <p className="text-gray-400 text-sm">A frequência dos jogadores aparecerá aqui após partidas finalizadas.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Frequência por jogador */}
      <div className="patota-painel">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Frequência dos jogadores</h3>
          <span className="text-xs text-gray-500">
            {relatorio.totalPartidas} partida(s) realizada(s)
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {relatorio.frequencia.map((jogador) => (
            <div key={jogador.id} className="flex items-center gap-4">
              <Avatar nome={jogador.nome} foto={jogador.foto} tamanho="md" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
                  <p className="wrap-break-word text-gray-800 font-medium text-sm">{jogador.nome}</p>
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
      <div className="patota-painel">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Partidas realizadas</h3>

        <div className="flex flex-col gap-3">
          {relatorio.partidas.map((partida) => (
            <div key={partida.id} className="rounded-lg border border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => alternarPartida(partida.id)}
                aria-expanded={partidaExpandida === partida.id}
                className="w-full flex items-center justify-between gap-4 p-4 text-left cursor-pointer hover:bg-gray-100 transition-colors rounded-lg"
              >
                <div className="min-w-0">
                  <p className="text-gray-800 font-medium">
                    {formatarData(partida.data)} às {formatarHora(partida.horario) || partida.horario}
                  </p>
                  <p className="wrap-break-word text-sm text-gray-500">{partida.local}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Presentes</p>
                  <p className="text-gray-800 font-medium">{partida.totalPresentes}</p>
                </div>
              </button>

              {partidaExpandida === partida.id && (
                <div id={'presenca-partida-' + partida.id} className="px-4 pb-4">
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
