import { CarregamentoPagina, IndicadorCarregamento } from '../../components/Carregamento.jsx'
import { useState, useEffect, useRef } from 'react'
import { CalendarDays, CirclePlus, MapPin, Shield, Upload } from 'lucide-react'
import './style.css'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../../services/api.js'
import ibgeApi from '../../services/ibgeApi.js'
import { consultarCep } from '../../services/viacep.js'
import { enviarEmblema, excluirEmblema, validarArquivoEmblema } from '../../services/emblemasPatotas.js'
import EmblemaPatota from '../../components/EmblemaPatota.jsx'

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
const arrayUfs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

function CriarPatota() {
  const { id } = useParams()
  const modoEdicao = !!id

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [modalidadeId, setModalidadeId] = useState('')
  const [rua, setRua] = useState('')
  const [cep, setCep] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [carregandoCep, setCarregandoCep] = useState(false)
  const [mensagemCep, setMensagemCep] = useState('')
  const [enderecoLegado, setEnderecoLegado] = useState(false)
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [arrayEstados, setArrayEstados] = useState(arrayUfs.map(function (uf) { return { id: uf, sigla: uf, nome: uf } }))
  const [arrayCidades, setArrayCidades] = useState([])
  const [carregandoEstados, setCarregandoEstados] = useState(true)
  const [carregandoCidades, setCarregandoCidades] = useState(false)
  const [diaHabitual, setDiaHabitual] = useState('')
  const [horaHabitual, setHoraHabitual] = useState('')
  const [emblemaPath, setEmblemaPath] = useState('')
  const [arquivoEmblema, setArquivoEmblema] = useState(null)
  const [previewEmblema, setPreviewEmblema] = useState('')
  const [removerEmblema, setRemoverEmblema] = useState(false)
  const [patotaCriadaId, setPatotaCriadaId] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(modoEdicao)

  const navigate = useNavigate()
  const inputEmblemaRef = useRef(null)
  const consultaCepRef = useRef(null)

  useEffect(() => {
    return function () {
      if (consultaCepRef.current) consultaCepRef.current.abort()
    }
  }, [])

  function cancelarConsultaCep() {
    if (consultaCepRef.current) consultaCepRef.current.abort()
    setCarregandoCep(false)
    setMensagemCep('')
  }

  async function preencherPeloCep() {
    cancelarConsultaCep()
    const controlador = new AbortController()
    consultaCepRef.current = controlador
    setCarregandoCep(true)
    try {
      const endereco = await consultarCep(cep, controlador.signal)
      if (controlador.signal.aborted) return
      setRua(endereco.logradouro || '')
      setEstado(endereco.uf || '')
      setCidade(endereco.localidade || '')
      setMensagemCep('Endereço preenchido. Confira os dados e informe o número ou S/N.')
    } catch (erroCep) {
      if (controlador.signal.aborted) return
      setMensagemCep(erroCep.message || 'Consulta de CEP indisponível. Preencha o endereço manualmente.')
    } finally {
      if (!controlador.signal.aborted) setCarregandoCep(false)
    }
  }

  useEffect(() => {
    return function () {
      if (previewEmblema) URL.revokeObjectURL(previewEmblema)
    }
  }, [previewEmblema])

  useEffect(() => {
    const controlador = new AbortController()
    carregarEstados(controlador.signal)
    return () => controlador.abort()
  }, [])

  useEffect(() => {
    const controlador = new AbortController()
    if (estado) {
      carregarCidades(estado, controlador.signal)
    } else {
      setArrayCidades([])
      setCarregandoCidades(false)
    }
    return () => controlador.abort()
  }, [estado])

  useEffect(() => {
    if (modoEdicao) {
      carregarPatota()
    }
  }, [id])

  async function carregarEstados(sinal) {
    setCarregandoEstados(true)
    try {
      const resposta = await ibgeApi.get('/estados?orderBy=nome', { signal: sinal })
      if (sinal.aborted) return
      setArrayEstados(resposta.data)
    }
    catch (erro) {
      if (sinal.aborted) return
      console.error('Erro ao carregar estados:', erro)
    }
    finally {
      if (!sinal.aborted) setCarregandoEstados(false)
    }
  }

  async function carregarCidades(estado, sinal) {
    setCarregandoCidades(true)
    setArrayCidades([])
    try {
      const resposta = await ibgeApi.get('/estados/' + estado + '/municipios?orderBy=nome', { signal: sinal })
      if (sinal.aborted) return
      setArrayCidades(resposta.data)
    }
    catch (erro) {
      if (sinal.aborted) return
      console.error('Erro ao carregar cidades:', erro)
    }
    finally {
      if (!sinal.aborted) setCarregandoCidades(false)
    }
  }

  function alterarEstado(novoEstado) {
    cancelarConsultaCep()
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
      setCep(patota.cep || '')
      setNumero(patota.numero || '')
      setComplemento(patota.complemento || '')
      setEnderecoLegado(!patota.temLocalizacao)
      setCidade(patota.cidade || '')
      setEstado(patota.estado || '')
      setDiaHabitual(patota.diaHabitual ? String(patota.diaHabitual) : '')
      setHoraHabitual(patota.horaHabitual ? patota.horaHabitual.substring(0, 5) : '')
      setEmblemaPath(patota.emblemaPath || '')

      setCarregandoDados(false)
    } catch (erroRequisicao) {
      console.error('Erro ao carregar patota:', erroRequisicao)
      setErro('Erro ao carregar dados da patota.')
      setCarregandoDados(false)
    }
  }

  function selecionarEmblema(evento) {
    const arquivo = evento.target.files[0]
    if (!arquivo) return

    const mensagemErro = validarArquivoEmblema(arquivo)
    if (mensagemErro) {
      setArquivoEmblema(null)
      setPreviewEmblema('')
      setRemoverEmblema(false)
      setErro(mensagemErro)
      evento.target.value = ''
      return
    }

    setArquivoEmblema(arquivo)
    setPreviewEmblema(URL.createObjectURL(arquivo))
    setRemoverEmblema(false)
    setErro('')
  }

  function removerSelecaoEmblema() {
    setArquivoEmblema(null)
    setPreviewEmblema('')
    setRemoverEmblema(true)
    if (inputEmblemaRef.current) {
      inputEmblemaRef.current.value = ''
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
    const dadosPatota = {
      nome: nome,
      descricao: descricao,
      modalidadeId: Number(modalidadeId),
      rua: rua,
      cep: cep,
      numero: numero,
      complemento: complemento,
      cidade: cidade,
      estado: estado,
      diaHabitual: null,
      horaHabitual: horaHabitual || null
    }
    if (diaHabitual) dadosPatota.diaHabitual = Number(diaHabitual)

    let patotaAlvoId = id || patotaCriadaId
    let caminhoNovo = ''

    try {
      if (!patotaAlvoId) {
        const resposta = await api.post('/patotas', dadosPatota)
        patotaAlvoId = resposta.data.id
        setPatotaCriadaId(patotaAlvoId)
      }

      if (arquivoEmblema) {
        caminhoNovo = await enviarEmblema(patotaAlvoId, arquivoEmblema)
        dadosPatota.emblemaPath = caminhoNovo
      } else if (removerEmblema && modoEdicao) {
        dadosPatota.emblemaPath = null
      }

      if (modoEdicao || patotaCriadaId || caminhoNovo) {
        await api.put('/patotas/' + patotaAlvoId, dadosPatota)
      }

      if (emblemaPath && (caminhoNovo || removerEmblema)) {
        try {
          await excluirEmblema(emblemaPath)
        } catch (erroExclusao) {
          console.warn('Não foi possível remover o emblema anterior:', erroExclusao)
        }
      }

      if (modoEdicao) {
        navigate('/patota/' + patotaAlvoId)
      } else {
        navigate('/minhas-patotas')
      }
    } catch (erroRequisicao) {
      console.error('Erro ao salvar patota ou emblema:', erroRequisicao)
      if (caminhoNovo) {
        try {
          await excluirEmblema(caminhoNovo)
        } catch (erroExclusao) {
          console.warn('Não foi possível limpar o upload não salvo:', erroExclusao)
        }
      }

      if (!modoEdicao && patotaAlvoId) {
        setErro('A patota foi criada, mas não foi possível concluir o salvamento. Tente novamente nesta tela para não criar outra patota.')
      } else {
        setErro(erroRequisicao.response?.data?.erro || 'Erro ao salvar patota. Tente novamente.')
      }
    } finally {
      setCarregando(false)
    }
  }

  if (carregandoDados) {
    return <CarregamentoPagina tipo="formulario" titulo="Editar patota" mensagem="Carregando dados da patota..." className="mx-auto max-w-[836px] px-4 py-7 sm:px-7" />
  }

  let rotaCancelar = '/minhas-patotas'
  if (modoEdicao) rotaCancelar = '/patota/' + id
  if (patotaCriadaId) rotaCancelar = '/patota/' + patotaCriadaId
  const formularioEdicao = modoEdicao || !!patotaCriadaId

  return (
    <main className="criar-patota-page mx-auto max-w-[836px] px-4 py-7 text-[#172d20] sm:px-7">
      <h1 className="mb-2 text-[26px] font-semibold leading-tight tracking-[-0.7px]">{formularioEdicao ? 'Editar patota' : 'Criar patota'}</h1>
      <p className="mb-[22px] text-[13px] text-[#65736a]">{formularioEdicao ? 'Atualize os dados e a rotina da sua patota.' : 'Dê um nome à sua turma e organize o próximo jogo.'}</p>
      <form onSubmit={handleSubmit} aria-busy={carregando} className="rounded-[22px] border border-[#dce5df] bg-white px-5 sm:px-7">
        <fieldset disabled={carregando} className="min-w-0">
          <section className="border-b border-[#dce5df] py-6" aria-labelledby="patota-identidade">
            <h2 id="patota-identidade" className="patota-form-heading"><Shield size={18} aria-hidden="true" />Sua patota</h2>
            <div className="mb-[22px] flex flex-wrap items-center gap-[18px] rounded-[14px] bg-[#edf8f0] p-[18px]">
              <EmblemaPatota nome={nome} emblemaPath={removerEmblema ? '' : emblemaPath} previewUrl={previewEmblema} tamanho="formulario" />
              <div className="min-w-[150px] flex-1">
                <p className="patota-form-label">Emblema <span className="patota-form-optional">· opcional</span></p>
                <div className="flex flex-wrap items-center gap-x-3">
                  <label className="patota-form-button relative focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-700">
                    <Upload size={16} aria-hidden="true" />Escolher imagem
                    <input ref={inputEmblemaRef} id="emblemaPatota" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Escolher emblema" aria-describedby="emblema-ajuda" onChange={selecionarEmblema} className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                  </label>
                  {(arquivoEmblema || (emblemaPath && !removerEmblema)) && <button type="button" onClick={removerSelecaoEmblema} className="min-h-11 text-xs text-red-700 hover:underline cursor-pointer">Remover emblema</button>}
                </div>
                <p id="emblema-ajuda" className="mt-2 text-[11px] leading-relaxed text-[#65736a]">PNG, JPG ou WebP, até 2 MB. Prefira uma imagem quadrada.</p>
                {arquivoEmblema && <p className="mt-1 break-all text-xs text-[#65736a]" role="status">{arquivoEmblema.name}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-[18px]">
              <div>
                <label htmlFor="nome" className="patota-form-label">Nome da patota</label>
                <input id="nome" type="text" placeholder="Ex.: Pelada do Sábado" value={nome} onChange={(e) => setNome(e.target.value)} required className="patota-form-input" />
              </div>
              <div>
                <label htmlFor="descricao" className="patota-form-label">Descrição <span className="patota-form-optional">· opcional</span></label>
                <textarea id="descricao" placeholder="Conte um pouco sobre a turma e os jogos." value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className="patota-form-input resize-y" />
              </div>
              <fieldset className="min-w-0" aria-describedby="modalidade-ajuda">
                <legend className="patota-form-label">Modalidade</legend>
                <p id="modalidade-ajuda" className="mb-3.5 text-xs text-[#65736a]">Escolha a modalidade da sua patota.</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {arrayModalidades.map((modalidade) => (
                    <label key={modalidade.id} className="patota-form-option">
                      <input type="radio" name="modalidade" value={String(modalidade.id)} checked={modalidadeId === String(modalidade.id)} onChange={(e) => setModalidadeId(e.target.value)} required />
                      <span>{modalidade.nome}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="border-b border-[#dce5df] py-6" aria-labelledby="patota-local">
            <h2 id="patota-local" className="patota-form-heading"><MapPin size={18} aria-hidden="true" />Local dos jogos</h2>
            {enderecoLegado && <p className="mb-4 text-sm text-amber-800">Complete o endereço para que sua patota apareça na busca por proximidade.</p>}
            <div className="flex flex-col gap-[18px]">
              <div>
                <label htmlFor="cep" className="patota-form-label">CEP</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input id="cep" type="text" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={cep} onChange={(evento) => { cancelarConsultaCep(); setCep(evento.target.value.replace(/\D/g, '').slice(0, 8)) }} required pattern="[0-9]{8}" maxLength={9} aria-describedby="cep-ajuda" className="patota-form-input sm:max-w-48" />
                  <button type="button" onClick={preencherPeloCep} disabled={cep.length !== 8 || carregandoCep} className="patota-form-button">
                    {carregandoCep ? <IndicadorCarregamento texto="Consultando CEP..." /> : 'Preencher pelo CEP'}
                  </button>
                </div>
                <p id="cep-ajuda" className="mt-2 text-xs text-[#65736a]">Consulte o ViaCEP para preencher o endereço. Você pode corrigir os campos manualmente.</p>
                {mensagemCep && <p role="status" className="mt-2 text-sm text-[#65736a]">{mensagemCep}</p>}
              </div>
              <div>
                <label htmlFor="rua" className="patota-form-label">Rua</label>
                <input id="rua" type="text" placeholder="Ex.: Rua das Flores" value={rua} onChange={(e) => { cancelarConsultaCep(); setRua(e.target.value) }} maxLength={200} required className="patota-form-input" />
              </div>
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                <div>
                  <label htmlFor="numero" className="patota-form-label">Número</label>
                  <input id="numero" value={numero} onChange={(evento) => setNumero(evento.target.value)} maxLength={30} placeholder="Ex.: 123 ou S/N" required className="patota-form-input" />
                </div>
                <div>
                  <label htmlFor="complemento" className="patota-form-label">Complemento <span className="patota-form-optional">· opcional</span></label>
                  <input id="complemento" value={complemento} onChange={(evento) => setComplemento(evento.target.value)} maxLength={120} placeholder="Ex.: Quadra 2" className="patota-form-input" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="estado" className="patota-form-label">Estado</label>
                  <select id="estado" value={estado} onChange={(e) => alterarEstado(e.target.value)} required aria-busy={carregandoEstados} className="patota-form-input">
                    <option value="" disabled>Selecione o estado</option>
                    {arrayEstados.map((estadoOpcao) => <option key={estadoOpcao.id} value={estadoOpcao.sigla}>{estadoOpcao.nome} ({estadoOpcao.sigla})</option>)}
                  </select>
                  {carregandoEstados && <div className="mt-2 text-xs text-green-700"><IndicadorCarregamento texto="Buscando estados..." /></div>}
                </div>
                <div className="min-w-0">
                  <label htmlFor="cidade" className="patota-form-label">Cidade</label>
                  <input id="cidade" list="cidades-patota" value={cidade} onChange={(e) => { cancelarConsultaCep(); setCidade(e.target.value) }} required maxLength={100} placeholder="Informe a cidade" className="patota-form-input" />
                  <datalist id="cidades-patota">
                    {arrayCidades.map((cidadeOpcao) => <option key={cidadeOpcao.id} value={cidadeOpcao.nome} />)}
                  </datalist>
                  {carregandoCidades && <div className="mt-2 text-xs text-green-700"><IndicadorCarregamento texto="Buscando cidades..." /></div>}
                </div>
              </div>
              <p className="text-xs leading-relaxed text-[#65736a]">Ao salvar, consultamos a localização do local dos jogos. Dados geográficos © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a>.</p>
            </div>
          </section>

          <section className="border-b border-[#dce5df] py-6" aria-labelledby="patota-rotina">
            <h2 id="patota-rotina" className="patota-form-heading"><CalendarDays size={18} aria-hidden="true" />Rotina da patota</h2>
            <p className="mb-3.5 text-xs leading-relaxed text-[#65736a]">Defina o dia e o horário de costume para facilitar a criação das próximas partidas.</p>
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="diaHabitual" className="patota-form-label">Dia habitual <span className="patota-form-optional">· opcional</span></label>
                <select id="diaHabitual" value={diaHabitual} onChange={(e) => setDiaHabitual(e.target.value)} className="patota-form-input">
                  <option value="">Sem dia definido</option>
                  {arrayDiasSemana.map((dia) => <option key={dia.id} value={dia.id}>{dia.nome}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor="horaHabitual" className="patota-form-label">Horário habitual <span className="patota-form-optional">· opcional</span></label>
                <input id="horaHabitual" type="time" value={horaHabitual} onChange={(e) => setHoraHabitual(e.target.value)} className="patota-form-input" />
              </div>
            </div>
          </section>
        </fieldset>

        {erro && <p role="alert" className="mt-5 text-sm text-red-700">{erro}</p>}
        <div className="flex flex-wrap justify-end gap-2.5 py-[22px]">
          {carregando ? <button type="button" disabled className="patota-form-button flex-1 sm:flex-none">Cancelar</button> : <Link to={rotaCancelar} className="patota-form-button flex-1 sm:flex-none">Cancelar</Link>}
          <button type="submit" disabled={carregando || carregandoCep} aria-busy={carregando} className="patota-form-button patota-form-primary flex-1 sm:flex-none">
            {!formularioEdicao && !carregando && <CirclePlus size={18} aria-hidden="true" />}
            {carregando ? <IndicadorCarregamento texto={formularioEdicao ? 'Salvando...' : 'Criando...'} /> : (formularioEdicao ? 'Salvar alterações' : 'Criar patota')}
          </button>
        </div>
      </form>
    </main>
  )
}

export default CriarPatota
