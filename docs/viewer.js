const film=document.querySelector('#film'),download=document.querySelector('#download'),status=document.querySelector('#video-status');
const play=document.querySelector('#play-film');
const showPoster=()=>{film.controls=false;play.hidden=false;};
showPoster();
play.addEventListener('click',async()=>{
 try{await film.play();}
 catch{status.textContent='The video could not play. Try the MP4 download or run the local demo.';}
});
film.addEventListener('playing',()=>{play.hidden=true;film.controls=true;});
const formats={launch:'1280 × 720',portrait:'720 × 1280',square:'1080 × 1080'};
for(const button of document.querySelectorAll('[data-format]'))button.addEventListener('click',()=>{
 const key=button.dataset.format;film.pause();
 for(const other of document.querySelectorAll('[data-format]'))other.setAttribute('aria-pressed',String(other===button));
 film.poster=`assets/${key}-poster.png`;film.querySelector('source').src=`assets/${key}.mp4`;film.load();
 showPoster();download.href=`assets/${key}.mp4`;status.textContent=`12 seconds · ${formats[key]} · sound on in the MP4`;
});
film.addEventListener('error',()=>{status.textContent='The video could not load. Try the MP4 download or run the local demo.';});
film.querySelector('source').addEventListener('error',()=>{status.textContent='The video could not load. Try the MP4 download or run the local demo.';});
document.querySelector('#copy').addEventListener('click',async()=>{
 const message=document.querySelector('#copy-status');
 try{await navigator.clipboard.writeText(document.querySelector('#commands').textContent);message.textContent='Commands copied.';}
 catch{message.textContent='Select the commands above and copy them manually.';}
});
