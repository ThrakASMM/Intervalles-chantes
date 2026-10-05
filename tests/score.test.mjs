import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const S=runInNewContext(readFileSync(new URL('../src/test-score.js',import.meta.url),'utf8')+'\nSingingScore');
const cfg={interval:4,direction:1,tempo:80,low:60,high:84,difficulty:'free'};
const notes=(error=0,gap=6,tempo=80,start=150)=>Array.from({length:30},(_,i)=>({midi:60+(i%2)*gap,samples:Array.from({length:Math.max(0,Math.floor((60000/tempo-start-1)/50)+1)},(_,j)=>({t:start+j*50,c:error}))}));
test('30 completed notes, gentle precision, average error and no silence points',()=>{
 const perfect=S.evaluate(cfg,notes(45));assert.equal(perfect.grade,20);assert.equal(perfect.accuracy,10000);assert.equal(perfect.gaps,1000);assert.equal(perfect.meanCents,45);assert.equal(perfect.heard,30);
 const partial=S.evaluate(cfg,notes(72.5));assert.equal(partial.grade,10);assert.equal(partial.accuracy,5000);assert.equal(partial.speed,0);
 const wrong=S.evaluate(cfg,notes(100));assert.equal(wrong.score,0);
 const silent=notes().map(n=>({...n,samples:[]}));assert.equal(S.evaluate(cfg,silent).score,0);assert.equal(S.evaluate(cfg,silent).meanCents,null);
 assert.throws(()=>S.evaluate(cfg,notes().slice(0,29)),/30 notes/);
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

test('old 30 and 20-note results retain their original stricter scoring',()=>{
 for(const cents of [0,25,65,100]){const current=S.restore({ruleset:S.PREVIOUS_ID,config:cfg,notes:notes(cents)});const legacy=S.restore({ruleset:S.LEGACY_ID,config:cfg,notes:notes(cents).slice(0,20)});for(const metric of ['score','grade','accuracy','speed','gaps'])assert.equal(current[metric],legacy[metric],metric);assert.equal(current.total,30);assert.equal(legacy.total,20);}
 assert.equal(S.restore({ruleset:S.PREVIOUS_ID,config:cfg,notes:notes(65)}).grade,10);
 assert.throws(()=>S.restore({ruleset:'unknown',config:cfg,notes:notes()}),/incompatible/);
});


test('all intervals and both directions accept a settled note after an inaccurate attack',()=>{
 const run=notes().map(n=>({...n,samples:n.samples.map((f,i)=>({...f,c:i<3?200:40}))}));
 for(let interval=1;interval<=12;interval++)for(const direction of [-1,1]){
  const current=S.evaluate({...cfg,interval,direction},run);
  assert.equal(current.grade,20,`interval ${interval}/${direction}`);
  assert.equal(current.meanCents,40);assert.equal(current.correct,30);
  assert(current.results.every(n=>n.settled));
  assert(current.speed>0);assert(current.speed<S.evaluate({...cfg,interval,direction},notes(40)).speed);
 }
 assert(S.restore({ruleset:S.PREVIOUS_ID,config:cfg,notes:run}).grade<10);
});

test('tolerance is symmetric and does not accept a neighbouring semitone or a passing slide',()=>{
 for(const offset of [-45,45])assert.equal(S.evaluate(cfg,notes(offset)).grade,20);
 for(const offset of [-100,100])assert.equal(S.evaluate(cfg,notes(offset)).grade,0);
 const brieflyCorrect=notes().map(n=>({...n,samples:n.samples.map((f,i)=>({...f,c:i>=3&&i<=5?0:200}))}));
 const brief=S.evaluate(cfg,brieflyCorrect);assert.equal(brief.grade,0);assert.equal(brief.speed,0);
 const slide=notes().map(n=>({...n,samples:n.samples.map((f,i)=>({...f,c:-330+i*60}))}));
 assert.equal(S.evaluate(cfg,slide).speed,0);assert.equal(S.evaluate(cfg,slide).grade,0);
 const gaps=notes().map(n=>({...n,samples:[{t:150,c:0},{t:300,c:0},{t:450,c:0},{t:600,c:0}]}));
 assert(S.evaluate(cfg,gaps).grade<20);assert.equal(S.evaluate(cfg,gaps).speed,0);
});

test('stable scoring accepts vibrato, a late response and every allowed tempo',()=>{
 const vibrato=notes().map(n=>({...n,samples:n.samples.map((f,i)=>({...f,c:i%2?35:-35}))}));
 assert.equal(S.evaluate(cfg,vibrato).grade,20);
 const late=notes().map(n=>({...n,samples:n.samples.filter(f=>f.t>=550)}));
 assert.equal(S.evaluate(cfg,late).grade,20);assert(S.evaluate(cfg,late).speed<S.evaluate(cfg,notes()).speed);
 for(let tempo=30;tempo<=200;tempo++)assert.equal(S.evaluate({...cfg,tempo},notes(40,6,tempo)).grade,20,String(tempo));
});
