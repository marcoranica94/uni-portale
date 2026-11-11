const courses = {
  diritto: { title: 'Diritto pubblico', full: 'Istituzioni di diritto pubblico', image: 'montecitorio.jpg', alt: 'La facciata di Palazzo Montecitorio a Roma', exam: 'Orale', docs: 23, nuclei: 71, slug: 'diritto-pubblico', chapters: [['I tre elementi dello Stato: territorio e popolo', '02-lo-stato.html'], ['L’Unione europea: che cosa è e che forza hanno le sue norme', '08-unione-europea.html'], ['Il Presidente della Repubblica: ruolo ed elezione', '13-presidente-repubblica.html']] },
  sociologia: { title: 'Sociologia', full: 'Fondamenti di sociologia generale', image: 'societa.jpg', alt: 'Mercato e vita di strada a Mulberry Street, New York, circa 1900', exam: 'Scritto', docs: 14, nuclei: 42, slug: 'sociologia', chapters: [['Mappa dell’opera e chiavi di lettura', '00-mappa-dellopera.html'], ['Dalla logica della ricchezza alla logica del rischio', '01-dalla-ricchezza-al-rischio.html'], ['Razionalità in conflitto e irresponsabilità', '02-razionalita-e-irresponsabilita.html'], ['La distribuzione dei rischi', '03-distribuzione-dei-rischi.html'], ['Sapere, esperti, valori massimi', '04-sapere-esperti-valori-massimi.html']] }
};

function courseMarkup([key, c]) {
  return `<a class="corso" href="#${key}"><div class="foto foto--${key}"><img src="assets/${c.image}" width="600" height="400" alt="${c.alt}" loading="lazy"></div><div><p>Esame ${c.exam.toLowerCase()}, 9 CFU</p><h3>${c.title}</h3><p>${c.docs} documenti di appunti</p><span class="apri">Apri la materia</span></div></a>`;
}
document.querySelectorAll('[data-courses]').forEach(el => el.innerHTML = Object.entries(courses).map(courseMarkup).join(''));

function renderSubject(key) {
  const c = courses[key];
  document.querySelector('#materia').innerHTML = `<div class="materia-intro"><div><a class="indietro" href="#materie">Tutte le materie</a><h1>${c.full}</h1><p class="contesto">1º anno, primo semestre. Esame ${c.exam.toLowerCase()}, 9 CFU.</p><a class="secondario" href="https://uni.marcoranica.com/materie/${c.slug}">Apri la scheda sul portale</a></div><img src="assets/${c.image}" width="580" height="420" alt="${c.alt}"></div><div class="scheda"><section><div class="titolo-sezione" style="margin-top:0"><h2>Appunti</h2><span>${c.docs} documenti</span></div><div class="capitoli">${c.chapters.map(([title,file]) => `<a href="https://uni.marcoranica.com/${file ? `appunti/${c.slug}/${file}` : `materie/${c.slug}`}" class="capitolo"><span>${title}</span><span>Apri</span></a>`).join('')}</div><a class="secondario" style="margin-top:22px" href="https://uni.marcoranica.com/materie/${c.slug}">Tutti i documenti sul portale</a></section><aside><h2>Allenati per l’esame</h2><p>${c.nuclei} argomenti nel kit d’esame. Scegli una prova breve per iniziare.</p><button class="primario" data-demo="Simulazione di ${c.title}">Simula l’esame</button><details><summary>Imposta l’allenamento</summary><p>Data dell’appello, calendario e istruzioni del docente si gestiscono nella scheda completa.</p><a href="https://uni.marcoranica.com/materie/${c.slug}">Apri le impostazioni sul portale</a></details></aside></div>`;
}

function route() {
  const hash = location.hash.slice(1) || 'oggi';
  const subject = Object.hasOwn(courses, hash);
  const view = subject ? 'materia' : hash === 'materie' ? 'materie' : 'oggi';
  if (subject) renderSubject(hash);
  document.querySelectorAll('[data-view]').forEach(el => {
    el.hidden = el.id !== view;
    el.classList.toggle('vista-entra', !el.hidden);
  });
  document.querySelectorAll('[data-nav]').forEach(a => {
    if (a.dataset.nav === (subject ? 'materie' : view)) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${subject ? courses[hash].title : view === 'materie' ? 'Materie' : 'Oggi'} — Uni, anteprima`;
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', () => { route(); document.querySelector('#contenuto').focus({preventScroll:true}); });
route();

const themeButton = document.querySelector('#tema');
function syncTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', `Attiva tema ${dark ? 'chiaro' : 'scuro'}`);
}
if (!document.documentElement.dataset.theme) document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
syncTheme();
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('uni-prototipo-tema', theme); } catch {}
  syncTheme();
});

const search = document.querySelector('#ricerca');
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dialog.close(); }
}));
function results() {
  const q = document.querySelector('#q').value.trim().toLocaleLowerCase('it');
  const matches = Object.entries(courses).flatMap(([key,c]) => [[c.title,key],...c.chapters.map(([title])=>[title,key])]).filter(([title])=>!q||title.toLocaleLowerCase('it').includes(q));
  const el = document.querySelector('#risultati');
  el.replaceChildren();
  if (!matches.length) { const p = document.createElement('p'); p.textContent='Nessun risultato nell’anteprima. Prova “diritto” o “rischi”.'; el.append(p); }
  for (const [title,key] of matches) { const a=document.createElement('a');a.href='#'+key;a.textContent=title;a.addEventListener('click',()=>search.close());el.append(a); }
}
document.querySelector('#q').addEventListener('input',results);
document.addEventListener('click',event=>{
  const target=event.target.closest('button');
  if(target?.matches('[data-search]')){results();search.showModal();document.querySelector('#q').focus();}
  if(target?.matches('[data-close]')) target.closest('dialog').close();
  if(target?.matches('[data-demo]')){document.querySelector('#demo-titolo').textContent=target.dataset.demo;document.querySelector('#demo').showModal();}
});
document.addEventListener('keydown',event=>{
  if(event.key!=='/'||event.metaKey||event.ctrlKey||event.altKey||event.target.closest('input,textarea,[contenteditable]')||document.querySelector('dialog[open]'))return;
  event.preventDefault();results();search.showModal();document.querySelector('#q').focus();
});
const figure=document.querySelector('.laurea');
if(figure){
  const caption=figure.querySelector('[data-campo=testo]');
  const open=figure.querySelector('[data-campo=apri]');
  const original=caption.textContent;
  let selected=null;
  figure.querySelectorAll('.gruppo').forEach(g=>{
    const liveUrl='https://uni.marcoranica.com'+g.getAttribute('href');
    g.dataset.destination=g.getAttribute('href').includes('sociologia')?'#sociologia':g.getAttribute('href').includes('diritto-pubblico')?'#diritto':liveUrl;
    g.setAttribute('href',g.dataset.destination);
    const describe=()=>{caption.textContent=g.dataset.descr;open.href=g.dataset.destination;open.hidden=false;};
    g.addEventListener('pointerenter',describe);g.addEventListener('focus',describe);
    g.addEventListener('click',event=>{
      if(matchMedia('(hover:none)').matches&&selected!==g){event.preventDefault();selected?.classList.remove('gruppo--scelto');selected=g;g.classList.add('gruppo--scelto');describe();}
    });
  });
  figure.addEventListener('pointerleave',()=>{if(!selected){caption.textContent=original;open.hidden=true;}});
}
