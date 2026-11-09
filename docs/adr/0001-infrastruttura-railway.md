# ADR 0001 — Infrastruttura: solo Railway, niente Supabase

Stato: accettata · Data: 2026-11-09

## Decisione

Web, worker e database stanno su **Railway** (progetto `humanoide`, regione EU Amsterdam `europe-west4`).
Il database è PostgreSQL 17 con pgvector (`pgvector/pgvector:pg17`) con volume persistente.
Non si usa Supabase.

## Perché

- **Le code vivono in Postgres** (pg-boss). Servono connessioni dirette e `LISTEN/NOTIFY`, che il pooler
  transazionale di Supabase non offre. Su Railway worker e web parlano al DB sulla rete privata.
- **Auth e ruoli li porta Payload CMS**: il vantaggio principale di Supabase (Auth) qui non serve.
- **Storage**: i bucket S3-compatibili di Railway coprono immagini e allegati.
- **Un solo fornitore** per compute, DB e storage: un posto dove guardare log, metriche e costi.
- I quattro progetti Supabase già presenti appartengono ad altri prodotti: non si mescolano dati.

## Conseguenze

- I **backup sono a nostro carico**: Postgres su immagine Docker non ha PITR gestito.
  Prima del go-live: dump giornaliero (`pg_dump`) su bucket, test di restore documentato.
- L'immagine è pinnata a `pg17`: gli aggiornamenti major sono manuali.
- Se un domani serve un Postgres gestito, si migra con dump/restore: lo schema non dipende da Railway.

## Fatti dell'ambiente

- Railway project `9bfae926-eb47-43be-9797-73cc5736a5c4`, environment `production`.
- Servizio `postgres`: variabili `POSTGRES_USER/PASSWORD/DB`, `PGDATA` in sottocartella del volume.
- Connessione interna per gli altri servizi: `postgres.railway.internal:5432`, riferita con
  `${{postgres.POSTGRES_PASSWORD}}`. Nessuna porta pubblica per il DB.
