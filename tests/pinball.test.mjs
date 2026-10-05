import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../src/pinball-top.js',import.meta.url),'utf8');
function setup(reduced=false){
 const dom=new JSDOM('<div id="top"></div>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let tick,delay,latest=0;const pending=new Map();w.setTimeout=(fn,ms)=>{delay=ms;const id=++latest;pending.set(id,fn);tick=()=>{pending.delete(id);fn();};return id;};w.clearTimeout=id=>pending.delete(id);
 w.matchMedia=()=>({matches:reduced});w.eval(source);
 const root=w.document.getElementById('top'),display=w.PinballTop.mount(root);
 return{dom,w,root,display,tick:()=>tick(),delay:()=>delay,cleared:()=>pending.size===0};
}
test('groups of three move down then up and the podium remains three times longer',()=>{
 const h=setup();try{
  h.display.setRows(Array.from({length:12},(_,i)=>({name:'Élève '+i,score:1000-i,detail:'20/20'})));
  assert.equal(h.root.querySelectorAll('.pb-all li').length,10);assert.equal(h.root.dataset.position,'1');
  assert.equal(h.root.querySelectorAll('.pb-row').length,10);
  assert.match(h.root.querySelector('.pb-current').textContent,/Rang 1.*Rang 2.*Rang 3/);
  assert.equal(h.root.querySelector('.pb-position').textContent,'01–03 / 10');
  assert.equal(h.delay(),9000);
  for(const rank of [4,7,8,7,4,1]){
   h.tick();assert.equal(h.root.dataset.position,String(rank));
   assert.equal(h.root.querySelector('.pb-track').style.transform,`translateY(-${(rank-1)*10}%)`);
   assert.equal(h.delay(),rank===1?9000:3000);
   if(rank===8){assert.equal(h.root.dataset.direction,'up');assert.equal(h.root.querySelector('.pb-position').textContent,'08–10 / 10');}
  }
  assert.equal(h.root.dataset.direction,'down');h.tick();assert.equal(h.root.dataset.position,'4');
  h.root.querySelector('.pb-pause').click();h.tick();assert.equal(h.root.dataset.position,'4');
  h.root.querySelector('.pb-prev').click();assert.equal(h.root.dataset.position,'1');assert(h.root.querySelector('.pb-prev').disabled);assert.equal(h.delay(),9000);
  h.root.querySelector('.pb-next').click();assert.equal(h.root.dataset.position,'4');assert.equal(h.delay(),3000);
  h.root.querySelector('.pb-pause').click();h.tick();assert.equal(h.root.dataset.position,'7');
  const winners=h.root.querySelectorAll('.pb-winner');assert.equal(winners.length,1);assert.equal(winners[0].dataset.rank,'1');assert(winners[0].querySelector('.pb-trophy .pb-spark'));
  assert(h.root.querySelector('svg path').getAttribute('d').length>100);
 }finally{h.dom.window.close();}
});
test('empty places, loading and untrusted nicknames never fabricate scores or HTML',()=>{
 const h=setup();try{
  h.display.setRows([{name:'<img src=x>',score:0,detail:'<script>bad</script>'}]);
  assert.equal(h.root.querySelectorAll('img,script').length,0);
  assert.match(h.root.querySelector('li').textContent,/<img src=x>/);
  assert.equal([...h.root.querySelectorAll('li')].filter(n=>n.textContent==='Place libre').length,9);
  h.display.move(1);assert.match(h.root.querySelector('.pb-current').textContent,/place libre/);
  h.display.setMessage('INDISPONIBLE','Réessaie');h.tick();assert(h.root.querySelector('.pb-next').disabled);
  h.display.setRows([]);assert.equal(h.root.querySelectorAll('.pb-all li').length,10);assert.equal(h.root.querySelectorAll('.pb-trophy').length,0);
 }finally{h.dom.window.close();}
});
test('motion preference, hover, focus, hidden pages and detached views pause the display',()=>{
 const h=setup(true);try{
  h.display.setRows([{name:'Élève',score:100}]);h.tick();assert.equal(h.root.dataset.position,'1');
  h.root.querySelector('.pb-pause').click();h.tick();assert.equal(h.root.dataset.position,'4');
  h.root.dispatchEvent(new h.w.Event('mouseenter'));h.tick();assert.equal(h.root.dataset.position,'4');h.root.dispatchEvent(new h.w.Event('mouseleave'));
  h.root.dispatchEvent(new h.w.FocusEvent('focusin'));h.tick();assert.equal(h.root.dataset.position,'4');h.root.dispatchEvent(new h.w.FocusEvent('focusout'));
  h.root.hidden=true;h.tick();assert.equal(h.root.dataset.position,'4');h.root.hidden=false;
  Object.defineProperty(h.w.document,'hidden',{value:true,configurable:true});h.tick();assert.equal(h.root.dataset.position,'4');
  Object.defineProperty(h.w.document,'hidden',{value:false});h.tick();assert.equal(h.root.dataset.position,'7');
  assert(!h.root.querySelector('.pb-track').classList.contains('pb-moving'));
  h.root.remove();h.tick();assert(h.cleared());
 }finally{h.dom.window.close();}
});

test('refreshing unchanged rows keeps the scroll position and a visible three-row track',()=>{
 const h=setup();try{const rows=[{name:'Premier',score:500}];h.display.setRows(rows);h.tick();h.tick();const track=h.root.querySelector('.pb-track'),winner=h.root.querySelector('.pb-winner');h.display.setMessage('CHARGEMENT');assert(track.hidden);h.display.setRows(rows);assert.equal(track.hidden,false);assert.equal(h.root.dataset.position,'7');assert.equal(h.root.querySelector('.pb-winner'),winner);assert.equal(h.root.querySelectorAll('.pb-row').length,10);}finally{h.dom.window.close();}
});
