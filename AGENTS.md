# Patota+ — instruções persistentes para agentes

Este repositório é o TCC **Patota+**, uma aplicação web para organizar partidas de
futebol amador. Este arquivo é a fonte canônica e centralizada das instruções para
agentes, do contexto do produto, das convenções de código e da modelagem do banco.
Antes de analisar, planejar ou alterar o projeto, leia o contexto e as regras abaixo.
Se o conteúdo recebido automaticamente estiver truncado, leia este arquivo completo
no workspace, em partes, incluindo as seções correspondentes à tarefa.

## Índice

- [Regras que se aplicam a todas as alterações](#regras-que-se-aplicam-a-todas-as-alterações)
- [Manutenção deste contexto](#manutenção-deste-contexto)
- [Contexto do projeto](#contexto-do-projeto)
- [Estilo de código](#estilo-de-código)
- [Modelagem do banco de dados](#modelagem-do-banco-de-dados)

Consulte também [TCC_PATOTA_Requisitos_Escopo.md](TCC_PATOTA_Requisitos_Escopo.md)
quando a tarefa exigir detalhes adicionais de requisitos e escopo.

## Regras que se aplicam a todas as alterações

- Preserve a arquitetura existente: frontend React/Vite e backend
  Node.js/Express com SQL direto via `pg`; não introduza Prisma.
- No frontend, telas ficam em `frontend/src/pages/<Nome>/` com `index.jsx` e
  `style.css`; componentes compartilhados ficam em `components`, assets em
  `assets` e chamadas HTTP em `services`.
- No backend, cada entidade usa `routes.js`, `controller.js` e `model.js`, no
  fluxo Rota -> Controller -> Model -> Controller -> Resposta. Middlewares ficam
  em `backend/middlewares/`.
- No banco, use tabelas no plural e nomes de tabelas/colunas em `snake_case`.
  Exponha campos em `camelCase` ao backend/frontend por aliases SQL quando
  apropriado.
- Em JavaScript, não use property shorthand, spread (`...`) nem ternário para
  montar objetos. Prefira atribuições explícitas e `if` tradicional.
- Variáveis que armazenam arrays devem começar com `array`; variáveis que
  armazenam comandos SQL devem começar com `query`.
- Respeite as fases e o escopo do TCC. Não implemente recursos fora do escopo sem
  solicitação explícita.
- Preserve a separação de responsabilidades: Supabase gerencia autenticação;
  regras de negócio e dados passam pelo backend Express + `pg`.
- Antes de modificar banco, avaliações ou formação de times, releia
  a seção "Modelagem do banco de dados" deste arquivo, inclusive as pendências registradas.

## Manutenção deste contexto

Releia as seções correspondentes quando a tarefa tocar no assunto. Ao mudar uma
decisão estrutural, regra de negócio ou convenção, atualize este arquivo no mesmo
trabalho. Atualize também o documento de requisitos quando a mudança o afetar.
Em caso de divergência, confira o código e o schema atual do banco, informe a
inconsistência e não invente uma decisão silenciosamente.

---

## Contexto do projeto

### O que é o Patota+

O **Patota+** é uma aplicação web (TCC) voltada à organização de partidas de futebol amador. Substitui a gestão informal por mensagens por uma plataforma centralizada onde jogadores encontram e participam de partidas, e presidentes administram suas patotas.

O documento completo de requisitos e escopo está em: [TCC_PATOTA_Requisitos_Escopo.md](TCC_PATOTA_Requisitos_Escopo.md)

---

### Papéis de usuário

- **Jogador (membro comum):** participa de patotas e partidas, avalia companheiros, paga mensalidades.
- **Presidente (responsável pela patota):** todas as permissões do jogador + gerenciar patota, partidas, membros, caixa, relatórios e gerar times.

---

### Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React (Vite) + Tailwind CSS |
| Navegação frontend | React Router |
| HTTP client | Axios |
| Backend | Node.js + Express |
| Acesso ao banco | pg (node-postgres) |
| Banco de dados | PostgreSQL (hospedado no Supabase) |
| Autenticação | Supabase SDK no frontend + validação de token via middleware no backend |
| Deploy/hospedagem | Vercel |

---

### Estrutura do workspace

- `frontend/` — aplicação React (Vite)
- `backend/` — API Node.js + Express

---

### Telas do sistema (resumo)

1. **Cadastro** — registro de novo usuário com dados pessoais, modalidades e posições
2. **Login** — autenticação via Supabase
3. **Recuperação de senha** — redefinição via e-mail
4. **Minhas patotas** — tela inicial após o login; as opções Minhas patotas, Buscar patotas e Criar patota ficam juntas na barra lateral compartilhada das telas autenticadas
5. **Tela da patota** — abas: Visão Geral, Jogos, Membros, Relatórios (presidente)
6. **Detalhes da partida** — abas: Lista de jogadores, Times, Avaliações
7. **Criar/editar partida** — formulário compartilhado (somente presidente; edição implementada)
8. **Busca de patotas** — filtro por modalidade
9. **Perfil do usuário** — dados pessoais, alteração de senha e média geral
10. **Mensalidades** — relatório e baixa manual pelo presidente
11. **Criar/editar patota** — formulário de patota

> **Decisão de escopo:** não haverá tela separada de Configurações. A alteração de
> senha fica na edição do perfil e o logout no menu do avatar. Alteração de e-mail e
> preferência de tema foram descartadas.

---

### Fases de desenvolvimento

| Fase | Escopo |
|---|---|
| Fase 1 — Núcleo | Autenticação, cadastro, perfil, patotas, partidas, participantes, vagas e busca por modalidade |
| Fase 2 — Avaliações | Presença, relatório de presença, avaliações pós-partida, médias, histórico |
| Fase 3 — Financeiro | Mensalidades, baixa manual, relatório de pagamentos e caixa da patota |
| Fase 4 — Inteligentes | Formação automática de equipes |
| Fase 5 — Finalização | Melhorias de interface, validações, correções e limpeza dos dados com seed inicial |

---

### Roadmap imediato

> **Concluído em 23/09/2026 — navegação lateral:** o layout autenticado exibe
> uma barra lateral com ícones e acesso a Minhas patotas, Buscar patotas e Criar
> patota, sem separação entre os três itens. Em telas pequenas, ela abre pelo botão
> de menu no cabeçalho. O login e o logo levam a Minhas patotas; a rota `/home`
> redireciona para essa mesma tela diretamente em `Rotas.jsx`, para preservar links antigos.

1. **Limpeza dos dados e seed inicial:** concluída em 26/10/2026 nas tabelas `public`
   do PostgreSQL. Os dados de uso foram removidos e os cadastros básicos de 3
   modalidades e 9 posições foram inseridos com os IDs esperados pelo código.
   Por escolha do usuário, a exclusão dos 19 usuários do Supabase Auth e dos 8
   arquivos do Storage será feita manualmente no painel do projeto.

> **Concluído em 23/09/2026 — filtro por modalidade:** a busca permite selecionar
> uma modalidade ou visualizar todas, com filtro aplicado no backend a patotas das
> quais o usuário ainda não participa. A tela mostra a quantidade encontrada; os
> cards exibem a modalidade em destaque verde e não exibem mais a descrição.
> A geolocalização e a ordenação por distância foram retiradas do escopo final.
> **Concluído em 23/09/2026 — emblema da patota:** o presidente pode adicionar,
> substituir ou remover um emblema opcional no cadastro/edição. Os arquivos ficam
> no bucket público `patota-emblemas` do Supabase Storage, com políticas de escrita
> vinculadas ao presidente e referência `patotas.emblema_path`. "Minhas patotas" e
> "Buscar patotas" compartilham o mesmo card com emblema lateral, modalidade verde
> e fallback de iniciais. A descrição deixa de aparecer também em "Minhas patotas".
> **Exclusão de patota:** o presidente pode excluir a patota após confirmação
> explícita de que seus dados relacionados serão removidos. O backend apaga as
> solicitações de entrada na mesma transação antes de excluir a patota, pois essa
> FK não tem cascata no schema real; as demais relações diretas relevantes usam
> `ON DELETE CASCADE`. A imagem do emblema é limpa pelo frontend após o sucesso.
> **Saída da patota:** um jogador membro pode sair pela Visão Geral após confirmação.
> A ação remove apenas seu vínculo ativo em `membro_patotas`, usando a identidade
> autenticada. O presidente não pode sair, nem pela interface nem pela API.
> **Concluído em 23/09/2026 — sugestões ao criar partida:** o formulário de criação
> sugere o local a partir do endereço textual da patota, o horário habitual e a
> próxima ocorrência do dia habitual. A referência para calcular o dia e a hora
> atuais é `America/Sao_Paulo` (Brasília), independentemente do fuso do navegador.
> Se hoje for o dia habitual e o horário ainda não passou, sugere hoje; depois do
> horário, sugere a semana seguinte. Sem horário cadastrado, o próprio dia habitual
> pode ser sugerido hoje e o horário fica vazio. Campos habituais ausentes deixam
> os respectivos valores em branco. Todas as sugestões são editáveis. Na edição,
> o formulário carrega exclusivamente os valores salvos da partida.

> **Concluído em 23/09/2026 — edição de partida:** o presidente pode alterar data,
> horário, local e vagas pelo formulário existente, a partir dos detalhes da partida.
> A edição é permitida nos status `AGENDADA` e `EM_ANDAMENTO`. Partidas `FINALIZADA`
> ou `CANCELADA` são encerradas e não podem ser editadas. O backend confirma a
> autorização e impede vagas menores que o número de participações sob bloqueio
> da partida, inclusive em concorrência com novas confirmações de presença.

> **Concluído em 23/09/2026 — exclusão de partida:** o presidente pode excluir uma
> partida `AGENDADA` ou `EM_ANDAMENTO` nos detalhes, após confirmação. Partidas
> `FINALIZADA` ou `CANCELADA` preservam seu histórico e não podem ser excluídas.
> O backend valida o presidente e o status sob bloqueio da partida. A exclusão
> remove em cascata participantes, times e avaliações vinculados.

> **Implementado no código em 21/09/2026 — geração por composição e força:** define
> uma posição de atuação por participante, monta a composição e compara divisões que
> preservam suas vagas. O limite é de 350.000 divisões completas válidas, sem corte por
> participantes. As decisões e a garantia da busca estão na seção "Formação por composição".
> A posição da formação é persistida em `participacoes.posicao_formacao_id`.

> **Concluído em 12/09/2026 — atribuição de posição temporária:** o
> presidente pode remanejar cada participante na aba de times antes da geração ou
> regeneração. O valor fica em `participacoes.posicao_id` e não altera o perfil. A integração
> dessa posição ao algoritmo de geração foi concluída em 13/09/2026.

> **Concluído em 07/09/2026 — JWT nas requisições protegidas:** o frontend envia o access
> token do Supabase no header `Authorization`; o middleware do backend valida o token e
> disponibiliza a identidade em `req.usuarioId`. Os IDs mantidos nas URLs representam apenas
> alvos legítimos de operações administrativas.

---

### Decisões de encerramento

#### Análise administrativa dos times (02/11/2026)

O comando local `npm --prefix backend run analisar:times` compara as oito rodadas
históricas de setembro/outubro de 2026 com alternativas calculadas em memória por
`balancearTimes`. O backend consulta o banco em transação somente leitura e exporta
o snapshot; Python 3.12 + SciPy 1.16.3 executam Wilcoxon pareado bilateral, alfa 0,05,
com permutação exaustiva de sinais. Não há endpoint, tela ou dependência de Python
na aplicação hospedada. O Wilcoxon não participa da geração dos times.

A métrica é a diferença absoluta entre médias de força dos times. Os dois métodos
usam as mesmas notas atuais; a alternativa automática usa perfis atuais e eventual
posição temporária. Avaliações simuladas e ausência de notas/posições históricas
são explicitadas nos relatórios. As escalações manuais são conferidas contra o
baseline fixado em `backend/scripts/analise-times/protocolo.json` e preservadas.

Cada execução gera um único `relatorio.html` em `outputs/analise-times/<instante-UTC>/`,
com resumo, interpretação, tabela e formações expansíveis. Entrada e resultado JSON
ficam incorporados no HTML para reprodução; não são gerados arquivos intermediários.
O arquivo abre localmente no navegador. Relatórios antigos foram preservados.
São registrados n efetivo, zeros, W+, W−, p exato e r = Z/√n efetivo, com Z
padronizado pelos postos médios, sem correção de continuidade. Há limite de 16
pares não nulos para enumeração exaustiva; não há troca automática de método.
O protocolo, pressupostos, limitações e preparo do ambiente estão em
`backend/scripts/analise-times/README.md`.

Na execução inicial das oito rodadas, todas
apresentaram menor desequilíbrio automático: W+=36, W−=0, n=8, nenhum zero,
p=0,0078125 e r≈0,892227. A interpretação é exploratória, condicionada às notas de
referência e aos pressupostos de independência/simetria, sem inferir placares reais.

#### Demais decisões

Geolocalização, ordenação por proximidade e CI no GitHub Actions foram retirados do escopo final
por decisão do usuário. A parte PostgreSQL da limpeza e do seed foi concluída;
resta a limpeza manual do Supabase Auth e Storage.

Em 08/11/2026, por decisão do usuário, os arquivos de testes automatizados e seus
comandos foram removidos do projeto, incluindo os testes da migration e da rotina
Python. Não adicionar novas suítes de teste sem solicitação explícita. As validações
de execução da aplicação e o teste estatístico de Wilcoxon permanecem no código.

Em 08/11/2026, por solicitação do usuário, a migration inicial voltou ao escopo
para permitir novas instalações. `npm --prefix backend run db:inicializar` cria
schema e seed em banco vazio; `-- --supabase` inclui buckets e políticas de imagens.
Isso não altera nem atualiza o banco existente. Instruções em
`backend/migrations/README.md` e no README da raiz.

---

### Formação por composição

**Status:** implementado em 21/09/2026, com schema atualizado no Supabase.
Substitui a busca antiga com corte de 22 participantes.

**Revisão em 12/10/2026:** todos os confirmados participam da composição, sem
classificação por ordem de confirmação. A geração exige nota temporária do presidente
para cada participante sem média de avaliações.

#### Composição de referência por time

| Modalidade | Composição | Total por time |
|---|---|---:|
| Futsal e Society | 1 goleiro, 1 fixo, 2 alas e 1 pivô | 5 |
| Futebol de campo | 1 goleiro, 2 zagueiros, 2 laterais, 2 volantes, 1 meia e 3 atacantes | 11 |

"Meia" corresponde ao meio-campo informado pelo usuário e ao nome usado no cadastro.
Esses totais são referências de composição, não limites de participantes da partida.

#### Distribuição inicial e jogadores com múltiplas posições

- Formar dois times e preservar a diferença de tamanho de no máximo um jogador.
- Distribuir as posições antes de otimizar força, começando sempre pelo goleiro.
- A posição temporária definida pelo presidente prevalece sobre o perfil.
- Sem posição temporária, considerar todas as posições do perfil válidas para a
  modalidade como possibilidades. Identificar uma posição de atuação para a formação,
  priorizando a mais necessitada em relação à composição de referência.
- Contabilizar primeiro os participantes com posição definida (temporária ou única)
  para orientar a alocação dos jogadores versáteis. Um jogador ocupa somente uma vaga
  de posição na composição, mesmo quando seu perfil oferece várias opções.
- Necessidade não é apenas quantidade absoluta: para os dois times de futsal/society,
  são desejados 2 fixos e 4 alas. Havendo 2 fixos e 3 alas entre os demais participantes,
  Matheus, que pode atuar como fixo ou ala, deve ser identificado como ala na formação.
- A escolha automática vale para a formação e não altera o perfil nem sobrescreve a
  posição temporária atribuída pelo presidente.

#### Todos os participantes

- A composição de referência orienta a escolha das posições, mas não limita o total
  de jogadores. Todos os confirmados, mesmo acima de 10 no futsal/society ou 22 no
  campo, recebem uma posição de atuação quando houver opção válida no perfil ou
  posição temporária definida pelo presidente.
- Distribuir os jogadores disponíveis entre dois times com diferença de tamanho de
  no máximo um e equilibrar a quantidade de jogadores de cada posição. Posições
  em falta não são inventadas; posições excedentes continuam na composição.
- Todos entram no cálculo da força média. A ordem de confirmação não influencia a
  geração dos times.
- Cada jogador sem média de avaliações precisa receber do presidente uma nota
  temporária de 0 a 10 nesta participação antes de gerar ou regenerar os times.
  A nota não é avaliação e não altera a média do perfil. Jogadores já avaliados
  usam a média real. A média de força exibida usa esses mesmos valores. Na aba de
  times, um único botão "Salvar" registra todas as notas temporárias preenchidas
  ou alteradas. Ao clicar em gerar/regenerar, a interface informa os jogadores
  que ainda precisam de nota salva; o backend também bloqueia a geração incompleta.

#### Busca por menor diferença de força

- Após a distribuição inicial, manter a composição por posição de cada time e variar
  os jogadores dentro dela, trocando jogadores por outros da mesma posição de atuação.
  Considerar também combinações que exigem várias trocas simultâneas.
- Jogadores sem posição válida formam um grupo próprio, distribuído entre os dois
  times com as mesmas regras de quantidade e força.
- Calcular as divisões possíveis já respeitando a composição definida. Não contar
  como possibilidades válidas divisões que violam essa estrutura. A inversão dos nomes
  dos times, quando equivalente, não representa uma nova divisão.
- Usar **350.000 divisões completas avaliadas** como teto inicial, em constante com
  nome explícito. Não usar corte por quantidade de participantes nem orçamento por
  passos intermediários de exploração. Validar o desempenho com reservas na implementação.
- Encerrar quando todas as divisões válidas tiverem sido avaliadas ou o teto for
  atingido; devolver a melhor formação completa encontrada, mantendo a inicial como
  alternativa disponível. O teto não é uma quantidade obrigatória de avaliações.
- Uma busca concluída garante a menor diferença de força dentro da composição e das
  posições de atuação escolhidas. Se atingir o teto, garante apenas a melhor encontrada.
  Não prometer ótimo global entre todas as possíveis escolhas iniciais de posições.
- Preservar determinismo e código explícito, com funções e critérios nomeados para
  facilitar a leitura e a apresentação do TCC. O teto não garante tempo fixo em segundos.

#### Decisões tomadas na implementação

- Contabilizar todas as posições únicas primeiro. Ordenar versáteis pela menor quantidade
  de opções válidas e depois pelo ID. Se o jogador puder ser goleiro e faltarem goleiros
  para os dois times, escolher goleiro. Nas demais escolhas, priorizar a menor ocupação
  proporcional: quantidade já atribuída dividida pela quantidade desejada nos dois times.
  Empates seguem a ordem da referência: goleiro, zagueiro, lateral, volante, meia, atacante
  no campo; goleiro, fixo, ala, pivô nas demais modalidades.
- Escolher uma posição de atuação para todos os confirmados; sem opção válida,
  manter posição indefinida. Não inventar posição. A composição é adaptada aos
  jogadores disponíveis.
- Distribuir os grupos de posição começando pelo goleiro. Dentro de cada grupo, ordenar por
  força decrescente e ID; priorizar menos jogadores da posição, depois menor tamanho e menor
  soma de força, respeitando os tamanhos finais.
- Fixar as quantidades por posição de cada time após a distribuição inicial.
  Enumerar combinações dentro desses grupos; a primeira é a formação inicial. Só eliminar
  inversão dos times quando todos os grupos tiverem quantidades iguais nos dois times.
  Comparar médias com tolerância de 0,000000001 e manter a formação anterior nos empates.
- O resultado interno informa `divisoesAvaliadas` e `buscaConcluida`. A contagem prévia de
  possibilidades satura acima do teto; não enumera todas as combinações para contá-las.
- Persistir `participacoes.posicao_formacao_id` separadamente de `posicao_id`. A
  geração/regeneração grava a posição com o time na mesma transação; desfazer limpa
  ambos. Mudar a posição temporária exige regenerar para alterar a formação.
- Exibir a posição salva na formação. Ordenar jogadores
  pela posição da formação (goleiro, lateral, zagueiro, volante, meia, atacante no campo),
  depois os sem posição; empates seguem por nome. Formações anteriores
  à atualização do schema mantêm a exibição antiga até a regeneração, sem atribuição retroativa.
- Na medição local realizada durante a implementação em 21/09/2026, sem banco:
  futsal/society com 14 jogadores avaliou 144 divisões em cerca de 7 ms;
  com 30, atingiu 350.000 em 27 ms. Campo com 24 avaliou 17.280 em 2 ms; com 40, atingiu
  350.000 em 25 ms. Valores dependem da máquina e dos participantes, sem garantia de tempo
  fixo e sem incluir consultas/gravações.

---

---

### Prioridades

- **P1 (Essencial):** Cadastro, Login, Home, Patota (visão geral/jogos/membros), Detalhes da partida, Busca com filtro por modalidade, Perfil, Criar patota, Criar/editar partida com sugestões dos dados habituais.
- **P2 (Importante):** Avaliações, Relatórios, mensalidades com baixa manual, Caixa.
- **P3 (Diferenciais):** Formação automática de equipes.

---

### Regras de negócio principais

- E-mail é único no sistema.
- Senha deve ter no mínimo 8 caracteres, com ao menos uma letra maiúscula, uma
  letra minúscula, um número e um caractere especial. Essa política vale para
  cadastro, redefinição e alteração no perfil.
- Somente o presidente pode: editar patota, criar/editar/excluir partidas, gerenciar membros, acessar relatórios, gerar times, registrar movimentações no caixa.
- Vagas de partida não podem ser excedidas.
- Avaliações são feitas apenas entre companheiros do mesmo time, após a partida.
- Média geral = média das médias por partida.
- Mensalidade é definida pelo presidente e vinculada a um mês.

---

### O que NÃO faz parte do escopo

- App mobile nativo
- Chat/mensagens
- Assinaturas/planos da plataforma
- Divisão automática de custos
- Estatísticas manuais (gols, assistências)
- Reserva/pagamento de quadras
- Streaming
- IA avançada / Machine Learning
- Processamento de pagamento online
- Notificações
- Recomendações de patotas na Home
- Recuperação de senha por SMS
- Campo de observações da partida
- Filtro de busca por posição e busca por texto livre
- Histórico detalhado no perfil e médias separadas por patota
- Consulta individual de mensalidade pelo membro
- Indicadores rápidos na Home
- Gestão profissional de clubes

---

### Modelo de dados (entidades principais)

Usuários, Patotas, Partidas, Participações, Times, Avaliações, Médias, Mensalidades e Movimentações financeiras.

---

### Arquitetura e convenções técnicas

#### Estrutura de pastas do frontend

```
frontend/src/
├── assets/          — todas as imagens e recursos estáticos
├── components/      — componentes reutilizáveis (Header, Button, Card, Modal etc.)
├── pages/           — telas do sistema (uma pasta por tela)
│   ├── MinhasPatotas/
│   │   ├── index.jsx
│   │   └── style.css
│   ├── Login/
│   │   ├── index.jsx
│   │   └── style.css
│   └── ...          — mesma estrutura para todas as telas
├── services/        — comunicação com backend/APIs (Axios)
└── ...
```

#### Regras obrigatórias de organização do frontend

- **Telas (pages):** cada tela fica em `src/pages/<NomeDaTela>/` contendo obrigatoriamente `index.jsx` e `style.css`.
- **Componentes compartilhados:** componentes reutilizáveis (Header, botões, cards, modals) ficam em `src/components/`.
- **Imagens/assets:** todos os arquivos de imagem ficam em `src/assets/`.
- **Services:** toda comunicação com backend e APIs externas fica em `src/services/` (já existe `api.js` com Axios configurado).
- **Estilização:** Tailwind CSS como padrão principal. Os arquivos `style.css` por tela ficam para estilos pontuais/complementares.
- **Navegação:** React Router para roteamento entre telas (SPA).

#### Bibliotecas já instaladas no frontend

- React (Vite)
- Axios
- *(A instalar no início do desenvolvimento: Tailwind CSS, React Router, Supabase JS SDK)*

#### Estrutura de pastas do backend

```
backend/
├── server.js            — ponto de entrada da aplicação Express
├── middlewares/         — middlewares de requisição (autenticação, validação etc.)
├── usuarios/            — exemplo de módulo/cadastro
│   ├── routes.js        — definição das rotas/APIs
│   ├── controller.js    — recebe requisição e devolve resposta
│   └── model.js         — camada de negócio (processa dados e devolve pro controller)
├── patotas/
│   ├── routes.js
│   ├── controller.js
│   └── model.js
└── ...                  — mesma estrutura para cada cadastro/entidade
```

#### Regras obrigatórias de organização do backend

- **Middlewares:** tudo que é middleware (autenticação, autorização, validações genéricas) fica em `backend/middlewares/`.
- **Módulos/cadastros:** cada entidade do sistema tem sua própria pasta em `backend/<entidade>/` com exatamente 3 arquivos:
  - `routes.js` — camada de rotas (define endpoints da API).
  - `controller.js` — camada de controle (recebe a requisição, chama o model, devolve a resposta).
  - `model.js` — camada de negócio (processa dados, aplica regras, interage com banco).
- **Fluxo:** Rota → Controller → Model → Controller → Resposta.

#### Bibliotecas já instaladas no backend

- Node.js
- Express
- pg (node-postgres) — driver de acesso ao PostgreSQL
- @supabase/supabase-js — validação do token JWT do Supabase via `getClaims`
- cors, dotenv

#### Decisões de arquitetura

- **Autenticação:** Supabase SDK no frontend gerencia login/cadastro/sessão. O backend recebe o token JWT do Supabase no header `Authorization`, valida-o via `getClaims` em middleware e disponibiliza o UUID autenticado em `req.usuarioId` antes de processar requisições protegidas.
- **Rotas protegidas:** `LayoutAutenticado` aguarda a restauração da sessão pelo Supabase antes de renderizar o cabeçalho, a navegação e a tela solicitada. Sem sessão, redireciona para `/login` substituindo a entrada no histórico. O layout acompanha mudanças de autenticação e também redireciona quando a sessão é encerrada. Login, cadastro, recuperação e redefinição de senha permanecem fora desse layout.
- **Banco de dados:** PostgreSQL hospedado no Supabase, acessado pelo backend via `pg` (node-postgres) com queries SQL diretas.
- **Separação de responsabilidades:** Supabase Auth gerencia a autenticação e Supabase
  Storage armazena arquivos de imagem (avatares e emblemas). A referência do emblema,
  as permissões de edição e os demais dados de negócio passam pelo backend Express + pg;
  políticas do Storage também restringem o upload e a remoção dos emblemas.

---

### Diretrizes de desenvolvimento

- **Tela da patota:** cabeçalho com emblema, modalidade, localização, quantidade
  de membros e horário habitual. As abas Visão geral, Jogos, Membros e Relatórios
  usam seleção destacada e navegação por teclado; Relatórios permanece exclusivo
  do presidente, com sub-abas Presença, Mensalidades e Caixa. Cards de jogos
  destacam data e ocupação das vagas; solicitações de entrada ficam separadas
  da lista de membros. Manter fundo verde-claro, superfícies brancas e layout
  responsivo, usando Tailwind e complementos locais em `pages/Patota/style.css`.
- **Carregamento da interface:** os componentes compartilhados de
  `frontend/src/components/Carregamento.jsx` padronizam skeletons para cards,
  formulários, perfil, detalhes, listas, times e relatórios. Títulos conhecidos,
  cabeçalho e navegação permanecem visíveis enquanto os dados das telas autenticadas
  chegam. Antes da restauração da sessão, exibir somente o logo e o indicador de
  acesso, preservando a proteção das rotas. Ações com estado de envio usam indicador
  no botão e bloqueio durante a requisição; atualizações de caixa e mensalidades
  preservam os dados já exibidos com indicação de atualização. Skeletons são
  decorativos, com mensagem de status para leitores de tela; as animações respeitam
  `prefers-reduced-motion`. Não adicionar atrasos artificiais ao carregamento.
- Interface simples, clara e intuitiva (RNF01)
- Layout responsivo — desktop e mobile (RNF02)
- Segurança e controle de acesso via Supabase (RNF03/RNF04)
- Código organizado e manutenível (RNF09)
- Compatível com navegadores modernos (RNF10)
- Estratégia: primeiro o sistema básico funciona ponta a ponta, depois avaliações/financeiro, por último funcionalidades inteligentes.

---

## Estilo de código

### Regras obrigatórias ao gerar código JavaScript

- **Não usar shorthand property.** Sempre escrever `{ chave: valor }` explicitamente, mesmo que a variável tenha o mesmo nome da chave.
- **Não usar spread (`...`).** Montar objetos e arrays de forma explícita, passo a passo.
- **Não usar if inline / ternário condicional em montagem de objetos.** Usar `if` tradicional para condicionais.

### Convenções de nomenclatura de variáveis

- **Arrays:** todo nome de variável que armazena um array deve começar com o prefixo `array`. Exemplo: `arrayModalidades`, `arrayValores`, `arrayCampos`.
- **Queries SQL:** todo nome de variável que armazena uma string de comando SQL deve começar com o prefixo `query`. Exemplo: `queryInsertUsuario`, `querySelectModalidades`, `queryUpdate`.

#### Exemplo do que evitar

```js
// ❌ Nome genérico para array
const modalidades = []
const campos = []
const valores = []

// ❌ Nome genérico para query SQL
const insertUsuarioQuery = `INSERT INTO ...`
const selectModalidadesQuery = `SELECT ...`
```

#### Exemplo do que usar

```js
// ✅ Prefixo array
const arrayModalidades = []
const arrayCampos = []
const arrayValores = []

// ✅ Prefixo query
const queryInsertUsuario = `INSERT INTO ...`
const querySelectModalidades = `SELECT ...`
```

### Exemplo do que evitar

```js
// ❌ shorthand
const data = { nome, email }

// ❌ spread
const data = { ...dadosSimples, ...outroObjeto }

// ❌ if inline / condicional com spread
const data = {
  ...(condicao && { campo: valor })
}
```

### Exemplo do que usar

```js
// ✅ Explícito
const data = { nome: nome, email: email }

// ✅ Montar campo a campo
const data = {}
data.nome = dadosSimples.nome
data.email = dadosSimples.email

// ✅ If tradicional
if (condicao) {
  data.campo = valor
}
```

---

## Modelagem do banco de dados

Referência das tabelas e campos do projeto, por fase.

Convenções reais do banco (PostgreSQL no Supabase):
- Nomes de tabela no **plural** e em **snake_case** (ex.: `usuarios`, `membro_patotas`).
- Nomes de coluna em **snake_case** (ex.: `presidente_id`, `created_at`).
- O backend expõe esses campos em camelCase via alias no SQL (ex.: `presidente_id AS "presidenteId"`).

> Nota histórica: no início do projeto a intenção era usar Prisma, por isso versões
> anteriores deste documento listavam as entidades com nomes conceituais em
> PascalCase/singular (ex.: `Usuario`, `MembroPatota`). O Prisma foi abandonado em favor
> de SQL direto via `pg` (node-postgres); este documento reflete os nomes reais das tabelas.

> **Decisão revisada em 08/11/2026:** existe uma migration inicial versionada em
> `backend/migrations/001-inicial.sql`, derivada da consulta somente leitura ao
> schema real. O seed `backend/sql/seed-inicial.sql` preserva os IDs de modalidades
> e posições. O comando `db:inicializar` aplica ambos em transação única e recusa
> bancos com tabelas, sequências ou views em `public`; não há reset, atualização
> incremental ou alteração automática do banco existente. `--supabase` aplica
> também `backend/sql/supabase-storage.sql` na mesma transação, em uma instância
> Supabase nova. O backend conecta como proprietário das tabelas ou papel com
> BYPASSRLS; nas novas instalações, RLS bloqueia acesso direto da Data API aos
> dados de negócio. Auth continua fornecido pelo Supabase.
>
> **Diferenças documentadas em relação ao banco existente:** `patotas` ainda tem
> `latitude`, `longitude`, `cep`, `numero`, `complemento` e `localizacao`, além do
> índice espacial e da restrição de CEP. Nenhum desses campos é usado pelo código
> atual; ficam fora da migration inicial, dispensando PostGIS. Nenhum campo foi
> removido do banco existente. O schema atual tem RLS desativado nas tabelas públicas
> e políticas de escrita de avatares limitadas apenas pelo bucket. A instalação
> nova ativa RLS nas tabelas de negócio e restringe escrita de avatares ao usuário;
> os emblemas usam função de autorização SECURITY DEFINER com search_path fixo,
> sem liberar leitura direta de patotas. Essas diferenças não foram aplicadas ao
> projeto Supabase existente. Não foram adicionados triggers de cadastro nem FK
> para `auth.users`: o perfil continua sendo criado pela API com o UUID autenticado.
>
> **Histórico:** em 26/10/2026, as tabelas `public` do banco conectado foram limpas
> e o seed inicial foi aplicado. A exclusão dos usuários do Auth e dos arquivos do
> Storage ficou a cargo do usuário. O seed agora versionado foi reconstruído a
> partir dos cadastros básicos conferidos no banco em 08/11/2026.

> **Massa de demonstração importada em 01/11/2026:** a patota `RUIM DI MIRA FC`
> recebeu as partidas de 06, 13, 20 e 27/10/2026 da planilha histórica, com 8 times
> manuais e 53 participações. Foram inseridas 300 avaliações **simuladas**, autorizadas
> para o TCC, entre companheiros de time e sem autoavaliações, reproduzindo as 14
> médias fornecidas. As partidas estão finalizadas e as avaliações encerradas.
> O script `backend/sql/importar-historico-ruim-di-mira.sql` registra a origem
> sintética e impede reimportação das mesmas datas. O schema não possui campo de
> origem da avaliação; essa distinção está na planilha e neste registro.
> O cache foi calculado com `AVG(nota)` e `COUNT(*)`, conforme o backend atual.
> Há divergência anterior com a regra de "média das médias por partida" descrita
> em [Contexto do projeto](#contexto-do-projeto); nesta massa os dois cálculos coincidem, pois cada
> jogador mantém a mesma média em todas as partidas. A regra não foi alterada.
>
> **Revisão em 01/11/2026:** após correção da planilha pelo usuário, os times das
> quatro datas e as 300 avaliações simuladas foram atualizados, preservando os IDs
> das partidas, dos times e das 53 participações. As 14 médias foram recalculadas
> conforme as novas metas. Fonte final: `outputs/avaliacoes-outubro/Histórico Times - revisado.xlsx`.
> A aba das metas estava salva como `Planilha1`. O script da revisão está em
> `backend/scripts/revisar-historico-ruim-di-mira.js`, com SQL em
> `backend/sql/revisar-historico-ruim-di-mira.sql`; o backup anterior está em
> `outputs/avaliacoes-outubro/backup-antes-revisao.json`.

> **Histórico ampliado em 02/11/2026:** foram importadas as escalações manuais
> das abas `08set`, `15set`, `22set` e `29set` da mesma planilha revisada, referentes
> a setembro de 2026: 4 partidas, 8 times e 55 participações. A patota passou a
> ter 8 rodadas históricas, 16 times e 108 participações. As novas partidas estão
> finalizadas e com avaliações encerradas; a fonte não contém avaliações de
> setembro, portanto nenhuma avaliação foi criada e as 300 avaliações simuladas
> de outubro e as 14 médias existentes foram preservadas. Posições e notas
> temporárias das novas participações permanecem NULL por ausência na fonte.
> Horário e local seguem os dados habituais da patota, como na importação anterior,
> e não representam informações históricas adicionais fornecidas na planilha.
> A importação transacional está em `backend/scripts/importar-setembro-ruim-di-mira.js`
> (simulação por padrão; `--aplicar` grava), com bloqueio de datas já existentes.
> Backup e comprovante estão em `outputs/avaliacoes-outubro/backup-antes-importacao-setembro.json`
> e `outputs/avaliacoes-outubro/importacao-setembro-confirmada.json`.
> A conferência após o commit validou as escalações e a preservação de outubro,
> avaliações e médias. O aumento da amostra não garante significância estatística;
> a comparação automática e o Wilcoxon foram executados em 02/11/2026 pela rotina
> local `backend/scripts/analise-times/executar.js`, em transação somente leitura,
> sem novas tabelas ou alterações no histórico. Snapshots e relatórios ficam em
> `outputs/analise-times/`; o protocolo está no README da rotina. As médias
> atuais não constituem um registro das notas disponíveis antes de cada rodada.

> **Arquivos locais de apoio:** as planilhas, backups e comprovantes em `outputs/`
> são ignorados pelo Git. Os scripts pontuais de importação, revisão e conferência
> do histórico citados acima foram preservados neste computador e excluídos do
> versionamento via `.git/info/exclude`. Não são dependências da rotina de análise;
> o baseline necessário está em `backend/scripts/analise-times/protocolo.json`.

---

### Fase 1 — Nucleo

#### usuarios
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | Mesmo UUID do Supabase Auth |
| nome | text | |
| email | text, unico | |
| telefone | text, opcional | |
| data_nascimento | timestamp, opcional | |
| foto | text (URL), opcional | URL publica do Storage (bucket `avatars`) |
| created_at | timestamp | |
| updated_at | timestamp | |

#### modalidades (tabela auxiliar)
| Coluna | Tipo | Observacao |
|---|---|---|
| id | int, PK, autoincrement | |
| nome | text, unico | Ex: Futebol, Futsal, Society |

#### posicoes (tabela auxiliar)
| Coluna | Tipo | Observacao |
|---|---|---|
| id | int, PK, autoincrement | |
| nome | text, unico | Ex: Goleiro, Zagueiro, Meia, Atacante |

#### usuario_modalidades (N:N)
| Coluna | Tipo | Observacao |
|---|---|---|
| usuario_id | uuid, FK → usuarios | |
| modalidade_id | int, FK → modalidades | |
| PK composta: (usuario_id, modalidade_id) | | |

#### usuario_posicoes (N:N)
| Coluna | Tipo | Observacao |
|---|---|---|
| usuario_id | uuid, FK → usuarios | |
| posicao_id | int, FK → posicoes | |
| PK composta: (usuario_id, posicao_id) | | |

#### patotas
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| nome | text | |
| descricao | text, opcional | |
| modalidade_id | int, FK → modalidades | |
| rua | varchar, opcional | |
| cidade | text | |
| estado | text | |
| dia_habitual | int, opcional | 1=Segunda, 2=Terça, ..., 7=Domingo |
| hora_habitual | time, opcional | Formato HH:MM:SS |
| emblema_path | text, opcional | Caminho do arquivo no bucket público `patota-emblemas` |
| presidente_id | uuid, FK → usuarios | |
| created_at | timestamp | |
| updated_at | timestamp | |

> **EMBLEMA IMPLEMENTADO EM 23/09/2026:** o bucket público `patota-emblemas`
> aceita PNG, JPEG e WebP de até 2 MB. Cada arquivo fica sob
> `<patota_id>/<uuid>.<extensão>`. Políticas de `storage.objects` permitem inserir,
> consultar para manutenção e remover arquivos apenas ao presidente da patota
> correspondente. O backend aceita `emblemaPath` na edição somente quando o caminho
> pertence à patota da rota; `NULL` remove a referência. Na criação, a patota é
> persistida antes do upload para que o caminho e a política possam usar seu ID.
> Se o upload falhar, a patota criada permanece e o formulário permite tentar de novo.
> Ao excluir uma patota, o frontend limpa seu arquivo via Storage API após a exclusão
> no backend; as políticas permitem ao proprietário do arquivo remover um objeto cuja
> patota já não exista. A URL pública é derivada do caminho no frontend; patotas sem
> emblema usam iniciais.

> **EXCLUSÃO DE PATOTA:** a exclusão pelo backend bloqueia a linha da patota e
> remove suas `solicitacoes_entrada` na mesma transação, antes de apagar a patota.
> Essa FK não possui `ON DELETE CASCADE` no schema real. As FKs diretas de
> `membro_patotas`, `partidas`, `mensalidades` e `movimentacoes_financeiras` possuem
> cascata; as dependências de partidas também são removidas pelas respectivas FKs.

> **FILTRO DE BUSCA IMPLEMENTADO:** o filtro por modalidade usa `patotas.modalidade_id`,
> sem alteração no schema, e aceita a opção de listar todas as modalidades. Filtro por
> posição, busca textual e proximidade ficam fora do escopo final.

#### membro_patotas (N:N com metadados)
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| usuario_id | uuid, FK → usuarios | |
| patota_id | uuid, FK → patotas (ON DELETE CASCADE) | |
| role | enum RolePatota (PRESIDENTE, JOGADOR) | default JOGADOR |
| data_entrada | timestamp | |
| ativo | boolean, default true | |

> **SAÍDA VOLUNTÁRIA:** um membro com papel `JOGADOR` pode remover seu próprio
> vínculo ativo em `membro_patotas`. O presidente é bloqueado também no backend.
> A saída não exclui a patota nem os registros históricos de partidas ou pagamentos.

#### partidas
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| patota_id | uuid, FK → patotas | |
| data | timestamp | |
| horario | text | |
| local | text | |
| vagas_total | int | |
| status | enum StatusPartida (AGENDADA, EM_ANDAMENTO, FINALIZADA, CANCELADA) | default AGENDADA |
| avaliacoes_encerradas | boolean, default false | Fase 2: finalizar a partida abre as avaliações (false); o presidente encerra setando true |
| created_at | timestamp | |
| updated_at | timestamp | |

> **EDIÇÃO IMPLEMENTADA:** os campos existentes de `partidas` permitem alterar data,
> horário, local e vagas, sem criar outra partida. Apenas o presidente pode editar
> partidas `AGENDADA` ou `EM_ANDAMENTO`, e `vagas_total` não pode ficar abaixo do
> total de registros em `participacoes`. O bloqueio transacional da linha da partida
> sincroniza essa regra com a confirmação de presença.
>
> **EXCLUSÃO IMPLEMENTADA:** somente o presidente pode excluir partidas `AGENDADA`
> ou `EM_ANDAMENTO`. A operação confere o status sob bloqueio e remove a partida;
> as FKs reais removem em cascata suas participações, times e avaliações.
>
> **SUGESTÕES IMPLEMENTADAS:** na criação, o formulário usa o endereço textual de
> `patotas`, `dia_habitual` (1=segunda a 7=domingo) e `hora_habitual` para
> sugerir local, data e horário. Os campos habituais continuam opcionais. O cálculo
> da data usa o fuso `America/Sao_Paulo`; a edição utiliza os dados salvos da
> partida. Não foram necessários novos campos no banco. Regras completas em
> [Contexto do projeto](#contexto-do-projeto).

#### participacoes
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| partida_id | uuid, FK → partidas (ON DELETE CASCADE) | Conferido no schema real em 23/09/2026 |
| usuario_id | uuid, FK → usuarios | |
| time_id | uuid, FK → times, opcional (ON DELETE SET NULL) | Preenchido quando os times são formados (Fase 2) |
| posicao_id | int, FK → posicoes, opcional (ON DELETE SET NULL) | Posição temporária atribuída pelo presidente exclusivamente para esta partida |
| posicao_formacao_id | int, FK → posicoes, opcional (ON DELETE SET NULL) | Posição de atuação escolhida na última formação; adicionada em 21/09/2026 |
| nota_temporaria | numeric(4,2), opcional, CHECK 0 a 10 | Nota atribuída pelo presidente nesta partida a quem ainda não possui média |

> **Alteração de 12/10/2026:** `nota_temporaria` e a restrição de nota entre 0 e 10 foram aplicadas diretamente ao PostgreSQL indicado por `backend/.env`. A nota temporária não altera `media_usuarios` nem as avaliações. Toda geração ou regeneração exige nota temporária para cada participante cujo `total_avaliacoes` é zero; a média real, quando existir, tem prioridade. As colunas `confirmado_em` e `extra_formacao` e o índice `(partida_id, confirmado_em)` foram removidos: todos os confirmados entram na composição, independentemente da ordem de confirmação.

> **Implementado em 12/09/2026 — posição por partida:** `participacoes.posicao_id` armazena
> apenas o remanejamento daquela partida e a alteração nunca modifica `usuario_posicoes`.
> Desde 13/09/2026, o algoritmo de geração usa esse campo com prioridade sobre as
> posições do perfil. Sem remanejamento, considera as posições de `usuario_posicoes`
> válidas para a modalidade. A posição da formação é gravada em
> `posicao_formacao_id`, preservando `posicao_id` e o perfil.

> **Revisão implementada no código em 21/09/2026:** a posição escolhida
> automaticamente ocupa `posicao_formacao_id`. A geração grava esse campo e `time_id`
> na mesma transação; desfazer limpa ambos, sem alterar `posicao_id` nem
> `usuario_posicoes`. A interface lê a
> posição salva, mesmo que o perfil ou o remanejamento mude depois. Regras completas na
> seção "Formação por composição" de [Contexto do projeto](#contexto-do-projeto).
>
> **Conferido no banco em 21/09/2026:** após a reativação do projeto Supabase, o schema
> e os IDs das posições foram conferidos. O ciclo de formação foi validado em tabelas
> temporárias no PostgreSQL, preservando os dados reais das partidas.

> A presença é representada pela existência da linha (confirmar = inserir, cancelar = deletar).
> A coluna `status` (CONFIRMADO/CANCELADO) prevista originalmente **não foi criada** — o
> comportamento de confirmar/recusar presença já funciona com base na existência do registro.

#### solicitacoes_entrada
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| usuario_id | uuid, FK → usuarios | |
| patota_id | uuid, FK → patotas (sem ON DELETE CASCADE) | Removida pelo backend antes da patota |
| status | varchar, default 'PENDENTE' | PENDENTE, ACEITO, RECUSADO |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### Fase 2 — Avaliacoes

#### times
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| partida_id | uuid, FK → partidas (ON DELETE CASCADE) | |
| nome | text | Ex: "Time A", "Time B" |

#### avaliacoes
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| partida_id | uuid, FK → partidas (ON DELETE CASCADE) | |
| avaliador_id | uuid, FK → usuarios (ON DELETE CASCADE) | |
| avaliado_id | uuid, FK → usuarios (ON DELETE CASCADE) | |
| nota | numeric(4,2) | |
| created_at | timestamp | |

Restrições:
- CHECK: `nota >= 0 AND nota <= 10`;
- CHECK: `avaliador_id <> avaliado_id` (sem auto-avaliação);
- UNIQUE: `(partida_id, avaliador_id, avaliado_id)` (uma avaliação por par, por partida).

> Essas restrições existem no banco como salvaguarda. As mesmas regras devem também ser
> validadas na camada de aplicação, incluindo a regra de só avaliar companheiros do mesmo time.

> **Implementado:** as avaliações são liberadas somente após a formação dos times. O
> backend e o frontend listam exclusivamente os companheiros com o mesmo `time_id` do
> avaliador, e o endpoint de gravação valida essa condição antes de registrar cada nota.
> Participantes sem time atribuído não possuem jogadores disponíveis para avaliar.

#### media_usuarios (cache de media geral)
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| usuario_id | uuid, FK → usuarios (ON DELETE CASCADE), unico | |
| media_geral | numeric(4,2), default 0 | |
| total_avaliacoes | int, default 0 | |
| updated_at | timestamp | |

---

### Fase 3 — Financeiro

#### mensalidades
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| patota_id | uuid, FK → patotas | |
| usuario_id | uuid, FK → usuarios | |
| mes_referencia | date | Primeiro dia do mês de referência. |
| valor | numeric, default 0 | Valor preservado no momento do registro da mensalidade. |
| status | enum StatusMensalidade (PENDENTE, PAGO) | Baixa manual; atraso não é calculado nesta fase. |
| pago_em | timestamp, opcional | Data e hora da baixa manual. |
| baixa_por | uuid, FK → usuarios, opcional | Presidente que registrou a baixa. |
| created_at | timestamp | |
| updated_at | timestamp | |

Restrições implementadas:
- UNIQUE: `(patota_id, usuario_id, mes_referencia)`;
- status limitado pelo enum `StatusMensalidade` a `PENDENTE` ou `PAGO`.

#### Alteração em patotas (Fase 3)
| Coluna | Tipo | Observação |
|---|---|---|
| valor_mensalidade | numeric(10,2), default 0 | Valor vigente definido pelo presidente; cada baixa preserva o valor na mensalidade do mês. |

#### movimentacoes_financeiras
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| patota_id | uuid, FK → patotas | |
| tipo | enum TipoMovimentacao (RECEITA, DESPESA) | |
| valor | numeric | |
| descricao | text | |
| data_movimentacao | date, default data atual | |
| mensalidade_id | uuid, FK → mensalidades, opcional | Vincula a receita gerada por uma baixa. |
| registrado_por | uuid, FK → usuarios, opcional | Usuário que registrou a movimentação. |
| created_at | timestamp | |

---

### Fase 4 — Inteligentes

Notificações foram retiradas do escopo do TCC. A antiga proposta da tabela
`notificacoes` não deve orientar migrations; poderá ser remodelada se o recurso for
retomado após a conclusão do projeto.

> A modelagem financeira acima foi conferida diretamente no schema PostgreSQL em 04/09/2026.

---

### Decisoes de design

- **UUID** para entidades principais (compativel com Supabase Auth);
- **Int autoincrement** para tabelas auxiliares pequenas (`modalidades`, `posicoes`);
- **Tabelas auxiliares** em vez de enums hardcoded para modalidade e posição — permite adicionar novas sem migration;
- **membro_patotas** como tabela separada — permite historico de entrada/saida e role por patota;
- **media_usuarios** como cache — evita recalcular a media a cada consulta de perfil;
- **participacoes.time_id** opcional — só é preenchido quando o presidente gera os times;
- **participacoes.posicao_id** opcional — registra a posição atribuída somente no contexto da partida;
- **participacoes** sem coluna `status` — presença é a existência do registro;
- Acesso ao banco via **SQL direto com `pg`** (Prisma foi descartado).
