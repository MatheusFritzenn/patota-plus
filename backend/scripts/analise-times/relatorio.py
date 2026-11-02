"""Relatório independente: dados e estilos ficam no próprio HTML."""
import html
import json


def numero(valor, casas=6):
    if valor is None:
        return 'Indisponível'
    return f'{valor:.{casas}f}'.replace('.', ',')


def gerar_html(dados, resultado, entrada_original):
    esc = html.escape
    rodadas = dados['rodadas']
    melhorias = sum(d > 0 for d in resultado['diferencas'])
    pioras = sum(d < 0 for d in resultado['diferencas'])
    if resultado['pValor'] is None:
        conclusao = 'Não há diferenças não nulas para executar o teste.'
    elif resultado['significativo']:
        conclusao = 'O teste detectou diferença estatisticamente significativa no nível de 5%, sob seus pressupostos.'
    else:
        conclusao = 'O teste não detectou diferença estatisticamente significativa no nível de 5%. Isso não demonstra equivalência dos métodos.'
    linhas = []
    detalhes = []
    for rodada, diferenca in zip(rodadas, resultado['diferencas']):
        data = esc('/'.join(reversed(rodada['data'].split('-'))))
        situacao = 'Empate'
        if diferenca > 0:
            situacao = 'Automático melhor'
        elif diferenca < 0:
            situacao = 'Manual melhor'
        linhas.append(f'<tr><th scope="row">{data}</th><td>{rodada["participantes"]}</td><td>{numero(rodada["manual"])}</td><td>{numero(rodada["automatico"])}</td><td>{numero(diferenca)}</td><td>{situacao}</td></tr>')
        times = []
        for chave, titulo in [('timesManuais', 'Formação manual'), ('timesAutomaticos', 'Formação automática')]:
            times.append(f'<section><h3>{titulo}</h3>')
            for time in rodada.get(chave, []):
                times.append(f'<h4>{esc(time["nome"])} · média {numero(time["media"])}</h4><ul>')
                for jogador in time['jogadores']:
                    times.append(f'<li>{esc(jogador["nome"])} <span>Nota {numero(jogador["forca"], 2)}</span></li>')
                times.append('</ul>')
            times.append('</section>')
        busca = 'concluída dentro da composição escolhida'
        if not rodada['buscaConcluida']:
            busca = 'interrompida pelo limite; melhor formação encontrada'
        detalhes.append(f'<details><summary>{data} · {rodada["participantes"]} participantes</summary><p>Busca {busca}. Divisões avaliadas: {rodada.get("divisoesAvaliadas", "não informado")}.</p><div class="times">{"".join(times)}</div></details>')
    indicadores = [
        ('n efetivo', str(resultado['nEfetivo']), 'Rodadas que entraram no teste após descartar diferenças zero.'),
        ('Zeros descartados', str(resultado['zerosDescartados']), 'Rodadas com o mesmo desequilíbrio nos dois métodos.'),
        ('W+', numero(resultado['wMais'], 1), 'Soma dos postos positivos: diferenças que favorecem o automático.'),
        ('W−', numero(resultado['wMenos'], 1), 'Soma dos postos negativos: diferenças que favorecem o manual.'),
        ('p-valor', numero(resultado['pValor'], 7), 'Compare com 0,05. Não é a probabilidade de o algoritmo ser melhor.'),
        ('r', numero(resultado['r'], 4), 'Tamanho de efeito padronizado. Positivo favorece o automático; negativo, o manual. Não é porcentagem de melhoria.')]
    tabela_indicadores = ''.join(f'<tr><th scope="row">{nome}</th><td>{valor}</td><td>{explicacao}</td></tr>' for nome, valor, explicacao in indicadores)
    aviso = ''
    if resultado['aviso']:
        aviso = f'<p>{esc(resultado["aviso"])}</p>'
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Patota+ — comparação dos times</title>
<style>
*{{box-sizing:border-box}}body{{margin:0;background:#f2f5f3;color:#20332a;font:16px/1.6 system-ui,sans-serif}}main{{max-width:1080px;margin:auto;padding:40px 24px 70px}}header{{border-bottom:3px solid #24764c;padding-bottom:20px}}.marca{{font-weight:750;color:#24764c}}h1{{font-size:32px;line-height:1.2;margin:8px 0}}h2{{font-size:23px;margin-top:0}}h3{{font-size:18px}}h4{{margin-bottom:8px}}.bloco{{background:white;border:1px solid #d9e3dc;border-radius:12px;padding:24px;margin-top:24px}}.resumo{{background:#e8f2eb}}.numeros{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:20px 0}}.numero{{background:white;border:1px solid #d9e3dc;padding:16px;border-radius:8px}}.numero strong{{display:block;font-size:26px}}.rolagem{{overflow-x:auto}}table{{border-collapse:collapse;width:100%;font-size:14px}}th,td{{padding:12px;text-align:left;border-bottom:1px solid #e1e8e3;vertical-align:top}}thead{{background:#edf3ef}}td{{font-variant-numeric:tabular-nums}}.times{{display:grid;grid-template-columns:1fr 1fr;gap:30px}}ul{{padding-left:20px}}li span{{color:#556b5c;margin-left:12px}}details{{border-top:1px solid #d9e3dc;padding:14px 0}}summary{{cursor:pointer;font-weight:650}}pre{{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-height:500px;overflow:auto;background:#f5f7f5;padding:16px}}.muted{{color:#556b5c}}a{{color:#24623f}}@media(max-width:650px){{main{{padding:20px 12px}}.bloco{{padding:16px}}.numeros,.times{{grid-template-columns:1fr}}h1{{font-size:27px}}}}@media print{{body{{background:white}}main{{max-width:none;padding:0}}.bloco{{break-inside:avoid;border-radius:0}}.arquivo{{display:none}}}}
</style></head><body><main>
<header><div class="marca">PATOTA+ / ANÁLISE LOCAL</div><h1>Comparação das formações de times</h1><p class="muted">{esc(dados['protocolo'].get('patotaNome', ''))} · {len(rodadas)} rodadas · teste de Wilcoxon pareado bilateral</p></header>
<section class="bloco resumo"><h2>O que os resultados mostram</h2><p>O automático apresentou menor desequilíbrio em <strong>{melhorias} de {len(rodadas)} rodadas</strong>. Houve {pioras} rodada(s) favorável(is) ao manual e {resultado['zerosDescartados']} empate(s).</p>
<div class="numeros"><div class="numero">p-valor<strong>{numero(resultado['pValor'], 7)}</strong>Limite definido: 0,05</div><div class="numero">Tamanho de efeito r<strong>{numero(resultado['r'], 4)}</strong>Não representa porcentagem</div><div class="numero">Rodadas no teste<strong>{resultado['nEfetivo']}</strong>Um par por rodada</div></div>
<p>{conclusao}</p>{aviso}<p><strong>Alcance:</strong> comparação do equilíbrio pelas notas utilizadas. O resultado não demonstra, por si só, placares mais próximos ou melhor experiência em campo.</p></section>
<section class="bloco"><h2>Comparação por rodada</h2><p>Desequilíbrio = diferença absoluta entre as médias de força dos dois times. <strong>Quanto menor, melhor.</strong> A última diferença é manual menos automático: valores positivos favorecem o automático.</p><div class="rolagem"><table><thead><tr><th>Data</th><th>Jogadores</th><th>Manual</th><th>Automático</th><th>Diferença</th><th>Resultado</th></tr></thead><tbody>{''.join(linhas)}</tbody></table></div><p class="muted">Valores exibidos com seis casas decimais; diferenças tratadas com nove casas no teste.</p></section>
<section class="bloco"><h2>Como interpretar os indicadores</h2><div class="rolagem"><table><thead><tr><th>Indicador</th><th>Valor</th><th>Interpretação</th></tr></thead><tbody>{tabela_indicadores}</tbody></table></div></section>
<section class="bloco"><h2>Formações e notas utilizadas</h2><p>Abra uma rodada para conferir os jogadores das duas alternativas.</p>{''.join(detalhes)}</section>
<section class="bloco"><h2>Origem dos dados e limites da análise</h2><p>{esc(dados['protocolo']['origemNotas'])}</p><p>{esc(dados['protocolo']['posicoes'])}</p><p>O algoritmo otimiza a própria métrica avaliada, dentro das restrições de composição. Uma busca concluída garante o melhor resultado apenas dentro da composição escolhida.</p><p>O teste pressupõe diferenças independentes e distribuição simétrica. Rodadas do mesmo grupo podem apresentar dependência. A ampliação do histórico ocorreu após a discussão sobre tamanho amostral e antes da primeira execução: a interpretação é exploratória. Nenhuma rodada foi selecionada pelo resultado e nenhuma escalação foi alterada.</p></section>
<section class="bloco"><h2>Método e reprodução</h2><p>{esc(resultado['metodo'])}; teste bilateral; alfa = 0,05. Zeros descartados e empates com postos médios.</p><p>{esc(resultado['formulaR'])}</p><p>O p-valor é exato. Z = {numero(resultado['z'])} e r são descritores padronizados; não são usados para calcular esse p-valor.</p><p>Versões: {esc(json.dumps(resultado['versoes'], ensure_ascii=False))}.</p><p><a href="https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html">Referência do método e exemplo de validação (SciPy)</a></p><p class="muted">Os dados completos estão incorporados abaixo. Este arquivo funciona sem internet e pode ser impresso pelo navegador.</p>
<details class="arquivo"><summary>Dados completos da comparação (JSON)</summary><pre id="entrada-original">{esc(entrada_original)}</pre></details>
<details class="arquivo"><summary>Resultado estatístico completo (JSON)</summary><pre id="resultado-completo">{esc(json.dumps(resultado, ensure_ascii=False, indent=2, allow_nan=False))}</pre></details></section>
</main></body></html>'''
