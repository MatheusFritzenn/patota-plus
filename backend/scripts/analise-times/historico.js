import assert from 'node:assert/strict'

export function criarFonteDoBanco(arrayRegistros) {
  const arrayAvaliacoes = []
  for (const registro of arrayRegistros) {
    assert.equal(registro.dataAvaliacao, registro.data, 'Data de coleta diferente da partida no banco; confira o registro antes da análise histórica')
    assert.ok(registro.nota !== null && (typeof registro.nota === 'number' || typeof registro.nota === 'string'), 'Nota ausente no banco')
    assert.notEqual(registro.nota, '', 'Nota ausente no banco')
    const nota = Number(registro.nota)
    assert.ok(Number.isFinite(nota) && nota >= 0 && nota <= 10, 'Nota inválida no banco')
    arrayAvaliacoes.push({
      partidaId: registro.partidaId, data: registro.data, avaliadorId: registro.avaliadorId,
      avaliadoId: registro.avaliadoId, nota: nota
    })
  }
  return {
    origem: 'avaliacoes_reais_declaradas_pelo_usuario', momentoAvaliacao: 'apos_partida_na_mesma_data',
    tipo: 'postgresql', descricao: 'Avaliações do PostgreSQL nas oito rodadas do protocolo, consultadas na mesma transação somente leitura das escalações. Datas de coleta conferidas com as datas dos jogos. Avaliações reais e coleta após os jogos declaradas pelo usuário na importação de 25/11/2026.',
    avaliacoes: arrayAvaliacoes
  }
}

export function validarFonteHistorica(fonte, arrayPartidas) {
  assert.equal(fonte.origem, 'avaliacoes_reais_declaradas_pelo_usuario', 'Origem histórica não identificada')
  assert.equal(fonte.momentoAvaliacao, 'apos_partida_na_mesma_data', 'Momento das avaliações não confirmado')
  assert.ok(Array.isArray(fonte.avaliacoes) && fonte.avaliacoes.length > 0, 'Fonte sem avaliações')
  const mapaPartidas = new Map()
  for (const partida of arrayPartidas) mapaPartidas.set(partida.id, partida)
  const chaves = new Set()
  for (const avaliacao of fonte.avaliacoes) {
    const partida = mapaPartidas.get(avaliacao.partidaId)
    assert.ok(partida, 'Avaliação de partida fora do protocolo')
    assert.equal(avaliacao.data, partida.data, 'Data de avaliação diferente da partida')
    assert.ok(typeof avaliacao.nota === 'number' && Number.isFinite(avaliacao.nota) && avaliacao.nota >= 0 && avaliacao.nota <= 10, 'Nota histórica inválida')
    const avaliador = partida.jogadores.find(function (jogador) { return jogador.id === avaliacao.avaliadorId })
    const avaliado = partida.jogadores.find(function (jogador) { return jogador.id === avaliacao.avaliadoId })
    assert.ok(avaliador && avaliado, 'Avaliador ou avaliado não participou da partida')
    assert.notEqual(avaliador.id, avaliado.id, 'Autoavaliação na fonte histórica')
    assert.ok(avaliador.timeId && avaliado.timeId, 'Participante sem time histórico')
    assert.equal(avaliador.timeId, avaliado.timeId, 'Avaliação entre times diferentes')
    const chave = avaliacao.partidaId + '|' + avaliacao.avaliadorId + '|' + avaliacao.avaliadoId
    assert.ok(!chaves.has(chave), 'Avaliação histórica duplicada')
    chaves.add(chave)
  }
}

export function reconstruirMediasAnteriores(arrayAvaliacoes, dataCorte, regraMedia) {
  assert.ok(regraMedia === 'avaliacoes' || regraMedia === 'partidas', 'Regra de média histórica inválida')
  const mapaJogadores = new Map()
  for (const avaliacao of arrayAvaliacoes) {
    // Notas coletadas após o jogo só podem influenciar dias de jogo posteriores.
    if (avaliacao.data >= dataCorte) continue
    if (!mapaJogadores.has(avaliacao.avaliadoId)) mapaJogadores.set(avaliacao.avaliadoId, new Map())
    const mapaPartidas = mapaJogadores.get(avaliacao.avaliadoId)
    if (!mapaPartidas.has(avaliacao.partidaId)) {
      mapaPartidas.set(avaliacao.partidaId, { partidaId: avaliacao.partidaId, data: avaliacao.data, soma: 0, quantidade: 0 })
    }
    const registro = mapaPartidas.get(avaliacao.partidaId)
    registro.soma += avaliacao.nota
    registro.quantidade += 1
  }
  const mapaMedias = new Map()
  for (const [jogadorId, mapaPartidas] of mapaJogadores) {
    let somaNotas = 0
    let totalAvaliacoes = 0
    let somaMedias = 0
    const arrayHistorico = []
    for (const registro of mapaPartidas.values()) {
      somaNotas += registro.soma
      totalAvaliacoes += registro.quantidade
      somaMedias += registro.soma / registro.quantidade
      arrayHistorico.push({ partidaId: registro.partidaId, data: registro.data, totalAvaliacoes: registro.quantidade, media: registro.soma / registro.quantidade })
    }
    let media = somaNotas / totalAvaliacoes
    if (regraMedia === 'partidas') media = somaMedias / mapaPartidas.size
    // O cache utilizado pela aplicação tem duas casas decimais.
    // O valor integral e cada componente permanecem no relatório para conferência.
    mapaMedias.set(jogadorId, {
      mediaIntegral: media, mediaGeral: Number(media.toFixed(2)),
      totalAvaliacoes: totalAvaliacoes, totalPartidas: mapaPartidas.size,
      partidasAnteriores: arrayHistorico
    })
  }
  return mapaMedias
}

export function prepararRodadaHistorica(partida, arrayAvaliacoes, regraMedia, arrayNotasTemporariasHistoricas = []) {
  const mapaMedias = reconstruirMediasAnteriores(arrayAvaliacoes, partida.data, regraMedia)
  const arrayJogadores = []
  const arraySemMedia = []
  for (const jogador of partida.jogadores) {
    let historico = mapaMedias.get(jogador.id)
    if (!historico) {
      const notaDeclarada = arrayNotasTemporariasHistoricas.find(function (nota) {
        return nota.partidaId === partida.id && nota.data === partida.data && nota.usuarioId === jogador.id
      })
      if (!notaDeclarada) {
        arraySemMedia.push({ id: jogador.id, nome: jogador.nome })
        continue
      }
      assert.equal(notaDeclarada.momento, 'antes_partida_declarado_pelo_presidente', 'Nota temporária sem declaração de atribuição anterior ao jogo')
      assert.ok(typeof notaDeclarada.nota === 'number' && Number.isFinite(notaDeclarada.nota) && notaDeclarada.nota >= 0 && notaDeclarada.nota <= 10, 'Nota temporária histórica inválida')
      assert.equal(jogador.notaTemporaria, notaDeclarada.nota, 'Nota temporária no banco diverge da nota histórica declarada')
      historico = {
        origem: 'nota_temporaria_presidente', declaracao: notaDeclarada.origem,
        mediaIntegral: null, mediaGeral: notaDeclarada.nota, totalAvaliacoes: 0,
        totalPartidas: 0, partidasAnteriores: []
      }
    }
    arrayJogadores.push({
      id: jogador.id, nome: jogador.nome, forca: historico.mediaGeral,
      totalAvaliacoes: historico.totalAvaliacoes, posicoesIds: jogador.posicoesIds,
      posicaoTemporariaId: jogador.posicaoTemporariaId, timeId: jogador.timeId,
      timeNome: jogador.timeNome, historico: historico
    })
  }
  return { jogadores: arrayJogadores, semMediaAnterior: arraySemMedia }
}
