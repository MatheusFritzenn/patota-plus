-- Migration inicial para PostgreSQL 14+; executar com npm run db:inicializar.
-- Schema conferido em 08/11/2026, sem dados pessoais ou historico.
-- Campos legados de endereco/geolocalizacao nao integram o escopo atual.
SET LOCAL search_path = public, pg_catalog;

CREATE TYPE public."RolePatota" AS ENUM ('PRESIDENTE', 'JOGADOR');
CREATE TYPE public."StatusMensalidade" AS ENUM ('PENDENTE', 'PAGO');
CREATE TYPE public."StatusPartida" AS ENUM ('AGENDADA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA');
CREATE TYPE public."TipoMovimentacao" AS ENUM ('RECEITA', 'DESPESA');

CREATE TABLE public.avaliacoes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    partida_id uuid NOT NULL,
    avaliador_id uuid NOT NULL,
    avaliado_id uuid NOT NULL,
    nota numeric(4, 2) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.media_usuarios (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL,
    media_geral numeric(4, 2) NOT NULL DEFAULT 0,
    total_avaliacoes integer NOT NULL DEFAULT 0,
    updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.membro_patotas (
    id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    patota_id uuid NOT NULL,
    role public."RolePatota" NOT NULL DEFAULT 'JOGADOR'::"RolePatota",
    data_entrada timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE public.mensalidades (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    patota_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    mes_referencia date NOT NULL,
    valor numeric(10, 2) NOT NULL DEFAULT 0,
    status public."StatusMensalidade" NOT NULL DEFAULT 'PENDENTE'::"StatusMensalidade",
    pago_em timestamp without time zone,
    baixa_por uuid,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.modalidades (
    id serial NOT NULL,
    nome text NOT NULL
);

CREATE TABLE public.movimentacoes_financeiras (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    patota_id uuid NOT NULL,
    tipo public."TipoMovimentacao" NOT NULL,
    valor numeric(10, 2) NOT NULL,
    descricao text NOT NULL,
    data_movimentacao date NOT NULL DEFAULT CURRENT_DATE,
    mensalidade_id uuid,
    registrado_por uuid,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.participacoes (
    id uuid NOT NULL,
    partida_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    time_id uuid,
    posicao_id integer,
    posicao_formacao_id integer,
    nota_temporaria numeric(4, 2)
);

CREATE TABLE public.partidas (
    id uuid NOT NULL,
    patota_id uuid NOT NULL,
    data timestamp without time zone NOT NULL,
    horario text NOT NULL,
    local text NOT NULL,
    vagas_total integer NOT NULL,
    status public."StatusPartida" NOT NULL DEFAULT 'AGENDADA'::"StatusPartida",
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL,
    avaliacoes_encerradas boolean NOT NULL DEFAULT false
);

CREATE TABLE public.patotas (
    id uuid NOT NULL,
    nome text NOT NULL,
    descricao text,
    modalidade_id integer NOT NULL,
    cidade text NOT NULL,
    estado text NOT NULL,
    presidente_id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL,
    rua varchar(255),
    dia_habitual integer,
    hora_habitual time without time zone,
    valor_mensalidade numeric(10, 2) NOT NULL DEFAULT 0,
    emblema_path text
);

CREATE TABLE public.posicoes (
    id serial NOT NULL,
    nome text NOT NULL
);

CREATE TABLE public.solicitacoes_entrada (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL,
    patota_id uuid NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'PENDENTE'::character varying,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.times (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    partida_id uuid NOT NULL,
    nome text NOT NULL
);

CREATE TABLE public.usuario_modalidades (
    usuario_id uuid NOT NULL,
    modalidade_id integer NOT NULL
);

CREATE TABLE public.usuario_posicoes (
    usuario_id uuid NOT NULL,
    posicao_id integer NOT NULL
);

CREATE TABLE public.usuarios (
    id uuid NOT NULL,
    nome text NOT NULL,
    email text NOT NULL,
    telefone text,
    data_nascimento timestamp without time zone,
    foto text,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL
);
ALTER TABLE public.avaliacoes ADD CONSTRAINT avaliacoes_pkey PRIMARY KEY (id);
ALTER TABLE public.avaliacoes ADD CONSTRAINT chk_avaliacoes_nota_intervalo CHECK (((nota >= (0)::numeric) AND (nota <= (10)::numeric)));
ALTER TABLE public.avaliacoes ADD CONSTRAINT chk_avaliacoes_sem_autoavaliacao CHECK ((avaliador_id <> avaliado_id));
ALTER TABLE public.avaliacoes ADD CONSTRAINT uq_avaliacoes_partida_avaliador_avaliado UNIQUE (partida_id, avaliador_id, avaliado_id);
ALTER TABLE public.media_usuarios ADD CONSTRAINT media_usuarios_pkey PRIMARY KEY (id);
ALTER TABLE public.media_usuarios ADD CONSTRAINT media_usuarios_usuario_id_key UNIQUE (usuario_id);
ALTER TABLE public.membro_patotas ADD CONSTRAINT membro_patotas_pkey PRIMARY KEY (id);
ALTER TABLE public.mensalidades ADD CONSTRAINT mensalidades_pkey PRIMARY KEY (id);
ALTER TABLE public.mensalidades ADD CONSTRAINT mensalidades_unica_por_mes UNIQUE (patota_id, usuario_id, mes_referencia);
ALTER TABLE public.modalidades ADD CONSTRAINT modalidades_pkey PRIMARY KEY (id);
ALTER TABLE public.movimentacoes_financeiras ADD CONSTRAINT movimentacoes_financeiras_pkey PRIMARY KEY (id);
ALTER TABLE public.movimentacoes_financeiras ADD CONSTRAINT movimentacoes_valor_positivo CHECK ((valor > (0)::numeric));
ALTER TABLE public.participacoes ADD CONSTRAINT participacoes_nota_temporaria_intervalo CHECK (((nota_temporaria IS NULL) OR ((nota_temporaria >= (0)::numeric) AND (nota_temporaria <= (10)::numeric))));
ALTER TABLE public.participacoes ADD CONSTRAINT participacoes_pkey PRIMARY KEY (id);
ALTER TABLE public.partidas ADD CONSTRAINT partidas_pkey PRIMARY KEY (id);
ALTER TABLE public.patotas ADD CONSTRAINT patotas_pkey PRIMARY KEY (id);
ALTER TABLE public.posicoes ADD CONSTRAINT posicoes_pkey PRIMARY KEY (id);
ALTER TABLE public.solicitacoes_entrada ADD CONSTRAINT solicitacoes_entrada_pkey PRIMARY KEY (id);
ALTER TABLE public.times ADD CONSTRAINT times_pkey PRIMARY KEY (id);
ALTER TABLE public.usuario_modalidades ADD CONSTRAINT usuario_modalidades_pkey PRIMARY KEY (usuario_id, modalidade_id);
ALTER TABLE public.usuario_posicoes ADD CONSTRAINT usuario_posicoes_pkey PRIMARY KEY (usuario_id, posicao_id);
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);
ALTER TABLE public.avaliacoes ADD CONSTRAINT avaliacoes_avaliado_id_fkey FOREIGN KEY (avaliado_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.avaliacoes ADD CONSTRAINT avaliacoes_avaliador_id_fkey FOREIGN KEY (avaliador_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.avaliacoes ADD CONSTRAINT avaliacoes_partida_id_fkey FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE;
ALTER TABLE public.media_usuarios ADD CONSTRAINT media_usuarios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.membro_patotas ADD CONSTRAINT membro_patotas_patota_id_fkey FOREIGN KEY (patota_id) REFERENCES patotas(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.membro_patotas ADD CONSTRAINT membro_patotas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.mensalidades ADD CONSTRAINT mensalidades_baixa_por_fkey FOREIGN KEY (baixa_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.mensalidades ADD CONSTRAINT mensalidades_patota_id_fkey FOREIGN KEY (patota_id) REFERENCES patotas(id) ON DELETE CASCADE;
ALTER TABLE public.mensalidades ADD CONSTRAINT mensalidades_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.movimentacoes_financeiras ADD CONSTRAINT movimentacoes_financeiras_mensalidade_id_fkey FOREIGN KEY (mensalidade_id) REFERENCES mensalidades(id) ON DELETE SET NULL;
ALTER TABLE public.movimentacoes_financeiras ADD CONSTRAINT movimentacoes_financeiras_patota_id_fkey FOREIGN KEY (patota_id) REFERENCES patotas(id) ON DELETE CASCADE;
ALTER TABLE public.movimentacoes_financeiras ADD CONSTRAINT movimentacoes_financeiras_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.participacoes ADD CONSTRAINT participacoes_partida_id_fkey FOREIGN KEY (partida_id) REFERENCES partidas(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.participacoes ADD CONSTRAINT participacoes_posicao_formacao_id_fkey FOREIGN KEY (posicao_formacao_id) REFERENCES posicoes(id) ON DELETE SET NULL;
ALTER TABLE public.participacoes ADD CONSTRAINT participacoes_posicao_id_fkey FOREIGN KEY (posicao_id) REFERENCES posicoes(id) ON DELETE SET NULL;
ALTER TABLE public.participacoes ADD CONSTRAINT participacoes_time_id_fkey FOREIGN KEY (time_id) REFERENCES times(id) ON DELETE SET NULL;
ALTER TABLE public.participacoes ADD CONSTRAINT participacoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.partidas ADD CONSTRAINT partidas_patota_id_fkey FOREIGN KEY (patota_id) REFERENCES patotas(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.patotas ADD CONSTRAINT patotas_modalidade_id_fkey FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.patotas ADD CONSTRAINT patotas_presidente_id_fkey FOREIGN KEY (presidente_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.solicitacoes_entrada ADD CONSTRAINT solicitacoes_entrada_patota_id_fkey FOREIGN KEY (patota_id) REFERENCES patotas(id);
ALTER TABLE public.solicitacoes_entrada ADD CONSTRAINT solicitacoes_entrada_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE public.times ADD CONSTRAINT times_partida_id_fkey FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE;
ALTER TABLE public.usuario_modalidades ADD CONSTRAINT usuario_modalidades_modalidade_id_fkey FOREIGN KEY (modalidade_id) REFERENCES modalidades(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.usuario_modalidades ADD CONSTRAINT usuario_modalidades_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.usuario_posicoes ADD CONSTRAINT usuario_posicoes_posicao_id_fkey FOREIGN KEY (posicao_id) REFERENCES posicoes(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.usuario_posicoes ADD CONSTRAINT usuario_posicoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;
CREATE INDEX idx_avaliacoes_avaliado_id ON public.avaliacoes USING btree (avaliado_id);
CREATE INDEX idx_avaliacoes_partida_id ON public.avaliacoes USING btree (partida_id);
CREATE UNIQUE INDEX membro_patotas_usuario_id_patota_id_key ON public.membro_patotas USING btree (usuario_id, patota_id);
CREATE INDEX idx_mensalidades_patota_mes ON public.mensalidades USING btree (patota_id, mes_referencia);
CREATE INDEX idx_mensalidades_usuario ON public.mensalidades USING btree (usuario_id);
CREATE UNIQUE INDEX modalidades_nome_key ON public.modalidades USING btree (nome);
CREATE INDEX idx_movimentacoes_patota ON public.movimentacoes_financeiras USING btree (patota_id, data_movimentacao);
CREATE INDEX idx_participacoes_time_id ON public.participacoes USING btree (time_id);
CREATE UNIQUE INDEX participacoes_partida_id_usuario_id_key ON public.participacoes USING btree (partida_id, usuario_id);
CREATE UNIQUE INDEX posicoes_nome_key ON public.posicoes USING btree (nome);
CREATE INDEX idx_times_partida_id ON public.times USING btree (partida_id);
CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email);

-- A API usa o proprietario das tabelas. RLS bloqueia acesso direto via Data API.
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membro_patotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_entrada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_posicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
