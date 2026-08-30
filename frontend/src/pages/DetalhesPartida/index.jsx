import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import ModalConfirmacao from '../../components/ModalConfirmacao.jsx'
import ModalMensagem from '../../components/ModalMensagem.jsx'
import { Trash2 } from 'lucide-react'

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
  const [vagasRestantes, setVagasRestantes] = useState(0)
  const [abaAtiva, setAbaAtiva] = useState('lista-jogadores')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [userId, setUserId] = useState(null)
  const [ehPresidente, setEhPresidente] = useState(false)
  const [estaConfirmado, setEstaConfirmado] = useState(false)
  const [participanteParaRemover, setParticipanteParaRemover] = useState(null)
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false)
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
      const respostaMembresia = await api.get('/patotas/' + dadosPartida.patotaId + '/verificar-membro/' + data.user.id)
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
      await api.post('/partidas/' + id + '/participar', { usuarioId: userId })
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
      await api.delete('/partidas/' + id + '/participar/' + userId)
      await carregarParticipantes(userId)
    }
    catch (erroRequisicao) {
      console.error('Erro ao recusar presença:', erroRequisicao)
      setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao recusar presença. Tente novamente.' })
    }
  }

  async function handleFinalizarPartida() {
    try {
      await api.put('/partidas/' + id + '/finalizar', { usuarioId: userId })
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

  async function handleRemoverParticipante() {
    if (!participanteParaRemover) return

    try {
      await api.delete('/partidas/' + id + '/participar/' + participanteParaRemover.id)
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

  const partidaFinalizada = partida.status === 'FINALIZADA'

  const arrayAbas = [
    { id: 'lista-jogadores', nome: 'Lista de jogadores' },
    { id: 'times', nome: 'Times' },
    { id: 'avaliacoes', nome: 'Avaliações' }
  ]

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      {/* Cabeçalho da partida */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/patota/' + partida.patotaId)}
          className="text-sm text-green-700 hover:underline cursor-pointer mb-2"
        >
          ← Voltar para a patota
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">{partida.patotaNome}</h1>
          {partidaFinalizada && (
            <span className="text-xs bg-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-full">
              Finalizada
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {formatarData(partida.data)} às {partida.horario} — {partida.local}
        </p>
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
        <AbaPlaceholder mensagem="A formação de times estará disponível nas próximas atualizações." />
      )}

      {abaAtiva === 'avaliacoes' && (
        <AbaPlaceholder mensagem="As avaliações estarão disponíveis após a partida ser finalizada, nas próximas atualizações." />
      )}

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
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
      {/* Cabeçalho: vagas + ações de presença */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">Vagas</p>
          <p className="text-gray-800 font-medium">
            {arrayParticipantes.length}/{vagasTotal}
            {!partidaFinalizada && (
              <span className="text-sm text-gray-500 font-normal">
                {' '}— {vagasRestantes} restante(s)
              </span>
            )}
          </p>
        </div>

        {/* Ações (apenas se a partida não está finalizada) */}
        {!partidaFinalizada && (
          <div className="flex items-center gap-3">
            {/* Presidente pode finalizar a partida */}
            {ehPresidente && (
              <button
                onClick={onFinalizar}
                className="border border-gray-400 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Finalizar partida
              </button>
            )}

            {estaConfirmado ? (
              <button
                onClick={onRecusar}
                className="border border-red-500 text-red-500 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Recusar presença
              </button>
            ) : (
              <button
                onClick={onConfirmar}
                disabled={vagasRestantes <= 0}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {vagasRestantes <= 0 ? 'Sem vagas' : 'Confirmar presença'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista de participantes */}
      {arrayParticipantes.length === 0 && (
        <p className="text-gray-500 text-center">
          {partidaFinalizada ? 'Nenhum jogador participou desta partida.' : 'Nenhum jogador confirmado ainda.'}
        </p>
      )}

      {arrayParticipantes.length > 0 && (
        <div className="flex flex-col gap-4">
          {arrayParticipantes.map((participante) => (
            <div key={participante.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              {/* Foto */}
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-green-200 shrink-0">
                {participante.foto ? (
                  <img
                    src={participante.foto}
                    alt={participante.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">
                      {participante.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Dados */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-gray-800 font-medium">{participante.nome}</p>
                  {participante.id === userId && (
                    <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                      Você
                    </span>
                  )}
                </div>
                {participante.posicoes.length > 0 && (
                  <p className="text-sm text-gray-500">{participante.posicoes.join(', ')}</p>
                )}
              </div>

              {/* Presidente pode remover jogador (se a partida não está finalizada) */}
              {ehPresidente && !partidaFinalizada && (
                <div>
                  <button
                    onClick={() => onRemover(participante)}
                    className="text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                    title="Remover jogador"
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

// Aba placeholder (Times / Avaliações)
function AbaPlaceholder({ mensagem }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
      <p className="text-gray-500 text-lg mb-2">Em breve</p>
      <p className="text-gray-400 text-sm">{mensagem}</p>
    </div>
  )
}

export default DetalhesPartida
