# ADR 0002 — La piattaforma è l'area riservata di AssoUmanoidi

Stato: accettata · Data: 2026-11-09

## Contesto

Humanoide è il digest/rivista di AssoUmanoidi. Esistono già:
- `assoumanoidi-site` — Next.js 15 su Netlify. La directory (117 aziende) vive in `app/societa.ts`;
  c'è un pannello `/admin/richieste` con password HTTP Basic e dati in Netlify Blobs.
- `humanoideonline` — landing statica del magazine su Netlify (`humanoideonline.com`).

## Decisione

1. La piattaforma si costruisce **in questo repository** (`humanoideonline`), su Railway.
2. Tutta la gestione sta dietro login, in un'**area riservata di AssoUmanoidi** (`/area-riservata`),
   con i ruoli della costituzione. Il pubblico vede solo il magazine `/it` e `/en`.
3. `assoumanoidi.it` **non viene toccato** per ora: espone un link "Area riservata". Più avanti
   il sottodominio `area.assoumanoidi.it` può puntare a Railway (decisione di DNS, non di codice).
4. **Fonte unica per le aziende**: il database. La directory di assoumanoidi.it passerà a leggerle
   da un endpoint di sola lettura della piattaforma, sostituendo `societa.ts`.
   Import iniziale **da `societa.ts`** (non scraping): campi `nome, sito, paese, area, modelli,
   stadio, corpoIntero, tipo, usi, nota, sitoVerificato` → `companies` + `humanoid_models`.
5. Il pannello `/admin/richieste` (adesioni) resta dov'è. Quando l'area riservata ha i ruoli,
   le richieste si leggono da lì e la password Basic va in pensione.

## Alternative scartate

- **Integrare nel repo `assoumanoidi-site`**: Netlify è serverless, non ospita worker né code;
  accoppierebbe il rilascio del sito istituzionale a quello della piattaforma.
- **Tre app separate (magazine, CMS, asso)**: tre deploy, tre login, nessuna fonte unica.

## Da confermare con AssoUmanoidi

- Chi sono gli utenti iniziali per ruolo (admin, direttore, redattori, revisori).
- Se i soci vedono contenuti riservati o solo watchlist/alert.
- Dominio finale dell'area riservata.
