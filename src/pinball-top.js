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
  class Display {
    constructor(root,{title='TOP 10'}={}) {
      this.root=root;this.rows=[];this.index=0;this.paused=false;this.hover=false;this.focused=false;this.visible=true;this.loading=true;
      this.motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');this.paused=!!this.motion?.matches;
      root.classList.add('pinball-top');
      root.innerHTML='<div class="pb-cabinet"><div class="pb-heading"><span class="pb-title"></span><span class="pb-position">01 / 10</span></div><div class="pb-screen" aria-hidden="true"><div class="pb-name"></div><div class="pb-score"></div></div><p class="pb-detail"></p><p class="pb-current pb-sr-only" aria-live="off"></p></div><div class="pb-controls"><button type="button" class="pb-prev" aria-label="Score précédent">←</button><button type="button" class="pb-pause" aria-pressed="false">Pause</button><button type="button" class="pb-next" aria-label="Score suivant">→</button></div><details class="pb-all"><summary>Voir les 10 places</summary><ol></ol></details>';
      this.$=selector=>root.querySelector(selector);this.$('.pb-title').textContent=title;
      this.$('.pb-prev').addEventListener('click',()=>this.move(-1));this.$('.pb-next').addEventListener('click',()=>this.move(1));
      this.$('.pb-pause').addEventListener('click',()=>{this.paused=!this.paused;this.controls();});
      root.addEventListener('mouseenter',()=>this.hover=true);root.addEventListener('mouseleave',()=>this.hover=false);
      root.addEventListener('focusin',()=>this.focused=true);root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget))this.focused=false;});
      this.motionHandler=e=>{this.paused=e.matches;this.controls();};this.motion?.addEventListener?.('change',this.motionHandler);
      if(window.IntersectionObserver){this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;});this.observer.observe(root);}
      this.timer=setInterval(()=>{if(!root.isConnected){this.destroy();return;}if(!this.loading && !this.paused && !this.hover && !this.focused && this.visible && !document.hidden && !root.closest('[hidden]') && this.rows.length)this.move(1);},4500);
      this.setMessage('CHARGEMENT','Le classement arrive…');this.controls();
    }
    controls(){this.$('.pb-pause').textContent=this.paused?'Défiler':'Pause';this.$('.pb-pause').setAttribute('aria-pressed',String(this.paused));for(const sel of ['.pb-prev','.pb-next','.pb-pause'])this.$(sel).disabled=this.loading;}
    setRows(rows) {
      const normalized=rows.slice(0,10).map(r=>({name:String(r.name||'—'),score:Math.max(0,Math.round(Number(r.score)||0)),detail:String(r.detail||'')}));
      const signature=JSON.stringify(normalized);if(signature!==this.signature)this.index=0;this.signature=signature;this.rows=normalized;this.loading=false;
      const list=this.$('.pb-all ol');list.replaceChildren();
      for(let i=0;i<10;i++){const row=this.rows[i],li=document.createElement('li');li.textContent=row?`${row.name} · ${row.score.toLocaleString('fr-FR')} points${row.detail?' · '+row.detail:''}`:'Place libre';list.append(li);}
      this.controls();this.render(false);
    }
    setMessage(title,detail=''){this.loading=true;this.$('.pb-name').replaceChildren(matrix(title));this.$('.pb-score').replaceChildren(matrix('---',72));this.$('.pb-detail').textContent=detail;this.$('.pb-current').textContent=title+' · '+detail;this.$('.pb-all ol').replaceChildren();this.controls();}
    move(delta){if(this.loading)return;this.index=(this.index+delta+10)%10;this.render(true);}
    render(animate) {
      const row=this.rows[this.index],rank=String(this.index+1).padStart(2,'0');
      this.root.dataset.position=String(this.index+1);this.$('.pb-position').textContent=rank+' / 10';
      this.$('.pb-name').replaceChildren(matrix(rank+' '+(row?row.name:'PLACE LIBRE')));
      this.$('.pb-score').replaceChildren(matrix(row?String(row.score).padStart(5,'0')+' PTS':'A VOUS !',72));
      this.$('.pb-detail').textContent=row?row.detail:'Enregistre un score pour prendre ta place.';
      this.$('.pb-current').textContent=row?`Rang ${this.index+1} : ${row.name}, ${row.score} points. ${row.detail}`:`Rang ${this.index+1} : place libre.`;
      const screen=this.$('.pb-screen');screen.classList.remove('pb-enter');if(animate && !this.motion?.matches){void screen.offsetWidth;screen.classList.add('pb-enter');}
    }
    destroy(){clearInterval(this.timer);this.observer?.disconnect();this.motion?.removeEventListener?.('change',this.motionHandler);}
  }
  return {mount:(root,options)=>new Display(root,options)};
})();
