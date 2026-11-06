// Genera index.html da index.template.html, inserendo la mappa del Consiglio scientifico.
// La mappa è un SVG statico: proiezione conica conforme sull'Europa, terre emerse
// disegnate a puntini (Natural Earth 1:50m via world-atlas), confini e atenei.
//
// Uso (una volta sola, poi basta il file generato):
//   cd strumenti && npm i --no-save d3-geo@3 topojson-client@3 world-atlas@2
//   node costruisci.mjs
import { geoConicConformal, geoPath, geoContains } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const atlante = (f) => JSON.parse(fs.readFileSync(require.resolve('world-atlas/' + f)));

const W = 1000, H = 640, PASSO = 9;
const terre = atlante('land-50m.json'), paesi = atlante('countries-50m.json');
const land = feature(terre, terre.objects.land);
const riquadro = { type: 'MultiPoint', coordinates: [[-11, 35.2], [42.5, 35.2], [-11, 57.5], [42.5, 57.5], [15, 59]] };
const proj = geoConicConformal().rotate([-15, 0]).parallels([38, 55]).fitExtent([[24, 24], [W - 24, H - 24]], riquadro);
const path = geoPath(proj.clipExtent([[0, 0], [W, H]]));
const r1 = (s) => s.replace(/(\d+\.\d)\d+/g, '$1');

let punti = '';
for (let y = PASSO / 2, k = 0; y < H; y += PASSO, k++)
  for (let x = PASSO / 2 + (k % 2 ? PASSO / 2 : 0); x < W; x += PASSO) {
    const ll = proj.invert([x, y]);
    if (ll && geoContains(land, ll)) punti += `M${x.toFixed(1)} ${y.toFixed(1)}h0`;
  }
const confini = r1(path(mesh(paesi, paesi.objects.countries, (a, b) => a !== b)));

const citta = [
  ['lisbona', 'Lisbona', 'Lisbon', -9.14, 38.72],
  ['bari', 'Bari', 'Bari', 16.87, 41.12],
  ['varsavia', 'Varsavia', 'Warsaw', 21.01, 52.23],
  ['oradea', 'Oradea', 'Oradea', 21.93, 47.07],
  ['siviglia', 'Siviglia', 'Seville', -5.98, 37.39],
  ['stettino', 'Stettino', 'Szczecin', 14.55, 53.43],
  ['koszalin', 'Koszalin', 'Koszalin', 16.17, 54.19],
  ['trebisonda', 'Trebisonda', 'Trabzon', 39.72, 41.0],
  ['istanbul', 'Istanbul', 'Istanbul', 28.98, 41.01],
  ['budapest', 'Budapest', 'Budapest', 19.04, 47.5],
].map(([id, it, en, lon, lat]) => { const [x, y] = proj([lon, lat]); return { id, it, en, x: +x.toFixed(1), y: +y.toFixed(1) }; });

// archi: dal Direttore scientifico (Lisbona) a ogni altra sede, curvati verso nord
const o = citta[0];
const archi = citta.slice(1).map((c) => {
  const mx = (o.x + c.x) / 2, my = (o.y + c.y) / 2, d = Math.hypot(c.x - o.x, c.y - o.y);
  return `<path class="arco" data-citta="${c.id}" d="M${o.x} ${o.y}Q${mx.toFixed(1)} ${(my - d * 0.28).toFixed(1)} ${c.x} ${c.y}"/>`;
}).join('\n            ');

const etichetta = (c) => {
  // a sinistra per le sedi sul bordo destro, sotto per quelle troppo vicine fra loro
  const sx = c.x > 820;
  const tx = sx ? -20 : 20, ty = c.id === 'koszalin' ? -14 : 8, an = sx ? 'end' : 'start';
  return `<text class="c-nome" lang="it" x="${tx}" y="${ty}" text-anchor="${an}">${c.it}</text><text class="c-nome" lang="en" x="${tx}" y="${ty}" text-anchor="${an}">${c.en}</text>`;
};
const nodi = citta.map((c) => `<g class="citta${c.id === 'lisbona' ? ' sede' : ''}" data-citta="${c.id}" transform="translate(${c.x} ${c.y})"><circle class="c-onda" r="9"/><circle class="c-punto" r="7"/>${etichetta(c)}</g>`).join('\n            ');

const titoloIt = 'Mappa delle sedi del Consiglio scientifico: ' + citta.map((c) => c.it).join(', ') + '.';
const titoloEn = 'Map of the Scientific Council locations: ' + citta.map((c) => c.en).join(', ') + '.';
const svg = `          <svg class="mappa" id="mappa" viewBox="0 0 ${W} ${H}" role="img" aria-label="${titoloIt}" data-label-it="${titoloIt}" data-label-en="${titoloEn}">
            <path class="m-punti" d="${punti}"/>
            <path class="m-confini" d="${confini}"/>
            <g class="m-archi">
            ${archi}
            </g>
            <g class="m-citta">
            ${nodi}
            </g>
          </svg>`;

const qui = new URL('.', import.meta.url);
const tpl = fs.readFileSync(new URL('index.template.html', qui), 'utf8');
fs.writeFileSync(new URL('../index.html', qui), tpl.replace('<!--MAPPA-->', svg));

// Versione nei nomi dei file: davanti al sito c'è Cloudflare, che tiene CSS e JS
// nella cache del browser per ore. Con ?v=<impronta del contenuto> ogni modifica
// ha un indirizzo nuovo e nessuno può ritrovarsi l'HTML nuovo con il CSS vecchio.
import { createHash } from 'node:crypto';
const impronta = (f) => createHash('sha1').update(fs.readFileSync(new URL('../' + f, qui))).digest('hex').slice(0, 10);
const file = ['stile.css', 'app.js', 'vendor/gsap.min.js', 'vendor/ScrollTrigger.min.js', 'vendor/lenis.min.js'];
for (const pagina of ['../index.html', '../colophon.html']) {
  let h = fs.readFileSync(new URL(pagina, qui), 'utf8');
  for (const f of file) {
    const esc = f.replace(/[.\/]/g, (c) => '\\' + c);
    h = h.replace(new RegExp('(["\'])' + esc + '(\\?v=[0-9a-f]+)?(["\'])', 'g'), '$1' + f + '?v=' + impronta(f) + '$3');
  }
  fs.writeFileSync(new URL(pagina, qui), h);
}
console.log('versioni:', file.map((f) => f + '=' + impronta(f)).join('  '));
console.log('index.html scritto: puntini', punti.split('M').length - 1, '· kB mappa', (svg.length / 1024).toFixed(0));
