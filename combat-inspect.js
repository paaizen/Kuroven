/* Kuroven Combat : inspection d'une carte full art (pour l'instant seulement Gojo : Vide Infini).
   Chargé à la demande par combat.js. Expose window.CBInspect(cardHTML). */
(function(){
'use strict';
const B='combat/img/full/gojo/';
const F=[{x:606,y:51,w:266,h:471},{x:543,y:16,w:502,h:889},{x:0,y:0,w:1672,h:941}];
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,cl=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,k)=>a+(b-a)*k;
let el=null,raf=0;
function css(){
 if(document.getElementById('cbInsCss'))return;
 const s=document.createElement('style');s.id='cbInsCss';
 s.textContent=`
#cbIns{position:fixed;inset:0;z-index:10000;background:#000;overflow:hidden;opacity:0;transition:opacity .35s}
#cbIns.on{opacity:1}
#cbIns .v{position:absolute;inset:0;perspective:1400px;overflow:hidden}
#cbIns .w{position:absolute;left:0;top:0;width:1672px;height:941px;transform-origin:0 0;transform-style:preserve-3d}
#cbIns .w img{background:none!important;border:0!important;box-shadow:none!important;border-radius:0!important;position:absolute!important;display:block;max-width:none!important;height:auto;opacity:1;user-select:none;-webkit-user-drag:none;pointer-events:none}
#cbIns .sky{left:-1672px;top:-470px;width:5016px;height:1882px;transform:translateZ(-200px) scale(1.1429);transform-origin:2508px 941px}
#cbIns .gc,#cbIns .fu{left:543px;top:16px;width:502px}
#cbIns .ca{left:606px;top:51px;width:266px}
#cbIns .fe{-webkit-mask-image:linear-gradient(to right,transparent,#000 14%,#000 86%,transparent),linear-gradient(to bottom,transparent,#000 9%,#000 91%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(to right,transparent,#000 14%,#000 86%,transparent),linear-gradient(to bottom,transparent,#000 9%,#000 91%,transparent);mask-composite:intersect}
#cbIns canvas{position:absolute;inset:0;pointer-events:none}
#cbIns .card{position:absolute;left:50%;top:50%;width:260px;height:379px;margin:-189px 0 0 -130px;opacity:0;pointer-events:none;visibility:hidden;background:none!important;border:0!important;box-shadow:none!important;padding:0!important;min-height:0!important}
#cbIns .fl{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
#cbIns .cap{position:absolute;left:0;right:0;bottom:6%;text-align:center;color:#fff;font:700 30px Georgia,serif;text-shadow:0 3px 14px #000;opacity:0;transition:opacity 1s;pointer-events:none}
#cbIns .cap.on{opacity:1}#cbIns .cap small{display:block;font:800 12px system-ui;letter-spacing:4px;color:#ffe9a8;margin-top:6px}
#cbIns .btns{position:absolute;right:20px;top:16px;display:flex;gap:8px;z-index:3}
#cbIns .btns button{border:1.5px solid #fff8;background:#0008;color:#fff;border-radius:6px;padding:9px 16px;font:800 13px system-ui;cursor:pointer}`;
 document.head.appendChild(s);
}
function close(){if(!el)return;cancelAnimationFrame(raf);const e=el;el=null;e.classList.remove('on');setTimeout(()=>e.remove(),350)}
window.CBInspect=function(cardHTML){
 css();close();
 const o=document.createElement('div');o.id='cbIns';el=o;
 o.innerHTML='<div class="v"><div class="w"><img class="sky" src="'+B+'sky.jpg"><img class="gc" src="'+B+'cut.webp"><img class="fu fe" src="'+B+'full.webp"><img class="ca fe" src="'+B+'card.jpg"></div></div><canvas></canvas>'+
  '<div class="card cbt bk1" style="background:none;border:0;padding:0">'+cardHTML+'</div><div class="fl"></div>'+
  '<div class="cap">Satoru Gojou : Vide Infini<small>ÉVOLUTION · POLYVALENT</small></div><div class="btns"><button data-a="r">↻ Rejouer</button><button data-a="x">✕ Fermer</button></div>';
 (document.getElementById('v-cb')||document.body).appendChild(o);
 requestAnimationFrame(()=>o.classList.add('on'));
 const w=o.querySelector('.w'),ca=o.querySelector('.ca'),fu=o.querySelector('.fu'),cv=o.querySelector('canvas'),g=cv.getContext('2d'),card=o.querySelector('.card'),cap=o.querySelector('.cap'),v=o.querySelector('.v');
 let t0=performance.now(),mx=0,sm=0,parts=[];
 o.querySelector('.fl').animate([{opacity:.95},{opacity:0}],{duration:600,easing:'ease-out'});
 o.onpointermove=e=>mx=(e.clientX/innerWidth-.5)*2;
 o.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.a==='x')close();else{t0=performance.now();parts=[]}};
 const key=e=>{if(e.key==='Escape'){close();removeEventListener('keydown',key)}};addEventListener('keydown',key);
 const fr=(f,cover,m)=>{const W=innerWidth,H=innerHeight;return {s:(cover?Math.max(W/f.w,H/f.h):Math.min(W/f.w,H/f.h)*.96)*(m||1),cx:f.x+f.w/2,cy:f.y+f.h/2}};
 const END=16;
 function loop(now){
  if(el!==o)return;raf=requestAnimationFrame(loop);
  const W=innerWidth,H=innerHeight;if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  const t=(now-t0)/1000;
  const a=fr(F[0],true,1.04),b=fr(F[1],false),c=fr(F[2],true,1.16);
  // aller : carte -> corps entier -> ciel ; retour (à la fin) : ciel -> corps entier -> carte
  let k1=ease(cl((t-.9)/2.1,0,1)),k2=ease(cl((t-3)/2.2,0,1));
  const back1=ease(cl((t-(END-4))/2,0,1)),back2=ease(cl((t-(END-2))/2,0,1));
  k2*=1-back1;k1*=1-back2;
  const s=Math.exp(lerp(lerp(Math.log(a.s),Math.log(b.s),k1),Math.log(c.s),k2));
  const cx=lerp(lerp(a.cx,b.cx,k1),c.cx,k2),cy=lerp(lerp(a.cy,b.cy,k1),c.cy,k2);
  ca.style.opacity=1-cl((t-1.1)/1.1,0,1)*(1-cl((t-(END-1.2))/1,0,1));
  fu.style.opacity=1-cl((t-3.1)/1.3,0,1)*(1-cl((t-(END-3.4))/1.3,0,1));
  sm+=(mx-sm)*.05;const ph=Math.max(0,t-4.6),rot=k2*(25*Math.sin(ph*.38)+sm*5),bob=k2*Math.sin(t*.7)*6;
  w.style.transform=`translate(${W/2}px,${H/2+bob}px) rotateY(${rot}deg) scale(${s}) translate(${-cx}px,${-cy}px)`;
  cap.classList.toggle('on',t>4.2&&t<END-3.5);
  // tout à la fin, l'image redevient la carte
  const ce=cl((t-END)/.8,0,1);
  if(ce>0){const sc=Math.min(W/260,H/379)*.9;card.style.visibility='visible';card.style.opacity=ce;card.style.transform='scale('+lerp(sc*1.15,sc*.92,ease(ce))+')';v.style.opacity=1-ce}
  else{card.style.opacity=0;card.style.visibility='hidden';v.style.opacity=1}
  g.clearRect(0,0,W,H);
  if(t<END){if(Math.random()<.6)parts.push({x:Math.random()*W,y:H+10,r:1+Math.random()*2.5,v:30+Math.random()*50,p:Math.random()*6})}
  parts=parts.filter(p=>p.y>-10);g.fillStyle='#ffe0f4';g.shadowColor='#ff9ad8';g.shadowBlur=8;g.globalAlpha=.7*(1-ce);
  parts.forEach(p=>{p.y-=p.v/60;p.x+=Math.sin(t+p.p)*.4;g.beginPath();g.arc(p.x,p.y,p.r,0,6.283);g.fill()});
 }
 raf=requestAnimationFrame(loop);
};
})();
