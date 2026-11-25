import { readFileSync } from 'node:fs'

export function escaparHtml(valor) {
  return String(valor).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function numero(valor, casas = 6) {
  if (valor === null) return 'Indisponível'
  return valor.toFixed(casas).replace('.', ',')
}

export function gerarHtml(dados, resultado, entradaOriginal) {
  const css = readFileSync(new URL('./relatorio.css', import.meta.url), 'utf8')
  const arrayRodadas = dados.rodadas
  let cenario = 'Notas de referência da entrada incorporada'
  if (dados.protocolo.cenario === 'medias_anteriores_reais') cenario = 'Dados reais e notas disponíveis antes de cada rodada'
  if (dados.protocolo.cenario === 'notas_atuais_referencia') cenario = 'Médias atuais de referência — sem corte temporal'
  let melhorias = 0
  let pioras = 0
  let conclusao = 'Não há diferenças não nulas para executar o teste.'
  if (resultado.pValor !== null) {
    conclusao = 'O teste não detectou diferença estatisticamente significativa no nível de 5%. Isso não demonstra equivalência dos métodos.'
    if (resultado.significativo) conclusao = 'O teste detectou diferença estatisticamente significativa no nível de 5%, sob seus pressupostos.'
  }
  const arrayLinhas = []
  const arrayDetalhes = []
  for (let indice = 0; indice < arrayRodadas.length; indice += 1) {
    const rodada = arrayRodadas[indice]
    const diferenca = resultado.diferencas[indice]
    const data = escaparHtml(rodada.data.split('-').reverse().join('/'))
    let situacao = 'Empate'
    if (diferenca > 0) { melhorias += 1; situacao = 'Automático melhor' }
    if (diferenca < 0) { pioras += 1; situacao = 'Manual melhor' }
    arrayLinhas.push(`<tr><th scope="row">${data}</th><td>${escaparHtml(rodada.participantes)}</td><td>${numero(rodada.manual)}</td><td>${numero(rodada.automatico)}</td><td>${numero(diferenca)}</td><td>${situacao}</td></tr>`)
    const arrayTimes = []
    const arrayFormacoes = [
      { chave: 'timesManuais', titulo: 'Formação manual' },
      { chave: 'timesAutomaticos', titulo: 'Formação automática' }
    ]
    for (const formacao of arrayFormacoes) {
      arrayTimes.push(`<section><h3>${formacao.titulo}</h3>`)
      const arrayEquipes = rodada[formacao.chave] || []
      for (const time of arrayEquipes) {
        arrayTimes.push(`<h4>${escaparHtml(time.nome)} · média ${numero(time.media)}</h4><ul>`)
        for (const jogador of time.jogadores) {
          let origemNota = ''
          if (jogador.historico) {
            if (jogador.historico.origem === 'nota_temporaria_presidente') {
              origemNota = `<p>Nota temporária do presidente: ${numero(jogador.forca, 2)}. ${escaparHtml(jogador.historico.declaracao)}</p>`
            } else {
              const arrayOrigens = jogador.historico.partidasAnteriores.map(function (registro) {
                return `${escaparHtml(registro.data)}: média ${numero(registro.media)}, ${registro.totalAvaliacoes} notas`
              })
              origemNota = `<details><summary>Origem da média anterior (${jogador.historico.totalPartidas} partidas)</summary><p>${arrayOrigens.join('; ')}.</p><p>Média integral: ${numero(jogador.historico.mediaIntegral, 9)}. Força utilizada: ${numero(jogador.forca, 2)}.</p></details>`
            }
          }
          arrayTimes.push(`<li>${escaparHtml(jogador.nome)} <span>Nota ${numero(jogador.forca, 2)}</span>${origemNota}</li>`)
        }
        arrayTimes.push('</ul>')
      }
      arrayTimes.push('</section>')
    }
    let busca = 'concluída dentro da composição escolhida'
    if (!rodada.buscaConcluida) busca = 'interrompida pelo limite; melhor formação encontrada'
    let divisoes = 'não informado'
    if (rodada.divisoesAvaliadas !== undefined) divisoes = rodada.divisoesAvaliadas
    arrayDetalhes.push(`<details><summary>${data} · ${escaparHtml(rodada.participantes)} participantes</summary><p>Busca ${busca}. Divisões avaliadas: ${escaparHtml(divisoes)}.</p><div class="times">${arrayTimes.join('')}</div></details>`)
  }
  const arrayIndicadores = [
    ['n efetivo', resultado.nEfetivo, 'Rodadas após descartar diferenças zero.'],
    ['Zeros descartados', resultado.zerosDescartados, 'Rodadas com o mesmo desequilíbrio.'],
    ['W+', numero(resultado.wMais, 1), 'Soma dos postos positivos: favorecem o automático.'],
    ['W−', numero(resultado.wMenos, 1), 'Soma dos postos negativos: favorecem o manual.'],
    ['p-valor', numero(resultado.pValor, 7), 'Compare com 0,05. Não é a probabilidade de o algoritmo ser melhor.'],
    ['r', numero(resultado.r, 4), 'Tamanho de efeito padronizado com direção. Não é porcentagem de melhoria.']
  ]
  const arrayTabela = arrayIndicadores.map(function (arrayItem) {
    return `<tr><th scope="row">${arrayItem[0]}</th><td>${arrayItem[1]}</td><td>${arrayItem[2]}</td></tr>`
  })
  let aviso = ''
  if (resultado.aviso) aviso = `<p>${escaparHtml(resultado.aviso)}</p>`
  let cobertura = ''
  if (dados.rodadasExcluidas) {
    let descricaoFonte = `<p>Fonte: ${escaparHtml(dados.fonteAvaliacoes.arquivoOriginal)}. SHA-256 da planilha: ${escaparHtml(dados.fonteAvaliacoes.arquivoOriginalSha256)}.</p>`
    if (dados.fonteAvaliacoes.tipo === 'postgresql') {
      descricaoFonte = `<p>Fonte: PostgreSQL do Patota+. ${escaparHtml(dados.fonteAvaliacoes.descricao)}</p><p>SHA-256 do snapshot das avaliações: ${escaparHtml(dados.fonteAvaliacoesSha256)}.</p>`
    }
    const arrayExcluidas = dados.rodadasExcluidas.map(function (rodada) {
      const arrayNomes = rodada.semMediaAnterior.map(function (jogador) { return escaparHtml(jogador.nome) })
      return `<tr><th scope="row">${escaparHtml(rodada.data)}</th><td>${rodada.participantes}</td><td>${escaparHtml(rodada.motivo)}: ${arrayNomes.join(', ')}.</td></tr>`
    })
    cobertura = `<section class="bloco"><h2>Cobertura das médias anteriores</h2><p>${arrayRodadas.length} rodadas incluídas e ${dados.rodadasExcluidas.length} excluídas entre as ${dados.partidasFonte.length} rodadas do protocolo. ${escaparHtml(dados.protocolo.criterioInclusao)}</p><p>Regra: média das médias por partida, somente em dias anteriores ao jogo analisado. A força é arredondada a duas casas; valores integrais e componentes ficam incorporados para conferência. Data de coleta após cada jogo declarada pelo usuário; não corresponde ao horário de importação no banco.</p><div class="rolagem"><table><thead><tr><th>Rodada excluída</th><th>Participantes</th><th>Motivo</th></tr></thead><tbody>${arrayExcluidas.join('')}</tbody></table></div>${descricaoFonte}</section>`
  }
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Patota+ — comparação dos times</title><style>${css}</style></head><body><main>
<header><div class="marca">PATOTA+ / ANÁLISE LOCAL</div><h1>Comparação das formações de times</h1><p class="muted">${escaparHtml(dados.protocolo.patotaNome || '')} · ${arrayRodadas.length} rodadas · teste de Wilcoxon pareado bilateral</p><p>${cenario}</p></header>
<section class="bloco resumo"><h2>O que os resultados mostram</h2><p>O automático apresentou menor desequilíbrio em <strong>${melhorias} de ${arrayRodadas.length} rodadas</strong>. Houve ${pioras} rodada(s) favorável(is) ao manual e ${resultado.zerosDescartados} empate(s).</p>
<div class="numeros"><div class="numero">p-valor<strong>${numero(resultado.pValor, 7)}</strong>Limite definido: 0,05</div><div class="numero">Tamanho de efeito r<strong>${numero(resultado.r, 4)}</strong>Não representa porcentagem</div><div class="numero">Rodadas no teste<strong>${resultado.nEfetivo}</strong>Um par por rodada</div></div>
<p>${conclusao}</p>${aviso}<p><strong>Alcance:</strong> comparação do equilíbrio pelas notas utilizadas. O resultado não demonstra, por si só, placares mais próximos ou melhor experiência em campo.</p></section>
${cobertura}<section class="bloco"><h2>Comparação por rodada</h2><p>Desequilíbrio = diferença absoluta entre as médias de força dos dois times. <strong>Quanto menor, melhor.</strong> Diferença = manual menos automático; valores positivos favorecem o automático.</p><div class="rolagem"><table><thead><tr><th>Data</th><th>Jogadores</th><th>Manual</th><th>Automático</th><th>Diferença</th><th>Resultado</th></tr></thead><tbody>${arrayLinhas.join('')}</tbody></table></div><p class="muted">Valores exibidos com seis casas decimais; diferenças tratadas com nove casas no teste.</p></section>
<section class="bloco"><h2>Como interpretar os indicadores</h2><div class="rolagem"><table><thead><tr><th>Indicador</th><th>Valor</th><th>Interpretação</th></tr></thead><tbody>${arrayTabela.join('')}</tbody></table></div></section>
<section class="bloco"><h2>Formações e notas utilizadas</h2><p>Abra uma rodada para conferir os jogadores das duas alternativas.</p>${arrayDetalhes.join('')}</section>
<section class="bloco"><h2>Origem dos dados e limites da análise</h2><p>${escaparHtml(dados.protocolo.origemNotas)}</p><p>${escaparHtml(dados.protocolo.posicoes)}</p><p>O algoritmo otimiza a própria métrica avaliada, dentro das restrições de composição. Uma busca concluída garante o melhor resultado apenas dentro da composição escolhida.</p><p>O teste pressupõe diferenças independentes e distribuição simétrica. Rodadas do mesmo grupo podem apresentar dependência. A ampliação do histórico ocorreu após a discussão sobre tamanho amostral e antes da primeira execução: a interpretação é exploratória. Nenhuma rodada foi selecionada pelo resultado e nenhuma escalação foi alterada.</p></section>
<section class="bloco"><h2>Método e reprodução</h2><p>${escaparHtml(resultado.metodo)}; teste bilateral; alfa = 0,05. Implementação própria no backend do Patota+, validada por testes unitários. Zeros descartados e empates com postos médios.</p><p>${escaparHtml(resultado.formulaR)}</p><p>O p-valor é exato. Z = ${numero(resultado.z)} e r são descritores padronizados; não são usados para calcular esse p-valor.</p><p>Versões: ${escaparHtml(JSON.stringify(resultado.versoes))}.</p><p><a href="https://doi.org/10.2307/3001968">Wilcoxon (1945)</a> · <a href="https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html">Documentação de referência e exemplo numérico usado nos testes</a></p><p class="muted">Os dados completos estão incorporados abaixo. Este arquivo funciona sem internet e pode ser impresso pelo navegador.</p>
<details class="arquivo"><summary>Dados completos da comparação (JSON)</summary><pre id="entrada-original">${escaparHtml(entradaOriginal)}</pre></details>
<details class="arquivo"><summary>Resultado estatístico completo (JSON)</summary><pre id="resultado-completo">${escaparHtml(JSON.stringify(resultado, null, 2))}</pre></details></section>
</main></body></html>`
}
