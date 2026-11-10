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

    // Avanzamento della lettura: filo sottile sul bordo inferiore della barra.
    var avanzamento = crea('span', { class: 'lettore-avanzamento', 'aria-hidden': 'true' });
    barra.appendChild(avanzamento);
    document.body.insertBefore(barra, document.body.firstChild);
    applica(radice.classList.contains('lettore-continuo') ? 'continua' : 'a4');

    var inAttesa = false;
    function aggiornaAvanzamento() {
      inAttesa = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var quota = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      avanzamento.style.transform = 'scaleX(' + quota + ')';
    }
    window.addEventListener('scroll', function () {
      if (inAttesa) return;
      inAttesa = true;
      requestAnimationFrame(aggiornaAvanzamento);
    }, { passive: true });
    window.addEventListener('resize', aggiornaAvanzamento);
    aggiornaAvanzamento();

    // Minuti di lettura: parole del capitolo (senza intestazioni e piè di pagina) a 180 parole al minuto, ritmo di studio.
    var testo = '';
    var corpi = document.querySelectorAll('.page');
    for (var i = 0; i < corpi.length; i++) {
      var copia = corpi[i].cloneNode(true);
      var via = copia.querySelectorAll('.page-header, .page-footer, header, footer');
      for (var j = 0; j < via.length; j++) via[j].remove();
      testo += ' ' + copia.textContent;
    }
    var parole = (testo.match(/[\p{L}\p{N}]+/gu) || []).length;
    if (parole > 0) {
      var minuti = Math.max(1, Math.round(parole / 180));
      var tempo = crea('span', { class: 'lettore-tempo', title: parole + ' parole' }, minuti + ' min');
      barra.insertBefore(tempo, capitoli);
    }

    // Indice dei paragrafi: un titolo per pagina (h1), con salto diretto.
    var titoli = document.querySelectorAll('.page h1');
    if (titoli.length > 1) {
      var apri = crea('button', { type: 'button', class: 'lettore-indice-apri', 'aria-expanded': 'false', 'aria-controls': 'lettore-indice' }, 'Indice');
      var pannello = crea('nav', { id: 'lettore-indice', class: 'lettore-indice', 'aria-label': 'Indice del capitolo', hidden: '' });
      var lista = crea('ol');
      for (var k = 0; k < titoli.length; k++) {
        var h = titoli[k];
        if (!h.id) h.id = 'sezione-' + (k + 1);
        var voce = crea('li');
        voce.appendChild(crea('a', { href: '#' + h.id }, h.textContent.replace(/\s+/g, ' ').trim()));
        lista.appendChild(voce);
      }
      pannello.appendChild(lista);
      function chiudi() {
        pannello.hidden = true;
        apri.setAttribute('aria-expanded', 'false');
      }
      apri.addEventListener('click', function () {
        var aperto = pannello.hidden;
        pannello.hidden = !aperto;
        apri.setAttribute('aria-expanded', String(aperto));
        if (aperto) {
          var primo = pannello.querySelector('a');
          if (primo) primo.focus();
        }
      });
      pannello.addEventListener('click', function (e) {
        if (e.target.closest('a')) chiudi();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !pannello.hidden) {
          chiudi();
          apri.focus();
        }
      });
      document.body.appendChild(pannello);
      document.body.appendChild(apri);
    }

    // Tastiera: frecce o J/K per il capitolo precedente e successivo.
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      var k = e.key.toLowerCase();
      if ((e.key === 'ArrowRight' || k === 'j') && d.succ) location.href = d.succ.file;
      else if ((e.key === 'ArrowLeft' || k === 'k') && d.prec) location.href = d.prec.file;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta);
  else monta();
})();
