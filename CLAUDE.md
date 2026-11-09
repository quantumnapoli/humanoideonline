# HUMANOIDE — costituzione del progetto

Questo file vale per ogni sessione. Il piano completo è in `docs/MASTER-PROMPT.md`;
le decisioni tecniche motivate sono in `docs/adr/`. In caso di conflitto vince questo file.

## Cos'è

**Humanoide** è la rivista e il digest di **AssoUmanoidi** (assoumanoidi.it) sui robot umanoidi.
Dietro c'è una piattaforma di intelligence: raccoglie fonti, classifica, raggruppa per evento,
produce bozze bilingui IT/EN e le passa a una **redazione umana** nell'**area riservata di AssoUmanoidi**.
Il pubblico vede il magazine; l'area riservata gestisce tutto il resto.

## Regole non negoziabili

1. **Solo umanoidi.** Fuori perimetro: robot industriali tradizionali, bracci, cobot, quadrupedi, droni,
   robot agricoli e aspirapolvere, automazione generica, AI non collegata agli umanoidi, notizie
   generiche su aziende tech. Eccezione: un'azienda che fa anche altro è ammessa solo per la sua
   attività sugli umanoidi. Mai pubblicare per la sola presenza delle parole "robot", "AI", "automation".
2. **Niente dati inventati.** Ogni dato tecnico è un'*asserzione* con fonte, data e natura:
   `dichiarato dal produttore` | `test indipendente` | `dimostrato`. Dato mancante = campo vuoto, mai stimato.
3. **Provenienza a livello di singolo dato.** Ogni claim pubblicato rimanda a un URL e a un passaggio della fonte.
   "Verificato" = fonte primaria ufficiale oppure almeno due fonti indipendenti. Un LLM confronta testi,
   non verifica: la verifica è un controllo di claim contro fonti citate.
4. **Contenuti originali.** Si scrive da fonti primarie (comunicati, paper, video ufficiali, dati propri).
   Mai parafrasare articoli protetti di altre testate. Rispettare licenze e robots.txt delle fonti.
5. **Responsabilità editoriale umana.** Notizie sensibili, accuse, dati finanziari non confermati e
   affermazioni controverse richiedono sempre revisione umana, in qualunque modalità.
   La pubblicazione è a nome del direttore responsabile. I testi generati con AI sono dichiarati come tali.
6. **Duplicato ≠ simile.** Si raggruppa per *evento*, non per somiglianza di titolo o azienda.
7. **Niente complessità non dimostrata.** Modular monolith + worker. Niente microservizi, niente graph DB,
   niente Redis finché Postgres basta.
8. **Nessuna funzionalità è "fatta" senza test.** Il filtro umanoidi si misura su un golden set etichettato
   (precisione e recall), non a occhio.

## Stack (vedi ADR 0001)

Next.js + TypeScript + Tailwind · Payload CMS (admin e ruoli) · PostgreSQL + pgvector + full-text ·
code su Postgres (pg-boss) · worker Node separati · tutto su **Railway** (regione EU) ·
storage S3-compatibile Railway · LLM selezionabili via configurazione, con budget e log dei costi.

## Ruoli dell'area riservata

`admin` (AssoUmanoidi) · `direttore` (direttore responsabile: approva e pubblica) ·
`redattore` · `revisore` (consiglio scientifico: verifica schede tecniche) · `socio` (sola lettura, watchlist).

## Segreti e infrastruttura

Nessun segreto nel repository. Le credenziali stanno nelle variabili d'ambiente Railway.
Progetto Railway: `humanoide` (production). Servizio `postgres` = immagine `pgvector/pgvector:pg17` con volume.
Il sito statico attuale (`index.html`, `colophon.html`, Netlify) resta online finché la piattaforma non lo sostituisce.

## Convenzioni

Testi e commenti in italiano; identificatori di codice in inglese. URL pubblici `/it/` e `/en/`.
Commit piccoli, un cambiamento per commit. Si parte sempre da `main` (il branch di default di GitHub è sbagliato:
non usarlo come base).
