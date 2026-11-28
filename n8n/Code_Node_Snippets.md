# n8n Code node snippets — Cold Outreach Agent

These are the primary standalone code snippets used by the workflow exports. The JSONs also embed the corresponding code inside the Code nodes.

## Draft validation gate
```javascript
// Hard deterministic gate. Run once for each draft item.
const j = $json;
const body = String(j.body ?? j.draft ?? j.emailBody ?? '').trim();
const expected = String(j.expectedEmail ?? j.apolloEmail ?? j['Contact Email'] ?? '').trim().toLowerCase();
const recipient = String(j.recipientEmail ?? j.to ?? j['Contact Email'] ?? '').trim().toLowerCase();
const verified = j.emailVerified === true || j['Email Verification'] === 'valid';
const words = body.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) ?? [];
const banned = ['i hope this email finds you well','game-changer','reach out','synergy','passionate'];
const lower = body.toLowerCase();
const bannedHits = banned.filter(p => lower.includes(p));
const placeholders = /\[[^\]]+\]|\{\{[^}]+\}\}|\b(?:YOUR_NAME|YOUR_EMAIL|RESUME_URL|PORTFOLIO_URL|COMPANY_NAME|RECRUITER_NAME)\b|REPLACE_WITH/i.test(body);
const resumeUrl=String(j.resumeUrl||''); const portfolioUrl=String(j.portfolioUrl||'');
const minWords = Number(j.minWords ?? 60);
const maxWords = Number(j.maxWords ?? 120);
const questionMarks = (body.match(/\?/g) ?? []).length;
const reasons = [];
if (!body) reasons.push('empty body');
if (words.length < minWords || words.length > maxWords) reasons.push(`word count ${words.length} outside ${minWords}-${maxWords}`);
if (questionMarks !== 1) reasons.push(`expected exactly one question mark; found ${questionMarks}`);
if (bannedHits.length) reasons.push(`banned phrase(s): ${bannedHits.join(', ')}`);
if (placeholders) reasons.push('leftover placeholder detected');
if (j.mode!=='FOLLOW_UP' && (!/^https?:\/\//i.test(resumeUrl) || !body.includes(resumeUrl))) reasons.push('real resume URL missing from draft');
if (j.mode!=='FOLLOW_UP' && (!/^https?:\/\//i.test(portfolioUrl) || !body.includes(portfolioUrl))) reasons.push('real portfolio URL missing from draft');
if (!expected || recipient !== expected) reasons.push('recipient does not match Apollo result');
if (!verified) reasons.push('email has not passed verification');
return [{json:{...j, body, wordCount:words.length, questionMarks, gatePassed:reasons.length===0, gateReasons:reasons}}];
```

## Daily quota + ramp gate
```javascript
// Run after reading the Log tab. Counts each job+recipient once even though
// a send has both SEND_RESERVED and SEND_SUCCESS audit rows.
const logs=$input.all().map(x=>x.json);
const now=new Date();
const dateInIndia=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const today=dateInIndia(now);
const rampStartRaw=(typeof $env!=='undefined'&&$env.SEND_RAMP_START_DATE)?$env.SEND_RAMP_START_DATE:today;
const rampStart=new Date(`${rampStartRaw}T00:00:00+05:30`);
const todayStart=new Date(`${today}T00:00:00+05:30`);
const elapsedDays=Math.max(0,Math.floor((todayStart-rampStart)/86400000));
const cap=elapsedDays<7?5:elapsedDays<14?10:elapsedDays<21?20:30;
const keys=new Set();
for(const r of logs){
 const stage=String(r.Stage??r.stage??'').toUpperCase();
 if(stage!=='SEND_RESERVED'&&stage!=='SEND_SUCCESS')continue;
 const ts=new Date(r.Timestamp??r.timestamp??'');
 if(Number.isNaN(ts.getTime())||dateInIndia(ts)!==today)continue;
 const link=String(r['Job Link']||'').trim();
 const email=String(r['Contact Email']||'').trim().toLowerCase();
 keys.add((link&&email)?`${link}|${email}`:String(r['Message ID']||r['Execution ID']||`${stage}|${ts.toISOString()}`));
}
const sendsToday=keys.size;
const liveSendsEnabled=String($env.LIVE_SENDS_ENABLED||'false').toLowerCase()==='true';
return [{json:{...$json,canSend:liveSendsEnabled&&sendsToday<cap,liveSendsEnabled,sendsToday,dailyCap:cap,remainingToday:Math.max(0,cap-sendsToday),rampDay:elapsedDays+1,todayIndia:today}}];
```

## Main workflow supporting nodes

### Build Search Config
```javascript
const companies = [
 {name:'NVIDIA', domain:'nvidia.com', careers:'jobs.nvidia.com'},
 {name:'Boston Dynamics', domain:'bostondynamics.com', careers:'bostondynamics.com'},
 {name:'Figure AI', domain:'figure.ai', careers:'figure.ai'},
 {name:'Tesla', domain:'tesla.com', careers:'tesla.com'},
 {name:'Agility Robotics', domain:'agilityrobotics.com', careers:'agilityrobotics.com'}
];
const keywords = [
 'robotics software engineer','robotics engineer','robotics engineer intern','robotics software intern',
 'robotics intern','autonomous systems engineer','perception engineer','computer vision engineer',
 'machine learning engineer','ai engineer','embedded software engineer','controls engineer'
];
const q = companies.map(c => `site:${c.careers} OR site:${c.domain}/careers (${keywords.map(k=>`"${k}"`).join(' OR ')})`).join('\n');
return [{json:{companies,keywords,queries:q,profile:{name:'Taha Udaipurwala',roles:keywords,locationPreference:'India, remote, global',resumeUrl:($env.RESUME_URL||'REPLACE_WITH_RESUME_URL'),portfolioUrl:($env.PORTFOLIO_URL||'REPLACE_WITH_PORTFOLIO_URL'),sendingEmail:($env.PROFILE_GMAIL||'REPLACE_WITH_GMAIL')}}}];
```

### Normalize and Deduplicate Jobs
```javascript
const cfg = $('Build Search Config').first().json;
const existing = $('Read Existing Jobs').all().map(x=>x.json);
const seen = new Set(existing.map(r=>String(r['Job Link']||'').trim()).filter(Boolean));
const companies = cfg.companies;
const out = [];
for (const item of $input.all()) {
  const payload = item.json || {};
  const results = payload.organicResults || payload.organic_results || payload.results || [];
  for (const r of results) {
    const url = String(r.url || r.link || r.displayedUrl || '').trim();
    const title = String(r.title || '').trim();
    const desc = String(r.description || r.snippet || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const host = (()=>{try{return new URL(url).hostname.replace(/^www\./,'').toLowerCase()}catch{return ''}})();
    const co = companies.find(c => host === c.domain || host.endsWith('.'+c.domain) || host === c.careers || host.endsWith('.'+c.careers));
    if (!co) continue;
    const titleText = title.toLowerCase();
    if (!cfg.keywords.some(k => titleText.includes(k))) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({json:{'Job Link':url,'Company':co.name,'Job Title':title,'Location':'Not specified in search result','Date Found':new Date().toISOString(),'Status':'Found','Posting Text':'','Contact Name':'','Contact Title':'','Contact Email':'','LinkedIn URL':'','Email Verification':'','Draft':'','Replied':'N','First Sent Date':'','Follow-Up Due Date':'','Follow-Up Sent Date':'','History':'','Last Error':'','Approved At':'','Gmail Message ID':'','Gmail Thread ID':''}});
  }
}
return out;
```

### Extract Posting Text
```javascript
const source = $('Append New Job').item.json;
const html = String($json.pageHtml ?? $json.data ?? $json.body ?? $json ?? '');
let text = html
 .replace(/<script[\s\S]*?<\/script>/gi,' ')
 .replace(/<style[\s\S]*?<\/style>/gi,' ')
 .replace(/<noscript[\s\S]*?<\/noscript>/gi,' ')
 .replace(/<[^>]+>/g,' ')
 .replace(/&nbsp;|&#160;/gi,' ')
 .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
 .replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"')
 .replace(/\s+/g,' ').trim();
const words = text.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) || [];
const usefulText = words.length >= 40;
return [{json:{...source,'Posting Text':usefulText?text:'','postingWordCount':words.length,'postingUsable':usefulText,'postingFailureReason':usefulText?'':'Fetched page returned fewer than 40 useful words or was inaccessible'}}];
```

### Rank Apollo Candidates
```javascript
const job = $('Extract Posting Text').item.json;
const people = Array.isArray($json.people) ? $json.people : [];
const priorities = [
 {rank:1,re:/\b(hr manager|human resources manager)\b/i},
 {rank:2,re:/\b(talent acquisition|talent partner|recruiting manager)\b/i},
 {rank:3,re:/\b(recruiter|technical recruiter)\b/i},
 {rank:4,re:/\b(hiring manager)\b/i},
 {rank:5,re:/\b(team lead|tech lead|engineering lead)\b/i},
 {rank:6,re:/\b(engineering manager)\b/i}
];
const candidates = people.filter(p=>p && p.id && p.has_email===true).map(p=>{
 const title=String(p.title||''); const hit=priorities.find(x=>x.re.test(title));
 return hit?{id:p.id,title,first_name:p.first_name||'',organization_name:job.Company,rank:hit.rank,has_email:true}:null;
}).filter(Boolean).sort((a,b)=>a.rank-b.rank).slice(0,10);
if(!candidates.length) return [{json:{...job,hasCandidates:false,details:[]}}];
return [{json:{...job,hasCandidates:true,details:candidates.map(c=>({id:c.id})),candidateRanks:candidates}}];
```

### Choose Unused Contact
```javascript
const job = $('Rank Apollo Candidates').item.json;
const matches = Array.isArray($json.matches) ? $json.matches : [];
const existing = $('Read Contacts — Current Before Selection').all().map(x=>x.json);
const reservedOrContacted = new Set(existing.filter(r=>{
 const state=String(r['Contact State']||'').toLowerCase();
 return Boolean(String(r['Contacted At']||'').trim()) || ['reserved','contacted','do not contact','opted out'].includes(state) || String(r['Opted Out']||'').toUpperCase()==='Y';
}).map(r=>String(r.Email||r['Contact Email']||'').trim().toLowerCase()).filter(Boolean));
const ranks = new Map((job.candidateRanks||[]).map(c=>[c.id,c.rank]));
const priorityNames = ['HR Manager','Talent Acquisition','Recruiter','Hiring Manager','Team Lead','Engineering Manager'];
const candidates = matches.filter(m=>m && m.email && m.id && m.email_status && String(m.email_status).toLowerCase()==='verified')
 .map(m=>({...m,rank:ranks.get(m.id)||99})).sort((a,b)=>a.rank-b.rank);
const selected=candidates.find(m=>!reservedOrContacted.has(String(m.email).trim().toLowerCase()));
const prior=existing.filter(r=>String(r.Company||'').toLowerCase()===String(job.Company).toLowerCase() && String(r['Contacted At']||'').trim());
const history=prior.length?`New job at ${job.Company}; previously contacted: ${prior.map(x=>`${x.Name||x['Contact Name']} (${x.Email})`).join('; ')}`:'';
if(!selected) return [{json:{...job,hasContact:false,history,contactFailure:'No unused verified contact found among the first 10 Apollo candidates'}}];
return [{json:{...job,hasContact:true,Name:selected.name||`${selected.first_name||''} ${selected.last_name||''}`.trim(),Title:selected.title||'','Contact Name':selected.name||`${selected.first_name||''} ${selected.last_name||''}`.trim(),'Contact Title':selected.title||'','Contact Email':String(selected.email).trim().toLowerCase(),'LinkedIn URL':selected.linkedin_url||'','Email Verification':'pending',candidatePriority:selected.rank,history}}];
```

### Email Verification Gate
```javascript
const j=$json; const data=j.data||j;
const status=String(data.status||'').toLowerCase();
const verified=status==='valid';
return [{json:{...j,emailVerified:verified,'Email Verification':status||'unknown',verificationReason:verified?'':'Hunter status must be exactly valid; accept-all, risky, webmail, disposable, unknown and invalid are rejected'}}];
```

### Build OpenAI Draft Request
```javascript
const j=$json;
const system = `You are a careful, evidence-bound career outreach writer. Use only the supplied profile and exact job-posting text. Never invent skills, experience, education, metrics, location eligibility or company facts. If the posting lacks a concrete detail, return [NEEDS-HUMAN] and a reason. Return strict JSON only: {"subject":"...","body":"..."}. Body: 60-120 words, 3-5 sentences, exactly one question mark, recruiter first name, exact job title, one factual job detail, exact resume and portfolio URLs, and this exact opt-out sentence: If this isn't relevant, just reply 'no' and I won't follow up. Never use: I hope this email finds you well, game-changer, reach out, synergy, passionate. No placeholders.`;
const user = `PROFILE: Taha Udaipurwala; early-career robotics software, robotics engineering, AI/ML, autonomous systems, computer vision, embedded software and relevant internships; India/remote/global preference. Resume URL: ${j.resumeUrl||'REPLACE_WITH_RESUME_URL'}. Portfolio URL: ${j.portfolioUrl||'REPLACE_WITH_PORTFOLIO_URL'}.\nRECIPIENT: ${j['Contact Name']} (${j['Contact Title']})\nCOMPANY: ${j.Company}\nJOB TITLE: ${j['Job Title']}\nJOB LINK: ${j['Job Link']}\nJOB POSTING TEXT: ${j['Posting Text']}`;
return [{json:{...j,openaiBody:{model:($env.OPENAI_MODEL||'gpt-4.1-mini'),temperature:0.2,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:user}]}}}];
```

### Parse Draft #1
```javascript
const src=$('Build OpenAI Draft Request').item.json;
let raw=$json.choices?.[0]?.message?.content ?? $json.output ?? $json.text ?? '';
let parsed={};
try { parsed=JSON.parse(raw); } catch(e) { parsed={subject:'',body:String(raw)}; }
const body=String(parsed.body||'').trim();
const resumeUrl='REPLACE_WITH_RESUME_URL'; const portfolioUrl='REPLACE_WITH_PORTFOLIO_URL';
return [{json:{...src,subject:String(parsed.subject||`Question about ${src['Job Title']}`),body,recipientEmail:src['Contact Email'],expectedEmail:src['Contact Email'],emailVerified:src.emailVerified===true,minWords:60,maxWords:120,mode:'INITIAL',resumeUrl,portfolioUrl}}];
```

### Approval Decision Normalizer
```javascript
const j=$json;
const decision=String(j.query?.decision ?? j.params?.decision ?? j.body?.decision ?? '').toLowerCase();
const approved=decision==='approve';
const rejected=decision==='reject';
const timedOut=!approved&&!rejected;
return [{json:{...j,approvalDecision:approved?'approved':rejected?'rejected':'timed_out',approved,jobStatus:approved?'Approved':rejected?'Rejected':'Timed Out'}}];
```



## Review patch — November 27, 2026

### Build Search Config (domain map + profile environment variables)
```javascript
const companies = [
 {name:'NVIDIA', domain:'nvidia.com', careers:'jobs.nvidia.com'},
 {name:'Boston Dynamics', domain:'bostondynamics.com', careers:'bostondynamics.com'},
 {name:'Figure AI', domain:'figure.ai', careers:'figure.ai'},
 {name:'Tesla', domain:'tesla.com', careers:'tesla.com'},
 {name:'Agility Robotics', domain:'agilityrobotics.com', careers:'agilityrobotics.com'}
];
// Derive this map from the single company list. Add new companies above; no fallback domain exists.
const domainMap = Object.fromEntries(companies.map(c => [c.name, c.domain]));
const keywords = [
 'robotics software engineer','robotics engineer','robotics engineer intern','robotics software intern',
 'robotics intern','autonomous systems engineer','perception engineer','computer vision engineer',
 'machine learning engineer','ai engineer','embedded software engineer','controls engineer'
];
const q = companies.map(c => `site:${c.careers} OR site:${c.domain}/careers (${keywords.map(k=>`"${k}"`).join(' OR ')})`).join('\n');
const profile = {
 name: String($env.PROFILE_NAME || 'Taha Udaipurwala').trim(),
 bio: String($env.PROFILE_BIO || 'Early-career candidate focused on robotics software, AI/ML, autonomous systems, perception, computer vision and embedded software. Do not infer specific employment, project, education, metric or skill claims unless separately stated.').trim(),
 roles: keywords,
 locationPreference: String($env.LOCATION_PREFERENCE || 'India, remote, global'),
 resumeUrl: ($env.RESUME_URL||'REPLACE_WITH_RESUME_URL'),
 portfolioUrl: ($env.PORTFOLIO_URL||'REPLACE_WITH_PORTFOLIO_URL'),
 sendingEmail: ($env.PROFILE_GMAIL||'REPLACE_WITH_GMAIL')
};
return [{json:{companies,domainMap,keywords,queries:q,profile}}];
```

### Apollo People Search request body
```javascript
={{ {q_organization_domains_list: [$('Extract Posting Text').item.json.companyDomain], person_titles: ['HR Manager','Talent Acquisition','Recruiter','Hiring Manager','Team Lead','Engineering Manager'], per_page: 100} }}
```

### Retry request payload source
The retry HTTP node references `$('Build OpenAI Draft Request').item.json` for `profileName`, `profileBio`, `resumeUrl`, and `portfolioUrl`, plus the failed gate's body and reasons. It does not read a nonexistent `$json.profile`. See the node in `01_main_pipeline.json` for the complete expression.

### Follow-up pending / send-reserved states
The follow-up workflow writes `Follow-Up Pending Approval` before emailing the approval request, then `Follow-Up Sending — Reserved` after quota reservation and before Gmail. Both statuses are excluded from the daily queue. If Gmail's result is ambiguous, manual reconciliation is required rather than automatic retry.
