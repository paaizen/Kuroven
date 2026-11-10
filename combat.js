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
let G=null, ui={}, view='menu', alive=false;

/* ---------- cartes : rendu ---------- */
const KM='<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-24 50 50)"><rect x="29" y="14" width="42" height="72" rx="6" fill="none" stroke="var(--k2)" stroke-width="4"/></g><g transform="rotate(24 50 50)"><rect x="29" y="14" width="42" height="72" rx="6" fill="var(--k1)" stroke="var(--bk)" stroke-width="2"/></g><circle cx="50" cy="50" r="13" fill="var(--bk)" stroke="var(--k1)" stroke-width="3"/><path d="M44 43h3.2v14H44zM47.2 49.6l5-6.6h4.2l-6 8 6 8h-4.2l-5-6.6z" fill="var(--k1)"/></svg>';
const backHTML=()=>'<div class="cb-back">'+KM+'</div>';
const whoHTML=k=>{const s=a=>a.map(i=>'<span style="background:'+COL[i].c+'">'+COL[i].k+'</span>').join('');return '<span class="wh">Fort : '+s([(k+1)%6,(k+2)%6])+' · Faible : '+s([(k+4)%6,(k+5)%6])+'</span>'};
function cardHTML(c,o){
 o=o||{};
 if(c.k==='c'||c.k==='e'){
  const evo=c.k==='e';
  const a=o.atk!=null?o.atk:c.atk,d=o.def!=null?o.def:c.def;
  const sa=a>c.atk?' style="color:#0a7a2a"':a<c.atk?' style="color:#b3241a"':'', sd=d>c.def?' style="color:#0a7a2a"':d<c.def?' style="color:#b3241a"':'';
  const im=evo?'<img src="combat/img/evo-'+c.eid+'.jpg" alt="" onerror="this.onerror=null;this.src=\''+esc(c.img)+'\'" referrerpolicy="no-referrer">':'<img src="'+esc(c.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">';
  return '<div class="y '+(evo?'evo holo':c.ex?'ex holo':'eff')+' k'+c.col+'"><div class="cface"></div><div class="plate"></div><div class="sticker"></div>'+
  '<div class="name">'+esc(c.n)+'</div><span class="orb">'+COL[c.col].k+'</span><div class="stars">'+'<i></i>'.repeat(c.lvl)+'</div>'+
  '<div class="artf"><div class="cart">'+im+'</div></div><div class="code">'+(evo?'ÉVOLUTION':esc((c.series||'KVN').slice(0,22)))+'</div>'+
  '<div class="desc"><b>['+(evo?'Évolution':'Personnage')+' / '+COL[c.col].n+(c.ex&&!evo?' / Rare':'')+']</b> <b>「'+esc(c.sn)+'」</b> : '+esc(c.sd)+(evo?evoNote(c):whoHTML(c.col))+'</div><div class="id">'+c.no+'</div>'+
  '<div class="stat"><span>ATK/ <u'+sa+'>'+a+'</u></span><span>DEF/ <u'+sd+'>'+d+'</u></span></div></div>';
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
 EVOS=[];EVO.forEach(e=>{const ms=e.mat.map(k=>CHARS.find(c=>c.n.toLowerCase().includes(k)));if(ms.every(Boolean)){const ev={k:'e',id:'e_'+e.id,eid:e.id,n:e.n,img:ms[0].img,series:ms.map(m=>m.n).join(' + '),lvl:7,atk:e.atk,def:e.def,col:e.col,ex:true,sn:e.sn,sd:e.sd,cond:e.cond||[],mats:ms,no:90000000+EVOS.length*13};EVOS.push(ev);REG[ev.id]=ev}});
 POOL=true;return POOL;
}
const isSup=c=>c.k==='s';
function ensureMats(d,e0){e0.mats.forEach(m=>{if(!d.includes(m.id)){const k=d.findIndex(id=>REG[id]&&REG[id].k==='c'&&REG[id].lvl<=4&&!e0.mats.some(x=>x.id===id));if(k>=0)d[k]=m.id}});return d}
function autoDeck(){
 const by=f=>shuffle(CHARS.filter(f));
 const ch=[].concat(by(c=>c.lvl<=3).slice(0,4),by(c=>c.lvl===4).slice(0,4),by(c=>c.lvl===5).slice(0,3),by(c=>c.lvl===6).slice(0,1)).map(c=>c.id);
 const sp=shuffle(SUP.slice()).slice(0,8).map(c=>c.id);
 const d=shuffle(ch.concat(sp));if(EVOS.length)ensureMats(d,EVOS[rnd(EVOS.length)]);return d;
}
function deckCheck(ids){
 const cnt={};ids.forEach(i=>cnt[i]=(cnt[i]||0)+1);
 const n=ids.length,s=ids.filter(i=>REG[i]&&isSup(REG[i])).length,hasLow=ids.some(i=>REG[i]&&REG[i].k==='c'&&REG[i].lvl<=4);
 let msg='';
 if(n!==MAXD)msg='Il faut exactement '+MAXD+' cartes ('+n+').';else if(s>MAXS)msg='Maximum '+MAXS+' cartes soutien.';else if(!hasLow)msg='Ajoute au moins un personnage de niveau 4 ou moins.';
 return {n,s,ok:!msg,msg};
}
const getDeck=()=>(ls.get('cbdeck2',[])||[]).filter(i=>REG[i]);
const setDeck=d=>ls.set('cbdeck2',d);
const getExtra=()=>{const v=ls.get('cbextra1',null);return (v==null?[]:v).filter(i=>REG[i]&&REG[i].k==='e').slice(0,MAXX)};
const setExtra=d=>ls.set('cbextra1',d);

/* ---------- état de partie ---------- */
const mkP=(ids,ex,rng)=>({extra:(ex||[]).map(i=>REG[i]).filter(Boolean),lp:8000,deck:shuffle(ids.map(i=>REG[i]),rng),hand:[],mon:[null,null,null],st:[null,null,null],grave:[],normal:false,senzu:false});
const mkM=(c,pos)=>({card:c,pos,atkP:0,defP:0,tmp:0,ts:G.n,att:false,chg:false});
const P=i=>G.p[i], nm=i=>i===0?'Toi':'L’adversaire', S=(pi,a,b)=>pi===0?'Tu '+a:'L’adversaire '+b;
const mons=pi=>G.p[pi].mon.map((m,i)=>m?{m,i}:null).filter(Boolean);
const eqN=(pi,m,id)=>G.p[pi].st.filter(s=>s&&s.to===m&&s.card.id===id).length;
const hasCape=(pi,m)=>eqN(pi,m,'cape')>0;
const fld=()=>G.field&&G.field.card.id;
const friend=pi=>mons(pi).length>=3&&G.p[pi].st.some(s=>s&&s.up&&s.card.id==='amitie');
function atk(pi,m){let v=m.card.atk+m.atkP+m.tmp+500*eqN(pi,m,'forgeron')+300*eqN(pi,m,'epee');if(fld()==='arene')v+=200;if(fld()==='lune'&&m.card.col===4)v+=300;if(friend(pi))v+=1000;return Math.max(0,v)}
function def(pi,m){let v=m.card.def+m.defP+300*eqN(pi,m,'epee');if(fld()==='village')v+=300;return Math.max(0,v)}
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
   case 'spl':{let tg=null;if(m.tgk==='m')tg=m.tg;else if(m.tgk==='g')tg=p.grave[m.tg];else if(m.tgk==='h')tg=p.hand[m.tg];await playSpell(1,m.hi,tg);break}
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
function hurt(pi,v){if(v<=0)return;const e=zoneEl('p',pi,0);setLP(pi,P(pi).lp-v);floatTxt(e,'-'+v);log(S(pi,'perds','perd')+' '+v+' points de vie.');checkEnd()}
function heal(pi,v){const e=zoneEl('p',pi,0);setLP(pi,P(pi).lp+v);floatTxt(e,'+'+v,true);log(S(pi,'récupères','récupère')+' '+v+' points de vie.')}
async function drawN(pi,n,quiet){
 for(let k=0;k<n;k++){
  const p=P(pi);
  if(!p.deck.length){endGame(1-pi,pi===0?'Ta pioche est vide.':'La pioche adverse est vide.');return}
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
  if(id==='embuscade'&&atk(pi,A)>1500)return;
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
  if(T.pos==='a'){
   const x=Math.round(a*factor(A.card.col,T.card.col)),y=Math.round(atk(1-pi,T)*factor(T.card.col,A.card.col));
   log(A.card.n+' '+x+' contre '+T.card.n+' '+y+'.');
   if(x>y){if(!(await saveBy(1-pi,ti)))await destroyMon(1-pi,ti);hurt(1-pi,x-y)}
   else if(x<y){if(!(await saveBy(pi,i)))await destroyMon(pi,i);hurt(pi,y-x)}
   else{const s1=await saveBy(1-pi,ti);if(!s1)await destroyMon(1-pi,ti);if(p.mon[i]&&!(await saveBy(pi,i)))await destroyMon(pi,i)}
  }else{
   const d=def(1-pi,T),x=Math.round(a*factor(A.card.col,T.card.col));
   log(A.card.n+' '+x+' contre DEF '+d+'.');
   if(x>d){if(!(await saveBy(1-pi,ti)))await destroyMon(1-pi,ti)}
   else if(x<d)hurt(pi,d-x);
  }
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
  case 'pacte':return !mm.length?{ok:0,why:'Il faut un personnage.'}:p.lp<=1000?{ok:0,why:'Pas assez de points de vie.'}:{ok:1,tg:'mon'};
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
  case 'ramen':heal(pi,800);p.grave.push(c);break;
  case 'senzu':heal(pi,1500);p.senzu=true;p.grave.push(c);break;
  case 'examen':p.grave.push(c);await drawN(pi,2);break;
  case 'flashback':{const k=p.grave.indexOf(tg);if(k>=0){p.grave.splice(k,1);p.hand.push(tg);log(tg.n+' revient en main.')}p.grave.push(c);break}
  case 'entrainement':{const m=p.mon[tg];if(m){m.tmp+=400;log(m.card.n+' gagne 400 ATK ce tour.')}p.grave.push(c);break}
  case 'pacte':{const m=p.mon[tg];setLP(pi,p.lp-1000);floatTxt(zoneEl('p',pi,0),'-1000');if(m){m.atkP+=800;log(m.card.n+' gagne 800 ATK pour de bon.')}p.grave.push(c);checkEnd();break}
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
const evoNoteLong=c=>(c.mats.length>1?' Matériaux : '+c.mats.map(m=>m.n).join(' + ')+'.':'')+(c.cond&&c.cond.length?' Condition : '+c.cond.map(condLong).join(' ')+'':'')+' Le personnage doit être sur le terrain depuis le tour précédent.';
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
 if(!idx)return c.mats.map(x=>x.n).join(' + ')+' est sur ton terrain depuis trop peu de temps : il doit y être depuis le tour précédent.';
 return 'Condition manquante : '+condsFail(pi,c,idx).map(condLong).join(' ');
}
/* un personnage ne peut évoluer que s'il est sur le terrain depuis un tour précédent (any = on ignore cette attente) */
function evoMats(pi,c,any){
 const used=new Set(),idx=[];
 for(const m of c.mats){const x=mons(pi).find(y=>y.m.card.id===m.id&&!used.has(y.i)&&(any||y.m.ts<G.n));if(!x)return null;used.add(x.i);idx.push(x.i)}
 return idx;
}
async function doEvolve(pi,c,idx){
 const p=P(pi);
 banner('ÉVOLUTION !','#b79cf0');log(S(pi,'fais','fait')+' évoluer '+c.mats.map(m=>m.n).join(' + ')+' en '+c.n+'.');
 idx.forEach(i=>{const e=zoneEl('m',pi,i);if(e&&e.firstElementChild)e.firstElementChild.classList.add('sel')});
 await sleep(750);
 for(const i of idx)await destroyMon(pi,i,'evolution');
 const slot=idx[0];
 p.extra=p.extra.filter(x=>x!==c);
 p.mon[slot]=mkM(c,'a');G.pop='m'+pi+slot;
 render();hitAt(zoneEl('m',pi,slot));burst(zoneEl('m',pi,slot),'#b79cf0');await sleep(900);G.pop=null;
}
async function actEvolve(){
 if(!myTurn())return;
 const p=P(0);if(!p.extra.length)return toast('Ton deck d’évolution est vide.');
 const opts=p.extra.map(c=>({c,idx:evoReady(0,c)}));
 const m=modal('<h3>Évolution</h3><p>Choisis la transformation. Le personnage doit être sur ton terrain depuis le tour précédent, et la condition de la carte doit être remplie. Il est remplacé et va au cimetière.</p><div class="cbgrid2">'+opts.map((o,i)=>'<div class="it" data-i="'+i+'" style="'+(o.idx?'':'opacity:.4')+'">'+cardHTML(o.c)+'</div>').join('')+'</div><div class="cbact"><button class="sec" data-x="1">Annuler</button></div>');
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
 const pos=!opp||best.c.atk>=oppA*0.85||best.c.def<best.c.atk*0.6?'a':'d';
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
 if(opp)mons(1).forEach(x=>{if(!x.m.chg&&x.m.ts!==G.n&&x.m.pos==='a'&&atk(0,opp.m)>atk(1,x.m)+200&&x.m.card.def>=x.m.card.atk-300)x.m.pos='d'});
 render();
}
async function aiBattle(){
 if(G.n===1)return;
 for(let g=0;g<4&&!G.over;g++){
  const my=mons(1).filter(x=>x.m.pos==='a'&&!x.m.att);if(!my.length)break;
  const x=my.sort((a,b)=>atk(1,b.m)-atk(1,a.m))[0];
  const opps=mons(0);
  if(!opps.length){await battle(1,x.i,-1);await sleep(300);continue}
  const a=atk(1,x.m);let best=null,bs=0;
  opps.forEach(t=>{
   let s=0;
   if(t.m.pos==='a'){const u=Math.round(a*factor(x.m.card.col,t.m.card.col)),v=Math.round(atk(0,t.m)*factor(t.m.card.col,x.m.card.col));if(u>v)s=1000+(u-v)+t.m.card.atk/10;else if(u===v&&t.m.card.atk>x.m.card.atk)s=200}
   else{const u=Math.round(a*factor(x.m.card.col,t.m.card.col));if(u>def(0,t.m))s=500+t.m.card.atk/10}
   if(s>bs){bs=s;best=t}
  });
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
 G.turn=1-pi;G.n++;G.ai=false;ui.sel=null;ui.selMon=null;
 await startTurn();
}
async function startTurn(){
 const pi=G.turn,p=P(pi);
 p.normal=false;p.senzu=false;p.mon.forEach(m=>{if(m){m.att=false;m.chg=false}});
 banner(pi===0?'À TOI DE JOUER':'TOUR ADVERSE',pi===0?'#3dae5a':'#ec5fa0');
 G.busy=true;render();await sleep(600);
 if(G.n>1)await drawN(pi,1);
 if(G.over)return;
 G.busy=false;render();
 if(pi===0)startTimer();else if(NET)remoteLoop();else aiTurn();
}
function startTimer(){stopTimer();G.t0=Date.now();G.tm=setInterval(tick,200)}
function stopTimer(){if(G&&G.tm){clearInterval(G.tm);G.tm=null}}
function tick(){
 if(!G||!alive||G.over||G.turn!==0)return;
 const left=Math.max(0,LIM-(Date.now()-G.t0)),r=$('cbR0');
 if(r){r.style.setProperty('--p',left/LIM*100);r.classList.toggle('low',left<10000)}
 if(left<=0&&!G.busy&&!ui.modal&&!ui.pick){stopTimer();humanEnd()}
}
async function humanEnd(){
 if(!G||G.over||G.turn!==0||G.busy||G.ai||ui.modal)return;
 if(ui.pick&&ui.pickDone)ui.pickDone(null);
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
const myTurn=()=>G&&!G.over&&G.turn===0&&!G.busy&&!G.ai&&!ui.pick&&!ui.modal;
async function actSummon(hi,pos){
 if(!myTurn())return;
 const p=P(0),c=p.hand[hi];if(!c||c.k!=='c')return;
 if(p.normal)return toast('Tu as déjà invoqué un personnage ce tour.');
 let slot,trib=false;
 if(c.lvl>=5){
  const l=mons(0);if(!l.length)return toast('Il faut sacrifier un personnage pour invoquer le niveau '+c.lvl+'.');
  const t=await pick('Choisis le personnage à sacrifier',l.map(x=>({z:'m',p:0,i:x.i})));if(!t)return;slot=t.i;trib=true;
 }else{slot=freeMon(0);if(slot<0)return toast('Aucune zone de personnage libre.')}
 netSend('sum',{hi,slot,pos,trib});
 G.busy=true;ui.sel=null;await doSummon(0,hi,slot,pos,trib);G.busy=false;render();
}
async function actSpell(hi){
 if(!myTurn())return;
 const p=P(0),c=p.hand[hi];if(!c)return;
 const inf=spellInfo(0,c);if(!inf.ok)return toast(inf.why);
 let tg=null;
 if(inf.tg==='mon'){const t=await pick('Choisis un de tes personnages',mons(0).map(x=>({z:'m',p:0,i:x.i})));if(!t)return;tg=t.i}
 else if(inf.tg==='grave'){tg=await chooseCard('Choisis un personnage du cimetière',p.grave.filter(x=>x.k==='c'),true);if(!tg)return}
 else if(inf.tg==='hand56'){tg=await chooseCard('Choisis le personnage à poser',p.hand.filter(x=>x.k==='c'&&x.lvl>=5),true);if(!tg)return}
 const hi2=p.hand.indexOf(c);if(hi2<0)return;
 if(NET){const tgk=inf.tg==='grave'?'g':inf.tg==='hand56'?'h':inf.tg==='mon'?'m':'';netSend('spl',{hi:hi2,tgk,tg:tgk==='g'?p.grave.indexOf(tg):tgk==='h'?p.hand.indexOf(tg):tg})}
 G.busy=true;ui.sel=null;await playSpell(0,hi2,tg);G.busy=false;render();
}
async function actSet(hi){
 if(!myTurn())return;
 if(freeSt(0)<0)return toast('Aucune zone de soutien libre.');
 netSend('set',{hi});
 G.busy=true;ui.sel=null;await setTrap(0,hi);G.busy=false;render();
}
async function actAttack(i){
 if(!myTurn())return;
 if(G.n===1)return toast('On ne peut pas attaquer au premier tour de la partie.');
 const m=P(0).mon[i];if(!m||m.att||m.pos!=='a')return;
 const opps=mons(1);let ti=-1;
 if(opps.length){const t=await pick('Choisis le personnage à attaquer',opps.map(x=>({z:'m',p:1,i:x.i})));if(!t)return;ti=t.i}
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
function monHTML(pi,i){
 const m=P(pi).mon[i];if(!m)return '';
 const cls=(m.pos==='d'?' def':'')+(ui.selMon===i&&pi===0?' sel':'')+(pi===0&&m.att?' used':'')+(G.pop==='m'+pi+i?' pop':'');
 return '<div class="bc'+cls+'">'+cardHTML(m.card,{atk:atk(pi,m),def:def(pi,m)})+'</div>';
}
function stHTML(pi,i){
 const s=P(pi).st[i];if(!s)return '';
 if(s.up)return '<div class="bc">'+cardHTML(s.card)+'</div>';
 return pi===0?'<div class="bc setc">'+cardHTML(s.card)+'</div>':'<div class="bc">'+backHTML()+'</div>';
}
function render(){
 const b=boardEl();if(!b||!G)return;
 const me=P(0),op=P(1),can=myTurn();
 const gv=pi=>{const g=P(pi).grave,t=g[g.length-1];return t?'<div class="bc">'+cardHTML(t)+'</div><span class="cnt">'+g.length+'</span>':''};
 const hand=me.hand.map((c,i)=>{
  const inf=c.k==='c'?{ok:!me.normal&&(c.lvl<5||mons(0).length>0)&&(c.lvl>=5||freeMon(0)>=0)}:c.t==='trap'?{ok:freeSt(0)>=0}:spellInfo(0,c);
  const r=(i-(me.hand.length-1)/2)*(me.hand.length>6?5:7),y=Math.abs(i-(me.hand.length-1)/2)*4;
  return '<div class="hc'+(ui.sel===i?' sel':'')+(!inf.ok&&can?' off':'')+(G.newC===c?' new':'')+'" data-z="h" data-p="0" data-i="'+i+'" style="transform:rotate('+r+'deg) translateY('+y+'px)">'+cardHTML(c)+'</div>';
 }).join('');
 const oh=op.hand.map(()=>'<div class="hc">'+backHTML()+'</div>').join('');
 const fcard=G.field?'<div class="bc">'+cardHTML(G.field.card)+'</div>':'';
 const rr=(a,b2)=>'<div class="crw">'+a+'</div>';
 b.innerHTML=
 '<div class="ban" id="cbBan"><b></b></div>'+
 '<div class="cpl o"><div class="cring'+(G.ai?' think':'')+'" id="cbR1" data-z="p" data-p="1" data-i="0">'+avHTML(G.pr[1])+'</div><div class="cpt"><small>'+esc(G.pr[1].n.toUpperCase())+'</small><b id="cbLp1">'+op.lp+'</b></div></div>'+
 '<div class="hnd o">'+oh+'</div>'+
 '<div class="crw" style="margin-top:calc(var(--cw)*.5)">'+slot('g',1,0,'Cimetière',gv(1),'')+slot('s',1,0,'Soutien',stHTML(1,0),'st')+slot('s',1,1,'Soutien',stHTML(1,1),'st')+slot('s',1,2,'Soutien',stHTML(1,2),'st')+slot('d',1,0,'Pioche',op.deck.length?'<div class="bc">'+backHTML()+'</div><span class="cnt">'+op.deck.length+'</span>':'','deck')+'</div>'+
 '<div class="crw">'+slot('f',0,0,'Terrain',fcard,'')+slot('m',1,0,'Personnage',monHTML(1,0),'')+slot('m',1,1,'Personnage',monHTML(1,1),'')+slot('m',1,2,'Personnage',monHTML(1,2),'')+slot('x',0,0,'','','e')+'</div>'+
 '<div class="mid"><span>'+(G.over?'PARTIE TERMINÉE':G.turn===0?'TON TOUR · TOUR '+G.n:'TOUR ADVERSE · TOUR '+G.n)+'</span></div>'+
 '<div class="crw">'+slot('x',0,1,'','','e')+slot('m',0,0,'Personnage',monHTML(0,0),'')+slot('m',0,1,'Personnage',monHTML(0,1),'')+slot('m',0,2,'Personnage',monHTML(0,2),'')+slot('x',0,2,'','','e')+'</div>'+
 '<div class="crw">'+slot('d',0,0,'Pioche',me.deck.length?'<div class="bc">'+backHTML()+'</div><span class="cnt">'+me.deck.length+'</span>':'','deck')+slot('s',0,0,'Soutien',stHTML(0,0),'st')+slot('s',0,1,'Soutien',stHTML(0,1),'st')+slot('s',0,2,'Soutien',stHTML(0,2),'st')+slot('g',0,0,'Cimetière',gv(0),'')+'</div>'+
 '<div class="hnd m">'+hand+'</div>'+
 '<button class="endb" id="cbEnd"'+(can?'':' disabled')+'>Fin du tour</button>'+
 '<div class="cpl m"><div class="cring" id="cbR0" data-z="p" data-p="0" data-i="0" style="--p:'+(G.turn===0&&G.t0?Math.max(0,100-(Date.now()-G.t0)/LIM*100):0)+'">'+avHTML(G.pr[0])+'</div><div class="cpt"><small>'+esc(G.pr[0].n.toUpperCase())+'</small><b id="cbLp0">'+me.lp+'</b></div></div>';
 if(G.fxChanged){b.classList.toggle('fa',fld()==='arene');G.fxChanged=0}
 renderPanel();
}
function cardAt(z,p,i){
 const pl=G.p[p];
 if(z==='h')return p===0?{c:pl.hand[i]}:null;
 if(z==='m'){const m=pl.mon[i];return m?{c:m.card,atk:atk(p,m),def:def(p,m),m}:null}
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
 const ev=$('cbEvoW');if(ev){const n=P(0).extra.length,rd=P(0).extra.some(c=>evoReady(0,c));ev.innerHTML=n?'<button class="sec'+(rd&&myTurn()?' ready':'')+'" data-a="evo">Évolution ('+n+')'+(rd?' · prête':'')+'</button>':''}
 const h=actHTML();
 el.innerHTML=h||'<small style="color:#b8c2d8">'+(myTurn()?'Clique sur une carte pour la lire et la jouer.':G.ai?'L’adversaire joue…':'')+'</small>';
}
/* zoom : la carte arrive au milieu de l’écran, texte lisible, actions dessous */
function closeZoom(){const z=ui.zoomEl;if(z&&z.parentNode)z.remove();ui.zoomEl=null}
function openZoom(src,info,acts){
 closeZoom();
 const c=info.c,zs=Math.max(.6,Math.min(1.25,(window.innerWidth-40)/260,(window.innerHeight-230)/379));
 const o=document.createElement('div');o.className='cbzoom bk'+backN();o.style.setProperty('--zs',zs.toFixed(3));
 const isC=c.k==='c'||c.k==='e';
 const txt=isC?'「'+c.sn+'」 : '+c.sd+(c.k==='e'?evoNoteLong(c):'')+' Niveau '+c.lvl+' · ATK '+(info.atk!=null?info.atk:c.atk)+' · DEF '+(info.def!=null?info.def:c.def)+'.':c.txt;
 const sub=isC?(c.k==='e'?'Évolution':'Personnage')+' · '+COL[c.col].k+' '+COL[c.col].n+(c.ex?' · Rare':''):'Carte '+(c.t==='trap'?'Piège':'Magie')+' · '+c.sub;
 o.innerHTML='<div class="zw"><div class="zc">'+cardHTML(c,{atk:info.atk,def:info.def})+'</div><div class="ztx"><b>'+esc(c.n)+'</b><small>'+esc(sub)+'</small><p>'+esc(txt)+'</p></div><div class="cbact">'+(acts||'')+'<button class="sec" data-a="close">Fermer</button></div></div>';
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
 const w=b.clientWidth-16;const cw=Math.max(50,Math.min(104,Math.floor(w/5.5)));
 b.style.setProperty('--cw',cw+'px');b.style.setProperty('--s',(cw/260).toFixed(4));
}

/* ---------- entrées (clic, survol) ---------- */
function onBoardClick(e){
 if(!G)return;
 if(e.target.closest('#cbEnd')){humanEnd();return}
 const z=e.target.closest('[data-z]');if(!z)return;
 const zz=z.dataset.z,p=+z.dataset.p,i=+z.dataset.i;
 if(ui.pick){const c=ui.pick.cands.find(c=>c.z===zz&&c.p===p&&c.i===i);if(c&&ui.pickDone)ui.pickDone(c);return}
 if(ui.modal)return;
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
function onAct(e){
 const b=e.target.closest('button[data-a]');if(!b||!myTurn())return;
 const a=b.dataset.a;
 if(a==='evo'){actEvolve();return}
 if(a==='sa')actSummon(ui.sel,'a');else if(a==='sd')actSummon(ui.sel,'d');
 else if(a==='act')actSpell(ui.sel);else if(a==='set')actSet(ui.sel);
 else if(a==='att')actAttack(ui.selMon);else if(a==='pos')actPos(ui.selMon);
}
function onOver(e){
 const z=e.target.closest('[data-z]');if(!z||!G)return;
 const info=cardAt(z.dataset.z,+z.dataset.p,+z.dataset.i);if(info)renderPrev(info);
}

/* ---------- vues : menu, deck, règles, partie ---------- */
const body=()=>$('cbBody');
function tabs(cur){
 return '<div class="cbtabs">'+[['menu','Jouer'],['build','Mon deck'],['rules','Règles']].map(x=>'<button data-v="'+x[0]+'" class="'+(cur===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div>';
}
function bindTabs(){document.querySelectorAll('#cbBody .cbtabs button').forEach(b=>b.onclick=()=>{const v=b.dataset.v;if(v==='menu')showMenu();else if(v==='build')showBuild();else showRules()})}
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
 $('cbAuto').onclick=()=>{setDeck(autoDeck());showMenu()};
 $('cbBk').onclick=e=>{const b=e.target.closest('button');if(!b)return;ls.set('cbback',+b.dataset.b);showMenu()};
}
function showRules(){
 view='rules';leaveGame();
 body().innerHTML=tabs('rules')+'<div class="cbcard cbrules"><h2 style="margin-top:0">Règles</h2><ul>'+
 '<li><b>But</b> : faire tomber les points de vie de l’adversaire de 8000 à 0. Perdre sa pioche fait aussi perdre.</li>'+
 '<li><b>Deck</b> : 20 cartes exactement, 2 exemplaires maximum de la même carte, 8 cartes soutien au plus.</li>'+
 '<li><b>Début</b> : on pioche 5 cartes. Celui qui commence ne pioche pas et ne peut pas attaquer au premier tour. Main limitée à 7 cartes.</li>'+
 '<li><b>Invoquer</b> : un personnage par tour. Niveau 1 à 4 : gratuit. Niveau 5 et 6 : il faut sacrifier un de tes personnages. Tu as 3 zones de personnages.</li>'+
 '<li><b>Positions</b> : un personnage est en <b>attaque</b> (debout, il utilise son ATK) ou en <b>défense</b> (couché sur le côté, il utilise sa DEF). Il peut changer de position une fois par tour, mais pas le tour où il est invoqué.</li>'+
 '<li><b>Combat</b> : chaque personnage en attaque peut attaquer une fois par tour. Contre un personnage en attaque, le plus fort détruit l’autre et la différence est retirée aux points de vie du perdant. Contre un personnage en défense, s’il est plus fort il le détruit sans dégâts, sinon l’attaquant perd la différence. Sans personnage en face, c’est une attaque directe.</li>'+
 '<li><b>Couleurs</b> : chaque couleur est forte contre les deux suivantes (+20 % d’ATK) et faible contre les deux précédentes (−20 %) : 炎 Braise → 雷 Éclair → 森 Sève → 水 Marée → 闇 Ombre → 光 Éclat → 炎.</li>'+
 '<li><b>Soutiens</b> : les Magies se jouent pendant ton tour. Les Équipements restent attachés à un personnage. Un seul Terrain à la fois, il compte pour les deux joueurs. Les Pièges se posent face cachée et se déclenchent pendant le tour de l’adversaire.</li>'+
 '<li><b>Transformation</b> : ton deck d’évolution (2 cartes au plus, à part des 20 cartes) contient des cartes violettes. Un personnage peut se transformer en carte évoluée s’il est sur ton terrain <b>depuis le tour précédent</b> (on ne peut pas poser un personnage et le transformer aussitôt) et si la <b>condition écrite sur la carte</b> est remplie : un équipement sur le personnage, un Terrain en jeu, un piège posé, des cartes au cimetière, des points de vie bas, un allié de la même couleur, ou avoir joué une carte précise (par exemple « Entraînement intense » pour Goku). Il va au cimetière et la carte évoluée prend sa place, sans compter comme ton invocation du tour. Bouton « Évolution » à droite du plateau.</li><li><b>Duel en ligne</b> : « Duel en ligne » dans le menu. L’un crée un duel et donne le code à 4 lettres, l’autre le tape. Chacun joue avec son deck, une photo de profil et un chronomètre s’affichent pour les deux.</li><li><b>Temps</b> : 45 secondes par tour. L’anneau autour de ton avatar se vide, puis devient rouge.</li></ul></div>';
 bindTabs();
}
let bf={t:'all',c:-1,q:''};
function showBuild(){
 view='build';leaveGame();
 const d=getDeck();const cnt={};d.forEach(i=>cnt[i]=(cnt[i]||0)+1);
 const ck=deckCheck(d);
 let list=CHARS.concat(SUP);
 if(bf.t==='c')list=list.filter(x=>x.k==='c');else if(bf.t==='m')list=list.filter(x=>x.k==='s'&&x.t!=='trap');else if(bf.t==='p')list=list.filter(x=>x.k==='s'&&x.t==='trap');
 if(bf.c>=0)list=list.filter(x=>x.col===bf.c);
 if(bf.q)list=list.filter(x=>x.n.toLowerCase().includes(bf.q.toLowerCase()));
 const full=d.length>=MAXD;
 body().innerHTML=tabs('build')+
 '<div class="cbbar"><span class="cbcount '+(ck.ok?'ok':d.length>MAXD||ck.s>MAXS?'bad':'')+'">Deck : '+d.length+'/'+MAXD+' · soutiens '+ck.s+'/'+MAXS+'</span><span style="color:var(--mut);font-size:.85rem">'+esc(ck.ok?'Deck valide.':ck.msg)+'</span><span style="flex:1"></span><button class="cbchip" id="cbRand">Deck aléatoire</button><button class="cbchip" id="cbClear">Vider</button><button class="cbchip on" id="cbGo"'+(ck.ok?'':' disabled')+'>Jouer</button></div>'+
 '<div class="cbdeck" id="cbDeck">'+(d.length?d.slice().sort((a,b)=>(REG[b].lvl||0)-(REG[a].lvl||0)).map(id=>'<div class="cbitem mini" data-r="'+id+'">'+cardHTML(REG[id])+'</div>').join(''):'<span style="color:var(--mut)">Clique sur des cartes ci-dessous pour les ajouter. Clique sur une carte du deck pour la retirer.</span>')+'</div>'+
 '<div class="cbcard"><b>Deck d’évolution ('+getExtra().length+'/'+MAXX+')</b> <span style="color:var(--mut);font-size:.85rem">Cartes violettes, à part des 20 cartes. Tu peux en choisir <b>2 au maximum</b>. Le personnage doit être sur le terrain depuis le tour précédent pour se transformer. Clique pour ajouter ou retirer.</span><div class="cbgrid" id="cbEx">'+EVOS.map(e=>{const on=getExtra().includes(e.id),have=e.mats.every(m=>d.includes(m.id));return '<div class="cbitem'+(on?'':' max')+'" data-e="'+e.eid+'">'+cardHTML(e)+'<span class="nq" style="background:'+(have?'#1d7f3a':'#a15a12')+'">'+(on?'✓ ':'')+(have?'prête':'incomplète')+'</span></div>'}).join('')+'</div></div>'+
 '<div class="cbtabs" id="cbF" style="margin-bottom:6px">'+[['all','Tout'],['c','Personnages'],['m','Magies'],['p','Pièges']].map(x=>'<button data-t="'+x[0]+'" class="'+(bf.t===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+COL.map((c,i)=>'<button data-c="'+i+'" class="'+(bf.c===i?'on':'')+'" style="border-color:'+c.c+'">'+c.k+'</button>').join('')+'<input class="cbsearch" id="cbQ" placeholder="Rechercher un nom…" value="'+esc(bf.q)+'"></div>'+
 '<div class="cbgrid" id="cbGrid">'+list.map(x=>{const n=cnt[x.id]||0;const mx=n>=2||(isSup(x)&&ck.s>=MAXS&&true&&false);return '<div class="cbitem'+(n>=2?' max':'')+'" data-a="'+x.id+'">'+(n?'<span class="nq">×'+n+'</span>':'')+cardHTML(x)+'</div>'}).join('')+'</div>';
 bindTabs();
 const z=document.createElement('div');z.id='cbZoom';z.style.cssText='position:fixed;right:16px;top:90px;z-index:50;pointer-events:none;display:none';document.body.appendChild(z);ui.zoom=z;
 const g=$('cbGrid'),dk=$('cbDeck');
 const hov=e=>{const it=e.target.closest('.cbitem');if(!it){z.style.display='none';return}const c=REG[it.dataset.a||it.dataset.r||(it.dataset.e?'e_'+it.dataset.e:'')];if(!c||window.innerWidth<900){z.style.display='none';return}z.innerHTML='<div style="width:'+(260*.8)+'px;height:'+(379*.8)+'px;position:relative" class="bk'+backN()+'"><div style="zoom:.8">'+cardHTML(c)+'</div></div>';z.style.display='block'};
 g.onmouseover=hov;dk.onmouseover=hov;g.onmouseleave=dk.onmouseleave=()=>z.style.display='none';
 $('cbEx').onclick=e=>{const it=e.target.closest('.cbitem');if(!it)return;const id='e_'+it.dataset.e;const cur=getExtra();const k=cur.indexOf(id);const y=window.scrollY;if(k>=0)cur.splice(k,1);else{if(cur.length>=MAXX)return flash('Le deck d’évolution est complet.');cur.push(id)}setExtra(cur);showBuild();window.scrollTo(0,y)};
 $('cbEx').onmouseover=hov;
 g.onclick=e=>{const it=e.target.closest('.cbitem');if(!it)return;const id=it.dataset.a,c=REG[id];const cur=getDeck();
  if(cur.length>=MAXD)return flash('Le deck est complet (20).');
  if(cur.filter(x=>x===id).length>=2)return flash('Maximum 2 exemplaires.');
  if(isSup(c)&&cur.filter(x=>REG[x]&&isSup(REG[x])).length>=MAXS)return flash('Maximum '+MAXS+' cartes soutien.');
  const y=window.scrollY;cur.push(id);setDeck(cur);showBuild();window.scrollTo(0,y)};
 dk.onclick=e=>{const it=e.target.closest('.cbitem');if(!it)return;const cur=getDeck();const k=cur.indexOf(it.dataset.r);if(k>=0)cur.splice(k,1);setDeck(cur);showBuild()};
 $('cbF').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.t){bf.t=b.dataset.t}else if(b.dataset.c!=null){bf.c=bf.c===+b.dataset.c?-1:+b.dataset.c}showBuild()};
 $('cbQ').oninput=e=>{bf.q=e.target.value;clearTimeout(showBuild.t);showBuild.t=setTimeout(()=>{showBuild();const q=$('cbQ');q.focus();q.setSelectionRange(q.value.length,q.value.length)},300)};
 $('cbRand').onclick=()=>{setDeck(autoDeck());showBuild()};
 $('cbClear').onclick=()=>{setDeck([]);showBuild()};
 $('cbGo').onclick=()=>{if(deckCheck(getDeck()).ok)startGame()};
}
function flash(t){const b=document.querySelector('#cbBody .cbbar span');if(b){const o=b.textContent;b.textContent=t;setTimeout(()=>{if(b)b.textContent=o},1800)}}
function leaveGame(keepNet){
 if(!keepNet)netClose();
 stopTimer();if(G){G.over=true}G=null;ui={};
 if(document.getElementById('cbZoom'))document.getElementById('cbZoom').remove();
 document.querySelectorAll('.cbmodal').forEach(m=>m.remove());
 closeZoom();document.querySelectorAll('.cbfly').forEach(x=>x.remove());
}
function mountGame(){
 body().innerHTML='<div class="cbtop"><button class="cbchip" id="cbQuit">← Quitter la partie</button></div><div id="cbGame"><div class="cbt bk'+backN()+'" id="cbT"></div><div class="cbside" id="cbSide"><div class="cbprev" id="cbPrev"></div><div class="cbact" id="cbAct"></div><div class="cbact" id="cbEvoW"></div><div id="cbHint" style="color:#e5483b;font-size:.85rem;min-height:1.2em;opacity:0;transition:opacity .3s"></div><div class="cblog" id="cbLog"></div></div></div>';
 $('cbQuit').onclick=async()=>{if(G&&!G.over){const r=await ask('Quitter la partie ?','La partie en cours sera perdue.',[{v:true,t:'Quitter'},{v:false,t:'Continuer',sec:1}]);if(!r)return}showMenu()};
 const b=boardEl();fit();b.onclick=onBoardClick;b.onmouseover=onOver;$('cbAct').onclick=onAct;$('cbEvoW').onclick=onAct;
 renderPrev(null);
}
async function startGame(){
 const mine=getDeck();if(!deckCheck(mine).ok){showBuild();return}
 leaveGame();view='game';
 const ad=autoDeck();let ax=[];
 if(EVOS.length){const pl=shuffle(EVOS.slice());ax=pl.slice(0,2).map(e=>e.id);ensureMats(ad,pl[0])}
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
 body().innerHTML=tabs('menu')+'<div class="cbcard" style="text-align:center"><h2 style="margin-top:0">En attente d’un ami…</h2><p>Donne ce code à ton ami :</p><div style="font:900 3rem Georgia,serif;letter-spacing:.3em;margin:10px 0">'+code+'</div><p style="color:var(--mut)">Il doit aller dans Kuroven Combat, « Duel en ligne », puis taper le code. La partie démarre toute seule.</p><button class="cbbtn lt" id="cbCancel">Annuler</button></div>';
 bindTabs();$('cbCancel').onclick=()=>showOnline();
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
window.addEventListener('resize',()=>{if(G&&alive)fit()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeZoom()});

/* ---------- API pour index.html ---------- */
window.CB={
 async enter(){
  alive=true;const b=body();if(!b)return;
  if(G&&!G.over&&view==='game'){if(G.turn===0&&!G.busy&&!G.tm)startTimer();return}
  b.innerHTML='<p class="sub" style="text-align:center">Chargement des cartes…</p>';
  try{await loadPool()}catch(e){b.innerHTML='<p class="sub" style="text-align:center">Impossible de charger les personnages (AniList ne répond pas). <button class="cbchip" id="cbRetry">Réessayer</button></p>';const r=$('cbRetry');if(r)r.onclick=()=>CB.enter();return}
  if(!getDeck().length&&deckCheck(getDeck()).n===0)setDeck(autoDeck());
  if(view==='build')showBuild();else if(view==='rules')showRules();else showMenu();
 },
 leave(){alive=false;stopTimer()}
};
})();
