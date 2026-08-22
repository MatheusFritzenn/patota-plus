# Estilo de código — Preferências do desenvolvedor

## Regras obrigatórias ao gerar código JavaScript

- **Não usar shorthand property.** Sempre escrever `{ chave: valor }` explicitamente, mesmo que a variável tenha o mesmo nome da chave.
- **Não usar spread (`...`).** Montar objetos e arrays de forma explícita, passo a passo.
- **Não usar if inline / ternário condicional em montagem de objetos.** Usar `if` tradicional para condicionais.

## Convenções de nomenclatura de variáveis

- **Arrays:** todo nome de variável que armazena um array deve começar com o prefixo `array`. Exemplo: `arrayModalidades`, `arrayValores`, `arrayCampos`.
- **Queries SQL:** todo nome de variável que armazena uma string de comando SQL deve começar com o prefixo `query`. Exemplo: `queryInsertUsuario`, `querySelectModalidades`, `queryUpdate`.

### Exemplo do que evitar

```js
// ❌ Nome genérico para array
const modalidades = []
const campos = []
const valores = []

// ❌ Nome genérico para query SQL
const insertUsuarioQuery = `INSERT INTO ...`
const selectModalidadesQuery = `SELECT ...`
```

### Exemplo do que usar

```js
// ✅ Prefixo array
const arrayModalidades = []
const arrayCampos = []
const arrayValores = []

// ✅ Prefixo query
const queryInsertUsuario = `INSERT INTO ...`
const querySelectModalidades = `SELECT ...`
```

## Exemplo do que evitar

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

## Exemplo do que usar

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
