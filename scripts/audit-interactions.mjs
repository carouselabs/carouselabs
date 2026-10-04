import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const origin = process.env.AUDIT_ORIGIN || 'http://localhost:3101'
if (!['localhost','127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Localhost only')
const browser=await chromium.launch({ headless:true })
const context=await browser.newContext({ viewport:{width:1440,height:900} })
await context.route('**/*', r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort())
const page=await context.newPage()
await page.goto(origin+'/tools/tap-hold-maker')
await page.locator('input[type=file]').setInputFiles('public/images/msedge_GxpOUT38VY.png')
await page.getByRole('button',{name:'Download for X',exact:true}).waitFor()
await page.evaluate(()=>{window.__exportTiming={start:0,disabledAt:0,largestGap:0}; let last=performance.now();window.__auditTimer=setInterval(()=>{const n=performance.now();window.__exportTiming.largestGap=Math.max(window.__exportTiming.largestGap,n-last);last=n},16);new MutationObserver(()=>{if(document.querySelector('button[title="Download optimized indexed PNG-8 for X"]')?.disabled && !window.__exportTiming.disabledAt)window.__exportTiming.disabledAt=performance.now()}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['disabled']})})
const downloadPromise=page.waitForEvent('download',{timeout:120000})
await page.evaluate(()=>{window.__exportTiming.start=performance.now()})
await page.getByRole('button',{name:'Download for X',exact:true}).click()
const download=await downloadPromise
const result=await page.evaluate(()=>{clearInterval(window.__auditTimer);return {...window.__exportTiming,finished:performance.now()}})
result.feedbackMs=result.disabledAt-result.start;result.completionMs=result.finished-result.start
result.downloadFailure=await download.failure()
await writeFile('audit-artifacts/'+(process.argv[2]||'current')+'-interaction.json',JSON.stringify(result,null,2))
console.log(JSON.stringify(result))
await browser.close()
