import { useState, useEffect } from 'react'
import { Camera, ChevronDown, Eye, EyeOff, Goal, LockKeyhole, Pencil, UserRound } from 'lucide-react'
import './style.css'
import { useNavigate } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import Avatar from '../../components/Avatar.jsx'
import RequisitosSenha from '../../components/RequisitosSenha.jsx'
import { senhaAtendeRequisitos, mensagemSenhaInvalida } from '../../utils/validacaoSenha.js'

// Modalidades hardcodadas
const arrayModalidades = [
  { id: 1, nome: 'Futebol de campo' },
  { id: 2, nome: 'Futebol society' },
  { id: 3, nome: 'Futebol de salão' }
]

// Posições por modalidade
const posicoesPorModalidade = {
  1: [
    { id: 1, nome: 'Goleiro' },
    { id: 2, nome: 'Zagueiro' },
    { id: 3, nome: 'Lateral' },
    { id: 4, nome: 'Volante' },
    { id: 5, nome: 'Meia' },
    { id: 6, nome: 'Atacante' }
  ],
  2: [
    { id: 1, nome: 'Goleiro' },
    { id: 7, nome: 'Fixo' },
    { id: 8, nome: 'Ala' },
    { id: 9, nome: 'Pivô' }
  ],
  3: [
    { id: 1, nome: 'Goleiro' },
    { id: 7, nome: 'Fixo' },
    { id: 8, nome: 'Ala' },
    { id: 9, nome: 'Pivô' }
  ]
}

function Perfil() {
  const [usuario, setUsuario] = useState(null)
  const [editando, setEditando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // Campos editáveis
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [arrayModalidadesSelecionadas, setModalidadesSelecionadas] = useState([])
  const [arrayPosicoesSelecionadas, setPosicoesSelecionadas] = useState([])
  const [fotoUrl, setFotoUrl] = useState(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('')

  const [userId, setUserId] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    carregarPerfil()
  }, [])

  async function carregarPerfil() {
    const { data } = await supabase.auth.getUser()

    if (!data || !data.user) {
      navigate('/login')
      return
    }

    setUserId(data.user.id)

    try {
      const resposta = await api.get('/usuarios/me')
      const dadosUsuario = resposta.data

      setUsuario(dadosUsuario)
      setNome(dadosUsuario.nome || '')
      setTelefone(dadosUsuario.telefone || '')
      setFotoUrl(dadosUsuario.foto || null)

      // Formatar data para input type="date"
      if (dadosUsuario.dataNascimento) {
        const dataObj = new Date(dadosUsuario.dataNascimento)
        const ano = dataObj.getFullYear()
        const mes = String(dataObj.getMonth() + 1).padStart(2, '0')
        const dia = String(dataObj.getDate()).padStart(2, '0')
        setDataNascimento(ano + '-' + mes + '-' + dia)
      }

      // Extrair IDs das modalidades
      const arrayIdsModalidades = []
      if (dadosUsuario.modalidades) {
        for (const item of dadosUsuario.modalidades) {
          arrayIdsModalidades.push(item.modalidade.id)
        }
      }
      setModalidadesSelecionadas(arrayIdsModalidades)

      // Extrair IDs das posições
      const arrayIdsPosicoes = []
      if (dadosUsuario.posicoes) {
        for (const item of dadosUsuario.posicoes) {
          arrayIdsPosicoes.push(item.posicao.id)
        }
      }
      setPosicoesSelecionadas(arrayIdsPosicoes)

      setCarregando(false)
    } 
    catch (erroRequisicao) {
      console.error('Erro ao carregar perfil:', erroRequisicao)
      setErro('Erro ao carregar dados do perfil.')
      setCarregando(false)
    }
  }

  function obterPosicoesDisponiveis() {
    const arrayPosicoes = []
    const arrayIdsJaAdicionados = []

    for (const modalidadeId of arrayModalidadesSelecionadas) {
      const arrayPosicoesDaModalidade = posicoesPorModalidade[modalidadeId]
      if (arrayPosicoesDaModalidade) {
        for (const posicao of arrayPosicoesDaModalidade) {
          if (!arrayIdsJaAdicionados.includes(posicao.id)) {
            arrayIdsJaAdicionados.push(posicao.id)
            arrayPosicoes.push(posicao)
          }
        }
      }
    }

    return arrayPosicoes
  }

  function handleModalidadeChange(modalidadeId) {
    let arrayNovasModalidades = []

    if (arrayModalidadesSelecionadas.includes(modalidadeId)) {
      for (const id of arrayModalidadesSelecionadas) {
        if (id !== modalidadeId) {
          arrayNovasModalidades.push(id)
        }
      }
    } else {
      for (const id of arrayModalidadesSelecionadas) {
        arrayNovasModalidades.push(id)
      }
      arrayNovasModalidades.push(modalidadeId)
    }

    setModalidadesSelecionadas(arrayNovasModalidades)

    // Remove posições inválidas
    const arrayIdsPosicoesValidas = []
    for (const modId of arrayNovasModalidades) {
      const arrayPosicoesDaModalidade = posicoesPorModalidade[modId]
      if (arrayPosicoesDaModalidade) {
        for (const posicao of arrayPosicoesDaModalidade) {
          if (!arrayIdsPosicoesValidas.includes(posicao.id)) {
            arrayIdsPosicoesValidas.push(posicao.id)
          }
        }
      }
    }

    const arrayPosicoesAtualizadas = []
    for (const posId of arrayPosicoesSelecionadas) {
      if (arrayIdsPosicoesValidas.includes(posId)) {
        arrayPosicoesAtualizadas.push(posId)
      }
    }
    setPosicoesSelecionadas(arrayPosicoesAtualizadas)
  }

  function handlePosicaoChange(posicaoId) {
    let arrayNovasPosicoes = []

    if (arrayPosicoesSelecionadas.includes(posicaoId)) {
      for (const id of arrayPosicoesSelecionadas) {
        if (id !== posicaoId) {
          arrayNovasPosicoes.push(id)
        }
      }
    } else {
      for (const id of arrayPosicoesSelecionadas) {
        arrayNovasPosicoes.push(id)
      }
      arrayNovasPosicoes.push(posicaoId)
    }

    setPosicoesSelecionadas(arrayNovasPosicoes)
  }

  async function handleUploadFoto(evento) {
    const arquivo = evento.target.files[0]
    if (!arquivo) return

    setUploadingFoto(true)

    const nomeArquivo = userId + '-' + Date.now() + '.' + arquivo.name.split('.').pop()

    const { error } = await supabase.storage
      .from('avatars')
      .upload(nomeArquivo, arquivo, { upsert: true })

    if (error) {
      console.error('Erro no upload:', error)
      setErro('Erro ao enviar foto.')
      setUploadingFoto(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(nomeArquivo)

    const novaUrl = urlData.publicUrl
    setFotoUrl(novaUrl)

    // Salva a URL da foto no backend
    try {
      await api.put('/usuarios/me', { foto: novaUrl })
    } 
    catch (erroSalvar) {
      console.error('Erro ao salvar URL da foto:', erroSalvar)
    }

    setUploadingFoto(false)
  }

  async function handleSalvar() {
    setErro('')
    setSucesso('')

    const preenchendoSenha = senhaAtual || novaSenha || confirmacaoSenha

    if (preenchendoSenha && !senhaAtual) {
      setErro('Informe a senha atual.')
      return
    }

    if (preenchendoSenha && !senhaAtendeRequisitos(novaSenha)) {
      setErro(mensagemSenhaInvalida)
      return
    }

    if (preenchendoSenha && novaSenha !== confirmacaoSenha) {
      setErro('A nova senha e a confirmação não coincidem.')
      return
    }

    if (!nome.trim()) {
      setErro('O nome é obrigatório.')
      return
    }

    if (arrayModalidadesSelecionadas.length === 0) {
      setErro('Selecione ao menos uma modalidade.')
      return
    }

    if (arrayPosicoesSelecionadas.length === 0) {
      setErro('Selecione ao menos uma posição.')
      return
    }

    // Verifica se cada modalidade selecionada tem ao menos uma posição marcada
    for (const modalidadeId of arrayModalidadesSelecionadas) {
      const arrayPosicoesDaModalidade = posicoesPorModalidade[modalidadeId]
      let temPosicao = false

      if (arrayPosicoesDaModalidade) {
        for (const posicao of arrayPosicoesDaModalidade) {
          if (arrayPosicoesSelecionadas.includes(posicao.id)) {
            temPosicao = true
            break
          }
        }
      }

      if (!temPosicao) {
        let nomeModalidade = ''
        for (const mod of arrayModalidades) {
          if (mod.id === modalidadeId) {
            nomeModalidade = mod.nome
            break
          }
        }
        setErro('Selecione ao menos uma posição para a modalidade ' + nomeModalidade + '.')
        return
      }
    }

    setSalvando(true)

    try {
      if (preenchendoSenha) {
        const { data: dadosAutenticacao, error: erroAutenticacao } = await supabase.auth.getUser()

        if (erroAutenticacao || !dadosAutenticacao || !dadosAutenticacao.user || !dadosAutenticacao.user.email) {
          setErro('Não foi possível validar o usuário autenticado. Entre novamente e tente outra vez.')
          setSalvando(false)
          return
        }

        const { error: erroReautenticacao } = await supabase.auth.signInWithPassword({
          email: dadosAutenticacao.user.email,
          password: senhaAtual
        })

        if (erroReautenticacao) {
          setErro('A senha atual está incorreta.')
          setSalvando(false)
          return
        }

        const { error: erroAlterarSenha } = await supabase.auth.updateUser({
          password: novaSenha
        })

        if (erroAlterarSenha) {
          console.error('Erro ao alterar senha:', erroAlterarSenha)
          setErro('Não foi possível alterar a senha. Tente novamente.')
          setSalvando(false)
          return
        }
      }

      const dadosAtualizar = {
        nome: nome,
        telefone: telefone,
        dataNascimento: dataNascimento,
        modalidades: arrayModalidadesSelecionadas,
        posicoes: arrayPosicoesSelecionadas
      }

      const resposta = await api.put('/usuarios/me', dadosAtualizar)
      setUsuario(resposta.data)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmacaoSenha('')
      setSucesso('Perfil atualizado com sucesso!')
      setEditando(false)
      setSalvando(false)
    } catch (erroSalvar) {
      console.error('Erro ao salvar perfil:', erroSalvar)
      setErro('Erro ao salvar alterações.')
      setSalvando(false)
    }
  }

  function handleCancelar() {
    // Restaura os valores originais
    setNome(usuario.nome || '')
    setTelefone(usuario.telefone || '')
    setFotoUrl(usuario.foto || null)

    if (usuario.dataNascimento) {
      const dataObj = new Date(usuario.dataNascimento)
      const ano = dataObj.getFullYear()
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0')
      const dia = String(dataObj.getDate()).padStart(2, '0')
      setDataNascimento(ano + '-' + mes + '-' + dia)
    } else {
      setDataNascimento('')
    }

    const arrayIdsModalidades = []
    if (usuario.modalidades) {
      for (const item of usuario.modalidades) {
        arrayIdsModalidades.push(item.modalidade.id)
      }
    }
    setModalidadesSelecionadas(arrayIdsModalidades)

    const arrayIdsPosicoes = []
    if (usuario.posicoes) {
      for (const item of usuario.posicoes) {
        arrayIdsPosicoes.push(item.posicao.id)
      }
    }
    setPosicoesSelecionadas(arrayIdsPosicoes)

    setErro('')
    setSucesso('')
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmacaoSenha('')
    setEditando(false)
  }

  function formatarTelefone(valor) {
    let numeros = valor.replace(/\D/g, '')
    if (numeros.length > 11) {
      numeros = numeros.substring(0, 11)
    }
    let resultado = ''
    if (numeros.length > 0) {
      resultado = '(' + numeros.substring(0, 2)
    }
    if (numeros.length > 2) {
      resultado = resultado + ') ' + numeros.substring(2, 7)
    }
    if (numeros.length > 7) {
      resultado = resultado + '-' + numeros.substring(7, 11)
    }
    return resultado
  }

  function handleTelefoneChange(e) {
    const valorFormatado = formatarTelefone(e.target.value)
    setTelefone(valorFormatado)
  }

  if (carregando) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-gray-500 text-center">Carregando...</p>
      </main>
    )
  }

  if (!usuario) {
    return <main className="mx-auto max-w-[836px] px-6 py-10"><p role="alert" className="text-sm text-red-700">{erro || 'Não foi possível carregar o perfil.'}</p></main>
  }

  const arrayPosicoesDisponiveis = obterPosicoesDisponiveis()
  let nascimentoFormatado = 'Não informado'
  if (dataNascimento) {
    nascimentoFormatado = dataNascimento.split('-').reverse().join('/')
  }

  return (
    <main className="perfil-page mx-auto max-w-[836px] px-4 py-7 text-[#172d20] sm:px-7">
      <div className="mb-[22px] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] font-semibold leading-tight tracking-[-0.7px]">Meu perfil</h1>
          <p className="text-[13px] text-[#65736a]">Seus dados e seu jeito de jogar.</p>
        </div>
        {!editando && <button type="button" onClick={() => { setErro(''); setSucesso(''); setEditando(true) }} className="perfil-button perfil-primary"><Pencil size={16} aria-hidden="true" />Editar perfil</button>}
      </div>

      <div className="overflow-hidden rounded-[22px] border border-[#dce5df] bg-white">
        <section className="flex flex-wrap items-center gap-4 border-b border-[#dce5df] bg-[#edf8f0] px-[22px] py-6 sm:px-7" aria-label="Resumo do jogador">
          <div className="perfil-avatar"><Avatar nome={usuario.nome} foto={fotoUrl} tamanho="xl" corBorda="verde" /></div>
          <div className="min-w-[130px] flex-1">
            <p className="break-words text-[19px] font-semibold">{usuario.nome}</p>
            {editando ? (
              <div>
                <label className="relative inline-flex min-h-11 items-center gap-2 text-xs text-green-700 hover:underline cursor-pointer focus-within:outline-2 focus-within:outline-green-700 rounded">
                  <Camera size={15} aria-hidden="true" />{uploadingFoto ? 'Enviando...' : 'Alterar foto'}
                  <input type="file" accept="image/*" aria-label="Alterar foto" onChange={handleUploadFoto} disabled={uploadingFoto || salvando} className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                </label>
                <p className="text-xs text-[#65736a]">A foto é salva ao enviar.</p>
              </div>
            ) : <p className="mt-1 text-xs text-[#65736a]">Seu perfil de jogador</p>}
          </div>
          <div className="perfil-rating">
            <p className="text-xs text-[#65736a]">Média geral</p>
            {usuario.totalAvaliacoes > 0 ? (
              <>
                <p className="my-1 text-[26px] font-semibold leading-tight text-green-700">{Number(usuario.mediaGeral).toFixed(2).replace('.', ',')} <span className="text-xs font-normal text-[#65736a]">/ 10</span></p>
                <p className="text-xs text-[#65736a]">{usuario.totalAvaliacoes} avaliações recebidas</p>
              </>
            ) : <p className="mt-2 text-sm text-[#65736a]">Sem avaliações ainda</p>}
          </div>
        </section>

        <form className="px-[22px] sm:px-7" aria-busy={salvando} onSubmit={(evento) => { evento.preventDefault(); if (editando && !salvando && !uploadingFoto) handleSalvar() }}>
          <fieldset disabled={salvando} className="min-w-0">
            <section className="border-b border-[#dce5df] py-6" aria-labelledby="perfil-dados">
              <h2 id="perfil-dados" className="perfil-heading"><UserRound size={18} aria-hidden="true" />Seus dados</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="min-w-0">
                  {editando ? <><label htmlFor="perfil-nome" className="perfil-label">Nome completo</label><input id="perfil-nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} className="perfil-input" /></> : <><p className="perfil-label">Nome completo</p><p className="break-words text-sm">{usuario.nome}</p></>}
                </div>
                <div className="min-w-0">
                  {editando ? <><label htmlFor="perfil-email" className="perfil-label">E-mail</label><input id="perfil-email" type="email" value={usuario.email || ''} readOnly className="perfil-input" /><p className="mt-1 text-xs text-[#65736a]">O e-mail não pode ser alterado.</p></> : <><p className="perfil-label">E-mail</p><p className="break-words text-sm">{usuario.email}</p></>}
                </div>
                <div className="min-w-0">
                  {editando ? <><label htmlFor="perfil-telefone" className="perfil-label">Telefone (com DDD)</label><input id="perfil-telefone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={telefone} onChange={handleTelefoneChange} className="perfil-input" /></> : <><p className="perfil-label">Telefone (com DDD)</p><p className="text-sm">{usuario.telefone || 'Não informado'}</p></>}
                </div>
                <div className="min-w-0">
                  {editando ? <><label htmlFor="perfil-nascimento" className="perfil-label">Data de nascimento</label><input id="perfil-nascimento" type="date" autoComplete="bday" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className="perfil-input" /></> : <><p className="perfil-label">Data de nascimento</p><p className="text-sm">{nascimentoFormatado}</p></>}
                </div>
              </div>
            </section>

            <section className="py-6" aria-labelledby="perfil-futebol">
              <h2 id="perfil-futebol" className="perfil-heading"><Goal size={18} aria-hidden="true" />Seu futebol</h2>
              <div className="flex flex-col gap-5">
                <fieldset className="min-w-0">
                  <legend className="perfil-label">Modalidades</legend>
                  {editando ? <><p className="mb-3 text-xs text-[#65736a]">Selecione uma ou mais modalidades.</p><div className="flex flex-wrap gap-2">
                    {arrayModalidades.map((modalidade) => <label key={modalidade.id} className="perfil-option"><input type="checkbox" checked={arrayModalidadesSelecionadas.includes(modalidade.id)} onChange={() => handleModalidadeChange(modalidade.id)} /><span>{modalidade.nome}</span></label>)}
                  </div></> : <div className="flex flex-wrap gap-2">{usuario.modalidades && usuario.modalidades.map((item) => <span key={item.modalidade.id} className="perfil-tag">{item.modalidade.nome}</span>)}</div>}
                </fieldset>
                <fieldset className="min-w-0">
                  <legend className="perfil-label">Posições</legend>
                  {editando ? <><p className="mb-3 text-xs text-[#65736a]" aria-live="polite">{arrayPosicoesDisponiveis.length > 0 ? 'Escolha ao menos uma posição para cada modalidade.' : 'Selecione uma modalidade para ver as posições.'}</p><div className="flex flex-wrap gap-2">
                    {arrayPosicoesDisponiveis.map((posicao) => <label key={posicao.id} className="perfil-option"><input type="checkbox" checked={arrayPosicoesSelecionadas.includes(posicao.id)} onChange={() => handlePosicaoChange(posicao.id)} /><span>{posicao.nome}</span></label>)}
                  </div></> : <div className="flex flex-wrap gap-2">{usuario.posicoes && usuario.posicoes.map((item) => <span key={item.posicao.id} className="perfil-tag">{item.posicao.nome}</span>)}</div>}
                </fieldset>
              </div>
            </section>

            {editando && <section className="border-t border-[#dce5df] py-5">
              <details className="perfil-security">
                <summary className="flex min-h-11 items-center justify-between gap-3 cursor-pointer rounded">
                  <span className="flex items-center gap-2.5 text-[15px] font-semibold"><LockKeyhole size={18} className="text-green-700" aria-hidden="true" />Alterar senha</span>
                  <span className="flex items-center gap-2 text-xs text-[#65736a]">Opcional<ChevronDown size={16} className="perfil-chevron" aria-hidden="true" /></span>
                </summary>
                <p className="mb-4 mt-3 text-xs text-[#65736a]">Preencha apenas se quiser trocar sua senha.</p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <CampoSenhaPerfil id="senhaAtual" label="Senha atual" valor={senhaAtual} aoAlterar={setSenhaAtual} autoComplete="current-password" />
                  <div className="hidden sm:block" aria-hidden="true" />
                  <CampoSenhaPerfil id="novaSenha" label="Nova senha" valor={novaSenha} aoAlterar={setNovaSenha} autoComplete="new-password" descricao="perfil-requisitos" />
                  <CampoSenhaPerfil id="confirmacaoSenha" label="Confirme a nova senha" valor={confirmacaoSenha} aoAlterar={setConfirmacaoSenha} autoComplete="new-password" />
                </div>
                <div id="perfil-requisitos" className="perfil-requisitos"><RequisitosSenha senha={novaSenha} /></div>
              </details>
            </section>}
          </fieldset>

          {erro && <p role="alert" className="mb-5 text-sm text-red-700">{erro}</p>}
          {sucesso && <p role="status" className="mb-5 text-sm text-green-700">{sucesso}</p>}
          {editando && <div className="flex flex-wrap justify-end gap-2.5 border-t border-[#dce5df] py-[22px]">
            <button type="button" onClick={handleCancelar} disabled={salvando || uploadingFoto} className="perfil-button flex-1 sm:flex-none">Cancelar</button>
            <button type="submit" disabled={salvando || uploadingFoto} className="perfil-button perfil-primary flex-1 sm:flex-none">{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
          </div>}
        </form>
      </div>
    </main>
  )
}

function CampoSenhaPerfil({ id, label, valor, aoAlterar, autoComplete, descricao }) {
  const [visivel, setVisivel] = useState(false)

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="perfil-label">{label}</label>
      <div className="relative">
        <input id={id} type={visivel ? 'text' : 'password'} value={valor} onChange={(evento) => aoAlterar(evento.target.value)} autoComplete={autoComplete} aria-describedby={descricao} className="perfil-input perfil-input-senha" />
        <button type="button" onClick={() => setVisivel(!visivel)} aria-label={(visivel ? 'Ocultar ' : 'Mostrar ') + label.toLowerCase()} aria-pressed={visivel} aria-controls={id} className="perfil-eye">
          {visivel ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}

export default Perfil
