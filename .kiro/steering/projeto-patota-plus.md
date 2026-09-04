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
3. **Recuperação de senha** — redefinição via e-mail ou SMS
4. **Home** — minhas patotas, buscar, criar, recomendações
5. **Tela da patota** — abas: Visão Geral, Jogos, Membros, Relatórios (presidente)
6. **Detalhes da partida** — abas: Lista de jogadores, Times, Avaliações
7. **Criar/editar partida** — formulário (somente presidente)
8. **Busca de patotas** — busca com filtros (modalidade, posição, proximidade)
9. **Perfil do usuário** — dados pessoais, alteração de senha, média geral, histórico
10. **Pagamento de mensalidade** — Pix e cartão
11. **Criar/editar patota** — formulário de patota
12. **Notificações** — alertas centralizados

> **Decisão de escopo:** não haverá tela separada de Configurações. A alteração de
> senha fica na edição do perfil e o logout no menu do avatar. Alteração de e-mail e
> preferência de tema foram descartadas.

---

## Fases de desenvolvimento

| Fase | Escopo |
|---|---|
| Fase 1 — Núcleo | Autenticação, cadastro, perfil, patotas, partidas, participantes, vagas, busca, filtros |
| Fase 2 — Avaliações | Presença, relatório de presença, avaliações pós-partida, médias, histórico |
| Fase 3 — Financeiro | Mensalidades, relatório de pagamentos, caixa da patota, pagamento online |
| Fase 4 — Inteligentes | Formação automática de equipes, recomendação de patotas |
| Fase 5 — Finalização | Melhorias de interface, validações, testes, correções, deploy |

---

## Roadmap imediato

1. **JWT nas requisições protegidas:** enviar o access token do Supabase no header
   `Authorization`, validá-lo por middleware no backend e disponibilizar a identidade
   autenticada em `req.usuarioId`. Todas as rotas e controllers protegidos devem ser
   auditados para remover o `usuarioId` enviado no body, query string ou URL quando ele
   estiver sendo usado para identificar o solicitante. IDs de usuário continuam permitidos
   quando representarem o alvo legítimo da operação, como o membro que o presidente deseja
   remover; nesses casos, `req.usuarioId` identifica quem executa a ação e o parâmetro da
   rota identifica sobre quem a ação será executada. A autenticação e a autorização nunca
   devem confiar em um ID de solicitante informado pelo frontend.
2. **Geração de times por força e posição:** evoluir o algoritmo baseado em regras para
   equilibrar simultaneamente a média geral e a distribuição de posições entre os times.
3. **Posição temporária por partida:** permitir que o presidente remaneje a posição dos
   participantes antes de gerar ou regenerar os times. A escolha vale somente para aquela
   partida e não altera as posições cadastradas no perfil do usuário.

---

## Prioridades

- **P1 (Essencial):** Cadastro, Login, Home, Patota (visão geral/jogos/membros), Detalhes da partida, Busca, Perfil, Criar patota, Criar partida.
- **P2 (Importante):** Avaliações, Relatórios, Pagamento de mensalidades, Caixa, Geolocalização.
- **P3 (Diferenciais):** Formação automática de equipes, Recomendações.

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
- Gestão profissional de clubes

---

## Modelo de dados (entidades principais)

Usuários, Patotas, Partidas, Participações, Times, Avaliações, Médias, Mensalidades, Movimentações financeiras, Transações de pagamento, Notificações.

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
- jsonwebtoken — validação do token JWT do Supabase
- cors, dotenv

### Decisões de arquitetura

- **Autenticação:** Supabase SDK no frontend gerencia login/cadastro/sessão. O backend recebe o token JWT do Supabase no header `Authorization` e valida via middleware antes de processar requisições protegidas.
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
