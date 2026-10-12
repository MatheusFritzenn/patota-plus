import { CarregamentoPagina, CarregamentoConteudo, IndicadorCarregamento } from '../../components/Carregamento.jsx'
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import ModalConfirmacao from '../../components/ModalConfirmacao.jsx'
import ModalMensagem from '../../components/ModalMensagem.jsx'
import Avatar from '../../components/Avatar.jsx'
import { CalendarDays, ChevronRight, CircleCheck, Clock3, Crown, Flag, LockKeyhole, MapPin, Pencil, RotateCcw, Shield, Shuffle, SlidersHorizontal, Star, Trash2, UsersRound } from 'lucide-react'
import './style.css'

// Formata a data (timestamp) para o padrão dd/mm/aaaa
function formatarData(data) {
  if (!data) return ''
  const dataObj = new Date(data)
  const dia = String(dataObj.getUTCDate()).padStart(2, '0')
  const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0')
  const ano = dataObj.getUTCFullYear()
  return dia + '/' + mes + '/' + ano
}

function DetalhesPartida() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [partida, setPartida] = useState(null)
  const [arrayParticipantes, setArrayParticipantes] = useState([])
  const [arrayPosicoesDisponiveis, setArrayPosicoesDisponiveis] = useState([])
  const [vagasRestantes, setVagasRestantes] = useState(0)
  const [abaAtiva, setAbaAtiva] = useState('lista-jogadores')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [userId, setUserId] = useState(null)
  const [ehPresidente, setEhPresidente] = useState(false)
  const [estaConfirmado, setEstaConfirmado] = useState(false)
  const [participanteParaRemover, setParticipanteParaRemover] = useState(null)
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [modalMensagem, setModalMensagem] = useState({ aberto: false, titulo: '', mensagem: '' })

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
      // Detalhes da partida
      const respostaPartida = await api.get('/partidas/' + id)
      const dadosPartida = respostaPartida.data
      setPartida(dadosPartida)

      // Verifica se o usuário é presidente da patota dessa partida
      const respostaMembresia = await api.get('/patotas/' + dadosPartida.patotaId + '/verificar-membro')
      if (respostaMembresia.data.role === 'PRESIDENTE') {
        setEhPresidente(true)
      }

      // Participantes
      await carregarParticipantes(data.user.id)

      setCarregando(false)
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar partida:', erroRequisicao)
      setErro('Erro ao carregar dados da partida.')
      setCarregando(false)
    }
  }

  async function carregarParticipantes(idUsuario) {
    const resposta = await api.get('/partidas/' + id + '/participantes')
    const dados = resposta.data

    setArrayParticipantes(dados.participantes)
    const arrayPosicoesResposta = dados.posicoesDisponiveis || []
    setArrayPosicoesDisponiveis(arrayPosicoesResposta)
    setVagasRestantes(dados.vagasRestantes)

    // Verifica se o usuário atual já está confirmado
    let confirmado = false
    for (const participante of dados.participantes) {
      if (participante.id === idUsuario) {
        confirmado = true
      }
    }
    setEstaConfirmado(confirmado)
  }

  async function handleConfirmarPresenca() {
    setErro('')
    try {
      await api.post('/partidas/' + id + '/participar')
      await carregarParticipantes(userId)
    }
    catch (erroRequisicao) {
      console.error('Erro ao confirmar presença:', erroRequisicao)
      if (erroRequisicao.response && erroRequisicao.response.status === 409) {
        setModalMensagem({ aberto: true, titulo: 'Não foi possível confirmar', mensagem: erroRequisicao.response.data.erro })
        await carregarParticipantes(userId)
      } else {
        setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao confirmar presença. Tente novamente.' })
      }
    }
  }

  async function handleRecusarPresenca() {
    setErro('')
    try {
      await api.delete('/partidas/' + id + '/participar')
      await carregarParticipantes(userId)
    }
    catch (erroRequisicao) {
      console.error('Erro ao recusar presença:', erroRequisicao)
      setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao recusar presença. Tente novamente.' })
    }
  }

  async function handleFinalizarPartida() {
    try {
      await api.put('/partidas/' + id + '/finalizar')
      setModalFinalizarAberto(false)

      // Atualiza o status da partida localmente
      const partidaAtualizada = {}
      for (const chave in partida) {
        partidaAtualizada[chave] = partida[chave]
      }
      partidaAtualizada.status = 'FINALIZADA'
      setPartida(partidaAtualizada)
    }
    catch (erroRequisicao) {
      console.error('Erro ao finalizar partida:', erroRequisicao)
      setModalFinalizarAberto(false)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        setModalMensagem({ aberto: true, titulo: 'Não foi possível finalizar', mensagem: erroRequisicao.response.data.erro })
      } else {
        setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao finalizar partida. Tente novamente.' })
      }
    }
  }

  async function handleExcluirPartida() {
    if (excluindo) return

    setExcluindo(true)
    try {
      await api.delete('/partidas/' + id)
      navigate('/patota/' + partida.patotaId)
    }
    catch (erroRequisicao) {
      console.error('Erro ao excluir partida:', erroRequisicao)
      setModalExcluirAberto(false)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        setModalMensagem({ aberto: true, titulo: 'Não foi possível excluir', mensagem: erroRequisicao.response.data.erro })
      }
      else {
        setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao excluir partida. Tente novamente.' })
      }
    }
    finally {
      setExcluindo(false)
    }
  }

  async function handleRemoverParticipante() {
    if (!participanteParaRemover) return

    try {
      await api.delete('/partidas/' + id + '/participantes/' + participanteParaRemover.id)
      setParticipanteParaRemover(null)
      await carregarParticipantes(userId)
    }
    catch (erroRequisicao) {
      console.error('Erro ao remover participante:', erroRequisicao)
      setParticipanteParaRemover(null)
      setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao remover jogador da partida.' })
    }
  }

  if (carregando) {
    return <CarregamentoPagina tipo="detalhes" mensagem="Carregando partida e jogadores..." />
  }

  if (erro) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-red-500 text-center">{erro}</p>
      </main>
    )
  }

  const partidaFinalizada = partida.status === 'FINALIZADA'

  const arrayAbas = [
    { id: 'lista-jogadores', nome: 'Lista de jogadores', icone: UsersRound },
    { id: 'times', nome: 'Times', icone: Shield },
    { id: 'avaliacoes', nome: 'Avaliações', icone: Star }
  ]

  function navegarAbas(evento, indice) {
    let proximoIndice = indice
    if (evento.key === 'ArrowRight') proximoIndice = (indice + 1) % arrayAbas.length
    else if (evento.key === 'ArrowLeft') proximoIndice = (indice + arrayAbas.length - 1) % arrayAbas.length
    else if (evento.key === 'Home') proximoIndice = 0
    else if (evento.key === 'End') proximoIndice = arrayAbas.length - 1
    else return

    evento.preventDefault()
    setAbaAtiva(arrayAbas[proximoIndice].id)
    document.getElementById('partida-aba-' + arrayAbas[proximoIndice].id).focus()
  }

  let textoStatus = 'Agendada'
  if (partida.status === 'EM_ANDAMENTO') textoStatus = 'Em andamento'
  if (partidaFinalizada) textoStatus = 'Finalizada'
  if (partida.status === 'CANCELADA') textoStatus = 'Cancelada'

  return (
    <main className="partida-pagina max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
      {/* Cabeçalho da partida */}
      <header className="mb-6">
        <nav aria-label="Caminho da página" className="partida-caminho">
          <Link to="/minhas-patotas">Minhas patotas</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <Link to={'/patota/' + partida.patotaId}>{partida.patotaNome}</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">Partida</span>
        </nav>
        <div className="partida-cabecalho">
          <div className="partida-cabecalho-linha">
            <div className="partida-identidade">
              <span className="partida-icone"><Shield size={29} aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="partida-sobre">{partida.patotaNome}</p>
                <h1>Detalhes da partida</h1>
                <div className="partida-etiquetas">
                  <span className={'partida-etiqueta ' + (partidaFinalizada || partida.status === 'CANCELADA' ? 'partida-etiqueta-neutra' : '')}>{textoStatus}</span>
                  {ehPresidente && <span className="partida-etiqueta partida-etiqueta-neutra"><Crown size={14} aria-hidden="true" />Você é presidente</span>}
                </div>
              </div>
            </div>
            {ehPresidente && (partida.status === 'AGENDADA' || partida.status === 'EM_ANDAMENTO') && (
              <div className="partida-acoes-cabecalho">
                <button type="button" onClick={() => navigate('/partida/' + id + '/editar')} className="partida-botao"><Pencil size={16} aria-hidden="true" />Editar partida</button>
                <button type="button" onClick={() => setModalExcluirAberto(true)} className="partida-botao partida-botao-perigo"><Trash2 size={16} aria-hidden="true" />Excluir partida</button>
              </div>
            )}
          </div>
          <div className="partida-metadados">
            <span><CalendarDays size={17} aria-hidden="true" />{formatarData(partida.data)}</span>
            <span><Clock3 size={17} aria-hidden="true" />{partida.horario}</span>
            <span><MapPin size={17} aria-hidden="true" />{partida.local}</span>
          </div>
        </div>
      </header>

      {/* Abas */}
      <div role="tablist" aria-label="Abas da partida" className="partida-abas">
        {arrayAbas.map((aba, indice) => {
          const Icone = aba.icone
          let ordemFoco = -1
          if (abaAtiva === aba.id) ordemFoco = 0
          return (
            <button type="button" role="tab" id={'partida-aba-' + aba.id} aria-controls="partida-painel" aria-selected={abaAtiva === aba.id} tabIndex={ordemFoco} key={aba.id} onClick={() => setAbaAtiva(aba.id)} onKeyDown={(evento) => navegarAbas(evento, indice)}>
              <Icone size={18} aria-hidden="true" />{aba.nome}
              {aba.id === 'lista-jogadores' && <span className="partida-contagem">{arrayParticipantes.length}</span>}
            </button>
          )
        })}
      </div>

      {/* Conteúdo das abas */}
      <div id="partida-painel" role="tabpanel" tabIndex={0} aria-labelledby={'partida-aba-' + abaAtiva}>
      {abaAtiva === 'lista-jogadores' && (
        <AbaListaJogadores
          arrayParticipantes={arrayParticipantes}
          vagasRestantes={vagasRestantes}
          vagasTotal={partida.vagasTotal}
          partidaFinalizada={partidaFinalizada}
          estaConfirmado={estaConfirmado}
          ehPresidente={ehPresidente}
          userId={userId}
          onConfirmar={handleConfirmarPresenca}
          onRecusar={handleRecusarPresenca}
          onRemover={(participante) => setParticipanteParaRemover(participante)}
          onFinalizar={() => setModalFinalizarAberto(true)}
        />
      )}

      {abaAtiva === 'times' && (
        <AbaTimes
          partidaId={id}
          ehPresidente={ehPresidente}
          partidaFinalizada={partidaFinalizada}
          arrayParticipantes={arrayParticipantes}
          arrayPosicoesDisponiveis={arrayPosicoesDisponiveis}
          onAtualizarParticipantes={() => carregarParticipantes(userId)}
          onMensagem={(titulo, mensagem) => setModalMensagem({ aberto: true, titulo: titulo, mensagem: mensagem })}
        />
      )}

      {abaAtiva === 'avaliacoes' && (
        <AbaAvaliacoes
          partidaId={id}
          userId={userId}
          ehPresidente={ehPresidente}
          partidaFinalizada={partidaFinalizada}
          onMensagem={(titulo, mensagem) => setModalMensagem({ aberto: true, titulo: titulo, mensagem: mensagem })}
        />
      )}
      </div>

      {/* Modal de confirmação de finalização da partida */}
      <ModalConfirmacao
        aberto={modalFinalizarAberto}
        titulo="Finalizar partida"
        mensagem="Ao finalizar, a lista atual de jogadores presentes será registrada e não poderá mais ser alterada. Deseja continuar?"
        textoBotaoConfirmar="Finalizar"
        corBotaoConfirmar="verde"
        onConfirmar={handleFinalizarPartida}
        onCancelar={() => setModalFinalizarAberto(false)}
      />

      {/* Modal de confirmação de exclusão da partida */}
      <ModalConfirmacao
        aberto={modalExcluirAberto}
        titulo="Excluir partida"
        mensagem="Tem certeza que deseja excluir esta partida e seus dados vinculados? Essa ação não pode ser desfeita."
        processando={excluindo}
        textoBotaoConfirmar={excluindo ? 'Excluindo...' : 'Excluir'}
        onConfirmar={handleExcluirPartida}
        onCancelar={() => setModalExcluirAberto(false)}
      />

      {/* Modal de confirmação de remoção de participante */}
      <ModalConfirmacao
        aberto={!!participanteParaRemover}
        titulo="Remover jogador"
        mensagem={participanteParaRemover ? 'Tem certeza que deseja remover ' + participanteParaRemover.nome + ' da partida?' : ''}
        textoBotaoConfirmar="Remover"
        onConfirmar={handleRemoverParticipante}
        onCancelar={() => setParticipanteParaRemover(null)}
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

// Aba 5.1 — Lista de jogadores
function AbaListaJogadores({ arrayParticipantes, vagasRestantes, vagasTotal, partidaFinalizada, estaConfirmado, ehPresidente, userId, onConfirmar, onRecusar, onRemover, onFinalizar }) {
  let percentualOcupacao = 0
  if (vagasTotal > 0) percentualOcupacao = Math.min(100, (arrayParticipantes.length / vagasTotal) * 100)

  return (
    <section className="partida-painel">
      <div className="partida-secao-topo">
        <div>
          <h2>{partidaFinalizada ? 'Jogadores presentes' : 'Jogadores confirmados'}</h2>
          <p>{arrayParticipantes.length} de {vagasTotal} vagas preenchidas
            {!partidaFinalizada && ' · ' + vagasRestantes + ' vaga(s) disponível(is)'}
            {partidaFinalizada && ' · Presença registrada'}
          </p>
        </div>
        {!partidaFinalizada && (
          <div className="partida-acoes-lista">
            {estaConfirmado && <span className="partida-etiqueta"><CircleCheck size={15} aria-hidden="true" />Você está confirmado</span>}
            {estaConfirmado ? (
              <button type="button" onClick={onRecusar} className="partida-botao partida-botao-perigo">Recusar presença</button>
            ) : (
              <button type="button" onClick={onConfirmar} disabled={vagasRestantes <= 0} className="partida-botao partida-botao-primario">{vagasRestantes <= 0 ? 'Sem vagas' : 'Confirmar presença'}</button>
            )}
          </div>
        )}
      </div>
      {!partidaFinalizada && vagasTotal > 0 && <div className="partida-progresso" role="progressbar" aria-label="Vagas preenchidas" aria-valuenow={arrayParticipantes.length} aria-valuemin={0} aria-valuemax={vagasTotal}><span style={{ width: percentualOcupacao + '%' }} /></div>}
      {arrayParticipantes.length === 0 && (
        <p className="partida-vazio-texto">
          {partidaFinalizada ? 'Nenhum jogador participou desta partida.' : 'Nenhum jogador confirmado ainda.'}
        </p>
      )}
      {arrayParticipantes.length > 0 && (
        <div className="partida-lista">
          {arrayParticipantes.map((participante) => (
            <div key={participante.id} className="partida-jogador">
              <Avatar nome={participante.nome} foto={participante.foto} tamanho="md" corBorda="verde" />
              <div className="partida-jogador-dados">
                <div className="partida-jogador-nome">
                  <p>{participante.nome}</p>
                  {participante.id === userId && <span className="partida-etiqueta">Você</span>}
                </div>
                {participante.posicaoTemporariaNome && <p className="partida-jogador-posicao">{participante.posicaoTemporariaNome} nesta partida</p>}
                {!participante.posicaoTemporariaNome && participante.posicoes.length > 0 && <p className="partida-jogador-posicao">{participante.posicoes.join(', ')}</p>}
              </div>
              {ehPresidente && !partidaFinalizada && (
                <button type="button" onClick={() => onRemover(participante)} className="partida-remover" aria-label={'Remover ' + participante.nome} title="Remover jogador"><Trash2 size={18} aria-hidden="true" /></button>
              )}
            </div>
          ))}
        </div>
      )}
      {ehPresidente && !partidaFinalizada && <div className="partida-rodape"><p>Finalize a partida para registrar os presentes.</p><button type="button" onClick={onFinalizar} className="partida-botao"><Flag size={16} aria-hidden="true" />Finalizar partida</button></div>}
    </section>
  )
}

// Aba 5.2 — Times (geração automática equilibrada)
function AbaTimes({ partidaId, ehPresidente, partidaFinalizada, arrayParticipantes, arrayPosicoesDisponiveis, onAtualizarParticipantes, onMensagem }) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [arrayTimes, setArrayTimes] = useState([])
  const [gerando, setGerando] = useState(false)
  const [modalRegenerarAberto, setModalRegenerarAberto] = useState(false)
  const [modalDesfazerAberto, setModalDesfazerAberto] = useState(false)
  const [salvandoPosicaoId, setSalvandoPosicaoId] = useState(null)
  const [posicoesAbertas, setPosicoesAbertas] = useState(false)

  useEffect(() => {
    carregarTimes()
  }, [partidaId])

  async function carregarTimes() {
    setCarregando(true)
    setErro('')
    try {
      const resposta = await api.get('/partidas/' + partidaId + '/times')
      setArrayTimes(resposta.data.times)
      setCarregando(false)
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar times:', erroRequisicao)
      setErro('Erro ao carregar os times.')
      setCarregando(false)
    }
  }

  async function handleGerarTimes() {
    setGerando(true)
    setModalRegenerarAberto(false)
    try {
      const resposta = await api.post('/partidas/' + partidaId + '/times/gerar')
      setArrayTimes(resposta.data.times)
      setGerando(false)
    }
    catch (erroRequisicao) {
      console.error('Erro ao gerar times:', erroRequisicao)
      setGerando(false)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        onMensagem('Não foi possível gerar', erroRequisicao.response.data.erro)
      } else {
        onMensagem('Erro', 'Erro ao gerar os times. Tente novamente.')
      }
    }
  }

  // Decide se gera direto ou pede confirmação (quando já existem times formados)
  function handleClicarGerar() {
    if (arrayTimes.length > 0) {
      setModalRegenerarAberto(true)
    } else {
      handleGerarTimes()
    }
  }

  async function handleDesfazerTimes() {
    setModalDesfazerAberto(false)
    try {
      await api.delete('/partidas/' + partidaId + '/times')
      setArrayTimes([])
    }
    catch (erroRequisicao) {
      console.error('Erro ao desfazer times:', erroRequisicao)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        onMensagem('Não foi possível desfazer', erroRequisicao.response.data.erro)
      } else {
        onMensagem('Erro', 'Erro ao desfazer os times. Tente novamente.')
      }
    }
  }

  async function handleAlterarPosicao(participanteId, valor) {
    setSalvandoPosicaoId(participanteId)

    let posicaoId = null
    if (valor !== '') {
      posicaoId = Number(valor)
    }

    try {
      await api.put('/partidas/' + partidaId + '/participantes/' + participanteId + '/posicao-temporaria', {
        posicaoId: posicaoId
      })
      await onAtualizarParticipantes()
      await carregarTimes()
      setSalvandoPosicaoId(null)
    }
    catch (erroRequisicao) {
      console.error('Erro ao alterar posição temporária:', erroRequisicao)
      setSalvandoPosicaoId(null)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        onMensagem('Não foi possível remanejar', erroRequisicao.response.data.erro)
      }
      else {
        onMensagem('Erro', 'Erro ao alterar a posição do jogador. Tente novamente.')
      }
    }
  }

  if (carregando) {
    return <CarregamentoConteudo tipo="times" mensagem="Carregando times..." />
  }

  if (erro) {
    return (
      <div className="partida-painel partida-estado-vazio">
        <p className="text-red-500">{erro}</p>
      </div>
    )
  }

  const temTimes = arrayTimes.length > 0

  return (
    <div className="partida-conteudo">
      {/* Cabeçalho / controles do presidente */}
      <section className="partida-painel">
        <div className="partida-secao-topo">
          <div>
            <h2>Formação de times</h2>
            <p>
              Divisão por posições, buscando equilibrar a força dos times.
            </p>
          </div>

          {ehPresidente && !partidaFinalizada && (
            <div className="partida-acoes-lista">
              <button
                onClick={handleClicarGerar}
                disabled={gerando} aria-busy={gerando}
                className="partida-botao partida-botao-primario"
              >
                <Shuffle size={16} aria-hidden="true" />
                {gerando ? <IndicadorCarregamento texto="Gerando..." /> : (temTimes ? 'Regenerar times' : 'Gerar times')}
              </button>
              {temTimes && (
                <button
                  onClick={() => setModalDesfazerAberto(true)}
                  className="partida-botao"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  Desfazer
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {ehPresidente && !partidaFinalizada && arrayParticipantes.length > 0 && (
        <section className="partida-painel partida-posicoes">
          <button type="button" className="partida-posicoes-toggle" aria-expanded={posicoesAbertas} aria-controls="partida-posicoes-conteudo" onClick={() => setPosicoesAbertas(!posicoesAbertas)}><span><SlidersHorizontal size={18} aria-hidden="true" />Posições nesta partida</span><span>{posicoesAbertas ? 'Recolher' : 'Ajustar posições'}</span></button>
          <div id="partida-posicoes-conteudo" hidden={!posicoesAbertas}>
          <p className="partida-posicoes-ajuda">A posição temporária tem prioridade sobre o perfil e vale apenas para esta partida. Após uma alteração, regenere os times.</p>
          <div className="partida-posicoes-grade">
            {arrayParticipantes.map((participante) => (
              <label key={participante.id} className="partida-posicao-campo">
                <span className="text-sm font-medium text-gray-800">{participante.nome}</span>
                {salvandoPosicaoId === participante.id && <span className="text-sm text-green-700"><IndicadorCarregamento texto="Salvando posição..." /></span>}
                <span className="text-xs text-gray-500">
                  Perfil: {participante.posicoes.length > 0 ? participante.posicoes.join(', ') : 'sem posição cadastrada'}
                </span>
                <select
                  value={participante.posicaoTemporariaId || ''}
                  onChange={(evento) => handleAlterarPosicao(participante.id, evento.target.value)}
                  disabled={salvandoPosicaoId !== null}
                  className="partida-posicao-select"
                >
                  <option value="">Usar posição do perfil</option>
                  {arrayPosicoesDisponiveis.map((posicao) => (
                    <option key={posicao.id} value={posicao.id}>{posicao.nome}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          </div>
        </section>
      )}

      {/* Estado vazio */}
      {!temTimes && (
        <div className="partida-painel partida-estado-vazio">
          <Shield size={26} aria-hidden="true" />
          <h2>Times não formados</h2>
          <p className="text-gray-400 text-sm">
            {partidaFinalizada
              ? 'Esta partida foi finalizada sem formação de times.'
              : (ehPresidente
                ? 'Clique em "Gerar times" para montar dois times equilibrados com os jogadores confirmados.'
                : 'O presidente ainda não gerou os times desta partida.')}
          </p>
        </div>
      )}

      {temTimes && (
        <p className="partida-nota">
          A força média inclui uma estimativa para quem ainda não foi avaliado: a média dos jogadores avaliados da partida, ou 5 quando ninguém tem avaliação.
          {' '}Extras também jogam e entram na força média, mas não ocupam vagas da composição de referência.
        </p>
      )}

      {/* Grade de times */}
      {temTimes && (
        <div className="partida-times-grade">
          {arrayTimes.map((time) => (
            <section key={time.id} className="partida-painel partida-time">
              <div className="partida-time-cabecalho">
                <div><h3>{time.nome}</h3><p>{time.jogadores.length} jogadores</p></div>
                <div className="text-right">
                  <p>Força média</p>
                  <strong>
                    {time.mediaForca !== null && time.mediaForca !== undefined ? time.mediaForca.toFixed(2) : '—'}
                  </strong>
                </div>
              </div>

              <div className="partida-lista">
                {time.jogadores.map((jogador) => (
                  <div key={jogador.id} className="partida-jogador">
                    <Avatar nome={jogador.nome} foto={jogador.foto} tamanho="md" corBorda="verde" />
                    <div className="partida-jogador-dados">
                      <div className="flex items-center gap-2">
                        <p className="partida-nome-compacto">{jogador.nome}</p>
                        {jogador.ehGoleiro && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 font-medium px-2 py-0.5 rounded-full shrink-0">
                            GOL
                          </span>
                        )}
                      </div>
                      {jogador.extraFormacao === true && (
                        <p className="text-xs text-gray-500">Extra — distribuído pela força</p>
                      )}
                      {jogador.extraFormacao === false && (
                        <p className="text-xs text-green-700 truncate">
                          {jogador.posicaoFormacaoNome || 'Sem posição definida'}
                        </p>
                      )}
                      {jogador.extraFormacao == null && jogador.posicaoTemporariaNome && (
                        <p className="text-xs text-green-700 truncate">
                          {jogador.posicaoTemporariaNome} (nesta partida)
                        </p>
                      )}
                      {jogador.extraFormacao == null && !jogador.posicaoTemporariaNome && jogador.posicoes.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">{jogador.posicoes.join(', ')}</p>
                      )}
                    </div>
                    <div className="partida-forca">
                      <p>
                        {jogador.forca !== null && jogador.forca !== undefined ? jogador.forca.toFixed(2) : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal: confirmar regeneração */}
      <ModalConfirmacao
        aberto={modalRegenerarAberto}
        titulo="Regenerar times"
        mensagem="Isso vai refazer a divisão atual dos times. Deseja continuar?"
        textoBotaoConfirmar="Regenerar"
        corBotaoConfirmar="verde"
        onConfirmar={handleGerarTimes}
        onCancelar={() => setModalRegenerarAberto(false)}
      />

      {/* Modal: confirmar desfazer */}
      <ModalConfirmacao
        aberto={modalDesfazerAberto}
        titulo="Desfazer times"
        mensagem="A formação atual dos times será removida. Deseja continuar?"
        textoBotaoConfirmar="Desfazer"
        onConfirmar={handleDesfazerTimes}
        onCancelar={() => setModalDesfazerAberto(false)}
      />
    </div>
  )
}

// Aba 5.3 — Avaliações
function AbaAvaliacoes({ partidaId, userId, ehPresidente, partidaFinalizada, onMensagem }) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [avaliacoesLiberadas, setAvaliacoesLiberadas] = useState(false)
  const [avaliacoesEncerradas, setAvaliacoesEncerradas] = useState(false)
  const [participou, setParticipou] = useState(false)
  const [arrayAvaliaveis, setArrayAvaliaveis] = useState([])
  const [mapaNotas, setMapaNotas] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [arrayResultado, setArrayResultado] = useState([])
  const [modalEncerrarAberto, setModalEncerrarAberto] = useState(false)
  const [encerrando, setEncerrando] = useState(false)

  useEffect(() => {
    carregarAvaliacoes()
  }, [partidaId, userId])

  async function carregarAvaliacoes() {
    if (!userId) return

    setCarregando(true)
    setErro('')
    try {
      const resposta = await api.get('/partidas/' + partidaId + '/avaliacoes')
      const dados = resposta.data

      setAvaliacoesLiberadas(dados.avaliacoesLiberadas)
      setAvaliacoesEncerradas(dados.avaliacoesEncerradas)
      setParticipou(dados.participou)
      setArrayAvaliaveis(dados.avaliaveis)

      // Preenche o mapa de notas com as notas já dadas (se houver)
      const notasIniciais = {}
      for (const avaliavel of dados.avaliaveis) {
        if (avaliavel.notaDada !== null && avaliavel.notaDada !== undefined) {
          notasIniciais[avaliavel.id] = String(avaliavel.notaDada)
        } else {
          notasIniciais[avaliavel.id] = ''
        }
      }
      setMapaNotas(notasIniciais)

      // Se encerradas, carrega o resultado (médias)
      if (dados.avaliacoesEncerradas) {
        const respostaResultado = await api.get('/partidas/' + partidaId + '/avaliacoes/resultado')
        setArrayResultado(respostaResultado.data.resultado)
      }

      setCarregando(false)
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar avaliações:', erroRequisicao)
      setErro('Erro ao carregar as avaliações.')
      setCarregando(false)
    }
  }

  function handleMudarNota(avaliadoId, valor) {
    const novoMapa = {}
    for (const chave in mapaNotas) {
      novoMapa[chave] = mapaNotas[chave]
    }
    novoMapa[avaliadoId] = valor
    setMapaNotas(novoMapa)
  }

  async function handleSalvarAvaliacoes() {
    // Monta a lista de avaliações preenchidas e valida no cliente
    const arrayAvaliacoes = []
    for (const avaliavel of arrayAvaliaveis) {
      const valor = mapaNotas[avaliavel.id]
      if (valor === '' || valor === undefined || valor === null) {
        continue
      }

      const nota = Number(valor)
      if (Number.isNaN(nota) || nota < 0 || nota > 10) {
        onMensagem('Nota inválida', 'A nota de ' + avaliavel.nome + ' deve ser um número entre 0 e 10.')
        return
      }

      const item = {}
      item.avaliadoId = avaliavel.id
      item.nota = nota
      arrayAvaliacoes.push(item)
    }

    if (arrayAvaliacoes.length === 0) {
      onMensagem('Nenhuma nota', 'Preencha ao menos uma nota antes de salvar.')
      return
    }

    setSalvando(true)
    try {
      await api.post('/partidas/' + partidaId + '/avaliacoes', {
        avaliacoes: arrayAvaliacoes
      })
      setSalvando(false)
      onMensagem('Avaliações salvas', 'Suas avaliações foram registradas com sucesso.')
      await carregarAvaliacoes()
    }
    catch (erroRequisicao) {
      console.error('Erro ao salvar avaliações:', erroRequisicao)
      setSalvando(false)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        onMensagem('Não foi possível salvar', erroRequisicao.response.data.erro)
      } else {
        onMensagem('Erro', 'Erro ao salvar avaliações. Tente novamente.')
      }
    }
  }

  async function handleEncerrarAvaliacoes() {
    setEncerrando(true)
    try {
      await api.put('/partidas/' + partidaId + '/avaliacoes/encerrar')
      setEncerrando(false)
      setModalEncerrarAberto(false)
      await carregarAvaliacoes()
    }
    catch (erroRequisicao) {
      console.error('Erro ao encerrar avaliações:', erroRequisicao)
      setEncerrando(false)
      setModalEncerrarAberto(false)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        onMensagem('Não foi possível encerrar', erroRequisicao.response.data.erro)
      } else {
        onMensagem('Erro', 'Erro ao encerrar avaliações. Tente novamente.')
      }
    }
  }

  if (carregando) {
    return <CarregamentoConteudo tipo="lista" mensagem="Carregando avaliações..." />
  }

  if (erro) {
    return (
      <div className="partida-painel partida-estado-vazio">
        <p className="text-red-500">{erro}</p>
      </div>
    )
  }

  // Partida ainda não finalizada — avaliações não liberadas
  if (!partidaFinalizada || !avaliacoesLiberadas) {
    return (
      <div className="partida-painel partida-estado-vazio">
        <span className="partida-estado-icone"><LockKeyhole size={24} aria-hidden="true" /></span>
        <h2>Avaliações ainda não liberadas</h2>
        <p>Após o presidente finalizar a partida, você poderá avaliar os companheiros do seu time.</p>
      </div>
    )
  }

  // Avaliações encerradas — mostra o resultado (médias por jogador na partida)
  if (avaliacoesEncerradas) {
    return (
      <div className="partida-painel">
        <div className="partida-secao-topo">
          <div><h2>Resultado das avaliações</h2><p>Médias recebidas nesta partida.</p></div>
          <span className="partida-etiqueta partida-etiqueta-neutra">Encerradas</span>
        </div>

        {arrayResultado.length === 0 ? (
          <p className="partida-vazio-texto">Nenhum jogador avaliado nesta partida.</p>
        ) : (
          <div className="partida-lista">
            {arrayResultado.map((jogador) => (
              <div key={jogador.id} className="partida-jogador">
                <Avatar nome={jogador.nome} foto={jogador.foto} tamanho="md" corBorda="verde" />
                <div className="partida-jogador-dados">
                  <p className="partida-nome-compacto">{jogador.nome}</p>
                  <p className="text-sm text-gray-500">
                    {jogador.totalAvaliacoes} avaliações recebidas
                  </p>
                </div>
                <div className="partida-media">
                  <p className="text-sm text-gray-500">Média</p>
                  <p className="text-lg font-bold text-green-700">
                    {jogador.totalAvaliacoes > 0 ? jogador.mediaPartida.toFixed(2) : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Avaliações abertas
  return (
    <div className="partida-conteudo">
      {/* Cabeçalho com ação do presidente */}
      <section className="partida-painel">
        <div className="partida-secao-topo">
          <div>
            <h2>Avalie seus companheiros</h2>
            <p>Notas de 0 a 10, com decimais · apenas jogadores do seu time.</p>
          </div>
          <span className="partida-etiqueta">Avaliações abertas</span>
        </div>

      {/* Formulário de avaliação (somente para quem participou) */}
      {!participou ? (
        <div className="partida-vazio-texto">
          <p>
            {ehPresidente
              ? 'Você não participou desta partida, então não avalia jogadores. Como presidente, você pode encerrar as avaliações acima.'
              : 'Apenas quem participou da partida pode avaliar os companheiros.'}
          </p>
        </div>
      ) : (
        <div>
          {arrayAvaliaveis.length === 0 ? (
            <p className="partida-vazio-texto">Não há companheiros para avaliar nesta partida.</p>
          ) : (
            <div className="partida-lista">
              {arrayAvaliaveis.map((avaliavel) => (
                <div key={avaliavel.id} className="partida-jogador">
                  <Avatar nome={avaliavel.nome} foto={avaliavel.foto} tamanho="md" corBorda="verde" />
                  <div className="partida-jogador-dados">
                    <p className="partida-nome-compacto">{avaliavel.nome}</p>
                    {avaliavel.posicoes.length > 0 && (
                      <p className="text-sm text-gray-500">{avaliavel.posicoes.join(', ')}</p>
                    )}
                  </div>
                  <label className="partida-nota-campo" htmlFor={'nota-' + avaliavel.id}>
                    <input
                      id={'nota-' + avaliavel.id}
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={mapaNotas[avaliavel.id]}
                      onChange={(evento) => handleMudarNota(avaliavel.id, evento.target.value)}
                      placeholder="—"
                      aria-label={'Nota de ' + avaliavel.nome}
                      className="partida-nota-input"
                    />
                    <span>/ 10</span>
                  </label>
                </div>
              ))}

              <div className="partida-rodape">
                <span>{arrayAvaliaveis.filter((avaliavel) => mapaNotas[avaliavel.id] !== '' && mapaNotas[avaliavel.id] !== undefined).length} de {arrayAvaliaveis.length} notas preenchidas</span>
                <button
                  onClick={handleSalvarAvaliacoes}
                  disabled={salvando} aria-busy={salvando}
                  className="partida-botao partida-botao-primario"
                >
                  {salvando ? <IndicadorCarregamento texto="Salvando..." /> : 'Salvar avaliações'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
        {ehPresidente && <div className="partida-rodape"><span>Administração da partida</span><button type="button" onClick={() => setModalEncerrarAberto(true)} className="partida-botao">Encerrar avaliações</button></div>}
      </section>

      {/* Modal de confirmação de encerramento */}
      <ModalConfirmacao
        aberto={modalEncerrarAberto}
        titulo="Encerrar avaliações"
        mensagem="Ao encerrar, ninguém poderá mais avaliar e as médias dos jogadores serão calculadas. Deseja continuar?"
        processando={encerrando}
        textoBotaoConfirmar={encerrando ? 'Encerrando...' : 'Encerrar'}
        corBotaoConfirmar="verde"
        onConfirmar={handleEncerrarAvaliacoes}
        onCancelar={() => setModalEncerrarAberto(false)}
      />
    </div>
  )
}

export default DetalhesPartida
