---
inclusion: manual
---

# Modelagem do Banco de Dados — Patota+

Referência completa das tabelas e campos planejados para cada fase do projeto.

---

## Fase 1 — Nucleo

### Usuario
| Campo | Tipo | Observacao |
|---|---|---|
| id | UUID, PK | Mesmo UUID do Supabase Auth |
| nome | String | |
| email | String, unico | |
| telefone | String, opcional | |
| dataNascimento | DateTime, opcional | |
| foto | String (URL), opcional | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Modalidade (tabela auxiliar)
| Campo | Tipo | Observacao |
|---|---|---|
| id | Int, PK, autoincrement | |
| nome | String, unico | Ex: Futebol, Futsal, Society |

### Posicao (tabela auxiliar)
| Campo | Tipo | Observacao |
|---|---|---|
| id | Int, PK, autoincrement | |
| nome | String, unico | Ex: Goleiro, Zagueiro, Meia, Atacante |

### UsuarioModalidade (N:N)
| Campo | Tipo | Observacao |
|---|---|---|
| usuarioId | UUID, FK → Usuario | |
| modalidadeId | Int, FK → Modalidade | |
| PK composta: (usuarioId, modalidadeId) | | |

### UsuarioPosicao (N:N)
| Campo | Tipo | Observacao |
|---|---|---|
| usuarioId | UUID, FK → Usuario | |
| posicaoId | Int, FK → Posicao | |
| PK composta: (usuarioId, posicaoId) | | |

### Patota
| Campo | Tipo | Observacao |
|---|---|---|
| id | UUID, PK | |
| nome | String | |
| descricao | String, opcional | |
| modalidadeId | Int, FK → Modalidade | |
| cidade | String | |
| estado | String | |
| presidenteId | UUID, FK → Usuario | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### MembroPatota (N:N com metadados)
| Campo | Tipo | Observacao |
|---|---|---|
| id | UUID, PK | |
| usuarioId | UUID, FK → Usuario | |
| patotaId | UUID, FK → Patota | |
| role | Enum (PRESIDENTE, JOGADOR) | |
| dataEntrada | DateTime | |
| ativo | Boolean, default true | |

### Partida
| Campo | Tipo | Observacao |
|---|---|---|
| id | UUID, PK | |
| patotaId | UUID, FK → Patota | |
| data | DateTime | |
| horario | String | |
| local | String | |
| vagasTotal | Int | |
| status | Enum (AGENDADA, EM_ANDAMENTO, FINALIZADA, CANCELADA) | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Participacao
| Campo | Tipo | Observacao |
|---|---|---|
| id | UUID, PK | |
| partidaId | UUID, FK → Partida | |
| usuarioId | UUID, FK → Usuario | |
| timeId | UUID, FK → Time, opcional | Preenchido quando times sao formados |
| status | Enum (CONFIRMADO, CANCELADO) | |

---

## Fase 2 — Avaliacoes

### Time
| Campo | Tipo | Observacao |
|---|---|---|
| id | UUID, PK | |
| partidaId | UUID, FK → Partida | |
| nome | String | Ex: "Time A", "Time B" |

### Avaliacao
| Campo | Tipo | Observacao |
|---|---|---|
| id | UUID, PK | |
| partidaId | UUID, FK → Partida | |
| avaliadorId | UUID, FK → Usuario | |
| avaliadoId | UUID, FK → Usuario | |
| nota | Decimal (0-10) | |
| createdAt | DateTime | |

### MediaUsuario (cache de media geral)
| Campo | Tipo | Observacao |
|---|---|---|
| id | UUID, PK | |
| usuarioId | UUID, FK → Usuario, unico | |
| mediaGeral | Decimal | |
| totalAvaliacoes | Int | |
| updatedAt | DateTime | |

---

## Fase 3 — Financeiro

### Mensalidade
| Campo | Tipo | Observacao |
|---|---|---|
| id | UUID, PK | |
| patotaId | UUID, FK → Patota | |
| usuarioId | UUID, FK → Usuario | |
| mesReferencia | String | Formato "YYYY-MM" |
| valor | Decimal | |
| status | Enum (PENDENTE, PAGO, ATRASADO) | |
| dataPagamento | DateTime, opcional | |

### MovimentacaoCaixa
| Campo | Tipo | Observacao |
|---|---|---|
| id | UUID, PK | |
| patotaId | UUID, FK → Patota | |
| tipo | Enum (ENTRADA, SAIDA) | |
| descricao | String | |
| valor | Decimal | |
| data | DateTime | |
| createdAt | DateTime | |

---

## Fase 4 — Inteligentes e Notificacoes

### Notificacao
| Campo | Tipo | Observacao |
|---|---|---|
| id | UUID, PK | |
| usuarioId | UUID, FK → Usuario | |
| titulo | String | |
| mensagem | String | |
| lida | Boolean, default false | |
| tipo | Enum (CONVITE, PARTIDA, PAGAMENTO, GERAL) | |
| createdAt | DateTime | |

---

## Decisoes de design

- **UUID** para entidades principais (compativel com Supabase Auth)
- **Int autoincrement** para tabelas auxiliares pequenas (Modalidade, Posicao)
- **Tabelas auxiliares** em vez de enums hardcoded para Modalidade e Posicao — permite adicionar novas sem migration
- **MembroPatota** como tabela separada — permite historico de entrada/saida e role por patota
- **MediaUsuario** como cache — evita recalcular a media a cada consulta de perfil
- **Participacao.timeId** opcional — so e preenchido quando o presidente gera os times
