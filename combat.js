/* Kuroven Combat : jeu de cartes contre l'IA (règles inspirées de Yu-Gi-Oh).
   Chargé à la demande par index.html (avec combat-data.js et combat.css). Expose window.CB.enter() / CB.leave(). */
(function(){
'use strict';
const D=window.CBD;if(!D)return;
const {COL,SUP,mkChar,factor,EVO}=D;
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rnd=n=>Math.floor(Math.random()*n);
const shuffle=(a,rng)=>{for(let i=a.length-1;i>0;i--){const j=rng?Math.floor(rng()*(i+1)):rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const rngFrom=seed=>{let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const LIM=45000, MAXD=20, MAXS=8, MAXX=2, HANDMAX=7;
let POOL=null, REG={}, CHARS=[], EVOS=[];
let G=null, ui={}, view='boost', alive=false;

/* ---------- cartes : rendu ---------- */
const KM='<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-24 50 50)"><rect x="29" y="14" width="42" height="72" rx="6" fill="none" stroke="var(--k2)" stroke-width="4"/></g><g transform="rotate(24 50 50)"><rect x="29" y="14" width="42" height="72" rx="6" fill="var(--k1)" stroke="var(--bk)" stroke-width="2"/></g><circle cx="50" cy="50" r="13" fill="var(--bk)" stroke="var(--k1)" stroke-width="3"/><path d="M44 43h3.2v14H44zM47.2 49.6l5-6.6h4.2l-6 8 6 8h-4.2l-5-6.6z" fill="var(--k1)"/></svg>';
const backHTML=()=>'<div class="cb-back">'+KM+'</div>';
const whoHTML=k=>{const s=a=>a.map(i=>'<span style="background:'+COL[i].c+'">'+COL[i].k+'</span>').join('');return '<span class="wh">Fort : '+s([(k+1)%6,(k+2)%6])+' · Faible : '+s([(k+4)%6,(k+5)%6])+'</span>'};
/* « ✦ Évolution : condition » dans la description des personnages qui peuvent évoluer */
function evoDesc(c){
 if(typeof EVOS==='undefined'||!EVOS)return '';
 const l=EVOS.filter(e=>e.mats.some(x=>x.id===c.id));if(!l.length)return '';
 return '<br><b style="color:#5a2fb0">✦ Évolution</b> : '+l.map(e=>e.cond&&e.cond.length?esc(e.cond.map(condShort).join(' ; ')):'aucune condition').join(' / ')+'.';
}
/* rôle d'un personnage, d'après ses stats : attaquant, défenseur ou polyvalent */
function roleOf(c){return c.role==='att'?['att','Attaquant']:c.role==='def'?['def','Défenseur']:['pol','Polyvalent']}
function cardHTML(c,o){
 o=o||{};
 if(c.k==='c'||c.k==='e'){
  const evo=c.k==='e';
  const a=o.atk!=null?o.atk:c.atk,d=o.def!=null?o.def:c.def;
  const sa=a>c.atk?' style="color:#0a7a2a"':a<c.atk?' style="color:#b3241a"':'', sd=d>c.def?' style="color:#0a7a2a"':d<c.def?' style="color:#b3241a"':'';
  const im=evo?'<img src="combat/img/evo-'+c.eid+'.jpg" alt="" onerror="this.onerror=null;this.src=\''+esc(c.img)+'\'" referrerpolicy="no-referrer">':'<img src="'+esc(c.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">';
  return '<div class="y '+(evo?'evo holo':c.ex?'ex holo':'eff')+' k'+c.col+'"><span class="rtab r-'+roleOf(c)[0]+'">'+roleOf(c)[1]+'</span><div class="cface"></div><div class="plate"></div><div class="sticker"></div>'+
  '<div class="name">'+esc(c.n)+'</div><span class="orb">'+COL[c.col].k+'</span><div class="stars">'+'<i>★</i>'.repeat(c.lvl)+'</div>'+
  '<div class="artf"><div class="cart">'+im+'</div></div><div class="code">'+(evo?'ÉVOLUTION':esc((c.series||'KVN').slice(0,22)))+'</div>'+
  '<div class="desc"><b>['+(evo?'Évolution':'Personnage')+' / '+COL[c.col].n+(c.ex&&!evo?' / Rare':'')+']</b> <b>「'+esc(c.sn)+'」</b> : '+esc(c.sd)+(evo?evoNote(c):whoHTML(c.col)+evoDesc(c))+'</div><div class="id">'+c.no+'</div>'+
  '<div class="stat"><span>ATK/ <u'+sa+'>'+a+'</u></span><span>PV/ <u'+sd+'>'+d+'</u></span></div></div>';
 }
 const trap=c.t==='trap';
 return '<div class="y '+(trap?'pie':'mag')+' k'+c.col+'"><div class="cface"></div><div class="plate"></div><div class="sticker"></div>'+
 '<div class="name">'+esc(c.n)+'</div><span class="orb">'+(trap?'PIÈGE':'MAGIE')+'</span><div class="spell-t">[Carte '+(trap?'Piège':'Magie')+' / '+c.sub+']</div>'+
 '<div class="artf"><div class="cart"><img src="combat/img/'+c.img+'.jpg" alt="" loading="lazy"></div></div><div class="code">KVN-'+(trap?'P':'M')+String(SUP.indexOf(c)+1).padStart(2,'0')+'</div>'+
 '<div class="desc">'+esc(c.txt)+'</div><div class="id">'+c.no+'</div></div>';
}

/* ---------- données ---------- */
async function loadPool(){
 if(POOL)return POOL;
 let l=null;const c=ls.get('cbpool1',null);
 if(c&&Date.now()-c.t<6048e5&&c.l&&c.l.length>100)l=c.l;
 if(!l){
  const q='query($p:Int){Page(page:$p,perPage:50){characters(sort:FAVOURITES_DESC){id name{full} image{large} media(perPage:1,sort:POPULARITY_DESC){nodes{title{romaji}}}}}}';
  const pages=await Promise.all([1,2,3].map(p=>fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query:q,variables:{p}})}).then(r=>r.json())));
  l=[];pages.forEach(j=>((j.data&&j.data.Page.characters)||[]).forEach(x=>{if(x.image&&x.image.large)l.push({id:x.id,name:{full:x.name.full},image:{large:x.image.large},media:{nodes:[{title:{romaji:(x.media&&x.media.nodes[0]&&x.media.nodes[0].title.romaji)||''}}]}})}));
  if(l.length<60)throw new Error('AniList');
  ls.set('cbpool1',{t:Date.now(),l});
 }
 CHARS=l.map((x,i)=>mkChar(x,i));REG={};CHARS.forEach(c=>REG[c.id]=c);SUP.forEach(s=>REG[s.id]=s);
 EVOS=[];EVO.forEach(e=>{const ms=e.mat.map(k=>CHARS.find(c=>c.n.toLowerCase().includes(k)));if(ms.every(Boolean)){const ev={k:'e',id:'e_'+e.id,eid:e.id,n:e.n,img:ms[0].img,series:ms.map(m=>m.n).join(' + '),lvl:7,...(()=>{const rr=e.def/e.atk,role=rr<.72?'att':rr<.9?'pol':'def',st=D.statsFor(role,1.25,1);return {atk:st.atk,def:st.def,arm:st.arm,refl:st.refl,pierce:st.pierce,role}})(),col:e.col,ex:true,sn:e.sn,sd:e.sd,cond:e.cond||[],mats:ms,no:90000000+EVOS.length*13};EVOS.push(ev);REG[ev.id]=ev}});
 POOL=true;return POOL;
}
const isSup=c=>c.k==='s';
function ensureMats(d,e0){e0.mats.forEach(m=>{if(!d.includes(m.id)){const k=d.findIndex(id=>REG[id]&&REG[id].k==='c'&&REG[id].lvl<=4&&!e0.mats.some(x=>x.id===id));if(k>=0)d[k]=m.id}});return d}
const evolvableId=id=>EVOS.some(e=>e.mats.some(m=>m.id===id));
const extraFor=ids=>EVOS.filter(e=>e.mats.every(m=>ids.includes(m.id))).map(e=>e.id);
const AIOFF=['provocation','haki','rappel'];
function autoDeck(col,seed,anchor,forAI){
 seed=(seed||[]).filter(i=>REG[i]);
 const d=seed.slice();
 if(anchor&&!d.includes(anchor.id))d.push(anchor.id);
 const cs0=d.map(i=>REG[i]).filter(c=>c.k==='c'||c.k==='e');
 if(col==null){if(cs0.length){const cnt=[0,0,0,0,0,0];cs0.forEach(c=>cnt[c.col]++);col=cnt.indexOf(Math.max.apply(null,cnt))}else col=rnd(6)}
 const series=new Set(cs0.map(c=>c.series).filter(Boolean));
 const isS=id=>REG[id]&&isSup(REG[id]);
 const nSup=()=>d.filter(isS).length,nCh=()=>d.length-nSup();
 const pool=CHARS.filter(c=>!evolvableId(c.id)&&!d.includes(c.id));
 const sc=c=>(c.col===col?3:0)+(series.has(c.series)?2.5:0)+Math.random()*2;
 const bucket=c=>c.lvl<=3?'low':c.lvl===4?'l4':c.lvl===5?'l5':'l6';
 const want={low:4,l4:4,l5:3,l6:1},have={low:0,l4:0,l5:0,l6:0};
 cs0.filter(c=>c.k==='c').forEach(c=>have[bucket(c)]++);
 const best=f=>pool.filter(c=>!d.includes(c.id)&&f(c)).sort((a,b)=>sc(b)-sc(a))[0];
 for(const b of ['l6','l5','l4','low']){while(have[b]<want[b]&&nCh()<13){const c=best(x=>bucket(x)===b);if(!c)break;d.push(c.id);have[b]++}}
 while(nCh()<13){const c=best(x=>x.lvl<=4);if(!c)break;d.push(c.id)}
 const S0=id=>SUP.find(x=>x.id===id),wish=[S0(Math.random()<.5?'ramen':'senzu'),S0('examen'),S0(Math.random()<.5?'forgeron':'epee')];
 SUP.filter(x=>x.t==='field'&&x.col===col).forEach(x=>wish.push(x));
 shuffle(SUP.filter(x=>x.col===col)).forEach(x=>wish.push(x));shuffle(SUP.slice()).forEach(x=>wish.push(x));
 for(const x of wish){if(!x||d.length>=MAXD||nSup()>=MAXS)continue;if(forAI&&AIOFF.includes(x.id))continue;if(!d.includes(x.id))d.push(x.id)}
 while(d.length<MAXD){const c=best(()=>true);if(!c)break;d.push(c.id)}
 if(!seed.length&&!anchor&&EVOS.length){const evs=EVOS.filter(e=>e.col===col),e0=evs.length?evs[rnd(evs.length)]:EVOS[rnd(EVOS.length)];if(e0)ensureMats(d,e0)}
 return d.slice(0,MAXD);
}
/* choisir l'élément du deck automatique */
function pickElem(){
 return new Promise(res=>{
  const has=getDeck().length>0;
  const m=modal('<h3>Deck automatique</h3><p>Choisis comment on le remplit. Le deck est cohérent (couleurs, séries, niveaux, soutiens utiles), mais pas « le plus optimisé » : trouver les meilleures combinaisons, c’est ton travail !</p><div class="cbelem">'+COL.map((c,i)=>'<button type="button" data-c="'+i+'" style="--c:'+c.c+';--c2:'+c.c2+'"><b>'+c.k+'</b><span>'+c.n+'</span></button>').join('')+'</div><div class="cbact" style="flex-wrap:wrap"><button data-m="anchor">Autour d’un personnage…</button>'+(has?'<button data-m="complete">Compléter mon deck</button>':'')+'<button data-c="r" class="sec">Au hasard</button><button class="sec" data-x="1">Annuler</button></div>');
  m.onclick=async e=>{
   const b=e.target.closest('button');if(!b){if(e.target===m){closeModal(m);res(null)}return}
   if(b.dataset.x){closeModal(m);res(null);return}
   if(b.dataset.m==='anchor'){closeModal(m);const c=await chooseCard('Choisis le personnage au centre du deck',CHARS.slice().sort((a,b)=>b.lvl-a.lvl),true);res(c?{anchor:c,col:c.col,seed:[]}:null);return}
   if(b.dataset.m==='complete'){closeModal(m);res({col:null,seed:getDeck()});return}
   closeModal(m);res({col:b.dataset.c==='r'?rnd(6):+b.dataset.c,seed:[]});
  };
 });
}
function deckCheck(ids){
 const cnt={};ids.forEach(i=>cnt[i]=(cnt[i]||0)+1);
 const n=ids.length,ev=ids.filter(i=>REG[i]&&evolvableId(i)).length,s=ids.filter(i=>REG[i]&&isSup(REG[i])).length,hasLow=ids.some(i=>REG[i]&&REG[i].k==='c'&&REG[i].lvl<=4);
 let msg='';
 if(n!==MAXD)msg='Il faut exactement '+MAXD+' cartes ('+n+').';else if(s>MAXS)msg='Maximum '+MAXS+' cartes soutien.';else if(ev>MAXX)msg='Maximum '+MAXX+' cartes évolutives (✦) dans le deck ('+ev+').';else if(!hasLow)msg='Ajoute au moins un personnage de niveau 4 ou moins.';
 return {n,s,ev,ok:!msg,msg};
}
const getDeck=()=>(ls.get('cbdeck2',[])||[]).filter(i=>REG[i]);
const setDeck=d=>ls.set('cbdeck2',d);
const getExtra=()=>extraFor(getDeck());

/* ---------- état de partie ---------- */
const mkP=(ids,ex,rng)=>({extra:(ex||[]).map(i=>REG[i]).filter(Boolean),lp:8000,deck:shuffle(ids.map(i=>REG[i]),rng),hand:[],mon:[null,null,null],st:[null,null,null],grave:[],normal:false,senzu:false});
const mkM=(c,pos)=>({card:c,pos,atkP:0,defP:0,tmp:0,ts:G.n,att:false,chg:false,hp:c.def,full:true,para:0,sleep:0});
const P=i=>G.p[i], nm=i=>i===0?'Toi':'L’adversaire', S=(pi,a,b)=>pi===0?'Tu '+a:'L’adversaire '+b;
const mons=pi=>G.p[pi].mon.map((m,i)=>m?{m,i}:null).filter(Boolean);
const eqN=(pi,m,id)=>G.p[pi].st.filter(s=>s&&s.to===m&&s.card.id===id).length;
const hasCape=(pi,m)=>eqN(pi,m,'cape')>0;
const fld=()=>G.field&&G.field.card.id;
const friend=pi=>mons(pi).length>=3&&G.p[pi].st.some(s=>s&&s.up&&s.card.id==='amitie');
function atk(pi,m){let v=m.card.atk+m.atkP+m.tmp+150*eqN(pi,m,'forgeron')+100*eqN(pi,m,'epee');if(fld()==='arene')v+=75;if(fld()==='lune'&&m.card.col===4)v+=100;if(friend(pi))v+=350;return Math.max(0,v)}
function def(pi,m){return Math.max(1,m.card.def+m.defP)}
function armor(pi,m){let v=(m.card.arm||0)+100*eqN(pi,m,'epee');if(fld()==='village')v+=100;return v}
const tauntIdx=att=>{const t=G&&G.taunt;if(!t||t.owner===att||!P(t.owner).mon.includes(t.m))return -1;return P(t.owner).mon.indexOf(t.m)};
/* dégâts d'une attaque : en attaque on reçoit tout et on riposte ; en défense l'armure absorbe, les Épines renvoient */
function calcHit(pi,A,T){
 const a=atk(pi,A),f=factor(A.card.col,T.card.col);let dmg,back;
 if(T.pos==='a'){dmg=Math.round(a*f);back=Math.round(atk(1-pi,T)*factor(T.card.col,A.card.col))}
 else{const raw=a*f,arm=A.card.pierce?0:armor(1-pi,T);dmg=Math.round(Math.max(raw-arm,.2*raw)*.75);back=T.card.refl||0}
 const kill=dmg>=T.hp&&!T.full,survive=!kill;
 return {dmg,back,kill,dies:survive&&back>=A.hp&&!A.full,left:Math.max(0,T.hp-dmg),pierce:!!A.card.pierce&&T.pos==='d',arm:T.pos==='d'?armor(1-pi,T):0,f};
}
const freeMon=pi=>G.p[pi].mon.indexOf(null), freeSt=pi=>G.p[pi].st.indexOf(null);

/* ---------- interface : utilitaires ---------- */
const boardEl=()=>$('cbT');
function log(t){G.log.unshift(t);if(G.log.length>40)G.log.pop();const l=$('cbLog');if(l)l.innerHTML=G.log.slice(0,14).map(x=>'<div>'+esc(x)+'</div>').join('')}
function banner(t,col){const b=$('cbBan');if(!b)return;b.firstElementChild.textContent=t;b.style.setProperty('--c',col||'#f1e6c8');b.classList.remove('go');void b.offsetWidth;b.classList.add('go')}
function zoneEl(z,p,i){const b=boardEl();return b&&b.querySelector('[data-z="'+z+'"][data-p="'+p+'"][data-i="'+i+'"]')}
function floatTxt(el,t,heal){if(!el)return;const r=el.getBoundingClientRect();const d=document.createElement('div');d.className='cbdmg'+(heal?' heal':'');d.textContent=t;d.style.left=(r.left+r.width/2-30)+'px';d.style.top=(r.top+r.height/2-20)+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),1300)}
function hitAt(el){if(!el)return;sparks(el);const r=el.getBoundingClientRect();const d=document.createElement('div');d.className='cbhit';d.style.left=(r.left+r.width/2)+'px';d.style.top=(r.top+r.height/2)+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),600)}
/* ---------- animations ---------- */
function handEl(pi,i){const b=boardEl();if(!b)return null;if(pi===0)return b.querySelector('.hnd.m .hc[data-i="'+i+'"]');const h=b.querySelectorAll('.hnd.o .hc');return h[h.length-1]||null}
function rectOf(el){
 if(el){const r=el.getBoundingClientRect();return {l:r.left,t:r.top,w:r.width,h:r.height}}
 const b=boardEl().getBoundingClientRect();return {l:b.left+b.width/2-30,t:b.top+10,w:60,h:88};
}
/* une carte quitte un rectangle et vole en arc vers une zone */
function flyCard(from,toEl,html,o){
 o=o||{};const root=document.getElementById('v-cb')||document.body;
 const d=document.createElement('div');d.className='cbfly bk'+backN();d.innerHTML=html;root.appendChild(d);
 const tr=toEl.getBoundingClientRect();
 const s0=Math.max(.05,from.w/260),s1=Math.max(.05,tr.width/260);
 const x0=from.l,y0=from.t,x1=tr.left+tr.width/2-(260*s1)/2,y1=tr.top+tr.height/2-(379*s1)/2;
 const mx=(x0+x1)/2,my=Math.min(y0,y1)-50;
 let an;
 try{an=d.animate([{transform:'translate('+x0+'px,'+y0+'px) scale('+s0+') rotate(-8deg)'},{transform:'translate('+mx+'px,'+my+'px) scale('+((s0+s1)/2*1.2)+') rotate(5deg)',offset:.55},{transform:'translate('+x1+'px,'+y1+'px) scale('+s1+') rotate(0deg)'}],{duration:o.dur||600,easing:'cubic-bezier(.35,.1,.25,1)',fill:'forwards'})}catch(e){d.remove();return Promise.resolve(null)}
 return an.finished.catch(()=>{}).then(()=>{if(!o.keep)d.remove();return d});
}
async function spellToCenter(c,src){
 const b=boardEl();if(!b)return;const br=b.getBoundingClientRect();
 const mid=document.createElement('div');mid.style.cssText='position:fixed;left:'+(br.left+br.width/2-100)+'px;top:'+(br.top+br.height/2-146)+'px;width:200px;height:292px;pointer-events:none';
 (document.getElementById('v-cb')||document.body).appendChild(mid);
 ui.sc=await flyCard(src,mid,cardHTML(c),{dur:560,keep:true});mid.remove();await sleep(480);
}
async function spellLand(c,dest){
 const d=ui.sc;ui.sc=null;if(!d)return;
 if(!dest){d.remove();return}
 const r=d.getBoundingClientRect();d.remove();
 await flyCard({l:r.left,t:r.top,w:r.width,h:r.height},dest,cardHTML(c),{dur:480});
}
function sparks(el,col,n){
 if(!el)return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 for(let i=0;i<(n||12);i++){
  const s=document.createElement('i');s.className='cbspark';s.style.cssText='left:'+cx+'px;top:'+cy+'px;background:'+(col||'#f1e6c8')+';color:'+(col||'#f1e6c8');document.body.appendChild(s);
  const a=Math.random()*6.283,dist=40+Math.random()*70;
  try{s.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+(Math.cos(a)*dist)+'px,'+(Math.sin(a)*dist)+'px) scale(.2)',opacity:0}],{duration:450+Math.random()*350,easing:'ease-out'}).finished.then(()=>s.remove(),()=>s.remove())}catch(e){s.remove()}
 }
}
function burst(el,col){
 if(!el)return;const r=el.getBoundingClientRect();
 const d=document.createElement('div');d.className='cbburst';d.style.cssText='left:'+(r.left+r.width/2)+'px;top:'+(r.top+r.height/2)+'px;border-color:'+(col||'#f1e6c8')+';box-shadow:0 0 24px '+(col||'#f1e6c8');document.body.appendChild(d);
 try{d.animate([{transform:'translate(-50%,-50%) scale(.3)',opacity:.95},{transform:'translate(-50%,-50%) scale(3.2)',opacity:0}],{duration:650,easing:'ease-out'}).finished.then(()=>d.remove(),()=>d.remove())}catch(e){d.remove()}
 sparks(el,col,10);
}
function shake(){const b=boardEl();if(!b)return;b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake')}
/* Combat est toujours sombre, quel que soit le thème choisi pour le reste du site */
let savedTheme=null;
function forceDark(on){
 const r=document.documentElement;
 if(on){if(savedTheme===null)savedTheme=r.dataset.theme||'';r.dataset.theme='dark';r.style.colorScheme='dark'}
 else if(savedTheme!==null){if(savedTheme)r.dataset.theme=savedTheme;else delete r.dataset.theme;r.style.colorScheme='';savedTheme=null}
}
function toast(t){log(t);const a=$('cbHint');if(a){a.textContent=t;a.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>a.style.opacity=0,2400)}}
function modal(html){const m=document.createElement('div');m.className='cbmodal bk'+backN();m.innerHTML='<div class="bx">'+html+'</div>';(document.getElementById('v-cb')||document.body).appendChild(m);ui.modal=m;return m}
function closeModal(m){if(m&&m.parentNode)m.remove();ui.modal=null}
/* question : boutons {v,t,sec}, et éventuellement des cartes à montrer */
function ask(title,text,btns,cards){
 return new Promise(res=>{
  const m=modal('<h3>'+esc(title)+'</h3><p>'+esc(text)+'</p>'+(cards&&cards.length?'<div class="cbgrid2">'+cards.map(c=>'<div class="it">'+cardHTML(c)+'</div>').join('')+'</div>':'')+'<div class="cbact">'+btns.map((b,i)=>'<button class="'+(b.sec?'sec':'')+'" data-i="'+i+'">'+esc(b.t)+'</button>').join('')+'</div>');
  m.onclick=e=>{const b=e.target.closest('button');if(!b)return;closeModal(m);res(btns[+b.dataset.i].v)};
 });
}
/* choisir une carte dans une liste (cimetière, main…) */
function chooseCard(title,list,cancel){
 return new Promise(res=>{
  const m=modal('<h3>'+esc(title)+'</h3><div class="cbgrid2">'+list.map((c,i)=>'<div class="it" data-i="'+i+'">'+cardHTML(c)+'</div>').join('')+'</div>'+(cancel?'<div class="cbact"><button class="sec" data-x="1">Annuler</button></div>':''));
  m.onclick=e=>{const it=e.target.closest('.it');if(it){closeModal(m);res(list[+it.dataset.i]);return}if(e.target.closest('[data-x]')){closeModal(m);res(null)}};
 });
}
/* désigner une zone sur le plateau */
function pick(text,cands,cancel){
 return new Promise(res=>{
  ui.pick={cands,res};ui.sel=null;ui.selMon=null;render();
  const bar=document.createElement('div');bar.className='cbpick';bar.innerHTML='<span>'+esc(text)+'</span>'+(cancel===false?'':'<button>Annuler</button>');
  const side=$('cbSide');side.insertBefore(bar,side.firstChild);ui.bar=bar;
  const done=v=>{ui.pick=null;if(bar.parentNode)bar.remove();ui.bar=null;render();res(v)};
  ui.pickDone=done;
  const bt=bar.querySelector('button');if(bt)bt.onclick=()=>done(null);
 });
}
const backN=()=>ls.get('cbback',1);
/* profils affichés sur le plateau : ta photo (ou ton initiale), et un portrait de personnage pour l'adversaire */
function who0(){let n='Toi',img='';try{n=me?me.pseudo:store.get('name','Invité');img=(me&&me.avatar&&safeStore(me.avatar))||''}catch(e){}return{n:n||'Toi',img}}
function aiPersona(){const c=CHARS[rnd(Math.min(60,CHARS.length))];return{n:c.n,img:c.img}}
const avHTML=p=>p&&p.img?'<img class="avp" alt="" src="'+esc(p.img)+'" referrerpolicy="no-referrer">':'<b class="avp">'+esc(((p&&p.n)||'?').charAt(0).toUpperCase())+'</b>';

/* ---------- duel en ligne : chaque navigateur fait tourner le même moteur, on s'échange les actions ---------- */
let NET=null;
const netSend=(t,o)=>{if(NET&&NET.ch){try{NET.ch.send({type:'broadcast',event:'m',payload:Object.assign({t},o||{})})}catch(e){}}};
function netIn(p){
 if(!NET||!p)return;
 if(p.t==='hello'||p.t==='start'){if(NET.onLobby)NET.onLobby(p);return}
 if(p.t==='ans'){NET.aq.push(p.v);if(NET.aw)NET.aw();return}
 NET.q.push(p);if(NET.qw)NET.qw();
}
function recvAns(){return new Promise(res=>{const n=NET;if(!n)return res(null);const take=()=>{if(n.aq.length){res(n.aq.shift());return true}if(n.closed){res(null);return true}return false};if(take())return;n.aw=()=>{if(take())n.aw=null}})}
function recvAct(){return new Promise(res=>{const n=NET;if(!n)return res(null);const take=()=>{if(n.q.length){res(n.q.shift());return true}if(n.closed){res(null);return true}return false};if(take())return;n.qw=()=>{if(take())n.qw=null}})}
function netClose(){const n=NET;if(!n)return;n.closed=true;NET=null;if(n.aw)n.aw();if(n.qw)n.qw();try{sb.removeChannel(n.ch)}catch(e){}}
function netOpen(code){
 return new Promise((res,rej)=>{
  if(typeof sb==='undefined'||!sb){rej(new Error('Connexion au serveur impossible.'));return}
  netClose();
  const ch=sb.channel('cbduel:'+code,{config:{broadcast:{self:false}}});
  const n={ch,code,q:[],aq:[],qw:null,aw:null,onLobby:null,seen:false,closed:false};NET=n;
  ch.on('broadcast',{event:'m'},m=>netIn(m.payload));
  ch.on('presence',{event:'leave'},()=>{if(NET===n&&n.seen&&G&&!G.over)endGame(0,'L’adversaire a quitté la partie.')});
  let done=false;
  ch.subscribe(st=>{
   if(st==='SUBSCRIBED'&&!done){done=true;try{ch.track({t:Date.now()})}catch(e){}res(n)}
   else if((st==='CHANNEL_ERROR'||st==='TIMED_OUT')&&!done){done=true;rej(new Error('Connexion au serveur impossible.'))}
  });
 });
}
function serCards(deck,extra){
 const m={};
 const add=id=>{const c=REG[id];if(!c||c.k==='s')return;if(c.k==='e'){c.mats.forEach(x=>{m[x.id]=x});m[c.id]=Object.assign({},c,{mats:c.mats.map(x=>x.id)})}else m[c.id]=c};
 deck.forEach(add);extra.forEach(add);return m;
}
function regCards(m){
 const ev=[];Object.keys(m||{}).forEach(id=>{const c=m[id];if(!c)return;if(c.k==='e')ev.push(c);else if(!REG[id])REG[id]=c});
 ev.forEach(c=>{if(!REG[c.id])REG[c.id]=Object.assign({},c,{mats:(c.mats||[]).map(i=>REG[i]).filter(Boolean)})});
}
function cleanWho(w){
 const img=(w&&w.img)||'';
 return {n:String((w&&w.n)||'Adversaire').slice(0,24),img:((typeof safeStore==='function'&&safeStore(img))||(typeof safeImg==='function'&&safeImg(img))||'')};
}
/* actions de l'autre joueur : on les rejoue avec les mêmes fonctions que le nôtre (il est le joueur 1 chez nous) */
async function remoteAct(m){
 G.busy=true;
 try{
  const p=P(1);
  switch(m.t){
   case 'sum':await doSummon(1,m.hi,m.slot,m.pos,m.trib);break;
   case 'spl':{let tg=null;if(m.tgk==='m'||m.tgk==='f')tg=m.tg;else if(m.tgk==='g')tg=p.grave[m.tg];else if(m.tgk==='h')tg=p.hand[m.tg];await playSpell(1,m.hi,tg);break}
   case 'drw':await drawN(1,1);break;
   case 'set':await setTrap(1,m.hi);break;
   case 'att':await battle(1,m.i,m.ti);break;
   case 'pos':await changePos(1,m.i);break;
   case 'evo':{const c=p.extra[m.ci];if(c)await doEvolve(1,c,m.idx);break}
   case 'end':G.busy=false;await finishTurn(1);return;
  }
 }catch(e){console.error(e)}
 G.busy=false;render();
}
async function remoteLoop(){
 G.ai=true;render();
 while(G&&NET&&!G.over&&G.turn===1){
  const m=await recvAct();if(!m)break;
  await remoteAct(m);
  if(m.t==='end')break;
 }
}

/* ---------- effets de base ---------- */
function checkEnd(){
 if(!G||G.over)return;
 if(P(0).lp<=0)endGame(1,'Tes points de vie tombent à 0.');else if(P(1).lp<=0)endGame(0,'Les points de vie adverses tombent à 0.');
}
function setLP(pi,v){P(pi).lp=Math.max(0,v);const n=$('cbLp'+pi);if(n){const from=+n.textContent;const t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/700);n.textContent=Math.round(from+(P(pi).lp-from)*k);if(k<1&&alive)requestAnimationFrame(step)};requestAnimationFrame(step)}}
function bigDmg(pi,v){const b=boardEl();if(!b)return;const r=b.getBoundingClientRect(),d=document.createElement('div');d.className='cbbig';d.textContent='− '+v;d.style.left=(r.left+r.width/2)+'px';d.style.top=(r.top+r.height*(pi===1?.2:.74))+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),1500)}
function hurt(pi,v){if(v<=0)return;setLP(pi,P(pi).lp-v);bigDmg(pi,v);log(S(pi,'perds','perd')+' '+v+' points de vie.');checkEnd()}
function heal(pi,v){const e=zoneEl('p',pi,0);setLP(pi,P(pi).lp+v);floatTxt(e,'+'+v,true);log(S(pi,'récupères','récupère')+' '+v+' points de vie.')}
/* animation de pioche : la carte sort de la pioche, se retourne au milieu, puis file dans la main */
async function drawReveal(c){
 const b=boardEl(),dk=zoneEl('d',0,0);if(!b||!dk||!alive)return;
 const r=dk.getBoundingClientRect(),br=b.getBoundingClientRect(),root=document.getElementById('v-cb')||document.body;
 const el=document.createElement('div');el.className='cbdrw bk'+backN();
 el.innerHTML='<div class="dr-in"><div class="dr-f">'+backHTML()+'</div><div class="dr-b">'+cardHTML(c)+'</div></div>';
 root.appendChild(el);
 const s0=Math.max(.1,r.width/260),h=Math.min(br.height*.52,440),s1=h/379,s2=.3;
 const p0=[r.left,r.top],pc=[br.left+br.width/2-130*s1,br.top+br.height/2-189*s1],ph=[br.left+br.width/2-130*s2,br.bottom-379*s2*.55];
 const tf=(p,sc,rot)=>'translate('+p[0]+'px,'+p[1]+'px) scale('+sc+') rotate('+(rot||0)+'deg)';
 const inn=el.firstElementChild;
 try{
  await el.animate([{transform:tf(p0,s0,-6),opacity:.9},{transform:tf(pc,s1,0),opacity:1}],{duration:420,easing:'cubic-bezier(.2,.9,.3,1.1)',fill:'forwards'}).finished;
  await inn.animate([{transform:'rotateY(0deg)'},{transform:'rotateY(180deg)'}],{duration:340,easing:'ease-in-out',fill:'forwards'}).finished;
  await sleep(650);
  await el.animate([{transform:tf(pc,s1,0),opacity:1},{transform:tf(ph,s2,4),opacity:.2}],{duration:380,easing:'ease-in',fill:'forwards'}).finished;
 }catch(e){console.log('drawReveal',e&&e.message)}
 el.remove();
}
async function drawN(pi,n,quiet){
 for(let k=0;k<n;k++){
  const p=P(pi);
  if(!p.deck.length){log(S(pi,'as','a')+' la pioche vide : aucune carte à piocher.');if(!G.emptyMsg||G.emptyMsg!==pi+':'+G.n){G.emptyMsg=pi+':'+G.n;toast(pi===0?'Ta pioche est vide, mais tu continues de jouer.':'La pioche adverse est vide, mais la partie continue.')}break}
  if(pi===0&&!quiet&&p.deck[0])await drawReveal(p.deck[0]);
  const c=p.deck.shift();p.hand.push(c);G.newC=c;if(!quiet)log(S(pi,'pioches','pioche')+' une carte.');
  render();await sleep(260);
 }
 G.newC=null;
}
async function destroyMon(pi,i,why){
 const p=P(pi),m=p.mon[i];if(!m)return;
 const e=zoneEl('m',pi,i);if(e&&e.firstElementChild){sparks(e,'#ff7a3a',16);e.firstElementChild.classList.add('die');await sleep(750)}
 p.grave.push(m.card);p.mon[i]=null;
 p.st.forEach((s,k)=>{if(s&&s.to===m){p.grave.push(s.card);p.st[k]=null}});
 log(m.card.n+(why==='sacrifice'?' est sacrifié.':why==='evolution'?' fusionne.':' est détruit.'));
 render();
}
async function posAnim(pi,i,toDef){
 const e=zoneEl('m',pi,i);const bc=e&&e.firstElementChild;if(bc){bc.classList.toggle('def',toDef);await sleep(700)}
}

/* ---------- pièges ---------- */
const TRAPS=['contre','rival','embuscade'];
function trapChoices(od,pi,i){
 const o=P(od),A=P(pi).mon[i],out=[];
 o.st.forEach((s,k)=>{
  if(!s||s.up||!TRAPS.includes(s.card.id))return;
  const id=s.card.id;
  if((id==='rival'||id==='embuscade')&&hasCape(pi,A))return;
  if(id==='embuscade'&&atk(pi,A)>500)return;
  out.push(k);
 });
 return out;
}
function aiPickTrap(od,pi,i,list){
 const o=P(od),A=P(pi).mon[i],a=atk(pi,A),ids=list.map(k=>o.st[k].card.id);
 if(ids.includes('contre')&&a>=1200)return list[ids.indexOf('contre')];
 if(ids.includes('embuscade'))return list[ids.indexOf('embuscade')];
 if(ids.includes('rival'))return list[ids.indexOf('rival')];
 if(ids.includes('contre'))return list[ids.indexOf('contre')];
 return -1;
}
async function flipTrap(od,k){
 const s=P(od).st[k];const e=zoneEl('s',od,k);
 if(e&&e.firstElementChild){e.firstElementChild.classList.add('flip');sparks(e,'#7fd0ff',10);await sleep(450)}
 s.up=true;render();
}
function dropTrap(od,k){const o=P(od),s=o.st[k];if(s){o.grave.push(s.card);o.st[k]=null}}
async function trapWindow(pi,i){
 const od=1-pi,A=P(pi).mon[i];
 const list=trapChoices(od,pi,i);if(!list.length)return false;
 let k=-1;
 if(od===0){
  k=await ask('Piège !',A.card.n+' (ATK '+atk(pi,A)+') attaque. Activer un piège ?',list.map(x=>({v:x,t:'Activer : '+P(0).st[x].card.n})).concat([{v:-1,t:'Ne rien faire',sec:1}]),list.map(x=>P(0).st[x].card));if(NET)netSend('ans',{v:k});
 }else if(NET){k=await recvAns()}else{await sleep(400);k=aiPickTrap(od,pi,i,list)}
 if(k==null||k<0)return false;
 const s=P(od).st[k],id=s.card.id;
 await flipTrap(od,k);banner(s.card.n.toUpperCase()+' !','#7fd0ff');log(S(od,'actives','active')+' '+s.card.n+'.');await sleep(700);
 if(id==='contre'){const a=atk(pi,A);dropTrap(od,k);render();await sleep(250);hitAt(zoneEl('m',pi,i));shake();hurt(pi,a)}
 else if(id==='rival'){A.pos='d';dropTrap(od,k);render();log(A.card.n+' passe en défense.')}
 else if(id==='embuscade'){dropTrap(od,k);render();await destroyMon(pi,i)}
 await sleep(300);return true;
}
async function saveBy(owner,i){
 const o=P(owner),k=o.st.findIndex(s=>s&&!s.up&&s.card.id==='sacrifice');
 if(k<0)return false;
 const others=mons(owner).filter(x=>x.i!==i);if(!others.length)return false;
 let yes=true;
 if(owner===0){yes=await ask('Sacrifice héroïque',o.mon[i].card.n+' va être détruit. Détruire un autre de tes personnages à la place ?',[{v:true,t:'Oui, sacrifier'},{v:false,t:'Non',sec:1}],[P(0).st[k].card]);if(NET)netSend('ans',{v:yes})}
 else if(NET){yes=await recvAns()}
 else yes=true;
 if(!yes)return false;
 others.sort((a,b)=>a.m.card.atk-b.m.card.atk);
 let tgt=others[0];
 if(owner===0&&others.length>1){const r=await pick('Choisis le personnage à sacrifier',others.map(x=>({z:'m',p:0,i:x.i})),false);if(r)tgt=others.find(x=>x.i===r.i)||tgt;if(NET)netSend('ans',{v:tgt.i})}
 else if(owner===1&&NET&&others.length>1){const ti=await recvAns();const f=others.find(x=>x.i===ti);if(f)tgt=f}
 await flipTrap(owner,k);banner('SACRIFICE HÉROÏQUE !','#7fd0ff');log(S(owner,'actives','active')+' Sacrifice héroïque.');await sleep(600);
 dropTrap(owner,k);await destroyMon(owner,tgt.i,'sacrifice');return true;
}
async function spellWindow(pi,card){
 const od=1-pi,o=P(od),k=o.st.findIndex(s=>s&&!s.up&&s.card.id==='rideau');
 if(k<0)return false;
 let yes;
 if(od===0){yes=await ask('Piège !','L’adversaire active « '+card.n+' ». Activer Rideau de fumée ?',[{v:true,t:'Activer Rideau de fumée'},{v:false,t:'Non',sec:1}],[o.st[k].card]);if(NET)netSend('ans',{v:yes})}
 else if(NET){yes=await recvAns()}
 else{await sleep(300);yes=Math.random()<.8}
 if(!yes)return false;
 await flipTrap(od,k);banner('RIDEAU DE FUMÉE !','#7fd0ff');log(S(od,'annules','annule')+' '+card.n+'.');await sleep(800);dropTrap(od,k);render();return true;
}

/* ---------- combat ---------- */
async function lunge(pi,i,ti){
 const a=zoneEl('m',pi,i),A=a&&a.firstElementChild;if(!A)return;
 const t=ti>=0?zoneEl('m',1-pi,ti):zoneEl('p',1-pi,0);if(!t)return;
 const ra=A.getBoundingClientRect(),rt=t.getBoundingClientRect();
 const dx=rt.left+rt.width/2-(ra.left+ra.width/2),dy=rt.top+rt.height/2-(ra.top+ra.height/2)+(pi===0?30:-30);
 A.style.zIndex=30;
 const up=pi===0?-14:14,lf='drop-shadow(0 14px 10px #000c) brightness(1.2)';
 try{const l=A.animate([{transform:'translate(0,0) scale(1)',filter:'none'},{transform:'translate(0,'+up+'px) scale(1.14)',filter:lf}],{duration:300,easing:'ease-out',fill:'forwards'});await l.finished;l.cancel()}catch(e){}
 try{await A.animate([{transform:'translate(0,'+up+'px) scale(1.14)',filter:lf},{transform:'translate('+dx+'px,'+dy+'px) scale(1.25) rotate('+(pi===0?-4:4)+'deg)',offset:.45,filter:'drop-shadow(0 18px 14px #000) brightness(1.4)'},{transform:'translate(0,0) scale(1)',filter:'none'}],{duration:800,easing:'cubic-bezier(.5,0,.3,1)'}).finished}catch(e){}
 A.style.zIndex='';
}
async function hitMon(pi,i,d){
 const m=P(pi).mon[i];if(!m||d<=0)return false;d=Math.round(d);let shown=d;
 if(m.sleep){m.sleep=0;log(m.card.n+' se réveille !')}
 if(m.full&&d>=m.hp){shown=m.hp-1;m.hp=1;m.full=false;log(m.card.n+' tient bon : Dernier souffle !');banner('DERNIER SOUFFLE','#ffd84a')}
 else{m.hp-=d;m.full=false}
 floatTxt(zoneEl('m',pi,i),'-'+shown);render();await sleep(380);
 if(m.hp<=0){if(await saveBy(pi,i)){m.hp=1;return false}await destroyMon(pi,i);return true}
 return false;
}
function healMon(pi,i,v){const m=P(pi).mon[i];if(!m)return;const mx=def(pi,m),g=Math.min(v,mx-m.hp);if(g<=0)return;m.hp+=g;floatTxt(zoneEl('m',pi,i),'+'+g,true);log(m.card.n+' récupère '+g+' PV.');render()}
async function battle(pi,i,ti){
 const p=P(pi),o=P(1-pi);let A=p.mon[i];if(!A||A.att||G.over)return;
 A.att=true;let T=ti>=0?o.mon[ti]:null;
 banner('ATTAQUE !','#e5483b');log((pi===0?'Ton ':'Son ')+A.card.n+' attaque '+(T?T.card.n:'directement')+'.');
 const ae=zoneEl('m',pi,i);if(ae&&ae.firstElementChild)ae.firstElementChild.classList.add('sel');
 await sleep(550);
 if(await trapWindow(pi,i)){render();return}
 A=p.mon[i];if(!A)return;
 T=ti>=0?o.mon[ti]:null;if(ti>=0&&!T){render();return}
 await lunge(pi,i,ti);
 const a=atk(pi,A);
 if(!T){hitAt(zoneEl('p',1-pi,0));shake();hurt(1-pi,a)}
 else{
  hitAt(zoneEl('m',1-pi,ti));shake();
  const h=calcHit(pi,A,T);
  if(T.pos==='a')log(A.card.n+' frappe '+T.card.n+' ('+h.dmg+' dégâts) ; riposte : '+h.back+'.');
  else log(A.card.n+' frappe '+T.card.n+' en défense : '+h.dmg+' dégâts'+(h.pierce?' (perce l’armure)':' (armure '+h.arm+')')+'.');
  await hitMon(1-pi,ti,h.dmg);
  if(o.mon[ti]===T&&T.hp>0&&h.back>0&&p.mon[i]===A){if(T.pos==='d')log(T.card.n+' renvoie '+h.back+' dégâts (Épines).');await hitMon(pi,i,h.back)}
 }
 render();await sleep(250);
}

/* ---------- invocation, soutiens ---------- */
async function doSummon(pi,hi,slot,pos,trib,free){
 const p=P(pi);const he=handEl(pi,hi),src=rectOf(he);if(he)he.style.visibility='hidden';
 const c=p.hand.splice(hi,1)[0];
 if(trib)await destroyMon(pi,slot,'sacrifice');
 const dst=zoneEl('m',pi,slot);
 if(dst)await flyCard(src,dst,pi===0?cardHTML(c):backHTML(),{dur:620});
 p.mon[slot]=mkM(c,pos);if(!free)p.normal=true;
 G.pop='m'+pi+slot;banner('INVOCATION',COL[c.col].c);log(S(pi,'invoques','invoque')+' '+c.n+' en '+(pos==='a'?'attaque':'défense')+'.');
 render();burst(zoneEl('m',pi,slot),COL[c.col].c);await sleep(700);G.pop=null;
}
function spellInfo(pi,c){
 const p=P(pi),mm=mons(pi);
 switch(c.id){
  case 'senzu':return p.senzu?{ok:0,why:'Un seul Senzu par tour.'}:{ok:1,tg:'none'};
  case 'examen':return p.deck.length<1?{ok:0,why:'Pioche vide.'}:{ok:1,tg:'none'};
  case 'flashback':return p.grave.some(x=>x.k==='c')?{ok:1,tg:'grave'}:{ok:0,why:'Aucun personnage au cimetière.'};
  case 'entrainement':return mm.length?{ok:1,tg:'mon'}:{ok:0,why:'Il faut un personnage.'};
  case 'provocation':return mm.length?{ok:1,tg:'mon'}:{ok:0,why:'Il faut un personnage.'};
  case 'potion':return p.potion?{ok:0,why:'Une seule Potion par tour.'}:mm.some(x=>x.m.hp<def(pi,x.m))?{ok:1,tg:'mon',hurt:1}:{ok:0,why:'Aucun de tes personnages n’est blessé.'};
  case 'paralysie':return mons(1-pi).length?{ok:1,tg:'foe'}:{ok:0,why:'L’adversaire n’a aucun personnage.'};
  case 'haki':{if(!mm.length)return {ok:0,why:'Il faut un personnage.'};const mx=Math.max.apply(null,mm.map(x=>atk(pi,x.m))),fs=mons(1-pi).filter(x=>atk(1-pi,x.m)<mx);return fs.length?{ok:1,tg:'foe',ids:fs.map(x=>x.i)}:{ok:0,why:'Aucun personnage adverse plus faible que les tiens.'}}
  case 'rappel':return mm.length?{ok:1,tg:'mon'}:{ok:0,why:'Il faut un personnage.'};
  case 'pacte':return !mm.length?{ok:0,why:'Il faut un personnage.'}:p.lp<=350?{ok:0,why:'Pas assez de points de vie.'}:{ok:1,tg:'mon'};
  case 'reunion':return !p.hand.some(x=>x.k==='c'&&x.lvl>=5)?{ok:0,why:'Aucun personnage de niveau 5 ou 6 en main.'}:freeMon(pi)<0?{ok:0,why:'Aucune zone libre.'}:{ok:1,tg:'hand56'};
  case 'forgeron':case 'epee':case 'cape':return !mm.length?{ok:0,why:'Il faut un personnage.'}:freeSt(pi)<0?{ok:0,why:'Aucune zone de soutien libre.'}:{ok:1,tg:'mon'};
  case 'amitie':return freeSt(pi)<0?{ok:0,why:'Aucune zone de soutien libre.'}:{ok:1,tg:'none'};
  default:return {ok:1,tg:'none'};
 }
}
async function playSpell(pi,hi,tg){
 const p=P(pi),he=handEl(pi,hi),src=rectOf(he);if(he)he.style.visibility='hidden';
 const c=p.hand.splice(hi,1)[0];
 banner(c.n.toUpperCase(),COL[c.col].c);log(S(pi,'joues','joue')+' '+c.n+'.');
 await spellToCenter(c,src);
 if(c.t==='mag'||c.t==='eq'||c.t==='field'){
  if(await spellWindow(pi,c)){await spellLand(c,zoneEl('g',pi,0));p.grave.push(c);render();return}
 }
 let dest;
 if(c.t==='field')dest=zoneEl('f',0,0);
 else if(c.t==='eq'){const s=freeSt(pi);dest=s>=0&&p.mon[tg]?zoneEl('s',pi,s):zoneEl('g',pi,0)}
 else if(c.id==='amitie'){const s=freeSt(pi);dest=s>=0?zoneEl('s',pi,s):zoneEl('g',pi,0)}
 else dest=zoneEl('g',pi,0);
 await spellLand(c,dest);
 switch(c.id){
  case 'ramen':heal(pi,400);p.grave.push(c);break;
  case 'senzu':heal(pi,750);p.senzu=true;p.grave.push(c);break;
  case 'examen':p.grave.push(c);await drawN(pi,2);break;
  case 'flashback':{const k=p.grave.indexOf(tg);if(k>=0){p.grave.splice(k,1);p.hand.push(tg);log(tg.n+' revient en main.')}p.grave.push(c);break}
  case 'entrainement':{const m=p.mon[tg];if(m){m.tmp+=150;log(m.card.n+' gagne 150 ATK ce tour.')}p.grave.push(c);break}
  case 'provocation':{const m=p.mon[tg];if(m){G.taunt={owner:pi,m,left:2};log(m.card.n+' provoque l’adversaire pendant 2 tours.');banner('PROVOCATION','#e5483b')}p.grave.push(c);break}
  case 'potion':{healMon(pi,tg,500);p.potion=true;p.grave.push(c);break}
  case 'paralysie':{const m=P(1-pi).mon[tg];if(m){m.para=1;log(m.card.n+' est paralysé : pas d’attaque à son prochain tour.');banner('PARALYSIE','#8a56d6')}p.grave.push(c);break}
  case 'haki':{const m=P(1-pi).mon[tg];if(m){m.sleep=2;log(m.card.n+' s’endort pendant 2 tours (il se réveille s’il est touché).');banner('HAKI DES ROIS','#e5483b')}p.grave.push(c);break}
  case 'rappel':{const m=p.mon[tg];if(m){p.st.forEach((q,k)=>{if(q&&q.to===m){p.grave.push(q.card);p.st[k]=null}});p.mon[tg]=null;p.hand.push(m.card);p.normal=true;log(m.card.n+' revient en main.')}p.grave.push(c);break}
  case 'pacte':{const m=p.mon[tg];setLP(pi,p.lp-350);floatTxt(zoneEl('p',pi,0),'-350');if(m){m.atkP+=250;log(m.card.n+' gagne 250 ATK pour de bon.')}p.grave.push(c);checkEnd();break}
  case 'reunion':{const k=p.hand.indexOf(tg);const s=freeMon(pi);p.grave.push(c);if(k>=0&&s>=0)await doSummon(pi,k,s,'a',false,true);break}
  case 'forgeron':case 'epee':case 'cape':{const m=p.mon[tg],s=freeSt(pi);if(m&&s>=0){p.st[s]={card:c,up:true,to:m};log(c.n+' équipe '+m.card.n+'.')}else p.grave.push(c);break}
  case 'arene':case 'village':case 'lune':{if(G.field)P(G.field.owner).grave.push(G.field.card);G.field={card:c,owner:pi};G.fxChanged=1;break}
  case 'amitie':{const s=freeSt(pi);if(s>=0)p.st[s]={card:c,up:true,to:null};break}
  default:p.grave.push(c);
 }
 render();await sleep(350);
}
async function setTrap(pi,hi){
 const p=P(pi),he=handEl(pi,hi),src=rectOf(he);if(he)he.style.visibility='hidden';
 const c=p.hand.splice(hi,1)[0],s=freeSt(pi);
 const dst=zoneEl('s',pi,s);if(dst)await flyCard(src,dst,backHTML(),{dur:560});
 p.st[s]={card:c,up:false,to:null};log(S(pi,'poses','pose')+' une carte face cachée.');render();await sleep(300);
}
async function changePos(pi,i){
 const m=P(pi).mon[i];if(!m)return;
 m.chg=true;const toDef=m.pos==='a';await posAnim(pi,i,toDef);m.pos=toDef?'d':'a';
 banner(toDef?'POSITION DE DÉFENSE':'POSITION D’ATTAQUE',toDef?'#2f8fe0':'#e5483b');log(m.card.n+' passe en '+(toDef?'défense':'attaque')+'.');render();
}

/* ---------- évolutions ---------- */
const EQN={forgeron:'Forgeron',epee:'Épée légendaire',cape:'Cape d’invisibilité'}, FLN={arene:'Arène du tournoi',village:'Village caché',lune:'Nuit de pleine lune'};
function condShort(cd){
 switch(cd.t){
  case 'eq':return cd.id?'porte '+EQN[cd.id]:'porte un équipement';
  case 'field':return 'Terrain : '+FLN[cd.id];
  case 'trap':return 'un piège posé face cachée';
  case 'grave':return cd.n+' cartes au cimetière';
  case 'lp':return 'PV ≤ '+cd.max;
  case 'ally':return 'un allié de même couleur';
  case 'card':return 'avoir joué '+REG[cd.id].n;
 }
 return '';
}
function condLong(cd){
 switch(cd.t){
  case 'eq':return cd.id?'Le personnage doit porter l’équipement « '+EQN[cd.id]+' ».':'Le personnage doit porter un équipement (Forgeron, Épée légendaire ou Cape).';
  case 'field':return 'Le Terrain « '+FLN[cd.id]+' » doit être en jeu.';
  case 'trap':return 'Tu dois avoir un piège posé face cachée.';
  case 'grave':return 'Il faut au moins '+cd.n+' cartes dans ton cimetière.';
  case 'lp':return 'Tes points de vie doivent être à '+cd.max+' ou moins.';
  case 'ally':return 'Un autre personnage de la même couleur doit être sur ton terrain.';
  case 'card':return 'Tu dois avoir joué « '+REG[cd.id].n+' » (la carte doit être dans ton cimetière).';
 }
 return '';
}
const evoNote=c=>c.mats.length>1?' <b>Matériaux : '+esc(c.mats.map(m=>m.n).join(' + '))+'.</b>':(c.cond&&c.cond.length?' <b>Condition : '+esc(c.cond.map(condShort).join(' ; '))+'.</b>':'');
const evoNoteLong=c=>(c.mats.length>1?' Matériaux : '+c.mats.map(m=>m.n).join(' + ')+'.':'')+(c.cond&&c.cond.length?' Condition : '+c.cond.map(condLong).join(' ')+'':'')+' Aucune attente : tu peux évoluer tout de suite et attaquer avec.';
function condsFail(pi,c,idx){
 const p=P(pi),mi=idx[0],m=p.mon[mi],bad=[];
 (c.cond||[]).forEach(cd=>{
  let ok=true;
  switch(cd.t){
   case 'eq':ok=cd.id?eqN(pi,m,cd.id)>0:['forgeron','epee','cape'].some(i=>eqN(pi,m,i)>0);break;
   case 'field':ok=fld()===cd.id;break;
   case 'trap':ok=p.st.some(s=>s&&!s.up&&s.card.t==='trap');break;
   case 'grave':ok=p.grave.length>=cd.n;break;
   case 'lp':ok=p.lp<=cd.max;break;
   case 'ally':ok=mons(pi).some(x=>x.i!==mi&&x.m.card.col===m.card.col);break;
   case 'card':ok=p.grave.some(g=>g.id===cd.id);break;
  }
  if(!ok)bad.push(cd);
 });
 return bad;
}
function evoReady(pi,c){const idx=evoMats(pi,c);return idx&&!condsFail(pi,c,idx).length?idx:null}
function evoWhy(pi,c){
 if(!evoMats(pi,c,true))return 'Il te faut '+c.mats.map(x=>x.n).join(' + ')+' sur ton terrain.';
 const idx=evoMats(pi,c);
 if(!idx)return 'Il te faut '+c.mats.map(x=>x.n).join(' + ')+' sur ton terrain.';
 return 'Condition manquante : '+condsFail(pi,c,idx).map(condLong).join(' ');
}
/* liste lisible des conditions d'une évolution, avec ✓ / ✗ quand on connaît la situation (m = personnage du plateau) */
function evoChecks(e,m,strict){
 const out=[],p=P(0),live=!!m;
 const mi=live?p.mon.indexOf(m):-1;
 e.mats.forEach(x=>{
  const here=live&&mons(0).some(y=>y.m.card.id===x.id);
  out.push({ok:live?(x.id===m.card.id?true:here):strict?mons(0).some(y=>y.m.card.id===x.id):null,t:(x.id===(m&&m.card.id)?x.n+' est sur ton terrain':'Avoir '+x.n+' sur ton terrain')});
 });
 const idx=live&&mi>=0?(e.mats.length>1?evoMats(0,e,true):[mi]):null;
 const bad=idx?condsFail(0,e,idx):null;
 (e.cond||[]).forEach(cd=>{let ok=idx?!bad.includes(cd):null;if(ok===null&&strict){ok=cd.t==='field'?fld()===cd.id:cd.t==='trap'?p.st.some(z=>z&&!z.up&&z.card.t==='trap'):cd.t==='grave'?p.grave.length>=cd.n:cd.t==='lp'?p.lp<=cd.max:cd.t==='card'?p.grave.some(g=>g.id===cd.id):false}out.push({ok,t:condLong(cd).replace(/\.$/,'')})});
 return out;
}
const evoLi=l=>'<li style="margin:2px 0;list-style:none;color:'+(l.ok===true?'#6ee09a':l.ok===false?'#ff8a94':'inherit')+'">'+(l.ok===true?'✓ ':l.ok===false?'✗ ':'• ')+esc(l.t)+'</li>';
/* bloc « Évolution » affiché quand on ouvre un personnage qui peut évoluer */
function evoBlock(c,m){
 if(!G||!c||c.k!=='c')return '';
 const p=P(0),mine=m?p.mon.includes(m):p.hand.includes(c);
 if(!mine)return '';
 const list=p.extra.filter(e=>e.mats.some(x=>x.id===c.id));
 if(!list.length)return '';
 return list.map(e=>{
  const ready=m&&mons(0).some(y=>y.m===m)&&evoReady(0,e);
  return '<div class="evb2" style="margin-top:10px;padding:9px 11px;border:1px solid #b79cf0;border-radius:10px;background:#b79cf018;text-align:left"><b style="color:#d6c6ff">✦ Peut évoluer en « '+esc(e.n)+' »</b>'+
  (ready?' <b style="color:#6ee09a">· prête !</b>':'')+
  '<ul style="margin:6px 0 0;padding:0;font-size:.82rem">'+evoChecks(e,m).map(evoLi).join('')+'</ul>'+
  '<small style="display:block;margin-top:6px;color:#b8c2d8">Quand tout est ✓ : bouton « Évolution » à droite, ou ici.</small></div>';
 }).join('');
}
/* un personnage ne peut évoluer que s'il est sur le terrain depuis un tour précédent (any = on ignore cette attente) */
function evoMats(pi,c,any){
 const used=new Set(),idx=[];
 for(const m of c.mats){const x=mons(pi).find(y=>y.m.card.id===m.id&&!used.has(y.i));if(!x)return null;used.add(x.i);idx.push(x.i)}
 return idx;
}
async function doEvolve(pi,c,idx){
 const p=P(pi);
 banner('ÉVOLUTION !','#b79cf0');log(S(pi,'fais','fait')+' évoluer '+c.mats.map(m=>m.n).join(' + ')+' en '+c.n+'.');
 const lost=Math.max(0,idx.reduce((t,i)=>{const o=p.mon[i];return t+(o?def(pi,o)-o.hp:0)},0)/idx.length);
 idx.forEach(i=>{const e=zoneEl('m',pi,i);if(e&&e.firstElementChild)e.firstElementChild.classList.add('sel')});
 await sleep(750);
 for(const i of idx)await destroyMon(pi,i,'evolution');
 const slot=idx[0];
 p.extra=p.extra.filter(x=>x!==c);
 p.mon[slot]=mkM(c,'a');if(lost>0){p.mon[slot].hp=Math.max(1,Math.round(c.def-lost));p.mon[slot].full=false}G.pop='m'+pi+slot;
 render();hitAt(zoneEl('m',pi,slot));burst(zoneEl('m',pi,slot),'#b79cf0');await sleep(900);G.pop=null;
}
async function runEvolve(ci){
 if(!myTurn())return;
 const p=P(0),c=p.extra[ci];if(!c)return;const idx=evoReady(0,c);if(!idx)return toast(evoWhy(0,c));
 netSend('evo',{ci,idx});
 G.busy=true;ui.sel=null;ui.selMon=null;closeZoom();await doEvolve(0,c,idx);G.busy=false;render();
}
async function actEvolve(){
 if(!myTurn())return;
 const p=P(0);if(!p.extra.length)return toast('Ton deck d’évolution est vide.');
 const opts=p.extra.map(c=>({c,idx:evoReady(0,c)}));
 const m=modal('<h3>Évolution</h3><p>Choisis la transformation. Le personnage doit être sur ton terrain et la condition de la carte doit être remplie : pas d’attente, tu peux évoluer tout de suite et attaquer avec. Il est remplacé et va au cimetière.</p><div class="cbgrid2">'+opts.map((o,i)=>{const mm=mons(0).find(y=>o.c.mats.some(x=>x.id===y.m.card.id)),chk=evoChecks(o.c,mm?mm.m:null,true);return '<div class="it" data-i="'+i+'" style="'+(o.idx?'':'opacity:.55')+'">'+cardHTML(o.c)+'<ul style="margin:6px 0 0;padding:0;font-size:.74rem;text-align:left;max-width:230px">'+chk.map(evoLi).join('')+'</ul></div>'}).join('')+'</div><div class="cbact"><button class="sec" data-x="1">Annuler</button></div>');
 const r=await new Promise(res=>{m.onclick=e=>{const it=e.target.closest('.it');if(it){const o=opts[+it.dataset.i];if(!o.idx){m.querySelector('p').textContent=evoWhy(0,o.c);return}closeModal(m);res(o);return}if(e.target.closest('[data-x]')||e.target===m){closeModal(m);res(null)}}});
 if(!r)return;
 netSend('evo',{ci:p.extra.indexOf(r.c),idx:r.idx});
 G.busy=true;ui.sel=null;ui.selMon=null;await doEvolve(0,r.c,r.idx);G.busy=false;render();
}

/* ---------- IA ---------- */
function aiStrongest(pi){const l=mons(pi).slice().sort((a,b)=>atk(pi,b.m)-atk(pi,a.m));return l[0]||null}
async function aiSummon(){
 const p=P(1);if(p.normal)return;
 const chars=p.hand.map((c,i)=>({c,i})).filter(x=>x.c.k==='c');if(!chars.length)return;
 const mm=mons(1).slice().sort((a,b)=>a.m.card.atk-b.m.card.atk);
 let best=null;
 chars.forEach(x=>{
  let ok=false,trib=false;
  if(x.c.lvl<=4)ok=freeMon(1)>=0;
  else if(mm.length&&x.c.atk>mm[0].m.card.atk+300){ok=true;trib=true}
  if(ok&&(!best||x.c.atk>best.c.atk))best={c:x.c,i:x.i,trib};
 });
 if(!best)return;
 const opp=aiStrongest(0),oppA=opp?atk(0,opp.m):0;
 const pos=best.c.role==='def'?'d':'a';
 const slot=best.trib?mm[0].i:freeMon(1);
 await doSummon(1,best.i,slot,pos,best.trib);
}
async function aiSpellOnce(){
 const p=P(1);
 for(let k=0;k<p.hand.length;k++){
  const c=p.hand[k];if(c.k!=='s'||c.t==='trap'||c.t==='field')continue;
  const inf=spellInfo(1,c);if(!inf.ok)continue;
  let go=false,tg=null;const st=aiStrongest(1);
  switch(c.id){
   case 'ramen':go=p.lp<=7200;break;
   case 'senzu':go=p.lp<=6500;break;
   case 'examen':go=p.hand.length<=5&&p.deck.length>3;break;
   case 'flashback':go=p.hand.length<=6;if(go)tg=p.grave.filter(x=>x.k==='c').sort((a,b)=>b.atk-a.atk)[0];break;
   case 'entrainement':go=!!st&&G.n>1;if(go)tg=st.i;break;
   case 'pacte':go=!!st&&p.lp>3500&&G.n>1;if(go)tg=st.i;break;
   case 'reunion':go=true;tg=p.hand.filter(x=>x.k==='c'&&x.lvl>=5).sort((a,b)=>b.atk-a.atk)[0];break;
   case 'forgeron':case 'epee':case 'cape':go=!!st;if(go)tg=st.i;break;
   case 'potion':{const h=mons(1).filter(x=>x.m.hp<def(1,x.m)*.6).sort((a,b)=>a.m.hp-b.m.hp)[0];go=!!h;if(go)tg=h.i;break}
   case 'paralysie':{const f=aiStrongest(0);go=!!f&&G.n>1;if(go)tg=f.i;break}
  }
  if(go){await playSpell(1,k,tg);return true}
 }
 return false;
}
async function aiMain(){
 const p=P(1);
 const fi=p.hand.findIndex(c=>c.t==='field'&&c.id!==fld()&&!(c.id==='lune'&&!mons(1).some(x=>x.m.card.col===4)));
 if(fi>=0&&Math.random()<.7){await playSpell(1,fi,null);await sleep(300)}
 await aiSummon();
 for(let g=0;g<2&&!G.over;g++){const o=P(1).extra.map(c=>({c,idx:evoReady(1,c)})).filter(x=>x.idx).sort((a,b)=>b.c.atk-a.c.atk)[0];if(!o)break;await doEvolve(1,o.c,o.idx);await sleep(300)}
 for(let g=0;g<5&&!G.over;g++){if(!(await aiSpellOnce()))break;await sleep(300)}
 const ai=p.hand.findIndex(c=>c.id==='amitie');
 if(ai>=0&&mons(1).length>=3&&freeSt(1)>=0)await playSpell(1,ai,null);
 for(let g=0;g<3;g++){
  const ti=p.hand.findIndex(c=>c.t==='trap'&&c.id!=='amitie');
  if(ti<0||freeSt(1)<0)break;
  await setTrap(1,ti);
 }
 const opp=aiStrongest(0);
 if(opp)mons(1).forEach(x=>{if(!x.m.chg&&x.m.ts!==G.n&&x.m.pos==='a'&&atk(0,opp.m)>atk(1,x.m)+200&&x.m.card.role==='def')x.m.pos='d'});
 render();
}
async function aiBattle(){
 if(G.n===1)return;
 for(let g=0;g<4&&!G.over;g++){
  const my=mons(1).filter(x=>x.m.pos==='a'&&!x.m.att);if(!my.length)break;
  const x=my.sort((a,b)=>atk(1,b.m)-atk(1,a.m))[0];
  const ti0=tauntIdx(1),opps=mons(0).filter(o=>ti0<0||o.i===ti0);
  if(!mons(0).length){await battle(1,x.i,-1);await sleep(300);continue}
  let best=null,bs=0;
  opps.forEach(t=>{const h=calcHit(1,x.m,t);let sc=(h.kill?1000:h.dmg/t.m.hp*500)+t.m.card.atk/10;if(h.dies)sc-=900;else sc-=h.back/Math.max(1,x.m.hp)*300;if(sc>bs){bs=sc;best=t}});
  if(!best){x.m.att=true;continue}
  await battle(1,x.i,best.i);await sleep(350);
 }
}
async function aiTurn(){
 G.ai=true;render();
 await sleep(700);
 try{await aiMain();if(!G.over)await aiBattle()}catch(e){console.error(e)}
 if(G.over)return;
 await sleep(400);
 await finishTurn(1);
}

/* ---------- tours ---------- */
async function discardTo(pi){
 const p=P(pi);
 while(p.hand.length>HANDMAX&&!G.over){
  let c;
  if(pi===0){c=await chooseCard('Défausse une carte (main limitée à '+HANDMAX+')',p.hand.slice(),false);if(NET)netSend('ans',{v:p.hand.indexOf(c)})}
  else if(NET){const ix=await recvAns();c=p.hand[ix];if(!c)break}
  else c=p.hand.slice().sort((a,b)=>(a.k==='c'?a.lvl:0)-(b.k==='c'?b.lvl:0))[0];
  const k=p.hand.indexOf(c);if(k>=0){p.hand.splice(k,1);p.grave.push(c);log(S(pi,'défausses','défausse')+' '+c.n+'.')}
 }
}
async function finishTurn(pi){
 await discardTo(pi);
 G.p.forEach(p=>p.mon.forEach(m=>m&&(m.tmp=0)));
 if(G.taunt&&G.taunt.owner!==pi){G.taunt.left--;if(G.taunt.left<=0)G.taunt=null}
 G.turn=1-pi;G.n++;G.ai=false;ui.sel=null;ui.selMon=null;
 await startTurn();
}
async function startTurn(){
 const pi=G.turn,p=P(pi);
 p.normal=false;p.senzu=false;p.potion=false;p.mon.forEach(m=>{if(m){m.att=false;m.chg=false;if(m.para>0){m.att=true;m.para--}if(m.sleep>0){m.att=true;m.sleep--}}});
 banner(pi===0?'À TOI DE JOUER':'TOUR ADVERSE',pi===0?'#3dae5a':'#ec5fa0');
 G.busy=true;render();await sleep(600);
 if(G.n>1){if(pi===0)G.needDraw=true;else if(!NET)await drawN(pi,1)}
 if(G.over)return;
 G.busy=false;render();
 if(pi===0)startTimer();else if(NET){startTimer();remoteLoop()}else aiTurn();
}
function startTimer(){stopTimer();G.t0=Date.now();G.tm=setInterval(tick,200)}
function stopTimer(){if(G&&G.tm){clearInterval(G.tm);G.tm=null}}
function ringCol(pc){return pc>50?'#4ddf7a':pc>20?'#ffcb3d':'#ff5a4e'}
function tick(){
 if(!G||!alive||G.over)return;
 const pi=G.turn;if(pi===1&&!NET)return;
 const left=Math.max(0,LIM-(Date.now()-G.t0)),pc=left/LIM*100,r=$('cbR'+pi);
 if(r){r.style.setProperty('--tp',pc);r.style.setProperty('--c',ringCol(pc));r.classList.toggle('low',left<10000)}
 if(pi===0&&left<=0&&!G.busy&&!ui.modal&&!ui.pick){stopTimer();humanEnd()}
}
async function humanEnd(){
 if(!G||G.over||G.turn!==0||G.busy||G.ai||ui.modal)return;
 if(ui.pick&&ui.pickDone)ui.pickDone(null);
 if(G.needDraw){G.needDraw=false;G.busy=true;netSend('drw');await drawN(0,1)}
 stopTimer();netSend('end');G.busy=true;render();await finishTurn(0);
}
function endGame(winner,why){
 if(G.over)return;G.over=true;stopTimer();
 setTimeout(async()=>{
  if(!alive)return;
  const r=await ask(winner===0?'Victoire !':'Défaite',why,NET?[{v:'menu',t:'Retour au menu'}]:[{v:'again',t:'Rejouer'},{v:'menu',t:'Retour au menu',sec:1}]);
  if(r==='again')startGame();else showMenu();
 },900);
}

/* ---------- actions du joueur ---------- */
const myTurn=()=>G&&!G.over&&G.turn===0&&!G.busy&&!G.ai&&!G.needDraw&&!ui.pick&&!ui.modal;
async function doDraw(){
 if(!G||!G.needDraw||G.turn!==0||G.over||G.busy)return;
 G.needDraw=false;netSend('drw');G.busy=true;render();
 await drawN(0,1);G.busy=false;render();
}
async function actSummon(hi,pos,pre){
 if(!myTurn())return;
 const p=P(0),c=p.hand[hi];if(!c||c.k!=='c')return;
 if(p.normal)return toast('Tu as déjà invoqué un personnage ce tour.');
 let slot,trib=false;
 if(c.lvl>=5){
  const l=mons(0);if(!l.length)return toast('Il faut sacrifier un personnage pour invoquer le niveau '+c.lvl+'.');
  if(pre!=null&&p.mon[pre]){slot=pre;trib=true}else{const t=await pick('Choisis le personnage à sacrifier',l.map(x=>({z:'m',p:0,i:x.i})),true);if(!t)return;slot=t.i;trib=true}
 }else{slot=(pre!=null&&!p.mon[pre])?pre:freeMon(0);if(slot<0)return toast('Aucune zone de personnage libre.')}
 netSend('sum',{hi,slot,pos,trib});
 G.busy=true;ui.sel=null;await doSummon(0,hi,slot,pos,trib);G.busy=false;render();
}
async function actSpell(hi,pre){
 if(!myTurn())return;
 const p=P(0),c=p.hand[hi];if(!c)return;
 const inf=spellInfo(0,c);if(!inf.ok)return toast(inf.why);
 let tg=null;
 if(inf.tg==='mon'){if(pre!=null&&p.mon[pre])tg=pre;else{const t=await pick('Choisis un de tes personnages',mons(0).map(x=>({z:'m',p:0,i:x.i})),true);if(!t)return;tg=t.i}}
 else if(inf.tg==='foe'){const ids=inf.ids||mons(1).map(x=>x.i);if(pre!=null&&ids.includes(pre))tg=pre;else{const t=await pick('Choisis un personnage adverse',ids.map(i=>({z:'m',p:1,i})),true);if(!t)return;tg=t.i}}
 else if(inf.tg==='grave'){tg=await chooseCard('Choisis un personnage du cimetière',p.grave.filter(x=>x.k==='c'),true);if(!tg)return}
 else if(inf.tg==='hand56'){tg=await chooseCard('Choisis le personnage à poser',p.hand.filter(x=>x.k==='c'&&x.lvl>=5),true);if(!tg)return}
 const hi2=p.hand.indexOf(c);if(hi2<0)return;
 if(NET){const tgk=inf.tg==='grave'?'g':inf.tg==='hand56'?'h':inf.tg==='mon'?'m':inf.tg==='foe'?'f':'';netSend('spl',{hi:hi2,tgk,tg:tgk==='g'?p.grave.indexOf(tg):tgk==='h'?p.hand.indexOf(tg):tg})}
 G.busy=true;ui.sel=null;await playSpell(0,hi2,tg);G.busy=false;render();
}
async function actSet(hi){
 if(!myTurn())return;
 if(freeSt(0)<0)return toast('Aucune zone de soutien libre.');
 netSend('set',{hi});
 G.busy=true;ui.sel=null;await setTrap(0,hi);G.busy=false;render();
}
/* résultat réel d'une attaque (avec l'avantage de couleur ×1,2 / ×0,8) */
function attackPreview(i,ti){
 const A=P(0).mon[i],T=ti>=0?P(1).mon[ti]:null,a=atk(0,A);
 if(!T)return {risky:false,direct:true,text:A.card.n+' attaque directement : l’adversaire perd '+a+' points de vie.'};
 const h=calcHit(0,A,T),fx=h.f>1?' (avantage de couleur ×1,2)':h.f<1?' (désavantage de couleur ×0,8)':'';
 let t=A.card.n+' inflige '+h.dmg+' dégâts à '+T.card.n+fx+' (PV '+T.hp+' → '+h.left+')';
 if(T.pos==='d')t+=h.pierce?', l’armure est percée':', son armure absorbe '+h.arm;
 t+='. ';
 if(h.kill)t+=T.card.n+' est détruit. ';
 else if(h.back>0)t+=(T.pos==='a'?'Il riposte':'Ses Épines renvoient')+' '+h.back+' dégâts : '+A.card.n+' passe à '+Math.max(0,A.hp-h.back)+' PV'+(h.dies?' et sera détruit':'')+'.';
 return {risky:h.dies||(!h.kill&&h.back>=A.hp*.5),text:t};
}
async function actAttack(i,pre){
 if(!myTurn())return;
 if(G.n===1)return toast('On ne peut pas attaquer au premier tour de la partie.');
 const m=P(0).mon[i];if(!m||m.att||m.pos!=='a')return;
 const ti0=tauntIdx(0),opps=mons(1).filter(x=>ti0<0||x.i===ti0);let ti=-1;
 if(pre!=null)ti=pre;else if(opps.length){const t=await pick('Choisis le personnage à attaquer',opps.map(x=>({z:'m',p:1,i:x.i})));if(!t)return;ti=t.i}
 {const pv=attackPreview(i,ti);
  if(pv.risky||(pv.direct&&pre==null)){
   const r=await ask(pv.risky?'Attaque risquée':'Attaque directe',pv.text,[{v:'go',t:pv.risky?'Attaquer quand même':'Attaquer'},{v:'no',t:'Annuler',sec:1}]);
   if(r!=='go')return;
  }}
 netSend('att',{i,ti});
 G.busy=true;ui.selMon=null;await battle(0,i,ti);G.busy=false;render();
}
async function actPos(i){
 if(!myTurn())return;const m=P(0).mon[i];if(!m)return;
 if(m.chg)return toast('Ce personnage a déjà changé de position.');
 if(m.ts===G.n)return toast('Un personnage ne peut pas changer de position le tour où il est invoqué.');
 netSend('pos',{i});
 G.busy=true;ui.selMon=null;await changePos(0,i);G.busy=false;render();
}

/* ---------- rendu du plateau ---------- */
function slot(z,p,i,label,inner,cls){return '<div class="slot '+(cls||'')+(ui.pick&&ui.pick.cands.some(c=>c.z===z&&c.p===p&&c.i===i)?' tg':'')+'" data-z="'+z+'" data-p="'+p+'" data-i="'+i+'" data-l="'+label+'">'+(inner||'')+'</div>'}
function evoReadyMap(){
 const r={};if(!G||G.over||G.turn!==0)return r;
 P(0).extra.forEach((e,ci)=>{const idx=evoReady(0,e);if(idx)idx.forEach(i=>{if(!r[i])r[i]={ci,e}})});
 return r;
}
function monStats(pi,i){
 const m=P(pi).mon[i];if(!m)return '';
 const mx=def(pi,m),c=m.card,pc=Math.max(0,Math.min(100,m.hp/mx*100)),col=pc>50?'#4ddf7a':pc>25?'#ffcb3d':'#ff5a4e';
 const st=m.sleep>0?'<em class="mstat">Z</em>':m.para>0?'<em class="mstat">⛓</em>':'';
 const tn=G.taunt&&G.taunt.m===m?'<em class="mstat t">!</em>':'';
 return st+tn+'<div class="hpg" data-pc="'+(pc>50?'hi':pc>25?'mid':'lo')+'" title="PV '+m.hp+' / '+mx+(m.pos==='d'&&armor(pi,m)>0?' · armure '+armor(pi,m):'')+'"><b>'+m.hp+'</b><span><i style="width:'+pc+'%"></i></span></div>';
}
function monHTML(pi,i){
 const m=P(pi).mon[i];if(!m)return '';
 const cls=(m.pos==='d'?' def':'')+(ui.selMon===i&&pi===0?' sel':'')+(pi===0&&m.att?' used':'')+(G.pop==='m'+pi+i?' pop':'');
 let evx='';
 if(pi===0&&G&&!G.over){
  const rd=evoReadyMap()[i];
  if(rd&&myTurn())evx='<span class="evgo" data-evo="'+rd.ci+'">✦ ÉVOLUER</span>';
  else if(P(0).extra.some(e=>e.mats.some(x=>x.id===m.card.id)))evx='<span class="evh" title="Ce personnage peut évoluer : clique dessus pour voir la condition">✦</span>';
 }
 return '<div class="bc'+cls+(evx.indexOf('evgo')>0?' evr':'')+'">'+cardHTML(m.card,{atk:atk(pi,m),def:m.hp})+evx+'</div>';
}
function stHTML(pi,i){
 const s=P(pi).st[i];if(!s)return '';
 if(s.up)return '<div class="bc">'+cardHTML(s.card)+'</div>';
 return pi===0?'<div class="bc setc">'+cardHTML(s.card)+'</div>':'<div class="bc">'+backHTML()+'</div>';
}
function render(){
 const b=boardEl();if(!b||!G)return;
 hidePop();popTarget=null;
 const me=P(0),op=P(1),can=myTurn(),mob=window.innerWidth<700;G.mob=mob;
 const gv=pi=>{const g=P(pi).grave,t=g[g.length-1];return t?'<div class="bc">'+cardHTML(t)+'</div><span class="cnt">'+g.length+'</span>':''};
 const dk=pi=>{const n=P(pi).deck.length;return n?'<div class="bc">'+backHTML()+'</div><span class="cnt">'+n+'</span>':''};
 const hand=me.hand.map((c,i)=>{
  const inf=c.k==='c'?{ok:!me.normal&&(c.lvl<5||mons(0).length>0)&&(c.lvl>=5||freeMon(0)>=0)}:c.t==='trap'?{ok:freeSt(0)>=0}:spellInfo(0,c);
  const r=(i-(me.hand.length-1)/2)*(me.hand.length>6?5:7),y=Math.abs(i-(me.hand.length-1)/2)*4;
  return '<div class="hc'+(ui.sel===i?' sel':'')+(!inf.ok&&can?' off':'')+(G.newC===c?' new':'')+'" data-z="h" data-p="0" data-i="'+i+'" style="transform:rotate('+r+'deg) translateY('+y+'px)">'+cardHTML(c)+'</div>';
 }).join('');
 const oh=op.hand.map(()=>'<div class="hc">'+backHTML()+'</div>').join('');
 const fcard=G.field?'<div class="bc">'+cardHTML(G.field.card)+'</div>':'';
 const dglow=G.needDraw&&G.turn===0&&!G.over;
 const st=pi=>[0,1,2].map(i=>slot('s',pi,i,'Soutien',stHTML(pi,i),'st'));
 const mn=pi=>[0,1,2].map(i=>slot('m',pi,i,'Personnage',monHTML(pi,i)+monStats(pi,i),''));
 const chip=(z,pi,i,label,n,gl)=>'<span class="chip'+(gl?' glow':'')+'" data-z="'+z+'" data-p="'+pi+'" data-i="'+i+'">'+label+(n!=null?' · '+n:'')+'</span>';
 const strip=pi=>'<div class="strip">'+chip('g',pi,0,'Cimetière',P(pi).grave.length)+chip('d',pi,0,dglow&&pi===0?'Pioche !':'Pioche',P(pi).deck.length,dglow&&pi===0)+(pi===1?chip('f',0,0,'Terrain',G.field?1:0):'')+'</div>';
 const row=(a,c)=>'<div class="crw '+(c||'')+'">'+a.join('')+'</div>';
 const rowF=a=>'<div class="crw first bk">'+a.join('')+'</div>';
 const grp=(a,c)=>'<div class="grp '+c+'">'+a.join('')+'</div>';
 const dRow=(m,t,d)=>'<div class="crw dk">'+grp(m,'gm')+grp(t,'gs')+grp(d,'gd')+'</div>';
 const sdOpp=[slot('g',1,0,'Cimetière',gv(1),'sd'),slot('d',1,0,'Pioche',dk(1),'deck sd'),slot('f',0,0,'Terrain',fcard,'sd')];
 const sdMe=[slot('g',0,0,'Cimetière',gv(0),'sd'),slot('d',0,0,dglow?'Pioche !':'Pioche',dk(0),'deck sd'+(dglow?' glow':'')),slot('x',0,2,'','','e sd')];
 const oppSt=mob?st(1):[slot('g',1,0,'Cimetière',gv(1),'sd')].concat(st(1),[slot('d',1,0,'Pioche',dk(1),'deck sd')]);
 const oppMon=mob?mn(1):[slot('x',0,0,'','','e')].concat(mn(1),[slot('x',0,0,'','','e')]);
 const myMon=mob?mn(0):[slot('x',0,1,'','','e')].concat(mn(0),[slot('x',0,2,'','','e')]);
 const mySt=mob?st(0):[slot('d',0,0,dglow?'Pioche !':'Pioche',dk(0),'deck sd'+(dglow?' glow':''))].concat(st(0),[slot('g',0,0,'Cimetière',gv(0),'sd')]);
 b.classList.toggle('mob',mob);b.classList.toggle('mine',G.turn===0&&!G.over);b.classList.toggle('theirs',G.turn===1&&!G.over);
 const mid=G.over?'PARTIE TERMINÉE':G.turn===0?(G.needDraw?'À TOI DE PIOCHER · TOUR '+G.n:'À TOI DE JOUER · TOUR '+G.n):'TOUR DE L’ADVERSAIRE · TOUR '+G.n;
 b.innerHTML=
 '<div class="ban" id="cbBan"><b></b></div>'+
 '<div class="cpl o'+(G.turn===1&&!G.over?' act':'')+'"><div class="cring'+(G.ai?' think':'')+'" id="cbR1" data-z="p" data-p="1" data-i="0" style="--tp:'+(G.turn===1&&NET&&G.t0?Math.max(0,100-(Date.now()-G.t0)/LIM*100):0)+'">'+avHTML(G.pr[1])+'</div><div class="cpt"><small>'+esc(G.pr[1].n.toUpperCase())+'</small><em class="tag">SON TOUR</em><b id="cbLp1">'+op.lp+'</b></div></div>'+
 '<div class="hnd o">'+oh+'</div>'+
 (mob?strip(1):'')+
 rowF(oppSt)+row(oppMon,'fr')+
 '<div class="mid '+(G.turn===0?'me':'op')+'"><span>'+mid+'</span>'+(mob?'':'<div class="fz">'+slot('f',0,0,'Terrain',fcard,'sd')+'<i>TERRAIN · COMMUN</i></div>')+'</div>'+
 row(myMon,'fr')+row(mySt,'bk')+
 (mob?strip(0):'')+
 '<div class="hnd m">'+hand+'</div>'+
 '<button class="endb" id="cbEnd"'+(can?'':' disabled')+'>Fin du tour</button>'+(dglow?'<div class="needd"><span>À toi de piocher</span><button type="button">Piocher</button></div>':'')+(!dglow&&can&&Object.keys(evoReadyMap()).length?'<div class="needd evp"><span>✦ Une de tes cartes peut évoluer !</span><button type="button">Évoluer</button></div>':'')+
 '<div class="cpl m'+(G.turn===0&&!G.over?' act':'')+'"><div class="cring" id="cbR0" data-z="p" data-p="0" data-i="0" style="--tp:'+(G.turn===0&&G.t0?Math.max(0,100-(Date.now()-G.t0)/LIM*100):0)+'">'+avHTML(G.pr[0])+'</div><div class="cpt"><small>'+esc(G.pr[0].n.toUpperCase())+'</small><em class="tag">À TOI</em><b id="cbLp0">'+me.lp+'</b></div></div>';
 if(G.fxChanged){b.classList.toggle('fa',fld()==='arene');G.fxChanged=0}
 renderPanel();
}
function cardAt(z,p,i){
 const pl=G.p[p];
 if(z==='h')return p===0?{c:pl.hand[i]}:null;
 if(z==='m'){const m=pl.mon[i];return m?{c:m.card,atk:atk(p,m),def:m.hp,m}:null}
 if(z==='s'){const s=pl.st[i];return s&&(s.up||p===0)?{c:s.card}:null}
 if(z==='g'){const g=pl.grave;return g.length?{c:g[g.length-1]}:null}
 if(z==='f')return G.field?{c:G.field.card}:null;
 return null;
}
function renderPrev(info){
 const el=$('cbPrev');if(!el)return;
 if(!info){el.innerHTML='<span>Passe la souris sur une carte pour la lire.</span>';return}
 el.innerHTML='<div class="pw">'+cardHTML(info.c,{atk:info.atk,def:info.def})+'</div>';
}
function actHTML(){
 if(!G)return '';
 const can=myTurn();let h='';
 if(ui.sel!=null&&P(0).hand[ui.sel]){
  const c=P(0).hand[ui.sel];
  if(c.k==='c'){
   const why=P(0).normal?'Déjà invoqué ce tour':c.lvl>=5&&!mons(0).length?'Sacrifice impossible':c.lvl<5&&freeMon(0)<0?'Zones pleines':'';
   h='<button data-a="sa"'+(can&&!why?'':' disabled')+'>Invoquer en attaque</button><button data-a="sd"'+(can&&!why?'':' disabled')+'>Invoquer en défense</button>'+(why?'<small style="width:100%;color:#b8c2d8">'+why+(c.lvl>=5?' (niveau '+c.lvl+' : 1 sacrifice)':'')+'</small>':c.lvl>=5?'<small style="width:100%;color:#b8c2d8">Niveau '+c.lvl+' : sacrifie un personnage.</small>':'');
  }else if(c.t==='trap'){
   const am=c.id==='amitie';
   h='<button data-a="set"'+(can&&freeSt(0)>=0?'':' disabled')+'>Poser face cachée</button>'+(am?'<button data-a="act"'+(can&&freeSt(0)>=0?'':' disabled')+'>Activer (face visible)</button>':'');
  }else{
   const inf=spellInfo(0,c);
   h='<button data-a="act"'+(can&&inf.ok?'':' disabled')+'>Activer</button>'+(inf.ok?'':'<small style="width:100%;color:#b8c2d8">'+esc(inf.why)+'</small>');
  }
 }else if(ui.selMon!=null&&P(0).mon[ui.selMon]){
  const m=P(0).mon[ui.selMon];
  h='<button data-a="att"'+(can&&m.pos==='a'&&!m.att&&G.n>1?'':' disabled')+'>Attaquer</button><button class="sec" data-a="pos"'+(can&&!m.chg&&m.ts!==G.n?'':' disabled')+'>'+(m.pos==='a'?'Passer en défense':'Passer en attaque')+'</button>'+(G.n===1?'<small style="width:100%;color:#b8c2d8">Pas d’attaque au premier tour.</small>':'');
 }
 return h;
}
function renderPanel(){
 const el=$('cbAct');if(!el||!G)return;
 const ev=$('cbEvoW');if(ev){const n=P(0).extra.length,rd=P(0).extra.some(c=>evoReady(0,c));ev.innerHTML=n?'<button class="sec'+(rd&&myTurn()?' ready':'')+'" data-a="evo">✦ Évolution ('+n+')'+(rd?' · PRÊTE !':'')+'</button>':''}
 const h=actHTML();
 el.innerHTML=h||'<small style="color:#b8c2d8">'+(G.needDraw&&G.turn===0?'<b style="color:#ffd84a">C’est à toi de piocher : clique sur ta pioche (elle brille).</b>':myTurn()?'Clique sur une carte pour la lire et la jouer.':G.turn===1?'C’est le tour de l’adversaire.':'')+'</small>';
}
/* zoom : la carte arrive au milieu de l’écran, texte lisible, actions dessous */
function closeZoom(){const z=ui.zoomEl;if(z&&z.parentNode)z.remove();ui.zoomEl=null}
function openZoom(src,info,acts){
 closeZoom();
 const c=info.c,zs=Math.max(.6,Math.min(1.25,(window.innerWidth-40)/260,(window.innerHeight-230-(c.k==='c'&&evoBlock(c,info.m)?150:0))/379));
 const o=document.createElement('div');o.className='cbzoom bk'+backN();o.style.setProperty('--zs',zs.toFixed(3));
 const isC=c.k==='c'||c.k==='e';
 const txt=isC?'「'+c.sn+'」 : '+c.sd+(c.k==='e'?evoNoteLong(c):'')+' Niveau '+c.lvl+' · ATK '+(info.atk!=null?info.atk:c.atk)+' · PV '+(info.def!=null?info.def:c.def)+(c.arm?' · Armure '+c.arm:'')+(c.refl?' · Épines '+c.refl:'')+(c.pierce?' · Perce l’armure':'')+'.':c.txt;
 const sub=isC?(c.k==='e'?'Évolution':'Personnage')+' · '+COL[c.col].k+' '+COL[c.col].n+(c.ex?' · Rare':''):'Carte '+(c.t==='trap'?'Piège':'Magie')+' · '+c.sub;
 o.innerHTML='<div class="zw"><div class="zc">'+cardHTML(c,{atk:info.atk,def:info.def})+'</div><div class="ztx"><b>'+esc(c.n)+'</b><small>'+esc(sub)+'</small><p>'+esc(txt)+'</p>'+(isC?evoBlock(c,info.m):'')+'</div><div class="cbact">'+(acts||'')+(isC&&info.m&&myTurn()&&P(0).extra.some(e=>e.mats.some(x=>x.id===c.id)&&evoReady(0,e))?'<button data-a="evo">Évoluer</button>':'')+'<button class="sec" data-a="close">Fermer</button></div></div>';
 (document.getElementById('v-cb')||document.body).appendChild(o);ui.zoomEl=o;
 const zc=o.querySelector('.zc');
 if(src&&src.getBoundingClientRect){
  const r=src.getBoundingClientRect(),zr=zc.getBoundingClientRect();
  try{zc.animate([{transform:'translate('+(r.left+r.width/2-(zr.left+zr.width/2))+'px,'+(r.top+r.height/2-(zr.top+zr.height/2))+'px) scale('+Math.max(.12,r.width/zr.width)+') rotate(-8deg)',opacity:.3},{transform:'translate(0,0) scale(1.06) rotate(1deg)',opacity:1,offset:.7},{transform:'none',opacity:1}],{duration:430,easing:'cubic-bezier(.2,.9,.3,1)'})}catch(e){}
 }
 o.onclick=e=>{
  const b=e.target.closest('button');
  if(b&&b.dataset.a){const a=b.dataset.a;if(a==='close'){closeZoom();return}if(b.disabled)return;closeZoom();onAct({target:b});return}
  if(!e.target.closest('.zc')&&!e.target.closest('.ztx'))closeZoom();
 };
}
function showGrave(pi){
 const g=P(pi).grave;
 if(!g.length){toast(pi===0?'Ton cimetière est vide.':'Le cimetière adverse est vide.');return}
 const m=modal('<h3>Cimetière '+(pi===0?'(le tien)':'(adverse)')+' · '+g.length+' carte'+(g.length>1?'s':'')+'</h3><p>Clique sur une carte pour la lire.</p><div class="cbgrid2">'+g.map((c,i)=>'<div class="it" data-i="'+i+'">'+cardHTML(c)+'</div>').join('')+'</div><div class="cbact"><button class="sec" data-x="1">Fermer</button></div>');
 m.onclick=e=>{const it=e.target.closest('.it');if(it){openZoom(it,{c:g[+it.dataset.i]},'');return}if(e.target.closest('[data-x]')||e.target===m)closeModal(m)};
}
function fit(){
 const b=boardEl();if(!b)return;
 const mob=window.innerWidth<700,w=b.clientWidth-16;
 const set=c=>{b.style.setProperty('--cw',c+'px');b.style.setProperty('--s0',(c/260).toFixed(4))};
 if(mob){set(Math.max(60,Math.min(130,Math.floor(w/3.3))));return}
 const top=b.getBoundingClientRect().top+window.scrollY,H=Math.max(420,window.innerHeight-top-10);
 const cap=()=>Math.max(60,Math.min(170,Math.floor(w/5.9)));
 let cw=Math.max(60,Math.min(cap(),Math.floor((H-30)/7.2)));
 set(cw);
 for(let i=0;i<4;i++){const h=b.offsetHeight;if(h>H||h<H*.95){const n=Math.max(60,Math.min(cap(),Math.floor(cw*H/h*.995)));if(n===cw)break;cw=n;set(cw)}else break}
}

/* ---------- entrées (clic, survol) ---------- */
function onBoardClick(e){
 if(!G)return;
 if(dragSup){dragSup=false;return}
 hidePop();popTarget=null;
 if(e.target.closest('.evp button')){actEvolve();return}
 if(e.target.closest('.needd button')){doDraw();return}
 {const eg=e.target.closest('.evgo');if(eg){runEvolve(+eg.dataset.evo);return}}
 if(e.target.closest('#cbEnd')){humanEnd();return}
 const z=e.target.closest('[data-z]');if(!z)return;
 const zz=z.dataset.z,p=+z.dataset.p,i=+z.dataset.i;
 if(ui.pick){const c=ui.pick.cands.find(c=>c.z===zz&&c.p===p&&c.i===i);if(c&&ui.pickDone)ui.pickDone(c);return}
 if(ui.modal)return;
 if(zz==='d'&&p===0&&G.needDraw&&!G.busy){doDraw();return}
 if(zz==='d'){toast((p===0?'Ta pioche : ':'Pioche adverse : ')+P(p).deck.length+' carte'+(P(p).deck.length>1?'s':'')+'.');return}
 if(zz==='g'){showGrave(p);return}
 if(zz==='h'&&p===0){
  if(!myTurn()){const inf=cardAt('h',0,i);if(inf)openZoom(z,inf,'');return}
  ui.sel=i;ui.selMon=null;render();openZoom(z,cardAt('h',0,i),actHTML());return;
 }
 if(zz==='m'){
  const inf=cardAt('m',p,i);if(!inf)return;
  if(p===0&&myTurn()){ui.selMon=i;ui.sel=null;render();openZoom(z,inf,actHTML())}else openZoom(z,inf,'');
  return;
 }
 if(zz==='s'||zz==='f'){const inf=cardAt(zz,p,i);if(inf)openZoom(z,inf,'');return}
}

/* ---------- glisser-déposer : on tient une carte de la main, les zones libres brillent ---------- */
let dragSup=false,drag=null;
function dropTargets(src){
 const p=P(0),q=sel=>[...boardEl().querySelectorAll(sel)];
 if(src.z==='m'){
  const m=p.mon[src.i];if(!m)return {no:'Rien à faire avec cette carte.'};
  if(G.n===1)return {no:'On ne peut pas attaquer au premier tour de la partie.'};
  if(m.att)return {no:'Ce personnage a déjà attaqué ce tour.'};
  if(m.pos!=='a')return {no:'Un personnage en défense ne peut pas attaquer : passe-le en attaque.'};
  const ti0=tauntIdx(0),opps=mons(1).filter(x=>ti0<0||x.i===ti0);
  if(opps.length)return {els:q('.slot[data-z="m"][data-p="1"]').filter(e=>opps.some(x=>x.i===+e.dataset.i)),act:e=>actAttack(src.i,+e.dataset.i),hint:'Dépose sur le personnage à attaquer'};
  return {els:q('.cring[data-p="1"]'),act:()=>actAttack(src.i,-1),hint:'Attaque directe : dépose sur l’adversaire'};
 }
 const hi=src.i,c=p.hand[hi];if(!c)return {no:'Carte introuvable.'};
 if(c.k==='c'){
  if(p.normal)return {no:'Tu as déjà invoqué un personnage ce tour.'};
  if(c.lvl>=5){if(!mons(0).length)return {no:'Il faut sacrifier un personnage pour invoquer le niveau '+c.lvl+' : aucun personnage à sacrifier.'};return {els:q('.slot[data-z="m"][data-p="0"]').filter(e=>p.mon[+e.dataset.i]),act:async sl=>{const pos=await askPos(sl);if(pos)actSummon(hi,pos,+sl.dataset.i)},hint:'Dépose sur le personnage à sacrifier'}}
  if(freeMon(0)<0)return {no:'Aucune zone de personnage libre.'};
  return {els:q('.slot[data-z="m"][data-p="0"]').filter(e=>!p.mon[+e.dataset.i]),act:async sl=>{const pos=await askPos(sl);if(pos)actSummon(hi,pos,+sl.dataset.i)},hint:'Dépose sur une zone libre'};
 }
 if(c.t==='trap'){
  if(freeSt(0)<0)return {no:'Aucune zone de soutien libre.'};
  return {els:q('.slot[data-z="s"][data-p="0"]').filter(e=>!p.st[+e.dataset.i]),act:()=>actSet(hi),hint:'Dépose sur une zone de soutien'};
 }
 const inf=spellInfo(0,c);if(!inf.ok)return {no:inf.why};
 if(c.t==='field')return {els:q('.slot[data-z="f"]'),act:()=>actSpell(hi),hint:'Dépose sur le Terrain'};
 if(inf.tg==='mon')return {els:q('.slot[data-z="m"][data-p="0"]').filter(e=>p.mon[+e.dataset.i]),act:sl=>actSpell(hi,+sl.dataset.i),hint:'Dépose la carte sur le personnage visé'};
 if(inf.tg==='foe'){const ids=inf.ids||mons(1).map(x=>x.i);return {els:q('.slot[data-z="m"][data-p="1"]').filter(e=>ids.includes(+e.dataset.i)),act:sl=>actSpell(hi,+sl.dataset.i),hint:'Dépose la carte sur le personnage adverse visé'}}
 if(freeSt(0)<0)return {no:'Aucune zone de soutien libre.'};
 return {els:q('.slot[data-z="s"][data-p="0"]').filter(e=>!p.st[+e.dataset.i]),act:()=>actSpell(hi),hint:'Dépose sur une zone de soutien'};
}
function askPos(slotEl){
 return new Promise(res=>{
  document.querySelectorAll('.cbpos').forEach(x=>x.remove());
  const r=slotEl.getBoundingClientRect(),d=document.createElement('div');d.className='cbpos';
  d.innerHTML='<b>Position ?</b><button type="button" data-p="a">⚔ Attaque</button><button type="button" data-p="d">🛡 Défense</button><button type="button" class="x" data-p="">Annuler</button>';
  (document.getElementById('v-cb')||document.body).appendChild(d);
  const w=d.offsetWidth,h=d.offsetHeight;
  d.style.left=Math.max(8,Math.min(window.innerWidth-w-8,r.left+r.width/2-w/2))+'px';
  d.style.top=Math.max(8,Math.min(window.innerHeight-h-8,r.top-h-8<8?r.bottom+8:r.top-h-8))+'px';
  const done=v=>{d.remove();document.removeEventListener('pointerdown',out,true);res(v||null)};
  const out=e=>{if(!d.contains(e.target))done(null)};
  d.onclick=e=>{const b=e.target.closest('button');if(b)done(b.dataset.p)};
  setTimeout(()=>document.addEventListener('pointerdown',out,true),50);
 });
}
function dragHint(t){
 let h=document.getElementById('cbDragHint');
 if(!t){if(h)h.remove();return}
 if(!h){h=document.createElement('div');h.id='cbDragHint';(document.getElementById('v-cb')||document.body).appendChild(h)}
 h.className=t.no?'no':'';h.textContent=t.no?'⛔ '+t.no:t.hint||'';
}
function endDrag(keepGhost){
 if(!drag)return;
 document.removeEventListener('pointermove',onDragMove);document.removeEventListener('pointerup',onDragEnd);document.removeEventListener('pointercancel',onDragEnd);
 if(drag.ghost&&!keepGhost)drag.ghost.remove();
 if(drag.el)drag.el.classList.remove('dragging');
 document.querySelectorAll('.dz').forEach(e=>e.classList.remove('dz','over'));
 const b=boardEl();if(b)b.classList.remove('dragging','nodrop');
 dragHint(null);
 drag=null;
}
function onDragStart(e){
 if(!G||G.over||e.button!==0||e.pointerType==='touch')return;
 let el=e.target.closest('.hc[data-z="h"]'),src;
 if(el&&!el.closest('.hnd.o'))src={z:'h',i:+el.dataset.i};
 else{el=e.target.closest('.slot[data-z="m"][data-p="0"]');if(!el||!P(0).mon[+el.dataset.i])return;src={z:'m',i:+el.dataset.i}}
 let t;
 if(myTurn())t=dropTargets(src);
 else if(G.needDraw&&G.turn===0&&!G.busy&&!ui.pick&&!ui.modal)t={no:'Pioche d’abord : clique sur ta pioche.'};
 else if(G.turn===1&&!ui.modal)t={no:'Ce n’est pas ton tour.'};
 else return;
 drag={el,src,t,x:e.clientX,y:e.clientY,on:false,ghost:null,over:null};
 document.addEventListener('pointermove',onDragMove);document.addEventListener('pointerup',onDragEnd);document.addEventListener('pointercancel',onDragEnd);
}
function onDragMove(e){
 if(!drag)return;
 if(!drag.on){
  if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<9)return;
  drag.on=true;hidePop();popTarget=null;
  if(myTurn())drag.t=dropTargets(drag.src);
  if(!drag.el.isConnected){const sel=drag.src.z==='h'?'.hnd.m .hc[data-i="'+drag.src.i+'"]':'.slot[data-z="m"][data-p="0"][data-i="'+drag.src.i+'"]';drag.el=boardEl().querySelector(sel)||drag.el}
  const inner=drag.src.z==='m'?(drag.el.querySelector('.y')||drag.el):drag.el;
  const r=inner.getBoundingClientRect(),g=document.createElement('div');
  g.className='cbghost bk'+backN()+(drag.t.no?' bad':'');g.style.width=r.width+'px';g.style.height=r.height+'px';
  g.style.setProperty('--zs',(r.width/260).toFixed(3));
  g.innerHTML=drag.src.z==='h'?drag.el.innerHTML:(drag.el.querySelector('.y')?drag.el.querySelector('.y').outerHTML:drag.el.innerHTML);
  if(drag.t.no)g.insertAdjacentHTML('beforeend','<i class="ban2">⛔</i>');
  (document.getElementById('v-cb')||document.body).appendChild(g);
  drag.ghost=g;drag.w=r.width;drag.h=r.height;drag.r0=r;
  drag.el.classList.add('dragging');
  const b=boardEl();b.classList.add('dragging');if(drag.t.no)b.classList.add('nodrop');
  if(drag.t.els)drag.t.els.forEach(x=>x.classList.add('dz'));
  dragHint(drag.t);
 }
 drag.ghost.style.transform='translate('+(e.clientX-drag.w/2)+'px,'+(e.clientY-drag.h/2)+'px) scale(1.08) rotate(-4deg)';
 if(!drag.t.els)return;
 const el=document.elementFromPoint(e.clientX,e.clientY),sl=el&&el.closest?el.closest('.dz'):null;
 if(sl!==drag.over){if(drag.over)drag.over.classList.remove('over');if(sl)sl.classList.add('over');drag.over=sl}
}
function onDragEnd(e){
 if(!drag)return;
 const d=drag;
 if(!d.on){endDrag();return}
 dragSup=true;setTimeout(()=>dragSup=false,80);
 let go=null;
 if(d.t.els){const el=document.elementFromPoint(e.clientX,e.clientY),sl=el&&el.closest?el.closest('.dz'):null;if(sl)go=()=>d.t.act(sl)}
 if(go){
  const g=d.ghost,sl2=d.over||null;
  endDrag(true);
  const tr=sl2?sl2.getBoundingClientRect():null;
  if(g&&tr){
   try{g.animate([{transform:g.style.transform,opacity:1},{transform:'translate('+(tr.left+tr.width/2-d.w/2)+'px,'+(tr.top+tr.height/2-d.h/2)+'px) scale(.55) rotate(0deg)',opacity:.15}],{duration:200,easing:'ease-in'}).onfinish=()=>g.remove()}catch(er){g.remove()}
   setTimeout(()=>{g.remove();go()},170);
  }else{if(g)g.remove();go()}
  return;
 }
 const msg=d.t.no||'Dépose la carte sur une zone qui brille.';
 toast(msg);
 const g=d.ghost,x=e.clientX-d.w/2,y=e.clientY-d.h/2;
 g.classList.add('bad');
 if(!g.querySelector('.ban2'))g.insertAdjacentHTML('beforeend','<i class="ban2">⛔</i>');
 endDrag(true);
 try{
  g.animate([
   {transform:'translate('+x+'px,'+y+'px) scale(1.08) rotate(-4deg)'},
   {transform:'translate('+(x-16)+'px,'+y+'px) scale(1.08) rotate(-9deg)'},
   {transform:'translate('+(x+16)+'px,'+y+'px) scale(1.08) rotate(3deg)'},
   {transform:'translate('+(x-12)+'px,'+y+'px) scale(1.08) rotate(-6deg)'},
   {transform:'translate('+(x+8)+'px,'+y+'px) scale(1.06) rotate(0deg)'},
   {transform:'translate('+d.r0.left+'px,'+d.r0.top+'px) scale(1) rotate(0deg)',opacity:.6}
  ],{duration:700,easing:'ease-in-out'}).onfinish=()=>g.remove();
  setTimeout(()=>g.remove(),1000);
 }catch(er){g.remove()}
}
function onAct(e){
 const b=e.target.closest('button[data-a]');if(!b||!myTurn())return;
 const a=b.dataset.a;
 if(a==='evo'){actEvolve();return}
 if(a==='sa')actSummon(ui.sel,'a');else if(a==='sd')actSummon(ui.sel,'d');
 else if(a==='act')actSpell(ui.sel);else if(a==='set')actSet(ui.sel);
 else if(a==='att')actAttack(ui.selMon);else if(a==='pos')actPos(ui.selMon);
}
let popT=null,popEl=null,popTarget=null;
function hidePop(){clearTimeout(popT);popT=null;if(popEl){popEl.remove();popEl=null}}
function showPop(target,info){
 hidePop();if(!G||ui.zoomEl||ui.modal)return;
 const r=target.getBoundingClientRect(),zs=Math.min(.8,(window.innerHeight-24)/379),w=260*zs,h=379*zs;
 const d=document.createElement('div');d.className='cbpop bk'+backN();d.style.setProperty('--zs',zs.toFixed(3));
 d.style.width=w+'px';d.style.height=h+'px';
 d.innerHTML=cardHTML(info.c,{atk:info.atk,def:info.def});
 let x=r.right+10;if(x+w>window.innerWidth-8)x=r.left-w-10;if(x<8)x=Math.max(8,Math.min(window.innerWidth-w-8,r.left));
 const y=Math.max(8,Math.min(window.innerHeight-h-8,r.top+r.height/2-h/2));
 d.style.left=x+'px';d.style.top=y+'px';
 (document.getElementById('v-cb')||document.body).appendChild(d);popEl=d;
}
function onOver(e){
 const z=e.target.closest('[data-z]');if(!z||!G)return;
 const info=cardAt(z.dataset.z,+z.dataset.p,+z.dataset.i);if(info)renderPrev(info);
 if(!window.matchMedia||!matchMedia('(hover:hover)').matches)return;
 if(z===popTarget)return;
 popTarget=z;hidePop();
 if(!info||!info.c)return;
 /* aperçu après 1 s retiré */
}
function onOut(e){
 const z=e.target.closest('[data-z]');if(!z)return;
 const to=e.relatedTarget&&e.relatedTarget.closest?e.relatedTarget.closest('[data-z]'):null;
 if(to===z)return;popTarget=null;hidePop();
}

/* ---------- vues : menu, deck, règles, partie ---------- */
const body=()=>$('cbBody');
function tabs(cur){
 return '<div class="cbnav"><b class="cbnav-logo">KUROVEN COMBAT</b>'+[['boost','Boosters'],['col','Collection'],['build','Mes decks'],['menu','Jouer'],['rules','Règles']].map(x=>'<button data-v="'+x[0]+'" class="'+(cur===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'<span class="cbnav-sp"></span><i class="cbnav-st">'+Object.keys(getCol()).length+' / '+allCards().length+' cartes</i><button class="cbnav-out" data-v="exit">← Kuroven</button></div>';
}
function bindTabs(){document.querySelectorAll('#cbBody .cbnav button').forEach(b=>b.onclick=()=>{const v=b.dataset.v;if(v==='exit'){if(typeof show==='function')show('home');else location.hash='';return}if(v==='menu')showMenu();else if(v==='build')showBuild();else if(v==='boost')showBoosters();else if(v==='col')showCollection('all');else showRules()})}
function showMenu(){
 view='menu';leaveGame();
 let d=getDeck(),ck=deckCheck(d);
 body().innerHTML=tabs('menu')+
 '<div class="cbhero bk'+backN()+'"><div><h2>Kuroven Combat</h2><p>Compose un deck de 20 cartes avec tes personnages préférés, puis affronte l’adversaire. Les six couleurs se battent en cercle : chaque couleur domine deux autres.</p>'+
 '<button class="cbbtn" id="cbPlay">'+(ck.ok?'Jouer contre l’IA':'Prépare ton deck pour jouer')+'</button><button class="cbbtn sec" id="cbOnline">Duel en ligne</button><button class="cbbtn sec" id="cbBuild">Mon deck ('+d.length+'/20)</button><button class="cbbtn sec" id="cbAuto">Deck aléatoire</button></div>'+
 '<div class="em">'+KM+'</div></div>'+
 '<div class="cbcard"><b>Dos des cartes</b><div class="cbtabs" id="cbBk" style="margin:8px 0 0">'+['Noir','Bleu nuit','Rouge sobre','Clair'].map((n,i)=>'<button data-b="'+(i+1)+'" class="'+(backN()===i+1?'on':'')+'">'+n+'</button>').join('')+'</div></div>';
 bindTabs();
 $('cbPlay').onclick=()=>{if(!deckCheck(getDeck()).ok){showBuild();return}startGame()};
 $('cbBuild').onclick=showBuild;$('cbOnline').onclick=()=>showOnline();
 $('cbAuto').onclick=async()=>{const c=await pickElem();if(c==null)return;setDeck(autoDeck(c.col,c.seed,c.anchor));showMenu()};
 $('cbBk').onclick=e=>{const b=e.target.closest('button');if(!b)return;ls.set('cbback',+b.dataset.b);showMenu()};
}

/* ---------- boosters : on découpe, on découvre, on remplit sa collection (pour le plaisir, rien de réel) ---------- */
const RN=['Commune','Peu commune','Rare','Épique','Légendaire'],RCOL=['#9aa3b5','#6ad48a','#4aa8ff','#c07bff','#ffcb3d'];
const allCards=()=>CHARS.concat(SUP,EVOS);
function rarityOf(c){
 if(c.k==='e')return 4;
 if(c.k==='s')return c.t==='trap'||c.t==='field'?2:1;
 if(c.ex||c.lvl>=6)return 3;
 if(c.lvl>=5)return 2;
 if(c.lvl>=4)return 1;
 return 0;
}
const getCol=()=>ls.get('cbcol1',{})||{};
function addToCol(ids){const col=getCol(),nw=[];ids.forEach(id=>{if(!col[id])nw.push(id);col[id]=(col[id]||0)+1});ls.set('cbcol1',col);ls.set('cbopened',(ls.get('cbopened',0)||0)+1);return nw}
function weightedR(sl){let t=sl.reduce((a,x)=>a+x[1],0),r=Math.random()*t;for(const x of sl){r-=x[1];if(r<=0)return x[0]}return sl[0][0]}
function rollPack(type){
 const pool=allCards(),bias=typeof type==='number'?type:null;
 const slots=[[[0,70],[1,30]],[[0,70],[1,30]],[[0,70],[1,30]],[[1,55],[2,35],[3,10]],[[2,55],[3,30],[4,15]]];
 const out=[];
 slots.forEach(sl=>{
  const r=weightedR(sl);let list=pool.filter(c=>rarityOf(c)===r&&!out.includes(c));
  if(bias!=null){const b=list.filter(c=>c.col===bias);if(b.length&&Math.random()<.75)list=b}
  if(!list.length)list=pool.filter(c=>!out.includes(c));
  out.push(list[rnd(list.length)]);
 });
 return out.sort((a,b)=>rarityOf(a)-rarityOf(b));
}
const STOCK_MAX=10,STOCK_MS=600000;
const IMGB=new Image();IMGB.src='combat/img/booster.png?v=2';
function stockState(){
 let st=ls.get('cbstock1',null);const now=Date.now();
 if(!st||typeof st.n!=='number'){st={n:STOCK_MAX,t:now};ls.set('cbstock1',st)}
 if(st.n<STOCK_MAX){const k=Math.floor((now-st.t)/STOCK_MS);if(k>0){st.n=Math.min(STOCK_MAX,st.n+k);st.t=st.n>=STOCK_MAX?now:st.t+k*STOCK_MS;ls.set('cbstock1',st)}}
 else if(st.t!==now){st.t=now}
 return st;
}
function stockUse(k){const st=stockState(),was=st.n>=STOCK_MAX;st.n=Math.max(0,st.n-k);if(was)st.t=Date.now();ls.set('cbstock1',st)}
const stockWait=()=>{const st=stockState();return st.n>=STOCK_MAX?0:Math.max(0,STOCK_MS-(Date.now()-st.t))};
const fmtMs=ms=>{const t=Math.ceil(ms/1000);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
function packHTML(t,big){
 return '<div class="pk art'+(big?' big':'')+'"><img src="combat/img/booster.png?v=2" alt="Booster" draggable="false"><i class="pk-shine"></i></div>';
}
let boostQty=1,boostTm=null;
const PKN=10;
function showBoosters(){
 view='boost';leaveGame();clearInterval(boostTm);
 const col=getCol(),tot=allCards().length,own=Object.keys(col).length,nOp=ls.get('cbopened',0)||0,pc=Math.round(own/tot*100);
 const st=stockState();boostQty=Math.max(1,Math.min(boostQty,Math.max(1,st.n)));
 const last=(ls.get('cblast',[])||[]).map(id=>REG[id]).filter(Boolean);
 const dk=getDeck(),dck=deckCheck(dk);
 body().innerHTML=tabs('boost')+
 '<div class="cbhub"><div class="hb-pack"><button type="button" class="pkb" id="cbPk">'+packHTML(0,true)+'<span class="pkb-n" id="cbPkN">×'+boostQty+'</span></button></div>'+
 '<div class="hb-txt"><h1>Ouvre un booster</h1><p>5 cartes tirées parmi tous les personnages et soutiens du jeu. Tranche le booster comme tu veux : une lumière te prévient quand une carte rare se cache dedans. C’est juste pour le plaisir, toutes les cartes restent disponibles pour tes decks.</p>'+
 '<div class="hb-stock"><div class="hb-n"><b id="cbStN">'+st.n+'</b><small> / '+STOCK_MAX+' boosters</small></div><div class="hb-pips" id="cbPips"></div><div class="hb-d" id="cbStD"></div></div>'+
 '<div class="hb-qty"><span class="hb-ql">Quantité</span><div class="qty-seg" id="cbQs">'+[1,3,5].map(x=>'<button type="button" class="qs" data-q="'+x+'"><b>×'+x+'</b><small>booster'+(x>1?'s':'')+'</small></button>').join('')+'<button type="button" class="qs" data-q="all"><b>TOUT</b><small>'+st.n+' en stock</small></button></div></div>'+
 '<div class="hb-cta"><button type="button" class="cta" id="cbOpenB">Ouvrir un booster</button></div></div></div>'+
 '<div class="hb-row"><div class="hb-last"><h3>Dernière ouverture</h3>'+(last.length?'<div class="hb-cards">'+last.map(c=>'<div class="hb-c r'+rarityOf(c)+'" data-id="'+c.id+'">'+cardHTML(c)+'</div>').join('')+'</div>':'<p class="hb-empty">Aucun booster ouvert pour l’instant.</p>')+'</div>'+
 '<div class="hb-tile"><b>'+own+' / '+tot+'</b><small>cartes découvertes</small></div><div class="hb-tile"><b>'+nOp+'</b><small>booster'+(nOp>1?'s':'')+' ouvert'+(nOp>1?'s':'')+'</small></div>'+
 '<button type="button" class="hb-tile hb-link" id="cbGoDeck"><b>Mes decks</b><small>'+(dck.ok?'Deck prêt · ':'Deck à finir · ')+dk.length+' / 20 cartes</small></button></div>';
 bindTabs();
 const pips=()=>{
  const s2=stockState(),w=stockWait(),el=$('cbPips');if(!el){clearInterval(boostTm);return}
  let h='';for(let i=0;i<PKN;i++){const cls=i<s2.n?'on':i===s2.n&&s2.n<STOCK_MAX?'next':'';h+='<i class="'+cls+'" style="--i:'+i+'"><img src="combat/img/pk/p'+(i+1)+'.jpg" alt="" draggable="false">'+(cls==='next'?'<em>'+fmtMs(w)+'</em>':'')+'</i>'}
  el.innerHTML=h;
  $('cbStN').textContent=s2.n;
  $('cbStD').textContent=s2.n>=STOCK_MAX?'Stock plein : ouvre-en pour qu’il se recharge !':(s2.n===0?'Plus de booster · ':'')+'Prochain booster dans '+fmtMs(w)+' · 1 toutes les 10 minutes, 10 maximum';
  const pk=$('cbPk');if(pk)pk.classList.toggle('empty',s2.n<1);
 };
 pips();boostTm=setInterval(pips,1000);
 const setQ=q=>{const n=stockState().n;boostQty=Math.max(1,Math.min(10,Math.min(q==='all'?n:q,Math.max(1,n))));
  $('cbPkN').textContent='×'+boostQty;$('cbOpenB').textContent=boostQty>1?'Ouvrir ×'+boostQty+' boosters':'Ouvrir un booster';
  document.querySelectorAll('.qs').forEach(b=>{const v=b.dataset.q;b.classList.toggle('on',v==='all'?(q==='all'&&n>5):(+v===boostQty&&q!=='all'));b.disabled=n<1||(v!=='all'&&+v>n)})};
 document.querySelectorAll('.qs').forEach(b=>b.onclick=()=>setQ(b.dataset.q==='all'?'all':+b.dataset.q));
 setQ(boostQty);
 const go=()=>{if(stockState().n<1){toast('Plus de booster pour l’instant : prochain dans '+fmtMs(stockWait())+'.');return}openBooster('all',boostQty)};
 $('cbPk').onclick=go;$('cbOpenB').onclick=go;$('cbGoDeck').onclick=showBuild;
 document.querySelectorAll('.hb-c').forEach(el=>el.onclick=()=>{const c=REG[el.dataset.id];if(c)openZoom(el,{c},'')});
}
function closeBoost(){const o=document.getElementById('cbOpen');if(o){o.onpointerdown=o.onpointermove=o.onpointerup=null;o.remove()}}
function openBooster(type,n){
 n=Math.min(n||1,stockState().n);if(n<1){toast('Plus de booster pour l’instant.');return}closeBoost();clearInterval(boostTm);
 const ov=document.createElement('div');ov.className='cbopen bk'+backN();ov.id='cbOpen';
 ov.innerHTML='<div class="cbop-stage" id="cbopS"></div><button class="cbchip cbop-x" type="button">✕ Fermer</button>';
 (document.getElementById('v-cb')||document.body).appendChild(ov);
 ov.querySelector('.cbop-x').onclick=()=>{closeBoost();showBoosters()};
 const stage=ov.querySelector('#cbopS');
 const packs=Array.from({length:n},()=>rollPack(type));
 const got=[];let idx=0,dead=false;
 const best=cs=>Math.max.apply(null,cs.map(rarityOf));
 const collect=cs=>{stockUse(1);ls.set('cblast',cs.map(c=>c.id));const nw=addToCol(cs.map(c=>c.id));cs.forEach(c=>got.push({c,nw:nw.includes(c.id)}));return nw};



 /* --- 1. le booster : on le tranche, autant de fois qu'on veut, comme Fruit Ninja --- */
 function clipHalf(poly,P,nv,sign){
  const out=[],f=p=>((p[0]-P[0])*nv[0]+(p[1]-P[1])*nv[1])*sign;
  for(let i=0;i<poly.length;i++){
   const A=poly[i],B=poly[(i+1)%poly.length],fa=f(A),fb=f(B);
   if(fa>=0)out.push(A);
   if((fa>=0)!==(fb>=0)){const t=fa/(fa-fb);out.push([A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t])}
  }
  return out;
 }
 const polyArea=poly=>{let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-q[0]*p[1]}return Math.abs(a)/2};
 function showPack(){
  const ph=Math.round(Math.min(430,window.innerHeight*.56));
  stage.innerHTML='<div class="cbop-count">Booster '+(idx+1)+' / '+n+'</div><div id="cbopSp" style="height:'+ph+'px;width:100px"></div><p class="cbop-hint" id="cbopH2">Tranche le booster ! Tu peux le découper en autant de morceaux que tu veux.</p><div class="cbact" style="justify-content:center"><button type="button" id="cbopNow" style="display:none">Ouvrir maintenant</button>'+(n-idx>1?'<button type="button" class="sec" id="cbopSkip">Tout ouvrir d’un coup</button>':'')+'</div>';
  const sp=$('cbopSp').getBoundingClientRect(),cx=window.innerWidth/2,cy=sp.top+sp.height/2;
  const IW=460,IH=700,sc=ph/IH,dpr=Math.min(2,window.devicePixelRatio||1);
  const cv=document.createElement('canvas');cv.className='cbop-trail';cv.width=Math.floor(window.innerWidth*dpr);cv.height=Math.floor(window.innerHeight*dpr);cv.style.width=window.innerWidth+'px';cv.style.height=window.innerHeight+'px';ov.appendChild(cv);
  const g=cv.getContext('2d');g.scale(dpr,dpr);
  const mkP=(poly,x,y,cxl,cyl,rot,vx,vy,vr)=>({poly,x,y,cxl,cyl,rot,vx,vy,vr,s:sc});
  let pieces=[mkP([[0,0],[IW,0],[IW,IH],[0,IH]],cx,cy,IW/2,IH/2,0,0,0,0)];
  const toS=(pc,p)=>{const c=Math.cos(pc.rot),sn=Math.sin(pc.rot),dx=(p[0]-pc.cxl)*pc.s,dy=(p[1]-pc.cyl)*pc.s;return[pc.x+dx*c-dy*sn,pc.y+dx*sn+dy*c]};
  const toL=(pc,q)=>{const c=Math.cos(pc.rot),sn=Math.sin(pc.rot),dx=q[0]-pc.x,dy=q[1]-pc.y;return[pc.cxl+(dx*c+dy*sn)/pc.s,pc.cyl+(-dx*sn+dy*c)/pc.s]};
  const inPoly=(poly,pt)=>{let sg=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],cr=(b[0]-a[0])*(pt[1]-a[1])-(b[1]-a[1])*(pt[0]-a[0]);if(cr!==0){const s2=cr>0?1:-1;if(sg&&s2!==sg)return false;sg=s2}}return true};
  let pts=[],raf=0,last=performance.now(),cuts=0,opening=false,fade=1,glow=null,openT=0,down=false,lastP=null,moved=false;
  const rec=new Map(),b0=best(packs[idx]);
  /* dessin : morceaux + lame blanche effilée */
  const frame=now=>{
   const dt=Math.min(.05,(now-last)/1000);last=now;
   g.clearRect(0,0,window.innerWidth,window.innerHeight);
   const idle=pieces.length===1&&!cuts;
   cv.dataset.pieces=pieces.length;
   pieces.forEach(pc=>{
    pc.x+=pc.vx*dt;pc.y+=pc.vy*dt;pc.rot+=pc.vr*dt;const k=Math.pow(.05,dt);pc.vx*=k;pc.vy*=k;pc.vr*=Math.pow(.15,dt);
    if(pc.x<30)pc.vx=Math.abs(pc.vx)+20;if(pc.x>window.innerWidth-30)pc.vx=-Math.abs(pc.vx)-20;if(pc.y<60)pc.vy=Math.abs(pc.vy)+20;if(pc.y>window.innerHeight-30)pc.vy=-Math.abs(pc.vy)-20;
    g.save();g.globalAlpha=fade;
    const bob=idle?Math.sin(now/420)*7:0;
    g.translate(pc.x,pc.y+bob);g.rotate(pc.rot+(idle?Math.sin(now/700)*.02:0));g.scale(pc.s,pc.s);g.translate(-pc.cxl,-pc.cyl);
    g.beginPath();pc.poly.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();
    if(glow){g.shadowColor=glow;g.shadowBlur=40}
    g.save();g.clip();if(IMGB.complete)g.drawImage(IMGB,0,0,IW,IH);g.restore();
    g.lineWidth=2/pc.s;g.strokeStyle='rgba(255,255,255,.55)';g.stroke();
    g.restore();
   });
   const t=performance.now();pts=pts.filter(p=>t-p.t<340);const m=pts.length;
   if(m>1){
    const L=[],R=[];
    for(let i=0;i<m;i++){
     const p=pts[i],q=pts[Math.min(m-1,i+1)],o=pts[Math.max(0,i-1)];let dx=q.x-o.x,dy=q.y-o.y;const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;
     const tt=i/(m-1),age=(t-p.t)/340,w=11*Math.pow(Math.sin(Math.PI*tt),.9)*(1-age*.7);
     L.push([p.x-dy*w,p.y+dx*w]);R.push([p.x+dy*w,p.y-dx*w]);
    }
    g.save();g.beginPath();g.moveTo(L[0][0],L[0][1]);for(let i=1;i<m;i++)g.lineTo(L[i][0],L[i][1]);for(let i=m-1;i>=0;i--)g.lineTo(R[i][0],R[i][1]);g.closePath();
    const h=pts[m-1],tl=pts[0],gr=g.createLinearGradient(tl.x,tl.y,h.x,h.y);
    gr.addColorStop(0,'rgba(235,235,235,0)');gr.addColorStop(.6,'rgba(245,245,245,.9)');gr.addColorStop(1,'rgba(255,255,255,1)');
    g.fillStyle=gr;g.shadowColor='rgba(255,255,255,.55)';g.shadowBlur=8;g.fill();g.restore();
   }
   raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);
  const cleanup=()=>{cancelAnimationFrame(raf);clearTimeout(openT);cv.remove();ov.onpointerdown=ov.onpointermove=ov.onpointerup=ov.onpointercancel=null};
  /* coupe d'un morceau le long de la lame */
  function cutPiece(pc,A,B){
   let dx=B.x-A.x,dy=B.y-A.y;const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;const nv=[-dy,dx];
   const sp=pc.poly.map(q=>toS(pc,q)),h1=clipHalf(sp,[A.x,A.y],nv,1),h2=clipHalf(sp,[A.x,A.y],nv,-1);
   if(h1.length<3||h2.length<3||polyArea(h1)<110||polyArea(h2)<110)return false;
   const mk=(h,sg)=>{
    const loc=h.map(q=>toL(pc,q));let ax=0,ay=0;loc.forEach(q=>{ax+=q[0];ay+=q[1]});ax/=loc.length;ay/=loc.length;
    const sc2=toS(pc,[ax,ay]),sp2=170+Math.random()*130;
    return mkP(loc,sc2[0],sc2[1],ax,ay,pc.rot,pc.vx+nv[0]*sg*sp2,pc.vy+nv[1]*sg*sp2,pc.vr+(Math.random()-.5)*2.2);
   };
   pieces.splice(pieces.indexOf(pc),1,mk(h1,1),mk(h2,-1));
   return true;
  }
  function tryCut(pc,r){
   if(opening||!pieces.includes(pc)||pieces.length>=1000)return;
   const sp=pc.poly.map(q=>toS(pc,q)),xs=sp.map(p=>p[0]),ys=sp.map(p=>p[1]),need=Math.min(Math.max.apply(null,xs)-Math.min.apply(null,xs),Math.max.apply(null,ys)-Math.min.apply(null,ys))*.1;
   if(Math.hypot(r.last.x-r.entry.x,r.last.y-r.entry.y)<Math.max(8,need))return;
   if(!cutPiece(pc,r.entry,r.last))return;
   cuts++;
   const mx=(r.entry.x+r.last.x)/2,my=(r.entry.y+r.last.y)/2;
   if(cuts===1){ /* la lumière qui sort de la première coupure : rien = pas de rare ; bleu / violet / or sinon */
    const f=document.createElement('div');f.className='cbop-flash '+(b0>=2?'t'+b0:'none');f.style.left=mx+'px';f.style.top=my+'px';ov.appendChild(f);setTimeout(()=>f.remove(),1600);
    if(b0>=2){try{burst(ov,RCOL[b0])}catch(e){}ov.style.setProperty('--tint',RCOL[b0]);ov.classList.remove('pulse');void ov.offsetWidth;ov.classList.add('pulse');if(b0>=3){ov.classList.add('shake');setTimeout(()=>ov.classList.remove('shake'),700)}}
    $('cbopNow').style.display='';$('cbopH2').textContent='Continue de trancher… ou attends un instant : le booster s’ouvre tout seul.';
   }
   if(cuts>1&&b0>=2){const f2=document.createElement('div');f2.className='cbop-flash mini t'+b0;f2.style.left=mx+'px';f2.style.top=my+'px';ov.appendChild(f2);setTimeout(()=>f2.remove(),1100)}
   clearTimeout(openT);openT=setTimeout(openNow,1700);
  }
  const step=p=>{
   pts.push({x:p.x,y:p.y,t:performance.now()});
   pieces.slice().forEach(pc=>{
    const sp=pc.poly.map(q=>toS(pc,q)),inside=inPoly(sp,[p.x,p.y]);let r=rec.get(pc);
    if(inside){if(!r)rec.set(pc,{entry:p,last:p});else r.last=p}
    else if(r){rec.delete(pc);tryCut(pc,r)}
   });
  };
  const addPoint=p=>{
   if(lastP){const dist=Math.hypot(p.x-lastP.x,p.y-lastP.y),stp=Math.max(1,Math.ceil(dist/9));for(let k=1;k<=stp;k++)step({x:lastP.x+(p.x-lastP.x)*k/stp,y:lastP.y+(p.y-lastP.y)*k/stp})}else step(p);
   lastP=p;
  };
  const flush=()=>{rec.forEach((r,pc)=>tryCut(pc,r));rec.clear()};
  async function openNow(){
   if(opening)return;opening=true;clearTimeout(openT);ov.onpointerdown=ov.onpointermove=ov.onpointerup=ov.onpointercancel=null;
   const nb=$('cbopNow');if(nb)nb.style.display='none';
   const col=b0>=2?RCOL[b0]:null;glow=col||'#ffffff';
   const f=document.createElement('div');f.className='cbop-flash '+(b0>=2?'t'+b0:'none');f.style.left=cx+'px';f.style.top=cy+'px';ov.appendChild(f);setTimeout(()=>f.remove(),1600);
   if(b0>=3){ov.classList.add('shake');setTimeout(()=>ov.classList.remove('shake'),700)}
   pieces.forEach(pc=>{pc.vx+=(pc.x-cx)*2.2;pc.vy+=(pc.y-cy)*2.2;pc.vr+=(Math.random()-.5)*3});
   for(let i=0;i<14;i++){fade=1-i/14;await sleep(50)}
   fade=0;cleanup();if(dead)return;showCards();
  }
  ov.onpointerdown=e=>{if(opening||e.target.closest('button'))return;down=true;moved=false;lastP=null;pts=[];addPoint({x:e.clientX,y:e.clientY})};
  ov.onpointermove=e=>{if(!down||opening)return;moved=true;addPoint({x:e.clientX,y:e.clientY})};
  ov.onpointerup=ov.onpointercancel=e=>{
   if(!down||opening)return;down=false;
   if(!moved&&pieces.length===1){ /* simple clic : un coup de lame automatique en diagonale */
    lastP=null;const a={x:cx-pieces[0].s*IW*.6,y:cy+ph*.22},b={x:cx+pieces[0].s*IW*.6,y:cy-ph*.22};addPoint(a);addPoint(b);addPoint({x:b.x+30,y:b.y-12});
   }
   flush();lastP=null;
  };
  const nb=$('cbopNow');if(nb)nb.onclick=()=>openNow();
  const sk=$('cbopSkip');if(sk)sk.onclick=()=>{cleanup();for(;idx<n;idx++)collect(packs[idx]);showSummary()};
 }
 /* --- 2. les cartes, une par une --- */
 function showCards(){
  const cs=packs[idx],nw=collect(cs),W=Math.min(300,Math.floor(Math.min(window.innerHeight*.52,520)/1.4577),window.innerWidth-80),zs=W/260;
  let ci=0;
  stage.innerHTML='<div class="cbop-count">Booster '+(idx+1)+' / '+n+' · carte <span id="cbopN">1</span> / '+cs.length+'</div><div class="cbop-cur" style="--zs:'+zs.toFixed(3)+';--w:'+W+'px"></div><p class="cbop-hint" id="cbopH">Touche la carte pour la retourner</p><div class="cbop-th" style="--zs:.2"></div><div class="cbact" id="cbopA" style="justify-content:center"><button type="button" class="sec" id="cbopAll">Tout retourner</button></div>';
  const cur=stage.querySelector('.cbop-cur'),th=stage.querySelector('.cbop-th');
  const thumb=(c,isNew)=>{const r=rarityOf(c),d=document.createElement('div');d.className='cbth';d.style.setProperty('--rc',RCOL[r]);d.innerHTML=cardHTML(c)+(isNew?'<span class="newtag on">NEW</span>':'');th.appendChild(d)};
  function card(){
   const c=cs[ci],r=rarityOf(c);
   cur.innerHTML='<div class="cc r'+r+'"><div class="cc-in"><div class="cc-f">'+backHTML()+'</div><div class="cc-b">'+cardHTML(c)+'</div></div><span class="rtag" style="--rc:'+RCOL[r]+'">'+RN[r]+'</span>'+(nw.includes(c.id)?'<span class="newtag">NOUVELLE</span>':'')+'</div>';
   $('cbopN').textContent=ci+1;
   const cc=cur.firstElementChild;cc.style.animation='ccin .45s both';
   cc.onclick=()=>{
    if(!cc.classList.contains('flip')){
     cc.classList.add('flip');
     if(r>=2){ov.style.setProperty('--tint',RCOL[r]);ov.classList.remove('pulse');void ov.offsetWidth;ov.classList.add('pulse');setTimeout(()=>{try{burst(cc,RCOL[r])}catch(e){}},300);if(r>=3){ov.classList.add('shake');setTimeout(()=>ov.classList.remove('shake'),600)}}
     $('cbopH').textContent=ci<cs.length-1?'Touche pour la carte suivante':'Touche pour terminer';
    }else next(cc);
   };
  }
  async function next(cc){
   if(cc.dataset.busy)return;cc.dataset.busy=1;
   const t=th.getBoundingClientRect(),c0=cc.getBoundingClientRect();
   try{await cc.animate([{transform:'none',opacity:1},{transform:'translate('+(t.left+t.width/2-c0.left-c0.width/2)+'px,'+(t.top+t.height/2-c0.top-c0.height/2)+'px) scale(.2)',opacity:.3}],{duration:380,easing:'ease-in',fill:'forwards'}).finished}catch(e){}
   thumb(cs[ci],nw.includes(cs[ci].id));ci++;
   if(ci<cs.length)card();else done();
  }
  function done(){
   cur.innerHTML='';
   $('cbopH').textContent=(nw.length?nw.length+' nouvelle'+(nw.length>1?'s':'')+' carte'+(nw.length>1?'s':'')+' dans ce booster !':'Aucune nouvelle carte dans ce booster.');
   $('cbopA').innerHTML=idx+1<n?'<button type="button" id="cbopNext">Booster suivant ('+(idx+2)+' / '+n+')</button>'+(n-idx>2?'<button type="button" class="sec" id="cbopRest">Ouvrir le reste d’un coup</button>':''):'<button type="button" id="cbopSum">Voir le résumé</button>';
   const nx=$('cbopNext');if(nx)nx.onclick=()=>{idx++;showPack()};
   const rs=$('cbopRest');if(rs)rs.onclick=()=>{for(idx++;idx<n;idx++)collect(packs[idx]);showSummary()};
   const sm=$('cbopSum');if(sm)sm.onclick=showSummary;
  }
  $('cbopAll').onclick=async()=>{
   while(ci<cs.length){const cc=cur.firstElementChild;if(!cc)break;if(!cc.classList.contains('flip')){cc.click();await sleep(450)}cc.click();await sleep(460);if(dead)return}
  };
  card();
 }
 /* --- 3. le résumé de tout ce qu'on a ouvert --- */
 function showSummary(){
  const sorted=got.slice().sort((a,b)=>rarityOf(b.c)-rarityOf(a.c)),nwN=got.filter(x=>x.nw).length,top=sorted[0];
  stage.innerHTML='<div class="cbop-count">Résumé</div><h2 class="cbsum-t">'+n+' booster'+(n>1?'s':'')+' ouvert'+(n>1?'s':'')+'</h2><p class="cbop-hint">'+nwN+' nouvelle'+(nwN>1?'s':'')+' carte'+(nwN>1?'s':'')+(top?' · Meilleure carte : <b style="color:'+RCOL[rarityOf(top.c)]+'">'+esc(top.c.n)+'</b> ('+RN[rarityOf(top.c)]+')':'')+'</p><div class="cbsum" style="--zs:.3">'+sorted.map(x=>'<div class="cbth big" style="--rc:'+RCOL[rarityOf(x.c)]+'">'+cardHTML(x.c)+(x.nw?'<span class="newtag on">NEW</span>':'')+'</div>').join('')+'</div><div class="cbact" style="justify-content:center"><button type="button" id="cbsAgain"></button><button type="button" class="sec" id="cbsCol">Ma collection</button></div>';
  {const left=stockState().n,ag=$('cbsAgain');if(left<1){ag.textContent='Plus de booster · prochain dans '+fmtMs(stockWait());ag.disabled=true}else{ag.textContent='Ouvrir encore ×'+Math.min(n,left)+' ('+left+' en stock)';ag.onclick=()=>openBooster(type,Math.min(n,left))}}$('cbsCol').onclick=()=>{closeBoost();showCollection('all')};
 }
 showPack();
}
function showCollection(f){
 view='col';leaveGame();
 const col=getCol(),all=allCards().slice().sort((a,b)=>rarityOf(b)-rarityOf(a)||(a.k>b.k?1:-1)),own=all.filter(c=>col[c.id]).length;
 const list=all.filter(c=>f==='all'?true:f==='own'?col[c.id]:!col[c.id]);
 body().innerHTML=tabs('col')+
 '<div class="cbcard"><h2 style="margin-top:0">Ma collection</h2><div class="cbprog"><div><b>'+own+'</b> / '+all.length+' cartes découvertes</div><div class="cbbar"><i style="width:'+Math.round(own/all.length*100)+'%"></i></div></div>'+
 '<div class="cbact" style="margin-top:10px">'+[['all','Toutes'],['own','Obtenues'],['miss','Manquantes']].map(x=>'<button type="button" class="'+(f===x[0]?'':'sec')+'" data-f="'+x[0]+'">'+x[1]+'</button>').join('')+'<button type="button" class="sec" id="cbBackB">← Boosters</button></div></div>'+
 '<div class="cbcolgrid">'+list.map(c=>{const n=col[c.id]||0,r=rarityOf(c);return '<div class="ci'+(n?'':' miss')+'" data-id="'+c.id+'" style="--rc:'+RCOL[r]+'"><div class="ci-c">'+(n?cardHTML(c):backHTML())+'</div><span class="ci-r">'+(n?RN[r]:'?')+'</span>'+(n>1?'<span class="ci-n">×'+n+'</span>':'')+'</div>'}).join('')+'</div>';
 bindTabs();
 document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>showCollection(b.dataset.f));
 $('cbBackB').onclick=showBoosters;
 document.querySelectorAll('.ci:not(.miss)').forEach(el=>el.onclick=()=>{const c=allCards().find(x=>x.id===el.dataset.id);if(c)openZoom(el,{c},'')});
}
function showRules(){
 view='rules';leaveGame();
 body().innerHTML=tabs('rules')+'<div class="cbcard cbrules"><h2 style="margin-top:0">Règles</h2><ul>'+
 '<li><b>But</b> : faire tomber les points de vie de l’adversaire de 8000 à 0. Si ta pioche est vide, tu ne perds pas : tu continues de jouer avec ce que tu as.</li>'+
 '<li><b>Deck</b> : 20 cartes exactement, 2 exemplaires maximum de la même carte, 8 cartes soutien au plus.</li>'+
 '<li><b>Début</b> : on pioche 5 cartes. Celui qui commence ne pioche pas et ne peut pas attaquer au premier tour. Main limitée à 7 cartes.</li>'+
 '<li><b>Invoquer</b> : un personnage par tour. Niveau 1 à 4 : gratuit. Niveau 5 et 6 : il faut sacrifier un de tes personnages. Tu as 3 zones de personnages.</li>'+
 '<li><b>Points de vie des cartes</b> : chaque personnage a des <b>PV</b>, avec une barre sur la carte. Une attaque lui retire des PV ; il n’est détruit que s’il tombe à 0. Une carte à PV pleins qui reçoit un coup mortel tient bon à 1 PV, une seule fois (<b>Dernier souffle</b>).</li>'+
'<li><b>Positions</b> : en <b>attaque</b>, un personnage peut attaquer mais il est vulnérable : s’il est attaqué il reçoit tout et <b>riposte</b>. En <b>défense</b>, il n’attaque pas mais son <b>armure</b> réduit chaque coup (ATK − armure, au moins 20 %, puis −25 %) ; les <b>défenseurs</b> renvoient des <b>Épines</b>. Il peut changer de position une fois par tour, mais pas le tour où il est invoqué.</li>'+
'<li><b>Rôles</b> : <b>Attaquant</b> (beaucoup d’ATK, peu de PV), <b>Polyvalent</b> (équilibré, son coup perce l’armure) et <b>Défenseur</b> (beaucoup de PV, armure et Épines, peu d’ATK).</li>'+
'<li><b>Combat</b> : chaque personnage en attaque peut attaquer une fois par tour. Le coup retire des PV à la cible, qui riposte si elle est en attaque. Sans personnage en face, c’est une attaque directe : l’adversaire perd des points de vie.</li>'+
'<li><b>Couleurs</b> : chaque couleur est forte contre les deux suivantes (+20 % d’ATK) et faible contre les deux précédentes (−20 %) : 炎 Braise → 雷 Éclair → 森 Sève → 水 Marée → 闇 Ombre → 光 Éclat → 炎.</li>'+
 '<li><b>Soutiens</b> : les Magies se jouent pendant ton tour. Les Équipements restent attachés à un personnage. Un seul Terrain à la fois, il compte pour les deux joueurs. Les Pièges se posent face cachée et se déclenchent pendant le tour de l’adversaire.</li>'+
 '<li><b>Transformation</b> : les personnages marqués ✦ dans le constructeur ont une transformation (carte violette). Ton deck peut en contenir <b>2 au maximum</b>, et leur transformation est disponible automatiquement. Un personnage peut se transformer s’il est sur ton terrain, <b>sans attendre</b> (tu peux même attaquer avec juste après), et si la <b>condition écrite sur la carte</b> est remplie : un équipement, un Terrain en jeu, un piège posé, des cartes au cimetière, des points de vie bas, un allié de la même couleur, ou avoir joué une carte précise. Il va au cimetière et la carte évoluée prend sa place. Bouton « Évolution » à droite du plateau.</li><li><b>Duel en ligne</b> : « Duel en ligne » dans le menu. L’un crée un duel et donne le code à 4 lettres, l’autre le tape. Chacun joue avec son deck, une photo de profil et un chronomètre s’affichent pour les deux.</li><li><b>Temps</b> : 45 secondes par tour. L’anneau autour de ton avatar se vide, puis devient rouge.</li></ul></div>';
 bindTabs();
}
let bf={t:'all',c:-1,q:''};
function addToDeck(id){
 const c=REG[id],cur=getDeck();if(!c)return false;
 if(cur.length>=MAXD){toast('Le deck est complet (20 cartes).');return false}
 if(cur.filter(x=>x===id).length>=2){toast('Maximum 2 exemplaires de la même carte.');return false}
 if(isSup(c)&&cur.filter(x=>REG[x]&&isSup(REG[x])).length>=MAXS){toast('Maximum '+MAXS+' cartes soutien.');return false}
 if(evolvableId(id)&&cur.filter(x=>evolvableId(x)).length>=MAXX){toast('Maximum '+MAXX+' personnages à évolution (✦) dans le deck.');return false}
 cur.push(id);setDeck(cur);return true;
}
function removeFromDeck(id){const cur=getDeck(),k=cur.indexOf(id);if(k>=0){cur.splice(k,1);setDeck(cur)}}
function sideInfo(c){
 if(!c)return '<p class="dk-hint">Clique sur une carte pour la lire en grand.</p>';
 const isC=c.k==='c'||c.k==='e';
 let h='<div class="dk-big bk'+backN()+'"><div class="dk-bigc">'+cardHTML(c)+'</div></div><div class="dk-info"><b>'+esc(c.n)+'</b>';
 if(isC){
  h+='<span>Niveau '+c.lvl+' · '+COL[c.col].k+' '+COL[c.col].n+' · ATK '+c.atk+' · PV '+c.def+(c.arm?' · Armure '+c.arm:'')+(c.refl?' · Épines '+c.refl:'')+(c.pierce?' · Perce l’armure':'')+'</span>';
  h+='<span class="dim">Fort contre '+COL[(c.col+1)%6].n+' et '+COL[(c.col+2)%6].n+' · faible contre '+COL[(c.col+4)%6].n+' et '+COL[(c.col+5)%6].n+'.</span>';
  h+='<p>「'+esc(c.sn)+'」 : '+esc(c.sd)+'</p>';
  const evs=c.k==='c'?EVOS.filter(e=>e.mats.some(x=>x.id===c.id)):[];
  evs.forEach(e=>{h+='<div class="dk-evo"><b>✦ Peut évoluer en « '+esc(e.n)+' »</b><br>'+(e.cond&&e.cond.length?e.cond.map(cd=>'• '+esc(condLong(cd).replace(/\.$/,''))).join('<br>'):'Aucune condition : tu peux évoluer tout de suite.')+'<br><small>Cette carte compte pour 1 de tes 2 personnages à évolution (✦) par deck.</small></div>'});
 }else{h+='<span>Carte '+(c.t==='trap'?'Piège':'Magie')+' · '+esc(c.sub||'')+'</span><p>'+esc(c.txt)+'</p>'}
 return h+'</div>';
}
function showBuild(){
 view='build';leaveGame();
 const old=document.getElementById('dkMid'),oldS=old?old.scrollTop:0;
 const d=getDeck(),ck=deckCheck(d),cnt={};d.forEach(i=>cnt[i]=(cnt[i]||0)+1);
 const chars=d.filter(i=>REG[i]&&!isSup(REG[i])).sort((a,b)=>(REG[b].lvl||0)-(REG[a].lvl||0)),sups=d.filter(i=>REG[i]&&isSup(REG[i]));
 const ex=extraFor(d);
 let list=CHARS.concat(SUP);
 if(bf.t==='c')list=list.filter(x=>x.k==='c');else if(bf.t==='m')list=list.filter(x=>x.k==='s'&&x.t!=='trap');else if(bf.t==='p')list=list.filter(x=>x.k==='s'&&x.t==='trap');else if(bf.t==='e')list=list.filter(x=>evolvableId(x.id));
 if(bf.c>=0)list=list.filter(x=>x.col===bf.c);
 if(bf.q)list=list.filter(x=>x.n.toLowerCase().includes(bf.q.toLowerCase()));
 const slot=(id,kind)=>id?'<div class="dsl dfull" data-id="'+id+'"><div class="dsl-c">'+cardHTML(REG[id])+'</div></div>':'<div class="dsl dempty k'+kind+'"><i>+</i></div>';
 const nChSlots=Math.max(12,chars.length),nextEmpty=chars.length<nChSlots?chars.length:-1;
 let chH='';for(let i=0;i<nChSlots;i++)chH+=slot(chars[i],'c');
 let spH='';for(let i=0;i<MAXS;i++)spH+=slot(sups[i],'s');
 let exH='';for(let i=0;i<MAXX;i++)exH+=ex[i]?'<div class="dsl dfull dx" data-id="'+ex[i].id+'" data-auto="1"><div class="dsl-c">'+cardHTML(ex[i])+'</div></div>':'<div class="dsl dempty dx"><i>✦</i></div>';
 const sel=dkSelId&&REG[dkSelId]?REG[dkSelId]:null,inDeck=sel&&cnt[sel.id]>0;
 body().innerHTML=tabs('build')+
 '<div class="dk" id="cbDk">'+
 '<section class="dk-left" id="dkDeck"><div class="dk-auto"><div><b>Deck automatique</b><small>Choisis un élément, un personnage de départ, ou complète ce que tu as déjà posé : on te fait un deck cohérent.</small></div><button type="button" id="cbRand">Remplir</button></div>'+
 '<div class="dk-cnt"><span class="'+(ck.ok?'ok':'')+'">Deck : '+d.length+' / '+MAXD+'</span><span>Personnages '+chars.length+'</span><span>Soutiens '+sups.length+' / '+MAXS+'</span><span>✦ '+ck.ev+' / '+MAXX+'</span></div>'+
 '<div class="dk-msg'+(ck.ok?' ok':'')+'">'+esc(ck.ok?'Deck valide : tu peux jouer.':ck.msg)+'</div>'+
 '<div class="dk-grp"><h4>Personnages <em>'+chars.length+' / 12+</em></h4><div class="dk-slots">'+chH+'</div></div>'+
 '<div class="dk-grp sup"><h4>Soutiens <em>'+sups.length+' / '+MAXS+'</em></h4><div class="dk-slots">'+spH+'</div></div>'+
 '<div class="dk-grp evo"><h4>Évolutions ✦ <em>automatiques · '+ex.length+' / '+MAXX+'</em></h4><div class="dk-slots">'+exH+'</div><p class="dk-tip">Elles arrivent toutes seules quand le personnage est dans ton deck (2 maximum).</p></div>'+
 '<div class="dk-act"><button type="button" id="cbClear" class="sec">Vider le deck</button><button type="button" id="cbGo"'+(ck.ok?'':' disabled')+'>Jouer avec ce deck</button></div></section>'+
 '<section class="dk-mid" id="dkMid"><div class="dk-fil" id="cbF">'+[['all','Tout'],['c','Personnages'],['m','Magies'],['p','Pièges'],['e','Évolutions ✦']].map(x=>'<button data-t="'+x[0]+'" class="'+(bf.t===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+COL.map((c,i)=>'<button data-c="'+i+'" class="dot'+(bf.c===i?' on':'')+'" style="--c:'+c.c+'" title="'+c.n+'">'+c.k+'</button>').join('')+'<input id="cbQ" placeholder="Chercher…" value="'+esc(bf.q||'')+'"></div>'+
 '<div class="dk-hint2">Glisse une carte vers ton deck, ou clique dessus puis « Ajouter au deck ». '+list.length+' cartes.</div>'+
 '<div class="dk-grid" id="cbGrid">'+list.map(x=>{const n=cnt[x.id]||0;return '<div class="dkc'+(sel&&sel.id===x.id?' sel':'')+(n>=2?' max':'')+'" data-a="'+x.id+'">'+(n?'<span class="nq">×'+n+'</span>':'')+(evolvableId(x.id)?'<span class="evb" title="'+esc(evoTitle(x.id))+'">✦</span>':'')+'<div class="dkc-c">'+cardHTML(x)+'</div></div>'}).join('')+'</div></section>'+
 '<aside class="dk-side" id="dkSide">'+sideInfo(sel)+(sel&&sel.k!=='e'?'<div class="dk-btns">'+(inDeck?'<button type="button" id="dkRem" class="sec">Retirer du deck</button>':'')+'<button type="button" id="dkAdd">+ Ajouter au deck</button></div>':'')+'</aside></div>';
 bindTabs();
 const mid=$('dkMid');if(mid)mid.scrollTop=oldS;
 const fitDk=()=>{const g=$('cbGrid'),c=g&&g.querySelector('.dkc');if(c&&c.clientWidth)g.style.setProperty('--dz',(c.clientWidth/260).toFixed(4))};fitDk();requestAnimationFrame(fitDk);if(!showBuild.rs){showBuild.rs=1;window.addEventListener('resize',()=>{if(view==='build')fitDk2()})}
 const reload=()=>showBuild();
 $('cbF').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.t){bf.t=b.dataset.t}else if(b.dataset.c!=null){bf.c=bf.c===+b.dataset.c?-1:+b.dataset.c}reload()};
 $('cbQ').oninput=e=>{bf.q=e.target.value;clearTimeout(showBuild.t);showBuild.t=setTimeout(()=>{reload();const q=$('cbQ');q.focus();q.setSelectionRange(q.value.length,q.value.length)},300)};
 $('cbRand').onclick=async()=>{const c=await pickElem();if(c==null)return;setDeck(autoDeck(c.col,c.seed,c.anchor));dkSelId=null;reload()};
 $('cbClear').onclick=()=>{setDeck([]);reload()};
 $('cbGo').onclick=()=>{if(deckCheck(getDeck()).ok)startGame()};
 const ad=$('dkAdd');if(ad)ad.onclick=()=>{if(addToDeck(sel.id))reload()};
 const rm=$('dkRem');if(rm)rm.onclick=()=>{removeFromDeck(sel.id);reload()};
 /* clic : on lit la carte en grand */
 const selectCard=id=>{dkSelId=id;reload()};
 $('cbGrid').onclick=e=>{if(dkDragged)return;const it=e.target.closest('.dkc');if(it)selectCard(it.dataset.a)};
 $('dkDeck').onclick=e=>{if(dkDragged)return;const it=e.target.closest('.dsl.dfull');if(it)selectCard(it.dataset.id)};
 /* glisser une carte de la collection vers le deck */
 $('cbGrid').ondragstart=e=>e.preventDefault();
 $('cbGrid').onpointerdown=e=>{
  if(e.button!==0||e.pointerType==='touch')return;const it=e.target.closest('.dkc');if(!it)return;
  const id=it.dataset.a,x0=e.clientX,y0=e.clientY;let gh=null;
  const targets=()=>[...document.querySelectorAll('#dkDeck .dsl.dempty:not(.dx)')].filter(t=>REG[id]&&isSup(REG[id])?t.classList.contains('ks'):t.classList.contains('kc'));
  const move=ev=>{
   if(!gh){if(Math.hypot(ev.clientX-x0,ev.clientY-y0)<8)return;
    gh=document.createElement('div');gh.className='cbghost bk'+backN();const r=it.getBoundingClientRect();gh.style.width='104px';gh.style.height='152px';gh.style.setProperty('--zs',(104/260).toFixed(3));gh.innerHTML=cardHTML(REG[id]);(document.getElementById('v-cb')||document.body).appendChild(gh);
    it.classList.add('dragging');targets().forEach(t=>t.classList.add('hot'));document.getElementById('dkDeck').classList.add('drop');dkDragged=true}
   gh.style.transform='translate('+(ev.clientX-52)+'px,'+(ev.clientY-76)+'px) rotate(-4deg) scale(1.05)';
  };
  const up=ev=>{
   document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);
   if(gh){
    gh.remove();it.classList.remove('dragging');document.querySelectorAll('.dsl.hot').forEach(t=>t.classList.remove('hot'));const dkEl=document.getElementById('dkDeck');if(dkEl)dkEl.classList.remove('drop');
    const el=document.elementFromPoint(ev.clientX,ev.clientY);
    if(el&&el.closest&&el.closest('#dkDeck')){ if(addToDeck(id))reload(); }
    setTimeout(()=>dkDragged=false,60);
   }
  };
  document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);
 };
}
let dkDragged=false,dkSelId=null;
function fitDk2(){const g=document.getElementById('cbGrid'),c=g&&g.querySelector('.dkc');if(c&&c.clientWidth)g.style.setProperty('--dz',(c.clientWidth/260).toFixed(4))}
const evoTitle=id=>{const e=EVOS.find(e=>e.mats.some(m=>m.id===id));return e?'Évolution : '+e.n+(e.cond&&e.cond.length?' — '+e.cond.map(condLong).join(' '):''):''};
function flash(t){const b=document.querySelector('#cbBody .cbbar span');if(b){const o=b.textContent;b.textContent=t;setTimeout(()=>{if(b)b.textContent=o},1800)}}
function leaveGame(keepNet){
 if(!keepNet)netClose();
 stopTimer();if(G){G.over=true}G=null;ui={};
 if(document.getElementById('cbZoom'))document.getElementById('cbZoom').remove();
 document.querySelectorAll('.cbmodal').forEach(m=>m.remove());
 closeZoom();document.querySelectorAll('.cbfly').forEach(x=>x.remove());
 {const vc=document.getElementById('v-cb');if(vc)vc.classList.remove('ingame')}
}
function mountGame(){
 const vc=document.getElementById('v-cb');if(vc)vc.classList.add('ingame');window.scrollTo(0,0);
 body().innerHTML='<div id="cbGame"><div class="cbt bk'+backN()+'" id="cbT"></div><div class="cbside" id="cbSide"><div><button class="cbchip" id="cbQuit">← Quitter la partie</button></div><div class="cbprev" id="cbPrev"></div><div class="cbact" id="cbAct"></div><div class="cbact" id="cbEvoW"></div><div id="cbHint" style="color:#e5483b;font-size:.85rem;min-height:1.2em;opacity:0;transition:opacity .3s"></div><div class="cblog" id="cbLog"></div></div></div>';
 $('cbQuit').onclick=async()=>{if(G&&!G.over){const r=await ask('Quitter la partie ?','La partie en cours sera perdue.',[{v:true,t:'Quitter'},{v:false,t:'Continuer',sec:1}]);if(!r)return}showMenu()};
 const b=boardEl();fit();requestAnimationFrame(fit);setTimeout(fit,150);setTimeout(fit,600);b.onclick=onBoardClick;b.onpointerdown=onDragStart;b.ondragstart=e=>e.preventDefault();b.onmouseover=onOver;b.onmouseout=onOut;$('cbAct').onclick=onAct;$('cbEvoW').onclick=onAct;
 renderPrev(null);
}
async function startGame(){
 const mine=getDeck();if(!deckCheck(mine).ok){showBuild();return}
 leaveGame();view='game';
 const ad=autoDeck(undefined,undefined,undefined,true);const ax=extraFor(ad);
 G={pr:[who0(),aiPersona()],p:[mkP(mine,getExtra()),mkP(ad,ax)],turn:0,n:1,field:null,over:false,busy:true,ai:false,log:[],t0:0,tm:null,pop:null,newC:null};
 ui={};
 mountGame();
 for(let k=0;k<5;k++){P(0).hand.push(P(0).deck.shift());P(1).hand.push(P(1).deck.shift())}
 log('La partie commence. Tu joues en premier.');
 await startTurn();
}
async function startOnline(o){
 const mine=getDeck();regCards(o.cards);
 leaveGame(true);view='game';
 G={pr:[who0(),o.who],p:[mkP(mine,getExtra(),rngFrom(o.seedMine)),mkP(o.deck,o.extra,rngFrom(o.seedOpp))],turn:o.first?0:1,n:1,field:null,over:false,busy:true,ai:false,log:[],t0:0,tm:null,pop:null,newC:null};
 ui={};if(NET)NET.seen=true;
 mountGame();
 for(let k=0;k<5;k++){P(0).hand.push(P(0).deck.shift());P(1).hand.push(P(1).deck.shift())}
 log(o.first?'La partie en ligne commence. Tu joues en premier.':'La partie en ligne commence. L’adversaire joue en premier.');
 await startTurn();
}
function showOnline(msg){
 view='online';leaveGame();
 const ck=deckCheck(getDeck());
 body().innerHTML=tabs('menu')+'<div class="cbcard"><h2 style="margin-top:0">Duel en ligne</h2><p style="color:var(--mut)">Affronte un ami : l’un de vous crée un duel et donne le code à l’autre, qui le tape. Chacun joue avec son propre deck.</p>'+
  (ck.ok?'':'<p style="color:#e5483b">Ton deck n’est pas valide : '+esc(ck.msg)+' <button class="cbchip" id="cbFix">Mon deck</button></p>')+
  '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end"><div><button class="cbbtn lt" id="cbHost"'+(ck.ok?'':' disabled')+'>Créer un duel</button></div>'+
  '<div><input class="cbsearch" id="cbCode" maxlength="4" placeholder="Code à 4 lettres" style="text-transform:uppercase;width:160px"> <button class="cbbtn lt" id="cbJoin"'+(ck.ok?'':' disabled')+'>Rejoindre</button></div></div>'+
  '<p id="cbOnMsg" style="min-height:1.4em;margin:12px 0 0">'+(msg?esc(msg):'')+'</p></div>';
 bindTabs();if(!ck.ok&&$('cbFix'))$('cbFix').onclick=showBuild;
 $('cbHost').onclick=hostDuel;$('cbJoin').onclick=()=>joinDuel($('cbCode').value.trim().toUpperCase());
}
async function hostDuel(){
 const code=Array.from({length:4},()=>'ABCDEFGHJKMNPQRSTUVWXYZ'[rnd(23)]).join('');
 $('cbOnMsg').textContent='Création du duel…';
 try{await netOpen(code)}catch(e){showOnline(e.message);return}
 body().innerHTML=tabs('menu')+'<div class="cbcard" style="text-align:center"><h2 style="margin-top:0">En attente d’un ami…</h2><p>Donne ce code à ton ami :</p><div style="font:900 3rem Georgia,serif;letter-spacing:.3em;margin:10px 0">'+code+'</div><p style="color:var(--mut)">Il doit aller dans Kuroven Combat, « Duel en ligne », puis taper le code. La partie démarre toute seule.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="cbbtn lt" id="cbInv">📨 Inviter des amis</button><button class="cbbtn" id="cbCancel">Annuler</button></div></div>';
 bindTabs();$('cbCancel').onclick=()=>showOnline();$('cbInv').onclick=()=>{if(typeof cbInvite==='function')cbInvite(code);else toast('Connecte-toi pour inviter tes amis.')};
 NET.onLobby=pl=>{
  if(pl.t!=='hello')return;NET.onLobby=null;
  const deck=getDeck(),extra=getExtra(),first=Math.random()<.5,sh=1+rnd(2e9),sg=1+rnd(2e9);
  netSend('start',{who:who0(),deck,extra,cards:serCards(deck,extra),seedH:sh,seedG:sg,hostFirst:first});
  startOnline({who:cleanWho(pl.who),deck:pl.deck,extra:pl.extra,cards:pl.cards,seedMine:sh,seedOpp:sg,first});
 };
}
async function joinDuel(code){
 const msg=$('cbOnMsg');
 if(!/^[A-Z]{4}$/.test(code)){msg.textContent='Entre le code à 4 lettres.';return}
 msg.textContent='Connexion…';
 try{await netOpen(code)}catch(e){showOnline(e.message);return}
 const n=NET;let ok=false;
 n.onLobby=pl=>{if(pl.t!=='start')return;ok=true;n.onLobby=null;startOnline({who:cleanWho(pl.who),deck:pl.deck,extra:pl.extra,cards:pl.cards,seedMine:pl.seedG,seedOpp:pl.seedH,first:!pl.hostFirst})};
 const deck=getDeck(),extra=getExtra();
 netSend('hello',{who:who0(),deck,extra,cards:serCards(deck,extra)});
 setTimeout(()=>{if(!ok&&NET===n)showOnline('Aucun duel trouvé avec ce code (ou ton ami n’est pas encore prêt).')},12000);
}
const origEnter=()=>{};
window.addEventListener('resize',()=>{if(G&&alive){fit();setTimeout(fit,60);if((window.innerWidth<700)!==G.mob)render()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeZoom()});

/* ---------- API pour index.html ---------- */
window.CB={
 async enter(){
  alive=true;document.body.classList.add('cbfull');forceDark(true);const b=body();if(!b)return;
  if(G&&!G.over&&view==='game'){if(G.turn===0&&!G.busy&&!G.tm)startTimer();return}
  b.innerHTML='<p class="sub" style="text-align:center">Chargement des cartes…</p>';
  try{await loadPool()}catch(e){b.innerHTML='<p class="sub" style="text-align:center">Impossible de charger les personnages (AniList ne répond pas). <button class="cbchip" id="cbRetry">Réessayer</button></p>';const r=$('cbRetry');if(r)r.onclick=()=>CB.enter();return}
  if(!getDeck().length&&deckCheck(getDeck()).n===0)setDeck(autoDeck());
  if(view==='build')showBuild();else if(view==='rules')showRules();else if(view==='menu')showMenu();else if(view==='col')showCollection('all');else showBoosters();
 },
 async joinCode(code){await CB.enter();if(!getDeck().length)return;showOnline();const i=$('cbCode');if(i)i.value=code;joinDuel(code)},
 leave(){alive=false;stopTimer();document.body.classList.remove('cbfull');forceDark(false)}
};
})();
