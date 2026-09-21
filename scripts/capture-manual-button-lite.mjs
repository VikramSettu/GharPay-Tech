import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const BASE_URL = process.env.CRM_URL || 'https://clean-lead-dream.lovable.app';
const OUT = process.env.SCREENSHOT_DIR || 'manual-button-flows-lite';
const packs = {
  '00-shared-workflow-guarantee': ['/', '/queue', '/handoffs'],
  '01-control-tower': ['/tower', '/tower/review', '/control-tower-team'],
  '02-flow-ops': ['/today', '/execution', '/myt/flow-ops', '/myt/marketplace'],
  '03-tour-conversion-manager': ['/myt/tcm', '/calendar', '/queue'],
  '04-closing-specialist': ['/closing', '/follow-ups', '/revenue'],
  '05-supply-pcm': ['/supply-hub', '/supply-hub/match', '/supply-hub/areas'],
  '06-zone-owner-manager': ['/manager', '/zone-brain', '/monitoring'],
  '07-hr-qa-training': ['/academy', '/coach', '/tower/review'],
  '08-property-owner': ['/owner', '/owner/rooms', '/owner/insights'],
  '09-admin-leadership': ['/health', '/manager', '/help']
};
const destructive = /delete|remove|logout|log out|sign out|archive|reset|clear/i;
const slug = (s) => String(s||'').replace(/^\/+/, '').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80) || 'home';
const mkdirp = d => fs.mkdir(d,{recursive:true});
async function cap(page, file){ await mkdirp(path.dirname(file)); await page.screenshot({path:file,fullPage:false,animations:'disabled',timeout:12000}); }
async function init(page){ await page.evaluate(()=>{try{localStorage.setItem('gharpayy.onboarding.completed.v1','1')}catch{}}).catch(()=>{}); await page.keyboard.press('Escape').catch(()=>{}); }
async function goto(page, route){ await page.goto(new URL(route, BASE_URL).toString(),{waitUntil:'domcontentloaded',timeout:35000}); await page.waitForLoadState('networkidle',{timeout:4000}).catch(()=>{}); await init(page); await page.waitForTimeout(700); }
async function buttons(page){ return await page.evaluate(()=>{
 const els=Array.from(document.querySelectorAll('main button, main [role="button"], main a[role="button"], main a[href]'));
 const out=[]; const seen=new Set();
 for(const el of els){ if(!(el instanceof HTMLElement)||el.closest('aside')) continue; const r=el.getBoundingClientRect(); if(!(r.width>20&&r.height>18&&r.top>=0&&r.top<window.innerHeight&&r.left<window.innerWidth)) continue; let t=(el.innerText||el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').replace(/\s+/g,' ').trim(); if(!t||t.length>45) continue; const k=t.toLowerCase(); if(seen.has(k)) continue; seen.add(k); out.push({text:t,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}); }
 return out.slice(0,5);
});}
async function clickText(page, text){ return await page.evaluate((text)=>{ const norm=s=>(s||'').replace(/\s+/g,' ').trim(); const els=Array.from(document.querySelectorAll('main button, main [role="button"], main a[role="button"], main a[href], [role="dialog"] button')); for(const el of els){ if(!(el instanceof HTMLElement)||el.closest('aside')) continue; const r=el.getBoundingClientRect(); if(!(r.width>20&&r.height>18&&r.top<window.innerHeight)) continue; const t=norm(el.innerText||el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||''); if(t===text){ el.scrollIntoView({block:'center'}); el.click(); return true; }} return false; }, text); }
function explain(role, route, label, skipped){ return {role, route, button:label, skipped, purpose: skipped?'Risk/destructive button; not executed in capture.':'Click to continue this screen workflow.', expected: skipped?'Only use with manager/admin approval.':'Next screen/modal/filter/outcome appears; user must verify fields, save outcome, and create next action before leaving.'}; }
const browser=await chromium.launch({headless:true}); const ctx=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1}); await ctx.addInitScript(()=>{try{localStorage.setItem('gharpayy.onboarding.completed.v1','1')}catch{}}); const page=await ctx.newPage(); page.setDefaultTimeout(8000);
const manifest=[];
for(const [role,routes] of Object.entries(packs)){
 for(const route of routes){ const dir=path.join(OUT,role,slug(route)); try{ await goto(page,route); await cap(page,path.join(dir,'00-screen.png')); const bs=await buttons(page); manifest.push({role,route,screen:path.join(role,slug(route),'00-screen.png'),buttonsFound:bs}); let i=1; for(const b of bs){ const name=`${String(i).padStart(2,'0')}-${slug(b.text)}`; await goto(page,route); await cap(page,path.join(dir,`${name}-before.png`)); const item={role,route,button:b.text,files:{before:path.join(role,slug(route),`${name}-before.png`)},explanation:explain(role,route,b.text,destructive.test(b.text))}; if(!destructive.test(b.text)){ await clickText(page,b.text).catch(()=>false); await page.waitForTimeout(900); await init(page); await cap(page,path.join(dir,`${name}-after.png`)); item.files.after=path.join(role,slug(route),`${name}-after.png`); }
 manifest.push(item); i++; }}catch(e){ manifest.push({role,route,error:e.message}); }}
}
await mkdirp(OUT); await fs.writeFile(path.join(OUT,'button-flow-manifest.json'),JSON.stringify(manifest,null,2)); await browser.close(); console.log('lite button flow complete');
