# Patota+

Aplicação web para organizar partidas de futebol amador, desenvolvida como Trabalho de Conclusão de Curso (TCC).

O Patota+ centraliza a gestão de grupos de jogadores — as patotas —, reunindo organização de partidas, confirmação de participação, avaliações, controle financeiro e formação automática de times. O sistema contempla futebol de campo, futsal e society, com interface responsiva para computadores e celulares.

## Funcionalidades

- **Conta e perfil:** cadastro, login, recuperação de senha, foto, modalidades e posições de atuação.
- **Patotas:** criação e edição, emblema personalizado, busca por modalidade, solicitações de entrada e gestão de membros.
- **Partidas:** agendamento com sugestões dos dados habituais da patota, edição, controle de vagas e confirmação de participação.
- **Avaliações:** notas entre companheiros do mesmo time após a partida e exibição da média no perfil.
- **Relatórios:** acompanhamento de presença, mensalidades e caixa da patota.
- **Financeiro:** definição da mensalidade, baixa manual de pagamentos e registro de receitas e despesas. Não há processamento de pagamentos online.
- **Times:** formação automática considerando posições e notas dos participantes, com possibilidade de remanejamento pelo presidente.

## Papéis de usuário

| Papel | Responsabilidades |
| --- | --- |
| Jogador | Participar de patotas e partidas, gerenciar seu perfil e avaliar companheiros de time. |
| Presidente | Além das ações de jogador, administrar a patota, membros, partidas, mensalidades, caixa, relatórios e formação de times. |

O papel de presidente está vinculado à patota: um usuário pode administrar um grupo e participar de outro como jogador.

## Tecnologias e arquitetura

| Camada | Tecnologias |
| --- | --- |
| Interface | React, Vite, Tailwind CSS e React Router |
| Comunicação HTTP | Axios |
| API | Node.js e Express |
| Acesso ao banco | SQL direto com `pg` (node-postgres) |
| Banco de dados | PostgreSQL hospedado no Supabase |
| Autenticação | Supabase Auth, com validação de JWT no backend |
| Imagens | Supabase Storage para avatares e emblemas |

O frontend utiliza o Supabase para autenticação e armazenamento de imagens. As regras de negócio e os dados da aplicação passam pela API Express, que acessa o PostgreSQL por meio de consultas SQL. As requisições protegidas enviam o token de acesso no cabeçalho `Authorization`.

No backend, cada entidade segue o fluxo **Rota → Controller → Model → Controller → Resposta**.

## Formação automática de times

O algoritmo inclui todos os participantes confirmados e forma dois times com diferença de tamanho de, no máximo, um jogador. Primeiro, define a composição por posições; depois, compara divisões que preservam essa composição, buscando reduzir a diferença entre as médias de força dos times.

- A posição temporária definida pelo presidente tem prioridade sobre as posições do perfil.
- Jogadores com avaliações usam sua média; quem ainda não possui avaliações precisa receber uma nota temporária de 0 a 10 antes da geração.
- A nota temporária vale apenas para a participação e não altera as avaliações do perfil.
- A busca avalia até **350.000 divisões completas válidas**. Se terminar antes do limite, encontra a menor diferença dentro da composição escolhida; ao atingir o limite, retorna a melhor formação encontrada.

O algoritmo é determinístico e não utiliza machine learning. O teste estatístico de Wilcoxon é uma rotina separada de análise acadêmica e não participa da geração dos times.

## Estrutura do repositório

```text
frontend/
  src/
    assets/         Imagens e recursos estáticos
    components/     Componentes compartilhados
    pages/          Telas, com index.jsx e style.css
    services/       Comunicação com APIs e Supabase
backend/
  middlewares/      Autenticação e validações compartilhadas
  usuarios/         Rotas, controller e model de usuários
  patotas/          Rotas, controller e model de patotas
  partidas/         Partidas, participações, avaliações e times
  mensalidades/     Controle de mensalidades
  movimentacoes/    Movimentações financeiras
  scripts/          Rotinas administrativas e análise acadêmica
  db.js             Conexão com PostgreSQL
  server.js         Configuração da aplicação Express
  local.js          Inicialização do servidor local
```

## Execução local

### Pré-requisitos

- Node.js compatível com as dependências do projeto. O Vite instalado exige Node.js `20.19+` na linha 20 ou `22.12+` nas linhas posteriores.
- npm.
- Projeto Supabase para autenticação e imagens (hospedado ou executado localmente).
- Banco PostgreSQL 14 ou superior, inicialmente vazio. Pode ser o banco do próprio Supabase.

A [migration inicial](backend/migrations/001-inicial.sql) cria as 15 tabelas da aplicação, enums, relacionamentos, restrições e índices. O [seed](backend/sql/seed-inicial.sql) inclui as 3 modalidades e 9 posições com os IDs usados pelo código. Não são criados usuários ou dados de demonstração.

### 1. Instalar as dependências

Na raiz do repositório:

```sh
npm --prefix backend install
npm --prefix frontend install
```

### 2. Configurar o ambiente

Crie `backend/.env` e `frontend/.env` a partir dos respectivos arquivos `.env.example`.

Em `backend/.env`:

```dotenv
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-publica-ou-anon
FRONTEND_URL=http://localhost:5173
```

Em `frontend/.env`:

```dotenv
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-ou-anon
VITE_API_URL=http://localhost:3000
```

Os dois ambientes devem apontar para o mesmo projeto Supabase. Use a chave pública/anon nos campos indicados; credenciais de banco e chaves privilegiadas não devem ser colocadas nas variáveis `VITE_*`, que são expostas ao navegador. Não versione os arquivos `.env`.

Configure também no Supabase as URLs de autenticação para o ambiente local, incluindo o redirecionamento de recuperação de senha para `http://localhost:5173/redefinir-senha`. Para o fluxo atual de cadastro funcionar, desative a confirmação de e-mail no provedor de e-mail do ambiente de desenvolvimento: o frontend precisa receber a sessão imediatamente após o cadastro para salvar o perfil na API.

### 3. Inicializar o banco

**Opção A — aplicação local com um projeto Supabase novo:** configure `DATABASE_URL` com a conexão PostgreSQL desse projeto, usando o proprietário das tabelas (normalmente `postgres`). Execute:

```sh
npm --prefix backend run db:inicializar -- --supabase
```

Além das tabelas e do seed, o comando cria os buckets públicos `avatars` e `patota-emblemas` e suas políticas de escrita. Os schemas `auth` e `storage` já devem existir, fornecidos pelo Supabase. A API, o Auth e o Storage devem usar o mesmo projeto para que as permissões dos emblemas consultem as patotas corretas.

**Opção B — PostgreSQL instalado localmente:** crie um banco vazio, por exemplo com `createdb -U postgres patota_plus`, e configure `DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/patota_plus`. Execute:

```sh
npm --prefix backend run db:inicializar
```

Esse comando instala apenas as tabelas de negócio e o seed. O PostgreSQL sozinho não fornece os serviços de autenticação ou de imagens: o login ainda precisa do Supabase. Para executar também Auth e Storage localmente, utilize uma instância local do Supabase e a opção `--supabase` no banco dela. Apontar o backend para PostgreSQL local e o Storage para um projeto remoto separado não permite usar as políticas de emblemas fornecidas, pois elas consultam as patotas no próprio banco do Storage.

A inicialização é feita **uma única vez**, em uma transação: qualquer erro desfaz todas as alterações. O comando recusa um schema `public` com tabelas, sequências ou views; uma segunda execução não apaga nem reinicializa dados. Não é um comando de atualização do banco existente.

As tabelas de negócio usam RLS sem políticas de acesso direto para o navegador. O backend deve conectar como proprietário das tabelas ou com um papel administrativo que possa ignorar RLS; as permissões dos usuários continuam validadas pela API. As políticas de imagens são detalhadas no [guia do banco](backend/migrations/README.md).

### 4. Iniciar a aplicação

Em um terminal, execute o backend:

```sh
npm --prefix backend run dev
```

Em outro terminal, execute o frontend:

```sh
npm --prefix frontend run dev
```

Acesse **http://localhost:5173**. A API local escuta em **http://localhost:3000**; sua rota `/` retorna uma mensagem de funcionamento. O CORS permite o frontend na porta 5173 e a origem definida em `FRONTEND_URL`.

## Comandos úteis

Execute a partir da raiz do repositório:

| Comando | Finalidade |
| --- | --- |
| `npm --prefix backend run db:inicializar -- --supabase` | Inicializar tabelas, seed e imagens em um projeto Supabase novo. |
| `npm --prefix backend run db:inicializar` | Inicializar tabelas e seed em PostgreSQL vazio. |
| `npm --prefix frontend run build` | Gerar a versão de produção do frontend em `frontend/dist`. |
| `npm --prefix frontend run preview` | Servir localmente o build do frontend para inspeção. |
| `npm --prefix frontend run lint` | Executar a análise estática do frontend. |
| `npm --prefix backend start` | Iniciar a API local sem o monitoramento do nodemon. |

## Análise acadêmica dos times

O projeto inclui uma rotina local para comparar escalações históricas manuais com alternativas calculadas pelo algoritmo. Ela consulta o banco em transação somente leitura e gera um relatório HTML com a comparação e o teste de Wilcoxon pareado bilateral.

A análise utiliza Python 3.12 e SciPy, sem adicionar dependência de Python à aplicação web. Os dados do estudo incluem avaliações simuladas e notas atuais; os resultados são exploratórios e não demonstram melhoria de placares reais.

O preparo do ambiente, o protocolo, os comandos e as limitações estão no [README da análise de times](backend/scripts/analise-times/README.md).
