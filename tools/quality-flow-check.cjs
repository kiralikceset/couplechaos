const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
(async()=>{
 const roots={v8:process.argv[2],v9:process.argv[3]},servers={};
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.woff':'font/woff'};
 for(const [label,root] of Object.entries(roots)){
  const s=http.createServer((req,res)=>{const p=new URL(req.url,'http://local').pathname;fs.readFile(path.join(root,p==='/'?'index.html':p),(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(p)]||'text/html');res.end(b);});});
  await new Promise(r=>s.listen(0,'127.0.0.1',r));servers[label]=s;
 }
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--no-zygote']});
 const errors=[],shots={},checks=[];
 async function page(label,init,delay=false){
  const ctx=await browser.newContext({viewport:{width:393,height:840},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'tr-TR'}),p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',async r=>{const u=r.request().url();if(!u.startsWith('http://127.0.0.1:'))return r.abort();if(delay&&u.includes('/assets/')&&/GameRuntime|ProfileScreen|LoginScreen/.test(u))await new Promise(r=>setTimeout(r,500));return r.continue();});
  if(init)await p.addInitScript(init);
  await p.goto('http://127.0.0.1:'+servers[label].address().port);
  return p;
 }
 try{
  for(const label of Object.keys(roots)){
   const p=await page(label);shots[label]={};
   await p.getByRole('button',{name:/Oynamaya Başla/}).waitFor();
   await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
   const capture=async name=>{await p.evaluate(()=>Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode())]));await p.waitForTimeout(220);const f=path.resolve('verification/'+label+'-quality-'+name+'.png');await p.screenshot({path:f});shots[label][name]=f;};
   await capture('splash');
   await p.getByRole('button',{name:/Oynamaya Başla/}).tap();await p.getByRole('heading',{name:'Kelimeyi Anlat'}).waitFor();await capture('slide1');
   await p.getByRole('button',{name:'Devam',exact:true}).tap();await capture('slide2');
   await p.getByRole('button',{name:'Devam',exact:true}).tap();await capture('slide3');
   await p.context().close();
  }
  for(const n of Object.keys(shots.v8))assert(fs.readFileSync(shots.v8[n]).equals(fs.readFileSync(shots.v9[n])),n+' pixels changed');
  checks.push('Splash and 3 slides: identical screenshot PNG bytes with decorations frozen at the same point');
  {
   const p=await page('v9',null,true);await p.getByRole('button',{name:/Oynamaya Başla/}).waitFor();
   await p.getByRole('button',{name:/Oynamaya Başla/}).tap();
   await p.evaluate(()=>{window.__blankFrames=0;window.__watch=true;const f=()=>{if(!window.__watch)return;if(!document.querySelector('h1,h2')){window.__blankFrames++;window.__blankBody=document.body.innerHTML;}requestAnimationFrame(f)};requestAnimationFrame(f)});
   await p.getByRole('button',{name:'Atla',exact:true}).tap();
   await p.getByRole('button',{name:'Şimdilik atla',exact:true}).waitFor();
   const blank=await p.evaluate(()=>{window.__watch=false;return window.__blankFrames});if(blank)console.error(await p.evaluate(()=>window.__blankBody));assert.equal(blank,0);
   await p.getByRole('button',{name:'Şimdilik atla',exact:true}).tap();
   const input=p.getByPlaceholder('İsmini yaz...');await input.fill('Yusuf');await p.waitForTimeout(500);assert.equal(await input.inputValue(),'Yusuf');
   await p.locator('header button').first().tap();await p.getByRole('button',{name:'Şimdilik atla',exact:true}).waitFor();
   checks.push('Fast skip with 500ms delayed game/login imports: no blank frame; name preserved; name-form back works');
   await p.context().close();
  }
  {
   const p=await page('v9');await p.getByRole('button',{name:/Oynamaya Başla/}).waitFor();
   await p.locator('.intro-screen button').first().tap();await p.getByPlaceholder('İsmini yaz...').waitFor();
   await p.locator('header button').first().tap();await p.getByRole('button',{name:/Oynamaya Başla/}).waitFor();
   await p.context().close();checks.push('Profile opened from splash returns to splash');
  }
  {
   const p=await page('v9');await p.getByRole('button',{name:/Oynamaya Başla/}).tap();
   await p.getByRole('heading',{name:'Kelimeyi Anlat'}).waitFor();await p.goBack();await p.getByRole('button',{name:/Oynamaya Başla/}).waitFor();
   await p.getByRole('button',{name:/Oynamaya Başla/}).tap();await p.getByRole('heading',{name:'Kelimeyi Anlat'}).waitFor();
   await p.context().close();checks.push('Browser/device history back during bootstrap and re-entry');
  }
  {
   const p=await page('v9',()=>{localStorage.setItem('cc_onboarded','true');localStorage.setItem('cc_logged_in','guest');localStorage.setItem('couple_chaos_profile',JSON.stringify({username:'Yusuf',avatar:'😎',gamesPlayed:0,streak:0}));});
   await p.getByText('Klasik',{exact:false}).first().waitFor();
   assert.equal(await p.getByRole('button',{name:/Oynamaya Başla/}).count(),0);
   await p.getByText('Klasik',{exact:false}).first().tap();
   await p.waitForFunction(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('/GameScreen-')));
   checks.push('Returning player opens home directly; game code prepared in connect screen before round');
   await p.context().close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors,shots},null,2));
 }finally{await browser.close();for(const s of Object.values(servers))s.close();}
})().catch(e=>{console.error(e);process.exit(1)});
