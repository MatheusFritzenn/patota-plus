-- IDs fixos usados pelos formularios e pelo algoritmo. Aplicar junto com a migration.
INSERT INTO public.modalidades (id, nome) VALUES
    (1, 'Futebol de campo'),
    (2, 'Futebol society'),
    (3, 'Futebol de salão');
SELECT setval(pg_get_serial_sequence('public.modalidades', 'id'), (SELECT MAX(id) FROM public.modalidades), true);

INSERT INTO public.posicoes (id, nome) VALUES
    (1, 'Goleiro'),
    (2, 'Zagueiro'),
    (3, 'Lateral'),
    (4, 'Volante'),
    (5, 'Meia'),
    (6, 'Atacante'),
    (7, 'Fixo'),
    (8, 'Ala'),
    (9, 'Pivô');
SELECT setval(pg_get_serial_sequence('public.posicoes', 'id'), (SELECT MAX(id) FROM public.posicoes), true);
