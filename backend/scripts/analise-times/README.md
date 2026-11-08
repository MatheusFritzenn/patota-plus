# Análise local das formações de times

Rotina administrativa do TCC. O Node.js consulta o PostgreSQL via `pg` em uma
transação **READ ONLY / REPEATABLE READ**, reutiliza `balancearTimes` em memória
e entrega um JSON ao Python. O SciPy realiza o teste. Não chama `gerarTimes`,
não altera os times históricos e não precisa de endpoint nem da Vercel.

## Executar no computador atual

Na raiz `C:\patota-plus`:

```powershell
npm --prefix backend run analisar:times
```

Ou, dentro de `backend`, use `npm run analisar:times`.
O ambiente `.venv-wilcoxon` já foi preparado neste computador.
É necessário acesso ao banco configurado em `backend/.env` (`DATABASE_URL`).
Nenhuma credencial é exportada para o relatório.

Cada execução cria somente `relatorio.html` em
`outputs/analise-times/<instante-UTC>/`. Abra no navegador, sem servidor ou internet.
O arquivo reúne resumo, interpretação dos indicadores, comparação por rodada,
formações expansíveis, notas, método e limitações. Permite impressão pelo navegador.
Os JSONs de entrada e resultado ficam incorporados em seções expansíveis, incluindo
posições, identificadores, hashes e versões para reprodução. O Node envia a entrada
ao Python pela entrada padrão, sem gravar arquivos intermediários.
Relatórios antigos nos formatos JSON/CSV/Markdown são preservados.

O HTML contém nomes dos participantes; trate o arquivo como dado do estudo.
Não publique relatórios brutos automaticamente. A planilha original não é modificada.

## Preparar outro computador

Instale Node.js e Python 3.12. Na raiz do projeto, no Windows:

```powershell
npm --prefix backend install
py -3.12 -m venv .venv-wilcoxon
.venv-wilcoxon/Scripts/python.exe -m pip install -r backend/scripts/analise-times/requirements.txt
npm --prefix backend run analisar:times
```

No Linux/macOS, crie o ambiente com `python3.12 -m venv .venv-wilcoxon`
e use `.venv-wilcoxon/bin/python` para instalar as dependências.
`PATOTA_PYTHON` pode indicar outro executável Python, com as mesmas versões fixadas.
O comando não instala dependências automaticamente.

## Protocolo definido antes da primeira execução

- Oito rodadas de setembro/outubro de 2026, listadas em `protocolo.json`.
  Todas entram, inclusive empates e pioras. Datas ausentes/duplicadas, escalações
  divergentes da fonte manual ou notas ausentes interrompem a análise.
- Baseline transcrito da planilha histórica revisada; não é inferido de uma
  formação automática salva posteriormente no banco.
- Médias atuais de `media_usuarios`, com `total_avaliacoes > 0`, iguais nos dois
  métodos. Não se usa nota zero como substituto de ausência.
- As avaliações existentes são simuladas para reproduzir notas fornecidas.
  Não constituem avaliações reais dos jogadores nem notas disponíveis à época.
- O algoritmo usa as posições atuais do perfil, priorizando posição temporária
  da participação, como no sistema. Os próprios filtros de modalidade do algoritmo
  descartam posições incompatíveis. As posições históricas não foram reconstruídas.
- Métrica: `abs(média time A - média time B)`. Diferença pareada = manual − automático.
  Valores positivos favorecem o automático. Não se comparam somas de força.
- Wilcoxon pareado **bilateral**, alfa 0,05. Diferenças arredondadas a nove casas
  antes de identificar zeros e postos; empates recebem postos médios.
- Zeros são descartados (`wilcox`). O SciPy recebe só as diferenças não nulas e
  `PermutationMethod(n_resamples=inf)` para enumerar todos os sinais, inclusive
  com postos empatados. Não se usa `method='exact'` em dados empatados.
- Limite explícito: 16 pares não nulos (65.536 atribuições de sinais), para evitar
  crescimento exponencial. Acima disso, a rotina pede revisão do protocolo, sem
  escolher silenciosamente aproximação ou sorteio.
- Todos zeros: p e r indisponíveis. Um par: p bilateral = 1 pela distribuição
  de dois sinais. Menos de seis pares: aviso de impossibilidade de atingir 5%.
- `r = Z / sqrt(n efetivo)`, com direção, e `rAbsoluto = abs(r)`.
  `Z = (W+ − soma(postos)/2) / sqrt(soma(postos²)/4)`, sem correção de continuidade.
  A variância incorpora empates via postos médios. Z é descritivo padronizado:
  o p-valor vem da permutação exata, não de Z. Não converter o p exato em Z.

São oito rodadas do mesmo grupo, não oito grupos independentes. Independência
entre diferenças e simetria são pressupostos, não fatos demonstrados pelo teste.
Com uma amostra pequena, a conclusão deve ser exploratória. A expansão do histórico
foi decidida depois da discussão do limite amostral e antes da primeira execução;
isso também consta no relatório. O algoritmo otimiza a própria métrica avaliada,
portanto o resultado não demonstra melhoria do placar ou da experiência em campo.

## Reproduzir a análise

Para repetir apenas a estatística de uma entrada já salva, sem consultar o banco:

```powershell
.venv-wilcoxon/Scripts/python.exe backend/scripts/analise-times/wilcoxon.py "outputs/analise-times/PASTA/relatorio.html" "outputs/analise-times/PASTA"
```

Esse comando extrai a entrada incorporada e reescreve o HTML, preservando os dados
originais. Também aceita `comparacao.json` de execuções antigas como entrada.
Executar o fluxo completo novamente consulta notas e perfis atuais e cria outro
snapshot; mudanças de cadastro podem alterar os resultados. Não escolher execuções
pelo p-valor. Mantenha o snapshot e as versões usados na monografia.
