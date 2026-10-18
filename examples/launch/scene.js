/* Authored demonstration graphics. No generated media is implied by the bundled samples. */
const C = window.MOTION_CONFIG, W = C.width, H = C.height, portrait = H > W, square = H === W;
document.documentElement.style.setProperty('--w', W + 'px');
document.documentElement.style.setProperty('--h', H + 'px');
document.documentElement.style.setProperty('--ratio', `${W}/${H}`);
if (new URLSearchParams(location.search).has('play')) document.body.classList.add('preview');
const canvas = document.querySelector('#film'); canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');
const { ease, clamp, lerp } = HB;
const paper = '#f7f5ef', ink = '#222221', red = '#c3092d';
const scale = W / (portrait ? 720 : 1280), pad = (portrait ? 54 : 70) * scale;
const unit = scale;
const image = src => new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error('Image did not load: ' + src)); im.src = src; });
const media = { mark: null, logo: null, image: null, video: null };
const ready = (async () => {
  await document.fonts.load('700 48px Manrope');
  [media.mark, media.logo] = await Promise.all([image('./assets/brand/raywake-mark.svg'), image('./assets/brand/raywake-logo-light.svg')]);
  if (C.media?.image) media.image = await image(C.media.image);
  if (C.media?.video) {
    media.video = document.createElement('video'); media.video.muted = true; media.video.preload = 'auto'; media.video.playsInline = true;
    await new Promise((yes, no) => { media.video.onloadeddata = yes; media.video.onerror = () => no(new Error('Video did not load.')); media.video.src = C.media.video; });
  }
})();
function rounded(x,y,w,h,r=12*unit){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function text(value,x,y,size,color=ink,weight=700,align='left') {
  ctx.font=`${weight} ${size}px Manrope`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(value,x,y);
}
function cover(im,x,y,w,h){const iw=im.videoWidth||im.width,ih=im.videoHeight||im.height,s=Math.max(w/iw,h/ih);ctx.drawImage(im,x+(w-iw*s)/2,y+(h-ih*s)/2,iw*s,ih*s);}
function enter(t,start,d=.8){return ease.outQuart(clamp((t-start)/d));}
function caption(value,x,y){text(value,x,y,17*unit,'#68645f',500);}
function drawLandscape(x,y,w,h,t,mode){
 ctx.save();rounded(x,y,w,h);ctx.clip();ctx.fillStyle=mode==='image'?'#d7e8e2':'#cddced';ctx.fillRect(x,y,w,h);
 const move=mode==='image'?0:Math.sin(t*.7)*w*.09;
 ctx.fillStyle='#f7ba58';ctx.beginPath();ctx.arc(x+w*.7+move,y+h*.3,h*.16,0,Math.PI*2);ctx.fill();
 for(let i=0;i<3;i++){ctx.fillStyle=['#789f8c','#416d61','#234d42'][i];ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x,y+h*(.54+i*.12));ctx.bezierCurveTo(x+w*.33,y+h*(.3+i*.15),x+w*.7,y+h*(.9-i*.12),x+w,y+h*(.45+i*.2));ctx.lineTo(x+w,y+h);ctx.fill();}
 ctx.restore();
}
function tile(kind,x,y,w,h,t,index){
 ctx.save();const p=enter(t,3.05+index*.18);ctx.translate(x,y+(1-p)*60*unit);ctx.globalAlpha=p;
 if(kind==='image'&&media.image){rounded(0,0,w,h);ctx.clip();cover(media.image,0,0,w,h);}
 else if(kind==='video'&&media.video){rounded(0,0,w,h);ctx.clip();cover(media.video,0,0,w,h);}
 else if(kind==='audio'){
  rounded(0,0,w,h);ctx.fillStyle='#e3c6cc';ctx.fill();ctx.fillStyle=red;
  const bars=44,step=w/(bars+6);
  for(let j=0;j<bars;j++){let v=.18+.55*Math.abs(Math.sin(j*.34+t*1.5)*Math.sin(j*.14-t*.9));const bh=v*h*.67;rounded(step*(j+3),h*.5-bh/2,Math.max(2,step*.42),bh,step*.21);ctx.fill();}
 }else drawLandscape(0,0,w,h,t,kind);
 ctx.restore();
}
async function seekVideo(t){
 if(!media.video)return;
 const duration=media.video.duration;if(!Number.isFinite(duration)||duration<=0)throw new Error('Video duration is invalid.');
 const target=Math.min(duration-.03,Math.max(0,(t-3)%duration));
 if(Math.abs(media.video.currentTime-target)<.001)return;
 await new Promise((yes,no)=>{const timeout=setTimeout(()=>no(new Error('Video seek timed out.')),10000);media.video.onseeked=()=>{clearTimeout(timeout);yes();};media.video.currentTime=target;});
}
async function render(t){
 await ready;await seekVideo(t);ctx.globalAlpha=1;ctx.fillStyle=paper;ctx.fillRect(0,0,W,H);
 const breathe=Math.sin(t*.65)*8*unit;
 if(t<3.35){
  const p=enter(t,0,1),exit=ease.inOutCubic(clamp((t-2.7)/.65));ctx.save();ctx.translate(-exit*W*.12,0);ctx.globalAlpha=1-exit;
  const markW=(portrait?285:340)*unit,markX=portrait?(W-markW)/2:W-pad-markW,markY=portrait?H*.39:H*.22;
  ctx.save();ctx.translate(markX+markW/2,markY+markW/2+breathe+(1-p)*50*unit);ctx.rotate((1-p)*-.22);ctx.drawImage(media.mark,-markW/2,-markW/2,markW,markW);ctx.restore();
  const titles=C.preset==='product'?['Give your product','a moving story.']:C.preset==='story'?['A still image.','A story in motion.']:['Ideas deserve','a launch.'];
  const fs=(portrait?69:square?78:83)*unit,y=portrait?H*.12:H*.33;
  titles.forEach((s,i)=>{ctx.save();ctx.globalAlpha*=enter(t,i*.15);text(s,pad,y+i*fs*1.13+(1-enter(t,i*.15))*25*unit,fs);ctx.restore();});
  caption('motion-engine / by Raywake',pad,pad*.85);caption('Editable source. Local rendering.',pad,H-pad-22*unit);ctx.restore();
 }
 if(t>=2.7&&t<8.4){
  const p=enter(t,2.7,.6),end=clamp((t-7.8)/.6);ctx.save();ctx.globalAlpha=p*(1-end);ctx.translate((1-p)*60*unit,0);
  caption('The ingredients of a launch',pad,pad*.85);
  const fs=(portrait?54:65)*unit; text(portrait?'Make every':'Make every layer count.',pad,portrait?H*.16:H*.22,fs);
  if(portrait)text('layer count.',pad,H*.16+fs*1.12,fs);
  const gap=18*unit,tw=portrait?(W-2*pad):(W-2*pad-2*gap)/3,th=portrait?H*.13:H*.34,y=portrait?H*.38:H*.43;
  ['image','video','audio'].forEach((kind,i)=>{
    const tx=portrait?pad:pad+i*(tw+gap),ty=portrait?y+i*(th+48*unit):y;
    tile(kind,tx,ty,tw,th,t,i);text(kind[0].toUpperCase()+kind.slice(1),tx,ty+th+10*unit,19*unit,ink,600);
  });
  if(!portrait)caption(C.media?.image||C.media?.video||C.media?.audio?'Your media, composed into a film.':'Bundled demo assets · no API calls',pad,H-pad-6*unit);
  ctx.restore();
 }
 if(t>=7.8){
  const p=ease.inOutCubic(clamp((t-7.8)/.75));ctx.fillStyle=red;ctx.beginPath();ctx.arc(W*.78,H*.56,p*Math.hypot(W,H),0,Math.PI*2);ctx.fill();
  if(t>=8.15){ctx.save();const q=enter(t,8.15,.85);ctx.globalAlpha=q;ctx.translate(0,(1-q)*35*unit);
   const lw=(portrait?245:280)*unit,lh=lw*(media.logo.height/media.logo.width),lx=pad,ly=pad;
   ctx.fillStyle=paper;rounded(lx-18*unit,ly-12*unit,lw+36*unit,lh+24*unit,10*unit);ctx.fill();ctx.drawImage(media.logo,lx,ly,lw,lh);
   const fs=(portrait?67:86)*unit,ty=portrait?H*.34:H*.38;
   ['Your next launch,','with Raywake.'].forEach((s,i)=>text(s,pad,ty+i*fs*1.13,fs,paper));
   text('raywake.si',pad,portrait?H*.68:H*.77,32*unit,paper,600);
   text('AI media by Raywake. Motion by you.',pad,H-pad-25*unit,(portrait?20:23)*unit,paper,500);
   ctx.restore();
  }
 }
}
HB.boot(render,C.duration,{fps:C.fps,hazir:ready});
window.MOTION_META={...C,audio:[{file:'./assets/sounds/reveal.wav',at:0,gain:-12},{file:'./assets/sounds/swipe.wav',at:2.7,gain:-10},{file:'./assets/sounds/pop.wav',at:3.05,gain:-12},{file:'./assets/sounds/pop.wav',at:3.23,gain:-12},{file:'./assets/sounds/pop.wav',at:3.41,gain:-12},{file:'./assets/sounds/swipe.wav',at:7.8,gain:-9},...(C.media?.audio?[{file:C.media.audio,at:0,gain:-3}]:[])]};
