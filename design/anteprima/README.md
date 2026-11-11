# Anteprima UI Uni

Aprire `index.html` nel browser. Non richiede build o server.

Prova locale della direzione descritta in [valutazione-ui-2026-11-11.md](../valutazione-ui-2026-11-11.md). Le viste Oggi, Materie, Diritto pubblico e Sociologia sono navigabili. Ricerca, tema, dialoghi e gruppi dell’emiciclo rispondono alle interazioni. I collegamenti al portale reale richiedono l’accesso Cloudflare consueto; nessun token è incluso nell’anteprima.

Le simulazioni sono dimostrative e non scrivono dati. L’emiciclo è una cattura statica della struttura SVG del sito, non legge il database. Le schede mostrano una selezione di documenti esistenti. Questa cartella conserva la proposta approvata prima dell’integrazione. La direzione è ora riportata nei componenti Astro; l’anteprima rimane autonoma.

`verifica.json` contiene i controlli automatici del browser; le immagini PNG mostrano le viste controllate.

## Asset

- `montecitorio.jpg`: Rémi Jouan, [Palais Montecitorio](https://commons.wikimedia.org/wiki/File:Palais_Montecitorio.jpg), Wikimedia Commons. [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Originale conservato; ritaglio di presentazione tramite CSS. Il ritaglio resta sotto la stessa licenza.
- `societa.jpg`: Detroit Publishing Co., [Mulberry St., New York, N.Y.](https://www.loc.gov/pictures/item/2016800172/), circa 1900, Library of Congress. Nessuna restrizione nota alla pubblicazione; originale conservato con ritaglio di presentazione tramite CSS.
- Titillium Web: file già presenti fra le dipendenze del progetto. Licenza inclusa in `assets/FONT-LICENSE.txt`.
- `assets/emiciclo.html`: frammento SVG/HTML del componente del portale, conservato come sorgente dell’istantanea integrata nella pagina.
