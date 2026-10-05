import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../src/pinball-top.js',import.meta.url),'utf8');
function setup(reduced=false){
 const dom=new JSDOM('<div id="top"></div>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let tick,cleared=false;w.setInterval=(fn,ms)=>{assert.equal(ms,4500);tick=fn;return 1;};w.clearInterval=()=>cleared=true;
 w.matchMedia=()=>({matches:reduced});w.eval(source);
 const root=w.document.getElementById('top'),display=w.PinballTop.mount(root);
 return{dom,w,root,display,tick:()=>tick(),cleared:()=>cleared};
}
test('ten real ranked positions, complete automatic cycle, pause and manual navigation',()=>{
 const h=setup();try{
  h.display.setRows(Array.from({length:12},(_,i)=>({name:'Élève '+i,score:1000-i,detail:'20/20'})));
  assert.equal(h.root.querySelectorAll('li').length,10);assert.equal(h.root.dataset.position,'1');
  for(let i=2;i<=10;i++){h.tick();assert.equal(h.root.dataset.position,String(i));}
  h.tick();assert.equal(h.root.dataset.position,'1');
  h.root.querySelector('.pb-pause').click();h.tick();assert.equal(h.root.dataset.position,'1');
  h.root.querySelector('.pb-prev').click();assert.equal(h.root.dataset.position,'10');
  h.root.querySelector('.pb-next').click();assert.equal(h.root.dataset.position,'1');
  h.root.querySelector('.pb-pause').click();h.tick();assert.equal(h.root.dataset.position,'2');
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
  h.display.setRows([]);assert.equal(h.root.querySelectorAll('li').length,10);
 }finally{h.dom.window.close();}
});
test('motion preference, hover, focus, hidden pages and detached views pause the display',()=>{
 const h=setup(true);try{
  h.display.setRows([{name:'Élève',score:100}]);h.tick();assert.equal(h.root.dataset.position,'1');
  h.root.querySelector('.pb-pause').click();h.tick();assert.equal(h.root.dataset.position,'2');
  h.root.dispatchEvent(new h.w.Event('mouseenter'));h.tick();assert.equal(h.root.dataset.position,'2');h.root.dispatchEvent(new h.w.Event('mouseleave'));
  h.root.dispatchEvent(new h.w.FocusEvent('focusin'));h.tick();assert.equal(h.root.dataset.position,'2');h.root.dispatchEvent(new h.w.FocusEvent('focusout'));
  h.root.hidden=true;h.tick();assert.equal(h.root.dataset.position,'2');h.root.hidden=false;
  Object.defineProperty(h.w.document,'hidden',{value:true,configurable:true});h.tick();assert.equal(h.root.dataset.position,'2');
  Object.defineProperty(h.w.document,'hidden',{value:false});h.tick();assert.equal(h.root.dataset.position,'3');
  assert(!h.root.querySelector('.pb-screen').classList.contains('pb-enter'));
  h.root.remove();h.tick();assert(h.cleared());
 }finally{h.dom.window.close();}
});
