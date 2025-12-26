
async function loadConfig(){
  const site = await fetch('/config/site.json').then(r=>r.json());
  const affiliates = await fetch('/config/affiliates.json').then(r=>r.json());
  return {site, affiliates};
}

function h(el, attrs={}, children=[]){
  const e = document.createElement(el);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==='class') e.className=v;
    else if(k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  });
  [].concat(children).forEach(c=>{
    if(c==null) return;
    if(typeof c==='string') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}

function renderOfferCard(offer){
  return h('a', {href: offer.url || '#', class: 'block rounded-2xl p-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 transition'}, [
    h('div',{class:'text-lg font-semibold text-white'}, offer.name),
    h('div',{class:'text-sm text-slate-400 mt-1'}, offer.merchant),
    h('p',{class:'text-slate-300 mt-2'}, offer.blurb || '')
  ]);
}

function renderTopDeals(list){
  const grid = h('div',{class:'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'});
  list.forEach(d => {
    const card = h('a',{href:d.url || '#', class:'block rounded-2xl p-4 bg-indigo-900/40 border border-indigo-700 hover:bg-indigo-900/60 transition'},[
      h('div',{class:'text-white font-semibold'}, d.name),
      h('div',{class:'text-slate-300 text-sm mt-1'}, `${d.merchant} • ${d.price || ''} ${d.savings ? '— '+d.savings : ''}`),
      h('p',{class:'text-slate-200 mt-2'}, d.blurb || '')
    ]);
    grid.appendChild(card);
  });
  return grid;
}

function renderCategory(cat){
  const wrap = h('section', {class:'mt-8'}, [
    h('h3', {class:'text-xl font-semibold text-white mb-3'}, cat.title),
    h('div',{class:'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', id:`grid-${cat.id}`}, [])
  ]);
  const grid = wrap.querySelector('div');
  cat.offers.forEach(o => grid.appendChild(renderOfferCard(o)));
  return wrap;
}

function initFinder(aff){
  const select = document.getElementById('finder-select');
  const results = document.getElementById('finder-results');
  select.innerHTML = '';
  aff.categories.forEach(c => {
    select.appendChild(h('option', {value:c.id}, c.title));
  });
  function update(){
    const id = select.value;
    const cat = aff.categories.find(c=>c.id===id);
    results.innerHTML='';
    if(!cat) return;
    results.appendChild(renderCategory(cat));
    results.scrollIntoView({behavior:'smooth'});
  }
  select.addEventListener('change', update);
  update();
}

function initAI(aff){
  const input = document.getElementById('ai-input');
  const send = document.getElementById('ai-send');
  const log = document.getElementById('ai-log');

  function replyBlock(fragment){
    log.appendChild(h('div',{class:'p-3 bg-slate-800 rounded-xl text-slate-100'},[fragment]));
    log.scrollTop = log.scrollHeight;
  }

  function handle(){
    const q = input.value.trim();
    if(!q) return;
    log.appendChild(h('div',{class:'p-3 bg-indigo-900 rounded-xl text-indigo-100 ml-auto max-w-[85%]'}, q));
    input.value='';

    const ql = q.toLowerCase();
    let cat = null;
    if(ql.includes('vacuum') || ql.includes('mop') || ql.includes('roborock') || ql.includes('roomba')) cat='cleaning';
    else if(ql.includes('doorbell') || ql.includes('camera') || ql.includes('security') || ql.includes('home')) cat='smart-home';
    else if(ql.includes('stream') || ql.includes('roku') || ql.includes('tv') || ql.includes('chromecast') || ql.includes('fire')) cat='streaming';
    else if(ql.includes('wifi') || ql.includes('mesh') || ql.includes('router')) cat='networking';
    else if(ql.includes('power') || ql.includes('backup') || ql.includes('battery') || ql.includes('generator')) cat='power';
    const recs = [];
    if(cat){
      const c = aff.categories.find(x=>x.id===cat);
      if(c) recs.push(...c.offers.slice(0,3));
    } else {
      recs.push(...(aff.topDeals || []).slice(0,3));
    }
    const frag = document.createDocumentFragment();
    frag.appendChild(h('div',{class:'text-slate-200 mb-2'},'Here are picks that fit your request:'));
    const grid = h('div',{class:'grid grid-cols-1 sm:grid-cols-2 gap-3'});
    recs.forEach(o=>grid.appendChild(renderOfferCard(o)));
    frag.appendChild(grid);
    replyBlock(frag);
  }

  send.addEventListener('click', handle);
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') handle(); });
}

loadConfig().then(({site, affiliates})=>{
  initFinder(affiliates);
  initAI(affiliates);
  const dealsMount = document.getElementById('top-deals');
  dealsMount.appendChild(renderTopDeals(affiliates.topDeals || []));
  if(site.reviewSafe){ document.getElementById('review-badge').classList.remove('hidden'); }
});
