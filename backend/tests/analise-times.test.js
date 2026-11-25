import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { analisarComparacao, lerEntrada, salvarRelatorio } from '../scripts/analise-times/analisar.js'
import { reconstruirMediasAnteriores, prepararRodadaHistorica, validarFonteHistorica, criarFonteDoBanco } from '../scripts/analise-times/historico.js'
import { gerarHtml } from '../scripts/analise-times/relatorio.js'

function criarDados() {
  return {
    protocolo: { alternativa: 'bilateral', alfa: 0.05, patotaNome: '<Patota> &amp; "teste"', origemNotas: 'Notas simuladas', posicoes: 'Atuais' },
    rodadas: [{ partidaId: 'rodada-1', data: '2026-10-06', participantes: 2, manual: 2, automatico: 1, buscaConcluida: true, timesManuais: [], timesAutomaticos: [] }]
  }
}

test('fonte do banco converte numeric e valida a data real de coleta, sem perder nota zero', function () {
  const registro = { partidaId: 'p1', data: '2026-09-08', dataAvaliacao: '2026-09-08', avaliadorId: 'j1', avaliadoId: 'j2', nota: '0.00' }
  const fonte = criarFonteDoBanco([registro])
  assert.equal(fonte.tipo, 'postgresql')
  assert.equal(fonte.avaliacoes[0].nota, 0)
  registro.dataAvaliacao = '2026-11-25'
  assert.throws(function () { criarFonteDoBanco([registro]) }, /Data de coleta diferente/)
  registro.dataAvaliacao = registro.data
  for (const valor of [null, '', 'invalida', '11.00', NaN, true]) {
    registro.nota = valor
    assert.throws(function () { criarFonteDoBanco([registro]) }, /Nota/)
  }
})

test('relatório com fonte PostgreSQL exibe snapshot e não exige metadados de planilha', function () {
  const dados = criarDados()
  dados.fonteAvaliacoes = { tipo: 'postgresql', descricao: 'Snapshot do banco' }
  dados.fonteAvaliacoesSha256 = 'hash-do-snapshot'
  dados.rodadasExcluidas = []
  dados.partidasFonte = [{ id: 'rodada-1' }]
  dados.protocolo.criterioInclusao = 'Histórico completo'
  const resultado = analisarComparacao(dados, JSON.stringify(dados))
  const html = gerarHtml(dados, resultado, JSON.stringify(dados))
  assert.match(html, /Fonte: PostgreSQL do Patota\+/)
  assert.match(html, /hash-do-snapshot/)
  assert.doesNotMatch(html, /undefined|SHA-256 da planilha/)
})

test('valida protocolo, identidade das rodadas e métricas antes de analisar', function () {
  const arrayAlteracoes = [
    function (dados) { dados.protocolo.alfa = 0.01 },
    function (dados) { dados.protocolo.alternativa = 'unilateral' },
    function (dados) { dados.rodadas.push(dados.rodadas[0]) },
    function (dados) { dados.rodadas[0].partidaId = '' },
    function (dados) { dados.rodadas[0].manual = NaN },
    function (dados) { dados.rodadas[0].automatico = Infinity },
    function (dados) { dados.rodadas[0].manual = -1 },
    function (dados) { dados.rodadas[0].automatico = 11 },
    function (dados) { dados.rodadas[0].manual = '2' },
    function (dados) { dados.rodadas = [] }
  ]
  for (const alterar of arrayAlteracoes) {
    const dados = criarDados()
    alterar(dados)
    assert.throws(function () { analisarComparacao(dados, JSON.stringify(dados)) })
  }
})

test('reconstrução histórica exclui notas do próprio dia e futuras, preservando nota zero', function () {
  const arrayAvaliacoes = [
    { partidaId: 'anterior', data: '2026-09-08', avaliadoId: 'j1', nota: 0 },
    { partidaId: 'mesmo-dia', data: '2026-09-15', avaliadoId: 'j1', nota: 10 },
    { partidaId: 'futura', data: '2026-09-22', avaliadoId: 'j1', nota: 10 }
  ]
  const historico = reconstruirMediasAnteriores(arrayAvaliacoes, '2026-09-15', 'partidas').get('j1')
  assert.equal(historico.mediaGeral, 0)
  assert.equal(historico.totalAvaliacoes, 1)
  assert.equal(historico.totalPartidas, 1)
  assert.deepEqual(historico.partidasAnteriores.map(function (p) { return p.partidaId }), ['anterior'])
  assert.equal(reconstruirMediasAnteriores(arrayAvaliacoes, '2026-09-08', 'partidas').size, 0)
})

test('média histórica dá o mesmo peso a cada partida, com precisão integral e força em duas casas', function () {
  const arrayAvaliacoes = [
    { partidaId: 'p1', data: '2026-09-08', avaliadoId: 'j1', nota: 10 },
    { partidaId: 'p1', data: '2026-09-08', avaliadoId: 'j1', nota: 10 },
    { partidaId: 'p2', data: '2026-09-15', avaliadoId: 'j1', nota: 0 }
  ]
  const historico = reconstruirMediasAnteriores(arrayAvaliacoes, '2026-09-22', 'partidas').get('j1')
  assert.equal(historico.mediaIntegral, 5)
  assert.equal(historico.mediaGeral, 5)
  assert.equal(historico.totalAvaliacoes, 3)
  assert.equal(historico.totalPartidas, 2)
  const alternativa = reconstruirMediasAnteriores(arrayAvaliacoes, '2026-09-22', 'avaliacoes').get('j1')
  assert.equal(alternativa.mediaGeral, 6.67)
  assert.equal(alternativa.mediaIntegral, 20 / 3)
  assert.throws(function () { reconstruirMediasAnteriores(arrayAvaliacoes, '2026-09-22', 'desconhecida') }, /Regra de média/)
})

test('rodada identifica estreantes sem usar média atual, nota temporária ou avaliações futuras', function () {
  const partida = {
    data: '2026-09-15', jogadores: [
      { id: 'j1', nome: 'Avaliado', forca: 10, timeId: 'A', timeNome: 'Time A', posicoesIds: [1] },
      { id: 'j2', nome: 'Estreante', forca: 10, notaTemporaria: 8, timeId: 'B', timeNome: 'Time B', posicoesIds: [1] }
    ]
  }
  const arrayAvaliacoes = [
    { partidaId: 'p1', data: '2026-09-08', avaliadoId: 'j1', nota: 4 },
    { partidaId: 'p2', data: '2026-09-15', avaliadoId: 'j2', nota: 10 }
  ]
  const preparacao = prepararRodadaHistorica(partida, arrayAvaliacoes, 'partidas')
  assert.equal(preparacao.jogadores.length, 1)
  assert.equal(preparacao.jogadores[0].forca, 4)
  assert.deepEqual(preparacao.semMediaAnterior, [{ id: 'j2', nome: 'Estreante' }])
  assert.equal(partida.jogadores[0].forca, 10)
})

test('fonte histórica valida data, nota, participação, time, duplicidade e declaração de origem', function () {
  function criarFonte() {
    return {
      origem: 'avaliacoes_reais_declaradas_pelo_usuario', momentoAvaliacao: 'apos_partida_na_mesma_data',
      avaliacoes: [{ partidaId: 'p1', data: '2026-09-08', avaliadorId: 'j1', avaliadoId: 'j2', nota: 7 }]
    }
  }
  const arrayPartidas = [{ id: 'p1', data: '2026-09-08', jogadores: [{ id: 'j1', timeId: 'A' }, { id: 'j2', timeId: 'A' }, { id: 'j3', timeId: 'B' }] }]
  validarFonteHistorica(criarFonte(), arrayPartidas)
  const arrayAlteracoes = [
    function (fonte) { fonte.origem = 'simulada' },
    function (fonte) { fonte.momentoAvaliacao = 'desconhecido' },
    function (fonte) { fonte.avaliacoes[0].data = '2026-09-09' },
    function (fonte) { fonte.avaliacoes[0].nota = 11 },
    function (fonte) { fonte.avaliacoes[0].nota = '7' },
    function (fonte) { fonte.avaliacoes[0].partidaId = 'p2' },
    function (fonte) { fonte.avaliacoes[0].avaliadoId = 'j1' },
    function (fonte) { fonte.avaliacoes[0].avaliadoId = 'j3' },
    function (fonte) { fonte.avaliacoes[0].avaliadorId = 'inexistente' },
    function (fonte) { fonte.avaliacoes.push(fonte.avaliacoes[0]) }
  ]
  for (const alterar of arrayAlteracoes) {
    const fonte = criarFonte()
    alterar(fonte)
    assert.throws(function () { validarFonteHistorica(fonte, arrayPartidas) })
  }
})

test('nota temporária histórica declarada supre a estreia sem virar média ou avaliação', function () {
  const partida = { id: 'p2', data: '2026-09-15', jogadores: [{ id: 'j1', nome: 'Estreante', notaTemporaria: 9, timeId: 'A', timeNome: 'Time A', posicoesIds: [1] }] }
  const arrayNotas = [{ partidaId: 'p2', data: '2026-09-15', usuarioId: 'j1', nota: 9, momento: 'antes_partida_declarado_pelo_presidente', origem: 'Declaração histórica' }]
  const arrayAvaliacoes = [{ partidaId: 'p2', data: '2026-09-15', avaliadoId: 'j1', nota: 3 }]
  const preparacao = prepararRodadaHistorica(partida, arrayAvaliacoes, 'partidas', arrayNotas)
  assert.equal(preparacao.semMediaAnterior.length, 0)
  assert.equal(preparacao.jogadores[0].forca, 9)
  assert.equal(preparacao.jogadores[0].historico.origem, 'nota_temporaria_presidente')
  assert.equal(preparacao.jogadores[0].totalAvaliacoes, 0)
  assert.equal(reconstruirMediasAnteriores(arrayAvaliacoes, '2026-09-22', 'partidas').get('j1').mediaGeral, 3)
  partida.id = 'p3'
  partida.data = '2026-09-22'
  const posterior = prepararRodadaHistorica(partida, arrayAvaliacoes, 'partidas', arrayNotas)
  assert.equal(posterior.jogadores[0].forca, 3)
})

test('nota temporária sem declaração para a própria partida não substitui histórico', function () {
  const partida = { id: 'p2', data: '2026-09-15', jogadores: [{ id: 'j1', nome: 'Estreante', notaTemporaria: 9 }] }
  const arrayNotas = [{ partidaId: 'outra', data: '2026-09-15', usuarioId: 'j1', nota: 9, momento: 'antes_partida_declarado_pelo_presidente' }]
  assert.equal(prepararRodadaHistorica(partida, [], 'partidas', arrayNotas).semMediaAnterior.length, 1)
  arrayNotas[0].partidaId = 'p2'
  arrayNotas[0].nota = 8
  assert.throws(function () { prepararRodadaHistorica(partida, [], 'partidas', arrayNotas) }, /diverge/)
  arrayNotas[0].nota = 9
  arrayNotas[0].momento = 'desconhecido'
  assert.throws(function () { prepararRodadaHistorica(partida, [], 'partidas', arrayNotas) }, /declaração/)
})

test('média de avaliações anteriores prevalece sobre nota temporária histórica', function () {
  const partida = { id: 'p2', data: '2026-09-15', jogadores: [{ id: 'j1', nome: 'Avaliado', notaTemporaria: 9 }] }
  const arrayNotas = [{ partidaId: 'p2', data: '2026-09-15', usuarioId: 'j1', nota: 9, momento: 'antes_partida_declarado_pelo_presidente' }]
  const resultado = prepararRodadaHistorica(partida, [{ partidaId: 'p1', data: '2026-09-08', avaliadoId: 'j1', nota: 4 }], 'partidas', arrayNotas)
  assert.equal(resultado.jogadores[0].forca, 4)
  assert.notEqual(resultado.jogadores[0].historico.origem, 'nota_temporaria_presidente')
})

test('relatório incorpora entrada recuperável, hash e resultado nativo, sem arquivos intermediários', async function () {
  const pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'patota-wilcoxon-'))
  try {
    const dados = criarDados()
    const entrada = JSON.stringify(dados, null, 2)
    const resultado = await salvarRelatorio(dados, pasta, entrada)
    const arquivo = path.join(pasta, 'relatorio.html')
    assert.equal(await lerEntrada(arquivo), entrada)
    assert.deepEqual(await fs.readdir(pasta), ['relatorio.html'])
    assert.equal(resultado.entradaSha256, createHash('sha256').update(entrada).digest('hex'))
    assert.equal(resultado.versoes.implementacao, 'patota-wilcoxon-js-v1')
    const html = await fs.readFile(arquivo, 'utf8')
    assert.match(html, /backend do Patota\+/)
    assert.match(html, /&lt;Patota&gt; &amp;amp;/)
    assert.match(html, /id="resultado-completo"/)
    assert.equal(resultado.pValor, 1)
    // Compatibilidade com a entidade de apóstrofo produzida pelo antigo HTML Python.
    await fs.writeFile(arquivo, '<pre id="entrada-original">&#x27;&amp;lt;</pre>')
    assert.equal(await lerEntrada(arquivo), "'&lt;")
    await fs.writeFile(arquivo, '<html>Sem entrada</html>')
    await assert.rejects(lerEntrada(arquivo), /sem dados incorporados/)
    const json = path.join(pasta, 'comparacao.json')
    await fs.writeFile(json, entrada)
    assert.equal(await lerEntrada(json), entrada)
  } finally {
    await fs.rm(pasta, { recursive: true, force: true })
  }
})
