// Compare cold starts in one browser, alternating versions; no network backend.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'), http = require('http'), path = require('path');
(async () => {
  const roots = {v8:process.argv[2],v9:process.argv[3]}, returning=process.argv[4]==='returning';
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.woff':'font/woff'};
  const servers = {};
  for (const [label,root] of Object.entries(roots)) {
    const s=http.createServer((req,res)=>{
      const pathname = new URL(req.url,'http://local').pathname;
      const f=path.join(root, pathname==='/'?'index.html':decodeURIComponent(pathname));
      fs.readFile(f,(e,b)=>{ if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(b);});
    });
    await new Promise(r=>s.listen(0,'127.0.0.1',r));servers[label]=s;
  }
  const b = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--no-zygote']});
  const results={v8:[],v9:[]};
  try {
    for(let i=0;i<8;i++) for (const label of i%2?['v9','v8']:['v8','v9']) {
      const context=await b.newContext({viewport:{width:393,height:840},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'tr-TR'});
      const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
      await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());
      const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      await p.addInitScript((returning)=>{
        if(returning){localStorage.setItem('cc_onboarded','true');localStorage.setItem('cc_logged_in','guest');localStorage.setItem('couple_chaos_profile',JSON.stringify({username:'Yusuf',avatar:'😎',gamesPlayed:0,streak:0}));}
        window.__startup={};
        const probe=()=>{
          const cta=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(returning?'Klasik':'Oynamaya Başla'));
          if(!cta)return requestAnimationFrame(probe);
          window.__startup.contentMs=performance.now();
          Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>{}))]).then(()=>requestAnimationFrame(()=>window.__startup.qualityReadyMs=performance.now()));
        };requestAnimationFrame(probe);
      },returning);
      await p.goto('http://127.0.0.1:'+servers[label].address().port);
      await p.waitForFunction(()=>window.__startup.qualityReadyMs>0);
      const startup=await p.evaluate(()=>({...window.__startup,fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime}));
      // Let the same decorations/preparation finish before testing the first tap.
      await p.waitForTimeout(800);
      startup.fcpMs = await p.evaluate(()=>performance.getEntriesByName("first-contentful-paint")[0]?.startTime);
      const tapMs=returning?null:await p.evaluate(()=>new Promise(resolve=>{
        const t=performance.now();[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Oynamaya Başla')).click();
        const probe=()=>document.querySelector('h2')?resolve(performance.now()-t):requestAnimationFrame(probe);requestAnimationFrame(probe);
      }));
      results[label].push({...startup,tapMs,errors});await context.close();
    }
    const summary={};
    for(const [label,rows] of Object.entries(results)) {
      summary[label]={};
      for(const key of (returning?['contentMs','qualityReadyMs','fcpMs']:['contentMs','qualityReadyMs','fcpMs','tapMs'])) {
        const values=rows.map(r=>r[key]).sort((a,b)=>a-b);
        summary[label][key]={median:(values[3]+values[4])/2,min:values[0],max:values[7]};
      }
    }
    console.log(JSON.stringify({scenario:returning?'returning':'new',environment:'Chromium 138; 393x840 DPR2; CPU 4x; 8 cold contexts per version, alternating; local HTTP, not phone measurements',summary,results},null,2));
  } finally {await b.close();for(const s of Object.values(servers))s.close();}
})().catch(e=>{console.error(e);process.exit(1)});
