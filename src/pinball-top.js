/* Shared, self-contained dot-matrix Top 10. Names are drawn as pixels, never HTML. */
window.PinballTop = (() => {
  const patterns={
    A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
    '0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],
    '!':['00100','00100','00100','00100','00100','00000','00100'],'-':['00000','00000','00000','11111','00000','00000','00000'],'.':['00000','00000','00000','00000','00000','00110','00110'],"'":['00100','00100','00000','00000','00000','00000','00000'],'?':['01110','10001','00001','00010','00100','00000','00100'],' ':Array(7).fill('00000')
  };
  let counter=0;
  const ns='http://www.w3.org/2000/svg';
  const element=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
  function matrix(text, width=120) {
    const label=String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/œ/gi,'OE').replace(/[’_]/g,"'").toUpperCase().slice(0,20);
    const svg=element('svg',{viewBox:`0 0 ${width} 9`,'aria-hidden':'true',focusable:'false'}),id='pb-grid-'+(++counter);
    const defs=element('defs'),pattern=element('pattern',{id,width:1,height:1,patternUnits:'userSpaceOnUse'});
    pattern.append(element('circle',{cx:.5,cy:.5,r:.31,fill:'currentColor',opacity:.09}));defs.append(pattern);
    svg.append(defs,element('rect',{width,height:9,fill:`url(#${id})`}));
    let path='',left=Math.max(.5,(width-(label.length*6-1))/2);
    [...label].forEach((letter,index)=>(patterns[letter]||patterns['?']).forEach((row,y)=>[...row].forEach((pixel,x)=>{if(pixel==='1'){const px=left+index*6+x,py=y+1;path+=`M${px-.36},${py}a.36,.36 0 1,0 .72,0a.36,.36 0 1,0 -.72,0 `;}})));
    svg.append(element('path',{d:path,fill:'currentColor'}));return svg;
  }
  function trophy() {
    const svg=element('svg',{viewBox:'0 0 15 15','aria-hidden':'true',class:'pb-trophy'});
    const cup=['0011111111100','1111111111111','1101111111011','1101111111011','0110111110110','0011111111100','0000111110000','0000001000000','0000011100000','0000011100000','0001111111000'];
    let path='';cup.forEach((row,y)=>[...row].forEach((pixel,x)=>{if(pixel==='1')path+=`M${x+1} ${y+2}h.85v.85h-.85z`;}));
    svg.append(element('path',{d:path,fill:'currentColor'}));
    svg.append(element('path',{d:'M2 0v3M.5 1.5h3',class:'pb-spark',stroke:'currentColor','stroke-width':.65}));
    svg.append(element('path',{d:'M13 11v3M11.5 12.5h3',class:'pb-spark pb-spark-late',stroke:'currentColor','stroke-width':.65}));
    return svg;
  }
  class Display {
    constructor(root,{title='TOP 10'}={}) {
      this.root=root;this.rows=[];this.index=0;this.direction=1;this.paused=false;this.hover=false;this.focused=false;this.visible=true;this.loading=true;
      this.motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');this.paused=!!this.motion?.matches;
      root.classList.add('pinball-top');
      root.innerHTML='<div class="pb-cabinet"><div class="pb-heading"><span class="pb-title"></span><span class="pb-position">01–03 / 10</span></div><div class="pb-screen" aria-hidden="true"><div class="pb-track"></div><div class="pb-message" hidden><div class="pb-message-title"></div><p></p></div></div><p class="pb-current pb-sr-only" aria-live="off"></p></div><div class="pb-controls"><button type="button" class="pb-prev" aria-label="Remonter le classement">↑</button><button type="button" class="pb-pause" aria-pressed="false">Pause</button><button type="button" class="pb-next" aria-label="Descendre le classement">↓</button></div><details class="pb-all"><summary>Voir les 10 places</summary><ol></ol></details>';
      this.$=selector=>root.querySelector(selector);this.$('.pb-title').textContent=title;
      this.$('.pb-prev').addEventListener('click',()=>this.move(-1));this.$('.pb-next').addEventListener('click',()=>this.move(1));
      this.$('.pb-pause').addEventListener('click',()=>{this.paused=!this.paused;this.controls();});
      root.addEventListener('mouseenter',()=>{this.hover=true;this.effects();});root.addEventListener('mouseleave',()=>{this.hover=false;this.effects();});
      root.addEventListener('focusin',()=>{this.focused=true;this.effects();});root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget))this.focused=false;this.effects();});
      this.motionHandler=e=>{this.paused=e.matches;this.controls();};this.motion?.addEventListener?.('change',this.motionHandler);
      if(window.IntersectionObserver){this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.effects();});this.observer.observe(root);}
      this.setMessage('CHARGEMENT','Le classement arrive…');this.controls();this.schedule();
    }
    schedule(){
      clearTimeout(this.timer);
      this.timer=setTimeout(()=>{
        if(!this.root.isConnected){this.destroy();return;}
        this.effects();
        if(!this.loading && !this.paused && !this.hover && !this.focused && this.visible && !document.hidden && !this.root.closest('[hidden]') && this.rows.length)this.move(this.direction);
        else this.schedule();
      },this.index===0?9000:3000);
    }
    effects(){this.root.classList.toggle('pb-resting',this.paused||this.hover||this.focused||!this.visible||document.hidden||!!this.root.closest('[hidden]'));}
    controls(){this.$('.pb-pause').textContent=this.paused?'Défiler':'Pause';this.$('.pb-pause').setAttribute('aria-pressed',String(this.paused));this.$('.pb-pause').disabled=this.loading;this.$('.pb-prev').disabled=this.loading||this.index===0;this.$('.pb-next').disabled=this.loading||this.index===7;this.effects();}
    setRows(rows) {
      const normalized=rows.slice(0,10).map(r=>({name:String(r.name||'—'),score:Math.max(0,Math.round(Number(r.score)||0)),detail:String(r.detail||'')}));
      const signature=JSON.stringify(normalized),changed=signature!==this.signature;
      if(changed){this.index=0;this.direction=1;}this.signature=signature;this.rows=normalized;this.loading=false;
      this.$('.pb-message').hidden=true;this.$('.pb-track').hidden=false;
      if(changed){
        const track=this.$('.pb-track'),list=this.$('.pb-all ol');track.replaceChildren();list.replaceChildren();
        for(let i=0;i<10;i++){
          const row=this.rows[i],rank=String(i+1).padStart(2,'0'),item=document.createElement('div');
          item.className='pb-row'+(i===0&&row?' pb-winner':'')+(row?'':' pb-vacant');item.dataset.rank=String(i+1);
          const badge=document.createElement('div');badge.className='pb-rank';badge.append(matrix(rank,15));if(i===0&&row)badge.append(trophy());
          const content=document.createElement('div');content.className='pb-player';
          const name=document.createElement('div');name.className='pb-name';name.append(matrix(row?row.name:'PLACE LIBRE'));
          const score=document.createElement('div');score.className='pb-score';score.append(matrix(row?String(row.score).padStart(5,'0')+' PTS':'A VOUS !',72));
          const detail=document.createElement('p');detail.className='pb-detail';detail.textContent=row?row.detail:'Enregistre ton score';detail.title=detail.textContent;
          content.append(name,score,detail);item.append(badge,content);track.append(item);
          const li=document.createElement('li');li.textContent=row?`${row.name} · ${row.score.toLocaleString('fr-FR')} points${row.detail?' · '+row.detail:''}`:'Place libre';list.append(li);
        }
      }
      this.render(false);if(changed)this.schedule();
    }
    setMessage(title,detail=''){
      this.loading=true;this.$('.pb-track').hidden=true;this.$('.pb-message').hidden=false;
      this.$('.pb-message-title').replaceChildren(matrix(title));this.$('.pb-message p').textContent=detail;this.$('.pb-current').textContent=title+' · '+detail;this.controls();
    }
    move(delta){
      if(this.loading)return;
      const pages=[0,3,6,7],page=pages.indexOf(this.index);
      this.index=pages[Math.max(0,Math.min(pages.length-1,page+Math.sign(delta)))];
      this.direction=this.index===7?-1:this.index===0?1:delta<0?-1:1;this.render(true);this.schedule();
    }
    render(animate) {
      this.root.dataset.position=String(this.index+1);this.root.dataset.direction=this.direction===1?'down':'up';
      this.$('.pb-position').textContent=String(this.index+1).padStart(2,'0')+'–'+String(this.index+3).padStart(2,'0')+' / 10';
      const track=this.$('.pb-track');track.classList.toggle('pb-moving',animate&&!this.motion?.matches);
      track.style.transform=`translateY(-${this.index*10}%)`;
      this.$('.pb-current').textContent=Array.from({length:3},(_,offset)=>{const i=this.index+offset,row=this.rows[i];return row?`Rang ${i+1} : ${row.name}, ${row.score} points. ${row.detail}`:`Rang ${i+1} : place libre.`;}).join(' ');
      this.controls();
    }
    destroy(){clearTimeout(this.timer);this.observer?.disconnect();this.motion?.removeEventListener?.('change',this.motionHandler);}
  }
  return {mount:(root,options)=>new Display(root,options)};
})();
