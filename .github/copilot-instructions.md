# Instrucoes do projeto Patota+

Os steering completos e a fonte de verdade do projeto estao em `.kiro/steering/`:

- Leia `.kiro/steering/projeto-patota-plus.md` para contexto do produto, arquitetura, stack, fases, prioridades e regras de negocio.
- Leia `.kiro/steering/modelagem-banco.md` quando a tarefa envolver banco, SQL, entidades ou persistencia.
- Leia `.kiro/steering/estilo-codigo.md` quando criar ou alterar JavaScript.

## Regras de aplicacao

- Preserve a arquitetura existente: frontend React/Vite em `frontend/` e API Express em `backend/`.
- No frontend, mantenha telas em `frontend/src/pages/<Tela>/index.jsx` e `style.css`, componentes compartilhados em `frontend/src/components/` e comunicacao com APIs em `frontend/src/services/`.
- No backend, mantenha o fluxo Rota -> Controller -> Model -> Resposta e organize cada entidade em `routes.js`, `controller.js` e `model.js`.
- Use React Router para navegacao, Axios para comunicacao HTTP e SQL direto via `pg` no backend.
- Ao trabalhar com banco, use tabelas e colunas em plural e `snake_case`; aliases SQL podem expor camelCase para o backend.
- Em JavaScript, nao use shorthand property, spread ou ternario na montagem de objetos. Use propriedades explicitas e `if` tradicional.
- Variaveis que armazenam arrays devem iniciar com `array`; variaveis que armazenam strings SQL devem iniciar com `query`.
- Mantenha as alteracoes focadas, responsivas e coerentes com as regras de negocio descritas nos steering.
