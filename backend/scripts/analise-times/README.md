# Análise local das formações de times

Rotina administrativa do TCC. O Node.js consulta o PostgreSQL via `pg` em uma
transação **READ ONLY / REPEATABLE READ**, reutiliza `balancearTimes` em memória
e executa o Wilcoxon em JavaScript no próprio backend (`backend/lib/wilcoxon.js`).
O cálculo e o relatório não dependem de Python, NumPy ou SciPy. Não chama `gerarTimes`,
não altera os times históricos e não precisa de endpoint nem da Vercel.

## Reanálise com avaliações reais e médias anteriores (25/11/2026)

O usuário forneceu 624 avaliações individuais reais em
`Patota-Avaliacoes-Setembro-Outubro-2026_1.xlsx`, declarando que foram coletadas
logo após cada jogo na mesma data. A planilha foi conferida contra o baseline:
oito rodadas, 108 participações, sem autoavaliações, duplicidades, notas inválidas
ou avaliações entre adversários. A origem real e a data de coleta são declarações
do usuário; o horário de importação não é usado como data histórica.

No computador atual, execute na raiz:

```powershell
npm --prefix backend run analisar:times
```

O comando padrão consulta `avaliacoes` diretamente no PostgreSQL na mesma
transação somente leitura das escalações. Não precisa da planilha nem de JSON
externo e não usa `media_usuarios` para obter a força. Confere que a data de coleta
em `created_at` coincide com a data da partida, conforme o protocolo deste estudo;
se houver divergência, interrompe a análise para conferência. O relatório identifica
a fonte PostgreSQL, incorpora as avaliações consultadas e registra seu hash.

Para comparar com o arquivo normalizado original, continua disponível:

```powershell
npm --prefix backend run analisar:times -- --avaliacoes outputs/planilha-avaliacoes-2026-11-25/avaliacoes-reais.json
```

Nesse modo opcional, o caminho do JSON é relativo à raiz do projeto, mesmo executando dentro de
`backend`. O arquivo contém `origem = avaliacoes_reais_declaradas_pelo_usuario`,
`momentoAvaliacao = apos_partida_na_mesma_data`, nome e SHA-256 da planilha e um
array `avaliacoes` com `partidaId`, `data` (AAAA-MM-DD), `avaliadorId`, `avaliadoId`
e `nota` numérica de 0 a 10. A fonte local e uma cópia da planilha ficam em
`outputs/`, ignorado pelo Git. Nenhum modo instala biblioteca de Excel, Python ou
SciPy para executar o estudo.

O cenário `medias_anteriores_reais` aplica estas regras, definidas antes de
calcular os novos resultados:

- Usa exclusivamente avaliações com `data < data da rodada analisada`. A nota do
  próprio jogo só pode influenciar rodadas posteriores. Nunca usa a média atual
  do cache, notas temporárias ou notas futuras.
- Calcula a média das notas de cada jogador por partida anterior e depois a
  média dessas médias, com peso igual para cada partida. Regra escolhida pelo
  usuário conforme os requisitos. Não arredonda médias intermediárias; arredonda
  a força final a duas casas, compatível com a precisão utilizada pela aplicação.
- Usa a mesma força anterior nos dois métodos e preserva todos os participantes.
  Sem média anterior, aceita exclusivamente nota temporária atribuída pelo
  presidente antes daquela partida, declarada e registrada em
  `protocolo.notasTemporariasHistoricas`, com valor igual ao da participação no banco.
  Não aceita qualquer nota temporária cadastrada hoje sem confirmação histórica.
  Se ainda faltar nota para alguém, exclui a rodada inteira. Não remove o estreante
  nem atribui nota zero. Uma média anterior tem prioridade sobre nota temporária.
- A falta de notas anteriores não impede que as avaliações dessa partida formem
  histórico para as rodadas seguintes.
- Mantém todas as rodadas elegíveis, inclusive empates e pioras. O critério é a
  disponibilidade de histórico, sem seleção pelo resultado ou pelo p-valor.
- Mantém a limitação já existente de perfis/posições atuais; não reconstrói posições
  históricas a partir de notas.

Inicialmente foram excluídas 08/09 (primeira rodada, sem histórico anterior) e
15/09 (Ferraz sem nota anterior). Entraram as seis rodadas de 22/09 a 27/10. A primeira execução
apresentou menor desequilíbrio automático nas seis: W+=21, W−=0, n efetivo=6,
p=0,03125, r≈0,898717. O resultado continua exploratório, com rodadas do mesmo grupo.

Depois, em 25/11/2026, o presidente informou a nota temporária **9** atribuída a
Ferraz antes de 15/09. Ela foi gravada em `participacoes.nota_temporaria` e declarada
no protocolo, sem alterar avaliações ou médias dos perfis. A nota é usada somente
nessa participação, igualmente nos dois métodos, e é identificada no relatório.
Não se torna uma avaliação nem entra na média de jogos posteriores. 08/09 permanece
como ponto de partida, sem notas simuladas. A execução atual inclui **sete rodadas**:
W+=28, W−=0, n efetivo=7, p=0,015625 e r≈0,894427. O cenário anterior com seis
rodadas permanece nos relatórios arquivados.

O relatório inclui exclusões, hash do snapshot (ou da planilha no modo de arquivo), avaliações reais de origem,
componentes das médias por jogador e hashes do código. É possível reproduzir a
estatística a partir dele com `analisar.js`, sem o JSON externo e sem banco.
Os 22 testes da suíte incluem corte temporal, zeros verdadeiros, estreantes,
quantidades diferentes de avaliadores, integridade da fonte, conversão de notas
do PostgreSQL, divergência entre data de coleta e data do jogo, uso de nota
temporária declarada para a estreia, restrição à participação e prioridade da média.

A reanálise é somente leitura. Em uma operação separada, autorizada pelo usuário
em 25/11/2026, as 624 avaliações reais foram importadas no PostgreSQL: os 300
registros existentes foram atualizados preservando IDs e outros 324 foram
inseridos. Os 14 caches foram recalculados com média das médias por partida, e
`encerrarAvaliacoes` foi corrigido para manter essa regra nas futuras finalizações.
A divergência anterior do backend com os requisitos foi resolvida. O cenário
histórico continua reconstruindo médias anteriores e não usa esse cache atual.

A importação está em `backend/scripts/importar-avaliacoes-reais.js`. Simule com:

```powershell
npm --prefix backend run importar:avaliacoes -- outputs/planilha-avaliacoes-2026-11-25/avaliacoes-reais.json
```

Acrescentar `--aplicar` grava em transação serializável, após salvar backup e
validar baseline, participantes, pares, datas e notas. Não exclui avaliações;
aborta se houver no alvo alguma avaliação que não conste da fonte. As datas de
coleta declaradas são gravadas em `created_at` com `00:00:00` como convenção de
data sem horário conhecido. O horário real não foi informado. Os registros da
importação usam um instante separado e ficam junto do backup em
`outputs/importacao-avaliacoes-reais/2026-11-25T20-21-41.887Z/`.

Texto sugerido para os resultados atualizados na monografia:

> As médias anteriores a cada rodada foram reconstruídas a partir de 624 avaliações
> individuais reais, coletadas após as partidas nas respectivas datas, segundo os
> registros fornecidos pelo responsável. Calculou-se a média das médias por partida,
> usando exclusivamente avaliações de jogos anteriores e arredondando a força final
> a duas casas decimais. Na estreia de um jogador em 15/09, foi utilizada a nota
> temporária 9, atribuída antes do jogo pelo presidente conforme sua declaração,
> sem integrá-la às médias de avaliações. A primeira rodada serviu apenas como
> histórico inicial. Nas sete rodadas elegíveis, o Wilcoxon pareado bilateral exato,
> implementado e testado no backend do Patota+, resultou em W+=28, W−=0 e p=0,015625,
> com r≈0,894427. A interpretação é exploratória, considerando a amostra pequena e
> as possíveis dependências entre rodadas do mesmo grupo.

## Cenário com médias atuais, sem corte temporal

Na raiz `C:\patota-plus`:

```powershell
npm --prefix backend run analisar:times -- --medias-atuais
```

Ou, dentro de `backend`, use `npm run analisar:times -- --medias-atuais`.
Após a importação, este cenário usa médias atuais da massa real. Não reproduz o
estudo anterior baseado em notas simuladas; para isso, use o HTML arquivado e
`analisar.js`. Para o estudo temporal direto do banco, execute sem argumentos.
É necessário acesso ao banco configurado em `backend/.env` (`DATABASE_URL`).
Nenhuma credencial é exportada para o relatório.

Cada execução cria somente `relatorio.html` em
`outputs/analise-times/<instante-UTC>/`. Abra no navegador, sem servidor ou internet.
O arquivo reúne resumo, interpretação dos indicadores, comparação por rodada,
formações expansíveis, notas, método e limitações. Permite impressão pelo navegador.
Os JSONs de entrada e resultado ficam incorporados em seções expansíveis, incluindo
posições, identificadores, hashes e versões para reprodução, sem arquivos intermediários.
Relatórios antigos nos formatos JSON/CSV/Markdown são preservados.

O HTML contém nomes dos participantes; trate o arquivo como dado do estudo.
Não publique relatórios brutos automaticamente. A planilha original não é modificada.

## Preparar outro computador

Instale Node.js com suporte a `node:test` (Node.js 20 ou superior). Na raiz do projeto:

```powershell
npm --prefix backend install
npm --prefix backend run test:wilcoxon
npm --prefix backend run analisar:times
```

Os mesmos comandos funcionam em Windows, Linux e macOS. Os testes não acessam o banco.

## Protocolo original definido antes da primeira execução

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
- Zeros são descartados (`wilcox`). A implementação própria atribui postos médios
  aos módulos empatados e enumera as `2^n` atribuições de sinais, inclusive com
  postos empatados. O p bilateral é a fração com distância de W+ ao centro da
  distribuição maior ou igual à observada, incluindo a atribuição observada.
  Não há aproximação normal, sorteio ou correção de Monte Carlo.
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
node backend/scripts/analise-times/analisar.js "outputs/analise-times/PASTA/relatorio.html" "outputs/analise-times/REPRODUCAO"
```

Esse comando extrai a entrada incorporada e gera um novo HTML na pasta de destino,
preservando os dados originais. Também aceita HTML da rotina Python anterior e
`comparacao.json` de execuções antigas como entrada. Use outra pasta para preservar
o relatório original e suas versões.
Executar o fluxo completo novamente consulta notas e perfis atuais e cria outro
snapshot; mudanças de cadastro podem alterar os resultados. Não escolher execuções
pelo p-valor. Mantenha o snapshot e as versões usados na monografia.

## Migração e validação por testes unitários

Até 25/11/2026, `executar.js` chamava `wilcoxon.py`, que usava
`scipy.stats.wilcoxon` com `PermutationMethod(n_resamples=inf)`. Após a orientação
recebida no TCC, essa implementação foi substituída por JavaScript no backend.
Os arquivos Python e seu `requirements.txt` foram retirados da rotina. O método,
o limite de 16 pares, a precisão de nove casas (meias unidades para o par),
o tratamento de zeros/empates e a fórmula de r foram preservados.

`npm --prefix backend run test:wilcoxon` executa testes com `node:test` e
`node:assert/strict`. Inclui o exemplo publicado de Wilcoxon reproduzido na
[documentação SciPy](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html)
(W mínimo = 24; p = 0,041259765625), resultados calculáveis por enumeração manual,
empates, zeros, inversão de sinais, arredondamento, limite amostral, entradas
inválidas e reprodução do HTML com hash. SciPy é apenas uma referência documental
para um caso de teste; não é instalado nem executado pela suíte ou pela análise.

Texto sugerido para a monografia após a migração:

> O teste de postos sinalizados de Wilcoxon pareado bilateral foi implementado
> em JavaScript no backend do Patota+, com nível de significância de 5%. O p-valor
> exato é obtido pela enumeração exaustiva das atribuições de sinais às diferenças
> não nulas, com postos médios para empates e limite de 16 pares não nulos. A
> implementação foi validada por testes unitários com valores de referência e
> casos de borda. A análise é executada por uma rotina administrativa do sistema,
> separada do algoritmo de formação das equipes.
