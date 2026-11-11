import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const base = process.env.GAME_SERVER_URL || 'https://couple-chaos-realtime.byusuf2233123.chatgpt.site';
const times=[];
function request(path, body, client) {
 return new Promise((resolve,reject)=>{
  const args=['--silent','--show-error','--max-time','25','--write-out','\n%{http_code}\n%{time_total}',base+path,'-H','content-type: application/json'];
  if(client) args.push('-H',`authorization: Bearer ${client.token}`,'-H',`x-session-id: ${client.sessionId}`);
  if(body!==undefined)args.push('--data-binary','@-');
  const started=Date.now(),child=spawn('curl',args);let output='',error='';
  child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>error+=x);
  child.on('error',reject);child.on('close',code=>{try{
   if(code)throw Error(`Request failed: ${error}`);
   const lines=output.trim().split('\n'),seconds=+lines.pop(),status=+lines.pop();
   assert.ok(status>=200&&status<300,`${path}: HTTP ${status}`);
   const payload=JSON.parse(lines.join('\n'));times.push({path,ms:Math.round(seconds*1000)});
   if(client){for(const e of payload.events||[])if(e.id>client.cursor){client.pending.push(e);client.cursor=e.id;}}
   resolve(payload);
  }catch(e){reject(e);}});child.stdin.end(body===undefined?'':JSON.stringify(body));
 });
}
async function client(name){return {name,...await request('/api/session',{}),pending:[],cursor:0};}
async function action(c,event,data={}){return request('/api/actions',{after:c.cursor,actions:[{id:crypto.randomUUID(),event,data}]},c);}
async function next(c,event){for(let i=0;i<25;i++) {const idx=c.pending.findIndex(e=>e.event===event);if(idx>=0)return c.pending.splice(idx,1)[0].data;await request(`/api/events?after=${c.cursor}`,undefined,c);await new Promise(r=>setTimeout(r,200));}throw Error(`Missing ${event}`);}
const health=await request('/api/health');assert.equal(health.release,'classic-v7');
console.log('Production v7 healthy');
const [host,guest,third]=await Promise.all([client('Host'),client('Guest'),client('Third')]);
await action(host,'create_room',{mode:'classic',username:'v7 Test Host',locale:'tr'});
const room=await next(host,'room_created');
await action(guest,'join_room',{code:room.code,username:'v7 Test Guest'});
await next(guest,'room_joined');const selector=await next(host,'select_word');
await action(third,'join_room',{code:room.code});assert.match((await next(third,'join_error')).message,/dolu|başlamış/);
console.log('Two-player room and full-room rejection passed');
await request('/api/actions',{after:host.cursor,actions:[{id:crypto.randomUUID(),event:'round_word',data:{word:'Kedi',round:selector.round}},{id:crypto.randomUUID(),event:'send_hint',data:{text:'Miyavlar',id:'hint-v7'}}]},host);
const role=await next(host,'your_role');assert.equal(role.timeLimit,10);assert.equal(role.word,'Kedi');
const guestRole=await next(guest,'your_role');assert.equal(guestRole.word,null);assert.equal(guestRole.timeLimit,10);
assert.equal((await next(guest,'hint_received')).text,'Miyavlar');
const drawing=await next(guest,'start_drawing');assert.equal(drawing.timeLimit,10);assert.equal(drawing.word,undefined);
console.log('Private word, hint delivery and automatic 10-second phase transition passed');
await next(guest,'drawing_time_up');
await action(guest,'submit_drawing',{imageData:'data:image/png;base64,AA==',score:72,comment:'Canlı v7 testi'});
assert.equal((await next(guest,'show_result')).aiScore,72);assert.equal((await next(host,'show_result')).aiScore,72);
console.log('Drawing deadline and shared result passed');
await action(host,'play_again');const rematch=await next(guest,'select_word');assert.equal(rematch.round,2);
await action(guest,'round_word',{word:'Güneş',round:2});assert.equal((await next(guest,'your_role')).role,'describer');assert.equal((await next(host,'your_role')).role,'drawer');
await action(host,'cancel_room');await next(guest,'partner_disconnected');
console.log('Role swap, rematch and room cleanup passed');
console.log(JSON.stringify({requests:times.length,medianMs:times.map(t=>t.ms).sort((a,b)=>a-b)[Math.floor(times.length/2)],maxMs:Math.max(...times.map(t=>t.ms))}));
