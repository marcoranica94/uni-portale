// Lettore degli appunti: barra con materia, capitoli precedente/successivo e scelta della vista.
// I dati arrivano da window.__LETTORE__, inserito dallo script di build nelle copie pubblicate.
(function () {
  var d = window.__LETTORE__;
  if (!d) return;
  var radice = document.documentElement;
  var CHIAVE = 'lettore-vista';

  function vistaIniziale() {
    try {
      var salvata = localStorage.getItem(CHIAVE);
      if (salvata === 'continua' || salvata === 'a4') return salvata;
    } catch (e) {}
    return window.matchMedia('(max-width: 900px)').matches ? 'continua' : 'a4';
  }
  function applica(vista) {
    radice.classList.toggle('lettore-continuo', vista === 'continua');
    var bottoni = document.querySelectorAll('.lettore-vista button');
    for (var i = 0; i < bottoni.length; i++) bottoni[i].setAttribute('aria-pressed', String(bottoni[i].dataset.vista === vista));
  }
  applica(vistaIniziale());

  function crea(tag, attr, testo) {
    var el = document.createElement(tag);
    for (var k in attr) if (attr[k] !== null && attr[k] !== undefined) el.setAttribute(k, attr[k]);
    if (testo) el.textContent = testo;
    return el;
  }

  function monta() {
    var barra = crea('nav', { class: 'lettore-barra', 'aria-label': 'Navigazione degli appunti' });
    barra.appendChild(crea('a', { class: 'lettore-indietro', href: d.scheda }, '‹ ' + d.materia));
    barra.appendChild(crea('span', { class: 'lettore-titolo' }, d.titolo));

    var capitoli = crea('span', { class: 'lettore-capitoli' });
    capitoli.appendChild(crea('a', d.prec ? { href: d.prec.file, title: d.prec.titolo } : { 'aria-disabled': 'true' }, '‹ Prec.'));
    capitoli.appendChild(crea('a', d.succ ? { href: d.succ.file, title: d.succ.titolo } : { 'aria-disabled': 'true' }, 'Succ. ›'));
    barra.appendChild(capitoli);

    var vista = crea('span', { class: 'lettore-vista', role: 'group', 'aria-label': 'Vista' });
    [['continua', 'Continua'], ['a4', 'A4']].forEach(function (v) {
      var b = crea('button', { type: 'button', 'data-vista': v[0], 'aria-pressed': 'false' }, v[1]);
      b.addEventListener('click', function () {
        applica(v[0]);
        try {
          localStorage.setItem(CHIAVE, v[0]);
        } catch (e) {}
      });
      vista.appendChild(b);
    });
    barra.appendChild(vista);
    document.body.insertBefore(barra, document.body.firstChild);
    applica(radice.classList.contains('lettore-continuo') ? 'continua' : 'a4');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta);
  else monta();
})();
