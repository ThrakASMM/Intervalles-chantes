import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const S=runInNewContext(readFileSync(new URL('../src/test-score.js',import.meta.url),'utf8')+'\nSingingScore');
const cfg={interval:4,direction:1,tempo:80,low:60,high:84,difficulty:'free'};
const notes=(error=0,gap=6,tempo=80,start=150)=>Array.from({length:20},(_,i)=>({midi:60+(i%2)*gap,samples:Array.from({length:Math.max(0,Math.floor((60000/tempo-start-1)/50)+1)},(_,j)=>({t:start+j*50,c:error}))}));
test('20 completed notes, gentle precision, average error and no silence points',()=>{
 const perfect=S.evaluate(cfg,notes(25));assert.equal(perfect.grade,20);assert.equal(perfect.accuracy,10000);assert.equal(perfect.gaps,1000);assert.equal(perfect.meanCents,25);assert.equal(perfect.heard,20);
 const partial=S.evaluate(cfg,notes(65));assert.equal(partial.grade,10);assert.equal(partial.accuracy,5000);assert.equal(partial.speed,0);
 const wrong=S.evaluate(cfg,notes(100));assert.equal(wrong.score,0);
 const silent=notes().map(n=>({...n,samples:[]}));assert.equal(S.evaluate(cfg,silent).score,0);assert.equal(S.evaluate(cfg,silent).meanCents,null);
 assert.throws(()=>S.evaluate(cfg,notes().slice(0,19)),/20 notes/);
});
test('speed rewards real stable correct replies and tempo, difficulty ignores octave-only jumps',()=>{
 const fast=S.evaluate({...cfg,tempo:160},notes(0,6,160));const slow=S.evaluate({...cfg,tempo:40},notes(0,6,40));assert(fast.speed>slow.speed);assert.equal(fast.accuracy,slow.accuracy);
 const small=S.evaluate(cfg,notes(0,1));assert(S.evaluate(cfg,notes(0,6)).gaps>small.gaps);
 assert.equal(S.evaluate(cfg,notes(0,12)).gaps,0);
 const brief=notes().map(n=>({...n,samples:[{t:150,c:0}]}));assert(S.evaluate(cfg,brief).grade<7);assert.equal(S.evaluate(cfg,brief).speed,0);
 const unstable=notes().map(n=>({...n,samples:[{t:150,c:0},{t:250,c:0},{t:350,c:0}]}));assert.equal(S.evaluate(cfg,unstable).speed,0);
});
test('octave equivalence, unvoiced gaps and wrong notes remain distinguishable',()=>{
 for(const cents of [-2400,-1200,0,1200,2400])assert.equal(S.octaveCents(cents),0);
 assert.equal(S.octaveCents(1250),50);assert.equal(S.octaveCents(-1250),-50);
 const capture=new S.Capture(cfg);const event={phase:'piano',midi:60,pairs:1,at:0,duration:.75};capture.register(event);
 capture.sample({...event,phase:'sing'},1210,.15);capture.sample({...event,phase:'sing'},-1210,.2);
 assert.deepEqual(JSON.parse(JSON.stringify(capture.notes[0].samples)),[{t:150,c:10},{t:200,c:-10}]);
 capture.sample(event,0,.25);capture.sample({...event,phase:'sing'},0,.8);assert.equal(capture.notes[0].samples.length,2);
});
test('invalid ranges, impossible jumps, duplicated frames and out-of-beat samples are rejected',()=>{
 assert.throws(()=>S.evaluate({...cfg,tempo:500},notes()),/Réglages/);
 assert.throws(()=>S.evaluate({...cfg,difficulty:'close'},notes()),/Écarts/);
 for(const samples of [[{t:20,c:0}],[{t:800,c:0}],[{t:150,c:Infinity}],[{t:150,c:0},{t:150,c:0}]]){const n=notes();n[0].samples=samples;assert.throws(()=>S.evaluate(cfg,n),/Mesures/);}
});
