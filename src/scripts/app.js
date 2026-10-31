// Teknons browser script: animations, interactive lists, forms and the admin panel.
// Every page is already rendered by the server; this only adds behaviour.
import { setLang, useState, buildState, state, fixLinks, R as route, L, LL, t, tt, esc, UI, CATS, BADGE, SAMPLE_SOL, sampleDoc, normProject, normSol,
  catName, money, host, uid, lines, hasVid, playerHtml, fmtDur, embedUrl, safeUrl, safeImg, safeVid, icon,
  homeProductsHtml, workGridHtml, hubParts, blogParts, tabsHtml, allSlides, visibleSlides, normSlide, safeBgVid, safeLink, catImg,
  addonsParts, allAddons, normAddon, ADDON_CATS, allTestis, normTesti, I as ICONS } from '../lib/core.js';

const boot = JSON.parse(document.getElementById('tk-data').textContent);
const lang = boot.lang, VIEW = boot.view;
setLang(lang);
let DATA = boot.data;
useState(buildState(DATA));
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const put = (sel, html) => { const el = typeof sel === 'string' ? $(sel) : sel; if (el){ el.innerHTML = fixLinks(html); mockAll(el); } return el; };

// ---------- Mock UI renderer (cards without screenshots) ----------
function rr(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}
function drawMock(c){
  const r = c.getBoundingClientRect(); if (r.width < 2) return;
  const d = Math.min(devicePixelRatio||1,2), w = r.width, h = r.height;
  c.width = w*d; c.height = h*d; const g = c.getContext('2d'); g.setTransform(d,0,0,d,0,0);
  const hue = +c.dataset.hue, Lt = c.dataset.layout;
  let s = hue*7+Lt.length*13; const rnd = () => (s = (s*9301+49297)%233280)/233280;
  const A = `hsl(${hue} 85% 62%)`, A2 = `hsl(${hue} 70% 45%)`, P = 'rgba(255,255,255,', bg = g.createLinearGradient(0,0,w,h);
  bg.addColorStop(0,`hsl(${hue} 45% 16%)`); bg.addColorStop(1,`hsl(${hue+25} 50% 8%)`); g.fillStyle = bg; g.fillRect(0,0,w,h);
  const glow = g.createRadialGradient(w*.85,h*.1,0,w*.85,h*.1,w*.7); glow.addColorStop(0,`hsla(${hue} 90% 60% / .4)`); glow.addColorStop(1,'transparent'); g.fillStyle = glow; g.fillRect(0,0,w,h);
  const u = w/100, v = h/100;
  if (Lt==='dash'){
    g.fillStyle = P+'.05)'; g.fillRect(0,0,18*u,h); g.fillStyle = A; rr(g,3*u,4*v,7*u,5*v,3);
    for(let i=0;i<6;i++){g.fillStyle = i===1?P+'.18)':P+'.08)'; rr(g,3*u,(16+i*8)*v,12*u,4*v,3);}
    g.fillStyle = P+'.06)'; g.fillRect(18*u,0,w,10*v);
    for(let i=0;i<3;i++){g.fillStyle = P+'.07)'; rr(g,(22+i*26)*u,15*v,23*u,20*v,8); g.fillStyle = P+'.5)'; rr(g,(25+i*26)*u,20*v,9*u,3*v,2); g.fillStyle = i===0?A:P+'.85)'; rr(g,(25+i*26)*u,26*v,13*u,5*v,2);}
    g.fillStyle = P+'.06)'; rr(g,22*u,40*v,50*u,54*v,8);
    g.strokeStyle = A; g.lineWidth = 2; g.beginPath(); for(let i=0;i<=10;i++){const x=(25+i*4.4)*u, y=(84-(i*3+rnd()*14))*v; i?g.lineTo(x,y):g.moveTo(x,y);} g.stroke();
    g.fillStyle = P+'.06)'; rr(g,75*u,40*v,22*u,54*v,8); for(let i=0;i<5;i++){g.fillStyle = P+'.12)'; rr(g,78*u,(46+i*9)*v,16*u,4*v,2);}
  } else if (Lt==='shop'){
    g.fillStyle = P+'.9)'; rr(g,5*u,5*v,12*u,4*v,2); for(let i=0;i<4;i++){g.fillStyle=P+'.35)'; rr(g,(50+i*10)*u,6*v,7*u,2.5*v,2);}
    const hb = g.createLinearGradient(0,14*v,w,48*v); hb.addColorStop(0,A2); hb.addColorStop(1,`hsl(${hue+30} 70% 30%)`); g.fillStyle = hb; rr(g,5*u,14*v,90*u,34*v,10);
    g.fillStyle = P+'.95)'; rr(g,10*u,22*v,34*u,6*v,3); g.fillStyle=P+'.6)'; rr(g,10*u,31*v,24*u,3*v,2); g.fillStyle='#0B1433'; rr(g,10*u,38*v,13*u,5*v,8);
    for(let i=0;i<4;i++){const x=(5+i*23)*u; g.fillStyle=`hsla(${hue+i*25} 60% 50% / .5)`; rr(g,x,53*v,20*u,28*v,8); g.fillStyle=P+'.7)'; rr(g,x,84*v,14*u,3*v,2); g.fillStyle=A; rr(g,x,89*v,7*u,3*v,2);}
  } else if (Lt==='site'){
    g.fillStyle = A; rr(g,6*u,6*v,4*u,4*v,2); g.fillStyle=P+'.9)'; rr(g,11*u,6.5*v,10*u,3*v,2);
    for(let i=0;i<4;i++){g.fillStyle=P+'.35)'; rr(g,(52+i*9)*u,7*v,6*u,2*v,2);} g.fillStyle=A; rr(g,88*u,5*v,7*u,5*v,6);
    g.fillStyle=P+'.95)'; rr(g,6*u,22*v,46*u,8*v,3); rr(g,6*u,33*v,36*u,8*v,3); g.fillStyle=A; rr(g,6*u,44*v,26*u,8*v,3);
    g.fillStyle=P+'.4)'; rr(g,6*u,57*v,38*u,2.5*v,2); rr(g,6*u,62*v,32*u,2.5*v,2);
    g.fillStyle=A; rr(g,6*u,70*v,14*u,6*v,8); g.fillStyle=P+'.12)'; rr(g,22*u,70*v,12*u,6*v,8);
    const im = g.createLinearGradient(58*u,18*v,95*u,80*v); im.addColorStop(0,`hsla(${hue} 80% 60% / .6)`); im.addColorStop(1,`hsla(${hue+40} 60% 30% / .3)`); g.fillStyle=im; rr(g,58*u,18*v,37*u,62*v,12);
    g.fillStyle=P+'.15)'; rr(g,62*u,62*v,22*u,13*v,6); for(let i=0;i<3;i++){g.fillStyle=P+'.07)'; rr(g,(6+i*30)*u,86*v,27*u,10*v,6);}
  } else if (Lt==='calendar'){
    g.fillStyle=P+'.9)'; rr(g,5*u,6*v,20*u,4*v,2); g.fillStyle=A; rr(g,80*u,5*v,15*u,6*v,6);
    for(let c2=0;c2<7;c2++) for(let r2=0;r2<5;r2++){const x=(5+c2*13)*u,y=(18+r2*16)*v; g.fillStyle=P+'.06)'; rr(g,x,y,12*u,14*v,5); if(rnd()>.55){g.fillStyle=`hsla(${hue+(rnd()*60-30)} 80% 60% / .8)`; rr(g,x+1*u,y+(3+rnd()*5)*v,10*u,3.5*v,3);}}
  } else if (Lt==='lms'){
    g.fillStyle='#000'; rr(g,5*u,8*v,58*u,56*v,10);
    const vb=g.createLinearGradient(5*u,8*v,63*u,64*v); vb.addColorStop(0,`hsla(${hue} 70% 45% / .75)`); vb.addColorStop(1,'transparent'); g.fillStyle=vb; rr(g,5*u,8*v,58*u,56*v,10);
    g.fillStyle=P+'.9)'; g.beginPath(); g.moveTo(31*u,30*v); g.lineTo(31*u,44*v); g.lineTo(39*u,37*v); g.fill();
    g.fillStyle=P+'.15)'; rr(g,8*u,58*v,52*u,1.5*v,2); g.fillStyle=A; rr(g,8*u,58*v,22*u,1.5*v,2);
    g.fillStyle=P+'.9)'; rr(g,5*u,70*v,40*u,5*v,2); g.fillStyle=P+'.35)'; rr(g,5*u,78*v,52*u,2.5*v,2); rr(g,5*u,83*v,44*u,2.5*v,2);
    for(let i=0;i<6;i++){g.fillStyle=i===1?P+'.12)':P+'.06)'; rr(g,67*u,(8+i*14)*v,28*u,11*v,6); g.fillStyle=i<2?A:P+'.3)'; g.beginPath(); g.arc(71*u,(13.5+i*14)*v,1.6*u,0,7); g.fill(); g.fillStyle=P+'.5)'; rr(g,75*u,(12+i*14)*v,16*u,2.5*v,2);}
  } else if (Lt==='map'){
    g.strokeStyle=P+'.07)'; g.lineWidth=1; for(let i=0;i<14;i++){g.beginPath(); g.moveTo(0,i*8*v+rnd()*10); g.bezierCurveTo(w*.3,i*8*v-20,w*.6,i*8*v+30,w,i*8*v); g.stroke();}
    g.strokeStyle=`hsla(${hue} 80% 60% / .6)`; g.lineWidth=3; g.beginPath(); g.moveTo(10*u,80*v); g.bezierCurveTo(30*u,40*v,50*u,70*v,62*u,25*v); g.stroke();
    for(let i=0;i<9;i++){const x=(8+rnd()*55)*u,y=(10+rnd()*80)*v; g.fillStyle=A; g.beginPath(); g.arc(x,y,5,0,7); g.fill(); g.fillStyle=`hsla(${hue} 90% 60% / .2)`; g.beginPath(); g.arc(x,y,12,0,7); g.fill();}
    g.fillStyle='rgba(11,20,51,.9)'; rr(g,68*u,5*v,28*u,90*v,10);
    for(let i=0;i<3;i++){g.fillStyle=`hsla(${hue+i*20} 50% 45% / .55)`; rr(g,71*u,(9+i*29)*v,22*u,15*v,6); g.fillStyle=P+'.8)'; rr(g,71*u,(26+i*29)*v,16*u,2.5*v,2); g.fillStyle=A; rr(g,71*u,(30+i*29)*v,9*u,2.5*v,2);}
  } else if (Lt==='chat'){
    g.fillStyle=P+'.05)'; g.fillRect(0,0,24*u,h); for(let i=0;i<6;i++){g.fillStyle=i===0?P+'.12)':P+'.06)'; rr(g,3*u,(6+i*10)*v,18*u,7*v,5);}
    let y=8; [[0,48],[1,36],[0,58],[1,28],[0,44]].forEach(([me,len])=>{const x=me?(94-len)*u:30*u; g.fillStyle=me?A:P+'.1)'; rr(g,x,y*v,len*u,(me?8:12)*v,10); y+=me?12:16;});
    g.fillStyle=P+'.08)'; rr(g,30*u,88*v,64*u,8*v,10); g.fillStyle=A; g.beginPath(); g.arc(90*u,92*v,2.2*u,0,7); g.fill();
  } else if (Lt==='flow'){
    const nodes=[[10,20],[10,62],[38,41],[64,20],[64,62],[88,41]];
    g.strokeStyle=`hsla(${hue} 80% 60% / .6)`; g.lineWidth=2; [[0,2],[1,2],[2,3],[2,4],[3,5],[4,5]].forEach(([a,b])=>{const[x1,y1]=nodes[a],[x2,y2]=nodes[b]; g.beginPath(); g.moveTo((x1+9)*u,(y1+7)*v); g.bezierCurveTo((x1+20)*u,(y1+7)*v,(x2-10)*u,(y2+7)*v,(x2-9)*u,(y2+7)*v); g.stroke();});
    nodes.forEach(([x,y],i)=>{g.fillStyle=i===2?A2:'rgba(20,30,60,.95)'; rr(g,(x-9)*u,y*v,18*u,14*v,8); g.fillStyle=i===2?P+'.95)':A; rr(g,(x-6)*u,(y+4)*v,3*u,6*v,2); g.fillStyle=P+'.6)'; rr(g,(x-1.5)*u,(y+5.5)*v,8*u,3*v,2);});
  } else if (Lt==='mobile'){
    for(let i=0;i<3;i++){const pw=22*u, ph=Math.min(84*v,pw*2.1), x=(14+i*27)*u, y=(i===1?6:12)*v;
      g.fillStyle='#05070C'; rr(g,x-4,y-4,pw+8,ph+8,18); g.fillStyle=`hsl(${hue} 30% ${i===1?16:12}%)`; rr(g,x,y,pw,ph,14);
      g.fillStyle=`hsla(${hue+i*20} 70% 50% / .65)`; rr(g,x+pw*.08,y+ph*.12,pw*.84,ph*.32,10);
      for(let k=0;k<3;k++){g.fillStyle=P+'.1)'; rr(g,x+pw*.08,y+ph*(.5+k*.13),pw*.84,ph*.1,6); g.fillStyle=P+'.6)'; rr(g,x+pw*.14,y+ph*(.53+k*.13),pw*.4,ph*.025,2);}
      g.fillStyle=A; rr(g,x+pw*.08,y+ph*.89,pw*.84,ph*.07,10);}
  }
}
const ro = new ResizeObserver(es => es.forEach(e => drawMock(e.target)));
function mockAll(root=document){ if (!root) return; root.querySelectorAll('canvas[data-layout]').forEach(c => { ro.observe(c); drawMock(c); }); }

// ---------- Header, drawer and lightbox ----------
const burger = $('#burger'), drawer = $('#drawer');
if (burger) burger.onclick = () => { drawer.hidden = false; };
if ($('#close')) $('#close').onclick = () => { drawer.hidden = true; };

const LB = {list: [], i: 0};
function lbShow(i){ if (!LB.list.length) return; LB.i = (i + LB.list.length) % LB.list.length; $('#lbImg').src = LB.list[LB.i]; $('#lbC').textContent = `${LB.i + 1} / ${LB.list.length}`; $('#lb').hidden = false; }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-lb]'); if (!b) return;
  const g = b.closest('[data-gallery]'); LB.list = [...g.querySelectorAll('img')].map(i => i.getAttribute('src')); lbShow(+b.dataset.lb);
});
$('#lbX').onclick = () => $('#lb').hidden = true;
$('#lbP').onclick = () => lbShow(LB.i - 1);
$('#lbN').onclick = () => lbShow(LB.i + 1);
$('#lb').onclick = e => { if (e.target.id === 'lb') $('#lb').hidden = true; };
addEventListener('keydown', e => { if ($('#lb').hidden) return; if (e.key === 'Escape') $('#lb').hidden = true; if (e.key === 'ArrowLeft') lbShow(LB.i - 1); if (e.key === 'ArrowRight') lbShow(LB.i + 1); });

// ---------- Motion: scroll progress, cursor glow, spotlight cards, magnetic buttons, reveals, counters ----------
addEventListener('scroll', () => { const h = document.documentElement.scrollHeight - innerHeight; document.documentElement.style.setProperty('--sp', h > 0 ? (scrollY / h).toFixed(4) : 0); }, {passive: true});
if (!reduce) addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const g = $('#cglow'); g.style.setProperty('--cx', e.clientX + 'px'); g.style.setProperty('--cy', e.clientY + 'px'); g.style.opacity = e.target.closest && e.target.closest('.hero,.rs') ? 0 : 1; }, {passive: true});
document.addEventListener('pointermove', e => {
  const c = e.target.closest && e.target.closest('.cat');
  if (c){ const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
  if (reduce || e.pointerType !== 'mouse') return;
  const b = e.target.closest && e.target.closest('.btn.gold');
  $$('.btn.gold.mag').forEach(x => { if (x !== b){ x.classList.remove('mag'); x.style.transform = ''; } });
  if (b){ const r = b.getBoundingClientRect(); b.classList.add('mag'); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; }
});
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting){ x.target.classList.add('in'); io.unobserve(x.target); if (x.target.id === 'stats') countUp(); } }), {threshold: .12}) : null;
function revealAll(){ if (!io || reduce) { $('#stats') && countUp(); return; } $$('.sec-head, .cats, .showcase, .wgrid, .bento, .steps, .bgrid, .stats, .cta-band').forEach(x => { if (!x.classList.contains('in')){ x.classList.add('rv'); io.observe(x); } }); }
let counted = false;
function countUp(){
  if (counted || reduce) return; counted = true;
  $$('#stats b[data-n]').forEach(b => { const n = +b.dataset.n, s = b.dataset.s, t0 = performance.now(); (function f(now){ const k = Math.min(1, (now - t0) / 1400), v = Math.round(n * (1 - Math.pow(1 - k, 3))); b.textContent = v + s; if (k < 1) requestAnimationFrame(f); })(t0); });
}

// ---------- Newsletter ----------
const valid = e => /^\S+@\S+\.\S+$/.test(e);
async function postJSON(url, body){ const r = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}); if (!r.ok) throw r.status; return r.json(); }
if ($('#news')) $('#news').onsubmit = async e => {
  e.preventDefault(); const email = $('#newsEmail').value.trim(), note = $('#newsNote');
  if (!valid(email)){ note.textContent = t('newsBad'); return; }
  try { await postJSON('/api/subscribe', {email, lang}); note.textContent = tt('Thank you. You are on the list.', 'Merci. Vous êtes inscrit.'); $('#newsEmail').value = ''; }
  catch(err){ note.textContent = tt('Something went wrong. Please try again.', 'Une erreur est survenue. Veuillez réessayer.'); }
};


// ---------- Home ----------
if (VIEW === 'home'){
  const homeTabs = $('#homeTabs');
  homeTabs.onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; $$('#homeTabs button').forEach(x => x.setAttribute('aria-selected', x === b)); put('#homeProducts', homeProductsHtml(b.dataset.t)); };
  $('#popular').onclick = e => { const b = e.target.closest('[data-q]'); if (b) location.href = route('solutions') + '?q=' + encodeURIComponent(b.dataset.q); };

(function(){
  const el = $('#scramble'), glyphs = '01<>/{}[]#$%&*+=';
  let i = 0;
  function show(word){
    if (reduce){ el.textContent = word; return; }
    let f = 0; const total = 18;
    (function step(){ el.textContent = word.split('').map((c,k) => k < (f/total)*word.length || c===' ' ? c : glyphs[Math.floor(Math.random()*glyphs.length)]).join(''); if (f++ < total) requestAnimationFrame(step); else el.textContent = word; })();
  }
  window.__scrambleShow = () => show(t('scramble')[i % t('scramble').length]);
  setInterval(() => { i++; show(t('scramble')[i % t('scramble').length]); }, 2600);
})();
(function(){
  const c = $('#forge'), g = c.getContext('2d'), stage = $('#stage');
  const N = window.innerWidth < 600 ? 900 : 1500;
  let W = 0, H = 0, d = 1, shape = 1, rot = 0, lastSwitch = performance.now(), mouse = {x:-9999, y:-9999}, seeded = false;
  const P = Array.from({length:N}, () => ({x:Math.random(), y:Math.random(), vx:0, vy:0, tx:0, ty:0, z:0, j:Math.random()}));
  const sphere = Array.from({length:N}, (_,i) => { const y = 1 - (i/(N-1))*2, r = Math.sqrt(1-y*y), th = i*2.39996; return [Math.cos(th)*r, y, Math.sin(th)*r]; });
  function sample(draw){
    const S = 360, oc = document.createElement('canvas'); oc.width = oc.height = S; const o = oc.getContext('2d');
    draw(o, S); const data = o.getImageData(0,0,S,S).data, pts = [];
    for (let y=0;y<S;y+=4) for (let x=0;x<S;x+=4) if (data[(y*S+x)*4+3] > 128) pts.push([(x/S-.5)*2, (y/S-.5)*2]);
    for (let k=pts.length-1;k>0;k--){ const m = Math.floor(Math.random()*(k+1)); [pts[k],pts[m]] = [pts[m],pts[k]]; }
    return pts;
  }
  let shapes = [];
  function build(){
    const logo = sample((o,S) => {
      o.save(); o.translate(S*.08,S*.08); o.scale(S*.84/80,S*.84/80);
      o.lineWidth = 5; o.strokeStyle = '#000'; o.fillStyle = '#000'; o.lineJoin = 'round';
      o.stroke(new Path2D('M40 2 L73 21 L73 59 L40 78 L7 59 L7 21 Z'));
      o.fill(new Path2D('M19 24 H61 L57 32 H44.5 V58 L40 63 L35.5 58 V32 H23 Z'));
      o.lineWidth = 3.2; o.lineCap = 'round'; o.stroke(new Path2D('M57 32 V44'));
      o.beginPath(); o.arc(57,48.5,4.2,0,7); o.fill(); o.restore();
    });
    const code = sample((o,S) => { o.fillStyle = '#000'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.font = `800 ${S*.42}px Archivo, "Arial Black", sans-serif`; o.fillText('</>', S/2, S*.52); });
    shapes = [null, logo, code];
  }
  build(); if (document.fonts) document.fonts.ready.then(build);
  function size(){ const b = c.getBoundingClientRect(); d = Math.min(devicePixelRatio||1,2); W = b.width; H = b.height; c.width = W*d; c.height = H*d;
    if (!seeded && W > 0){ P.forEach(p => { p.x *= W; p.y *= H; }); seeded = true; } }
  new ResizeObserver(size).observe(c); size();
  function setShape(k){ shape = k; lastSwitch = performance.now(); $$('#hud button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.s === k)); P.forEach(p => { p.vx += (Math.random()-.5)*6; p.vy += (Math.random()-.5)*6; }); }
  $('#hud').onclick = e => { const b = e.target.closest('[data-s]'); if (b) setShape(+b.dataset.s); };
  stage.addEventListener('pointermove', e => { const b = c.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; });
  stage.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  c.addEventListener('click', () => setShape((shape+1)%3));
  function frame(now){
    if (W > 0 && seeded && !c.closest('[hidden]')){
      if (!reduce && now - lastSwitch > 6500) setShape((shape+1)%3);
      g.setTransform(d,0,0,d,0,0); g.clearRect(0,0,W,H);
      const R = Math.min(W,H)*.4, cx = W/2, cy = H/2 - H*.03;
      const halo = g.createRadialGradient(cx,cy,R*.1,cx,cy,R*1.4); halo.addColorStop(0,'rgba(56,189,248,.22)'); halo.addColorStop(1,'transparent'); g.fillStyle = halo; g.fillRect(0,0,W,H);
      g.strokeStyle = 'rgba(125,211,252,.25)'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx,cy,R*1.2,R*.34,-.3,0,7); g.stroke();
      g.strokeStyle = 'rgba(143,211,255,.14)'; g.beginPath(); g.ellipse(cx,cy,R*1.1,R*.5,.5,0,7); g.stroke();
      const ca = Math.cos(rot), sa = Math.sin(rot), ct = Math.cos(.38), st = Math.sin(.38), pts = shapes[shape];
      const breathe = 1 + Math.sin(now/1400)*.015;
      g.globalCompositeOperation = 'lighter';
      for (let i=0;i<N;i++){
        const p = P[i];
        if (shape === 0 || !pts || !pts.length){ const [x,y,z] = sphere[i]; const x1 = x*ca + z*sa, z1 = -x*sa + z*ca; p.tx = cx + x1*R; p.ty = cy + (y*ct - z1*st)*R; p.z = y*st + z1*ct; }
        else { const q = pts[i % pts.length]; p.tx = cx + q[0]*R*breathe + Math.sin(now/900 + i)*0.6; p.ty = cy + q[1]*R*breathe + Math.cos(now/1100 + i)*0.6; p.z = .4 + p.j*.6; }
        p.vx += (p.tx - p.x) * .018; p.vy += (p.ty - p.y) * .018;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, dd = dx*dx + dy*dy;
        if (dd < 9000){ const f = (1 - dd/9000) * 3.2, m = Math.sqrt(dd)||1; p.vx += dx/m*f; p.vy += dy/m*f; }
        p.vx *= .84; p.vy *= .84; p.x += p.vx; p.y += p.vy;
        const a = (p.z+1)/2, speed = Math.abs(p.vx)+Math.abs(p.vy);
        g.fillStyle = speed > 1.2 ? `rgba(143,211,255,${.35+a*.5})` : `rgba(${125+Math.round(130*a)},${211+Math.round(44*a)},${252},${.22+a*.75})`;
        const sz = .7 + a*1.6;
        g.fillRect(p.x - sz/2, p.y - sz/2, sz, sz);
      }
      g.globalCompositeOperation = 'source-over';
      if (!reduce) rot += .004;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
}

// ---------- Cinematic video slider ----------
const RS = {i: 0, list: [], key: '', t0: 0, busy: false, paused: false, visible: true, raf: 0, DUR: 8000};
const FXS = ['blinds', 'circle', 'diag', 'shutter', 'zoom'];
function rsSync(){
  $('#rsNum').textContent = String(RS.i + 1).padStart(2, '0');
  $$('#rsThumbs button').forEach((b, i) => b.setAttribute('aria-current', i === RS.i));
}
function rsPlay(i){
  $$('#rsStage video').forEach((v, k) => { if (k === i && !reduce && RS.visible){ v.preload = 'auto'; try { v.currentTime = 0; } catch(e) {} const p = v.play(); p && p.catch(() => {}); } else if (k !== i) v.pause(); });
  const nx = $$('#rsStage video')[(i + 1) % RS.list.length]; if (nx) nx.preload = 'auto';
}
function scramble(el){
  if (!el || reduce) return; const txt = el.textContent, chars = '!<>-_\\/[]{}—=+*^?#01'; let f = 0;
  const step = () => { f++; el.textContent = txt.split('').map((c, k) => c === ' ' ? ' ' : k < f * 1.4 ? c : chars[(k * 7 + f) % chars.length]).join(''); if (f * 1.4 < txt.length) requestAnimationFrame(step); else el.textContent = txt; };
  step();
}
const ezIO = x => x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2;
function clipAt(fx, p, dir){
  const P = v => (dir > 0 ? v : 100 - v).toFixed(2) + '%';
  if (fx === 'circle') return `circle(${(p * 150).toFixed(2)}% at ${dir > 0 ? 70 : 30}% 50%)`;
  if (fx === 'diag'){ const x = p * 145; return `polygon(${P(0)} 0%,${P(x)} 0%,${P(x - 45)} 100%,${P(0)} 100%)`; }
  if (fx === 'blinds'){ const N = 9, w = 100 / N, pts = []; for (let k = 0; k < N; k++){ const q = Math.max(0, Math.min(1, p * 1.7 - k / N * .7)), x0 = k * w, x1 = x0 + w * q; pts.push(`${P(x0)} 100%`, `${P(x0)} 0%`, `${P(x1)} 0%`, `${P(x1)} 100%`); } return `polygon(${pts.join(',')})`; }
  if (fx === 'shutter'){ const N = 6, h = 100 / N, pts = []; for (let k = 0; k < N; k++){ const q = Math.max(0, Math.min(1, p * 1.5 - k / N * .5)), y0 = k * h, y1 = y0 + h; const a = k % 2 ? 100 - q * 100 : 0, b = k % 2 ? 100 : q * 100; pts.push(`0% ${y0}%`, `${a}% ${y0}%`, `${a}% ${y1}%`, `${b}% ${y1}%`, `${b}% ${y0}%`, `0% ${y0}%`); } return `polygon(${pts.join(',')})`; }
  return 'none';
}
function rsGo(n, dir){
  const L = RS.list.length; if (L < 2 || RS.busy) return; n = (n + L) % L; if (n === RS.i) return;
  dir = dir || (n > RS.i ? 1 : -1);
  const sl = $$('#rsStage .rs-slide'), from = sl[RS.i], to = sl[n], fx = reduce ? 'zoom' : FXS[n % FXS.length], D = reduce ? 500 : 1400, t0 = performance.now(), fl = $('#rsFlash');
  RS.busy = true; from.classList.replace('cur', 'out'); to.classList.add('in'); to.removeAttribute('aria-hidden');
  RS.i = n; rsSync(); rsPlay(n);
  const tick = now => {
    const p = Math.min(1, (now - t0) / D), e = ezIO(p);
    if (fx === 'zoom'){ to.style.opacity = e; to.style.transform = `scale(${1.15 - .15 * e})`; to.style.filter = `blur(${(1 - e) * 14}px)`; }
    else { to.style.clipPath = clipAt(fx, e, dir); to.style.transform = `scale(${1.12 - .12 * e})`; }
    from.style.transform = `scale(${1 + .08 * e}) translateX(${-dir * 4 * e}%)`; from.style.filter = `brightness(${1 - .55 * e})`;
    if (!reduce){ fl.style.opacity = Math.sin(p * Math.PI); fl.style.left = (dir > 0 ? -40 + p * 140 : 100 - p * 140) + '%'; }
    if (p < 1){ requestAnimationFrame(tick); return; }
    from.classList.remove('out'); from.setAttribute('aria-hidden', 'true'); from.removeAttribute('style');
    to.removeAttribute('style'); to.classList.remove('in'); to.classList.add('cur'); fl.style.opacity = 0;
    scramble(to.querySelector('[data-scr]')); RS.busy = false; RS.t0 = performance.now();
  };
  requestAnimationFrame(() => { to.classList.add('cur'); requestAnimationFrame(tick); });
}
function rsLoop(now){
  RS.raf = requestAnimationFrame(rsLoop);
  if (!RS.list.length) return;
  const run = !reduce && RS.visible && !RS.paused && !document.hidden && RS.list.length > 1;
  if (!run || RS.busy){ RS.t0 += (now - (RS.last || now)); RS.last = now; return; }
  RS.last = now;
  const p = Math.min(1, (now - RS.t0) / RS.DUR);
  $('#rsBar').style.transform = `scaleX(${p})`;
  const ti = $$('#rsThumbs u i'); ti.forEach((x, k) => x.style.transform = `scaleX(${k === RS.i ? p : k < RS.i ? 1 : 0})`);
  if (p >= 1) rsGo(RS.i + 1, 1);
}

if ($('#rs')) (function rsInit(){
  const rs = $('#rs');
  $('#rsPrev').onclick = () => rsGo(RS.i - 1, -1);
  $('#rsNext').onclick = () => rsGo(RS.i + 1, 1);
  $('#rsThumbs').onclick = e => { const b = e.target.closest('[data-rs]'); if (b) rsGo(+b.dataset.rs); };
  rs.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') rsGo(RS.i - 1, -1); if (e.key === 'ArrowRight') rsGo(RS.i + 1, 1); });
  rs.addEventListener('focusin', () => RS.paused = true); rs.addEventListener('focusout', () => RS.paused = false);
  let sx = null; rs.addEventListener('touchstart', e => sx = e.touches[0].clientX, {passive: true});
  rs.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) rsGo(RS.i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); sx = null; });
  if (!reduce) rs.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = rs.getBoundingClientRect(); rs.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3)); rs.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3)); });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(x => { RS.visible = x.isIntersecting; const v = $$('#rsStage video')[RS.i]; if (v){ if (RS.visible && !reduce){ const p = v.play(); p && p.catch(() => {}); } else v.pause(); } }), {threshold: .15}).observe(rs);
  RS.list = visibleSlides(); RS.t0 = performance.now(); rsPlay(0); requestAnimationFrame(rsLoop);
})();

// ---------- Solutions hub ----------
if (VIEW === 'solutions'){
  const hub = boot.hub;
  const renderHub = () => {
    const h = hubParts(hub);
    put('#typeOpts', h.typeOpts); put('#catOpts', h.catOpts); put('#count', h.count); put('#hubGrid', h.grid);
    const q = new URLSearchParams(); if (hub.q) q.set('q', hub.q); if (hub.type !== 'all') q.set('type', hub.type); if (hub.sort !== 'featured') q.set('sort', hub.sort);
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : ''));
  };
  $('#typeOpts').onclick = e => { const b = e.target.closest('[data-type]'); if (b){ hub.type = b.dataset.type; renderHub(); } };
  // Each industry has its own page, so changing industry opens it (keeping the other filters).
  $('#catOpts').onclick = e => { const b = e.target.closest('[data-cat]'); if (!b) return; const q = location.search; location.href = route(b.dataset.cat === 'all' ? 'solutions' : 'cat-' + b.dataset.cat) + q; };
  let qt; $('#hubQ').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { hub.q = e.target.value; renderHub(); }, 120); };
  $('#sort').onchange = e => { hub.sort = e.target.value; renderHub(); };
}

// ---------- Portfolio and blog filters ----------
if (VIEW === 'work') $('#workTabs').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; $$('#workTabs button').forEach(x => x.setAttribute('aria-selected', x === b)); put('#workGrid', workGridHtml(b.dataset.t)); };
if (VIEW === 'blog') $('#blogCats').onclick = e => {
  const b = e.target.closest('[data-bc]'); if (!b) return;
  const p = blogParts(b.dataset.bc); put('#blogCats', p.cats); put('#blogFeatured', p.featured); put('#blogGrid', p.grid);
  history.replaceState(null, '', location.pathname + (b.dataset.bc === 'all' ? '' : '?cat=' + encodeURIComponent(b.dataset.bc)));
};

// ---------- Contact: estimator and project request ----------
if (VIEW === 'contact'){

const mult = [0.7,1,1.6];
function est(){
  const i = +$('#ePages').value - 1, base = +$('#eType').value * mult[i];
  const extras = $$('.checks input:checked').reduce((a,c) => a + +c.value, 0);
  // Shows an indicative delivery time instead of a price: roughly one week per 1 500 units of effort.
  const lo = Math.max(2, Math.round((base+extras)/1500)), hi = Math.round(lo*1.5);
  $('#ePagesV').textContent = t('sizes')[i];
  $('#eOut').textContent = `${lo} – ${hi} ${t('weeks')}`;
}
['#eType','#ePages'].forEach(s => $(s).oninput = est); $$('.checks input').forEach(c => c.onchange = est);
  est();
  $('#contactForm').onsubmit = async e => {
    e.preventDefault();
    const v = id => $('#' + id).value.trim(), note = $('#cNote'), btn = e.target.querySelector('button[type=submit]');
    if (!v('cName') || !valid(v('cEmail'))){ note.textContent = t('invalid'); return; }
    btn.disabled = true; note.textContent = tt('Sending…', 'Envoi…');
    try {
      await postJSON('/api/contact', {name: v('cName'), company: v('cCompany'), email: v('cEmail'), phone: v('cPhone'), solution: v('cSolution'),
        budget: $('#cBudget').selectedOptions[0]?.text || '', when: $('#cWhen').selectedOptions[0]?.text || '', message: v('cMsg'), estimate: $('#eOut').textContent, lang, website: $('#cWeb')?.value || ''});
      e.target.reset(); est(); note.textContent = tt('Thank you. Your request is in. We reply within 48 hours.', 'Merci. Votre demande est bien reçue. Nous répondons sous 48 heures.');
    } catch(err){ note.textContent = err === 429 ? tt('Too many requests. Please wait a few minutes.', 'Trop de demandes. Patientez quelques minutes.') : tt('Sending failed. Please email contact@teknons.com.', 'L’envoi a échoué. Écrivez à contact@teknons.com.'); }
    btn.disabled = false;
  };
}

// ---------- Live demo ----------
if (VIEW === 'demo'){
  const tabs = $$('#demoTabs [data-ds]'), screens = $$('#demoScr .ds'); let cur = 0;
  const show = i => { cur = (i + screens.length) % screens.length;
    screens.forEach((x, k) => { x.classList.toggle('on', k === cur); if (k !== cur) x.querySelector('video')?.pause(); });
    tabs.forEach((b, k) => b.setAttribute('aria-selected', k === cur)); tabs[cur]?.scrollIntoView({block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth'}); };
  $('#demoTabs').onclick = e => { const b = e.target.closest('[data-ds]'); if (b) show(+b.dataset.ds); };
  $('#demoPrev').onclick = () => show(cur - 1); $('#demoNext').onclick = () => show(cur + 1);
  addEventListener('keydown', e => { if (!$('#lb').hidden || /input|textarea|select/i.test(e.target.tagName)) return; if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); });
  $('#demoFull').onclick = e => { const on = $('#demo').classList.toggle('full'); e.currentTarget.setAttribute('aria-pressed', on); };
  let sx = null; const st = $('#demoStage');
  st.addEventListener('touchstart', e => sx = e.touches[0].clientX, {passive: true});
  st.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); sx = null; });
}

// ---------- Add-ons filter ----------
if (VIEW === 'addons') $('#addonTabs').onclick = e => {
  const b = e.target.closest('[data-ac]'); if (!b) return;
  const a = addonsParts(b.dataset.ac); put('#addonTabs', a.tabs); put('#addonGrid', a.grid);
  history.replaceState(null, '', location.pathname + (b.dataset.ac === 'all' ? '' : '?cat=' + b.dataset.ac));
};

// ---------- Support ticket ----------
if (VIEW === 'support') $('#ticket').onsubmit = async e => {
  e.preventDefault();
  const v = id => $('#' + id).value.trim(), note = $('#tNote'), btn = e.target.querySelector('button[type=submit]');
  if (!v('tName') || !valid(v('tEmail')) || !v('tSubj') || !v('tMsg')){ note.textContent = tt('Please fill in your name, email, subject and message.', 'Merci de renseigner nom, email, sujet et message.'); return; }
  btn.disabled = true; note.textContent = tt('Sending…', 'Envoi…');
  try {
    await postJSON('/api/support', {name: v('tName'), email: v('tEmail'), site: v('tSite'), priority: v('tPrio'), subject: v('tSubj'), message: v('tMsg'), lang, website: v('tWeb')});
    e.target.reset(); note.textContent = tt('Ticket received. We reply by email, faster for urgent issues.', 'Ticket reçu. Nous répondons par email, plus vite pour les urgences.');
  } catch(err){ note.textContent = err === 429 ? tt('Too many requests. Please wait a few minutes.', 'Trop de demandes. Patientez quelques minutes.') : tt('Sending failed. Please email us instead.', 'L’envoi a échoué. Écrivez-nous plutôt par email.'); }
  btn.disabled = false;
};

// ---------- Admin: content store (your server's /api) ----------
if (VIEW === 'admin'){
let storeReady = false;
const Store = { token: null, canEdit: false };
try { Store.token = sessionStorage.getItem('tk-admin'); } catch(e) {}
Store.canEdit = !!Store.token;
function dataChanged(){ useState(buildState(DATA)); storeReady = true; renderAdmin(); }
async function api(method, path, body, raw){
  const r = await fetch(path, {method, headers: {'Authorization': 'Bearer ' + (Store.token || ''), ...(raw ? {'Content-Type': body.type} : body ? {'Content-Type': 'application/json'} : {})}, body: raw ? body : body ? JSON.stringify(body) : undefined});
  if (r.status === 401){ Store.token = null; Store.canEdit = false; try { sessionStorage.removeItem('tk-admin'); } catch(e) {} renderAdmin(); throw {code: 'auth'}; }
  if (!r.ok) throw {code: 'http_' + r.status};
  return r.json();
}
async function storeInit(){
  try { const r = await fetch('/api/content', {cache: 'no-store'}); if (r.ok){ const j = await r.json(); DATA = {projects: j.projects || [], solutions: j.solutions || [], settings: j.settings || {}}; } } catch(e) {}
  dataChanged();
}
async function storeSave(col, obj){
  obj = {...obj, updatedAt: Date.now()};
  await api('PUT', `/api/${col}/${encodeURIComponent(obj.id)}`, obj);
  const arr = DATA[col], i = arr.findIndex(x => x.id === obj.id);
  if (i < 0) arr.push(obj); else arr[i] = obj;
  dataChanged();
}
async function storeDelete(col, id){
  await api('DELETE', `/api/${col}/${encodeURIComponent(id)}`);
  DATA[col] = DATA[col].filter(x => x.id !== id);
  dataChanged();
}
async function storeSettings(patch){
  const next = {...DATA.settings, ...patch};
  for (const k in next) if (next[k] === null) delete next[k];
  await api('PUT', '/api/settings', next);
  DATA.settings = next;
  dataChanged();
}
async function shrink(file, max){
  if (file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, max / bmp.width), c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const b = await new Promise(r => c.toBlob(r, 'image/webp', .86));
    return b && b.size ? b : file;
  } catch(e) { return file; }
}
const storeUploadVideo = async file => (await api('POST', '/api/upload', file, true)).url;
const videoDuration = file => new Promise(res => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { res(v.duration); URL.revokeObjectURL(v.src); }; v.onerror = () => res(NaN); v.src = URL.createObjectURL(file); });
async function storeUpload(file){
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw {code: 'unsupported_type'};
  return (await api('POST', '/api/upload', await shrink(file, 2000), true)).url;
}

// ---------- Admin: messages from the contact form and newsletter sign-ups ----------
function when(ts){ try { return new Date(ts).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {dateStyle: 'medium', timeStyle: 'short'}); } catch(e){ return ''; } }
async function loadMsgs(){
  try { ADM.msgs = await api('GET', '/api/messages'); ADM.unread = 0; } catch(e){ ADM.msgs = {error: errText(e)}; }
  if (ADM.tab === 'messages') put('#admList', admList());
}
function msgList(){
  const m = ADM.msgs;
  if (!m){ loadMsgs(); return `<p class="muted">${tt('Loading…', 'Chargement…')}</p>`; }
  if (m.error) return `<div class="adm-empty">${esc(m.error)}</div>`;
  const rows = (m.messages || []).map(x => `<div class="adm-item msg"><div><h4>${x.kind === 'support' ? `<span class="tagS${x.priority === 'urgent' ? ' warn' : ''}">${tt('Support', 'Support')}${x.priority === 'urgent' ? ' · ' + tt('Urgent', 'Urgent') : ''}</span> ` : ''}${esc(x.name)}${x.company ? ` · ${esc(x.company)}` : ''}</h4>${x.subject ? `<small><b>${esc(x.subject)}</b>${x.site ? ` · ${esc(x.site)}` : ''}</small>` : ''}
      <small><a href="mailto:${esc(x.email)}">${esc(x.email)}</a>${x.phone ? ` · ${esc(x.phone)}` : ''} · ${esc(when(x.at))}</small>
      <small>${[x.solution, x.budget, x.when, x.estimate && tt('Estimate ', 'Estimation ') + x.estimate].filter(Boolean).map(esc).join(' · ')}</small>
      ${x.message ? `<p>${esc(x.message)}</p>` : ''}</div>
    <div class="acts"><a class="btn sm" href="mailto:${esc(x.email)}">${tt('Reply', 'Répondre')}</a><button class="btn sm" type="button" data-a="msgdel" data-id="${esc(x.id)}">${tt('Delete', 'Supprimer')}</button></div></div>`).join('');
  const subs = m.subscribers || [];
  return `<p class="muted" style="margin-bottom:16px">${tt('Project requests from the contact page and tickets from the Support page.', 'Demandes de projet de la page contact et tickets de la page Support.')}</p>
    ${rows ? `<div class="adm-list">${rows}</div>` : `<div class="adm-empty">${tt('No messages yet.', 'Aucun message pour l’instant.')}</div>`}
    <h4 style="margin:28px 0 12px">${tt('Newsletter', 'Newsletter')} (${subs.length})</h4>
    ${subs.length ? `<div class="editor" style="margin:0"><textarea readonly style="min-height:120px">${esc(subs.map(s => s.email).join('\n'))}</textarea></div>` : `<div class="adm-empty">${tt('No subscribers yet.', 'Aucun inscrit pour l’instant.')}</div>`}`;
}
const ADM = {tab: 'projects', ed: null, note: '', busy: false};
const selOpts = (pairs, cur) => pairs.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');
const adminModeBadge = () => `<span class="adm-mode ok">● ${tt('Connected to your server', 'Connecté à votre serveur')}</span>`;
function admList(){
  if (ADM.tab === 'projects'){
    if (!state().PROJECTS.length) return `<div class="adm-empty">${tt('No projects yet. Click “New project” to publish your first finished site.', 'Aucun projet pour l’instant. Cliquez sur « Nouveau projet » pour publier votre premier site terminé.')}</div>`;
    return `<div class="adm-list">${state().PROJECTS.map(p => `<div class="adm-item"><div class="th">${p.cover ? `<img src="${esc(p.cover)}" alt="">` : ''}</div><div><h4>${esc(LL(p.title) || tt('Untitled', 'Sans titre'))}${p.featured ? ' ★' : ''}</h4><small>${esc(host(p.url) || '—')} · ${L(UI.types[p.type])} · ${catName(p.cat)} · ${p.shots.length} ${tt('images', 'images')}</small></div><div class="acts"><a class="btn sm" href="#p-${esc(p.id)}">${tt('View', 'Voir')}</a><button class="btn sm" type="button" data-a="edit" data-id="${esc(p.id)}">${tt('Edit', 'Modifier')}</button><button class="btn sm" type="button" data-a="del" data-id="${esc(p.id)}">${tt('Delete', 'Supprimer')}</button></div></div>`).join('')}</div>`;
  }
  if (ADM.tab === 'solutions'){
    const tag = s => s.custom ? `<span class="tagS ok">${tt('Yours', 'À vous')}</span>` : s.edited ? `<span class="tagS ok">${tt('Edited', 'Modifiée')}</span>` : `<span class="tagS">${tt('Sample', 'Exemple')}</span>`;
    const row = s => `<div class="adm-item"><div class="th">${s.cover ? `<img src="${esc(s.cover)}" alt="">` : ''}</div><div><h4>${esc(s.name)}${tag(s)}${hasVid(s) ? '<span class="tagS">▶</span>' : ''}</h4><small>${money(s.price)} · ${esc(s.weeks)} ${t('weeks')} · ${L(UI.types[s.type])} · ${catName(s.cat)}</small></div><div class="acts"><a class="btn sm" href="#s-${esc(s.id)}">${tt('View', 'Voir')}</a><button class="btn sm" type="button" data-a="edit" data-id="${esc(s.id)}">${tt('Edit', 'Modifier')}</button>${s.custom ? `<button class="btn sm" type="button" data-a="del" data-id="${esc(s.id)}">${tt('Delete', 'Supprimer')}</button>` : `${s.edited ? `<button class="btn sm" type="button" data-a="reset" data-id="${esc(s.id)}">${tt('Reset', 'Rétablir')}</button>` : ''}<button class="btn sm" type="button" data-a="hide" data-id="${esc(s.id)}">${tt('Hide', 'Masquer')}</button>`}</div></div>`;
    const hidden = SAMPLE_SOL.filter(x => (DATA.settings.hiddenSamples || []).includes(x.id));
    return `<p class="muted" style="margin-bottom:16px">${tt('Every solution is editable: name, prices, delivery time, texts, screenshots and video. Samples you edit become yours.', 'Chaque solution est modifiable : nom, prix, délai, textes, captures et vidéo. Les exemples modifiés deviennent les vôtres.')}</p><div class="adm-list">${state().SOL.map(row).join('')}</div>
      ${hidden.length ? `<h4 style="margin:28px 0 12px">${tt('Hidden samples', 'Exemples masqués')}</h4><div class="adm-list">${hidden.map(x => `<div class="adm-item"><div class="th"><img src="${esc(x.cover)}" alt=""></div><div><h4>${esc(x.name)}</h4><small>${money(x.price)}</small></div><div class="acts"><button class="btn sm" type="button" data-a="unhide" data-id="${x.id}">${tt('Show again', 'Réafficher')}</button></div></div>`).join('')}</div>` : ''}`;
  }
  if (ADM.tab === 'slider') return slAdmList();
  if (ADM.tab === 'messages') return msgList();
  if (LS[ADM.tab]) return lsList();
  if (ADM.tab === 'categories'){
    return `<p class="muted" style="margin-bottom:18px">${tt('Replace any category background with your own photo.', 'Remplacez le fond de n’importe quelle catégorie par votre propre photo.')}</p><div class="cat-adm">${CATS.map(c => `<div><div class="im" style="background-image:url('${esc(catImg(c))}')"></div><div class="cb"><b>${L(c.name)}</b><span style="display:flex;gap:6px"><label class="btn sm" style="cursor:pointer">${tt('Change', 'Changer')}<input type="file" accept="image/*" data-catimg="${c.id}" hidden></label>${DATA.settings.catImg?.[c.id] ? `<button class="btn sm" type="button" data-a="catreset" data-id="${c.id}">${tt('Reset', 'Rétablir')}</button>` : ''}</span></div></div>`).join('')}</div>`;
  }
  return `<div class="editor" style="margin:0"><label class="sw"><input type="checkbox" id="setSamples" ${DATA.settings.hideSamples ? '' : 'checked'}> ${tt('Show the sample solutions in the hub next to yours', 'Afficher les solutions d’exemple dans le hub à côté des vôtres')}</label>
    <div class="row2" style="margin-top:22px"><div><label for="setWa">${tt('WhatsApp number for the Support page (with country code)', 'Numéro WhatsApp pour la page Support (avec indicatif)')}</label><input id="setWa" inputmode="tel" placeholder="+225 07 00 00 00 00" value="${esc(DATA.settings.whatsapp || '')}"></div><div><label for="setMail">${tt('Support email', 'Email du support')}</label><input id="setMail" type="email" placeholder="contact@teknons.com" value="${esc(DATA.settings.supportEmail || '')}"></div></div>
    <div class="adm-actions" style="margin-top:12px"><button class="btn gold sm" type="button" data-a="setcontact">${tt('Save contact details', 'Enregistrer les coordonnées')}</button></div>
    <div class="adm-actions" style="margin-top:20px"><button class="btn sm" type="button" data-a="logout">${tt('Log out', 'Se déconnecter')}</button></div></div>`;
}
function imgField(ed){
  return `<div><label>${tt('Screenshots and images', 'Captures et images')}</label>
    <div class="drop" id="drop"><input type="file" id="fileIn" accept="image/png,image/jpeg,image/webp,image/gif" multiple>${tt('Drop images here or click to choose. The ★ image is the cover.', 'Déposez vos images ici ou cliquez pour choisir. L’image ★ sert de couverture.')}</div>
    <div class="thumbs">${ed.shots.map((s, i) => `<div class="tb"><img src="${esc(s)}" alt=""><button class="btn sm cov" type="button" data-a="cover" data-i="${i}" title="${tt('Use as cover', 'Utiliser comme couverture')}" style="${ed.cover === s ? 'background:var(--metal);color:#1A1205' : ''}">★</button><div class="tools">${i ? `<button type="button" data-a="left" data-i="${i}">←</button>` : ''}<button type="button" data-a="rm" data-i="${i}">✕</button></div></div>`).join('')}</div></div>`;
}
function videoField(ed){
  const d = ed.obj, cur = {video: ed.video, cover: ed.cover, embed: '', videoDur: ed.videoDur};
  return `<div><label>${tt('Video presentation (up to 5 minutes)', 'Présentation vidéo (5 minutes maximum)')}</label>
    ${ed.video ? `<div class="vid-box">${playerHtml(cur)}<div class="adm-actions"><span class="muted">${fmtDur(ed.videoDur)}</span><button class="btn sm" type="button" data-a="vrm">${tt('Remove video', 'Retirer la vidéo')}</button></div></div>`
      : `<div class="drop" id="vdrop"><input type="file" id="vidIn" accept="video/mp4,video/webm">${tt('Drop an MP4 or WebM video here, or click to choose.', 'Déposez une vidéo MP4 ou WebM ici, ou cliquez pour choisir.')}</div>`}
    <label for="fVideoUrl" style="margin-top:12px">${tt('Or paste a YouTube or Vimeo link', 'Ou collez un lien YouTube ou Vimeo')}</label><input id="fVideoUrl" inputmode="url" placeholder="https://youtu.be/…" value="${esc(d.videoUrl)}"></div>`;
}
function editorHtml(){
  const ed = ADM.ed, d = ed.obj, isP = ed.col === 'projects';
  const typeOpts = Object.keys(UI.types).map(k => [k, L(UI.types[k])]), catOpts = CATS.map(c => [c.id, L(c.name)]);
  const common = `<div class="row2"><div><label for="fType">${t('type')}</label><select id="fType">${selOpts(typeOpts, d.type)}</select></div><div><label for="fCat">${t('industry')}</label><select id="fCat">${selOpts(catOpts, d.cat)}</select></div></div>`;
  const body = isP ? `
    <div class="bi"><div><label class="lab-en" for="fTitleEn">${tt('Project name', 'Nom du projet')}</label><input id="fTitleEn" value="${esc(d.title?.en)}"></div><div><label class="lab-fr" for="fTitleFr">${tt('Project name', 'Nom du projet')}</label><input id="fTitleFr" value="${esc(d.title?.fr)}"></div></div>
    <div class="row2"><div><label for="fUrl">${tt('Live site link', 'Lien du site en ligne')}</label><input id="fUrl" inputmode="url" placeholder="https://" value="${esc(d.url)}"></div><div class="row2"><div><label for="fClient">Client</label><input id="fClient" value="${esc(d.client)}"></div><div><label for="fYear">${tt('Year', 'Année')}</label><input id="fYear" inputmode="numeric" value="${esc(d.year)}"></div></div></div>
    ${common}
    <div class="bi"><div><label class="lab-en" for="fSumEn">${tt('Short description', 'Description courte')}</label><textarea id="fSumEn" style="min-height:80px">${esc(d.summary?.en)}</textarea></div><div><label class="lab-fr" for="fSumFr">${tt('Short description', 'Description courte')}</label><textarea id="fSumFr" style="min-height:80px">${esc(d.summary?.fr)}</textarea></div></div>
    <div class="bi"><div><label class="lab-en" for="fBodyEn">${tt('Full story (optional)', 'Histoire complète (facultatif)')}</label><textarea id="fBodyEn" placeholder="${tt('The challenge, what you built, the results', 'Le défi, ce que vous avez construit, les résultats')}">${esc(d.body?.en)}</textarea></div><div><label class="lab-fr" for="fBodyFr">${tt('Full story (optional)', 'Histoire complète (facultatif)')}</label><textarea id="fBodyFr">${esc(d.body?.fr)}</textarea></div></div>
    <div><label for="fStack">${t('tech')} <span class="muted" style="font-weight:400">${tt('(comma separated)', '(séparées par des virgules)')}</span></label><input id="fStack" value="${esc((d.stack || []).join(', '))}" placeholder="Next.js, Laravel, PostgreSQL"></div>
    <label class="sw"><input type="checkbox" id="fFeat" ${d.featured ? 'checked' : ''}> ${tt('Feature on the home page', 'Mettre en avant sur l’accueil')}</label>`
  : `
    <div class="row2"><div><label for="fName">${tt('Solution name', 'Nom de la solution')}</label><input id="fName" value="${esc(d.name)}"></div><div><label for="fBadge">Badge</label><select id="fBadge">${selOpts([['', tt('None', 'Aucun')], ...Object.keys(BADGE).map(k => [k, L(BADGE[k])])], d.badge || '')}</select></div></div>
    ${common}
    <div class="row2"><div><label for="fPrice">${tt('Internal price, never shown on the site (optional)', 'Prix interne, jamais affiché sur le site (facultatif)')}</label><input id="fPrice" inputmode="numeric" value="${esc(d.price || '')}"></div><div><label for="fWeeks">${tt('Delivery in weeks, e.g. 4–6', 'Livraison en semaines, ex. 4–6')}</label><input id="fWeeks" value="${esc(d.weeks || '')}"></div></div>
    <div class="bi"><div><label class="lab-en" for="fTEn">${tt('Description', 'Description')}</label><textarea id="fTEn" style="min-height:80px">${esc(d.t?.en)}</textarea></div><div><label class="lab-fr" for="fTFr">${tt('Description', 'Description')}</label><textarea id="fTFr" style="min-height:80px">${esc(d.t?.fr)}</textarea></div></div>
    <div class="bi"><div><label class="lab-en" for="fFEn">${tt('Features, one per line', 'Fonctionnalités, une par ligne')}</label><textarea id="fFEn">${esc((d.f?.en || []).join('\n'))}</textarea></div><div><label class="lab-fr" for="fFFr">${tt('Features, one per line', 'Fonctionnalités, une par ligne')}</label><textarea id="fFFr">${esc((d.f?.fr || []).join('\n'))}</textarea></div></div>
    <div class="row2"><div><label for="fStack">${t('tech')}</label><input id="fStack" value="${esc((d.s || []).join(', '))}" placeholder="React, Node.js"></div><div><label for="fDemo">${tt('Demo link (optional)', 'Lien de démo (facultatif)')}</label><input id="fDemo" inputmode="url" value="${esc(d.demo)}" placeholder="https://"></div></div>`;
  return `<form class="editor form" id="edForm" novalidate><h3>${ed.isNew ? (isP ? tt('New project', 'Nouveau projet') : tt('New solution', 'Nouvelle solution')) : tt('Edit', 'Modifier')}</h3>
    ${body}${imgField(ed)}${videoField(ed)}
    <div class="adm-actions"><button class="btn gold" type="submit" ${ADM.busy ? 'disabled' : ''}>${ADM.busy ? tt('Working…', 'En cours…') : tt('Save and publish', 'Enregistrer et publier')}</button><button class="btn" type="button" data-a="cancel">${tt('Cancel', 'Annuler')}</button><p class="note" id="edNote" role="status">${esc(ADM.note)}</p></div></form>`;
}
function renderAdmin(){
  const el = $('#admin'); if (!el) return;
  if (!storeReady){ el.innerHTML = `<p class="muted">${tt('Loading…', 'Chargement…')}</p>`; return; }
  if (!Store.canEdit){
    put(el, `<form class="editor form login" id="loginForm"><h3>${tt('Sign in', 'Connexion')}</h3><div><label for="admPw">${tt('Admin password', 'Mot de passe admin')}</label><input id="admPw" type="password" autocomplete="current-password"></div><button class="btn gold" type="submit">${tt('Sign in', 'Se connecter')}</button><p class="note" id="loginNote" role="status"></p></form>`);
    return;
  }
  if (ADM.sed && $('#slForm')){ put('#admList', admList()); return; }
  if (ADM.ed && $('#edForm')){ put('#admList', admList()); return; }
  if (ADM.led && $('#lsForm')){ put('#admList', admList()); return; }
  const n = {projects: state().PROJECTS.length, solutions: state().SOL.length};
  const tabsH = [['projects', tt('Projects', 'Projets') + ` (${n.projects})`], ['solutions', 'Solutions' + ` (${n.solutions})`], ['slider', tt('Slider', 'Slider')], ['addons', tt('Add-ons', 'Options')], ['testimonials', tt('Testimonials', 'Témoignages')], ['categories', tt('Categories', 'Catégories')], ['messages', tt('Messages', 'Messages') + (ADM.unread ? ` (${ADM.unread})` : '')], ['settings', tt('Settings', 'Réglages')]];
  put(el, `<div class="adm-top"><div class="tabs" role="tablist" id="admTabs">${tabsH.map(([k, l]) => `<button role="tab" type="button" data-a="tab" data-t="${k}" aria-selected="${ADM.tab === k}">${l}</button>`).join('')}</div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${adminModeBadge()}${ADM.tab === 'slider' ? `<button class="btn gold sm" type="button" data-a="slnew">${tt('+ New slide', '+ Nouvelle slide')}</button>` : ''}${LS[ADM.tab] ? `<button class="btn gold sm" type="button" data-a="lsnew">${LS[ADM.tab].newLabel()}</button>` : ''}${ADM.tab === 'projects' || ADM.tab === 'solutions' ? `<button class="btn gold sm" type="button" data-a="new">${ADM.tab === 'projects' ? tt('+ New project', '+ Nouveau projet') : tt('+ New solution', '+ Nouvelle solution')}</button>` : ''}</div></div>
    ${ADM.sed && ADM.tab === 'slider' ? slEditorHtml() : ''}${ADM.ed ? editorHtml() : ''}${ADM.led && LS[ADM.tab] ? lsEditorHtml() : ''}<p class="note" id="admNote" role="status"></p><div id="admList">${admList()}</div>`);
}
function readEditor(){
  const ed = ADM.ed, v = id => ($('#' + id)?.value || '').trim(), d = {...ed.obj, type: v('fType'), cat: v('fCat'), shots: ed.shots, cover: ed.cover || ed.shots[0] || '', video: ed.video || '', videoDur: ed.videoDur || 0, videoUrl: v('fVideoUrl')};
  if (ed.col === 'projects') Object.assign(d, {title: {en: v('fTitleEn'), fr: v('fTitleFr')}, url: v('fUrl'), client: v('fClient'), year: v('fYear'), summary: {en: v('fSumEn'), fr: v('fSumFr')}, body: {en: v('fBodyEn'), fr: v('fBodyFr')}, stack: v('fStack').split(',').map(x => x.trim()).filter(Boolean), featured: $('#fFeat').checked});
  else Object.assign(d, {name: v('fName'), badge: v('fBadge'), price: parseInt(v('fPrice').replace(/[^\d]/g, '')) || 0, weeks: v('fWeeks'), t: {en: v('fTEn'), fr: v('fTFr')}, f: {en: lines(v('fFEn')), fr: lines(v('fFFr'))}, s: v('fStack').split(',').map(x => x.trim()).filter(Boolean), demo: v('fDemo')});
  return d;
}
const errText = e => ({auth: tt('Your session expired. Sign in again.', 'Votre session a expiré. Reconnectez-vous.'), local_full: tt('This browser is out of space for demo images. Use fewer or smaller images.', 'Ce navigateur manque d’espace pour les images de démo. Utilisez moins d’images ou des images plus petites.'), unsupported_type: tt('Use PNG, JPEG, WebP or GIF images.', 'Utilisez des images PNG, JPEG, WebP ou GIF.'), too_large: tt('That image is too large.', 'Cette image est trop lourde.'), quota_or_state: tt('Storage is full. Delete unused images first.', 'Le stockage est plein. Supprimez d’abord des images inutilisées.'), http_413: tt('This file is over the server upload limit. Compress it (720p works well for video) or paste a YouTube link instead.', 'Ce fichier dépasse la limite d’envoi du serveur. Compressez-le (720p suffit pour une vidéo) ou collez un lien YouTube.')}[e && e.code] || tt('Something went wrong. Please try again.', 'Une erreur est survenue. Veuillez réessayer.'));
function setNote(id, msg){ const n = $('#' + id); if (n) n.textContent = msg; }
function syncEditor(){ const d = readEditor(); ADM.ed.obj = d; const f = $('#edForm'); if (f) f.outerHTML = editorHtml(); }
async function addVideo(file){
  ADM.ed.obj = readEditor();
  if (!/^video\/(mp4|webm)$/.test(file.type)){ ADM.note = tt('Use an MP4 or WebM video.', 'Utilisez une vidéo MP4 ou WebM.'); syncEditor(); return; }
  const dur = await videoDuration(file);
  if (dur > 305){ ADM.note = tt(`This video lasts ${fmtDur(dur)}. The limit is 5 minutes.`, `Cette vidéo dure ${fmtDur(dur)}. La limite est de 5 minutes.`); syncEditor(); return; }
  ADM.busy = true; ADM.note = tt(`Uploading the video (${(file.size / 1048576).toFixed(1)} MB)…`, `Envoi de la vidéo (${(file.size / 1048576).toFixed(1)} Mo)…`); syncEditor();
  try { ADM.ed.video = await storeUploadVideo(file); ADM.ed.videoDur = Math.round(dur) || 0; ADM.note = ''; }
  catch(e){ ADM.note = errText(e); }
  ADM.busy = false; syncEditor();
}
async function addFiles(files){
  const list = [...files].filter(f => f.type.startsWith('image/')); if (!list.length) return;
  ADM.ed.obj = readEditor(); ADM.busy = true; ADM.note = tt(`Uploading ${list.length} image(s)…`, `Envoi de ${list.length} image(s)…`); syncEditor();
  try { for (const f of list){ const url = await storeUpload(f); ADM.ed.shots.push(url); if (!ADM.ed.cover) ADM.ed.cover = url; } ADM.note = ''; }
  catch(e){ ADM.note = errText(e); }
  ADM.busy = false; syncEditor();
}
$('#admin').addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b) { if (e.target.closest('#drop') && e.target.id !== 'fileIn') $('#fileIn').click(); if (e.target.closest('#vdrop') && e.target.id !== 'vidIn') $('#vidIn').click(); return; }
  const a = b.dataset.a, ed = ADM.ed;
  if (a === 'tab'){ ADM.tab = b.dataset.t; ADM.ed = null; ADM.sed = null; if (ADM.tab === 'messages') ADM.msgs = null; ADM.led = null; renderAdmin(); }
  if (a === 'new'){ const isP = ADM.tab === 'projects'; ADM.ed = {col: ADM.tab, isNew: true, obj: isP ? {id: uid('p'), type: 'Website', cat: 'corporate', createdAt: Date.now()} : {id: uid('sol'), type: 'Web App', cat: 'saas', createdAt: Date.now()}, shots: [], cover: ''}; ADM.note = ''; renderAdmin(); $('#edForm')?.scrollIntoView({behavior: 'smooth', block: 'start'}); }
  if (a === 'edit'){ const id = b.dataset.id, smp = ADM.tab === 'solutions' && SAMPLE_SOL.find(x => x.id === id), own = DATA[ADM.tab].find(x => x.id === id);
    const src = smp ? {...sampleDoc(smp), ...(own || {})} : own; if (!src) return;
    const n = ADM.tab === 'projects' ? normProject(src) : normSol(src); ADM.ed = {col: ADM.tab, isNew: false, obj: JSON.parse(JSON.stringify(src)), shots: [...n.shots], cover: n.cover, video: n.video, videoDur: n.videoDur}; ADM.note = ''; renderAdmin(); $('#edForm')?.scrollIntoView({behavior: 'smooth', block: 'start'}); }
  if (a === 'cancel'){ ADM.ed = null; renderAdmin(); }
  if (a === 'vrm' && ed){ ed.obj = readEditor(); ed.video = ''; ed.videoDur = 0; syncEditor(); }
  if (a === 'hide' || a === 'unhide'){ const cur = new Set(DATA.settings.hiddenSamples || []); a === 'hide' ? cur.add(b.dataset.id) : cur.delete(b.dataset.id); try { await storeSettings({hiddenSamples: [...cur]}); renderAdmin(); setNote('admNote', a === 'hide' ? tt('Hidden from the hub.', 'Masquée du hub.') : tt('Back in the hub.', 'De retour dans le hub.')); } catch(err){ setNote('admNote', errText(err)); } }
  if (a === 'reset'){ if (!confirm(tt('Restore the original sample and discard your changes?', 'Rétablir l’exemple d’origine et annuler vos modifications ?'))) return; try { await storeDelete('solutions', b.dataset.id); ADM.ed = null; renderAdmin(); setNote('admNote', tt('Restored.', 'Rétabli.')); } catch(err){ setNote('admNote', errText(err)); } }
  if (a === 'del'){ if (!confirm(tt('Delete this item from the public site? This cannot be undone.', 'Supprimer cet élément du site public ? Action irréversible.'))) return; try { await storeDelete(ADM.tab, b.dataset.id); if (ADM.ed?.obj.id === b.dataset.id) ADM.ed = null; renderAdmin(); setNote('admNote', tt('Deleted.', 'Supprimé.')); } catch(err){ setNote('admNote', errText(err)); } }
  if (a === 'cover' && ed){ ed.obj = readEditor(); ed.cover = ed.shots[+b.dataset.i]; syncEditor(); }
  if (a === 'rm' && ed){ ed.obj = readEditor(); const [x] = ed.shots.splice(+b.dataset.i, 1); if (ed.cover === x) ed.cover = ed.shots[0] || ''; syncEditor(); }
  if (a === 'left' && ed){ ed.obj = readEditor(); const i = +b.dataset.i; [ed.shots[i - 1], ed.shots[i]] = [ed.shots[i], ed.shots[i - 1]]; syncEditor(); }
  if (a === 'catreset'){ const m = {...(DATA.settings.catImg || {})}; delete m[b.dataset.id]; try { await storeSettings({catImg: m}); renderAdmin(); } catch(err){ setNote('admNote', errText(err)); } }
  if (a === 'logout'){ Store.token = null; Store.canEdit = false; try { sessionStorage.removeItem('tk-admin'); } catch(err) {} renderAdmin(); }
});
$('#admin').addEventListener('change', async e => {
  if (e.target.id === 'fileIn'){ await addFiles(e.target.files); return; }
  if (e.target.id === 'vidIn'){ if (e.target.files[0]) await addVideo(e.target.files[0]); return; }
  if (e.target.id === 'setSamples'){ try { await storeSettings({hideSamples: !e.target.checked}); setNote('admNote', tt('Saved.', 'Enregistré.')); } catch(err){ setNote('admNote', errText(err)); } return; }
  const c = e.target.dataset.catimg;
  if (c && e.target.files[0]){ setNote('admNote', tt('Uploading…', 'Envoi…')); try { const url = await storeUpload(e.target.files[0]); await storeSettings({catImg: {...(DATA.settings.catImg || {}), [c]: url}}); renderAdmin(); setNote('admNote', tt('Category image updated.', 'Image de catégorie mise à jour.')); } catch(err){ setNote('admNote', errText(err)); } }
});
['dragover', 'dragleave', 'drop'].forEach(ev => $('#admin').addEventListener(ev, e => {
  const vd = e.target.closest('#vdrop');
  if (vd){ e.preventDefault(); vd.classList.toggle('over', ev === 'dragover'); if (ev === 'drop' && e.dataTransfer.files[0]) addVideo(e.dataTransfer.files[0]); return; }
  const d = e.target.closest('#drop'); if (!d) return; e.preventDefault();
  d.classList.toggle('over', ev === 'dragover');
  if (ev === 'drop') addFiles(e.dataTransfer.files);
}));
$('#admin').addEventListener('submit', async e => {
  e.preventDefault();
  if (e.target.id === 'loginForm'){
    setNote('loginNote', tt('Checking…', 'Vérification…'));
    try { const r = await fetch('/api/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({password: $('#admPw').value})});
      if (!r.ok) throw 0; Store.token = (await r.json()).token; Store.canEdit = true; try { sessionStorage.setItem('tk-admin', Store.token); } catch(err) {} renderAdmin(); }
    catch(err){ setNote('loginNote', tt('Wrong password.', 'Mot de passe incorrect.')); }
    return;
  }
  if (e.target.id !== 'edForm' || ADM.busy) return;
  const d = readEditor(), isP = ADM.ed.col === 'projects';
  if (isP ? !(d.title.en || d.title.fr) : !d.name){ setNote('edNote', tt('Add a name first.', 'Ajoutez d’abord un nom.')); return; }
  if (d.videoUrl && !embedUrl(d.videoUrl)){ setNote('edNote', tt('The video link must be a YouTube or Vimeo address.', 'Le lien vidéo doit être une adresse YouTube ou Vimeo.')); return; }
  if (isP && d.url && !safeUrl(d.url)){ setNote('edNote', tt('The site link does not look like a web address.', 'Le lien du site ne ressemble pas à une adresse web.')); return; }
  ADM.busy = true; ADM.ed.obj = d; ADM.note = ''; syncEditor();
  try { await storeSave(ADM.ed.col, d); ADM.busy = false; ADM.ed = null; renderAdmin(); setNote('admNote', isP ? tt('Published. The project is now on the site.', 'Publié. Le projet est maintenant sur le site.') : tt('Published. The solution is now in the hub.', 'Publié. La solution est maintenant dans le hub.')); }
  catch(err){ ADM.busy = false; ADM.note = errText(err); syncEditor(); }
});

// ---------- Admin → Slider ----------
function slAdmList(){
  const list = allSlides(), custom = Array.isArray(DATA.settings.slides) && DATA.settings.slides.length;
  return `<p class="muted" style="margin-bottom:16px">${tt('The video slider under the hero. Change the videos, texts and buttons, reorder slides or hide them. Put a word between *stars* to make it gold.', 'Le slider vidéo sous le hero. Changez les vidéos, textes et boutons, réordonnez ou masquez les slides. Mettez un mot entre *étoiles* pour le dorer.')}</p>
    <div class="adm-list">${list.map((s, i) => `<div class="adm-item"><div class="th">${s.poster ? `<img src="${esc(s.poster)}" alt="">` : ''}</div><div><h4>${String(i + 1).padStart(2, '0')} · ${esc(LL(s.title).replace(/\*/g, '')) || tt('Untitled', 'Sans titre')}${s.hidden ? `<span class="tagS">${tt('Hidden', 'Masquée')}</span>` : ''}${s.video ? '<span class="tagS">▶</span>' : ''}</h4><small>${esc(LL(s.label))}</small></div><div class="acts">${i ? `<button class="btn sm" type="button" data-a="slup" data-i="${i}" aria-label="${tt('Move up', 'Monter')}">↑</button>` : ''}<button class="btn sm" type="button" data-a="sledit" data-i="${i}">${tt('Edit', 'Modifier')}</button><button class="btn sm" type="button" data-a="slhide" data-i="${i}">${s.hidden ? tt('Show', 'Afficher') : tt('Hide', 'Masquer')}</button><button class="btn sm" type="button" data-a="sldel" data-i="${i}">${tt('Delete', 'Supprimer')}</button></div></div>`).join('')}</div>
    ${custom ? `<div class="adm-actions" style="margin-top:18px"><button class="btn sm" type="button" data-a="slreset">${tt('Restore the original slides', 'Rétablir les slides d’origine')}</button></div>` : ''}`;
}
function slEditorHtml(){
  const ed = ADM.sed, d = ed.obj, bi = (k, lab, area) => `<div class="bi"><div><label class="lab-en" for="s${k}En">${lab}</label>${area ? `<textarea id="s${k}En" style="min-height:70px">${esc(d[k]?.en)}</textarea>` : `<input id="s${k}En" value="${esc(d[k]?.en)}">`}</div><div><label class="lab-fr" for="s${k}Fr">${lab}</label>${area ? `<textarea id="s${k}Fr" style="min-height:70px">${esc(d[k]?.fr)}</textarea>` : `<input id="s${k}Fr" value="${esc(d[k]?.fr)}">`}</div></div>`;
  return `<form class="editor form" id="slForm" novalidate><h3>${ed.isNew ? tt('New slide', 'Nouvelle slide') : tt('Edit slide', 'Modifier la slide')}</h3>
    ${bi('title', tt('Title (use *stars* for gold words)', 'Titre (mettez des *étoiles* pour dorer)'))}${bi('eyebrow', tt('Small line above the title', 'Petite ligne au-dessus du titre'))}${bi('text', tt('Text', 'Texte'), true)}${bi('label', tt('Short name on the thumbnail', 'Nom court sur la vignette'))}
    ${bi('b1', tt('Main button text', 'Texte du bouton principal'))}<div><label for="sl1">${tt('Main button link (e.g. #contact or https://…)', 'Lien du bouton principal (ex. #contact ou https://…)')}</label><input id="sl1" value="${esc(d.l1)}"></div>
    ${bi('b2', tt('Second button text', 'Texte du second bouton'))}<div><label for="sl2">${tt('Second button link', 'Lien du second bouton')}</label><input id="sl2" value="${esc(d.l2)}"></div>
    <div><label for="sChips">${tt('Tags (comma separated)', 'Étiquettes (séparées par des virgules)')}</label><input id="sChips" value="${esc(d.chips)}"></div>
    <div><label>${tt('Background video', 'Vidéo de fond')}</label>
      ${d.video ? `<div class="vid-box"><video muted playsinline loop autoplay src="${esc(d.video)}"${d.poster ? ` poster="${esc(d.poster)}"` : ''}></video><div class="adm-actions"><button class="btn sm" type="button" data-a="slvrm">${tt('Remove video', 'Retirer la vidéo')}</button></div></div>`
        : `<div class="drop" id="sldrop"><input type="file" id="slVidIn" accept="video/mp4,video/webm">${tt('Drop an MP4 or WebM video here (short loops of 8–20 s work best, no sound needed).', 'Déposez une vidéo MP4 ou WebM ici (des boucles courtes de 8 à 20 s sont idéales, sans son).')}</div>`}
      <label for="sVidUrl" style="margin-top:12px">${tt('Or paste a direct .mp4 link', 'Ou collez un lien .mp4 direct')}</label><input id="sVidUrl" inputmode="url" placeholder="https://…/video.mp4" value="${esc(/^https:/.test(d.video) ? d.video : '')}"></div>
    <div><label>${tt('Poster image (shown while the video loads, and on the thumbnail)', 'Image d’attente (affichée pendant le chargement et sur la vignette)')}</label>
      <div class="thumbs">${d.poster ? `<div class="tb"><img src="${esc(d.poster)}" alt=""><div class="tools"><button type="button" data-a="slprm">✕</button></div></div>` : ''}</div>
      <label class="btn sm" style="cursor:pointer;margin-top:8px">${tt('Choose an image', 'Choisir une image')}<input type="file" id="slPosterIn" accept="image/*" hidden></label></div>
    <div class="adm-actions"><button class="btn gold" type="submit" ${ADM.busy ? 'disabled' : ''}>${ADM.busy ? tt('Working…', 'En cours…') : tt('Save and publish', 'Enregistrer et publier')}</button><button class="btn" type="button" data-a="slcancel">${tt('Cancel', 'Annuler')}</button><p class="note" id="slNote" role="status">${esc(ADM.note)}</p></div></form>`;
}
function slRead(){
  const v = id => ($('#' + id)?.value || '').trim(), two = k => ({en: v('s' + k + 'En'), fr: v('s' + k + 'Fr')}), d = ADM.sed.obj;
  const url = v('sVidUrl');
  return {...d, title: two('title'), eyebrow: two('eyebrow'), text: two('text'), label: two('label'), b1: two('b1'), l1: v('sl1'), b2: two('b2'), l2: v('sl2'), chips: v('sChips'), video: url || (/^https:/.test(d.video) ? '' : d.video)};
}
function slSync(){ ADM.sed.obj = slRead(); const f = $('#slForm'); if (f) f.outerHTML = slEditorHtml(); }
async function slSaveAll(list){ await storeSettings({slides: list.map((s, i) => ({...s, id: s.id || 'slide-' + i}))}); }
async function slAddVideo(file){
  ADM.sed.obj = slRead();
  if (!/^video\/(mp4|webm)$/.test(file.type)){ ADM.note = tt('Use an MP4 or WebM video.', 'Utilisez une vidéo MP4 ou WebM.'); slSync(); return; }
  ADM.busy = true; ADM.note = tt(`Uploading the video (${(file.size / 1048576).toFixed(1)} MB)…`, `Envoi de la vidéo (${(file.size / 1048576).toFixed(1)} Mo)…`); slSync();
  try { ADM.sed.obj.video = await storeUploadVideo(file); ADM.note = ''; } catch(e){ ADM.note = errText(e); }
  ADM.busy = false; slSync();
}
$('#admin').addEventListener('click', async e => {
  const b = e.target.closest('[data-a]');
  if (!b){ if (e.target.closest('#sldrop') && e.target.id !== 'slVidIn') $('#slVidIn').click(); return; }
  const a = b.dataset.a; if (!a.startsWith('sl')) return;
  const list = allSlides(), i = +b.dataset.i;
  const save = async (next, msg) => { try { await slSaveAll(next); ADM.sed = null; renderAdmin(); setNote('admNote', msg || tt('Saved. The slider is updated.', 'Enregistré. Le slider est à jour.')); } catch(err){ setNote('admNote', errText(err)); } };
  if (a === 'sledit'){ ADM.sed = {i, isNew: false, obj: JSON.parse(JSON.stringify(list[i]))}; ADM.note = ''; renderAdmin(); $('#slForm')?.scrollIntoView({behavior: 'smooth', block: 'start'}); }
  if (a === 'slnew'){ ADM.sed = {i: list.length, isNew: true, obj: normSlide({id: uid('slide'), l1: '#contact', b1: {en: 'Start your project', fr: 'Lancer votre projet'}}, list.length)}; ADM.note = ''; renderAdmin(); $('#slForm')?.scrollIntoView({behavior: 'smooth', block: 'start'}); }
  if (a === 'slcancel'){ ADM.sed = null; renderAdmin(); }
  if (a === 'slup'){ [list[i - 1], list[i]] = [list[i], list[i - 1]]; await save(list); }
  if (a === 'slhide'){ list[i].hidden = !list[i].hidden; await save(list); }
  if (a === 'sldel'){ if (!confirm(tt('Delete this slide?', 'Supprimer cette slide ?'))) return; list.splice(i, 1); if (!list.length){ setNote('admNote', tt('Keep at least one slide, or hide them instead.', 'Gardez au moins une slide, ou masquez-les.')); return; } await save(list); }
  if (a === 'slreset'){ if (!confirm(tt('Restore the original slides and discard your changes?', 'Rétablir les slides d’origine et annuler vos modifications ?'))) return; try { await storeSettings({slides: null}); ADM.sed = null; renderAdmin(); setNote('admNote', tt('Restored.', 'Rétabli.')); } catch(err){ setNote('admNote', errText(err)); } }
  if (a === 'slvrm' && ADM.sed){ ADM.sed.obj = slRead(); ADM.sed.obj.video = ''; slSync(); }
  if (a === 'slprm' && ADM.sed){ ADM.sed.obj = slRead(); ADM.sed.obj.poster = ''; slSync(); }
});
$('#admin').addEventListener('change', async e => {
  if (e.target.id === 'slVidIn' && e.target.files[0]) await slAddVideo(e.target.files[0]);
  if (e.target.id === 'slPosterIn' && e.target.files[0]){ ADM.sed.obj = slRead(); ADM.busy = true; ADM.note = tt('Uploading…', 'Envoi…'); slSync();
    try { ADM.sed.obj.poster = await storeUpload(e.target.files[0]); ADM.note = ''; } catch(err){ ADM.note = errText(err); } ADM.busy = false; slSync(); }
});
['dragover', 'dragleave', 'drop'].forEach(ev => $('#admin').addEventListener(ev, e => {
  const d = e.target.closest('#sldrop'); if (!d) return; e.preventDefault(); d.classList.toggle('over', ev === 'dragover');
  if (ev === 'drop' && e.dataTransfer.files[0]) slAddVideo(e.dataTransfer.files[0]);
}));
$('#admin').addEventListener('submit', async e => {
  if (e.target.id !== 'slForm') return; e.preventDefault(); if (ADM.busy) return;
  const d = slRead(); ADM.sed.obj = d;
  if (!(d.title.en || d.title.fr)){ setNote('slNote', tt('Add a title first.', 'Ajoutez d’abord un titre.')); return; }
  if (d.video && !safeBgVid(d.video)){ setNote('slNote', tt('The video link must be a direct https link ending in .mp4 or .webm.', 'Le lien vidéo doit être un lien https direct se terminant par .mp4 ou .webm.')); return; }
  for (const l of [d.l1, d.l2]) if (l && !safeLink(l)){ setNote('slNote', tt('A button link should start with # or be a web address.', 'Un lien de bouton doit commencer par # ou être une adresse web.')); return; }
  const list = allSlides(); list[ADM.sed.i] = d;
  ADM.busy = true; slSync();
  try { await slSaveAll(list); ADM.busy = false; ADM.sed = null; renderAdmin(); setNote('admNote', tt('Published. The slider is updated.', 'Publié. Le slider est à jour.')); }
  catch(err){ ADM.busy = false; ADM.note = errText(err); slSync(); }
});
// ---------- Admin: add-ons and testimonials ----------
const LS = {
  addons: {key: 'addons', all: () => allAddons(), norm: normAddon, newLabel: () => tt('+ New add-on', '+ Nouvelle option'), resettable: true,
    blank: () => normAddon({id: uid('addon'), cat: 'sales', icon: 'code', price: 0, unit: 'once'}, 0),
    title: x => LL(x.name), sub: x => `${money(x.price)} · ${L(ADDON_CATS[x.cat])}`,
    intro: () => tt('Extras shown on the Add-ons page, with their starting price. Reorder, hide or edit them.', 'Les options affichées sur la page Options, avec leur prix de départ. Réordonnez, masquez ou modifiez-les.'),
    form: d => `<div class="bi"><div><label class="lab-en" for="lnameEn">${tt('Name', 'Nom')}</label><input id="lnameEn" value="${esc(d.name.en)}"></div><div><label class="lab-fr" for="lnameFr">${tt('Name', 'Nom')}</label><input id="lnameFr" value="${esc(d.name.fr)}"></div></div>
      <div class="bi"><div><label class="lab-en" for="ldescEn">Description</label><textarea id="ldescEn" style="min-height:80px">${esc(d.desc.en)}</textarea></div><div><label class="lab-fr" for="ldescFr">Description</label><textarea id="ldescFr" style="min-height:80px">${esc(d.desc.fr)}</textarea></div></div>
      <div class="row2"><div><label for="lprice">${tt('Internal price, never shown on the site (optional)', 'Prix interne, jamais affiché sur le site (facultatif)')}</label><input id="lprice" inputmode="numeric" value="${d.price || ''}"></div><div><label for="lunit">${tt('Billed', 'Facturation')}</label><select id="lunit">${selOpts([['once', tt('One-time', 'Paiement unique')], ['month', tt('Per month', 'Par mois')], ['lang', tt('Per language', 'Par langue')]], d.unit)}</select></div></div>
      <div class="row2"><div><label for="lcat">${tt('Category', 'Catégorie')}</label><select id="lcat">${selOpts(Object.keys(ADDON_CATS).map(k => [k, L(ADDON_CATS[k])]), d.cat)}</select></div><div><label for="licon">${tt('Icon', 'Icône')}</label><select id="licon">${selOpts(Object.keys(ICONS).map(k => [k, k]), d.icon)}</select></div></div>`,
    read: (d, v) => ({...d, name: {en: v('lnameEn'), fr: v('lnameFr')}, desc: {en: v('ldescEn'), fr: v('ldescFr')}, price: parseInt(v('lprice').replace(/[^\d]/g, '')) || 0, unit: v('lunit'), cat: v('lcat'), icon: v('licon')}),
    valid: d => d.name.en || d.name.fr},
  testimonials: {key: 'testimonials', all: () => allTestis(), norm: normTesti, newLabel: () => tt('+ New testimonial', '+ Nouveau témoignage'), resettable: false,
    blank: () => normTesti({id: uid('tm'), rating: 5}, 0),
    title: x => x.name, sub: x => `${'★'.repeat(x.rating)} · ${x.role || ''}`,
    intro: () => tt('Real quotes from your clients. The testimonials section appears on the home page as soon as you publish one.', 'De vraies citations de vos clients. La section témoignages apparaît sur l’accueil dès que vous en publiez un.'),
    form: d => `<div class="row2"><div><label for="lname">${tt('Client name', 'Nom du client')}</label><input id="lname" value="${esc(d.name)}"></div><div><label for="lrole">${tt('Role and company', 'Fonction et entreprise')}</label><input id="lrole" value="${esc(d.role)}" placeholder="CEO, Atlas Bank"></div></div>
      <div class="bi"><div><label class="lab-en" for="lqEn">${tt('Quote', 'Citation')}</label><textarea id="lqEn" style="min-height:90px">${esc(d.quote.en)}</textarea></div><div><label class="lab-fr" for="lqFr">${tt('Quote', 'Citation')}</label><textarea id="lqFr" style="min-height:90px">${esc(d.quote.fr)}</textarea></div></div>
      <div class="row2"><div><label for="lrate">${tt('Rating', 'Note')}</label><select id="lrate">${selOpts([5, 4, 3].map(n => [String(n), '★'.repeat(n)]), String(d.rating))}</select></div><div><label>${tt('Photo (optional)', 'Photo (facultatif)')}</label><div style="display:flex;gap:10px;align-items:center">${d.photo ? `<img src="${esc(d.photo)}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover"><button class="btn sm" type="button" data-a="lsphrm">✕</button>` : ''}<label class="btn sm" style="cursor:pointer">${tt('Choose', 'Choisir')}<input type="file" id="lsPhoto" accept="image/*" hidden></label></div></div></div>`,
    read: (d, v) => ({...d, name: v('lname'), role: v('lrole'), quote: {en: v('lqEn'), fr: v('lqFr')}, rating: +v('lrate') || 5}),
    valid: d => d.name && (d.quote.en || d.quote.fr)},
};
function lsList(){
  const C = LS[ADM.tab], list = C.all(), custom = Array.isArray(DATA.settings[C.key]) && DATA.settings[C.key].length;
  return `<p class="muted" style="margin-bottom:16px">${C.intro()}</p>
    ${list.length ? `<div class="adm-list">${list.map((x, i) => `<div class="adm-item"><div class="th">${C.key === 'addons' ? `<div style="display:grid;place-items:center;height:100%;color:var(--accent)">${icon(x.icon, 28)}</div>` : x.photo ? `<img src="${esc(x.photo)}" alt="">` : ''}</div><div><h4>${esc(C.title(x)) || tt('Untitled', 'Sans titre')}${x.hidden ? `<span class="tagS">${tt('Hidden', 'Masqué')}</span>` : ''}</h4><small>${esc(C.sub(x))}</small></div><div class="acts">${i ? `<button class="btn sm" type="button" data-a="lsup" data-i="${i}" aria-label="${tt('Move up', 'Monter')}">↑</button>` : ''}<button class="btn sm" type="button" data-a="lsedit" data-i="${i}">${tt('Edit', 'Modifier')}</button><button class="btn sm" type="button" data-a="lshide" data-i="${i}">${x.hidden ? tt('Show', 'Afficher') : tt('Hide', 'Masquer')}</button><button class="btn sm" type="button" data-a="lsdel" data-i="${i}">${tt('Delete', 'Supprimer')}</button></div></div>`).join('')}</div>`
      : `<div class="adm-empty">${tt('Nothing yet. Click the button above to add the first one.', 'Rien pour l’instant. Cliquez sur le bouton ci-dessus pour ajouter le premier.')}</div>`}
    ${C.resettable && custom ? `<div class="adm-actions" style="margin-top:18px"><button class="btn sm" type="button" data-a="lsreset">${tt('Restore the original list', 'Rétablir la liste d’origine')}</button></div>` : ''}`;
}
function lsEditorHtml(){
  const C = LS[ADM.tab], ed = ADM.led;
  return `<form class="editor form" id="lsForm" novalidate><h3>${ed.isNew ? C.newLabel().replace('+ ', '') : tt('Edit', 'Modifier')}</h3>${C.form(ed.obj)}
    <div class="adm-actions"><button class="btn gold" type="submit" ${ADM.busy ? 'disabled' : ''}>${ADM.busy ? tt('Working…', 'En cours…') : tt('Save and publish', 'Enregistrer et publier')}</button><button class="btn" type="button" data-a="lscancel">${tt('Cancel', 'Annuler')}</button><p class="note" id="lsNote" role="status">${esc(ADM.note)}</p></div></form>`;
}
const lsRead = () => { const v = id => ($('#' + id)?.value || '').trim(); return LS[ADM.tab].read(ADM.led.obj, v); };
const lsSync = () => { ADM.led.obj = lsRead(); const f = $('#lsForm'); if (f) f.outerHTML = lsEditorHtml(); };
const lsSave = async (list, msg) => { await storeSettings({[LS[ADM.tab].key]: list}); ADM.led = null; renderAdmin(); setNote('admNote', msg || tt('Saved. The site is updated.', 'Enregistré. Le site est à jour.')); };
$('#admin').addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a; if (a === 'setcontact'){ try { await storeSettings({whatsapp: $('#setWa').value.trim(), supportEmail: $('#setMail').value.trim()}); setNote('admNote', tt('Saved.', 'Enregistré.')); } catch(err){ setNote('admNote', errText(err)); } return; }
  if (!a.startsWith('ls') || !LS[ADM.tab]) return;
  const C = LS[ADM.tab], list = C.all(), i = +b.dataset.i;
  const go = async (next, msg) => { try { await lsSave(next, msg); } catch(err){ setNote('admNote', errText(err)); } };
  if (a === 'lsnew'){ ADM.led = {i: list.length, isNew: true, obj: C.blank()}; ADM.note = ''; renderAdmin(); $('#lsForm')?.scrollIntoView({behavior: 'smooth', block: 'start'}); }
  if (a === 'lsedit'){ ADM.led = {i, isNew: false, obj: JSON.parse(JSON.stringify(list[i]))}; ADM.note = ''; renderAdmin(); $('#lsForm')?.scrollIntoView({behavior: 'smooth', block: 'start'}); }
  if (a === 'lscancel'){ ADM.led = null; renderAdmin(); }
  if (a === 'lsup'){ [list[i - 1], list[i]] = [list[i], list[i - 1]]; await go(list); }
  if (a === 'lshide'){ list[i].hidden = !list[i].hidden; await go(list); }
  if (a === 'lsdel'){ if (!confirm(tt('Delete this item?', 'Supprimer cet élément ?'))) return; list.splice(i, 1); await go(list, tt('Deleted.', 'Supprimé.')); }
  if (a === 'lsreset'){ if (!confirm(tt('Restore the original list and discard your changes?', 'Rétablir la liste d’origine et annuler vos modifications ?'))) return; await go(null, tt('Restored.', 'Rétabli.')); }
  if (a === 'lsphrm' && ADM.led){ ADM.led.obj = lsRead(); ADM.led.obj.photo = ''; lsSync(); }
});
$('#admin').addEventListener('change', async e => {
  if (e.target.id !== 'lsPhoto' || !e.target.files[0] || !ADM.led) return;
  ADM.led.obj = lsRead(); ADM.busy = true; ADM.note = tt('Uploading…', 'Envoi…'); lsSync();
  try { ADM.led.obj.photo = await storeUpload(e.target.files[0]); ADM.note = ''; } catch(err){ ADM.note = errText(err); }
  ADM.busy = false; lsSync();
});
$('#admin').addEventListener('submit', async e => {
  if (e.target.id !== 'lsForm') return; e.preventDefault(); if (ADM.busy) return;
  const C = LS[ADM.tab], d = lsRead(); ADM.led.obj = d;
  if (!C.valid(d)){ setNote('lsNote', C.key === 'addons' ? tt('Add a name first.', 'Ajoutez d’abord un nom.') : tt('Add the client name and a quote.', 'Ajoutez le nom du client et une citation.')); return; }
  const list = C.all(); list[ADM.led.i] = d; ADM.busy = true; lsSync();
  try { await lsSave(list, tt('Published.', 'Publié.')); ADM.busy = false; } catch(err){ ADM.busy = false; ADM.note = errText(err); lsSync(); }
});
$('#admin').addEventListener('click', async e => {
  const b = e.target.closest('[data-a="msgdel"]'); if (!b) return;
  if (!confirm(tt('Delete this message?', 'Supprimer ce message ?'))) return;
  try { await api('DELETE', '/api/messages/' + encodeURIComponent(b.dataset.id)); ADM.msgs.messages = ADM.msgs.messages.filter(x => x.id !== b.dataset.id); put('#admList', admList()); } catch(err){ setNote('admNote', errText(err)); }
});
renderAdmin();
storeInit();
}

// Loss calculator on the home page: daily loss x 365, shown in FCFA.
(() => {
  const r = document.getElementById('kLoss'); if (!r) return;
  const f = n => n.toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' FCFA';
  r.addEventListener('input', () => { document.getElementById('kLossV').textContent = f(+r.value); document.getElementById('kYear').textContent = f(+r.value * 365); });
})();
