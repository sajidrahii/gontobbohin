const $=s=>document.querySelector(s),sleep=ms=>new Promise(r=>setTimeout(r,ms)),bn=n=>n.toLocaleString('bn-BD');
const MAXP=200,FONT='"Anek Bangla"',DIST=n=>DISTRICTS.find(d=>d[0]===n),DEFAULT_TITLE='বাংলাদেশের আনাচে-কানাচে আমি';
const DP=MAP.districts.map(d=>new Path2D(d[1])),DN=MAP.districts.map(d=>d[0]),theme=()=>document.querySelector('[name=theme]:checked').value;
const PALS={
  classic:{name:'ক্লাসিক',bg:'#f6f1e7',plain:'#ffffff',ink:'#000000',title:'#14382b',base:'#dfd8c6',edge:'#f8f4ea',visited:'#4aa36a',line:'#f26a2e',ring:'#ffffff',cardEdge:'#ffffff',pillBg:'rgba(255,255,255,.92)',pillInk:'#14382b',foot:'#8a948c',footPlain:'#777777',dash:'#cdbf9f',hint:'#8a948c'},
  night:{name:'রাতের আকাশ',bg:'#0f1b2d',plain:'#0f1b2d',ink:'#f4e9c8',title:'#f4e9c8',base:'#27384f',edge:'#0f1b2d',visited:'#2fd0a0',line:'#ffb347',ring:'#0f1b2d',cardEdge:'#e8eefc',pillBg:'rgba(15,27,45,.88)',pillInk:'#f4e9c8',foot:'#8aa0c0',footPlain:'#8aa0c0',dash:'#3a4f6c',hint:'#8aa0c0'},
  ocean:{name:'সাগর',bg:'#e4f2f6',plain:'#f4fafc',ink:'#0b3a4a',title:'#0b3a4a',base:'#c3dbe4',edge:'#f1f9fb',visited:'#1f8fa6',line:'#ff6b57',ring:'#ffffff',cardEdge:'#ffffff',pillBg:'rgba(255,255,255,.92)',pillInk:'#0b3a4a',foot:'#6b8f99',footPlain:'#6b8f99',dash:'#a9c8d3',hint:'#6b8f99'},
  sunset:{name:'সূর্যাস্ত',bg:'#fdeadf',plain:'#fff6ef',ink:'#4a1d33',title:'#4a1d33',base:'#f0cfb9',edge:'#fff3ea',visited:'#e0592a',line:'#7a2a5c',ring:'#ffffff',cardEdge:'#ffffff',pillBg:'rgba(255,255,255,.92)',pillInk:'#4a1d33',foot:'#a07a6a',footPlain:'#a07a6a',dash:'#e6bfa6',hint:'#a07a6a'}};
let pal='classic';const PAL=()=>PALS[pal];
const PINE='#14382b',SUN='#f26a2e',CREAM='#f6f1e7',GREEN='#4aa36a',BEIGE='#dfd8c6';
const SHAPES={rect:1,circle:1};
const DDIV=Object.fromEntries(DISTRICTS.map(d=>[d[0],d[4]])),DDIVI=DN.map(n=>DDIV[n]);
let items=[],G=1,animNext=true,page=0,perMap=16,uid=0,filter='all',notice='',scope='',shape='rect',titleEdited=false,anchor=null;
const selected=new Set(),THEME_TXT={map:'মানচিত্র মাঝখানে, ছবিগুলো চারপাশে বৃত্তাকারে সাজানো — প্রতিটি ছবি থেকে জেলায় রেখা; যে জেলার ছবি আছে সেগুলো সবুজ হবে।',grid:'প্রতি পাতায় ১০টি ছবি, ৫টি করে সারিতে।',slides:'প্রতি পাতায় ৫টি ছবি, ১৬:৯ স্লাইড।'};
const complete=it=>!!it.d,selOne=()=>selected.size===1?items.find(i=>i.id===[...selected][0]):null;
const inScope=it=>!scope||(!!it.d&&DDIV[it.d]===scope),album=()=>scope?items.filter(inScope):items;
const per=()=>theme()==='map'?perMap:theme()==='grid'?10:5,pageCount=()=>Math.max(1,Math.ceil(album().length/per())),curItems=()=>album().slice(page*per(),page*per()+per());
const MOBILE=matchMedia('(max-width: 760px)');let needReveal=false,noticeBad=true;
function flash(m,bad=true){notice=m;noticeBad=bad;draw();setTimeout(()=>{if(notice===m){notice='';draw()}},6000)}
const proj=p=>[(p.lng-88)*91.64*MAP.sx+MAP.tx,(26.7-p.lat)*100*MAP.sy+MAP.ty];

/* ---------- district geometry: keep every photo's point inside its own district ---------- */
const RINGS=MAP.districts.map(([n,d])=>d.split('Z').filter(Boolean).map(r=>r.split(/[ML]/).filter(Boolean).map(p=>p.split(' ').map(Number)))),DI=Object.fromEntries(DN.map((n,i)=>[n,i]));
function inside(i,x,y){let c=false;for(const r of RINGS[i])for(let a=0,b=r.length-1;a<r.length;b=a++){const[xa,ya]=r[a],[xb,yb]=r[b];if((ya>y)!==(yb>y)&&x<(xb-xa)*(y-ya)/(yb-ya)+xa)c=!c}return c}
function nearest(i,x,y){let best={d:1e9,x,y};for(const r of RINGS[i])for(let a=0,b=r.length-1;a<r.length;b=a++){const[xa,ya]=r[a],[xb,yb]=r[b],dx=xb-xa,dy=yb-ya,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((x-xa)*dx+(y-ya)*dy)/l)):0,px=xa+t*dx,py=ya+t*dy,d=Math.hypot(x-px,y-py);if(d<best.d)best={d,x:px,y:py}}return best}
const bbox=i=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const r of RINGS[i])for(const[x,y]of r){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}return{x0,y0,x1,y1}};
const POLE={};
function pole(i){ // visual centre: the interior point farthest from the border
  if(POLE[i])return POLE[i];const b=bbox(i);let best=null;
  for(let a=0;a<26;a++)for(let c=0;c<26;c++){const x=b.x0+(b.x1-b.x0)*(a+.5)/26,y=b.y0+(b.y1-b.y0)*(c+.5)/26;if(!inside(i,x,y))continue;const d=nearest(i,x,y).d;if(!best||d>best.d)best={d,x,y}}
  return POLE[i]=best||{d:0,x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2};
}
function constrain(i,x,y){
  if(inside(i,x,y))return{x,y};
  const n=nearest(i,x,y),p=pole(i),dx=p.x-n.x,dy=p.y-n.y,l=Math.hypot(dx,dy)||1,k=Math.min(l,1.6),q={x:n.x+dx/l*k,y:n.y+dy/l*k};
  return inside(i,q.x,q.y)?q:{x:p.x,y:p.y};
}
const VIEWS={};
function viewOf(sc){
  if(!sc)return{x0:0,y0:0,w:MAP.w,h:MAP.h};
  if(VIEWS[sc])return VIEWS[sc];let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  DDIVI.forEach((d,i)=>{if(d!==sc)return;const b=bbox(i);x0=Math.min(x0,b.x0);y0=Math.min(y0,b.y0);x1=Math.max(x1,b.x1);y1=Math.max(y1,b.y1)});
  return VIEWS[sc]={x0:x0-8,y0:y0-8,w:x1-x0+16,h:y1-y0+16};
}

/* ---------- scroll reveal + nav highlight ---------- */
const rv=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rv.unobserve(e.target)}}),{rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('.reveal').forEach(el=>rv.observe(el));
setTimeout(()=>document.querySelectorAll('.reveal').forEach(el=>el.classList.add('in')),2500);
const links=[...document.querySelectorAll('.bar li a')];
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.toggleAttribute('aria-current',a.getAttribute('href')==='#'+e.target.id))}),{rootMargin:'-45% 0px -50% 0px'});
['top','builder'].forEach(id=>io.observe(document.getElementById(id)));

/* ---------- zip (store-only) used by .pix files and the "all pages" download ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=u=>{let c=-1;for(let i=0;i<u.length;i++)c=CRC[(c^u[i])&255]^(c>>>8);return(c^-1)>>>0};
function zip(files){
  const enc=new TextEncoder(),parts=[],cen=[],d=new Date();let off=0;
  const tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  for(const f of files){
    const nm=enc.encode(f.name),crc=crc32(f.data),sz=f.data.length,h=new DataView(new ArrayBuffer(30)),c=new DataView(new ArrayBuffer(46));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(10,tm,true);h.setUint16(12,dt,true);h.setUint32(14,crc,true);h.setUint32(18,sz,true);h.setUint32(22,sz,true);h.setUint16(26,nm.length,true);
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,tm,true);c.setUint16(14,dt,true);c.setUint32(16,crc,true);c.setUint32(20,sz,true);c.setUint32(24,sz,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
    parts.push(h.buffer,nm,f.data);cen.push(c.buffer,nm);off+=30+nm.length+sz;
  }
  const cl=cen.reduce((a,b)=>a+b.byteLength,0),e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cl,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cen,e.buffer],{type:'application/octet-stream'});
}
function unzip(buf){
  const v=new DataView(buf),u=new Uint8Array(buf);let e=-1;
  for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-66000);i--)if(v.getUint32(i,true)===0x06054b50){e=i;break}
  if(e<0)throw 0;
  const n=v.getUint16(e+10,true),out={},dec=new TextDecoder();let p=v.getUint32(e+16,true);
  for(let k=0;k<n;k++){
    if(v.getUint32(p,true)!==0x02014b50||v.getUint16(p+10,true)!==0)throw 0;
    const cs=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cm=v.getUint16(p+32,true),lo=v.getUint32(p+42,true),ds=lo+30+v.getUint16(lo+26,true)+v.getUint16(lo+28,true);
    out[dec.decode(u.subarray(p+46,p+46+nl))]=u.subarray(ds,ds+cs);p+=46+nl+el+cm;
  }
  return out;
}
const saveBlob=(b,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};

/* ---------- district tooltips (overlay on the live preview map) ---------- */
const tip=$('#tip'),NS='http://www.w3.org/2000/svg',ov=document.createElementNS(NS,'svg');
ov.setAttribute('class','mapov');ov.setAttribute('viewBox',`0 0 ${MAP.w} ${MAP.h}`);
MAP.districts.forEach(([n,d])=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',d);p.dataset.n=n;ov.append(p)});
const ovPaths=[...ov.querySelectorAll('path')];
const showTip=e=>{const p=e.target.closest('path[data-n]');if(!p){tip.classList.remove('show');return}tip.textContent=p.dataset.n;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.classList.add('show')};
ov.addEventListener('pointermove',showTip);ov.addEventListener('pointerdown',showTip);
ov.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')tip.classList.remove('show')});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.mapov'))tip.classList.remove('show')});

/* ---------- hero: journeys across Bangladesh (main trip + bike, train, bus) ---------- */
(function(){
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches,N=s=>s.normalize('NFC'),pt=(lat,lng)=>proj({lat,lng});
  const curve=P=>{let d=`M${P[0][0]} ${P[0][1]}`;for(let i=0;i<P.length-1;i++){const a=P[Math.max(0,i-1)],b=P[i],c=P[i+1],e=P[Math.min(P.length-1,i+2)];
    d+=`C${b[0]+(c[0]-a[0])/6} ${b[1]+(c[1]-a[1])/6} ${c[0]-(e[0]-b[0])/6} ${c[1]-(e[1]-b[1])/6} ${c[0]} ${c[1]}`}return d};
  const stops=[['তেতুলিয়া',26.485,88.345,'r'],['রাজশাহী',24.37,88.6,'l'],['ঢাকা',23.81,90.41,'r'],['সিলেট',24.9,91.87,'r'],['চট্টগ্রাম',22.34,91.83,'l'],['কক্সবাজার',21.45,91.98,'l'],['টেকনাফ',20.86,92.3,'l']];
  const ICON={
    bike:c=>`<circle r="12.5" fill="#fff" stroke="${c}" stroke-width="2.5"/><g fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="-5.5" cy="3" r="3.5"/><circle cx="5.5" cy="3" r="3.5"/><path d="M-5.5 3-1.5-3.2H3.2L5.5 3M-1.5-3.2.8 3M3.2-3.2 2.4-5.8H4.8"/></g>`,
    train:c=>`<rect x="-16" y="-8.5" width="32" height="15" rx="5" fill="${c}" stroke="#fff" stroke-width="2.4"/><g fill="#fff"><rect x="-12" y="-5.5" width="7" height="5.5" rx="1.4"/><rect x="-3.5" y="-5.5" width="7" height="5.5" rx="1.4"/><rect x="5" y="-5.5" width="7" height="5.5" rx="1.4"/></g><g fill="#fff" stroke="${c}" stroke-width="1.4"><circle cx="-8" cy="8.6" r="2.4"/><circle cx="8" cy="8.6" r="2.4"/></g>`,
    bus:c=>`<rect x="-13.5" y="-8.5" width="27" height="15.5" rx="4" fill="${c}" stroke="#fff" stroke-width="2.4"/><g fill="#fff"><rect x="-10" y="-5.5" width="6" height="5" rx="1.2"/><rect x="-2.5" y="-5.5" width="6" height="5" rx="1.2"/><rect x="5" y="-5.5" width="5" height="9" rx="1.2"/></g><g fill="#fff" stroke="${c}" stroke-width="1.4"><circle cx="-7" cy="8.6" r="2.5"/><circle cx="7" cy="8.6" r="2.5"/></g>`};
  const R=[
    {id:'bike',c:'#2b8fb3',dur:16,begin:0,dash:'3 8',dl:11,side:'r',pts:[['ঢাকা',23.81,90.41],['মাদারীপুর',23.17,90.2],['বরিশাল',22.7,90.37],['পটুয়াখালী',22.36,90.33],['কুয়াকাটা',21.82,90.12]]},
    {id:'train',c:'#5b6b61',dur:11,begin:1.2,side:'r',pts:[['ঢাকা',23.81,90.41],['টাঙ্গাইল',24.25,89.92],['বগুড়া',24.85,89.37],['রংপুর',25.75,89.25]]},
    {id:'bus',c:'#b5446e',dur:14,begin:2.4,dash:'10 7',dl:17,side:'l',pts:[['ঢাকা',23.81,90.41],['ফরিদপুর',23.6,89.84],['যশোর',23.17,89.21],['খুলনা',22.82,89.55]]}];
  const seen=new Set(['পঞ্চগড়','রাজশাহী','ঢাকা','সিলেট','চট্টগ্রাম','কক্সবাজার'].map(N)),light=new Set(['মাদারীপুর','বরিশাল','পটুয়াখালী','টাঙ্গাইল','বগুড়া','রংপুর','ফরিদপুর','যশোর','খুলনা'].map(N));
  let h=MAP.districts.map(([n,p])=>`<path d="${p}" fill="${seen.has(N(n))?GREEN:light.has(N(n))?'#a5d4b2':BEIGE}" stroke="#f8f4ea" stroke-width=".9" stroke-linejoin="round"/>`).join('');
  const halo=`stroke="#fff6e8" stroke-width="4.5" paint-order="stroke" stroke-linejoin="round"`;
  R.forEach((r,ri)=>{
    const P=r.pts.map(q=>pt(q[1],q[2])),d=curve(P),e=P[P.length-1],L=r.side==='l';
    h+=`<g class="route-g" data-r="${r.id}">`;
    h+=r.id==='train'?`<path id="rt-train" d="${d}" fill="none" stroke="${r.c}" stroke-width="5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="2.2" stroke-dasharray="2 7"/>`
      :`<path id="rt-${r.id}" d="${d}" fill="none" stroke="${r.c}" stroke-opacity=".28" stroke-width="6" stroke-linecap="round"/><path class="rt-dash2" style="--dl:${r.dl}" d="${d}" fill="none" stroke="${r.c}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${r.dash}"/>`;
    P.slice(1).forEach(q=>{h+=`<circle cx="${q[0]}" cy="${q[1]}" r="4.5" fill="#fff" stroke="${r.c}" stroke-width="2.5"/>`});
    h+=`<text class="lbl" x="${e[0]+(L?-12:12)}" y="${e[1]+5}" text-anchor="${L?'end':'start'}" font-size="16" font-weight="800" fill="${r.c}" ${halo} style="animation-delay:${2.6+ri*.3}s">${r.pts[r.pts.length-1][0]}</text>`;
    const m=P[Math.min(2,P.length-1)];
    h+=still?`<g transform="translate(${m[0]} ${m[1]}) scale(1.1)">${ICON[r.id](r.c)}</g>`:`<g transform="scale(1.1)">${ICON[r.id](r.c)}</g>`;
    h+='</g>';
  });
  // the main journey: Tetulia -> Teknaf
  const P=stops.map(q=>pt(q[1],q[2])),d=curve(P);
  h+=`<g class="route-g" data-r="main"><path id="route" d="${d}" fill="none" stroke="${SUN}" stroke-opacity=".28" stroke-width="7" stroke-linecap="round"/><path class="rt-dash" d="${d}" fill="none" stroke="${SUN}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="7 9"/>`;
  stops.forEach((q,i)=>{const[x,y]=P[i],L=q[3]==='l';
    h+=`<circle class="ring" cx="${x}" cy="${y}" r="9" fill="${SUN}" style="animation-delay:${i*.35}s"/><circle cx="${x}" cy="${y}" r="7" fill="${SUN}" stroke="#fff" stroke-width="3"/>
    <text class="lbl" x="${x+(L?-15:15)}" y="${y+6}" text-anchor="${L?'end':'start'}" font-size="19" font-weight="800" fill="${PINE}" ${halo} style="animation-delay:${.5+i*.35}s">${q[0]}</text>`});
  h+=still?`<circle cx="${P[P.length-1][0]}" cy="${P[P.length-1][1]}" r="9" fill="#fff" stroke="${PINE}" stroke-width="4"/></g>`:`<circle r="9" fill="#fff" stroke="${PINE}" stroke-width="4"><animateMotion dur="11s" repeatCount="indefinite" rotate="auto"><mpath href="#route"/></animateMotion></circle></g>`;
  $('#heroArt').innerHTML=h;
  if(!still)R.forEach(r=>{ // attach each vehicle to its own road
    const g=$('#heroArt').querySelector(`[data-r="${r.id}"] > g`),am=document.createElementNS(NS,'animateMotion');
    am.setAttribute('dur',r.dur+'s');am.setAttribute('begin',r.begin+'s');am.setAttribute('repeatCount','indefinite');
    const mp=document.createElementNS(NS,'mpath');mp.setAttribute('href','#rt-'+r.id);am.append(mp);g.append(am);
  });
  const art=$('#heroArt');
  document.querySelectorAll('#heroLegend button').forEach(b=>{
    const on=()=>{art.classList.add('dim');const g=art.querySelector(`[data-r="${b.dataset.r}"]`);g&&g.classList.add('hl')},off=()=>{art.classList.remove('dim');art.querySelectorAll('.hl').forEach(g=>g.classList.remove('hl'))};
    b.addEventListener('mouseenter',on);b.addEventListener('focus',on);b.addEventListener('mouseleave',off);b.addEventListener('blur',off);
  });
})();

/* ---------- photo library ---------- */
const bmCache=new Map();
async function bitmap(it){
  if(bmCache.has(it.id)){const b=bmCache.get(it.id);bmCache.delete(it.id);bmCache.set(it.id,b);return b}
  const b=await createImageBitmap(it.blob);bmCache.set(it.id,b);
  while(bmCache.size>40){const k=bmCache.keys().next().value;bmCache.get(k).close();bmCache.delete(k)}
  return b;
}
const toBlob=(c,t,q)=>new Promise(r=>c.toBlob(r,t,q));
async function makeItem(src,reencode,props={}){
  let bm,blob=src;
  if(reencode){
    const dim=await new Promise((ok,no)=>{const u=URL.createObjectURL(src),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok([i.naturalWidth,i.naturalHeight])};i.onerror=()=>{URL.revokeObjectURL(u);no()};i.src=u}),s=Math.min(1,1000/Math.max(...dim));
    bm=await createImageBitmap(src,{resizeWidth:Math.max(1,Math.round(dim[0]*s)),resizeHeight:Math.max(1,Math.round(dim[1]*s)),resizeQuality:'high'});
    const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);blob=await toBlob(c,'image/jpeg',.88);
  }else bm=await createImageBitmap(src);
  const ts=Math.min(1,200/Math.max(bm.width,bm.height)),tc=document.createElement('canvas');tc.width=Math.max(1,Math.round(bm.width*ts));tc.height=Math.max(1,Math.round(bm.height*ts));
  tc.getContext('2d').drawImage(bm,0,0,tc.width,tc.height);const tb=await toBlob(tc,'image/jpeg',.8);bm.close();
  return{id:++uid,blob,thumb:URL.createObjectURL(tb),place:'',d:'',size:100,zoom:1,fx:.5,fy:.3,...props};
}
function tileFor(it){
  const b=document.createElement('button');b.type='button';b.className='tile'+(it.fresh?' new':'');it.fresh=0;b.dataset.id=it.id;
  b.innerHTML='<img alt=""><span class="chk"></span><i class="dot"></i><span class="tl"></span><span class="td"></span>';
  b.querySelector('img').src=it.thumb;it.el=b;refreshTile(it);return b;
}
function refreshTile(it){
  const b=it.el,ok=complete(it);b.classList.toggle('ok',ok);if(ok)b.classList.remove('bad');b.classList.toggle('out',!inScope(it));
  b.querySelector('.tl').textContent=it.place.trim()||'—';b.querySelector('.td').textContent=it.d||'জেলা নেই';
  $('#todoN').textContent=bn(items.filter(i=>!complete(i)).length);
}
const updateOut=()=>items.forEach(it=>it.el&&it.el.classList.toggle('out',!inScope(it)));
function stats(){$('#count').textContent=`${bn(items.length)} / ${bn(MAXP)}`;$('#todoN').textContent=bn(items.filter(i=>!complete(i)).length);$('#lib').hidden=!items.length;const todo=items.filter(i=>!complete(i)).length;$('#mTodo').hidden=!todo;$('#mTodo').textContent=`জেলা বাছুন (${bn(todo)})`;$('#tabCount').textContent=items.length?`(${bn(items.length)})`:''}
function applyFilter(){const s=$('#q').value.trim().toLowerCase();items.forEach(it=>{it.el.hidden=!((filter==='all'||!complete(it))&&(!s||(it.place+' '+it.d+' '+((DIST(it.d)||[])[3]||'')).toLowerCase().includes(s)))})}
function renderLib(){$('#tiles').replaceChildren(...items.map(tileFor));applyFilter();stats();syncSelUI()}
function prog(done,total){const p=$('#progress');p.hidden=!total;if(total){p.querySelector('i').style.width=done/total*100+'%';p.querySelector('span').textContent=`ছবি প্রস্তুত হচ্ছে… ${bn(done)} / ${bn(total)}`}}
async function addFiles(fs){
  fs=fs.filter(f=>f.type.startsWith('image/'));
  const room=MAXP-items.length;
  if(fs.length>room){flash(`সর্বোচ্চ ${bn(MAXP)}টি ছবি — ${bn(fs.length-room)}টি বাদ গেছে।`);fs=fs.slice(0,room)}
  if(!fs.length)return;
  let done=0,fail=0;prog(0,fs.length);
  for(let i=0;i<fs.length;i+=3){
    const res=await Promise.all(fs.slice(i,i+3).map(f=>makeItem(f,true).catch(()=>null)));
    for(const it of res){if(!it){fail++;continue}it.fresh=1;items.push(it);$('#tiles').append(tileFor(it))}
    done+=res.length;prog(done,fs.length);stats();if(done%12===0)draw();
    await sleep(0);
  }
  prog(0,0);stats();applyFilter();draw();
  if(MOBILE.matches&&items.length){setTab('preview');if(!fail)flash('ছবি যোগ হয়েছে — ছবিতে ট্যাপ করে জেলা ও নাম যোগ করুন।',false)}
  if(fail)flash(`${bn(fail)}টি ছবি খোলা যায়নি — JPG বা PNG ব্যবহার করুন।`);
}
function removeItems(ids){
  items=items.filter(it=>{if(!ids.has(it.id))return true;URL.revokeObjectURL(it.thumb);const b=bmCache.get(it.id);if(b){b.close();bmCache.delete(it.id)}return false});
  ids.forEach(id=>selected.delete(id));renderLib();draw();
}
$('#files').onchange=e=>{addFiles([...e.target.files]);e.target.value=''};
const drop=$('#drop');
['dragover','dragenter'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>addFiles([...e.dataTransfer.files]));

/* ---------- district combobox: type to search (Bangla or English) or open the list ---------- */
function combo(root,onPick){
  const inp=root.querySelector('input'),ul=root.querySelector('ul'),btn=root.querySelector('.cbtn'),ed=root.closest('.editor');
  const nq=s=>s.normalize('NFC').toLowerCase().replace(/[\s\-']/g,''),ALL=DISTRICTS.map(d=>({v:d[0],en:d[3],dv:d[4],k:[nq(d[0]),nq(d[3]),nq(d[4])]}));
  let val='',mixed=false,hi=0,list=[],bt;
  const rank=(o,q)=>o.k[0].startsWith(q)||o.k[1].startsWith(q)?0:o.k[0].includes(q)||o.k[1].includes(q)?1:o.k[2].includes(q)?2:9;
  const filt=q=>{q=nq(q);return q?ALL.map(o=>[rank(o,q),o]).filter(a=>a[0]<9).sort((a,b)=>a[0]-b[0]).map(a=>a[1]):ALL.slice()};
  function mark(){[...ul.children].forEach((li,i)=>li.classList.toggle('hi',i===hi));const li=ul.children[hi];if(li&&li.scrollIntoView)li.scrollIntoView({block:'nearest'})}
  function show(q){
    list=filt(q);if(!q.trim()&&(val||mixed))list.push({v:'',clear:1});hi=0;
    ul.innerHTML=list.length?list.map((o,i)=>o.clear?`<li role="option" data-i="${i}" class="clr">✕ জেলা মুছে দিন</li>`:`<li role="option" data-i="${i}"${o.v===val?' aria-selected="true"':''}><b>${o.v}</b><span>${o.en} · ${o.dv}</span></li>`).join(''):'<li class="none">কোনো জেলা মেলেনি</li>';
    mark();ul.hidden=false;inp.setAttribute('aria-expanded','true');if(ed&&MOBILE.matches)ed.classList.add('picking');
  }
  const close=()=>{ul.hidden=true;inp.setAttribute('aria-expanded','false');if(ed)ed.classList.remove('picking')};
  function pick(i,kbd){const o=list[i];if(!o)return;val=o.v;mixed=false;inp.value=o.v;close();onPick(o.v,kbd);if(!kbd&&MOBILE.matches)inp.blur()}
  inp.addEventListener('focus',()=>{clearTimeout(bt);inp.select();show('')});
  inp.addEventListener('input',()=>show(inp.value));
  inp.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(ul.hidden)show('');else if(list.length){hi=(hi+(e.key==='ArrowDown'?1:-1)+list.length)%list.length;mark()}}
    else if(e.key==='Enter'){if(!ul.hidden&&list.length){e.preventDefault();pick(hi,true)}}
    else if(e.key==='Escape'){close();inp.value=val}
    else if(e.key==='Tab'&&!ul.hidden&&inp.value.trim()&&inp.value!==val&&list[hi]&&!list[hi].clear)pick(hi,false);
  });
  inp.addEventListener('blur',()=>{inp.value=val;clearTimeout(bt);bt=setTimeout(close,220)}); // wait a moment so a tap on a neighbouring button is not lost when the sheet re-lays out
  ul.addEventListener('mousedown',e=>e.preventDefault());
  ul.addEventListener('click',e=>{const li=e.target.closest('li[data-i]');if(li)pick(+li.dataset.i,false)});
  btn.addEventListener('mousedown',e=>e.preventDefault());
  btn.addEventListener('click',()=>{if(ul.hidden){inp.focus();show('')}else close()});
  return{set(v,m){val=v||'';mixed=!!m;inp.value=val;inp.placeholder=m?'একাধিক জেলা — বাছলে সবগুলো বদলাবে':'জেলা — টাইপ করুন বা বাছুন'},focus(){inp.focus()}};
}

/* ---------- selection + bulk editor ---------- */
const eDist=combo($('#eDistBox'),(v,kbd)=>{eachSel(it=>{it.d=v;refreshTile(it);want(it)});updateOut();if(MOBILE.matches&&selected.size===1)needReveal=true;draw();if(kbd&&selected.size===1)advance()});
function advance(){
  const cur=selOne(),i=items.indexOf(cur),nx=items.slice(i+1).find(x=>!x.d)||items.find(x=>!x.d&&x!==cur);
  if(!nx)return;selected.clear();selected.add(nx.id);anchor=nx.id;needReveal=true;syncSelUI();goTo(nx);if(!MOBILE.matches)nx.el.scrollIntoView({block:'nearest',behavior:'smooth'});eDist.focus();
}
function goTo(it){const idx=album().indexOf(it);if(idx<0)return draw();const p=Math.floor(idx/per());if(p!==page){page=p;animNext=true}draw()}
const pct=v=>bn(Math.round(+v))+'%';
function syncVals(){[['gsize','gval'],['szoom','zval'],['ssize','sval'],['eSize','evalOut'],['eZoom','ezval']].forEach(([a,b])=>{$('#'+b).textContent=pct($('#'+a).value)})}
document.addEventListener('input',e=>{if(e.target.type==='range')syncVals()});
const SNAP={size:[50,100,150],zoom:[100,150]};
// "dragging" starts on touch/mouse press and ends on release or the first key press (so arrow keys and screen readers keep fine control)
['pointerdown','touchstart'].forEach(t=>document.addEventListener(t,e=>{if(e.target.type==='range')e.target._drag=true},true));
['pointerup','touchend','mouseup'].forEach(t=>addEventListener(t,()=>document.querySelectorAll('input[type=range]').forEach(r=>{r._drag=false}),true));
document.addEventListener('keydown',e=>{if(e.target.type==='range')e.target._drag=false},true);
document.addEventListener('input',e=>{ // magnet: while dragging, values near a mark jump onto it (keyboard keeps fine control)
  const t=e.target;if(t.type!=='range'||!t._drag)return;
  const z=t.classList.contains('sn-zoom'),pts=z?SNAP.zoom:t.classList.contains('sn-size')?SNAP.size:null;if(!pts)return;
  const v=+t.value,hit=pts.find(q=>Math.abs(q-v)<=(z?9:5));
  if(hit!=null){if(hit!==v)t.value=hit;if(t._snap!==hit&&navigator.vibrate)navigator.vibrate(6);t._snap=hit}else t._snap=null;
},true);
function syncSelUI(){
  items.forEach(it=>it.el&&it.el.classList.toggle('sel',selected.has(it.id)));
  const n=selected.size,sl=items.filter(i=>selected.has(i.id));$('#editor').hidden=!n;
  if(n){
    $('#eTitle').textContent=n===1?`ছবি ${bn(items.indexOf(sl[0])+1)}`:`${bn(n)}টি ছবি নির্বাচিত`;
    const pl=new Set(sl.map(i=>i.place)),ds=new Set(sl.map(i=>i.d));
    $('#ePlace').value=pl.size===1?sl[0].place:'';$('#ePlace').placeholder=pl.size>1?'একাধিক জায়গা — লিখলে সবগুলো বদলাবে':'জায়গার নাম (ঐচ্ছিক)';
    eDist.set(ds.size===1?sl[0].d:'',ds.size>1);$('#eSize').value=sl[0].size;$('#eZoom').value=Math.round(sl[0].zoom*100);
  }
  const one=selOne(),on=!!(one&&curItems().includes(one));
  $('#selbar').hidden=!on;$('#hint').hidden=!!on;$('#hint').textContent=MOBILE.matches?'ছবিতে ট্যাপ করুন — জেলা ও নাম যোগ করুন। সরাতে টানুন, জুম করতে দুই আঙুলে চিমটি কাটুন।':theme()==='map'?'ছবিতে ক্লিক করে বেছে নিন, তারপর টেনে সরান ও স্ক্রল করে জুম করুন। মানচিত্রে জেলার ওপর মাউস রাখলে নাম দেখা যাবে।':'ছবিতে ক্লিক করে বেছে নিন, তারপর টেনে সরান ও স্ক্রল করে জুম করুন।';
  if(on){$('#selname').textContent=one.place.trim()||`ছবি ${bn(items.indexOf(one)+1)}`;$('#ssize').value=one.size;$('#szoom').value=Math.round(one.zoom*100)}
  const sheet=MOBILE.matches&&n>0;document.body.classList.toggle('sheet-open',sheet);
  if(sheet)requestAnimationFrame(()=>document.documentElement.style.setProperty('--sheetH',$('#editor').offsetHeight+'px'));
  syncVals();place();
}
$('#tiles').addEventListener('click',e=>{
  const t=e.target.closest('.tile');if(!t)return;const id=+t.dataset.id,add=e.ctrlKey||e.metaKey||e.target.closest('.chk');
  if(e.shiftKey&&anchor!=null){
    const vis=items.filter(i=>!i.el.hidden),a=vis.findIndex(i=>i.id===anchor),b=vis.findIndex(i=>i.id===id);
    if(a>=0&&b>=0){if(!add)selected.clear();vis.slice(Math.min(a,b),Math.max(a,b)+1).forEach(i=>selected.add(i.id))}
  }else if(add){selected.has(id)?selected.delete(id):selected.add(id);anchor=id}
  else{selected.clear();selected.add(id);anchor=id}
  syncSelUI();const one=selOne();if(one)goTo(one);
});
const eachSel=fn=>items.filter(i=>selected.has(i.id)).forEach(fn);
$('#ePlace').oninput=e=>{eachSel(it=>{it.place=e.target.value;refreshTile(it)});draw()};
$('#ePlace').onchange=()=>eachSel(want);
$('#eSize').oninput=e=>{eachSel(it=>it.size=+e.target.value);const o=selOne();if(o)$('#ssize').value=o.size;draw()};
$('#eClear').onclick=()=>{selected.clear();syncSelUI()};
$('#eDel').onclick=()=>{if(selected.size>1&&!confirm(`${bn(selected.size)}টি ছবি মুছে ফেলবেন?`))return;removeItems(new Set(selected))};
$('#selAll').onclick=()=>{items.forEach(i=>{if(!i.el.hidden)selected.add(i.id)});syncSelUI()};
$('#selTodo').onclick=()=>{filter='todo';document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c.dataset.f==='todo'));applyFilter();selected.clear();items.forEach(i=>{if(!complete(i))selected.add(i.id)});syncSelUI()};
$('#sortD').onclick=()=>{const k=it=>{const d=DIST(it.d);return d?d[2]*10+(30-d[1])*.01:99999};items.sort((a,b)=>k(a)-k(b));page=0;animNext=true;renderLib();draw()};
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{filter=c.dataset.f;document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===c));applyFilter()});
$('#q').oninput=applyFilter;

/* ---------- theme / shape / scope / settings ---------- */
function setDesc(){const d=$('#themeDesc');d.classList.remove('in');setTimeout(()=>{d.textContent=THEME_TXT[theme()];d.classList.add('in')},160)}
const pageOfSel=()=>{const o=selOne(),i=o?album().indexOf(o):-1;return i>=0?Math.floor(i/per()):0};
document.querySelectorAll('[name=theme]').forEach(r=>r.onchange=()=>{document.body.dataset.theme=theme();page=pageOfSel();items.forEach(want);animNext=true;setDesc();syncSelUI();draw()});
document.querySelectorAll('[name=shape]').forEach(r=>r.onchange=()=>{shape=r.value;animNext=true;draw()});
DIVISIONS.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=`${d} বিভাগ`;$('#scope').append(o)});
function autoTitle(){if(!titleEdited)$('#title').value=scope?`${scope} বিভাগের আনাচে-কানাচে`:DEFAULT_TITLE}
$('#scope').onchange=e=>{scope=e.target.value;autoTitle();selected.clear();page=0;animNext=true;updateOut();syncSelUI();draw()};
const palBox=$('#palBox');palBox.innerHTML='<span class="pal-t">রঙের থিম</span>'+Object.entries(PALS).map(([k,v])=>`<label><input type="radio" name="pal" value="${k}"${k===pal?' checked':''}><i style="--a:${v.bg};--b:${v.base};--c:${v.visited};--d:${v.line}"></i><span>${v.name}</span></label>`).join('');
document.querySelectorAll('[name=pal]').forEach(r=>r.onchange=()=>{pal=r.value;animNext=true;draw()});
$('#perMap').onchange=e=>{perMap=+e.target.value;page=0;animNext=true;draw()};
$('#title').oninput=()=>{titleEdited=true;draw()};$('#gsize').oninput=e=>{G=e.target.value/100;draw()};
$('#prev').onclick=()=>{page=Math.max(0,page-1);animNext=true;draw()};
$('#next').onclick=()=>{page=Math.min(pageCount()-1,page+1);animNext=true;draw()};
document.body.dataset.theme=theme();$('#themeDesc').textContent=THEME_TXT[theme()];

/* ---------- place lookup (OpenStreetMap Nominatim, free, 1 request/second; one lookup per unique place) ---------- */
let cache={};try{cache=JSON.parse(localStorage.getItem('geo')||'{}')}catch{}
const memo={},keyOf=it=>it.place.trim()&&it.d?it.place.trim()+'|'+it.d:'';
let q=[],busy=0;
function want(it){
  if(theme()!=='map')return;
  const k=keyOf(it);if(!k||memo[k]||q.includes(k))return;
  if(cache[k]){memo[k]=cache[k];return draw()}
  q.push(k);pump();draw();
}
async function pump(){
  if(busy)return;busy=1;
  while(q.length){
    const pk=new Set(curItems().map(keyOf)),i=q.findIndex(k=>pk.has(k)),k=q.splice(i<0?0:i,1)[0],j=k.lastIndexOf('|');
    memo[k]=await locate(k,k.slice(0,j),k.slice(j+1));draw();
  }
  busy=0;draw();
}
async function locate(k,pl,dn){
  const di=DI[dn];
  try{
    const b=bbox(di),l=b.x0/91.64+88-.02,r=b.x1/91.64+88+.02,t=26.7-b.y0/100+.02,bt=26.7-b.y1/100-.02;
    const res=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=bd&accept-language=bn&bounded=1&viewbox='+[l,t,r,bt].join(',')+'&q='+encodeURIComponent(`${pl}, ${dn} জেলা, বাংলাদেশ`));
    const j=await res.json();await sleep(1100);
    for(const h of j){ // accept only results inside (or within ~4 km of) the chosen district
      const[x,y]=proj({lat:+h.lat,lng:+h.lon});
      if(inside(di,x,y)||nearest(di,x,y).d<=4){const v={lat:+h.lat,lng:+h.lon,found:1};cache[k]=v;try{localStorage.setItem('geo',JSON.stringify(cache))}catch{}return v}
    }
  }catch{}
  return{found:0};
}

/* ---------- drawing ---------- */
const mk=(w,h,bg='#fff')=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,h);x.fillStyle='#000';x.textAlign='center';return[c,x]};
function fit(x,t,cx,y,maxW,size,min,col='#000',al='center'){x.textAlign=al;x.fillStyle=col;x.font=`800 ${size}px ${FONT}`;while(x.measureText(t).width>maxW&&size>min){size-=2;x.font=`800 ${size}px ${FONT}`}x.fillText(t,cx,y);x.textAlign='center'}
function albumStats(A){ // districts visited and distinct named places across the WHOLE album (all pages)
  const total=scope?DDIVI.filter(d=>d===scope).length:MAP.districts.length;
  const ds=new Set(A.map(i=>i.d).filter(Boolean)),pl=new Set(A.filter(i=>i.place.trim()).map(i=>i.place.trim().normalize('NFC').toLowerCase()+'|'+i.d));
  return{visited:ds.size,total,places:pl.size};
}
function statLine(x,label,num,suf,px,y){
  x.textAlign='left';x.fillStyle=PAL().title;
  x.font=`700 46px ${FONT}`;x.fillText(label+' ',px,y);let w=px+x.measureText(label+' ').width;
  x.font=`800 72px ${FONT}`;x.fillText(num,w,y+3);w+=x.measureText(num).width;
  x.font=`700 46px ${FONT}`;x.fillText(suf,w,y);x.textAlign='center';
}
function brand(x,W,cy){
  const P=PAL(),t='গন্তব্যহীন';x.font=`800 104px ${FONT}`;const w=x.measureText(t).width,px=W/2-w/2;
  x.save();x.globalAlpha=.55;x.fillStyle=P.pillBg;x.beginPath();x.roundRect(px-46,cy-84,w+92,152,30);x.fill();x.restore();
  const g=x.createLinearGradient(px,0,px+w,0);g.addColorStop(0,P.line);g.addColorStop(1,P.visited);
  x.fillStyle=g;x.textAlign='center';x.fillText(t,W/2,cy+34);
}
function foot(x,W,H,p,n,col){if(n<2)return;x.fillStyle=col;x.font=`700 32px ${FONT}`;x.textAlign='center';x.fillText(`পাতা ${bn(p+1)} / ${bn(n)}`,W/2,H-18)}
function shapePath(sh,px,py,w,h){
  const p=new Path2D();
  if(sh==='circle')p.ellipse(px+w/2,py+h/2,w/2,h/2,0,0,7);else p.roundRect(px,py,w,h,w*.16);
  return p;
}
function card(x,img,px,py,w,h,fancy,sh='rect',cr={}){ // cr = {z: zoom, fx/fy: where the photo sits inside the shape}
  const path=shapePath(sh,px,py,w,h);
  if(fancy){x.save();x.shadowColor='rgba(20,56,43,.3)';x.shadowBlur=22;x.shadowOffsetY=8;x.fillStyle=PAL().cardEdge;x.fill(path);x.restore()}
  const s=Math.max(w/img.width,h/img.height)*(cr.z||1),iw=img.width*s,ih=img.height*s;
  x.save();x.clip(path);x.drawImage(img,px+(w-iw)*(cr.fx??.5),py+(h-ih)*(cr.fy??.3),iw,ih);x.restore();
  if(fancy){x.lineWidth=5;x.lineJoin='round';x.strokeStyle=PAL().cardEdge;x.stroke(path)}
  return{iw,ih};
}
function pill(x,t,cx,cy,maxW,size){ // place name as a small label on the card
  let w;do{x.font=`800 ${size}px ${FONT}`;w=x.measureText(t).width+22;size--}while(w>maxW&&size>10);
  const h=size*1.8+6;x.save();x.shadowColor='rgba(0,0,0,.22)';x.shadowBlur=9;x.shadowOffsetY=2;x.fillStyle=PAL().pillBg;x.beginPath();x.roundRect(cx-w/2,cy-h/2,w,h,h/2);x.fill();x.restore();
  x.fillStyle=PAL().pillInk;x.textAlign='center';x.textBaseline='middle';x.fillText(t,cx,cy+1);x.textBaseline='alphabetic';
}
const chunk=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,i*n+n));
const rowX=(n,w,gap,W)=>Array.from({length:n},(_,i)=>(W-n*w-(n-1)*gap)/2+i*(w+gap));
function drawGrid(list,t,p,pages){
  const W=1820,rows=chunk(list,5),H=380+(rows.length-1)*880+790+(pages>1?50:0),[c,x]=mk(W,H,PAL().plain);c._rects=[];
  fit(x,t,W/2,170,W-120,100,30,PAL().ink);
  rows.forEach((r,ri)=>rowX(r.length,345,15,W).forEach((px,i)=>{const top=380+ri*880,o=r[i];if(o.place)fit(x,o.place,px+172.5,top-25,340,56,12,PAL().ink);const g=card(x,o.img,px,top,345,760,false,'rect',o);c._rects.push({id:o.id,x:px,y:top,w:345,h:760,iw:g.iw,ih:g.ih,rad:345*.16})}));
  foot(x,W,H,p,pages,PAL().footPlain);return c;
}
function drawSlides(list,p,pages){
  const[c,x]=mk(1920,1080,PAL().plain);c._rects=[];
  rowX(list.length,360,18,1920).forEach((px,i)=>{const o=list[i];if(o.place)fit(x,o.place,px+180,150,350,56,12,PAL().ink);const g=card(x,o.img,px,170,360,800,false,'rect',o);c._rects.push({id:o.id,x:px,y:170,w:360,h:800,iw:g.iw,ih:g.ih,rad:360*.16})});
  foot(x,1920,1080,p,pages,PAL().footPlain);return c;
}
function crossing(a,b,c,d){const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0}
const ram=(a,b)=>Math.PI*(3*(a+b)-Math.sqrt((3*a+b)*(a+3*b))); // ellipse perimeter
function drawMap(list,t,visited,pg,pages,st){
  const W=1900,n=list.length,m=50,titleH=210,V=viewOf(scope),rho=Math.max(.8,Math.min(1.25,Math.sqrt(V.w/V.h))),circ=shape==='circle';
  const Rx0=(W-2*m-240)/2,d=Math.min(circ?300:280,.9*ram(Rx0,Rx0/rho)/Math.max(n,3));
  list.forEach(o=>{const f=o.size*G;o.w=(circ?d:d*.78)*f;o.h=(circ?d:d*1.05)*f});
  const ext=Math.max(200,...list.map(o=>Math.max(o.w,o.h))),Rx=(W-2*m-ext)/2,Ry=Rx/rho,cx=W/2,cy=titleH+ext/2+Ry,H=Math.round(titleH+ext+2*Ry+230),[c,x]=mk(W,H,PAL().bg);
  const ax=Rx-ext/2-26,ay=Ry-ext/2-26,s=Math.min(8,(scope?1:1.12)/Math.hypot(V.w/2/ax,V.h/2/ay)),ox=cx-(V.x0+V.w/2)*s,oy=cy-(V.y0+V.h/2)*s;
  fit(x,t,44,128,W-90,112,36,PAL().title,'left');
  statLine(x,'জেলাঃ',bn(st.visited),'/'+bn(st.total),48,208);
  if(st.places)statLine(x,'স্থানঃ',bn(st.places),' টি',48,272);
  list.forEach(o=>{if(o.pt){o.mx=ox+o.pt.x*s;o.my=oy+o.pt.y*s}});
  // slots on the ring, clockwise from the top
  const N=Math.max(n,1),S=Array.from({length:N},(_,k)=>{const a=-Math.PI/2+2*Math.PI*k/N;return[cx+Rx*Math.cos(a),cy+Ry*Math.sin(a)]});
  const ang=o=>(Math.atan2((o.my-cy)/Ry,(o.mx-cx)/Rx)+Math.PI/2+4*Math.PI)%(2*Math.PI);
  const seq=[...list.filter(o=>o.pt).sort((a,b)=>ang(a)-ang(b)),...list.filter(o=>!o.pt)],ord=new Array(n);
  let bestR=0,bestC=1e18;
  for(let r=0;r<n;r++){let cost=0;seq.forEach((o,k)=>{if(o.pt){const q=S[(k+r)%n];cost+=(q[0]-o.mx)**2+(q[1]-o.my)**2}});if(cost<bestC){bestC=cost;bestR=r}}
  seq.forEach((o,k)=>{ord[(k+bestR)%n]=o});
  const score=()=>{let k=0,l=0;for(let i=0;i<n;i++){const a=ord[i];if(!a.pt)continue;l+=Math.hypot(S[i][0]-a.mx,S[i][1]-a.my);for(let j=i+1;j<n;j++){const b=ord[j];if(b.pt&&crossing(S[i],[a.mx,a.my],S[j],[b.mx,b.my]))k++}}return[k,l]};
  let best=score();
  for(let pass=0;pass<40&&n>2;pass++){let imp=0;for(let i=0;i<n;i++){const j=(i+1)%n;[ord[i],ord[j]]=[ord[j],ord[i]];const sc=score();if(sc[0]<best[0]||(sc[0]===best[0]&&sc[1]<best[1]-1e-6)){best=sc;imp=1}else[ord[i],ord[j]]=[ord[j],ord[i]]}if(!imp)break}
  if(!n){x.save();x.setLineDash([16,14]);x.strokeStyle=PAL().dash;x.lineWidth=4;x.beginPath();x.ellipse(cx,cy,Rx,Ry,0,0,7);x.stroke();x.restore()}
  x.save();x.translate(ox,oy);x.scale(s,s);x.strokeStyle=PAL().edge;x.lineWidth=1.1/s;x.lineJoin='round';
  DP.forEach((p,i)=>{if(scope&&DDIVI[i]!==scope)return;x.fillStyle=visited.has(DN[i])?PAL().visited:PAL().base;x.fill(p);x.stroke(p)});x.restore();
  x.strokeStyle=PAL().line;x.lineWidth=3;x.lineCap='round';
  ord.forEach((o,i)=>{if(!o.pt)return;x.beginPath();x.moveTo(S[i][0],S[i][1]);x.lineTo(o.mx,o.my);x.stroke()}); // cards are drawn on top, hiding the inner part
  c._rects=[];c._map={x:ox+V.x0*s,y:oy+V.y0*s,w:V.w*s,h:V.h*s,V,scope};
  if(!n){x.fillStyle=PAL().hint;x.font=`700 40px ${FONT}`;x.textAlign='center';x.fillText('এখানে আপনার ছবিগুলো বসবে',cx,titleH+60)}
  ord.forEach((o,i)=>{
    const px=S[i][0]-o.w/2,py=S[i][1]-o.h/2,g=card(x,o.img,px,py,o.w,o.h,true,shape,o);
    c._rects.push({id:o.id,x:px,y:py,w:o.w,h:o.h,iw:g.iw,ih:g.ih,rad:circ?'c':o.w*.16});
    if(o.place)pill(x,o.place,S[i][0],py+o.h-(circ?o.h*.2:o.h*.09),circ?o.w*.82:o.w*.94,Math.max(15,Math.min(34,o.w*.14)));
  });
  ord.forEach(o=>{if(o.pt){x.beginPath();x.arc(o.mx,o.my,8,0,7);x.fillStyle=PAL().line;x.fill();x.strokeStyle=PAL().ring;x.lineWidth=2.5;x.stroke()}});
  brand(x,W,H-115);
  if(pages>1){x.font=`700 30px ${FONT}`;x.textAlign='right';x.fillStyle=PAL().foot;x.fillText(`পাতা ${bn(pg+1)} / ${bn(pages)}`,W-50,H-40);x.textAlign='center'}
  return c;
}
function pointsFor(slice,list){ // every point is forced inside its district; photos sharing a spot are fanned out *inside* it
  const seen=[];
  slice.forEach((it,j)=>{
    const di=DI[it.d];if(di==null)return;
    const m=memo[keyOf(it)];let x,y;
    if(m&&m.found){[x,y]=proj(m)}else{const pl=pole(di);x=pl.x;y=pl.y}
    ({x,y}=constrain(di,x,y));
    const n=seen.filter(s=>Math.hypot(s[0]-x,s[1]-y)<4).length;seen.push([x,y]);
    if(n){let r=4+1.8*n,a=n*2.4;for(let k=0;k<10;k++){const nx=x+Math.cos(a)*r,ny=y+Math.sin(a)*r;if(inside(di,nx,ny)){x=nx;y=ny;break}r*=.75;a+=.8}}
    list[j].pt={x,y};
  });
}
async function buildPage(th,p,t){
  const P=th==='map'?perMap:th==='grid'?10:5,A=album(),pages=Math.max(1,Math.ceil(A.length/P)),slice=A.slice(p*P,p*P+P);
  const imgs=await Promise.all(slice.map(bitmap));
  const list=slice.map((it,j)=>({id:it.id,place:it.place.trim(),img:imgs[j],size:it.size/100,z:it.zoom,fx:it.fx,fy:it.fy,pt:null}));
  if(th==='map'){pointsFor(slice,list);return drawMap(list,t,new Set(A.map(i=>i.d).filter(Boolean)),p,pages,albumStats(A))}
  return th==='grid'?drawGrid(list,t,p,pages):drawSlides(list,p,pages);
}

/* ---------- map overlay + select/resize a photo on the preview ---------- */
const selEl=document.createElement('div');selEl.className='selbox';selEl.innerHTML='<i class="hd" aria-hidden="true"></i>';
const mapCanvas=()=>document.querySelector('#out canvas');
function place(){
  const c=mapCanvas();
  if(!c){ov.remove();selEl.remove();return}
  const k=c.clientWidth/c.width,par=c.parentNode,one=selOne(),m=c._map;
  if(m){
    if(ov.parentNode!==par)par.append(ov);
    ov.setAttribute('viewBox',`${m.V.x0} ${m.V.y0} ${m.V.w} ${m.V.h}`);
    ovPaths.forEach((p,i)=>{p.style.display=!m.scope||DDIVI[i]===m.scope?'':'none'});
    Object.assign(ov.style,{left:m.x*k+'px',top:m.y*k+'px',width:m.w*k+'px',height:m.h*k+'px'});
  }else ov.remove();
  const r=one&&c._rects&&c._rects.find(r=>r.id===one.id);
  if(!r){selEl.remove();return}
  if(selEl.parentNode!==par)par.append(selEl);
  Object.assign(selEl.style,{left:r.x*k+'px',top:r.y*k+'px',width:r.w*k+'px',height:r.h*k+'px',borderRadius:r.rad==='c'?'50%':r.rad*k+'px'});
  if(needReveal&&MOBILE.matches&&selEl.offsetWidth){needReveal=false;setTimeout(keepVisible,90)}
}
function keepVisible(){ // keep the tapped photo visible above the details sheet
  if(!selEl.isConnected||!selEl.offsetWidth)return;
  const r=selEl.getBoundingClientRect(),top=78,bot=innerHeight-$('#editor').offsetHeight-10;
  if(r.top<top||r.bottom>bot)scrollBy({top:(r.top+r.bottom)/2-(top+bot)/2,behavior:'smooth'});
}
function pick(e){
  const c=e.currentTarget,b=c.getBoundingClientRect(),x=(e.clientX-b.left)/b.width*c.width,y=(e.clientY-b.top)/b.height*c.height;
  const hit=c._rects.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
  selected.clear();if(hit)selected.add(hit.id);needReveal=!!hit;syncSelUI();
  const it=selOne();if(it&&it.el&&!MOBILE.matches)it.el.scrollIntoView({block:'nearest',behavior:'smooth'});
}
selEl.querySelector('.hd').addEventListener('pointerdown',e=>{
  e.preventDefault();const it=selOne(),c=mapCanvas(),r=c._rects.find(r=>r.id===it.id),sw=r.w*c.clientWidth/c.width,x0=e.clientX,s0=it.size;
  const mv=ev=>{it.size=Math.round(Math.min(200,Math.max(50,s0*(sw+ev.clientX-x0)/sw)));$('#ssize').value=it.size;$('#eSize').value=it.size;draw()};
  const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up)};
  addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up);
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ptrs=new Map();let gest=null;
selEl.addEventListener('pointerdown',e=>{
  if(e.target.closest('.hd')||(e.pointerType==='mouse'&&e.button>0))return;
  const it=selOne(),c0=mapCanvas(),r0=it&&c0&&c0._rects&&c0._rects.find(r=>r.id===it.id);if(!r0)return;
  e.preventDefault();ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  const dist=()=>{const[a,b]=[...ptrs.values()];return Math.hypot(a[0]-b[0],a[1]-b[1])||1};
  const start=()=>{
    if(ptrs.size>=2){gest={mode:'pinch',d0:dist(),z0:it.zoom};return}
    const cc=mapCanvas(),rr=cc._rects.find(x=>x.id===it.id)||r0,[p]=[...ptrs.values()];
    gest={mode:'pan',x0:p[0],y0:p[1],fx0:it.fx,fy0:it.fy,sx:rr.iw-rr.w,sy:rr.ih-rr.h,k:cc.clientWidth/cc.width};
  };
  start();selEl.classList.add('drag');
  if(ptrs.size>1)return; // move/up listeners were attached by the first finger
  const mv=ev=>{
    if(!ptrs.has(ev.pointerId)||!gest)return;ptrs.set(ev.pointerId,[ev.clientX,ev.clientY]);
    if(gest.mode==='pinch')it.zoom=clamp(gest.z0*dist()/gest.d0,1,4);
    else{const[p]=[...ptrs.values()];if(gest.sx>1)it.fx=clamp(gest.fx0-(p[0]-gest.x0)/gest.k/gest.sx,0,1);if(gest.sy>1)it.fy=clamp(gest.fy0-(p[1]-gest.y0)/gest.k/gest.sy,0,1)}
    draw();
  };
  const up=ev=>{
    ptrs.delete(ev.pointerId);if(ptrs.size){start();return}
    selEl.classList.remove('drag');removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);
  };
  addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up);
});
selEl.addEventListener('wheel',e=>{e.preventDefault();const it=selOne();if(!it)return;it.zoom=clamp(it.zoom*Math.exp(-e.deltaY*.0015),1,4);$('#szoom').value=Math.round(it.zoom*100);draw()},{passive:false});
$('#szoom').oninput=e=>{const o=selOne();if(o){o.zoom=e.target.value/100;draw()}};
$('#sreset').onclick=()=>{const o=selOne();if(o){o.zoom=1;o.fx=.5;o.fy=.3;$('#szoom').value=100;draw()}};
$('#ssize').oninput=e=>{const o=selOne();if(o){o.size=+e.target.value;$('#eSize').value=o.size;draw()}};
$('#desel').onclick=()=>{selected.clear();syncSelUI()};
addEventListener('resize',place);

/* ---------- live preview + downloads ---------- */
const fonts=Promise.all([document.fonts.load(`800 40px ${FONT}`,'অ A'),document.fonts.load(`700 40px ${FONT}`,'অ A')]);
let raf,tok=0;
const titleText=()=>$('#title').value.trim()||DEFAULT_TITLE;
function draw(){cancelAnimationFrame(raf);raf=requestAnimationFrame(render)}
async function render(){
  const my=++tok;await fonts;if(my!==tok)return;
  const out=$('#out'),th=theme(),n=pageCount(),A=album(),outN=items.length-A.length;
  if(page>=n)page=n-1;
  $('#scopeNote').textContent=scope&&outN?`${bn(outN)}টি ছবি এই বিভাগের বাইরে (বা জেলা বাছা হয়নি) — অ্যালবামে আসবে না।`:'';
  $('#pager').hidden=n<2;$('#pageInfo').textContent=`পাতা ${bn(page+1)} / ${bn(n)}`;$('#prev').disabled=page<=0;$('#next').disabled=page>=n-1;
  if(!A.length&&th!=='map'){const p=document.createElement('p');p.className='empty';p.textContent=scope&&items.length?'এই বিভাগের কোনো ছবি নেই — ছবির জেলা বাছুন।':'ছবি যোগ করলেই এখানে অ্যালবামের লাইভ প্রিভিউ দেখা যাবে।';out.replaceChildren(p);say('');syncSelUI();return}
  const c=await buildPage(th,page,titleText());if(my!==tok)return;
  let w=out.querySelector(':scope > .pg'),box=w&&w.querySelector('.pgbox');
  if(!w){w=document.createElement('div');w.className='pg';box=document.createElement('div');box.className='pgbox';w.append(box);out.replaceChildren(w)}
  c.className='pick';c.onclick=pick;
  const old=box.querySelector('canvas');old?old.replaceWith(c):box.prepend(c);
  if(animNext){w.classList.remove('enter');void w.offsetWidth;w.classList.add('enter')}
  w.querySelectorAll(':scope > .dls').forEach(x=>x.remove());
  if(A.length){
    const row=document.createElement('div');row.className='dls';
    const b=document.createElement('button');b.type='button';b.className='cta';b.textContent=n>1?'এই পাতা ডাউনলোড':'ডাউনলোড করুন';b.onclick=()=>downloadPage(c,th);row.append(b);
    if(n>1){const z=document.createElement('button');z.type='button';z.className='ghost';z.textContent=`সব ${bn(n)}টি পাতা (ZIP)`;z.onclick=()=>downloadAll(z);row.append(z)}
    w.append(row);
  }
  animNext=false;
  const miss=th==='map'?A.filter(it=>memo[keyOf(it)]&&!memo[keyOf(it)].found).length:0,pend=q.length+busy;
  if(notice)say(notice,noticeBad);
  else if(th==='map'&&pend)say(`জায়গা খোঁজা হচ্ছে… (বাকি ${bn(pend)}টি)`);
  else if(miss)say(`${bn(miss)}টি জায়গা খুঁজে পাওয়া যায়নি — জেলার ঠিক মাঝখানে বসানো হয়েছে।`);
  else say('');
  syncSelUI();
}
function say(t,err){const s=$('#status');s.textContent=t;s.className=err?'err':''}
function problem(all){
  const sc=all?album():curItems(),bad=theme()==='map'?sc.filter(it=>!it.d):[];
  items.forEach(it=>it.el&&it.el.classList.toggle('bad',bad.includes(it)));
  if(bad.length){bad[0].el.scrollIntoView({block:'nearest',behavior:'smooth'});return`${bn(bad.length)}টি ছবির জেলা বাছা হয়নি — মানচিত্রে বসাতে জেলা লাগবে (লাল ঘেরা ছবিগুলো দেখুন)।`}
  if(theme()==='map'&&sc.some(it=>keyOf(it)&&!memo[keyOf(it)]))return'জায়গা খোঁজা চলছে — একটু অপেক্ষা করুন।';
  return'';
}
function downloadPage(c,th){const p=problem(false);if(p)return say(p,1);c.toBlob(bl=>saveBlob(bl,`gontobbohin-${th}-${String(page+1).padStart(2,'0')}.png`))}
async function downloadAll(btn){
  const p=problem(true);if(p)return say(p,1);
  btn.disabled=true;const th=theme(),n=pageCount(),files=[];
  for(let i=0;i<n;i++){
    say(`পাতা ${bn(i+1)} / ${bn(n)} তৈরি হচ্ছে…`);
    const c=await buildPage(th,i,titleText()),b=await toBlob(c,'image/png');
    files.push({name:`page-${String(i+1).padStart(2,'0')}.png`,data:new Uint8Array(await b.arrayBuffer())});
    await sleep(0);
  }
  saveBlob(zip(files),`gontobbohin-${th}.zip`);say(`${bn(n)}টি পাতার ZIP তৈরি হয়েছে।`);btn.disabled=false;
}
$('#bigbtn').onclick=()=>{
  const c=mapCanvas();if(!c)return;
  const n=document.createElement('canvas');n.width=c.width;n.height=c.height;n.getContext('2d').drawImage(c,0,0);
  $('#bigOut').replaceChildren(n);$('#big').showModal();
};
$('#bigclose').onclick=()=>$('#big').close();

/* ---------- .pix project files ---------- */
const snap=()=>JSON.stringify([items.map(i=>[i.id,i.place,i.d,i.size,i.zoom,i.fx,i.fy]),$('#title').value,theme(),perMap,G,shape,scope,pal]);
let savedSnap=snap();
addEventListener('beforeunload',e=>{if(items.length&&snap()!==savedSnap){e.preventDefault();e.returnValue=''}});
$('#savePix').onclick=async()=>{
  if(!items.length)return flash('আগে কিছু ছবি যোগ করুন, তারপর সেভ করুন।');
  const btn=$('#savePix');btn.disabled=true;
  const meta={format:'pix',version:3,app:'gontobbohin',saved:new Date().toISOString(),title:$('#title').value,titleEdited,theme:theme(),shape,scope,palette:pal,perMap,gsize:G,photos:[],geo:{}},files=[];
  for(const[i,it]of items.entries()){
    const name=`images/${String(i+1).padStart(3,'0')}.jpg`;
    files.push({name,data:new Uint8Array(await it.blob.arrayBuffer())});
    meta.photos.push({file:name,place:it.place,d:it.d,size:it.size,zoom:+it.zoom.toFixed(3),fx:+it.fx.toFixed(3),fy:+it.fy.toFixed(3)});
    const k=keyOf(it);if(k&&cache[k])meta.geo[k]=cache[k];
  }
  files.unshift({name:'project.json',data:new TextEncoder().encode(JSON.stringify(meta))});
  saveBlob(zip(files),`gontobbohin-${new Date().toISOString().slice(0,10)}.pix`);
  savedSnap=snap();btn.disabled=false;flash(`${bn(items.length)}টি ছবিসহ প্রজেক্ট সেভ হয়েছে।`,false);
};
$('#openPix').onclick=()=>$('#pixIn').click();
$('#pixIn').onchange=async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  try{
    const z=unzip(await f.arrayBuffer()),meta=JSON.parse(new TextDecoder().decode(z['project.json']));
    if(meta.format!=='pix'||!Array.isArray(meta.photos))throw 0;
    if(items.length&&snap()!==savedSnap&&!confirm('বর্তমান কাজ সেভ করা নেই — খুললে তা বদলে যাবে। চালিয়ে যাবেন?'))return;
    removeItems(new Set(items.map(i=>i.id)));
    const fresh=[];prog(0,meta.photos.length);
    for(const[i,p]of meta.photos.entries()){
      if(z[p.file])fresh.push(await makeItem(new Blob([z[p.file]],{type:'image/jpeg'}),false,{place:String(p.place||''),d:String(p.d||''),size:+p.size||100,zoom:clamp(+p.zoom||1,1,4),fx:clamp(p.fx==null?.5:+p.fx,0,1),fy:clamp(p.fy==null?.3:+p.fy,0,1)}));
      prog(i+1,meta.photos.length);await sleep(0);
    }
    prog(0,0);items=fresh;selected.clear();page=0;
    titleEdited=!!meta.titleEdited;$('#title').value=meta.title||DEFAULT_TITLE;G=+meta.gsize||1;$('#gsize').value=G*100;perMap=[8,12,16,20,24].includes(+meta.perMap)?+meta.perMap:16;$('#perMap').value=perMap;
    scope=DIVISIONS.includes(meta.scope)?meta.scope:'';$('#scope').value=scope;
    const sr=document.querySelector(`[name=shape][value=${SHAPES[meta.shape]?meta.shape:'rect'}]`);sr.checked=true;shape=sr.value;pal=PALS[meta.palette]?meta.palette:'classic';document.querySelector(`[name=pal][value=${pal}]`).checked=true;
    const r=document.querySelector(`[name=theme][value=${meta.theme}]`)||document.querySelector('[name=theme][value=map]');r.checked=true;document.body.dataset.theme=theme();setDesc();
    Object.assign(cache,meta.geo||{});try{localStorage.setItem('geo',JSON.stringify(cache))}catch{}
    animNext=true;renderLib();items.forEach(want);draw();if(MOBILE.matches)setTab('preview');savedSnap=snap();flash(`${bn(items.length)}টি ছবিসহ প্রজেক্ট খোলা হয়েছে।`,false);
  }catch{prog(0,0);flash('ফাইলটি সঠিক .pix নয় বা নষ্ট হয়ে গেছে।')}
};
/* ---------- phone workspace: tabs + details sheet ---------- */
const sheetHost=$('#sheetHost');
function setTab(t,scroll=true){
  document.body.dataset.tab=t;
  document.querySelectorAll('#mtabs button').forEach(b=>{const on=b.dataset.tab===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  if(MOBILE.matches){requestAnimationFrame(()=>{draw();place()});if(scroll)$('#builder .work').scrollIntoView({behavior:'smooth',block:'start'})}
}
document.querySelectorAll('#mtabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('#toPreview').onclick=$('#toPreview2').onclick=()=>setTab('preview');
document.querySelector('.bar a[href="#preview"]').addEventListener('click',e=>{if(MOBILE.matches){e.preventDefault();setTab('preview')}});
new IntersectionObserver(es=>document.body.classList.toggle('in-studio',es[0].isIntersecting)).observe($('#builder'));
function placeEditor(){ // on phones the editor becomes a bottom sheet; on desktop it sits in the library as before
  const ed=$('#editor');
  if(MOBILE.matches){if(ed.parentNode!==sheetHost)sheetHost.append(ed)}
  else{if(ed.parentNode===sheetHost)$('#tiles').before(ed);document.body.classList.remove('sheet-open')}
  syncSelUI();
}
MOBILE.addEventListener('change',placeEditor);
function stepPhoto(d){
  const A=album();if(!A.length)return;const i=A.indexOf(selOne()||A[0]),nx=A[(i+d+A.length)%A.length];
  selected.clear();selected.add(nx.id);anchor=nx.id;needReveal=true;syncSelUI();goTo(nx);
}
$('#ePrev').onclick=()=>stepPhoto(-1);$('#eNext').onclick=()=>stepPhoto(1);
$('#eDone').onclick=()=>{selected.clear();syncSelUI()};
$('#eZoom').oninput=e=>{eachSel(it=>{it.zoom=e.target.value/100});draw()};
$('#eReset').onclick=()=>{eachSel(it=>{it.zoom=1;it.fx=.5;it.fy=.3});draw();syncSelUI()};
$('#mAdd').onclick=()=>$('#files').click();
$('#mTodo').onclick=()=>{ // guided: jump to the first photo that still needs a district
  const nx=items.find(i=>!i.d);if(!nx)return;
  selected.clear();selected.add(nx.id);anchor=nx.id;needReveal=true;syncSelUI();goTo(nx);setTimeout(()=>eDist.focus(),450);
};
if(window.visualViewport){ // lift the sheet above the on-screen keyboard
  const vv=visualViewport,f=()=>{const r=document.documentElement.style;r.setProperty('--kb',Math.max(0,innerHeight-vv.height-vv.offsetTop)+'px');r.setProperty('--vvh',vv.height+'px')};
  vv.addEventListener('resize',f);vv.addEventListener('scroll',f);f();
}
placeEditor();setTab('photos',false);
syncSelUI();draw();

