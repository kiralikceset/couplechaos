const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const root=process.argv[2],label=process.argv[3];
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
 const server=http.createServer((req,res)=>{const f=path.join(root,new URL(req.url,'http://local').pathname==='/'?'index.html':decodeURIComponent(new URL(req.url,'http://local').pathname));fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--no-zygote']});
 try {
 const p=await b.newPage({viewport:{width:393,height:840},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'tr-TR'});
 const errors=[],external=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',route=>{if(!route.request().url().startsWith('http://127.0.0.1:')){external.push(route.request().url());return route.abort();}return route.continue();});
 const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
 await p.goto('http://127.0.0.1:'+server.address().port);await p.getByRole('button',{name:/Oynamaya Başla/}).waitFor();await p.waitForTimeout(500);
 await p.screenshot({path:'/tmp/'+label+'-splash.png'});
 await p.getByRole('button',{name:/Oynamaya Başla/}).tap();await p.getByRole('heading',{name:'Kelimeyi Anlat'}).waitFor();await p.waitForTimeout(600);
 await p.screenshot({path:'/tmp/'+label+'-slide1.png'});
 const transition=await p.evaluate(()=>new Promise(resolve=>{
  const begin=performance.now();let first=null;
  const next=()=>{const h=[...document.querySelectorAll('h2')].find(e=>e.textContent==='Çiz & Tahmin Et');if(h){if(first===null)first=performance.now()-begin;const o=getComputedStyle(h.parentElement).opacity;if(Number(o)>=.99)return resolve({firstContentMs:first,visibleMs:performance.now()-begin});}if(performance.now()-begin>3000)return resolve({timeout:true});requestAnimationFrame(next);};
  [...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Devam').click();requestAnimationFrame(next);
 }));
 await p.waitForTimeout(600);await p.screenshot({path:'/tmp/'+label+'-slide2.png'});
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
 const a=await metrics();await p.waitForTimeout(5000);const z=await metrics();const work=Object.fromEntries(['TaskDuration','ScriptDuration','LayoutCount','RecalcStyleCount'].map(k=>[k,z[k]-a[k]]));
 await p.getByRole('button',{name:'Devam',exact:true}).tap();await p.getByRole('heading',{name:'Çizim Puanlanır'}).waitFor();await p.waitForTimeout(600);await p.screenshot({path:'/tmp/'+label+'-slide3.png'});
 const images=await p.locator('img').evaluateAll(imgs=>imgs.map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})));
 const overflow=await p.evaluate(()=>({width:document.documentElement.scrollWidth,view:innerWidth,height:document.documentElement.scrollHeight,viewHeight:innerHeight}));
 const introExternal=[...external];
 if(label==='v8'||label==='v9'){
  await p.getByRole('button',{name:'Geri',exact:true}).tap();await p.getByRole('heading',{name:'Çiz & Tahmin Et'}).waitFor();
  await p.getByRole('button',{name:'Geri',exact:true}).tap();await p.getByRole('heading',{name:'Kelimeyi Anlat'}).waitFor();
  await p.getByRole('button',{name:'Geri',exact:true}).tap();await p.getByRole('button',{name:/Oynamaya Başla/}).waitFor();
  await p.getByRole('button',{name:/Oynamaya Başla/}).tap();await p.getByRole('button',{name:'Atla',exact:true}).tap();
  await p.getByRole('button',{name:'Şimdilik atla',exact:true}).waitFor();
  await p.getByRole('button',{name:'Şimdilik atla',exact:true}).tap();
  await p.getByPlaceholder('İsmini yaz...').waitFor();
  await p.locator('header button').first().tap();
  await p.getByRole('button',{name:'Şimdilik atla',exact:true}).waitFor();
  await p.getByRole('button',{name:'Şimdilik atla',exact:true}).tap();
  await p.getByPlaceholder('İsmini yaz...').fill('PerformansTest');
  await p.getByRole('button',{name:/Başla!/}).tap();
  await p.getByText('Klasik', {exact:false}).first().waitFor();
 }
 console.log(JSON.stringify({label,transition,work,images,overflow,errors,introExternal,external},null,2));
 } finally {await b.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
