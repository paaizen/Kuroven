/* === Ma Vie : animations des cartes Trash (rejouées au centre de la table) === */
(function(){
const FAM={};
FAM.tv=function(H){const {$,NS,RM,wait,ease,easeIn,anim,mk,el,tone,noise,sFlip,sWhoosh,sDraw,sThud}=H;




const P=H.P;
const sc=$('#sc');let R={},busy=false;const SC={};
const CL=i=>i*75,HX=(i,k)=>CL(i)+2+k*16,HY=156;
const lab=t=>{R.lab.innerHTML=H.nm(t)};
const SM=(h,cls,x,y,z)=>el('sm a '+(cls||''),h,sc,'left:'+x+'px;top:'+y+'px'+(z?';z-index:'+z:''));
const K=(e,t,x,y,cls)=>el('mc front a '+(cls||''),e+'<small>'+t+'</small>',sc,'left:'+x+'px;top:'+y+'px');
function mv(c,x,y,ms,arc){const x0=parseFloat(c.style.left),y0=parseFloat(c.style.top);return anim(ms||420,u=>{const e=ease(u);c.style.left=(x0+(x-x0)*e)+'px';c.style.top=(y0+(y-y0)*e-(arc?Math.sin(Math.PI*u)*arc:0))+'px'})}
function bigFx(txt,x,y,col,snd){const b=el('big',txt,sc,'left:'+(x-25)+'px;top:'+(y-18)+'px;color:'+(col||'#fff'));if(snd==='no')tone(160,.3,'sawtooth',.2,80);else if(snd==='ok')tone(700,.18,'triangle',.18,1000);else if(snd==='boom'){noise(.5,60,.5,1800,200);tone(90,.3,'sine',.5,40)}anim(700,u=>{b.style.transform='scale('+(.3+.9*ease(Math.min(1,u*2.5)))+')';b.style.opacity=u<.6?1:1-(u-.6)/.4}).then(()=>b.remove());return wait(450)}
async function shake(c){const x=parseFloat(c.style.left);await anim(300,u=>c.style.left=(x+Math.sin(u*30)*4*(1-u))+'px')}
async function flipC(c,fn){await anim(110,u=>c.style.transform='scaleX('+(1-u)+')');fn();await anim(110,u=>c.style.transform='scaleX('+u+')');c.style.transform=''}
async function popIn(c){await anim(260,u=>{c.style.transform='scale('+(ease(u)+Math.sin(u*Math.PI)*.2)+')';c.style.opacity=Math.min(1,u*4)});c.style.transform=''}
function pill(t,x,y){return el('pill',t,sc,'left:'+x+'px;top:'+y+'px')}
function build(title,kind,n){
  sc.innerHTML='';R={};n=n||[4,4,4,4];
  const bg=mk('svg',{viewBox:'0 0 300 214',width:300,height:214,style:'position:absolute;left:0;top:0'},sc);
  const d=mk('defs',{},bg);const g=mk('linearGradient',{id:'bgg',x1:0,y1:0,x2:0,y2:1},d);
  mk('stop',{offset:0,'stop-color':'#1c1428'},g);mk('stop',{offset:1,'stop-color':'#2c2038'},g);
  mk('rect',{width:300,height:214,fill:'url(#bgg)'},bg);
  for(let i=1;i<4;i++)mk('line',{x1:i*75,y1:18,x2:i*75,y2:196,stroke:'#3a2c4e','stroke-width':1,'stroke-dasharray':'3 4'},bg);
  P.forEach((p,i)=>{R['av'+i]=el('av',p[0],sc,'left:'+CL(i)+'px');el('nm',p[1],sc,'left:'+CL(i)+'px')});
  R.hands=P.map((p,i)=>Array.from({length:n[i]},(_,k)=>SM('','back',HX(i,k),HY)));
  el('hd '+kind,title,sc);R.lab=el('lab','',sc);
}
const FACES=[['💼','JOB'],['💰','SAL.'],['🍺','BAR'],['🎓','ÉTUD.'],['🏠','MAISON'],['🚗','AUTO'],['✈️','VOYAGE'],['🎁','CADEAU']];
const fc=()=>FACES[Math.floor(Math.random()*FACES.length)];
const NAMES={};
async function go(k){
  if(busy)return;busy=true;
  H.qa('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
  $('#msg').innerHTML='<b>'+NAMES[k]+'</b>';
  try{await SC[k]()}catch(e){console.error(e)}
  busy=false;
}
function tabs(){H.qa('.tabs button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.k)));build('Choisis une carte','spe');lab('Choisis une carte ci-dessous')}
const NAMES2={"tsunami": "🌊 Tsunami", "veng": "😈 Vengeance"};Object.assign(NAMES,NAMES2);
const WAVE='<svg viewBox="0 0 340 214" width="340" height="214"><defs><linearGradient id="wv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fe0ff"/><stop offset=".35" stop-color="#2f8be0"/><stop offset="1" stop-color="#0f3f94"/></linearGradient></defs>'
+'<path d="M0 214 L0 46 Q30 22 70 40 Q110 4 160 34 Q214 -6 262 34 Q304 6 326 52 Q348 90 340 130 L340 214Z" fill="url(#wv)" stroke="#0b2a66" stroke-width="2.4"/>'
+'<path d="M12 70 Q50 52 90 72 Q130 46 176 70 Q222 44 262 72 Q296 52 330 80" fill="none" stroke="#bfeeff" stroke-width="3" stroke-linecap="round" opacity=".7"/>'
+'<path d="M10 112 Q52 94 96 114 Q140 90 188 114 Q232 90 276 114 Q306 98 332 118" fill="none" stroke="#7fcaf5" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>'
+'<path d="M16 156 Q60 140 104 158 Q150 136 200 158 Q246 136 292 158" fill="none" stroke="#5aa8ea" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>'
+[20,62,104,150,198,246,296,322].map((x,i)=>'<circle cx="'+x+'" cy="'+(30+(i%3)*9)+'" r="'+(6+(i%3)*2)+'" fill="#fff" opacity=".95"/>').join('')
+'</svg>';
const FACES2=[['🎓','ÉTUD.'],['💼','JOB'],['🏠','MAISON'],['✈️','VOYAGE'],['🚗','AUTO'],['🍺','BAR'],['💰','SAL.'],['🎁','CADEAU'],['🐶','CHIEN'],['💍','MARIAGE']];
const pick=()=>FACES2[Math.floor(Math.random()*FACES2.length)];
SC.tsunami=async()=>{
  const N=[3,4,2,4];
  build('SPÉCIALE · TSUNAMI','spe',N);
  const mine=R.hands[3];
  mine.forEach(h=>{const f=pick();h.className='sm a';h.innerHTML=f[0]+'<small>'+f[1]+'</small>'});
  lab('Tes cartes : <b>'+N[3]+'</b> · Léa 3 · Zoé 4 · Marc 2');await wait(900);
  const c=K('🌊','TSUNAMI',HX(3,1),HY-6,'');sDraw();await mv(c,126,64,450);await wait(250);
  lab('<b>Toutes les mains</b> sont mélangées et redistribuées');
  const w=el('a',WAVE,sc,'left:-345px;top:0;width:340px;height:214px;z-index:6');
  noise(1.1,60,.5,900,160);
  await anim(900,u=>{w.style.left=(-345+325*ease(u))+'px'});
  // sous la vague : toutes les cartes partent au centre
  const all=[];R.hands.forEach(hs=>hs.forEach(h=>all.push(h)));
  mine.forEach(h=>{h.className='sm a back';h.innerHTML=''});
  all.forEach((h,j)=>{h.style.left=(128+(j%4)*3)+'px';h.style.top=(104+(j%3)*3)+'px';h.style.zIndex=3});
  for(let i=0;i<10;i++){const d=el('a','💧',sc,'left:'+(20+Math.random()*250)+'px;top:'+(60+Math.random()*80)+'px;font-size:12px;z-index:7');anim(700,u=>{d.style.top=(parseFloat(d.style.top)+1.4)+'px';d.style.opacity=1-u}).then(()=>d.remove())}
  await wait(250);
  // la vague repart, les cartes tourbillonnent
  noise(.9,60,.4,700,120);
  const ang=all.map((_,j)=>j/all.length*Math.PI*2);
  await Promise.all([
    anim(900,u=>{w.style.left=(-20+365*u*u)+'px'}).then(()=>w.remove()),
    anim(1700,u=>{all.forEach((h,j)=>{const a=ang[j]+u*Math.PI*5,r=8+Math.sin(u*Math.PI)*34;h.style.left=(128+Math.cos(a)*r)+'px';h.style.top=(104+Math.sin(a)*r*.7)+'px';h.style.transform='rotate('+(u*720+j*30)+'deg)'})})
  ]);
  tone(300,.25,'triangle',.15,520);
  c.remove();
  lab('Chacun <b>reprend le même nombre</b> de cartes');
  const order=all.slice().sort(()=>Math.random()-.5);let n=0;
  const tg=[];N.forEach((cnt,i)=>{for(let k=0;k<cnt;k++)tg.push([HX(i,k),HY,i])});
  await Promise.all(order.map((h,j)=>wait(j*70).then(()=>{sDraw();h.style.transform='';return mv(h,tg[j][0],tg[j][1],420,18)})));
  const nm=order.map((h,j)=>[h,tg[j][2]]).filter(x=>x[1]===3);
  await wait(300);
  for(const [h] of nm){const f=pick();flipC(h,()=>{h.className='sm a';h.innerHTML=f[0]+'<small>'+f[1]+'</small>'});sFlip();await wait(110)}
  lab('Toutes les cartes ont <b>changé de main</b>');
  await wait(1500);
};
SC.veng=async()=>{
  build('SPÉCIALE · VENGEANCE','spe');
  const dz=el('zn','DÉFAUSSE',sc,'left:96px;top:92px;width:86px;height:62px');
  const bk=SM('','back',112,108);bk.style.transform='rotate(-8deg)';
  const mal=K('🦠','HERPÈS',124,102,'mal');
  const tag=pill('reçu de Léa',112,138);
  lab('Léa a joué <b>Herpès</b> : il traîne dans la défausse');await wait(1300);
  const v=K('😈','VENGEANCE',HX(3,1),HY-6,'');sDraw();await mv(v,176,98,450);await wait(250);
  lab('<b>Toi</b> <b>récupère</b> un malus reçu');
  tag.remove();
  mal.style.boxShadow='0 0 12px #ff5a3c';tone(220,.4,'sawtooth',.14,440);
  for(let i=0;i<6;i++){const f=el('a','🔥',sc,'left:'+(122+Math.random()*30)+'px;top:'+(96+Math.random()*10)+'px;font-size:13px;z-index:8');anim(700,u=>{f.style.top=(parseFloat(f.style.top)-1)+'px';f.style.opacity=1-u}).then(()=>f.remove())}
  await mv(mal,150,58,520,10);await wait(500);
  lab('…et le <b>renvoie tout de suite</b> à un autre joueur');
  const cr=el('a','🎯',sc,'left:'+(CL(0)+26)+'px;top:20px;font-size:26px;z-index:9');
  const tg=[0,1,2];
  for(const i of tg){await anim(300,u=>{cr.style.left=(parseFloat(cr.style.left)+(CL(i)+26-parseFloat(cr.style.left))*ease(u))+'px'});R['av'+i].style.transform='scale(1.3)';tone(520+i*80,.1,'sine',.14,640+i*80);await wait(420);R['av'+i].style.transform=''}
  R.av2.style.transform='scale(1.35)';await wait(500);
  sWhoosh();
  await mv(mal,CL(2)+20,62,520,36);
  sThud();bigFx('💥',CL(2)+36,70,'#fff','boom');cr.remove();R.av2.style.transform='';
  await shake(R.av2);R.av2.textContent='🤒';
  await anim(500,u=>{v.style.opacity=1-u;v.style.transform='scale('+(1-u*.4)+')'});v.remove();
  pill('🦠 HERPÈS',CL(2)+10,114);
  lab('<b>Marc</b> subit le malus à sa place');
  await wait(1700);
};

tabs();

return {SC:typeof SC==="undefined"?null:SC,run:typeof run==="undefined"?null:run};};
const NS='http://www.w3.org/2000/svg';
const ease=u=>1-Math.pow(1-u,3),easeIn=u=>u*u*u;
const REG={};
const addReg=(fam,names)=>names.forEach(n=>REG[n]={fam,n});
addReg('sp',['partouze','echang','trafic','exhum','bourreau','marifor']);
addReg('ml',['fin','hemo','herpes','over','sextape']);
addReg('aq',['promo','maison','tourisme','drogue']);
addReg('pm',['exhib','ampu','ster','capote','poly','zoo','sado']);
addReg('tv',['tsunami','veng']);

const FRM={};
const BASECSS=`
.vsxw{position:fixed;left:50%;top:50%;z-index:9500;pointer-events:auto;cursor:pointer;filter:drop-shadow(0 18px 40px #000c);opacity:0;transition:opacity .22s}
.vsxw.on{opacity:1}
.vsx{position:relative;width:306px;height:220px;font-family:'Trebuchet MS',Arial,sans-serif;color:#efece6;line-height:1.4}
.vsxw .vsx .win{position:relative;left:0;top:0;transform:none;margin:0;box-sizing:content-box;width:300px;height:214px;border-radius:16px;overflow:hidden;border:3px solid #8a5cd6;background:#171020}
.vsxw .vsx .vsxhid{display:none}
.vsx *{box-sizing:border-box}
.vsx .win{box-sizing:content-box}
.vsxav{display:inline-block;width:26px;height:26px;border-radius:50%;object-fit:cover;background:#6b3fb8;color:#fff;font:900 14px/26px 'Trebuchet MS',Arial,sans-serif;text-align:center;vertical-align:middle}
.vsxav.ph{background:#3a2c4e;color:#8d7fa8;opacity:.6}
`;
let cssIn=false;
function ensureCss(){if(cssIn)return;cssIn=true;const s=document.createElement('style');s.id='vsxCss';s.textContent=BASECSS+".vsx-tv .win{box-sizing:content-box;position:absolute;left:247px;top:125px;width:300px;height:214px;border-radius:16px;overflow:hidden;border:3px solid #8a5cd6;background:#171020;box-shadow:0 12px 40px #000c}\n.vsx-tv .win>*{position:absolute}\n.vsx-tv .win.shake{animation:vsx-sh .5s}\n@keyframes vsx-sh{0%,100%{transform:translate(0)}15%{transform:translate(-7px,4px)}35%{transform:translate(6px,-4px)}55%{transform:translate(-5px,3px)}75%{transform:translate(3px,-2px)}}\n.vsx-tv .mc{width:34px;height:48px;border-radius:5px;border:2px solid #14111a;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:18px;line-height:1;gap:1px}\n.vsx-tv .mc small{font-size:6.5px;font-weight:900;text-align:center;line-height:1.05;max-width:32px;color:#1a1a1a}\n.vsx-tv .mc.back{background:repeating-linear-gradient(45deg,#5a3d8a 0 6px,#3f2a66 6px 12px)}\n.vsx-tv .mc.front{background:#fff6e4;color:#1a1a1a}\n.vsx-tv .mc.mal{background:#ffe2e0;border-color:#c0262f}\n.vsx-tv .win{transform:scale(1.15)}\n.vsx-tv .a{position:absolute}\n.vsx-tv .lab{position:absolute;left:0;right:0;bottom:4px;text-align:center;font-size:11px;font-weight:900;color:#efe6ff;z-index:9;text-shadow:0 1px 2px #000;padding:0 6px}\n.vsx-tv .lab b{color:#ffd25a}\n.vsx-tv .hd{position:absolute;left:0;right:0;top:0;height:15px;z-index:8;font-size:9px;font-weight:900;letter-spacing:.08em;text-align:center;line-height:15px;color:#fff;text-shadow:0 1px 2px #000a}\n.vsx-tv .hd.spe{background:#6b3fb8}\n.vsx-tv .hd.mal{background:#b8262e}\n.vsx-tv .hd.acq{background:#2f8a4e}\n.vsx-tv .hd.job{background:#2a6fd6}\n.vsx-tv .hd.tres{background:#a67c1c}\n.vsx-tv .mc.a{position:absolute;font-size:18px}\n.vsx-tv .mc.job{background:#dfeaff}\n.vsx-tv .mc.perm.bad{border-color:#e0342d;box-shadow:0 0 9px #e0342d99}\n.vsx-tv .sm{position:absolute;width:22px;height:32px;border-radius:4px;border:2px solid #14111a;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;line-height:1;gap:1px;background:#fff6e4;color:#1a1a1a}\n.vsx-tv .sm small{font-size:7px;font-weight:900}\n.vsx-tv .sm.back{background:repeating-linear-gradient(45deg,#5a3d8a 0 5px,#3f2a66 5px 10px)}\n.vsx-tv .sm.flirt{background:#ffe0ec}\n.vsx-tv .sm.dirty{background:#17140f;color:#f2c14e;border-color:#8a6d1c}\n.vsx-tv .sm.ghost{filter:grayscale(1) brightness(.6)}\n.vsx-tv .av{position:absolute;width:75px;text-align:center;font-size:22px;top:17px}\n.vsx-tv .nm{position:absolute;width:75px;text-align:center;font-size:9px;font-weight:900;top:45px;color:#cbbfe6}\n.vsx-tv .big{position:absolute;font-size:30px;z-index:7;text-align:center;width:50px}\n.vsx-tv .pill{position:absolute;z-index:6;height:14px;border-radius:7px;background:#2d2140;border:1.5px solid #d6a53a;color:#ffd25a;font-size:9px;font-weight:900;text-align:center;line-height:11px;padding:0 5px;white-space:nowrap}\n.vsx-tv .zn{position:absolute;border:2px dashed #6b5a8a;border-radius:8px;font-size:8px;font-weight:900;color:#a898c8;letter-spacing:.08em;padding:2px 5px}";document.head.appendChild(s)}
let cur=null;
function nmFor(cast){
  const m={'Léa':cast[0].n,'Zoé':cast[1].n,'Marc':cast[2].n,'Toi':cast[3].n,'toi':cast[3].n,'🧑‍🎤':cast[0].a,'👩‍🦰':cast[1].a,'🧔':cast[2].a,'🙂':cast[3].a};
  const re=/(^|[^\wÀ-ÿ])(Léa|Zoé|Marc|Toi|toi)(?![\wÀ-ÿ])|🧑‍🎤|👩‍🦰|🧔|🙂/g;
  return t=>String(t).replace(re,(x,p,w)=>w?p+m[w]:m[x]);
}
function mkH(root,o){
  const SP=o.speed||1;let skipped=false;
  const $=s=>root.querySelector(s.replace(/#(\w+)/g,'[data-i="$1"]'));
  const H={$,qa:s=>root.querySelectorAll(s),byId:id=>root.querySelector('[data-i="'+id+'"]'),NS,RM:false,ease,easeIn,
    P:[['🧑‍🎤','Léa'],['👩‍🦰','Zoé'],['🧔','Marc'],['🙂','Toi']],
    data:o.data||{},
    skip(){skipped=true},
    wait:ms=>new Promise(r=>setTimeout(r,skipped?0:ms*SP)),
    anim:(ms,fn)=>new Promise(r=>{if(skipped){try{fn(1)}catch(e){}return r()}const t0=performance.now(),d=Math.max(16,ms*SP);(function f(t){if(skipped){try{fn(1)}catch(e){}return r()}const u=Math.max(0,Math.min(1,(t-t0)/d));fn(u);u<1?requestAnimationFrame(f):r()})(t0)}),
    mk:(t,at,p)=>{const e=document.createElementNS(NS,t);for(const k in at)e.setAttribute(k,at[k]);if(p)p.appendChild(e);return e},
    tone(){},noise(){},sFlip(){},sWhoosh(){},sDraw(){},sThud(){}};
  H.nm=nmFor(o.cast);
  H.el=(cls,html,p,st)=>{const d=document.createElement('div');d.className=cls||'';if(html)d.innerHTML=H.nm(html);if(st)d.style.cssText=st;(p||$('#win')).appendChild(d);return d};
  return H;
}
function stop(){if(cur){cur.H.skip();cur=null}}

async function playFrame(kind,o){
  const F=FRM[o.fr];if(!F)return;
  ensureCss();stop();
  const SP=o.speed||1,nm=nmFor(o.cast);
  const doc='<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;overflow:hidden;background:transparent!important}*{box-sizing:border-box}'+F.css+
   '\nbody{padding:0!important;margin:0!important;background:transparent!important}.stage{border:0!important;border-radius:0!important;width:100%!important;position:relative!important;left:auto!important;top:auto!important;box-shadow:none!important;margin:0!important}.vsxav{display:inline-block;width:1.15em;height:1.15em;border-radius:50%;object-fit:cover;background:#6b3fb8;color:#fff;font:900 .8em/1.15em Trebuchet MS,Arial,sans-serif;text-align:center;vertical-align:middle}.vsxav.ph{background:#3a2c4e;color:#8d7fa8;opacity:.6}</style>'+
   '<div class="stage" id="stage">'+nm(F.body)+'</div><script>window.SPD='+SP+';window.__ARG='+JSON.stringify(o.arg||{}).replace(/</g,'\\u003c')+';<\/script><script>'+nm(F.js)+'<\/script><script>'+F.boot+'<\/script>';
  const wrap=document.createElement('div');wrap.className='vsxw';
  const fr=document.createElement('iframe');fr.setAttribute('aria-hidden','true');fr.style.cssText='display:block;width:100%;border:3px solid #8a5cd6;border-radius:16px;background:#171020;pointer-events:none;box-sizing:content-box';
  wrap.appendChild(fr);
  const vw=window.innerWidth,vh=window.innerHeight,desk=vw>=1000&&vh>=520;
  let wt=desk?Math.max(340,Math.min(700,vw*.37)):Math.min(vw*.94,430);
  wt*=o.big?1.15:1;
  wt=Math.min(wt,vh*.8*F.w/F.h);
  wrap.style.width=(wt+6)+'px';wrap.style.transform='translate(-50%,-50%)';
  fr.style.height=(wt*F.h/F.w)+'px';
  document.body.appendChild(wrap);
  let skipped=false;const me={H:{skip(){skipped=true;try{fr.contentWindow.SPD=.01}catch(e){}}},wrap};cur=me;
  wrap.addEventListener('click',()=>me.H.skip());
  fr.srcdoc=doc;
  await new Promise(r=>{fr.onload=r;setTimeout(r,3000)});
  requestAnimationFrame(()=>wrap.classList.add('on'));
  try{
    await new Promise(r=>setTimeout(r,skipped?0:250*SP));
    const w=fr.contentWindow;if(skipped)w.SPD=.01;
    await Promise.race([w.__vsx.go(),new Promise(r=>setTimeout(r,45000))]);
    await new Promise(r=>setTimeout(r,skipped?0:(o.hold==null?600:o.hold)*SP));
  }catch(e){console.error('scene',kind,e)}
  wrap.classList.remove('on');
  await new Promise(r=>setTimeout(r,230));
  wrap.remove();if(cur===me)cur=null;
}
async function play(kind,o){
  const m=REG[kind];if(!m)return;
  if(m.fam==='fr')return playFrame(kind,o);
  if(!FAM[m.fam])return;
  ensureCss();stop();
  const wrap=document.createElement('div');wrap.className='vsxw';
  wrap.innerHTML='<div class="vsx vsx-'+m.fam+'"><div class="win" data-i="win"><div data-i="sc" style="inset:0"></div></div><div class="vsxhid"><div data-i="msg"></div><button data-i="go"></button><button data-i="go2"></button><button data-i="zoom"></button><input type="checkbox" data-i="snd"></div></div>';
  const vw=window.innerWidth,vh=window.innerHeight,desk=vw>=1000&&vh>=520;
  let wt=desk?Math.max(340,Math.min(700,vw*.37)):Math.min(vw*.94,430);
  wt*=o.big?1.15:1;
  let k=wt/306;k=Math.min(k,vh*.8/220);
  wrap.style.transform='translate(-50%,-50%) scale('+k+')';
  document.body.appendChild(wrap);
  const root=wrap.firstChild,H=mkH(root,o),me={H,wrap};cur=me;
  const tap=()=>H.skip();wrap.addEventListener('click',tap);
  requestAnimationFrame(()=>wrap.classList.add('on'));
  try{
    const R=FAM[m.fam](H);
    await H.wait(150);
    if(R.SC&&R.SC[m.n])await R.SC[m.n]();
    else if(R.run)await R.run(o.arg);
    await H.wait(o.hold==null?500:o.hold);
  }catch(e){console.error('scene',kind,e)}
  wrap.classList.remove('on');
  await new Promise(r=>setTimeout(r,230));
  wrap.remove();if(cur===me)cur=null;
}
window.VSCN={play,stop,has:k=>!!REG[k],kinds:()=>Object.keys(REG)};

})();/* === Ma Vie : effets courts joués directement sur les vraies cartes (extension Trash) === */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
let SPD=1,cur=null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms*SPD));
const A=(el,kf,o={})=>{const a=el.animate(kf,{fill:'forwards',...o,duration:(o.duration||300)*SPD,delay:(o.delay||0)*SPD});return a.finished.catch(()=>{})};
function mk(tag,cls,p,css,html){const e=document.createElement(tag);if(cls)e.className=cls;if(css)e.style.cssText=css;if(html!=null)e.innerHTML=html;p.appendChild(e);return e}
const ICO={
 heart:'<svg viewBox="0 0 24 24"><path d="M12 21C5 15 2 11 2 7.5A5 5 0 0 1 12 6a5 5 0 0 1 10 1.5C22 11 19 15 12 21Z" fill="#ff4f86" stroke="#7a1740" stroke-width="1.6"/><path d="M6 8a3 3 0 0 1 3-2" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
 coin:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#f5c84a" stroke="#8a6410" stroke-width="1.8"/><circle cx="12" cy="12" r="7" fill="#e8b32e" stroke="#c99a1e" stroke-width="1.4"/><path d="M8.5 9a5 5 0 0 1 4-2" stroke="#fff" stroke-opacity=".8" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>',
 drop:'<svg viewBox="0 0 24 24"><path d="M12 2S4 11 4 16a8 8 0 0 0 16 0C20 11 12 2 12 2Z" fill="#d6232a" stroke="#6a0d12" stroke-width="1.6"/><path d="M8 15a4 4 0 0 0 3 4" stroke="#fff" stroke-opacity=".5" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>',
 pill:'<svg viewBox="0 0 24 24"><g transform="rotate(-40 12 12)"><rect x="2" y="7" width="20" height="10" rx="5" fill="#fff" stroke="#14111a" stroke-width="1.6"/><path d="M12 7h5a5 5 0 0 1 0 10h-5Z" fill="#e0342d" stroke="#14111a" stroke-width="1.6"/></g></svg>',
 spark:'<svg viewBox="0 0 24 24"><path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6Z" fill="#fff6b0" stroke="#e0a82a" stroke-width="1.2"/></svg>',
 flame:'<svg viewBox="0 0 24 24"><path d="M12 2c1 5 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 3-7 1 1 1 2 2 2 1-2 1-4 1-7Z" fill="#ff7a1a" stroke="#8a2a0a" stroke-width="1.4"/><path d="M12 12c2 2 3 3 3 5a3 3 0 0 1-6 0c0-2 2-3 3-5Z" fill="#ffd24a"/></svg>',
 shard:'<svg viewBox="0 0 24 24"><path d="M4 20L12 3l8 17-8-4Z" fill="#9aa0aa" stroke="#3a3d44" stroke-width="1.4"/></svg>',
 cam:'<svg viewBox="0 0 32 24"><rect x="2" y="6" width="28" height="16" rx="3" fill="#2b2f36" stroke="#e7e9ee" stroke-width="1.8"/><rect x="10" y="2" width="9" height="5" rx="1.5" fill="#e7e9ee"/><circle cx="16" cy="14" r="5.5" fill="#6aa8ff" stroke="#e7e9ee" stroke-width="1.8"/><circle cx="14.5" cy="12.5" r="1.6" fill="#fff"/></svg>',
 skull:'<svg viewBox="0 0 32 36"><path d="M16 2C8 2 3 8 3 15c0 5 2 8 5 10v6h16v-6c3-2 5-5 5-10C29 8 24 2 16 2Z" fill="#f3efe6" stroke="#14111a" stroke-width="2"/><ellipse cx="11" cy="16" rx="3.6" ry="4.4" fill="#14111a"/><ellipse cx="21" cy="16" rx="3.6" ry="4.4" fill="#14111a"/><path d="M16 21l-2 4h4Z" fill="#14111a"/><path d="M11 29v-3M16 29v-3M21 29v-3" stroke="#14111a" stroke-width="2"/></svg>',
 ban:'<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="25" fill="none" stroke="#e0342d" stroke-width="7"/><path d="M12 48L48 12" stroke="#e0342d" stroke-width="7" stroke-linecap="round"/></svg>',
 bio:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#8fe04a" stroke="#2a5a12" stroke-width="1.6"/><g stroke="#2a5a12" stroke-width="1.8" stroke-linecap="round"><path d="M12 7V3M12 17v4M7 12H3M17 12h4M8.5 8.5L5.5 5.5M15.5 15.5l3 3M15.5 8.5l3-3M8.5 15.5l-3 3"/></g></svg>'
};
function ico(f,k,x,y,sz,css){return mk('span','x-ico',f,`left:${x-sz/2}px;top:${y-sz/2}px;width:${sz}px;height:${sz}px;${css||''}`,ICO[k])}
const flash=(f,col='#fff',o=.85,ms=260)=>A(mk('div','',f,'inset:0;background:'+col),[{opacity:o},{opacity:0}],{duration:ms});
const shake=(c,a=7,ms=320,comp)=>A(c,[{transform:'translate(0,0)'},{transform:`translate(${-a}px,${a*.4}px) rotate(-1.5deg)`,offset:.2},{transform:`translate(${a}px,${-a*.4}px) rotate(1.5deg)`,offset:.45},{transform:`translate(${-a*.5}px,0)`,offset:.7},{transform:'translate(0,0)'}],comp?{duration:ms,composite:'add'}:{duration:ms});
function burst(f,x,y,list,n,dist,ms=800,sz=20){
  const ps=[];for(let i=0;i<n;i++){const e=ico(f,list[i%list.length],x,y,sz);const a=Math.PI*2*i/n+Math.random()*.6,d=dist*(.6+Math.random()*.6);
    ps.push(A(e,[{transform:'translate(0,0) scale(.3)',opacity:1},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d+18}px) scale(1.1) rotate(${(Math.random()-.5)*160}deg)`,opacity:0}],{duration:ms,easing:'cubic-bezier(.2,.7,.3,1)',delay:Math.random()*80}))}
  return Promise.all(ps)}
const glow=(c,col,o=.9)=>A(c,[{filter:'drop-shadow(0 0 0 '+col+'00)'},{filter:'drop-shadow(0 0 14px '+col+')'}],{duration:480});

const FX={
 /* Prise d'otages : les barreaux tombent sur la carte */
 prison:async(c,f)=>{
  const xs=[0,1,2,3,4,5,6].map(i=>46+i*21);
  const bars=xs.map(x=>mk('div','x-bar8',f,`left:${x}px`));
  await Promise.all(bars.map((b,i)=>A(b,[{transform:'translateY(-110%)'},{transform:'translateY(0)',offset:.72},{transform:'translateY(-3%)',offset:.86},{transform:'translateY(0)'}],{duration:360,delay:i*30,easing:'cubic-bezier(.55,0,.9,.55)'})));
  flash(f,'#cfe2ff',.35,200);shake(c,5,260);
  const cb=[100,176].map(y=>mk('div','',f,`left:40px;top:${y}px;height:8px;width:0;border-radius:4px;background:linear-gradient(#d9dde3,#6a707a);border:1.5px solid #14131a`));
  await Promise.all(cb.map((b,i)=>A(b,[{width:'0px'},{width:'140px'}],{duration:200,delay:i*70})));
  await sleep(180);
  await Promise.all(bars.concat(cb).map(b=>A(b,[{opacity:1},{opacity:0}],{duration:160})))},
 /* Poupée vaudou : la poupée sort de la carte, les aiguilles s'y plantent, elle rentre */
 vaudou:async(c,f)=>{
  const DOLL='<svg viewBox="0 0 60 100" width="96" height="160"><g stroke="#3d2610" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M17 34 L6 58 L13 62 L24 44Z" fill="#d9b27c"/><path d="M43 34 L54 58 L47 62 L36 44Z" fill="#d9b27c"/><path d="M20 70 L16 96 L27 96 L30 74Z" fill="#d9b27c"/><path d="M40 70 L44 96 L33 96 L30 74Z" fill="#d9b27c"/><path d="M17 32 Q30 28 43 32 L45 72 Q30 78 15 72Z" fill="#e6c590"/><circle cx="30" cy="18" r="14" fill="#e6c590"/><path d="M18 8 L16 1 M24 5 L23 -2 M31 4 L32 -3 M38 6 L41 0" fill="none"/></g><g stroke="#3d2610" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M30 33V72" stroke-dasharray="3 3"/><path d="M22 48 L26 52 M26 48 L22 52" /><path d="M24 25 Q30 29 36 25 M26 27v3 M30 28v3 M34 27v3"/></g><g fill="#2a1810" stroke="#fff6e0" stroke-width="1.4"><circle cx="24" cy="15" r="3.4"/><circle cx="36" cy="15" r="3.4"/></g><path d="M24 15h0M36 15h0" stroke="#fff" stroke-width="1"/></svg>';
  const glowd=mk('div','',f,'left:20px;top:30px;width:180px;height:200px;border-radius:50%;background:radial-gradient(#b07cff99,#8a5cd600 70%);opacity:0');
  const dollW=mk('div','',f,'left:62px;top:48px;width:96px;height:160px;opacity:0;transform-origin:50% 60%',DOLL);
  A(c,[{filter:'none'},{filter:'brightness(.45)'}],{duration:300});
  A(glowd,[{opacity:0},{opacity:1}],{duration:300});
  await A(dollW,[{transform:'translateY(-10px) scale(.3) rotate(-8deg)',opacity:0},{transform:'translateY(0) scale(1.06) rotate(3deg)',opacity:1,offset:.75},{transform:'translateY(0) scale(1) rotate(0)',opacity:1}],{duration:300,easing:'cubic-bezier(.2,.9,.3,1)'});
  const T=[[30,15,-60,'#e0342d'],[30,46,40,'#ffd84a'],[12,48,-70,'#4aa3ff'],[48,48,65,'#6fc28a'],[24,80,-35,'#e86bd0']];
  for(const [dx,dy,r,col] of T){
   const x=62+dx*1.6,y=48+dy*1.6;
   const p=mk('div','',f,`left:${x}px;top:${y}px;width:0;height:0;transform:rotate(${r}deg)`);
   mk('div','',p,'left:-2.5px;top:-52px;width:5px;height:52px;border-radius:3px;background:linear-gradient(90deg,#aaa,#fff,#999)');
   mk('div','',p,`left:-7px;top:-62px;width:14px;height:14px;border-radius:50%;background:${col};border:2px solid #14111a`);
   A(p,[{transform:`rotate(${r}deg) translateY(-90px)`,opacity:0},{transform:`rotate(${r}deg) translateY(-3px)`,opacity:1,offset:.8},{transform:`rotate(${r}deg) translateY(0)`,opacity:1}],{duration:150,easing:'cubic-bezier(.6,0,.9,.6)'});
   await sleep(110);
   A(dollW,[{transform:'translate(0,0) rotate(0)'},{transform:'translate(-4px,0) rotate(-3deg)',offset:.35},{transform:'translate(3px,0) rotate(2deg)',offset:.7},{transform:'translate(0,0) rotate(0)'}],{duration:150});
   burst(f,x,y,['spark'],4,20,260,9);await sleep(20)}
  await sleep(60);
  await Promise.all([A(dollW,[{transform:'scale(1)',opacity:1},{transform:'translateY(-10px) scale(.3)',opacity:0}],{duration:240,easing:'ease-in'}),A(glowd,[{opacity:1},{opacity:0}],{duration:240})].concat(Array.from(f.children).filter(e=>e!==dollW&&e!==glowd&&e.style.transform&&e.style.transform.indexOf('rotate')>=0).map(e=>A(e,[{opacity:1},{opacity:0}],{duration:200}))));
  await A(c,[{filter:'brightness(.45)'},{filter:'none'}],{duration:200})},
 /* Amputation : une entaille, la carte se coupe en deux */
 ampu:async(c,f)=>{
  const sl=mk('div','',f,'left:14px;top:150px;width:0;height:4px;border-radius:2px;background:#fff;box-shadow:0 0 12px 3px #fff;transform-origin:0 50%;transform:rotate(-52deg)');
  await A(sl,[{width:'0px'},{width:'250px'}],{duration:150,easing:'ease-in'});
  flash(f,'#fff',.7,160);
  const mkHalf=clip=>{const h=c.cloneNode(true);h.style.clipPath=clip;f.appendChild(h);h.style.pointerEvents='none';return h};
  const a=mkHalf('polygon(0 0,100% 0,0 100%)'),b=mkHalf('polygon(100% 0,100% 100%,0 100%)');
  c.style.visibility='hidden';sl.style.opacity=0;
  A(a,[{transform:'translate(0,0) rotate(0)'},{transform:'translate(-12px,-10px) rotate(-6deg)'}],{duration:260,easing:'ease-out'});
  await A(b,[{transform:'translate(0,0) rotate(0)'},{transform:'translate(12px,12px) rotate(7deg)'}],{duration:260,easing:'ease-out'});
  burst(f,110,135,['drop'],8,50,500,13);
  await sleep(240);
  A(b,[{transform:'translate(12px,12px) rotate(7deg)',opacity:1},{transform:'translate(18px,70px) rotate(14deg)',opacity:0}],{duration:280,easing:'ease-in'});
  await A(a,[{transform:'translate(-12px,-10px) rotate(-6deg)',opacity:1},{transform:'translate(-20px,50px) rotate(-12deg)',opacity:0}],{duration:280,easing:'ease-in'});
  c.style.visibility='';await A(c,[{opacity:0},{opacity:1}],{duration:200})},
 /* Hémorragie : le sang coule le long de la carte */
 hemo:async(c,f)=>{
  const tint=mk('div','',f,'left:48px;top:46px;width:124px;height:178px;border-radius:12px;background:linear-gradient(#e0342d00,#c0262faa)');A(tint,[{opacity:0},{opacity:1}],{duration:600});
  const xs=[58,76,96,114,134,152];
  const ds=xs.map((x,i)=>{const d=mk('div','',f,`left:${x}px;top:50px;width:9px;height:0;border-radius:0 0 6px 6px;background:linear-gradient(#a8141c,#e0342d)`);
    mk('div','',d,'left:-1px;bottom:-5px;width:11px;height:11px;border-radius:50%;background:#e0342d');
    return A(d,[{height:'0px'},{height:(56+((i*37)%80))+'px'}],{duration:640,delay:i*60,easing:'cubic-bezier(.4,.1,.6,1)'})});
  shake(c,2,500);await Promise.all(ds);await sleep(200)},
 /* Herpès : des taches vertes se propagent */
 herpes:async(c,f)=>{
  const pts=[[84,92],[134,84],[100,132],[150,136],[76,176],[122,178],[96,208],[154,192],[62,134]];
  A(c,[{filter:'none'},{filter:'hue-rotate(70deg) saturate(1.3)'}],{duration:650});
  for(const [x,y] of pts){const s=mk('div','',f,`left:${x-13}px;top:${y-13}px;width:26px;height:26px;border-radius:50%;background:radial-gradient(#b6ff6a,#4fae2a 65%,#2a6a1a);border:2px solid #1d4a12`);
   A(s,[{transform:'scale(0)'},{transform:'scale(1.25)',offset:.6},{transform:'scale(1)'}],{duration:220});await sleep(50)}
  burst(f,110,135,['bio'],6,70,600,18);await sleep(400)},
 /* Overdose : une seringue se vide dans la carte, elle vibre, puis l'électrocardiogramme devient plat */
 over:async(c,f)=>{
  const sy=mk('div','',f,'left:122px;top:134px;width:0;height:0;transform:rotate(-50deg) translateX(150px);opacity:0');
  mk('div','',sy,'left:-4px;top:-1.5px;width:38px;height:3px;background:linear-gradient(#e7e9ee,#8a8f99);border-radius:2px');
  mk('div','',sy,'left:32px;top:-10px;width:6px;height:20px;background:#cfd3da;border:1.5px solid #2b2f36;border-radius:2px');
  const barrel=mk('div','',sy,'left:38px;top:-11px;width:80px;height:22px;border:2px solid #e7e9ee;border-radius:4px;background:#1d2330;overflow:hidden');
  const liq=mk('div','',barrel,'left:0;top:0;bottom:0;width:100%;background:linear-gradient(90deg,#ff4ad0,#b34aff);transform-origin:0 50%');
  mk('div','',barrel,'left:0;top:0;bottom:0;right:0;background:repeating-linear-gradient(90deg,#fff0 0 9px,#fff9 9px 10px)');
  const rod=mk('div','',sy,'left:118px;top:-2px;width:36px;height:4px;background:#cfd3da;border-radius:2px');
  mk('div','',rod,'right:-3px;top:-7px;width:6px;height:18px;background:#e7e9ee;border:1.5px solid #2b2f36;border-radius:3px');
  await A(sy,[{transform:'rotate(-50deg) translateX(150px)',opacity:0},{transform:'rotate(-50deg) translateX(0)',opacity:1}],{duration:200,easing:'cubic-bezier(.5,0,.8,.5)'});
  shake(c,3,120);
  A(liq,[{transform:'scaleX(1)'},{transform:'scaleX(.08)'}],{duration:260,easing:'linear'});
  A(rod,[{transform:'translateX(0)'},{transform:'translateX(-34px)'}],{duration:260,easing:'linear'});
  A(c,[{filter:'hue-rotate(0) saturate(1)'},{filter:'hue-rotate(120deg) saturate(2.2)',offset:.3},{filter:'hue-rotate(260deg) saturate(2.6)',offset:.6},{filter:'hue-rotate(360deg) saturate(2)'}],{duration:520});
  await sleep(260);
  A(sy,[{opacity:1},{opacity:0,transform:'rotate(-50deg) translateX(40px)'}],{duration:160});
  /* la carte vibre */
  const g1=c.cloneNode(true),g2=c.cloneNode(true);[g1,g2].forEach((g,i)=>{g.style.cssText='pointer-events:none;mix-blend-mode:screen;opacity:.7;filter:'+(i?'hue-rotate(160deg) saturate(3)':'hue-rotate(-60deg) saturate(3)');f.appendChild(g)});
  A(g1,[{transform:'translate(-5px,0)'},{transform:'translate(4px,2px)'},{transform:'translate(-6px,-1px)'},{transform:'translate(3px,0)'},{transform:'translate(-5px,0)'}],{duration:300,iterations:2});
  A(g2,[{transform:'translate(5px,0)'},{transform:'translate(-4px,-2px)'},{transform:'translate(6px,1px)'},{transform:'translate(-3px,0)'},{transform:'translate(5px,0)'}],{duration:300,iterations:2});
  await A(c,[{transform:'translate(0,0) rotate(0)'},{transform:'translate(-3px,2px) rotate(-2deg)'},{transform:'translate(3px,-1px) rotate(2deg)'},{transform:'translate(-2px,1px) rotate(-1.5deg)'},{transform:'translate(0,0) rotate(0)'}],{duration:300,iterations:2});
  g1.remove();g2.remove();
  /* électrocardiogramme : deux battements puis la ligne plate */
  const band=mk('div','',f,'left:0;top:92px;width:220px;height:82px;background:linear-gradient(#0000,#000c 30%,#000c 70%,#0000)');A(band,[{opacity:0},{opacity:1}],{duration:100});
  const ec=mk('div','',f,'left:0;top:104px;width:220px;height:60px');
  ec.innerHTML='<svg viewBox="0 0 220 60" width="220" height="60"><path pathLength="1" d="M0 30H34L40 30L46 8L53 52L59 30H88L94 30L100 12L106 46L111 30H136L142 30L147 22L151 36L155 30H220" fill="none" stroke="#6bff9a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 4px #6bff9a)" stroke-dasharray="1" stroke-dashoffset="1"/></svg>';
  const path=ec.querySelector('path');
  await A(path,[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:520,easing:'linear'});
  A(c,[{transform:'rotate(0) translateY(0)',filter:'none'},{transform:'rotate(6deg) translateY(10px)',filter:'grayscale(.8) brightness(.7)'}],{duration:200});
  await sleep(260);
  await Promise.all([A(band,[{opacity:1},{opacity:0}],{duration:200}),A(ec,[{opacity:1},{opacity:0}],{duration:200}),A(c,[{transform:'rotate(6deg) translateY(10px)',filter:'grayscale(.8) brightness(.7)'},{transform:'rotate(0) translateY(0)',filter:'none'}],{duration:200})])},
 /* Mine : explosion */
 mine:async(c,f)=>{
  await sleep(180);
  flash(f,'#fff',1,200);shake(c,12,420);
  const ring=mk('div','',f,'left:60px;top:85px;width:100px;height:100px;border-radius:50%;border:6px solid #ffd27a');A(ring,[{transform:'scale(.1)',opacity:1},{transform:'scale(3)',opacity:0}],{duration:520,easing:'ease-out'});
  const fb=mk('div','',f,'left:50px;top:75px;width:120px;height:120px;border-radius:50%;background:radial-gradient(#fff,#ffd24a 30%,#ff6a1a 60%,#ff6a1a00 72%)');A(fb,[{transform:'scale(.2)',opacity:1},{transform:'scale(1.9)',opacity:0}],{duration:520,easing:'ease-out'});
  A(c,[{filter:'none'},{filter:'brightness(.55) sepia(.6)'}],{duration:500});
  await burst(f,110,135,['flame','spark','flame'],12,100,700,22);await sleep(120)},
 /* Chasse : le viseur se cale et tire */
 chasse:async(c,f)=>{
  const cx=mk('div','',f,'left:70px;top:95px;width:80px;height:80px;opacity:0');
  cx.innerHTML='<svg viewBox="-40 -40 80 80" width="80" height="80" fill="none" stroke="#ff4a3d" stroke-width="3"><circle r="26"/><path d="M0-38V-12M0 12V38M-38 0H-12M12 0H38" stroke-linecap="round"/><circle r="2.5" fill="#ff4a3d"/></svg>';
  await A(cx,[{opacity:0,transform:'translate(-70px,-60px) scale(1.5)'},{opacity:1,transform:'translate(50px,30px) scale(1.3)',offset:.35},{opacity:1,transform:'translate(-30px,40px) scale(1.15)',offset:.6},{opacity:1,transform:'translate(0,0) scale(1)'}],{duration:500,easing:'ease-in-out'});
  await A(cx,[{transform:'scale(1)'},{transform:'scale(.82)'}],{duration:110});
  flash(f,'#fff',.7,110);shake(c,6,260);
  const h=mk('div','',f,'left:100px;top:126px;width:20px;height:20px;border-radius:50%;background:#14070a;box-shadow:0 0 0 3px #3a1a1a');A(h,[{transform:'scale(0)'},{transform:'scale(1)'}],{duration:100});
  await sleep(320);await A(cx,[{opacity:1},{opacity:0}],{duration:200})},
 /* Exhibition et Sextape : les flashs d'appareil photo */
 exhib:async(c,f)=>{
  const spots=[[34,60],[186,92],[40,214],[182,222]];
  for(let i=0;i<5;i++){flash(f,'#fff',.95,170);const s=spots[i%4];const cam=ico(f,'cam',s[0],s[1],34);A(cam,[{transform:'scale(.2)',opacity:1},{transform:'scale(1.15)',opacity:1,offset:.5},{transform:'scale(1)',opacity:0}],{duration:360});
   A(c,[{transform:'scale(1)'},{transform:'scale(1.04)'},{transform:'scale(1)'}],{duration:170});await sleep(150)}
  await sleep(200)},
 /* Extorsion capitaliste : une pluie de pièces dorées */
 cap:async(c,f)=>{
  const sh=mk('div','',f,'left:48px;top:46px;width:124px;height:178px;border-radius:12px;background:linear-gradient(105deg,#fff0 30%,#ffe9a0cc 50%,#fff0 70%);transform:translateX(-130px)');A(sh,[{transform:'translateX(-130px)'},{transform:'translateX(130px)'}],{duration:800});
  glow(c,'#ffd24a');
  const cs=[];for(let i=0;i<16;i++){const x=10+Math.random()*190,e=ico(f,'coin',x,-14,20+(i%3)*5);cs.push(A(e,[{transform:'translateY(0) rotate(0)'},{transform:`translateY(300px) rotate(${i%2?540:-540}deg)`}],{duration:560,delay:i*28,easing:'cubic-bezier(.4,0,.9,.6)'}))}
  await Promise.all(cs);await sleep(100)},
 /* Extorsion communiste : tout est ramené au milieu puis redistribué à parts égales */
 commu:async(c,f)=>{
  const band=mk('div','',f,'inset:0;background:linear-gradient(90deg,#d6232a00,#d6232acc 50%,#d6232a00);transform:translateX(-100%)');A(band,[{transform:'translateX(-100%)'},{transform:'translateX(100%)'}],{duration:560});
  A(c,[{filter:'none'},{filter:'sepia(1) saturate(4) hue-rotate(-30deg)'}],{duration:420});
  const out=[];for(let i=0;i<8;i++){const dir=i%2?1:-1;const e=ico(f,'coin',110,135,22);out.push(A(e,[{transform:'translate(0,0) scale(.3)',opacity:0},{transform:`translate(${dir*(34+Math.floor(i/2)*24)}px,${-60-(i%4)*8}px) scale(1)`,opacity:1,offset:.6},{transform:`translate(${dir*(44+Math.floor(i/2)*28)}px,${100}px)`,opacity:0}],{duration:760,delay:260+i*30}))}
  await Promise.all(out);await sleep(80)},
 /* Kidnapping et Trafic d'organes : la carte est arrachée hors de l'écran */
 kidnap:async(c,f)=>{
  for(let i=0;i<7;i++){const l=mk('div','',f,`left:${150+i*8}px;top:${70+i*22}px;width:70px;height:3px;border-radius:2px;background:#fff8`);A(l,[{transform:'translateX(30px)',opacity:0},{transform:'translateX(-60px)',opacity:1,offset:.5},{transform:'translateX(-130px)',opacity:0}],{duration:420,delay:200+i*20})}
  await A(c,[{transform:'translate(0,0) rotate(0) scale(1)',opacity:1},{transform:'translate(-14px,0) rotate(-4deg) scale(1.02)',offset:.25,opacity:1},{transform:'translate(240px,-30px) rotate(24deg) scale(.7)',opacity:0}],{duration:560,easing:'cubic-bezier(.5,0,.9,.4)'});
  await sleep(160);c.style.opacity=1;await A(c,[{opacity:0,transform:'scale(.9)'},{opacity:1,transform:'scale(1)'}],{duration:260})},
 /* Fin précoce : un panneau d'interdiction s'abat sur la carte */
 fin:async(c,f)=>{
  const b=ico(f,'ban',110,135,150);
  await A(b,[{transform:'scale(3)',opacity:0},{transform:'scale(1)',opacity:1}],{duration:200,easing:'cubic-bezier(.3,1.4,.6,1)'});
  flash(f,'#ff3a3a',.35,200);shake(c,8,260);
  A(c,[{filter:'none'},{filter:'grayscale(.8) brightness(.8)'}],{duration:300});
  const ln=mk('div','',f,'left:60px;top:120px;width:100px;height:3px;background:#14070a;transform:rotate(-20deg)');A(ln,[{opacity:0},{opacity:.8}],{duration:80});
  await sleep(380);await A(b,[{opacity:1},{opacity:0}],{duration:200})},
 /* Stérilité : un enfant apparaît, puis il est barré et s'effondre */
 ster:async(c,f)=>{
  const kid=mk('div','',f,'left:68px;top:96px;width:84px;height:120px;opacity:0;transform-origin:50% 100%',vieW(80,.38,'tabindex="-1"'));
  const halo=mk('div','',f,'left:40px;top:70px;width:140px;height:170px;border-radius:50%;background:radial-gradient(#9fd0ff99,#9fd0ff00 70%);opacity:0');
  A(halo,[{opacity:0},{opacity:1}],{duration:260});
  await A(kid,[{transform:'translateY(20px) scale(.3)',opacity:0},{transform:'translateY(-8px) scale(1.08)',opacity:1,offset:.75},{transform:'translateY(0) scale(1)',opacity:1}],{duration:280,easing:'cubic-bezier(.2,.9,.3,1)'});
  await sleep(90);
  /* deux traits rouges barrent l'enfant */
  const stroke=(ang,delay)=>{const b=mk('div','',f,`left:110px;top:156px;width:0;height:10px;margin-left:-70px;margin-top:-5px;border-radius:5px;background:#e0342d;border:2px solid #5a0e0e;box-shadow:0 0 10px #e0342d;transform-origin:50% 50%;transform:rotate(${ang}deg)`);return A(b,[{width:'0px'},{width:'150px'}],{duration:110,delay,easing:'ease-in'})};
  await stroke(-52,0);flash(f,'#ff3a3a',.25,160);shake(kid,5,150);
  await stroke(52,0);flash(f,'#ff3a3a',.3,200);shake(kid,7,200);
  A(c,[{filter:'none'},{filter:'grayscale(.8) brightness(.8)'}],{duration:260});
  await sleep(80);
  burst(f,110,170,['shard'],8,60,420,12);
  await Promise.all([A(kid,[{transform:'translateY(0) rotate(0)',opacity:1,filter:'none'},{transform:'translateY(70px) rotate(14deg)',opacity:0,filter:'grayscale(1)'}],{duration:300,easing:'ease-in'}),A(halo,[{opacity:1},{opacity:0}],{duration:260})].concat(Array.from(f.children).filter(e=>e.style.height==='10px').map(e=>A(e,[{opacity:1},{opacity:0}],{duration:260}))));
  await A(c,[{filter:'grayscale(.8) brightness(.8)'},{filter:'none'}],{duration:180})},
 /* Cartes de séduction : une rafale de cœurs */
 love:async(c,f)=>{
  glow(c,'#ff5a8a');A(c,[{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:620});
  await burst(f,110,135,['heart'],14,105,900,22);await sleep(60)},
 /* Exhumation : un cercueil tombe, le couvercle s'ouvre, la carte en sort */
 rise:async(c,f)=>{
  const PT='34,2 66,2 98,50 74,158 26,158 2,50';
  const back=document.createElement('div');back.className='x-coffinback';back.style.cssText='position:absolute;left:35px;top:16px;width:150px;height:240px;opacity:0';
  back.innerHTML=`<svg viewBox="0 0 100 160" width="150" height="240"><polygon points="${PT}" fill="#4a2c16" stroke="#1d0f06" stroke-width="3" stroke-linejoin="round"/><polygon points="34,14 62,14 88,52 68,146 32,146 12,52" fill="#0d0710"/></svg>`;
  c.parentNode.insertBefore(back,c);
  const lidW=mk('div','',f,'left:35px;top:16px;width:150px;height:240px;perspective:700px;opacity:0');
  const lid=mk('div','',lidW,'inset:0;transform-origin:0 50%;transform-style:preserve-3d',`<svg viewBox="0 0 100 160" width="150" height="240"><defs><linearGradient id="wdg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5a32"/><stop offset=".5" stop-color="#a06b3c"/><stop offset="1" stop-color="#7a4d28"/></linearGradient></defs><polygon points="${PT}" fill="url(#wdg)" stroke="#1d0f06" stroke-width="3" stroke-linejoin="round"/><g stroke="#4a2c16" stroke-width="1.4" fill="none"><path d="M30 8L22 152M50 4V158M70 8L78 152"/></g><g fill="#d6a53a" stroke="#6a4a10" stroke-width="1.5"><rect x="46" y="38" width="8" height="52"/><rect x="34" y="50" width="32" height="8"/></g></svg>`);
  const light=mk('div','',f,'left:50px;top:40px;width:120px;height:190px;background:radial-gradient(ellipse at 50% 70%,#bfe4ffcc,#bfe4ff00 70%);opacity:0');
  c.style.opacity=0;c.style.transform='translateY(12px) scale(.8)';
  /* chute du cercueil */
  const drop=[{transform:'translateY(-300px)'},{transform:'translateY(0)',offset:.7},{transform:'translateY(-8px)',offset:.85},{transform:'translateY(0)'}];
  back.style.opacity=1;A(back,drop,{duration:320,easing:'cubic-bezier(.5,0,.9,.6)'});
  await A(lidW,[{opacity:1,transform:'translateY(-300px)'},{opacity:1,transform:'translateY(0)',offset:.7},{opacity:1,transform:'translateY(-8px)',offset:.85},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.5,0,.9,.6)'});
  c.style.opacity=1;shake(back,4,160);burst(f,110,250,['spark'],6,50,360,8);
  /* le couvercle s'ouvre, la lumière monte */
  A(light,[{opacity:0},{opacity:1}],{duration:300});
  await A(lid,[{transform:'rotateY(0)'},{transform:'rotateY(-112deg)'}],{duration:340,easing:'cubic-bezier(.3,.8,.4,1)'});
  /* la carte sort */
  await A(c,[{transform:'translateY(12px) scale(.8)'},{transform:'translateY(-14px) scale(1.04)',offset:.7},{transform:'translateY(0) scale(1)'}],{duration:360,easing:'cubic-bezier(.2,.8,.3,1)'});
  burst(f,110,120,['spark'],6,70,420,10);
  await Promise.all([back,lidW,light].map(e=>A(e,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(40px)'}],{duration:240})));
  back.remove()},
};
/* ---------- Roulette russe : un barillet de vraies cartes face cachée ---------- */
const RC={cx:220,cy:136,R:76,w:75,h:108,s:.34};
function rouLayout(S,th){
  const n=S.ring.length;S.ring.forEach((it,i)=>{const a=(th+i*360/n)*Math.PI/180;it.el.style.left=(RC.cx+RC.R*Math.sin(a)-RC.w/2)+'px';it.el.style.top=(RC.cy-RC.R*Math.cos(a)-RC.h/2)+'px'})}
/* un tir : le barillet tourne, la carte choisie vient au centre et se retourne */
async function rouScene(o,f){
  const R=o.rou||{},n=Math.max(1,R.rem||6),S={f,ring:[],th:0};
  mk('div','',f,'left:209px;top:6px;width:22px;height:18px;clip-path:polygon(0 0,100% 0,50% 100%);background:#ffd84a;filter:drop-shadow(0 2px 3px #000)');
  for(let i=0;i<n;i++){const el=mk('div','x-rc',f,'',`<div class="x-sh"><div class="x-fl"><div class="x-bk">${vieBackW(RC.s)}</div><div class="x-ft"></div></div></div>`);S.ring.push({el})}
  rouLayout(S,0);
  const k=R.k!=null&&R.k>=0&&R.k<n?R.k:Math.floor(Math.random()*n),it=S.ring[k];
  S.ring.forEach((x,i)=>A(x.el,[{transform:'scale(.2)',opacity:0},{transform:'scale(1)',opacity:1}],{duration:200,delay:i*25}));
  await sleep(200+n*25);
  const th0=0,thF=-k*360/n+360*2;
  const t0=performance.now(),D=560*SPD;
  await new Promise(r=>{(function fr(t){const u=Math.min(1,(t-t0)/D),e=1-Math.pow(1-u,3);S.th=th0+(thF-th0)*e;rouLayout(S,S.th);u<1?requestAnimationFrame(fr):r()})(t0)});
  S.th=thF%360;rouLayout(S,S.th);
  const id=R.h?973:(R.c||BLANK);
  $('.x-ft',it.el).innerHTML=vieW(id,RC.s,'tabindex="-1"');
  it.el.style.zIndex=5;
  const dx=RC.cx-RC.w/2-parseFloat(it.el.style.left),dy=RC.cy-RC.h/2-parseFloat(it.el.style.top);
  await A(it.el,[{transform:'translate(0,0) scale(1)'},{transform:`translate(${dx}px,${dy}px) scale(2.2)`}],{duration:220,easing:'cubic-bezier(.3,.8,.4,1)'});
  await A($('.x-fl',it.el),[{transform:'rotateY(0)'},{transform:'rotateY(180deg)'}],{duration:240});
  if(R.h){
    flash(f,'#fff',1,200);shake($('.x-sh',it.el),10,380);
    const red=mk('div','',f,'inset:0;background:radial-gradient(circle at 50% 52%,#e0342d00 0,#e0342d99 80%)');A(red,[{opacity:0},{opacity:1}],{duration:200});
    const hole=mk('div','',f,`left:${RC.cx-10}px;top:${RC.cy-8}px;width:20px;height:20px;border-radius:50%;background:#14070a;box-shadow:0 0 0 4px #7a1111,0 0 0 8px #e0342d55;z-index:9`);A(hole,[{transform:'scale(0)'},{transform:'scale(1)'}],{duration:140});
    await burst(f,RC.cx,RC.cy+4,['drop'],12,90,520,15);await sleep(300);
    return}
  const sp=mk('div','',f,'left:200px;top:120px;width:40px;height:40px;border-radius:50%;background:radial-gradient(#fff,#fff0 70%)');
  A(sp,[{opacity:1,transform:'scale(.2)'},{opacity:0,transform:'scale(1.4)'}],{duration:220});
  await A(it.el,[{transform:`translate(${dx}px,${dy}px) scale(2.2)`,opacity:1},{transform:`translate(${dx-90}px,${dy+130}px) rotate(-24deg) scale(1.6)`,opacity:0}],{duration:240,delay:120,easing:'ease-in'})}
const BLANK=2;

/* ---------- habillage : calque plein écran, carte réelle au centre ---------- */
const CSS=`
#vfxO{position:fixed;inset:0;z-index:9600;display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;font-family:'Trebuchet MS',Arial,sans-serif}
#vfxO .x-dim{position:absolute;inset:0;background:rgba(6,4,12,.55);opacity:0}
#vfxO *{box-sizing:border-box}
#vfxO .x-stage{position:relative;border-radius:16px;overflow:hidden;background:radial-gradient(ellipse at 50% 42%,#2b2540 0,#15111f 72%);border:1px solid #322a42;box-shadow:0 18px 50px #000b;opacity:0}
#vfxO .x-sc{position:absolute;left:0;top:0;transform-origin:0 0}
#vfxO .x-card{position:absolute;left:48px;top:46px;width:124px;height:178px;will-change:transform}
#vfxO .x-card .vw,#vfxO .x-rc .vw{pointer-events:none}
#vfxO .x-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
#vfxO .x-fx>*{position:absolute}
#vfxO .x-bar8{top:-20px;height:300px;width:9px;border-radius:5px;background:linear-gradient(90deg,#5b616b,#d9dde3 45%,#6a707a);border:1.5px solid #14131a}
#vfxO .x-ico{will-change:transform,opacity;line-height:0}
#vfxO .x-ico svg{width:100%;height:100%;display:block}
#vfxO .x-rc{position:absolute;width:75px;height:108px;perspective:600px;will-change:transform}
#vfxO .x-sh{position:absolute;inset:0;transform-style:preserve-3d}
#vfxO .x-fl{position:absolute;inset:0;transform-style:preserve-3d}
#vfxO .x-bk,#vfxO .x-ft{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
#vfxO .x-ft{transform:rotateY(180deg)}
`;
function css(){if($('#vfxCss'))return;const s=document.createElement('style');s.id='vfxCss';s.textContent=CSS;document.head.appendChild(s)}
function build(wide){
  css();
  const vw=innerWidth,vh=innerHeight,desk=vw>=1000&&vh>=520,W=wide?440:220,H=270;
  let s=wide?Math.min(.92*vw/W,.72*vh/H,2.1):Math.min((desk?.15*vw:.5*vw)/124,.78*vh/H,.94*vw/W);
  s=Math.max(.5,s);
  const O=document.createElement('div');O.id='vfxO';O.setAttribute('aria-hidden','true');
  O.innerHTML='<div class="x-dim"></div><div class="x-stage" style="width:'+(W*s).toFixed(1)+'px;height:'+(H*s).toFixed(1)+'px"><div class="x-sc" style="width:'+W+'px;height:'+H+'px;transform:scale('+s.toFixed(4)+')"></div></div>';
  document.body.appendChild(O);
  return{O,dim:$('.x-dim',O),st:$('.x-stage',O),sc:$('.x-sc',O)}}
function stop(){
  const c=cur;cur=null;
  if(c){c.done=true;try{c.O.remove()}catch(e){}if(c.res)c.res()}
  document.querySelectorAll('#vfxO').forEach(e=>e.remove())}
/* o : {k, id, speed, rou:{rem,k,h,c}} — rend la main quand l'effet est fini (ou touché) */
function play(o){
  stop();
  const wide=o.k==='roul';
  if(!wide&&!FX[o.k])return Promise.resolve();
  SPD=Math.max(.05,o.speed||1);
  const B=build(wide),me={O:B.O,done:false};cur=me;
  return new Promise(res=>{
    me.res=res;
    const end=async(quick)=>{
      if(me.fin)return;me.fin=true;
      try{await Promise.all([A(B.dim,[{opacity:1},{opacity:0}],{duration:quick?90:160}),A(B.st,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.96)'}],{duration:quick?90:160})])}catch(e){}
      try{B.O.remove()}catch(e){}if(cur===me)cur=null;me.res=null;res()};
    const tap=()=>end(true);B.O.addEventListener('click',tap);
    (async()=>{
      A(B.dim,[{opacity:0},{opacity:1}],{duration:140});
      A(B.st,[{opacity:0,transform:'scale(.94)'},{opacity:1,transform:'scale(1)'}],{duration:140});
      const f=mk('div','x-fx',B.sc);let c=null;
      try{
        if(wide)await rouScene(o,f);
        else{
          c=mk('div','x-card',B.sc,'',vieW(o.id,124/220,'tabindex="-1"'));B.sc.appendChild(f);
          if(o.k!=='rise')await A(c,[{transform:'translateY(26px) scale(.6) rotate(-6deg)',opacity:0},{transform:'translateY(0) scale(1) rotate(0)',opacity:1}],{duration:230,easing:'cubic-bezier(.2,1.3,.4,1)'});
          if(!me.fin)await FX[o.k](c,f)}
      }catch(e){try{console.error('vfx',o.k,e)}catch(x){}}
      if(!me.fin)await sleep(60);
      end(false)})()})}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&cur&&cur.O)cur.O.click()});
window.VFX={play,stop,has:k=>k==='roul'||!!FX[k]};
})();
