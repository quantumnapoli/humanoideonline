# Strumenti

- `index.template.html` è la sorgente della home: `index.html` si genera con
  `node costruisci.mjs`, che inserisce la mappa del Consiglio scientifico
  (SVG statico, proiezione conica conforme, dati Natural Earth via world-atlas).
  Per rigenerare: `cd strumenti && npm i --no-save d3-geo@3 topojson-client@3 world-atlas@2 && node costruisci.mjs`.
  Per cambiare i testi della home si modifica il template, poi si rigenera.
- Librerie in `vendor/` (servite dal sito, nessun CDN esterno):
  GSAP 3.13.0 + ScrollTrigger (licenza standard gratuita GreenSock, uso commerciale consentito),
  Lenis 1.3.4 (MIT).
