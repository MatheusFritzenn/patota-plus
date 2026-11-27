import test from 'node:test'
import assert from 'node:assert/strict'
import { analisarWilcoxon } from '../lib/wilcoxon.js'

function proximo(valor, esperado) {
  assert.ok(Math.abs(valor - esperado) < 1e-12, `${valor} difere de ${esperado}`)
}

test('exemplo publicado por Wilcoxon e reproduzido na documentação SciPy', function () {
  // https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html
  // Valores esperados fixos, sem executar SciPy durante os testes.
  const resultado = analisarWilcoxon([6, 8, 14, 16, 23, 24, 28, 29, 41, -48, 49, 56, 60, -67, 75])
  assert.equal(resultado.wMais, 96)
  assert.equal(resultado.wMenos, 24)
  assert.equal(resultado.pValor, 0.041259765625)
  assert.equal(resultado.significativo, true)
})

test('oito diferenças positivas reproduzem os indicadores históricos sem empates', function () {
  const resultado = analisarWilcoxon([1, 2, 3, 4, 5, 6, 7, 8])
  assert.equal(resultado.wMais, 36)
  assert.equal(resultado.wMenos, 0)
  assert.equal(resultado.pValor, 0.0078125)
  proximo(resultado.z, 18 / Math.sqrt(51))
  proximo(resultado.r, 18 / Math.sqrt(408))
  assert.equal(resultado.aviso, null)
})

test('empates recebem postos médios e sinais mantêm sua multiplicidade', function () {
  // Postos 1,5; 1,5; 3. Das oito atribuições, seis são tão extremas quanto a observada.
  const resultado = analisarWilcoxon([1, -1, 2, 0])
  assert.equal(resultado.wMais, 4.5)
  assert.equal(resultado.wMenos, 1.5)
  assert.equal(resultado.nTotal, 4)
  assert.equal(resultado.nEfetivo, 3)
  assert.equal(resultado.zerosDescartados, 1)
  assert.equal(resultado.pValor, 0.75)
  proximo(resultado.z, 1.5 / Math.sqrt(3.375))
  assert.equal(resultado.significativo, false)
})

test('regressão dos resultados das sete rodadas históricas', function () {
  // Métricas do snapshot de 25/11/2026, sem identificadores ou dados pessoais.
  // A rodada de 08/09 é apenas ponto de partida e não entra na análise atual.
  const arrayDiferencas = [
    0.9285714285714288 - 0.014285714285713347,
    0.2142857142857144 - 0.014285714285713347,
    0.07142857142857117 - 0.014285714285713347,
    1.1071428571428568 - 0.023809523809523725,
    1.5 - 0.014285714285713347,
    1.4428571428571422 - 0.014285714285713347,
    1.4333333333333327
  ]
  const resultado = analisarWilcoxon(arrayDiferencas)
  assert.equal(resultado.nEfetivo, 7)
  assert.equal(resultado.zerosDescartados, 0)
  assert.equal(resultado.wMais, 28)
  assert.equal(resultado.wMenos, 0)
  assert.equal(resultado.pValor, 0.015625)
  proximo(resultado.r, 14 / Math.sqrt(245))
})

test('inverter sinais preserva p e módulo de r, invertendo a direção', function () {
  const positivo = analisarWilcoxon([1, 1, 2, -3, 4, 5])
  const negativo = analisarWilcoxon([-1, -1, -2, 3, -4, -5])
  assert.equal(positivo.pValor, negativo.pValor)
  assert.equal(positivo.wMais, negativo.wMenos)
  proximo(positivo.r, -negativo.r)
  proximo(positivo.rAbsoluto, negativo.rAbsoluto)
})

test('observação central resulta em p bilateral igual a um', function () {
  const resultado = analisarWilcoxon([1, -2, -3, 4])
  assert.equal(resultado.wMais, 5)
  assert.equal(resultado.wMenos, 5)
  assert.equal(resultado.pValor, 1)
  assert.equal(resultado.r, 0)
})

test('todos zeros deixam teste e tamanho de efeito indisponíveis', function () {
  const resultado = analisarWilcoxon([0, -0, 0])
  assert.equal(resultado.nEfetivo, 0)
  assert.equal(resultado.zerosDescartados, 3)
  assert.equal(resultado.pValor, null)
  assert.equal(resultado.r, null)
  assert.equal(resultado.z, null)
  assert.match(resultado.aviso, /Todos os pares empatados/)
})

test('um par possui p igual a um e aviso de amostra pequena', function () {
  const resultado = analisarWilcoxon([-4, 0])
  assert.equal(resultado.pValor, 1)
  assert.equal(resultado.wMenos, 1)
  assert.equal(resultado.r, -1)
  assert.match(resultado.aviso, /Menos de seis/)
})

test('arredonda a nove casas antes dos zeros e empates, preservando a entrada', function () {
  const arrayEntrada = Object.freeze([0.1 + 0.2, -0.3, 0.0000000004, 0.0000000005, 0.0000000015, -0.0000000025])
  const resultado = analisarWilcoxon(arrayEntrada)
  assert.deepEqual(resultado.diferencas, [0.3, -0.3, 0, 0, 0.000000002, -0.000000002])
  assert.equal(resultado.wMais, resultado.wMenos)
  assert.equal(resultado.pValor, 1)
})

test('limite aceita 16 não nulos e rejeita 17, sem contar zeros', function () {
  const arrayDezesseis = Array.from({ length: 16 }, function (_, indice) { return indice + 1 })
  const resultado = analisarWilcoxon(arrayDezesseis.concat([0, 0]))
  assert.equal(resultado.nEfetivo, 16)
  assert.equal(resultado.pValor, 2 / 65536)
  assert.throws(function () { analisarWilcoxon(arrayDezesseis.concat([17])) }, /16 pares/)
})

test('rejeita entrada vazia, aninhada, não numérica ou não finita', function () {
  const arrayInvalidas = [[], null, '1', [NaN], [Infinity], [-Infinity], ['1'], [true], [[1]], [null], new Array(2)]
  for (const invalida of arrayInvalidas) {
    assert.throws(function () { analisarWilcoxon(invalida) }, /diferenças finitas/)
  }
})
