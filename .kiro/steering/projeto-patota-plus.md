---
inclusion: always
---

# Projeto Patota+ — Contexto para o Agente

## O que é o Patota+

O **Patota+** é uma aplicação web (TCC) voltada à organização de partidas de futebol amador. Substitui a gestão informal por mensagens por uma plataforma centralizada onde jogadores encontram e participam de partidas, e presidentes administram suas patotas.

O documento completo de requisitos e escopo está em: #[[file:TCC_PATOTA_Requisitos_Escopo.md]]

---

## Papéis de usuário

- **Jogador (membro comum):** participa de patotas e partidas, avalia companheiros, paga mensalidades.
- **Presidente (responsável pela patota):** todas as permissões do jogador + gerenciar patota, partidas, membros, caixa, relatórios e gerar times.

---

## Stack tecnológica

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

## Estrutura do workspace

- `frontend/` — aplicação React (Vite)
- `backend/` — API Node.js + Express

---

## Telas do sistema (resumo)

1. **Cadastro** — registro de novo usuário com dados pessoais, modalidades e posições
2. **Login** — autenticação via Supabase
3. **Recuperação de senha** — redefinição via e-mail
4. **Minhas patotas** — tela inicial após o login; as opções Minhas patotas, Buscar patotas e Criar patota ficam juntas na barra lateral compartilhada das telas autenticadas
5. **Tela da patota** — abas: Visão Geral, Jogos, Membros, Relatórios (presidente)
6. **Detalhes da partida** — abas: Lista de jogadores, Times, Avaliações
7. **Criar/editar partida** — formulário compartilhado (somente presidente; edição implementada)
8. **Busca de patotas** — filtro por modalidade e ordenação por proximidade
9. **Perfil do usuário** — dados pessoais, alteração de senha e média geral
10. **Mensalidades** — relatório e baixa manual pelo presidente
11. **Criar/editar patota** — formulário de patota

> **Decisão de escopo:** não haverá tela separada de Configurações. A alteração de
> senha fica na edição do perfil e o logout no menu do avatar. Alteração de e-mail e
> preferência de tema foram descartadas.

---

## Fases de desenvolvimento

| Fase | Escopo |
|---|---|
| Fase 1 — Núcleo | Autenticação, cadastro, perfil, patotas, partidas, participantes, vagas e busca por modalidade |
| Fase 2 — Avaliações | Presença, relatório de presença, avaliações pós-partida, médias, histórico |
| Fase 3 — Financeiro | Mensalidades, baixa manual, relatório de pagamentos e caixa da patota |
| Fase 4 — Inteligentes | Formação automática de equipes |
| Fase 5 — Finalização | Melhorias de interface, validações, testes, correções, deploy |

---

## Roadmap imediato

> **Concluído em 23/09/2026 — navegação lateral:** o layout autenticado exibe
> uma barra lateral com ícones e acesso a Minhas patotas, Buscar patotas e Criar
> patota, sem separação entre os três itens. Em telas pequenas, ela abre pelo botão
> de menu no cabeçalho. O login e o logo levam a Minhas patotas; a rota `/home`
> redireciona para essa mesma tela diretamente em `Rotas.jsx`, para preservar links antigos.

1. **Geolocalização da patota e busca por proximidade:** ao criar ou editar uma patota,
   registrar a geolocalização de seu local padrão de jogos. Na busca de patotas, usar a
   localização do usuário para calcular a distância e exibir primeiro as patotas mais próximas.
   O filtro por modalidade já implementado e a ordenação por proximidade devem funcionar em conjunto.
   Seguir as decisões da seção "Próxima implementação — geolocalização e proximidade"
   abaixo.

> **Concluído em 23/09/2026 — filtro por modalidade:** a busca permite selecionar
> uma modalidade ou visualizar todas, com filtro aplicado no backend a patotas das
> quais o usuário ainda não participa. A tela mostra a quantidade encontrada; os
> cards exibem a modalidade em destaque verde e não exibem mais a descrição.
> A geolocalização e a ordenação por distância continuam pendentes.
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
> As colunas da posição da formação e da identificação de extras foram adicionadas
> e conferidas no Supabase em 21/09/2026.

> **Concluído em 12/09/2026 — atribuição de posição temporária:** o
> presidente pode remanejar cada participante na aba de times antes da geração ou
> regeneração. O valor fica em `participacoes.posicao_id` e não altera o perfil. A integração
> dessa posição ao algoritmo de geração foi concluída em 13/09/2026.

> **Concluído em 07/09/2026 — JWT nas requisições protegidas:** o frontend envia o access
> token do Supabase no header `Authorization`; o middleware do backend valida o token e
> disponibiliza a identidade em `req.usuarioId`. Os IDs mantidos nas URLs representam apenas
> alvos legítimos de operações administrativas.

---

## Próxima implementação — geolocalização e proximidade

**Status:** solução técnica definida, ainda não implementada.

### Cadastro do local da patota

- Adicionar ao endereço da patota `cep`, `numero` e `complemento`. O CEP será obrigatório,
  armazenado somente com os oito dígitos; o complemento será opcional. O número deverá
  aceitar `S/N` quando o local não possuir numeração.
- Usar a API gratuita ViaCEP para auxiliar o preenchimento de rua, cidade e estado. Permitir
  correção manual, pois o CEP não identifica necessariamente o local exato e o ViaCEP não
  fornece coordenadas geográficas.
- Ao criar uma patota ou alterar seu endereço, o backend deverá enviar o endereço completo
  para o Nominatim/OpenStreetMap e converter o endereço em latitude e longitude. A chamada
  ficará isolada em um service do backend e usará o Axios já instalado, para permitir a troca
  futura do provedor sem alterar controllers e models.
- O Nominatim será usado somente no baixo volume previsto para o TCC: consulta disparada pelo
  envio do formulário, sem autocomplete, com identificação da aplicação, atribuição ao
  OpenStreetMap, cache do resultado e limite global de no máximo uma requisição por segundo.
  As coordenadas salvas evitam repetir a geocodificação durante as buscas. Se esse perfil de
  uso mudar ou a política do serviço deixar de atendê-lo, substituir o provedor.
- Ativar o PostGIS em um schema dedicado no Supabase e armazenar o ponto do local em uma
  coluna `geography(POINT, 4326)` da tabela `patotas`, com índice espacial GiST. Ao construir
  o ponto, informar longitude antes de latitude.
- Manter também os campos textuais do endereço para exibição ao usuário. Não é necessário
  adicionar mapa, Leaflet, React Leaflet ou biblioteca JavaScript de cálculo de distância
  nesta fase.

### Busca por proximidade

- O filtro por modalidade já está implementado na tela e no backend. É o único filtro de busca
  previsto para o TCC; filtro por posição e campo de texto livre ficam fora do escopo.
  Quando a proximidade for implementada, ambos deverão funcionar juntos.
- Solicitar a posição atual somente quando o usuário acessar ou acionar a busca por
  proximidade, usando `navigator.geolocation.getCurrentPosition` no frontend. A API exige
  HTTPS e consentimento do usuário.
- Enviar latitude e longitude ao backend Express apenas como parâmetros da busca. Não
  persistir a localização do usuário.
- Fazer o model de patotas calcular no PostgreSQL/PostGIS a distância em linha reta entre o
  ponto recebido e cada patota, retornar a distância em quilômetros e ordenar do menor para
  o maior valor. Usar funções espaciais como `ST_Distance` e, quando houver filtro por raio,
  `ST_DWithin`; o acesso continuará sendo SQL direto via `pg`.
- Exibir a distância junto de cada resultado. Se o usuário negar a permissão ou a localização
  falhar, manter a busca disponível sem ordenação por proximidade e informar essa condição.

---

## Formação por composição

**Status:** implementado em 21/09/2026, com schema atualizado no Supabase e testes
automatizados. Substitui a busca antiga com corte de 22 participantes.

### Composição de referência por time

| Modalidade | Composição | Total por time |
|---|---|---:|
| Futsal e Society | 1 goleiro, 1 fixo, 2 alas e 1 pivô | 5 |
| Futebol de campo | 1 goleiro, 2 zagueiros, 2 laterais, 2 volantes, 1 meia e 3 atacantes | 11 |

"Meia" corresponde ao meio-campo informado pelo usuário e ao nome usado no cadastro.
Esses totais são referências de composição, não limites de participantes da partida.

### Distribuição inicial e jogadores com múltiplas posições

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

### Jogadores extras

- Acima do padrão de 5 jogadores por time no futsal/society ou 11 no campo, distribuir
  os jogadores extras apenas pela força, sem contar suas posições no equilíbrio da
  composição de referência.
- Incluir todos os participantes nos times e no cálculo de força média. Ser extra não
  exclui o jogador da partida. Preservar o equilíbrio de tamanho também nessa etapa.
- Preservar a força neutra: média dos jogadores avaliados da partida, ou 5 quando
  nenhum foi avaliado; não registrar essa estimativa como avaliação real.

### Busca por menor diferença de força

- Após a distribuição inicial, manter a composição por posição de cada time e variar
  os jogadores dentro dela, trocando jogadores por outros da mesma posição de atuação.
  Considerar também combinações que exigem várias trocas simultâneas.
- Os extras são a exceção à restrição de posição: sua distribuição considera somente
  força, sem modificar as vagas por posição da composição de referência.
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

### Decisões tomadas na implementação

- Contabilizar todas as posições únicas primeiro. Ordenar versáteis pela menor quantidade
  de opções válidas e depois pelo ID. Se o jogador puder ser goleiro e faltarem goleiros
  para os dois times, escolher goleiro. Nas demais escolhas, priorizar a menor ocupação
  proporcional: quantidade já atribuída dividida pela quantidade desejada nos dois times.
  Empates seguem a ordem da referência: goleiro, zagueiro, lateral, volante, meia, atacante
  no campo; goleiro, fixo, ala, pivô nas demais modalidades.
- Preencher até o dobro das vagas de cada posição por ordem de ID, sem privilegiar notas.
  Se faltarem posições, completar o total da referência com os demais participantes por ID,
  preservando a posição escolhida. Sem opção válida, manter posição indefinida. Não inventar
  uma posição que o jogador não ofereceu. A composição é adaptada aos jogadores disponíveis.
- Somente o excedente ao total de referência (10 ou 22) é extra. A escolha de quem é extra
  fica fixa durante a busca. Extras continuam na partida; não significam banco de reservas.
- Distribuir os grupos de posição começando pelo goleiro. Dentro de cada grupo, ordenar por
  força decrescente e ID; priorizar menos jogadores da posição, depois menor tamanho e menor
  soma de força, respeitando os tamanhos finais. Extras ignoram o critério de posição.
- Fixar as quantidades por posição e de extras de cada time após a distribuição inicial.
  Enumerar combinações dentro desses grupos; a primeira é a formação inicial. Só eliminar
  inversão dos times quando todos os grupos tiverem quantidades iguais nos dois times.
  Comparar médias com tolerância de 0,000000001 e manter a formação anterior nos empates.
- O resultado interno informa `divisoesAvaliadas` e `buscaConcluida`. A contagem prévia de
  possibilidades satura acima do teto; não enumera todas as combinações para contá-las.
- Persistir `participacoes.posicao_formacao_id` e `extra_formacao` separadamente de
  `posicao_id`. A geração/regeneração grava os dois campos com o time na mesma transação;
  desfazer limpa os três. Mudar a posição temporária exige regenerar para alterar a formação.
- Exibir a posição salva com o rótulo "na formação" e identificar extras. Ordenar jogadores
  pela posição da formação (goleiro, lateral, zagueiro, volante, meia, atacante no campo),
  depois os sem posição e por último extras; empates seguem por nome. Formações anteriores
  à atualização do schema mantêm a exibição antiga até a regeneração, sem atribuição retroativa.
- Testes cobrem referência das três modalidades, versatilidade, remanejamento, falta de
  posições, força neutra, determinismo, contagem de divisões, ótimo por oráculo independente,
  reservas acima de 22 participantes, teto e persistência transacional.
- Na medição local realizada durante a implementação em 21/09/2026, sem banco:
  futsal/society com 14 jogadores avaliou 144 divisões em cerca de 7 ms;
  com 30, atingiu 350.000 em 27 ms. Campo com 24 avaliou 17.280 em 2 ms; com 40, atingiu
  350.000 em 25 ms. Valores dependem da máquina e dos participantes, sem garantia de tempo
  fixo e sem incluir consultas/gravações. O teste PostgreSQL optativo usa tabelas temporárias
  para validar o ciclo de geração, leitura, regeneração e desfazer sem modificar dados reais.

---

## Roadmap após a conclusão do projeto

1. **Testes automáticos no GitHub (CI):** assim que o projeto estiver pronto,
   configurar uma rotina no GitHub Actions para executar os testes a cada push e
   pull request. Usar inicialmente `npm ci` e `npm test` no backend, incluindo os
   testes de formação de times e os demais testes existentes nesse momento.
   A rotina deve sinalizar falhas para detectar regressões nas regras cobertas.
   Esta configuração fica reservada para depois da conclusão das funcionalidades
   previstas do projeto, conforme decisão do usuário.
2. **Migration inicial e seed do banco:** somente quando o projeto estiver totalmente
   finalizado, conferir o schema real do Supabase e gerar uma migration inicial capaz de
   recriar a estrutura final em um banco vazio: tabelas, tipos, relacionamentos, índices,
   restrições e demais objetos necessários à aplicação. Preparar um seed separado com
   os dados básicos, como modalidades e posições, preservando os IDs usados pelo código.
   Documentar os pré-requisitos do ambiente Supabase e validar a recriação em um ambiente
   separado antes da entrega. Essa migration representa o estado final, sem reconstruir
   o histórico das alterações. Por decisão do usuário, os arquivos de migrations
   incrementais não serão mantidos durante o desenvolvimento; manter a modelagem
   canônica atualizada a cada alteração no banco.

---

## Prioridades

- **P1 (Essencial):** Cadastro, Login, Home, Patota (visão geral/jogos/membros), Detalhes da partida, Busca com filtro por modalidade, Perfil, Criar patota, Criar/editar partida com sugestões dos dados habituais.
- **P2 (Importante):** Avaliações, Relatórios, mensalidades com baixa manual, Caixa, Geolocalização.
- **P3 (Diferenciais):** Formação automática de equipes.

---

## Regras de negócio principais

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

## O que NÃO faz parte do escopo

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

## Modelo de dados (entidades principais)

Usuários, Patotas, Partidas, Participações, Times, Avaliações, Médias, Mensalidades e Movimentações financeiras.

---

## Arquitetura e convenções técnicas

### Estrutura de pastas do frontend

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

### Regras obrigatórias de organização do frontend

- **Telas (pages):** cada tela fica em `src/pages/<NomeDaTela>/` contendo obrigatoriamente `index.jsx` e `style.css`.
- **Componentes compartilhados:** componentes reutilizáveis (Header, botões, cards, modals) ficam em `src/components/`.
- **Imagens/assets:** todos os arquivos de imagem ficam em `src/assets/`.
- **Services:** toda comunicação com backend e APIs externas fica em `src/services/` (já existe `api.js` com Axios configurado).
- **Estilização:** Tailwind CSS como padrão principal. Os arquivos `style.css` por tela ficam para estilos pontuais/complementares.
- **Navegação:** React Router para roteamento entre telas (SPA).

### Bibliotecas já instaladas no frontend

- React (Vite)
- Axios
- *(A instalar no início do desenvolvimento: Tailwind CSS, React Router, Supabase JS SDK)*

### Estrutura de pastas do backend

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

### Regras obrigatórias de organização do backend

- **Middlewares:** tudo que é middleware (autenticação, autorização, validações genéricas) fica em `backend/middlewares/`.
- **Módulos/cadastros:** cada entidade do sistema tem sua própria pasta em `backend/<entidade>/` com exatamente 3 arquivos:
  - `routes.js` — camada de rotas (define endpoints da API).
  - `controller.js` — camada de controle (recebe a requisição, chama o model, devolve a resposta).
  - `model.js` — camada de negócio (processa dados, aplica regras, interage com banco).
- **Fluxo:** Rota → Controller → Model → Controller → Resposta.

### Bibliotecas já instaladas no backend

- Node.js
- Express
- pg (node-postgres) — driver de acesso ao PostgreSQL
- @supabase/supabase-js — validação do token JWT do Supabase via `getClaims`
- cors, dotenv

### Decisões de arquitetura

- **Autenticação:** Supabase SDK no frontend gerencia login/cadastro/sessão. O backend recebe o token JWT do Supabase no header `Authorization`, valida-o via `getClaims` em middleware e disponibiliza o UUID autenticado em `req.usuarioId` antes de processar requisições protegidas.
- **Rotas protegidas:** `LayoutAutenticado` aguarda a restauração da sessão pelo Supabase antes de renderizar o cabeçalho, a navegação e a tela solicitada. Sem sessão, redireciona para `/login` substituindo a entrada no histórico. O layout acompanha mudanças de autenticação e também redireciona quando a sessão é encerrada. Login, cadastro, recuperação e redefinição de senha permanecem fora desse layout.
- **Banco de dados:** PostgreSQL hospedado no Supabase, acessado pelo backend via `pg` (node-postgres) com queries SQL diretas.
- **Separação de responsabilidades:** Supabase Auth gerencia a autenticação e Supabase
  Storage armazena arquivos de imagem (avatares e emblemas). A referência do emblema,
  as permissões de edição e os demais dados de negócio passam pelo backend Express + pg;
  políticas do Storage também restringem o upload e a remoção dos emblemas.

---

## Diretrizes de desenvolvimento

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
