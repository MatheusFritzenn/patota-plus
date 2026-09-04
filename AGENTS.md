# Patota+ — instruções persistentes para agentes

Este repositório é o TCC **Patota+**, uma aplicação web para organizar partidas de
futebol amador. Antes de analisar, planejar ou alterar o projeto, considere como
contexto obrigatório os documentos abaixo:

1. `.kiro/steering/projeto-patota-plus.md` — produto, escopo, regras de negócio,
   stack, arquitetura e organização das pastas.
2. `.kiro/steering/estilo-codigo.md` — convenções obrigatórias ao escrever
   JavaScript.
3. `.kiro/steering/modelagem-banco.md` — modelo PostgreSQL real, decisões e
   pendências por fase.
4. `TCC_PATOTA_Requisitos_Escopo.md` — requisitos e escopo completos quando a
   tarefa exigir detalhes além do resumo de steering.

Os arquivos em `.kiro/steering/` são as fontes canônicas e devem ser relidos
quando a tarefa tocar no assunto correspondente. Não duplique integralmente seu
conteúdo neste arquivo; mantenha-os atualizados quando uma decisão estrutural,
regra de negócio ou convenção do projeto mudar.

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
  `.kiro/steering/modelagem-banco.md`, inclusive as pendências registradas.

## Manutenção deste contexto

Ao fazer uma mudança que torne qualquer documentação acima incorreta, atualize no
mesmo trabalho o documento canônico correspondente e, somente se necessário, este
índice. Em caso de divergência, confira o código e a modelagem/migrations atuais,
informe a inconsistência e não invente uma decisão silenciosamente.
