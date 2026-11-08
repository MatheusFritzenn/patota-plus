import dotenv from 'dotenv'
import pg from 'pg'
import { readFile } from 'node:fs/promises'

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true })

const arrayArgumentos = process.argv.slice(2)
const incluirStorage = arrayArgumentos.includes('--supabase')

async function inicializarBanco() {
  for (const argumento of arrayArgumentos) {
    if (argumento !== '--supabase') {
      throw new Error('Argumento desconhecido. Use db:inicializar ou db:inicializar -- --supabase.')
    }
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('Defina DATABASE_URL para um banco novo antes de inicializar.')
  }

  const arrayArquivos = ['../migrations/001-inicial.sql', '../sql/seed-inicial.sql']
  if (incluirStorage) {
    arrayArquivos.push('../sql/supabase-storage.sql')
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000
  })

  try {
    await client.connect()
    await client.query('BEGIN')
    await client.query("SET LOCAL lock_timeout = '10s'")
    // Serializa inicializacoes concorrentes no mesmo banco.
    await client.query('SELECT pg_advisory_xact_lock(193642, 1)')
    const queryVerificarBanco = `
      SELECT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
      ) AS ocupado
    `
    const resultado = await client.query(queryVerificarBanco)
    if (resultado.rows[0].ocupado) {
      throw new Error('O schema public ja possui tabelas, sequencias ou views. Use um banco novo; nenhum dado foi alterado.')
    }

    for (const arquivo of arrayArquivos) {
      const queryMigration = await readFile(new URL(arquivo, import.meta.url), 'utf8')
      await client.query(queryMigration)
    }
    await client.query('COMMIT')
    console.log('Banco inicializado: 15 tabelas, 3 modalidades e 9 posicoes.')
    if (incluirStorage) {
      console.log('Buckets e politicas de imagens do Supabase configurados.')
    }
  }
  catch (erro) {
    await client.query('ROLLBACK').catch(function () {})
    throw erro
  }
  finally {
    await client.end()
  }
}

inicializarBanco().catch(function (erro) {
  // Nao imprimir a URL de conexao nem a configuracao do ambiente.
  console.error('Falha ao inicializar o banco:', erro.message)
  process.exitCode = 1
})
