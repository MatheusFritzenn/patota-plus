# Instalação inicial do banco

Esta migration cria uma instalação nova do Patota+. Não é um dump de dados nem uma atualização do banco utilizado pelo TCC.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `001-inicial.sql` | 15 tabelas, 4 enums, chaves, restrições, índices e RLS. |
| `../sql/seed-inicial.sql` | 3 modalidades e 9 posições com IDs fixos e sequências ajustadas. |
| `../sql/supabase-storage.sql` | Buckets e políticas de imagens; requer Supabase no mesmo banco. |
| `../scripts/inicializar-banco.js` | Leitura do ambiente, verificação de banco vazio e execução transacional. |

## Executar

Instale as dependências do backend e configure `backend/.env` a partir do exemplo. `DATABASE_URL` deve apontar para o banco novo, com usuário proprietário das tabelas. Variáveis já definidas no processo têm precedência sobre o `.env`.

Na raiz do repositório, para PostgreSQL 14 ou superior:

```sh
npm --prefix backend run db:inicializar
```

Em um projeto Supabase novo, hospedado ou local, inclua a configuração de imagens:

```sh
npm --prefix backend run db:inicializar -- --supabase
```

O segundo comando requer os schemas e papéis fornecidos pelo Supabase. Não instale manualmente versões simplificadas de `auth` ou `storage`: esses schemas são gerenciados pelos serviços correspondentes. O usuário que executa esse complemento precisa ter permissão para criar buckets e políticas em `storage.objects`.

O executor carrega `backend/.env` independentemente do diretório de execução, serializa inicializações concorrentes e aplica todos os arquivos selecionados em uma única transação. Falhas desfazem schema, seed e complemento. Recusa tabelas, sequências ou views preexistentes em `public`; objetos conflitantes adicionais também provocam rollback. Uma segunda execução falha sem modificar dados. Não há comando de reset, rollback destrutivo ou histórico de migrations incrementais nesta instalação inicial.

Os arquivos SQL não contêm `BEGIN`/`COMMIT` próprios: a transação é responsabilidade do executor. Para execução manual, envolva todos os arquivos necessários, na ordem da tabela acima, em uma única transação. Prefira o comando npm, que também verifica o banco vazio.

## Supabase Auth e Storage

O banco não cria contas Auth. Cadastre os usuários pela interface; o frontend obtém uma sessão do Supabase e chama a API para gravar o perfil com o mesmo UUID. No ambiente de desenvolvimento, desative a confirmação de e-mail para que esse fluxo receba a sessão imediatamente. Configure a URL do frontend e o redirecionamento `/redefinir-senha` no Auth.

O frontend e o backend devem apontar para o mesmo Auth. Para as políticas de emblemas funcionarem, o banco de negócio também precisa ser o banco dessa instância Supabase. PostgreSQL independente pode executar a API com autenticação Supabase remota, mas isso não configura o Storage remoto nem permite que suas políticas consultem as patotas locais.

Os buckets são públicos para exibição de imagens. As políticas de escrita são restritas:

- `avatars`: upload autenticado no formato `<usuario_id>-<timestamp>.<extensão>`, já usado pelo frontend; consulta administrativa, substituição e exclusão somente pelo proprietário do objeto.
- `patota-emblemas`: PNG, JPEG e WebP até 2 MB; upload pelo presidente da patota indicada na pasta. Consulta administrativa e exclusão pelo presidente, ou pelo proprietário do arquivo quando a patota já tiver sido excluída.

As tabelas de negócio têm RLS habilitado sem políticas públicas. A API deve usar o proprietário das tabelas ou um papel com `BYPASSRLS`, mantendo a autorização no middleware/controllers. A função `pode_gerenciar_emblema` consulta a permissão como proprietária, com `search_path` vazio e execução concedida somente a `authenticated`; assim, as políticas de imagens não exigem liberar as tabelas pela Data API.

## Correspondência com o schema existente

Tipos, nulabilidade, defaults, relacionamentos, restrições e índices foram conferidos no PostgreSQL do projeto em 08/11/2026. Foram preservados os nomes dos enums usados nos casts do backend e a FK de solicitações sem cascata: a API já remove essas solicitações antes de excluir a patota.

Diferenças intencionais para instalações novas:

- Campos legados `patotas.latitude`, `longitude`, `cep`, `numero`, `complemento` e `localizacao`, restrição de CEP e índice espacial não são criados. O código não os utiliza e a geolocalização saiu do escopo; PostGIS não é necessário.
- RLS passa a proteger as tabelas de negócio contra acesso direto do navegador.
- As políticas de avatar existentes, que verificavam somente o bucket, são substituídas na instalação nova por permissões vinculadas ao usuário. A função de autorização dos emblemas permite manter as tabelas protegidas.

O banco existente foi apenas consultado. Não houve alteração de schema, permissões ou dados nele. A divergência já registrada entre a regra documental de média por partida e o cálculo atual por avaliação não foi alterada por esta migration.
