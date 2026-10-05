// Report locations and variable names only, never credential values.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
const secrets = new Map()
for(const file of ['.env','.env.local']) {
  let text;try{text=await readFile(file,'utf8')}catch{continue}
  for(const line of text.split(/\r?\n/)) {
    const match=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    if(!match || match[1].startsWith('NEXT_PUBLIC_') || !/SECRET|TOKEN|PASSWORD|API_KEY|DATABASE_URL|DIRECT_URL/.test(match[1]))continue
    const value=match[2].trim().replace(/^["']|["']$/g,'')
    if(value.length>=16 && !/xxx|placeholder/i.test(value))secrets.set(match[1],value)
  }
}
const tracked=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).split('\0').filter(Boolean)
async function walk(dir){let entries;try{entries=await readdir(dir,{withFileTypes:true})}catch{return []}const out=[];for(const entry of entries){const file=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(file));else out.push(file)}return out}
const bundles=await walk((process.env.NEXT_BUILD_DIR||'.next-audit')+'/static')
const hits=[]
for(const file of [...tracked,...bundles]){
  let content;try{content=await readFile(file,'utf8')}catch{continue}
  for(const [variable,value] of secrets)if(content.includes(value))hits.push({file,variable})
}
const report={workingTreeFiles:tracked.length,bundleFiles:bundles.length,privilegedVariablesCompared:secrets.size,hits,limitation:'Exact local credential comparison only; no history scan or unknown-secret discovery.'}
await mkdir('audit-artifacts',{recursive:true})
await writeFile('audit-artifacts/secret-scan.json',JSON.stringify(report,null,2))
console.log(JSON.stringify(report))
if(hits.length)process.exitCode=1
