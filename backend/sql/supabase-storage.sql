-- Complemento para Supabase novo, no MESMO banco usado pelo backend.
-- Os schemas auth/storage e o papel authenticated sao fornecidos pelo Supabase.
-- Aplicado com --supabase na mesma transacao da migration e do seed.
-- Nao cria usuarios Auth, arquivos ou dados de demonstracao.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('avatars', 'avatars', true, NULL, NULL),
    ('patota-emblemas', 'patota-emblemas', true, 2097152,
        ARRAY['image/png', 'image/jpeg', 'image/webp']);

-- Permite consultar somente a autorizacao, sem liberar SELECT nas tabelas de negocio.
CREATE FUNCTION public.pode_gerenciar_emblema(caminho text, proprietario text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT auth.uid() IS NOT NULL AND (
        EXISTS (
            SELECT 1 FROM public.patotas p
            WHERE p.id::text = (storage.foldername(caminho))[1]
              AND p.presidente_id = auth.uid()
        )
        OR (
            proprietario = auth.uid()::text
            AND NOT EXISTS (
                SELECT 1 FROM public.patotas p
                WHERE p.id::text = (storage.foldername(caminho))[1]
            )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.pode_gerenciar_emblema(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pode_gerenciar_emblema(text, text) TO authenticated;

CREATE POLICY patota_emblemas_insert_presidente ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'patota-emblemas'
    AND public.pode_gerenciar_emblema(name, NULL)
);

CREATE POLICY patota_emblemas_select_presidente ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'patota-emblemas'
    AND public.pode_gerenciar_emblema(name, owner_id)
);

CREATE POLICY patota_emblemas_delete_presidente ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'patota-emblemas'
    AND public.pode_gerenciar_emblema(name, owner_id)
);

-- O frontend salva avatares com o nome <usuario_id>-<timestamp>.<extensao>.
CREATE POLICY avatars_insert_proprietario ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND starts_with(name, auth.uid()::text || '-')
);

CREATE POLICY avatars_select_proprietario ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'avatars'
    AND owner_id = auth.uid()::text
);

CREATE POLICY avatars_update_proprietario ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text)
WITH CHECK (
    bucket_id = 'avatars'
    AND owner_id = auth.uid()::text
    AND starts_with(name, auth.uid()::text || '-')
);

CREATE POLICY avatars_delete_proprietario ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text);
