(() => {
'use strict';
const data=JSON.parse(document.getElementById('metadata').textContent);
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const KEY='jiujie-guide-progress-v1';
const ids=new Set(data.tasks.map(t=>t.id));
const stepIds=new Set(data.tasks.flatMap(t=>t.steps.map(s=>s.id)));
const prepIds=new Set(data.training.map(r=>r.id));
const recordIds=new Set([...data.schedule.map(r=>'dan-'+r.task),'dan-t81-alternate','midloop-log','midloop-day']);
const stageIds=new Set(data.stages.map(s=>s.id));
const initial=()=>({version:1,checks:{},steps:{},stepSkips:{},routes:{},preparations:{},records:{},focus:'',skips:{},notes:{},milestones:{},current:'s0',day:''});
let state=initial(),storageOK=true,view='home',query='',timer,toastTimer;
function validState(raw){
 if(!raw||raw.version!==1||typeof raw!=='object')throw Error('不支持的进度文件');
 const r=initial();
 for(const k of ['checks','steps','stepSkips','preparations','records','skips','notes','milestones']){
   if(raw[k]===undefined)continue;
   if(!raw[k]||typeof raw[k]!=='object'||Array.isArray(raw[k]))throw Error('进度格式不正确');
   for(const [id,v] of Object.entries(raw[k])){
     if(!(k==='milestones'?stageIds:k==='steps'||k==='stepSkips'?stepIds:k==='preparations'?prepIds:k==='records'?recordIds:ids).has(id))continue;
     if(k==='notes'||k==='records'){if(typeof v!=='string'||v.length>100000)throw Error('笔记格式不正确');r[k][id]=v;}
     else if(typeof v==='boolean')r[k][id]=v;
   }
 }
 for(const [oldId,newId] of Object.entries(data.legacyStepAliases)){if((raw.videoChecks?.[oldId]===true||raw.steps?.[oldId]===true)&&r.steps[newId]===undefined)r.steps[newId]=true;}
 for(const [id,route] of Object.entries(raw.routes||{})){if(data.tasks.find(t=>t.id===id)?.routes?.some(r=>r.id===route))r.routes[id]=route;}
 for(const id of stepIds)if(r.steps[id])r.stepSkips[id]=false;
 r.current=stageIds.has(raw.current)?raw.current:'s0';
 r.focus=ids.has(raw.focus)?raw.focus:'';
 r.day=String(raw.day??'').match(/^\d{1,5}$/)?String(raw.day):'';
 for(const id of ids)if(r.checks[id])r.skips[id]=false;
 return r;
}
try{const stored=localStorage.getItem(KEY);if(stored)state=validState(JSON.parse(stored));}catch(err){storageOK=false;}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function save(){
 state.updatedAt=new Date().toISOString();
 try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;$('#save-status').textContent=data.readingGuide?'笔记已自动保存':'进度已自动保存';}
 catch(err){storageOK=false;$('#save-status').textContent='浏览器未能保存，请导出进度';}
}
function stats(s){const ts=s?s.tasks:data.tasks;let done=0,skip=0;ts.forEach(t=>{if(state.checks[t.id])done++;else if(state.skips[t.id])skip++;});const applicable=ts.length-skip;return{done,skip,total:ts.length,applicable,percent:applicable?Math.round(done/applicable*100):0};}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// Runs inside the guide application's scope to keep route changes consistent.
const OPENING_KEY='jiujie-guide-opening-v1';
let openingRoute='body';
try{const saved=localStorage.getItem(OPENING_KEY);if(data.openingRoutes?.profiles[saved])openingRoute=saved;}catch(error){}
const openingOriginalTitles=new Map(data.tasks.map(t=>[t.id,$('#'+t.id+' .guide-article > summary strong')?.textContent]));
const openingOriginalSummaries=new Map(data.tasks.map(t=>[t.id,$('#'+t.id+' .guide-article > summary > span')?.textContent]));
const openingOriginalHeadings=new Map(data.stages.map(s=>[s.id,$('#'+s.id+' .stage-heading > p')?.textContent]));
function paintOpeningRoute(){
 if(!data.openingRoutes)return;
 const config=data.openingRoutes,profile=config.profiles[openingRoute],alternate=openingRoute==='feiyu';
 document.body.dataset.openingRoute=openingRoute;
 document.title=alternate?'正道攻略 · 飞羽三阳路线':'九劫正道 · 流程与 Wiki';
 const heroLabel=$('.hero h1 em');if(heroLabel)heroLabel.textContent=alternate?'飞羽三阳路线':'流程与 Wiki';
 const defenseQuestion=$('.question-links a[href="#s6"]');if(defenseQuestion)defenseQuestion.textContent=alternate?'守家与化形怎么安排？':'第80天怎么守？';
 $$('[data-opening-route]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.openingRoute===openingRoute)));
 $$('.opening-select').forEach(s=>s.value=openingRoute);
 $$('.opening-basis').forEach(s=>s.textContent=profile.basis);
 data.stages.forEach((stage,i)=>{
   const p=profile.stages[i],root=$('#'+stage.id),heading=root.querySelector('.stage-heading h2');
   heading.textContent=p.title;
   root.querySelector('.stage-heading > p').textContent=alternate?p.priorities.join(' '):openingOriginalHeadings.get(stage.id);
   const day=root.querySelector('.day-badge');if(day)day.textContent=p.day;
   const fields=root.querySelectorAll('.stage-overview > div > p');fields[0].textContent=p.goal;fields[1].textContent=p.prep;
   root.querySelector('.opening-stage-plan').hidden=!alternate;
   if(alternate&&i===0){const links=root.querySelector('.guide-wiki-links');if(!links.dataset.normalHtml)links.dataset.normalHtml=links.innerHTML;links.innerHTML='<a href="#reference-staff">岗位与人员 →</a><a href="#arrays-midgame-wood">三阳用木阵 →</a><a href="#reference-talismans">双符修本命 →</a>';}
   else if(i===0){const links=root.querySelector('.guide-wiki-links');if(links.dataset.normalHtml)links.innerHTML=links.dataset.normalHtml;}
   for(const selector of [`#stage-nav a[href="#${stage.id}"]`,`#roadmap a[href="#${stage.id}"]`]){
     const link=$(selector);if(!link)continue;
     if(link.classList.contains('road-card')){link.querySelector('h3').textContent=p.title;link.querySelector('.card-day').textContent=p.day;link.querySelector('.card-goal').textContent=p.goal;}
     else {const label=link.querySelector('span:nth-child(2)');label.replaceChildren(document.createTextNode(p.title));const small=document.createElement('small');small.textContent=p.day;label.append(small);}
   }
 });
 for(const [id,title] of Object.entries(config.variants)){
   const task=$('#'+id),variant=task.querySelector('.opening-feiyu'),comparison=task.querySelector('.opening-original');
   variant.hidden=!alternate;
   if(task.dataset.openingApplied!==openingRoute){comparison.open=!alternate;task.dataset.openingApplied=openingRoute;}
   task.querySelector('.guide-article > summary strong').textContent=alternate?title:openingOriginalTitles.get(id);
   task.querySelector('.guide-article > summary > span').textContent=alternate?'按飞羽分工与资源顺序推进；原有资料可展开对照。':openingOriginalSummaries.get(id);
   $$(`.flow-index a[href="#${id}"]`).forEach(a=>a.textContent=alternate?title:openingOriginalTitles.get(id));
 }
 // These five choices describe entire source routes, so they follow the global
 // selection. Optional later builds still have their own independent guidance.
 config.coreTasks.forEach(id=>{$('#'+id+' .task-route-picker').hidden=true;});
 const stages=data.stages.map(s=>$('#'+s.id+' .stage-heading h2').textContent);
 $$('.stage-pagination a').forEach(a=>{const i=data.stages.findIndex(s=>a.hash==='#'+s.id);if(i>=0)a.textContent=stages[i];});
 paintOpeningVisibility();
}
function paintOpeningVisibility(){
 if(!data.openingRoutes)return;
 const alternate=openingRoute==='feiyu';let target=null;
 const stageIndex=data.stages.findIndex(s=>s.id===view);if(stageIndex>=0)$('#crumb').textContent=data.openingRoutes.profiles[openingRoute].stages[stageIndex].title;
 try{target=document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch(error){}
 for(const id of data.openingRoutes.bodyOnly){
   const card=$('#'+id),direct=!!target&&(target===card||card.contains(target));
   card.classList.toggle('opening-omitted',alternate&&!direct);
   $$(`.flow-index a[href="#${id}"]`).forEach(a=>a.classList.toggle('opening-omitted',alternate));
 }
}
function setOpeningRoute(route){
 if(!data.openingRoutes?.profiles[route])return;
 openingRoute=route;
 try{localStorage.setItem(OPENING_KEY,route);}catch(error){}
 refresh();applyFilter();
 const target=document.getElementById(location.hash.slice(1));
 if(target?.closest('.opening-omitted'))go('opening-routes');
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-opening-route]');if(button)setOpeningRoute(button.dataset.openingRoute);});
document.addEventListener('change',event=>{if(event.target.matches('.opening-select'))setOpeningRoute(event.target.value);});

function routeOf(t,override){if(data.openingRoutes?.coreTasks.includes(t.id))return openingRoute==='feiyu'?'alternate':'main';return override||state.routes[t.id]||t.routes?.[0].id;}
function activeSteps(t,override){const route=routeOf(t,override);return t.steps.filter(s=>(!s.route||s.route===route)&&!state.stepSkips[s.id]);}
function stepProgress(t,override){const steps=activeSteps(t,override);return{steps,done:steps.filter(s=>state.steps[s.id]).length,total:steps.length};}
function updateTaskCompletion(id){const steps=activeSteps(data.tasks.find(t=>t.id===id));state.checks[id]=steps.length>0&&steps.every(s=>state.steps[s.id]);}
function refresh(){
 $$('[data-route]').forEach(el=>{const t=data.tasks.find(t=>t.id===el.dataset.task);const selected=routeOf(t)===el.dataset.route;el.setAttribute('aria-selected',String(selected));el.tabIndex=selected?0:-1;});
 data.tasks.filter(t=>t.routes).forEach(t=>{const r=t.routes.find(r=>r.id===routeOf(t)),card=$('#'+t.id);card.querySelector('.task-desc').textContent=r.desc;const fields=card.querySelectorAll('.quest-facts dd');if(fields[0])fields[0].textContent=r.actor;if(fields[1])fields[1].textContent=r.needs;card.querySelector('.acceptance p').textContent=r.acceptance;});
 $$('[data-route-content]').forEach(el=>{el.hidden=el.dataset.routeContent!==routeOf(data.tasks.find(t=>t.id===el.dataset.task));});
 $$('[data-step-row]').forEach(el=>{const t=data.tasks.find(t=>t.id===el.closest('.task').id);el.hidden=!!el.dataset.stepRoute&&el.dataset.stepRoute!==routeOf(t);el.classList.toggle('step-not-used',!!state.stepSkips[el.dataset.stepRow]);});
 data.tasks.forEach(t=>{let number=0;$$('#'+t.id+' > .objectives > [data-step-row]').filter(el=>!el.hidden).forEach(el=>{el.querySelector('.step-number').textContent=state.stepSkips[el.dataset.stepRow]?'—':String(++number).padStart(2,'0');});});
 $$('[data-step-skip]').forEach(el=>el.textContent=state.stepSkips[el.dataset.stepSkip]?'恢复此项':'不采用此项');
 $$('[data-prep]').forEach(el=>{el.checked=!!state.preparations[el.dataset.prep];el.closest('tr').classList.toggle('prep-done',el.checked);});
 $$('[data-record]').forEach(el=>{if(document.activeElement!==el)el.value=state.records[el.dataset.record]||'';});
 $$('[data-step]').forEach(el=>{el.checked=!!state.steps[el.dataset.step];el.closest('li').classList.toggle('step-done',el.checked);});
 data.tasks.forEach(t=>{const p=stepProgress(t);$(`[data-step-count="${t.id}"]`).textContent=`${p.done} / ${p.total} 步${state.checks[t.id]&&p.done<p.total?' · 整项已标记，可继续逐步核对':''}`;});
 const all=stats();$('#total-percent').textContent=all.percent;$('#total-count').textContent=`${all.done} / ${all.applicable} 项`;$('#total-bar').style.width=all.percent+'%';
 $('#stage-nav').innerHTML=data.stages.map((s,i)=>{const p=stats(s);return `<a class="stage-link ${view===s.id?'active':''}" href="#${s.id}"><span class="nav-num">${String(i+1).padStart(2,'0')}</span><span>${esc(s.title)}<small>${p.done}/${p.applicable} 完成${p.skip?' · '+p.skip+' 不采用':''}</small></span>${state.milestones[s.id]?'<span class="nav-done">✓</span>':''}</a>`;}).join('');
 const loop=data.tasks.find(t=>t.id==='tMidLoop'),loopProgress=stepProgress(loop);
 const loopNav=document.createElement('a');loopNav.href='#midgame';loopNav.className='stage-link'+(view==='midgame'?' active':'');
 loopNav.innerHTML=`<span class="nav-num">↻</span><span>第80天前 · 中期循环<small>跨阶段循环 · 本轮 ${loopProgress.done}/${loopProgress.total} 步</small></span>`;
 $('#stage-nav').insertBefore(loopNav,$('#stage-nav a[href="#s6"]'));
 $('#roadmap').innerHTML=data.stages.map((s,i)=>{const p=stats(s);return `<a class="road-card ${state.current===s.id?'current':''}" href="#${s.id}"><div class="card-top"><span class="number">${String(i+1).padStart(2,'0')}</span><span class="current-tag">${state.milestones[s.id]?'里程碑已验收':state.current===s.id?'当前阶段 ↗':'CHAPTER'}</span></div><h3>${esc(s.title)}</h3><span class="card-day">${esc(s.day)}</span><div class="card-bottom"><span>${p.done} / ${p.applicable} 完成</span><div class="card-bar"><i style="width:${p.percent}%"></i></div><span>↗</span></div></a>`;}).join('');
 const loopCard=document.createElement('a');loopCard.href='#midgame';loopCard.className='road-card'+(view==='midgame'?' current':'');
 loopCard.innerHTML=`<div class="card-top"><span class="number">↻</span><span class="current-tag">循环任务</span></div><h3>第80天前 · 中期循环</h3><span class="card-day">堂主成型后开启 · 与培养、战备并行</span><div class="card-bottom"><span>本轮 ${loopProgress.done} / ${loopProgress.total} 步</span><div class="card-bar"><i style="width:${loopProgress.total?Math.round(loopProgress.done/loopProgress.total*100):0}%"></i></div><span>↗</span></div>`;
 $('#roadmap').insertBefore(loopCard,$('#roadmap a[href="#s6"]'));
 $$('[data-check]').forEach(el=>{const id=el.dataset.check;el.checked=!!state.checks[id];const card=el.closest('.task');card.classList.toggle('done',el.checked);card.classList.toggle('skipped',!!state.skips[id]);card.querySelector('.task-status').textContent=el.checked?'已完成':state.skips[id]?'此路线不采用':'';card.querySelector('.skip').textContent=state.skips[id]?'恢复待办':'不采用';card.querySelector('.skip').setAttribute('aria-pressed',String(!!state.skips[id]));});
 $$('[data-milestone]').forEach(el=>{el.checked=!!state.milestones[el.dataset.milestone]});
 data.stages.forEach(s=>{const p=stats(s);$(`[data-count="${s.id}"]`).textContent=`${p.done} / ${p.applicable} 项已完成${p.skip?' · '+p.skip+' 项不采用':''}`;$(`[data-bar="${s.id}"]`).style.width=p.percent+'%';const pin=$(`[data-pin="${s.id}"]`);pin.textContent=state.current===s.id?'✓ 当前修行阶段':'设为当前阶段';});
 $$('nav>a').forEach(a=>a.classList.toggle('active',a.hash==='#'+view));
 if(data.readingGuide)paintReadingOverview();else paintTracker();
 paintPersonTasks();
 paintOpeningRoute();
}
function taskGroup(t){return t.standalone?{title:'中期循环 · 独立任务',day:'堂主成型后，持续到第80天前'}:data.stages.find(s=>s.id===t.stage);}
function paintReadingOverview(){
 $('#stage-nav').innerHTML=data.stages.map((s,i)=>`<a class="stage-link ${view===s.id?'active':''}" href="#${s.id}"><span class="nav-num">${String(i+1).padStart(2,'0')}</span><span>${esc(s.title)}<small>${esc(s.day)}</small></span></a>`).join('');
 $('#roadmap').innerHTML=data.stages.map((s,i)=>`<a class="road-card" href="#${s.id}"><div class="card-top"><span class="number">${String(i+1).padStart(2,'0')}</span><span>${i>=9?'长期专题':'阶段流程'}</span></div><h3>${esc(s.title)}</h3><span class="card-day">${esc(s.day)}</span><p class="card-goal">${esc(s.milestone)}</p><div class="card-bottom">看本阶段怎么推进 →</div></a>`).join('');
 const loopLink=document.createElement('a');loopLink.className='stage-link';loopLink.href='#midgame';loopLink.innerHTML='<span class="nav-num">↻</span><span>中期日常事务<small>按成熟、冷却和物资需求查阅</small></span>';
 $('#stage-nav').insertBefore(loopLink,$('#stage-nav a[href="#s6"]'));
}
function taskStatus(t){return state.skips[t.id]?'skipped':state.checks[t.id]?'done':activeSteps(t).some(s=>state.steps[s.id])||data.training.some(r=>r.task===t.id&&state.preparations[r.id])||state.focus===t.id?'active':'todo';}
function paintTracker(){
 const ps=data.tasks.filter(t=>!state.skips[t.id]).map(t=>stepProgress(t)),checkedSteps=ps.reduce((n,p)=>n+p.done,0),totalSteps=ps.reduce((n,p)=>n+p.total,0),prepared=Object.values(state.preparations).filter(Boolean).length;
 $('#tracker-metrics').innerHTML=`<div><b>${stats().done} / ${stats().applicable}</b><span>适用任务组完成</span></div><div><b>${checkedSteps} / ${totalSteps}</b><span>统一任务步骤（按当前做法）</span></div><div><b>${prepared} / ${prepIds.size}</b><span>技能 / 本命已核对（含可选项）</span></div><div><b>${Object.values(state.milestones).filter(Boolean).length} / 12</b><span>里程碑已验收</span></div>`;
 const focus=data.tasks.find(t=>t.id===state.focus)||data.tasks.find(t=>t.stage===state.current&&!state.checks[t.id]&&!state.skips[t.id])||data.tasks.find(t=>!state.checks[t.id]&&!state.skips[t.id]);
 if(focus){const next=activeSteps(focus).filter(s=>!state.steps[s.id]).slice(0,3);$('#tracked-task').innerHTML=`<span class="eyebrow">${state.focus?'正在追踪':'当前阶段 · 建议继续'}</span><h3>${esc(focus.title)}</h3><p>${esc(focus.actor)} · ${esc(taskGroup(focus).day)}</p><ol class="objectives">${next.map(s=>`<li><label><input type="checkbox" data-step="${s.id}" data-parent="${focus.id}"><span class="step-number">→</span><span>${esc(s.text)}</span></label></li>`).join('')}</ol><p>${next.length?'接下来尚未勾选的步骤；原帖与视频要点已合并，完整操作细节见任务卡。':'操作步骤已全部勾选，请在阶段中验收里程碑。'}</p><a class="sheet-link" href="#${focus.id}">打开任务完整执行卡 →</a><label class="record-label">材料缺口 / 下一步备注<textarea data-note="${focus.id}">${esc(state.notes[focus.id]||'')}</textarea></label>`;}
 else $('#tracked-task').innerHTML='<h3>适用任务组已全部完成</h3><p>可在下表查看记录，并核对各阶段里程碑。</p>';
 const stage=$('#tracker-stage').value,status=$('#tracker-status').value;
 const list=data.tasks.filter(t=>(stage==='all'||stage===t.stage)&&(status==='all'||status==='pending'&&!['done','skipped'].includes(taskStatus(t))||taskStatus(t)===status));
 const labels={done:'已完成',skipped:'不采用',active:'进行中',todo:'未开始'};
 $('#tracker-list').innerHTML=list.length?`<div class="sheet-scroll"><table><thead><tr><th>状态</th><th>任务 / 阶段</th><th>操作步骤</th><th>技能核对</th><th>追踪</th></tr></thead><tbody>${list.map(t=>{const prep=data.training.filter(r=>r.task===t.id),p=stepProgress(t);return `<tr><td><span class="status-pill ${taskStatus(t)}">${labels[taskStatus(t)]}</span></td><td><a href="#${t.id}">${esc(t.title)}</a><small>${esc(taskGroup(t).title)}${t.routes?' · '+esc(t.routes.find(r=>r.id===routeOf(t)).label):''}</small></td><td>${p.done} / ${p.total}${state.checks[t.id]&&p.done<p.total?'<small>整项标记，细步未全勾</small>':''}</td><td>${prep.length?`${prep.filter(r=>state.preparations[r.id]).length} / ${prep.length}`:'—'}</td><td><button data-track="${t.id}">${state.focus===t.id?'正在追踪':'追踪'}</button></td></tr>`;}).join('')}</tbody></table></div>`:'<p class="sheet">没有符合筛选条件的任务。</p>';
}
function paintPersonTasks(){
 if(data.readingGuide){$$('[data-person-task]').forEach(el=>{const t=data.tasks.find(t=>t.id===el.dataset.personTask);if(t)el.innerHTML=`<h4>${esc(t.title)}</h4><p>${esc(t.desc)}</p><a class="sheet-link" href="#${t.id}" data-select-task-route="${el.dataset.personRoute||''}" data-task="${t.id}">查看培养流程与相关 Wiki →</a>`;});return;}
 $$('[data-person-task]').forEach(el=>{const t=data.tasks.find(t=>t.id===el.dataset.personTask);if(!t)return;const route=el.dataset.personRoute||routeOf(t),p=stepProgress(t,route),next=p.steps.filter(s=>!state.steps[s.id]).slice(0,3);el.innerHTML=`<h4>${esc(t.title)}</h4><p>${p.done} / ${p.total} 步完成${t.routes?' · '+esc(t.routes.find(r=>r.id===route).label):''}</p><ol class="objectives">${next.map(s=>`<li><label><input type="checkbox" data-step="${s.id}" data-parent="${t.id}" data-selected-route="${route||''}"><span class="step-number">→</span><span>${esc(s.text)}</span></label></li>`).join('')}</ol><a class="sheet-link" href="#${t.id}" data-select-task-route="${route||''}" data-task="${t.id}">打开全部操作、技能与结丹记录 →</a>`;});
 $$('[data-person-task]').forEach(el=>{const id=el.dataset.personTask;if(!data.schedule.some(r=>r.task===id))return;const key=id==='t81'&&el.dataset.personRoute==='alternate'?'dan-t81-alternate':'dan-'+id;const label=document.createElement('label');label.className='record-label';label.innerHTML=`结丹计划 / 材料缺口 / 实际丹品<input data-record="${key}" value="${esc(state.records[key]||'')}" placeholder="与对应主任务同步保存">`;el.append(label);});
}
// Keep branch alternatives in accessible tabs while retaining stable deep links.
let tabSerial=0;
function activateTab(set,index,focus=false){
 const buttons=Array.from(set.querySelector(':scope > .tab-list').children),panels=Array.from(set.querySelector(':scope > .tab-panels').children);
 buttons.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;});
 if(focus)buttons[index]?.focus();
}
function makeTabs(container,items,label){
 if(items.length<2)return null;
 const set=document.createElement('div');set.className='tabset';set.dataset.tabset=String(++tabSerial);
 const list=document.createElement('div');list.className='tab-list';list.setAttribute('role','tablist');list.setAttribute('aria-label',label);
 const panels=document.createElement('div');panels.className='tab-panels';
 items.forEach((item,index)=>{const panel=item.el;panel.classList.add('tab-panel');panel.setAttribute('role','tabpanel');panel.id=panel.id||`tab-panel-${tabSerial}-${index}`;panel.setAttribute('aria-labelledby',`tab-button-${tabSerial}-${index}`);const button=document.createElement('button');button.type='button';button.id=`tab-button-${tabSerial}-${index}`;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);button.textContent=item.title;button.addEventListener('click',()=>activateTab(set,index));button.addEventListener('keydown',event=>{const available=Array.from(list.children).map((button,i)=>({button,i})).filter(r=>!r.button.hidden&&!r.button.disabled).map(r=>r.i),pos=available.indexOf(index),n=available.length;let next=event.key==='ArrowRight'?available[(pos+1)%n]:event.key==='ArrowLeft'?available[(pos+n-1)%n]:event.key==='Home'?available[0]:event.key==='End'?available[n-1]:null;if(next!==null&&next!==undefined){event.preventDefault();activateTab(set,next,true);}});list.append(button);panels.append(panel);});
 set.append(list,panels);container.append(set);activateTab(set,0);return set;
}
function revealTabs(target){
 let panel=target.closest('.tab-panel');
 while(panel){const set=panel.parentElement.parentElement;activateTab(set,Array.from(panel.parentElement.children).indexOf(panel));panel=set.parentElement?.closest('.tab-panel');}
}
data.stages.forEach(stage=>{
 if(data.readingGuide)return;
 const container=$('#'+stage.id+' .tasks');
 const set=makeTabs(container,Array.from(container.children).filter(el=>el.classList.contains('task')).map(el=>({el,title:el.querySelector('h3').textContent})),'本阶段任务');
 if(set)set.classList.add('task-tabset');
});
$$('[data-choice-tabs]').forEach(container=>makeTabs(container,Array.from(container.children).map(el=>({el,title:el.querySelector('h4,h3').textContent})),container.dataset.choiceTabs));
const trainingSheets=Array.from($('#training').children).filter(el=>el.classList.contains('sheet'));
// The independent recurring mission uses the same subtab pattern as chapters.
const loopTask=$('#tMidLoop'),loopList=loopTask.querySelector(':scope > .objectives');
if(!data.readingGuide){
const loopTabs=document.createElement('section');loopTabs.className='loop-subtasks';
loopList.before(loopTabs);
const loopLabels=['分工与培养','工具与补给','灵根采收','符纸与换符','门派外交','石碑与封灵','青莲山与四象','建设与寄托虎','飞升与供奉','战备检查'];
const loopPanels=Array.from(loopList.children).map((row,i)=>{
 const panel=document.createElement('section');panel.id='midloop-task-'+(i+1);panel.className='loop-task-panel';
 const list=document.createElement('ol');list.className='objectives';list.start=i+1;list.append(row);panel.append(list);
 return{el:panel,title:loopLabels[i]};
});
loopList.remove();
const loopRecords=document.createElement('section');loopRecords.id='midloop-records';loopRecords.className='loop-task-panel';
loopRecords.append(loopTask.querySelector(':scope > .execution-sheet'),loopTask.querySelector(':scope > .task-note'),loopTask.querySelector(':scope > .task-detail'));
loopPanels.push({el:loopRecords,title:'本轮记录'});
makeTabs(loopTabs,loopPanels,'中期循环任务');
}
$('#training > .quick-links')?.remove();
makeTabs($('#training'),[...trainingSheets.filter(el=>el.id!=='skill-bans'),...trainingSheets.filter(el=>el.id==='skill-bans')].map(el=>({el,title:el.querySelector('h3').textContent})),'选择人物');
const alchemySheets=Array.from($('#alchemy').children).filter(el=>el.matches('.sheet,[data-alchemy-title]'));
makeTabs($('#alchemy'),alchemySheets.map(el=>({el,title:el.dataset.alchemyTitle||(el.id==='dan-timing'?'时辰原表':el.id==='dan-weather'?'天气原表':'季节原表')})),'结丹资料类型');
const arraySheets=Array.from($('#arrays').children).filter(el=>el.matches('.sheet,[data-array-title]'));
makeTabs($('#arrays'),arraySheets.map((el,i)=>({el,title:el.dataset.arrayTitle||(i===0?'聚灵阵摆法':'聚灵物范围与系数')})),'聚灵阵资料');
$$('.array-pair').forEach(pair=>{const items=Array.from(pair.children).map(el=>({el,title:el.querySelector('h4').textContent}));pair.classList.remove('array-pair');makeTabs(pair,items,'聚灵阵版本');});
const tableGroups=data.referenceGroups||[
 ['人力规划',['native-table-60-7','ref-image-182','ref-image-113']],
 ['动物思绪',['native-table-60-0','native-table-60-1','native-table-60-2','native-table-60-3','native-table-60-4','native-table-60-5','ref-image-183']],
 ['聚灵阵',['arrays']],['结丹参考',['alchemy']],['淬体词条',['native-table-60-6']],['灵植',['ref-image-171']],['寄托',['ref-image-404','ref-image-124','ref-image-409','ref-image-438','ref-image-447','ref-image-466']]
];
$('#tables > .quick-links')?.remove();
const groupPanels=tableGroups.map(([title,keys])=>{const el=document.createElement('div');const sheets=keys.map(key=>document.getElementById(key));if(sheets.length===1)el.append(sheets[0]);else makeTabs(el,sheets.map(sheet=>({el:sheet,title:sheet.querySelector('h3').textContent})),title+'表格');return{el,title};});
makeTabs($('#tables'),groupPanels,'资料分类');
function showVideoEpisode(){}
const searchables=$$('[data-searchable]');
const imageEntries=$$('.reference-figure,.image-entry').map((el,i)=>{
 const img=el.querySelector('img');if(!img)return null;
 el.id=el.id||`image-result-${i+1}`;
 const src=img.getAttribute('src'),title=el.querySelector('figcaption')?.textContent||img.getAttribute('aria-label')||img.alt||src;
 return{el,src,title,text:((data.imageSearch?.[src]||'')+' '+title+' '+src).toLowerCase()};
}).filter(Boolean);
// Search produces short result cards. The guide itself stays out of the results view.
const searchRecords=[], archiveRecords=[];
let searchScope='all',searchPage=0,archivePage=0,archiveTimer;
let pendingSearchHit=null,returnSearch=null,hitMarks=[],hitPosition=0;
const PAGE_SIZE=15;
const compact=s=>String(s||'').replace(/\s+/g,' ').trim();
const termsOf=s=>[...new Set(compact(s).toLowerCase().split(' ').filter(Boolean))];
function rangesOf(value,terms){
 const lower=value.toLowerCase(),ranges=[];
 for(const term of terms){let start=0,pos;while((pos=lower.indexOf(term,start))!==-1){ranges.push([pos,pos+term.length]);start=pos+term.length;}}
 ranges.sort((a,b)=>a[0]-b[0]);const merged=[];
 for(const range of ranges){const last=merged.at(-1);if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push([...range]);}
 return merged;
}
function marked(value,terms){
 const text=String(value),ranges=rangesOf(text,terms);let output='',at=0;
 for(const [start,end] of ranges){output+=esc(text.slice(at,start))+'<mark>'+esc(text.slice(start,end))+'</mark>';at=end;}
 return output+esc(text.slice(at));
}
function excerpt(text,terms){
 text=compact(text);const matches=rangesOf(text,terms),start=Math.max(0,(matches[0]?.[0]||0)-48),end=Math.min(text.length,start+170);
 return (start?'…':'')+marked(text.slice(start,end),terms)+(end<text.length?'…':'');
}
function register(record,archive=false){
 record.text=compact(record.text);record.title=compact(record.title);record.index=(record.title+' '+record.text+' '+(record.context||'')).toLowerCase();
 record.key=searchRecords.length;searchRecords.push(record);if(archive)archiveRecords.push(record);
}
function referenceContext(el,fallback='资料库'){
 const card=el.closest('[data-reference-context]');
 return card?[card.dataset.referenceContext,card.dataset.sourceStatus].filter(Boolean).join(' · '):fallback;
}
function referenceText(el){
 const content=el.cloneNode(true);
 content.querySelectorAll('.pack-applicability,.pack-related').forEach(node=>node.remove());
 return content.textContent;
}
data.tasks.forEach(t=>{
 register({kind:'task',title:t.title,text:[t.desc,t.actor,t.needs,t.acceptance].join(' '),context:taskGroup(t).title,target:t.id,taskId:t.id});
 t.steps.forEach((step,i)=>{const row=document.querySelector(`[data-step-row="${step.id}"]`);row.id='find-'+step.id;
  register({kind:'task',title:step.text,text:step.details.map(d=>d.text).join(' ')||step.text,context:taskGroup(t).title+' / '+t.title+' / 步骤'+(i+1),target:row.id,taskId:t.id,route:step.route});
 });
});
$$('.source-block').forEach(floor=>register({kind:'source',title:'原帖 '+floor.dataset.floor+'楼',text:floor.querySelector('.original-body').textContent,context:'原帖正文与楼中楼',target:floor.id,floor:Number(floor.dataset.floor)},true));
$$('#training .person-profile,#training #staff-plan,#tables .sheet').filter(el=>!el.closest('.task')).forEach((el,i)=>{
 el.id=el.id||'find-reference-'+i;
 register({kind:'reference',title:el.querySelector('h3')?.textContent||el.querySelector('figcaption')?.textContent||'资料表格',text:referenceText(el),context:referenceContext(el,el.closest('#training')?'人物 / 人力规划':'资料库'),target:el.id});
});
const preferredImages=new Map();
imageEntries.forEach(r=>{if(!preferredImages.has(r.src)||r.el.closest('#tables'))preferredImages.set(r.src,r);});
for(const r of preferredImages.values()){
 const floor=r.el.closest('.source-block'),task=r.el.closest('.task');
 register({kind:'image',title:r.title,text:r.text,context:referenceContext(r.el,(floor?'原帖'+floor.dataset.floor+'楼 · ':'')+(task?task.querySelector('h3').textContent:'资料库'))+' · 截图文字命中，打开原图核对',target:r.el.closest('[data-reference-context]')?.id||r.el.closest('[id^="ref-image-"]')?.id||r.el.id,src:r.src,taskId:task?.id});
}
// Archive image hits always return to the original floor, not a duplicated library image.
imageEntries.filter(r=>r.el.closest('.source-block')).forEach(r=>{
 const floor=r.el.closest('.source-block');const record={kind:'image',title:'原帖 '+floor.dataset.floor+'楼 · '+r.title,text:compact(r.text),context:'原帖截图 · 点击查看原图',target:r.el.id,src:r.src,floor:Number(floor.dataset.floor)};
 record.index=(record.title+' '+record.text).toLowerCase();record.key=searchRecords.length;searchRecords.push({...record,archiveOnly:true});archiveRecords.push(record);
});
const searchLabels={all:'全部',task:data.readingGuide?'流程与步骤':'任务步骤',source:'原帖',reference:data.readingGuide?'Wiki与人物':'人物与资料',image:'截图'};
function matches(records,raw,scope='all',pending=false){
 const terms=termsOf(raw);if(!terms.length)return [];
 return records.filter(r=>!r.archiveOnly&&(scope==='all'||r.kind===scope)&&(!pending||r.taskId&&!state.checks[r.taskId]&&!state.skips[r.taskId])&&terms.every(term=>r.index.includes(term)||String(r.floor||'')===term))
  .map(r=>({r,score:terms.reduce((n,term)=>n+(r.title.toLowerCase().includes(term)?6:0),0)+(String(r.floor||'')===compact(raw)?20:0)})).sort((a,b)=>b.score-a.score||a.r.key-b.r.key).map(row=>row.r);
}
function resultCards(rows,terms,origin){
 return rows.map(r=>`<article class="search-result"><a class="search-result-link" href="#${r.target}" data-search-key="${r.key}" data-search-origin="${origin}"><span class="result-kind">${searchLabels[r.kind]}</span><h3>${marked(r.title,terms)}</h3><span class="result-context">${marked(r.context,terms)}</span><p>${excerpt(r.text,terms)}</p><span class="result-open">${r.kind==='image'?'定位原图':'打开命中位置'} →</span></a></article>`).join('');
}
function pager(total,page,origin){const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));return pages>1?`<div class="search-pagination"><button data-search-page="${page-1}" data-search-origin="${origin}" ${page===0?'disabled':''}>上一页</button><span>第 ${page+1} / ${pages} 页</span><button data-search-page="${page+1}" data-search-origin="${origin}" ${page>=pages-1?'disabled':''}>下一页</button></div>`:'';}
function renderSearch(){
 const all=matches(searchRecords,query,'all',$('#unfinished').checked),rows=all.filter(r=>searchScope==='all'||r.kind===searchScope),terms=termsOf(query);
 searchPage=Math.max(0,Math.min(searchPage,Math.ceil(rows.length/PAGE_SIZE)-1));
 $('#search-results').innerHTML=`<div class="search-results-heading"><span class="eyebrow">SEARCH / 精确查找</span><h2>搜索结果 <small>${rows.length} 条</small></h2><p>显示命中片段，点击定位正文；多个关键词用空格分隔。</p></div><div class="search-kind-tabs" role="group" aria-label="搜索范围">${Object.entries(searchLabels).map(([key,label])=>`<button data-search-scope="${key}" aria-pressed="${searchScope===key}">${label} <small>${key==='all'?all.length:all.filter(r=>r.kind===key).length}</small></button>`).join('')}</div>${rows.length?resultCards(rows.slice(searchPage*PAGE_SIZE,(searchPage+1)*PAGE_SIZE),terms,'global'):'<p class="search-no-results">没有匹配结果。试试物品名、技能名或更短的关键词。</p>'}${pager(rows.length,searchPage,'global')}`;
 $('#search-status').textContent=`“${$('#search').value.trim()}” · ${rows.length} 条结果`;
}
function renderArchiveSearch(){
 const raw=$('#archive-search').value.trim(),terms=termsOf(raw),active=terms.length>0;
 $('#archive-search-results').hidden=!active;$('#archive-search-clear').hidden=!active;
 $('#floor-index').hidden=active;$('#archive .archive-title').hidden=active;$('#archive .archive-content').hidden=active;
 if(!active){$('#archive-search-results').innerHTML='';return;}
 const rows=matches(archiveRecords,raw);archivePage=Math.max(0,Math.min(archivePage,Math.ceil(rows.length/PAGE_SIZE)-1));
 $('#archive-search-results').innerHTML=`<h3>原帖命中 ${rows.length} 条</h3><p class="muted">搜索全部371楼正文、回复及原图文字，不限于下方补充讨论。</p>${rows.length?resultCards(rows.slice(archivePage*PAGE_SIZE,(archivePage+1)*PAGE_SIZE),terms,'archive'):'<p class="search-no-results">原帖中没有匹配结果。</p>'}${pager(rows.length,archivePage,'archive')}`;
}
function clearHitMarks(){
 $$('mark.search-hit').forEach(mark=>{const parent=mark.parentNode;mark.replaceWith(document.createTextNode(mark.textContent));parent?.normalize();});
 $$('.image-search-hit').forEach(el=>el.classList.remove('image-search-hit'));hitMarks=[];hitPosition=0;
}
function focusHit(index){
 if(!hitMarks.length)return;
 hitPosition=(index+hitMarks.length)%hitMarks.length;
 hitMarks.forEach((mark,i)=>mark.classList.toggle('current-hit',i===hitPosition));
 hitMarks[hitPosition].scrollIntoView({block:'center',behavior:'instant'});
 $('#search-hit-status').textContent=`关键词定位 ${hitPosition+1} / ${hitMarks.length}`;
}
function highlightResult(hit){
 const target=document.getElementById(hit.record.target);if(!target)return;
 target.querySelectorAll('details').forEach(detail=>detail.open=true);
 clearHitMarks();const terms=termsOf(hit.raw),walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT),nodes=[];let node;
 while((node=walker.nextNode()))if(node.nodeValue.trim()&&!node.parentElement.closest('script,style,textarea,select,button,mark'))nodes.push(node);
 for(const node of nodes){const ranges=rangesOf(node.nodeValue,terms);if(!ranges.length)continue;const fragment=document.createDocumentFragment();let at=0;
  for(const [start,end] of ranges){fragment.append(document.createTextNode(node.nodeValue.slice(at,start)));const mark=document.createElement('mark');mark.className='search-hit';mark.textContent=node.nodeValue.slice(start,end);fragment.append(mark);hitMarks.push(mark);at=end;}
  fragment.append(document.createTextNode(node.nodeValue.slice(at)));node.replaceWith(fragment);
 }
 $('#search-hit-bar').hidden=false;$('#search-hit-prev').hidden=$('#search-hit-next').hidden=!hitMarks.length;
 if(hitMarks.length)focusHit(0);else{target.classList.add('image-search-hit');$('#search-hit-status').textContent=hit.record.kind==='image'?'关键词位于原图中，可点击放大查看':'已定位到相关内容';target.scrollIntoView({block:'center'});}
}
function openSearchResult(record,origin){
 const raw=origin==='archive'?$('#archive-search').value:$('#search').value;
 returnSearch={origin,raw,scope:searchScope,page:origin==='archive'?archivePage:searchPage};
 if(record.taskId&&record.route){state.routes[record.taskId]=record.route;save();}
 pendingSearchHit={record,raw};go(record.target);
}
$('#archive-search').oninput=()=>{clearTimeout(archiveTimer);archiveTimer=setTimeout(()=>{archivePage=0;renderArchiveSearch();},160);};
$('#archive-search').onkeydown=event=>{if(event.key==='Enter'){clearTimeout(archiveTimer);archivePage=0;renderArchiveSearch();$('#archive-search-results .search-result-link')?.focus();}};
$('#search').onkeydown=event=>{if(event.key==='Enter'){clearTimeout(timer);query=$('#search').value.trim().toLowerCase();searchPage=0;clearHitMarks();applyFilter();$('#search-results .search-result-link')?.focus();}};
$('#archive-search-clear').onclick=()=>{$('#archive-search').value='';archivePage=0;renderArchiveSearch();};
$('#search-hit-prev').onclick=()=>focusHit(hitPosition-1);
$('#search-hit-next').onclick=()=>focusHit(hitPosition+1);
$('#search-hit-close').onclick=()=>{clearHitMarks();$('#search-hit-bar').hidden=true;returnSearch=null;};
$('#search-back').onclick=()=>{
 const previous=returnSearch;if(!previous)return;clearHitMarks();$('#search-hit-bar').hidden=true;
 if(previous.origin==='archive'){go('archive');$('#archive-search').value=previous.raw;archivePage=previous.page;renderArchiveSearch();}
 else{query=previous.raw.trim().toLowerCase();$('#search').value=previous.raw;searchScope=previous.scope;searchPage=previous.page;applyFilter();$('#search-results').scrollIntoView({block:'start'});}
};
document.addEventListener('click',event=>{
 const link=event.target.closest('[data-search-key]');if(link){event.preventDefault();openSearchResult(searchRecords[Number(link.dataset.searchKey)],link.dataset.searchOrigin);return;}
 const scope=event.target.closest('[data-search-scope]');if(scope){searchScope=scope.dataset.searchScope;searchPage=0;renderSearch();return;}
 const page=event.target.closest('[data-search-page]');if(page){if(page.dataset.searchOrigin==='archive'){archivePage=Number(page.dataset.searchPage);renderArchiveSearch();$('#archive-search-results').scrollIntoView({block:'start'});}else{searchPage=Number(page.dataset.searchPage);renderSearch();$('#search-results').scrollIntoView({block:'start'});}}
});

function applyFilter(){
 const only=$('#unfinished').checked;let count=0;document.body.classList.toggle('searching',!!query);
 $('#clear-search').hidden=!query;
 if(query){
   $$('[data-view]').forEach(section=>section.hidden=true);
   $('#search-results').hidden=false;$('#search-status').hidden=false;$('#empty').hidden=true;
   $('#search-hit-bar').hidden=true;renderSearch();$('#crumb').textContent='搜索结果';return;
 }
 $('#search-results').hidden=true;$('#search-status').hidden=true;
 $$('[data-view]').forEach(section=>section.hidden=section.id!==view);
 searchables.forEach(el=>{const eligible=!only||(el.classList.contains('task')&&!state.checks[el.id]&&!state.skips[el.id]);el.hidden=!eligible;if(eligible&&el.closest('[data-view]').id===view)count++;});
 $$('.tabset').forEach(set=>{const buttons=Array.from(set.querySelector(':scope > .tab-list').children);activateTab(set,Math.max(0,buttons.findIndex(button=>button.getAttribute('aria-selected')==='true')));});
 $$('.task-tabset').forEach(set=>{
   const buttons=Array.from(set.querySelector(':scope > .tab-list').children),panels=Array.from(set.querySelector(':scope > .tab-panels').children);
   const eligible=panels.map(panel=>!only||!state.checks[panel.id]&&!state.skips[panel.id]);
   buttons.forEach((button,i)=>{button.hidden=!eligible[i];button.disabled=!eligible[i];});
   let selected=buttons.findIndex((button,i)=>eligible[i]&&button.getAttribute('aria-selected')==='true');
   if(selected<0)selected=eligible.indexOf(true);
   if(selected>=0)activateTab(set,selected);else panels.forEach(panel=>panel.hidden=true);
 });
 if(view==='archive')renderArchiveSearch();
 $('#empty').hidden=!!count||(!stageIds.has(view)&&view!=='midgame');
 $('#crumb').textContent=data.stages.find(s=>s.id===view)?.title||({home:data.readingGuide?'攻略总览':'旅程总览',archive:'完整原帖索引',tracker:'进度追踪',training:'人物 / 人力规划',tables:data.readingGuide?'专题 Wiki':'表格资料库',midgame:data.readingGuide?'中期日常事务':'中期循环 · 独立任务'}[view]||'攻略总览');
 paintOpeningVisibility();
}
function navigate(hash=location.hash){
 clearHitMarks();if(!pendingSearchHit){$('#search-hit-bar').hidden=true;returnSearch=null;}
 let key=decodeURIComponent(hash.replace(/^#/,''))||'home';let target=document.getElementById(key);
 const aliases={'new-materials':'tables','pack-overview':'tables','pack-group-basic':'reference-staff','pack-group-practice':'reference-laws','pack-group-talisman':'reference-talismans','pack-group-possession':'reference-possession','pack-group-pureyang':'reference-pureyang','pack-group-deity':'reference-deity','pack-group-world':'reference-world','pack-group-mobile':'reference-mobile',...(data.readingGuide?{tracker:'home'}:{})};
 if(aliases[key]){key=aliases[key];target=document.getElementById(key);}
 if(!target)key='home';
 target=document.getElementById(key);
 const openingStep=target.closest('[data-step-row]'),openingTask=target.closest('.task');
 if(openingStep?.dataset.stepRoute&&data.openingRoutes?.coreTasks.includes(openingTask?.id)){
   openingRoute=openingStep.dataset.stepRoute==='alternate'?'feiyu':'body';
   try{localStorage.setItem(OPENING_KEY,openingRoute);}catch(error){}
 }
 const section=target.closest('[data-view]');view=section?section.id:'home';
 query='';$('#search').value='';$('#unfinished').checked=false;
 refresh();applyFilter();
 if(target)revealTabs(target);
 if(data.readingGuide&&target.matches('.task'))target.querySelector('.guide-article').open=true;
 $('#sidebar').classList.remove('mobile-open');$('#menu').setAttribute('aria-expanded','false');
 if(target&&target.id!==view){
   let p=target.parentElement;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}
   requestAnimationFrame(()=>{target.scrollIntoView({block:'start'});target.classList.remove('target-flash');void target.offsetWidth;target.classList.add('target-flash');});
 }else window.scrollTo({top:0,behavior:'instant'});
 const hit=pendingSearchHit;pendingSearchHit=null;if(hit)requestAnimationFrame(()=>highlightResult(hit));
}
function go(id){if(location.hash==='#'+id)navigate('#'+id);else location.hash=id;}
document.addEventListener('toggle',event=>{const detail=event.target;if(detail.matches?.('details.task-detail')&&detail.open)detail.querySelectorAll('details').forEach(child=>child.open=true);},true);
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.matches('[data-prep]')){state.preparations[el.dataset.prep]=el.checked;save();refresh();}
 if(el.matches('[data-step]')){const id=el.dataset.parent;if(el.dataset.selectedRoute)state.routes[id]=el.dataset.selectedRoute;state.steps[el.dataset.step]=el.checked;if(el.checked){state.skips[id]=false;state.stepSkips[el.dataset.step]=false;}updateTaskCompletion(id);save();refresh();applyFilter();}
 if(el.matches('[data-check]')){state.checks[el.dataset.check]=el.checked;if(el.checked)state.skips[el.dataset.check]=false;save();refresh();applyFilter();}
 if(el.matches('[data-milestone]')){state.milestones[el.dataset.milestone]=el.checked;save();refresh();if(el.checked)toast('里程碑已记录。可以继续下一段修行了。');}
});
document.addEventListener('input',event=>{const el=event.target;if(el.matches('[data-note]')){state.notes[el.dataset.note]=el.value;$$('[data-note]').filter(n=>n!==el&&n.dataset.note===el.dataset.note).forEach(n=>n.value=el.value);save();}if(el.matches('[data-record]')){state.records[el.dataset.record]=el.value;$$('[data-record]').filter(n=>n!==el&&n.dataset.record===el.dataset.record).forEach(n=>n.value=el.value);save();}});
document.addEventListener('click',event=>{
 const btn=event.target.closest('button');if(btn){
   if(btn.id==='midloop-next'){
     const t=data.tasks.find(t=>t.id==='tMidLoop'),p=stepProgress(t),day=state.records['midloop-day']||state.day||'未填';
      const snapshot=t.steps.map((s,i)=>`${String(i+1).padStart(2,'0')} [${state.stepSkips[s.id]?'不采用':state.steps[s.id]?'已完成':'待处理'}] ${s.text}`).join('\n');
      const note=state.notes[t.id]?.trim();
      const entry=`第${day}天 · 本轮核对 ${p.done}/${p.total} 项\n${snapshot}${note?'\n本轮备注：'+note:''}`;
     state.records['midloop-log']=(state.records['midloop-log']?state.records['midloop-log']+'\n':'')+entry;
     t.steps.forEach(s=>{delete state.steps[s.id];delete state.stepSkips[s.id];});state.checks[t.id]=false;
     save();refresh();applyFilter();toast('本轮已记录，已开始新一轮核对');
   }
   if(btn.dataset.route){state.routes[btn.dataset.task]=btn.dataset.route;updateTaskCompletion(btn.dataset.task);save();refresh();applyFilter();}
   if(btn.dataset.stepSkip){state.stepSkips[btn.dataset.stepSkip]=!state.stepSkips[btn.dataset.stepSkip];if(state.stepSkips[btn.dataset.stepSkip])state.steps[btn.dataset.stepSkip]=false;updateTaskCompletion(btn.dataset.parent);save();refresh();applyFilter();}
   if(btn.dataset.track){state.focus=btn.dataset.track;save();go('tracker');refresh();}
   if(btn.dataset.cellInfo){btn.closest('[data-cell-panel],.sheet').querySelector('.cell-readout').textContent=btn.dataset.cellInfo;}
   if(btn.dataset.skip){const id=btn.dataset.skip;state.skips[id]=!state.skips[id];if(state.skips[id])state.checks[id]=false;save();refresh();applyFilter();}
   if(btn.dataset.pin){state.current=btn.dataset.pin;save();refresh();toast('已更新当前阶段，下次可从总览继续。');}
   if(btn.dataset.next!==undefined){const next=data.stages[Number(btn.dataset.next)+1];go(next?next.id:'home');}
   if(btn.dataset.expand){$$('#'+btn.dataset.expand+(data.readingGuide?' .guide-article':' .task-detail')).forEach(d=>d.open=true);}
   if(btn.dataset.collapse){$$('#'+btn.dataset.collapse+(data.readingGuide?' .guide-article':' .task-detail')).forEach(d=>d.open=false);}
 }
 const im=event.target.closest('img[data-lightbox]');if(im)openImage(im);
 const link=event.target.closest('a[href^="#"]:not([data-search-key])');if(link&&link.hash===location.hash){event.preventDefault();navigate(link.hash);}
 if(link?.dataset.selectTaskRoute){state.routes[link.dataset.task]=link.dataset.selectTaskRoute;save();refresh();}
});
function openImage(im){$('#large-image').src=im.src;$('#large-image').classList.remove('zoomed');$('#image-open').href=im.src;$('#image-title').textContent=im.getAttribute('src').split('/').pop();$('#lightbox').showModal();}
document.addEventListener('keydown',event=>{
 if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}
 if(event.key==='Escape'){$('#sidebar').classList.remove('mobile-open');$('#menu').setAttribute('aria-expanded','false');}
 if(['Enter',' '].includes(event.key)&&event.target.matches('img[data-lightbox]')){event.preventDefault();openImage(event.target);}
});
$('#close-image').onclick=()=>$('#lightbox').close();
$('#lightbox').onclick=e=>{if(e.target===$('#lightbox'))$('#lightbox').close();};
$('#large-image').onclick=()=>$('#large-image').classList.toggle('zoomed');
$('#menu').onclick=()=>{const open=$('#sidebar').classList.toggle('mobile-open');$('#menu').setAttribute('aria-expanded',String(open));};
document.addEventListener('click',event=>{if(!event.target.closest('#sidebar')&&!event.target.closest('#menu')){$('#sidebar').classList.remove('mobile-open');$('#menu').setAttribute('aria-expanded','false');}});
$('#resume').onclick=()=>go(data.readingGuide?'s0':state.current);
$('#search').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{query=$('#search').value.trim().toLowerCase();searchPage=0;clearHitMarks();applyFilter();if(query)$('#search-status').scrollIntoView({block:'nearest'});},180);};
$('#unfinished').onchange=applyFilter;
$('#clear-search').onclick=()=>{query='';$('#search').value='';applyFilter();};
$('#game-day').value=state.day;
$('#game-day').oninput=()=>{const d=$('#game-day').value;state.day=/^\d{1,5}$/.test(d)?d:'';save();};
$('#locate-day').onclick=()=>{
 const day=Number($('#game-day').value);if(!Number.isInteger(day)||day<1||day>99999){toast('请输入 1—99999 的游戏天数。');return;}
 const idx=day<=3?0:day<=5?1:day<=14?2:day<=21?3:day<=35?4:day<60?5:day<=80?6:7;
 state.day=String(day);save();go(data.stages[idx].id);
 toast(day>80?'第 80 天后按阵容与里程碑推进；这只是建议起点。':'已定位参考阶段；进度落后或提前时按成果调整。');
};
$('#floor-index').innerHTML=$$('.source-block').map(el=>Number(el.dataset.floor)).sort((a,b)=>a-b).map(n=>`<a href="#floor-${n}" title="第 ${n} 楼">${n}</a>`).join('');
$('#jump-floor').onclick=()=>{const n=Number($('#floor-number').value);if(!Number.isInteger(n)||!$('#floor-'+n)){toast('原 HTML 没有这一楼；缺失楼号未补造。');return;}go('floor-'+n);};
$('#floor-number').onkeydown=e=>{if(e.key==='Enter')$('#jump-floor').click();};
$('#export').onclick=()=>{
 const text=JSON.stringify({...state,version:1,exportedAt:new Date().toISOString()},null,2);const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='九劫正道-笔记备份-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast(data.readingGuide?'笔记已导出，已有旧记录也一并保留。':'进度已导出，包含勾选、笔记和当前阶段。');
};
$('#import').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
  if(file.size>10000000)throw Error('文件过大');
  const next=validState(JSON.parse(await file.text()));
  if(!confirm('用这份备份替换当前浏览器的勾选、笔记和阶段进度？'))return;
  state=next;$$('[data-note]').forEach(el=>el.value=state.notes[el.dataset.note]||'');$$('[data-record]').forEach(el=>el.value=state.records[el.dataset.record]||'');$('#game-day').value=state.day;save();refresh();applyFilter();toast('进度已恢复。');
 }catch(err){toast('导入失败：'+err.message+'。当前进度未改变。');}finally{event.target.value='';}
};
$('#print').onclick=()=>{if(view==='home'){go(state.current);setTimeout(()=>window.print(),250);}else window.print();};
let openedForPrint=[];
window.addEventListener('beforeprint',()=>{$$('details').filter(d=>!d.closest('[hidden]')&&!d.classList.contains('ocr')).forEach(d=>{if(!d.open){openedForPrint.push(d);d.open=true;}});});
window.addEventListener('afterprint',()=>{openedForPrint.forEach(d=>d.open=false);openedForPrint=[];});
$('#tracker-stage').innerHTML+='<option value="midgame">中期循环 · 独立任务</option>';
$('#tracker-stage').innerHTML+=data.stages.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join('');
$('#tracker-stage').onchange=paintTracker;$('#tracker-status').onchange=paintTracker;
$('#tracker-records').innerHTML=data.schedule.map(r=>`<label class="record-label">${esc(r.person)}<input data-record="dan-${r.task}" placeholder="计划日期 / 缺少的材料 / 实际结果"></label>`).join('');
function updateTiming(){const el=$('#timing-element').value,h=Number($('#timing-hour').value),v=data.timeRows[el][h];$('#timing-result').textContent=`${el}属性 · ${String(h).padStart(2,'0')}:00 → ${Math.abs(v)}${v>0?'+':v<0?'−':''}（普通时辰；天气另核对）`;}
if($('#timing-element')){$('#timing-element').onchange=updateTiming;$('#timing-hour').onchange=updateTiming;updateTiming();}
$$('[data-note]').forEach(el=>el.value=state.notes[el.dataset.note]||'');
if(!storageOK)$('#save-status').textContent='保存不可用或备份异常，请导出进度';
window.addEventListener('hashchange',()=>navigate());navigate();
})();

(() => {
 const names={paper:'宣纸暖白',jade:'青竹浅绿',sky:'晴空浅蓝',night:'夜读深蓝'};
 function choose(theme){
  if(!names[theme])theme='paper';
  document.documentElement.dataset.theme=theme;
  document.querySelectorAll('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===theme)));
  document.querySelector('#theme-open').title='切换主题 · 当前'+names[theme];
  try{localStorage.setItem('jiujie-guide-theme-v1',theme);}catch(error){}
 }
 choose(document.documentElement.dataset.theme||'paper');
 document.querySelector('#theme-open').onclick=()=>document.querySelector('#theme-dialog').showModal();
 document.querySelector('#theme-close').onclick=()=>document.querySelector('#theme-dialog').close();
 document.querySelector('#theme-dialog').addEventListener('click',event=>{
  const button=event.target.closest('[data-theme-choice]');
  if(button){choose(button.dataset.themeChoice);document.querySelector('#theme-dialog').close();}
  else if(event.target.id==='theme-dialog')document.querySelector('#theme-dialog').close();
 });
})();

(() => {
'use strict';
const data=JSON.parse(document.getElementById('metadata').textContent);
if(!data.readingGuide)return;
const $=selector=>document.querySelector(selector);
const byId=id=>document.getElementById(id);
const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='jiujie-guide-reading-v1';
let stored={saved:[],recent:[]},previous=location.hash||'#home',flowReturn='';
try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');for(const key of ['saved','recent'])if(Array.isArray(raw[key]))stored[key]=raw[key].filter(r=>r&&typeof r.id==='string'&&typeof r.title==='string'&&byId(r.id)).slice(0,30);}catch(error){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(stored));}catch(error){}}
function feedback(message){$('#reader-feedback').textContent=message;}
function current(){
 let id;try{id=decodeURIComponent(location.hash.slice(1))||'home';}catch(error){id='home';}
 let el=byId(id)||byId('home');
 const card=el.closest('.task,[data-reference-context]');
 if(card){el=card;id=card.id;}
 let title=el.querySelector('.guide-article > summary strong,h3,.stage-heading h2')?.textContent?.trim()||el.querySelector('figcaption')?.textContent?.trim()||id;
 const stage=data.stages.find(s=>s.id===id);
 if(stage){const route=document.body.dataset.openingRoute||'body';title=data.openingRoutes?.profiles[route]?.stages[data.stages.indexOf(stage)]?.title||stage.title;}
 if(id==='tables')title='专题 Wiki';
 if(id==='home')title='攻略总览';
 if(id==='roadmap')title='阶段路线';
 return {id:el.id,title};
}
function shelf(){
 for(const [key,label] of [['saved','常用收藏'],['recent','最近查阅']]){
  const root=byId(key==='saved'?'saved-pages':'recent-pages');
  root.innerHTML=stored[key].length?`<h2>${label}</h2><div class="shelf-links">${stored[key].slice(0,6).map(r=>`<a href="#${esc(r.id)}">${esc(r.title)} →</a>`).join('')}</div>`:'';
 }
 $('#reading-shelf').hidden=!stored.saved.length&&!stored.recent.length;
}
const wiki=byId('tables'),set=wiki.querySelector(':scope > .tabset');
const layout=document.createElement('div');layout.className='wiki-reader';
const directory=document.createElement('aside');directory.className='wiki-directory';directory.setAttribute('aria-label','Wiki目录');
const select=document.createElement('select');select.id='wiki-document-select';select.setAttribute('aria-label','选择Wiki条目');
select.innerHTML='<option value="">选择要查阅的条目……</option>';
const directoryTitle=document.createElement('strong');directoryTitle.textContent='Wiki 目录';directory.append(directoryTitle);
const options=[];
for(const [title,keys] of data.referenceGroups){
 const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=title;details.dataset.topic=keys[0];details.append(summary);
 const list=document.createElement('div');list.className='wiki-directory-links';
 const group=document.createElement('optgroup');group.label=title;
 const seen=new Set();
 for(const key of keys){
  const root=byId(key);if(!root)continue;
  const cards=[...(root.matches('.sheet')?[root]:[]),...root.querySelectorAll('.sheet')].filter(el=>!el.querySelector('.sheet'));
  for(const card of cards){
   const target=card.id||card.querySelector('[id]')?.id;
   if(!target||seen.has(target))continue;seen.add(target);
   const name=card.querySelector('h3')?.textContent?.trim()||card.querySelector('figcaption')?.textContent?.trim()||title;
   const a=document.createElement('a');a.href='#'+target;a.textContent=name;list.append(a);
   const option=document.createElement('option');option.value=target;option.textContent=name;group.append(option);
   options.push({id:target,title:name,topic:keys[0]});
  }
 }
 details.append(list);directory.append(details);select.append(group);
}
select.onchange=()=>{if(select.value)location.hash=select.value;};
set.before(select,layout);layout.append(directory,set);wiki.classList.add('wiki-with-directory');
function update(){
 const now=current(),el=byId(now.id);
 if(now.id!=='home'&&now.id!=='roadmap'){
  stored.recent=[now,...stored.recent.filter(r=>r.id!==now.id)].slice(0,12);persist();
 }
 const isWiki=!!el?.closest('#tables');
 const prior=byId(previous.replace(/^#/,''));
 if(isWiki&&prior?.closest('.stage,#midgame,.task'))flowReturn=previous;
 const back=$('#return-to-flow');back.hidden=!isWiki||!flowReturn;if(flowReturn)back.href=flowReturn;
 const status=el?.closest('[data-reference-context]');
 $('#reader-path').textContent=status?.dataset.referenceContext||now.title;
 const saved=stored.saved.some(r=>r.id===now.id);
 $('#save-page').textContent=saved?'已收藏 · 点击取消':'收藏此页';$('#save-page').setAttribute('aria-pressed',String(saved));
 $('#save-page').hidden=['home','roadmap'].includes(now.id);
 $('#reader-feedback').textContent='';
 if(isWiki){
  const match=options.find(option=>byId(option.id)?.contains(el)||el?.contains(byId(option.id)));
  if(match){select.value=match.id;directory.querySelectorAll('details').forEach(d=>d.open=d.dataset.topic===match.topic);}
  directory.querySelectorAll('a').forEach(a=>a.classList.toggle('current',a.hash==='#'+match?.id));
 }
 previous=location.hash||'#home';shelf();
}
$('#save-page').onclick=()=>{const now=current();stored.saved=stored.saved.some(r=>r.id===now.id)?stored.saved.filter(r=>r.id!==now.id):[now,...stored.saved].slice(0,30);persist();update();};
$('#copy-page-link').onclick=async()=>{
 const url=new URL(location.href);if(!url.hash)url.hash='home';
 try{await navigator.clipboard.writeText(url.href);feedback('链接已复制');}
 catch(error){const field=document.createElement('textarea');field.value=url.href;document.body.append(field);field.select();const copied=document.execCommand('copy');field.remove();feedback(copied?'链接已复制':'可直接复制地址栏中的链接');}
};
window.addEventListener('hashchange',()=>requestAnimationFrame(update));
update();
})();

document.addEventListener('click',event=>{
 const cell=event.target.closest('.interactive-array [data-cell-info]');if(!cell)return;
 const root=cell.closest('.interactive-array');
 root.querySelectorAll('[data-cell-info]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button===cell));
  button.classList.toggle('same-material',cell.dataset.arrayMaterial!=='empty'&&cell.dataset.arrayMaterial!=='unknown'&&button.dataset.arrayMaterial===cell.dataset.arrayMaterial&&button!==cell);
 });
});
