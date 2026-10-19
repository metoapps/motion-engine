const filters=document.querySelector('.filters'),mobile=matchMedia('(max-width:640px)');
const fitFilters=()=>{filters.open=!mobile.matches;};
fitFilters();mobile.addEventListener('change',fitFilters);
const cards=[...document.querySelectorAll('.card')];
const groups=[['#aile','c','cat'],['#evstili','e','ev']];
const selected={cat:'all',ev:'all'};
function apply(){
 let count=0;
 for(const card of cards){
  card.hidden=!(selected.cat==='all'||card.dataset.cat===selected.cat)||!(selected.ev==='all'||card.dataset.ev===selected.ev);
  if(!card.hidden)count++;
 }
 for(const [selector,key,state] of groups)for(const button of document.querySelectorAll(`${selector} button`)){
  const active=button.dataset[key]===selected[state];button.classList.toggle('on',active);button.setAttribute('aria-pressed',String(active));
 }
 document.querySelector('#count').textContent=`${count} tema gösteriliyor`;
 document.querySelector('#empty').hidden=count>0;
}
for(const [selector,key,state] of groups)for(const button of document.querySelectorAll(`${selector} button`))button.addEventListener('click',()=>{selected[state]=button.dataset[key];apply();});
document.querySelector('#reset').addEventListener('click',()=>{selected.cat='all';selected.ev='all';apply();document.querySelector('#aile button').focus();});
apply();
