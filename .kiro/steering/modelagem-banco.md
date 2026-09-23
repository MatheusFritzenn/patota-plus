---
inclusion: manual
---

# Modelagem do Banco de Dados — Patota+

Referência das tabelas e campos do projeto, por fase.

Convenções reais do banco (PostgreSQL no Supabase):
- Nomes de tabela no **plural** e em **snake_case** (ex.: `usuarios`, `membro_patotas`).
- Nomes de coluna em **snake_case** (ex.: `presidente_id`, `created_at`).
- O backend expõe esses campos em camelCase via alias no SQL (ex.: `presidente_id AS "presidenteId"`).

> Nota histórica: no início do projeto a intenção era usar Prisma, por isso versões
> anteriores deste documento listavam as entidades com nomes conceituais em
> PascalCase/singular (ex.: `Usuario`, `MembroPatota`). O Prisma foi abandonado em favor
> de SQL direto via `pg` (node-postgres); este documento reflete os nomes reais das tabelas.

> **Decisão sobre migrations:** durante o desenvolvimento, não manter arquivos de
> migrations incrementais. Ao finalizar completamente o projeto, gerar uma migration
> inicial a partir do schema real e um seed separado com os dados básicos, validando a
> recriação em um ambiente vazio. A migration representará o estado final, sem recuperar
> o histórico de alterações. A tarefa está no roadmap de `projeto-patota-plus.md`.

---

## Fase 1 — Nucleo

### usuarios
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

### modalidades (tabela auxiliar)
| Coluna | Tipo | Observacao |
|---|---|---|
| id | int, PK, autoincrement | |
| nome | text, unico | Ex: Futebol, Futsal, Society |

### posicoes (tabela auxiliar)
| Coluna | Tipo | Observacao |
|---|---|---|
| id | int, PK, autoincrement | |
| nome | text, unico | Ex: Goleiro, Zagueiro, Meia, Atacante |

### usuario_modalidades (N:N)
| Coluna | Tipo | Observacao |
|---|---|---|
| usuario_id | uuid, FK → usuarios | |
| modalidade_id | int, FK → modalidades | |
| PK composta: (usuario_id, modalidade_id) | | |

### usuario_posicoes (N:N)
| Coluna | Tipo | Observacao |
|---|---|---|
| usuario_id | uuid, FK → usuarios | |
| posicao_id | int, FK → posicoes | |
| PK composta: (usuario_id, posicao_id) | | |

### patotas
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

> **PENDÊNCIA (roadmap — geolocalização):** definir e adicionar os dados geográficos do
> local padrão de jogos da patota. Eles devem permitir calcular a distância até a localização
> do usuário e ordenar os resultados da busca da menor para a maior distância.

> **DECISÃO PARA A ALTERAÇÃO FUTURA DO SCHEMA — geolocalização:** adicionar `cep` (oito dígitos,
> obrigatório), `numero` (aceitando `S/N`), `complemento` (opcional) e uma coluna geográfica
> para o local padrão. A coluna geográfica deverá usar PostGIS, com tipo
> `geography(POINT, 4326)` e índice GiST; o PostGIS deverá ser instalado em schema dedicado.
> Manter rua, cidade e estado para exibição. O backend obterá o ponto por geocodificação do
> endereço somente na criação ou alteração da patota e fará as consultas de distância por SQL
> direto via `pg`. A localização momentânea do usuário será recebida apenas como parâmetro da
> busca e não será persistida. Conferir os nomes definitivos e o schema escolhido ao aplicar
> a alteração; nenhuma dessas colunas existe no banco enquanto esta pendência estiver aberta.

> **FILTRO DE BUSCA IMPLEMENTADO:** o filtro por modalidade usa `patotas.modalidade_id`,
> sem alteração no schema, e aceita a opção de listar todas as modalidades. Quando a
> proximidade for implementada, deverá poder ser combinada com esse filtro. Filtro por
> posição e busca textual ficam fora do escopo atual.

### membro_patotas (N:N com metadados)
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| usuario_id | uuid, FK → usuarios | |
| patota_id | uuid, FK → patotas (ON DELETE CASCADE) | |
| role | enum RolePatota (PRESIDENTE, JOGADOR) | default JOGADOR |
| data_entrada | timestamp | |
| ativo | boolean, default true | |

### partidas
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
> `projeto-patota-plus.md`.

### participacoes
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| partida_id | uuid, FK → partidas (ON DELETE CASCADE) | Conferido no schema real em 23/09/2026 |
| usuario_id | uuid, FK → usuarios | |
| time_id | uuid, FK → times, opcional (ON DELETE SET NULL) | Preenchido quando os times são formados (Fase 2) |
| posicao_id | int, FK → posicoes, opcional (ON DELETE SET NULL) | Posição temporária atribuída pelo presidente exclusivamente para esta partida |
| posicao_formacao_id | int, FK → posicoes, opcional (ON DELETE SET NULL) | Posição de atuação escolhida na última formação; adicionada em 21/09/2026 |
| extra_formacao | boolean, opcional | true = extra; false = composição; NULL = sem formação nova; adicionada em 21/09/2026 |

> **Implementado em 12/09/2026 — posição por partida:** `participacoes.posicao_id` armazena
> apenas o remanejamento daquela partida e a alteração nunca modifica `usuario_posicoes`.
> Desde 13/09/2026, o algoritmo de geração usa esse campo com prioridade sobre as
> posições do perfil. Sem remanejamento, considera as posições de `usuario_posicoes`
> válidas para a modalidade. A revisão de 21/09/2026 também grava a posição da formação
> e a identificação de extras, preservando `posicao_id` e o perfil.

> **Revisão implementada no código em 21/09/2026:** os dois campos acima foram
> adicionados ao banco. O arquivo SQL incremental foi removido por decisão do usuário.
> A posição escolhida automaticamente ocupa `posicao_formacao_id`; `extra_formacao`
> indica se o participante excede o total da referência, sem excluí-lo do time ou da
> força média. A geração grava os campos e `time_id` na mesma transação; desfazer limpa
> todos, sem alterar `posicao_id` nem `usuario_posicoes`. Ambos começam em NULL para
> preservar formações antigas; a regeneração preenche o novo estado. A interface lê a
> posição salva, mesmo que o perfil ou o remanejamento mude depois. Regras completas na
> seção "Formação por composição" de `projeto-patota-plus.md`.
>
> **Conferido no banco em 21/09/2026:** após a reativação do projeto Supabase, o schema
> e os IDs das posições foram conferidos e as colunas foram adicionadas. A leitura das duas
> novas colunas foi validada, assim como o ciclo de formação em tabelas temporárias no
> PostgreSQL, preservando os dados reais das partidas.

> A presença é representada pela existência da linha (confirmar = inserir, cancelar = deletar).
> A coluna `status` (CONFIRMADO/CANCELADO) prevista originalmente **não foi criada** — o
> comportamento de confirmar/recusar presença já funciona com base na existência do registro.

### solicitacoes_entrada
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| usuario_id | uuid, FK → usuarios | |
| patota_id | uuid, FK → patotas (sem ON DELETE CASCADE) | Removida pelo backend antes da patota |
| status | varchar, default 'PENDENTE' | PENDENTE, ACEITO, RECUSADO |
| created_at | timestamp | |
| updated_at | timestamp | |

---

## Fase 2 — Avaliacoes

### times
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| partida_id | uuid, FK → partidas (ON DELETE CASCADE) | |
| nome | text | Ex: "Time A", "Time B" |

### avaliacoes
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

### media_usuarios (cache de media geral)
| Coluna | Tipo | Observacao |
|---|---|---|
| id | uuid, PK | |
| usuario_id | uuid, FK → usuarios (ON DELETE CASCADE), unico | |
| media_geral | numeric(4,2), default 0 | |
| total_avaliacoes | int, default 0 | |
| updated_at | timestamp | |

---

## Fase 3 — Financeiro

### mensalidades
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

### Alteração em patotas (Fase 3)
| Coluna | Tipo | Observação |
|---|---|---|
| valor_mensalidade | numeric(10,2), default 0 | Valor vigente definido pelo presidente; cada baixa preserva o valor na mensalidade do mês. |

### movimentacoes_financeiras
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

## Fase 4 — Inteligentes

Notificações foram retiradas do escopo do TCC. A antiga proposta da tabela
`notificacoes` não deve orientar migrations; poderá ser remodelada se o recurso for
retomado após a conclusão do projeto.

> A modelagem financeira acima foi conferida diretamente no schema PostgreSQL em 04/09/2026.

---

## Decisoes de design

- **UUID** para entidades principais (compativel com Supabase Auth);
- **Int autoincrement** para tabelas auxiliares pequenas (`modalidades`, `posicoes`);
- **Tabelas auxiliares** em vez de enums hardcoded para modalidade e posição — permite adicionar novas sem migration;
- **membro_patotas** como tabela separada — permite historico de entrada/saida e role por patota;
- **media_usuarios** como cache — evita recalcular a media a cada consulta de perfil;
- **participacoes.time_id** opcional — só é preenchido quando o presidente gera os times;
- **participacoes.posicao_id** opcional — registra a posição atribuída somente no contexto da partida;
- **participacoes** sem coluna `status` — presença é a existência do registro;
- Acesso ao banco via **SQL direto com `pg`** (Prisma foi descartado).
