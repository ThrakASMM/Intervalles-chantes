import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),file=new URL('index.html',root);
let html=readFileSync(file,'utf8');
for(const name of ['pinball-top','test-score','test-ui']){
 const start=`<!-- BEGIN ${name} -->`,end=`<!-- END ${name} -->`;
 const block=`${start}\n<script>\n${readFileSync(new URL(`src/${name}.js`,root),'utf8')}\n</script>\n${end}`;
 if(html.includes(start))html=html.slice(0,html.indexOf(start))+block+html.slice(html.indexOf(end)+end.length);
 else {const at=html.lastIndexOf('<script>',html.indexOf('/* Optional microphone tuner.'));if(at<0)throw new Error('Missing tuner anchor');html=html.slice(0,at)+block+'\n'+html.slice(at);}
 if(!html.includes(start))throw new Error('Missing insertion anchor');
}
const cssStart='/* BEGIN pinball-top */',cssEnd='/* END pinball-top */';
const css=cssStart+'\n'+readFileSync(new URL('src/pinball-top.css',root),'utf8')+'\n'+cssEnd;
if(html.includes(cssStart))html=html.slice(0,html.indexOf(cssStart))+css+html.slice(html.indexOf(cssEnd)+cssEnd.length);
else html=html.replace('</style>',css+'\n</style>');
writeFileSync(file,html);console.log('Singing test scripts embedded.');
