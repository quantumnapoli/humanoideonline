# MASTER PROMPT — HUMANOIDE

Digest e piattaforma di intelligence di **AssoUmanoidi** sui robot umanoidi.
Versione 2 (2026-11-09): riscrive la v1 mantenendone la visione, riducendo il perimetro del primo rilascio
e rendendo ogni obiettivo verificabile. Le regole stabili sono in `CLAUDE.md`, le decisioni in `docs/adr/`.

---

## 1. Missione

Costruisci e fai funzionare **Humanoide**: un magazine bilingue IT/EN, alimentato da un motore di raccolta e
classificazione, gestito dalla redazione di AssoUmanoidi in un'**area riservata**. Deve rispondere a quattro domande:

| | Domanda | Dove vive la risposta |
|---|---|---|
| 1 | Cosa sta succedendo? | news per evento, daily/weekly digest |
| 2 | Chi costruisce cosa? | schede aziende e modelli |
| 3 | Cosa funziona davvero? | deployments, con dati dichiarati/testati/dimostrati distinti |
| 4 | Dove va il settore? | investimenti, ricerca, trend (fase avanzata) |

Obiettivo: il database editoriale e industriale più affidabile sugli umanoidi, non il maggior numero di notizie.

## 2. Perimetro (regola 1 di `CLAUDE.md`)

Ammessi: umanoidi e androidi, produttori, modelli e prototipi, AI/embodied AI direttamente legata agli umanoidi,
manipolazione/locomozione/autonomia, applicazioni industriali/domestiche/assistenziali, investimenti, partnership e
acquisizioni, ricerca, normativa ed etica, eventi, commercializzazione, test e impieghi reali.
Esclusi: robot industriali tradizionali, bracci, cobot, quadrupedi, droni, robot agricoli e aspirapolvere,
automazione generica, AI non collegata agli umanoidi, notizie generiche su aziende tech.

**Humanoid Relevance Engine.** Ogni contenuto riceve: `relevance` 0–100, `confidence` 0–100, categoria, aziende,
modelli, motivazione. Soglie iniziali configurabili: ≥90 altamente pertinente · 75–89 pertinente ·
50–74 revisione umana · <50 scartato. **Le soglie si calibrano sul golden set (M2), non si fissano a intuito.**

## 3. Architettura

Modular monolith (Next.js + Payload) con worker Node separati; code su Postgres. Moduli, non microservizi:

```
sources → ingest → classify → cluster → verify → draft → review → publish
   │         │         │          │         │        │       │        └─ public site /it /en, digest, feed
   └─────────┴─────────┴──────────┴─────────┴────────┴───────┴─ tutto scrive su Postgres (stato verificabile)
```

- **Sources**: tabella fonti (id, nome, URL, tipo RSS/API/sitemap/comunicato/pagina, lingua, paese, azienda, affidabilità,
  frequenza, ultima scansione, stato, n. contenuti, % pertinenti, licenza/condizioni). Import massivo, scoperta feed,
  disattivazione automatica dopo N errori consecutivi. Si rispettano robots.txt e licenze.
- **Ingest**: job idempotenti (chiave = hash URL + contenuto), retry con backoff, rate limit per dominio, timeout,
  dead-letter, log strutturati, tetto di costo giornaliero. Il sito pubblico non dipende dai worker.
- **Intelligence**: passaggi, nell'ordine
  1. *Triage* (modello economico su titolo + incipit): scarta l'80% circa.
  2. *Estrazione* (una sola chiamata, output a schema JSON): relevance, confidence, categoria, entità
     (aziende, modelli, persone, eventi), claim con citazione del passaggio.
  3. *Entity resolution* (regole + alias + embeddings): non crea aziende o modelli nuovi senza revisione.
  4. *Clustering per evento* (pgvector + regole su azienda/modello/tipo evento/finestra temporale): **nessun LLM**.
  5. *Verifica*: ogni claim ha fonte e passaggio; stato `primaria` | `due fonti` | `non verificato`.
  6. *Redazione*: articolo originale da fonti primarie, IT e EN, con dichiarazione di generazione AI.
  7. *QA*: controllo claim vs fonti, completezza, prompt injection, link, tono.
- Gli "agenti" sono questi passaggi: funzioni con input/output tipizzati, prompt versionati, timeout, retry e valutazione.
  Non si scambiano testo libero ma righe di database con stato.
- **Pipeline editoriale**: `DISCOVERED → CLASSIFIED → VERIFIED → DRAFTED → REVIEWED → APPROVED → PUBLISHED`.
- **Modalità**: `MANUAL` (ogni pubblicazione approvata) · `SEMI-AUTOMATIC` (default: il sistema prepara, il direttore approva) ·
  `AUTOMATIC` (solo per classi di contenuto con regole di qualità/rischio definite **e testate**; mai per contenuti sensibili).

## 4. Modello dati (nucleo)

Entità: `companies`, `company_aliases`, `humanoid_models`, `model_versions`, `technologies`, `sources`, `raw_items`,
`news_events`, `articles` (+ `article_translations`, `article_revisions`), `research_papers`, `investments`, `partnerships`,
`deployments`, `people`, `events`, `editorial_reviews`, `ai_runs` (prompt, modello, token, costo, esito).

Principio chiave — **provenienza per singolo dato**: i dati tecnici non sono colonne secche ma righe in `assertions`:

```
assertions(id, subject_type, subject_id, attribute, value, unit,
           nature ∈ {declared, independent_test, demonstrated},
           source_id, source_url, quote, observed_at, valid_from, valid_to,
           reviewed_by, status)
```

Le schede pubbliche si compongono da `assertions`; lo stesso attributo può avere più valori con nature diverse.
Vincoli: FK e `ON DELETE` espliciti, chiavi uniche su alias normalizzati, indici GIN per full-text, HNSW per embeddings,
`updated_at` e audit su tutte le tabelle editoriali. Migrazioni versionate; mai modifiche manuali al DB di produzione.
Il "knowledge graph" è un insieme di join su queste tabelle.

**Seed iniziale**: le 117 aziende di `assoumanoidi-site/app/societa.ts` (campi `nome, sito, paese, area, modelli, stadio,
corpoIntero, tipo, usi, nota, sitoVerificato`). Si importa dal file, non si fa scraping. `sitoVerificato` e la data di
rilevazione (30/10/2026) si conservano come asserzioni con fonte "rilevazione AssoUmanoidi".

## 5. Area riservata (Payload) — ADR 0002

Ruoli: `admin`, `direttore`, `redattore`, `revisore`, `socio`. Autenticazione sicura, audit log, rate limiting.
Sezioni: Dashboard (fonti, acquisiti, pertinenti, eventi unici, duplicati, bozze, pubblicati, in revisione, errori, **costi AI**) ·
Fonti · News Intelligence (grezzi, cluster, punteggi) · Pipeline editoriale · Editor articolo (contenuto, fonti, traduzioni, SEO,
immagini, aziende, modelli, anteprima, programmazione, revisioni) · Aziende · Modelli · AI Control Center
(modelli, prompt versionati, soglie, budget, modalità).

## 6. Sito pubblico

`/it/` e `/en/`, hreflang, canonical, sitemap, structured data, metadata localizzati, mobile-first, identità editoriale
(palette e logo di AssoUmanoidi/Humanoide già presenti nel repository: riusarli). Sezioni: Home, Ultime, Aziende,
Robot umanoidi, Ricerca, Investimenti, Impieghi, Eventi, Digest giornaliero/settimanale.
**Il valore SEO duraturo sono le pagine azienda/modello (dati strutturati unici), non il flusso di notizie.**

## 7. Sicurezza e compliance

Auth, ruoli, audit log, rate limiting API, backup giornalieri con restore testato, monitoraggio, controllo costi,
licenze e attribuzione delle fonti, difesa da prompt injection (il contenuto delle fonti è *dato*, mai istruzione),
controlli anti-invenzione. Da verificare con un legale prima del go-live:
- **AI Act, art. 50** (dal 2 agosto 2026): testi generati con AI pubblicati per informare vanno dichiarati, salvo revisione
  umana con responsabilità editoriale. Incide sulla modalità AUTOMATIC.
- **Registrazione della testata** in tribunale e direttore responsabile (già indicato nel colophon).
- **GDPR** per utenti e soci; **copyright** delle fonti.
- **Google "scaled content abuse"**: niente produzione in massa di riscritture.

## 8. Milestone

Ogni milestone chiude solo con i criteri di accettazione soddisfatti **e testati**.

| # | Milestone | Deliverable | Criteri di accettazione |
|---|---|---|---|
| **M0** | Fondamenta | Repo, CLAUDE.md, ADR, Postgres+pgvector su Railway, CI, web "hello" su Railway con DB | `SELECT extension` mostra `vector`; deploy automatico da `main`; nessun segreto nel repo |
| **M1** | Schema + area riservata | Migrazioni, Payload, ruoli, audit log, seed 117 aziende | login per ruolo con permessi testati; 117 aziende importate = conteggio e stati di `societa.ts` |
| **M2** | Golden set | 500–1.000 contenuti etichettati a mano (pertinente/no, azienda, modello, evento) | set versionato nel repo; script di valutazione che stampa precisione/recall per soglia |
| **M3** | News engine | 100 fonti, ingest, triage+estrazione, clustering, dedup | su golden set: precisione filtro ≥ 90%, recall ≥ 85% (da rivedere con i dati); dedup per evento misurata; zero crash su feed malformati |
| **M4** | Redazione | Verifica claim, bozze IT/EN, QA, pipeline in SEMI-AUTOMATIC | 0 claim pubblicati senza fonte e passaggio (test automatico); bozza → approvazione → pubblicazione end-to-end |
| **M5** | Magazine pubblico | Sito `/it` `/en`, pagine azienda e modello, ricerca, digest giornaliero via newsletter | Lighthouse ≥ 90 mobile; hreflang/sitemap validi; digest inviato da dati reali |
| **M6** | Intelligence | Tracker lanci/investimenti/impieghi, confronto modelli, watchlist e alert, report settimanale | per funzione: criteri propri, definiti prima di iniziare |
| **M7** | Piattaforma | API con chiavi e limiti, assistente di ricerca (solo su fonti del DB), abbonamenti | **solo dopo che M0–M5 sono in produzione e usati** |

Obiettivo del primo rilascio pubblico: **M0–M5**. Le 20 funzioni avanzate della v1 sono nel backlog (§9): non si
iniziano prima della fine di M5.

## 9. Le 20 funzioni avanzate, ordinate

| Priorità | Funzioni |
|---|---|
| Nel nucleo (M1–M5) | 01 Global Humanoid Tracker · 02 Company Profiles · 04 Launch Tracker · 14 AI Daily Briefing |
| M6, primo gruppo | 03 Comparison Engine · 05 Investment Intelligence · 06 Partnership Tracker · 07 Deployment Tracker · 11/12 Watchlist · 13 Alert · 15 Weekly Report |
| M6, secondo gruppo | 08 Research Intelligence · 09 Technology Timeline · 10 Market Map · 16 Knowledge Graph (viste SQL) · 18 Trends Dashboard |
| M7 | 17 Research Assistant · 19 API · 20 Subscription Platform |

Per ciascuna, prima di scriverla: valore per l'utente, dati necessari, dipendenze, costo, criteri di accettazione.
18 deve distinguere **volume mediatico** da **sviluppo industriale effettivo**.

## 10. Obiettivi di capacità (da misurare, non garantiti)

Stime di partenza: nel mondo ci sono poche centinaia di aziende attive sugli umanoidi; il collo di bottiglia è
qualità e costo degli LLM, non il volume di acquisizione.

| Scenario | Fonti | Grezzi/giorno | Pertinenti | Eventi unici | Infrastruttura | Collo di bottiglia atteso |
|---|---|---|---|---|---|---|
| STARTER | 100 | ~1.000 | 20–60 | 5–20 | 1 web, 1 worker, 1 Postgres | revisione umana |
| GROWTH | 1.000 | ~10.000 | 100–300 | 20–60 | + worker, Postgres più grande | costo LLM, qualità del triage |
| GLOBAL | 10.000 | ~100.000 | da misurare | da misurare | read replica, code dedicate | rate limit dei domini, costo |

Benchmark da registrare in dashboard fin da M3: fonti attive, acquisiti/giorno, precisione/recall del filtro,
precisione della dedup, tempo medio di acquisizione e di generazione, **costo per articolo**, % errori editoriali
(correzioni dopo pubblicazione), disponibilità, Core Web Vitals.

## 11. Regole di lavoro per l'agente

1. Prima di scrivere codice: verifica repository, servizi e dati esistenti. Riusa, non duplicare.
2. Una milestone alla volta. Prima il test (o il criterio misurabile), poi l'implementazione.
3. Non dichiarare finita una funzione senza averla eseguita; riporta i risultati reali, anche negativi.
4. Non inventare dati, URL, aziende, modelli, cifre. Se un dato manca, resta vuoto e si segnala.
5. Non pubblicare contenuti fuori perimetro e non duplicare eventi.
6. Decisioni architetturali nuove → nuovo ADR. Complessità non necessaria → no.
7. Segreti solo in variabili d'ambiente; mai nel repository né nei log.
8. Commit piccoli su branch da `main`; PR solo su richiesta.
