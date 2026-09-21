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
4. **Home** — minhas patotas, buscar e criar
5. **Tela da patota** — abas: Visão Geral, Jogos, Membros, Relatórios (presidente)
6. **Detalhes da partida** — abas: Lista de jogadores, Times, Avaliações
7. **Criar partida** — formulário (somente presidente)
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

1. **Revisão da geração de times por composição e força (definida, ainda não implementada):**
   aplicar as regras da seção "Próxima implementação — formação por composição" abaixo.
   Definir primeiro as posições necessárias, alocar jogadores versáteis conforme a
   necessidade e equilibrar a força preservando essa composição. Substituir o corte de
   22 participantes por um teto de divisões completas avaliadas.
2. **Filtro por modalidade, geolocalização da patota e busca por proximidade:** adicionar
   à busca o filtro obrigatório por modalidade. Ao criar ou editar uma patota,
   registrar a geolocalização de seu local padrão de jogos. Na busca de patotas, usar a
   localização do usuário para calcular a distância e exibir primeiro as patotas mais próximas.
   O filtro por modalidade e a ordenação por proximidade devem funcionar em conjunto.
   Seguir as decisões da seção "Próxima implementação — geolocalização e proximidade"
   abaixo.

> **Implementação atual em 13/09/2026 — geração por força e posição (será revisada):** sempre forma dois times
> com diferença de tamanho de no máximo um jogador. A posição temporária substitui
> as posições do perfil; sem remanejamento, todas as posições do perfil válidas para a
> modalidade contam como opções de atuação, sem atribuir uma escalação individual.
> O algoritmo determinístico prioriza a distribuição de goleiros, depois a cobertura
> das posições (soma dos quadrados das diferenças de quantidade por posição) e depois
> a menor diferença de força média. Uma distribuição inicial por força é refinada por
> até 100 trocas entre os times, aceitando apenas melhorias nessa ordem de critérios.
> Para até 22 participantes, uma busca completa compara todas as divisões de tamanho
> válido, eliminando apenas a repetição por inversão dos times. Assim, encontra a melhor
> distribuição de goleiros, depois de posições e, entre as equivalentes, a menor diferença
> de força média (tolerância decimal de 0,000000001). Acima de 22, mantém a aproximação
> por trocas, sem garantia de ótimo global, para limitar o custo no servidor.
> Jogadores sem avaliação
> recebem a média dos avaliados da partida, ou 5 se ninguém foi avaliado; a força média
> exibida usa a mesma estimativa. Alterações de posição exigem regenerar a formação.
> Na exibição, os jogadores são ordenados por posição: Goleiro, Fixo, Ala e Pivô
> no futsal/society; Goleiro, Lateral, Zagueiro, Volante, Meia e Atacante no campo.
> A posição temporária tem prioridade; com várias posições no perfil, usa-se a mais
> defensiva para ordenar. Sem posição, o jogador aparece no final; empates seguem por nome.

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

- Disponibilizar um filtro por modalidade na tela de busca. Este é o único filtro de busca
  obrigatório para a conclusão do TCC; filtro por posição e campo de texto livre ficam fora
  do escopo atual. Quando selecionado, o filtro deve ser aplicado junto da proximidade.
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

## Próxima implementação — formação por composição

**Status:** regras acordadas para implementação futura. O código atual ainda usa a
busca completa até 22 participantes descrita acima; esta documentação não significa
que a revisão já foi implementada.

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

### Detalhes ainda a resolver na implementação

Não foram definidos nesta conversa: desempate entre posições igualmente necessitadas;
escolha de quais participantes compõem a referência e quais são extras; adaptação
quando faltam jogadores para a composição ou há participantes sem posição; e como
persistir/exibir a posição escolhida automaticamente. Não tratar esses detalhes como
regras já acordadas. Conferir as pendências na modelagem antes de decidir por migration.

---

## Roadmap após a conclusão do projeto

1. **Testes automáticos no GitHub (CI):** assim que o projeto estiver pronto,
   configurar uma rotina no GitHub Actions para executar os testes a cada push e
   pull request. Usar inicialmente `npm ci` e `npm test` no backend, incluindo os
   testes de formação de times e os demais testes existentes nesse momento.
   A rotina deve sinalizar falhas para detectar regressões nas regras cobertas.
   Esta configuração fica reservada para depois da conclusão das funcionalidades
   previstas do projeto, conforme decisão do usuário.

---

## Prioridades

- **P1 (Essencial):** Cadastro, Login, Home, Patota (visão geral/jogos/membros), Detalhes da partida, Busca com filtro por modalidade, Perfil, Criar patota, Criar partida.
- **P2 (Importante):** Avaliações, Relatórios, mensalidades com baixa manual, Caixa, Geolocalização.
- **P3 (Diferenciais):** Formação automática de equipes.

---

## Regras de negócio principais

- E-mail é único no sistema.
- Senha deve ter no mínimo 8 caracteres, com ao menos uma letra maiúscula, uma
  letra minúscula, um número e um caractere especial. Essa política vale para
  cadastro, redefinição e alteração no perfil.
- Somente o presidente pode: editar patota, criar partidas, gerenciar membros, acessar relatórios, gerar times, registrar movimentações no caixa.
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
- Edição de partidas e campo de observações da partida
- Filtro de busca por posição e busca por texto livre
- Histórico detalhado no perfil e médias separadas por patota
- Consulta individual de mensalidade pelo membro
- Foto da patota e indicadores rápidos na Home
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
│   ├── Home/
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
- **Banco de dados:** PostgreSQL hospedado no Supabase, acessado pelo backend via `pg` (node-postgres) com queries SQL diretas.
- **Separação de responsabilidades:** Supabase cuida exclusivamente da autenticação. Toda lógica de negócio e acesso a dados passa pelo backend Express + pg.

---

## Diretrizes de desenvolvimento

- Interface simples, clara e intuitiva (RNF01)
- Layout responsivo — desktop e mobile (RNF02)
- Segurança e controle de acesso via Supabase (RNF03/RNF04)
- Código organizado e manutenível (RNF09)
- Compatível com navegadores modernos (RNF10)
- Estratégia: primeiro o sistema básico funciona ponta a ponta, depois avaliações/financeiro, por último funcionalidades inteligentes.
