
let CASES=[];
let state=JSON.parse(localStorage.getItem("ayysingoV8")||'{"i":0,"done":0,"correct":0,"streak":0,"best":0}');
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const save=()=>localStorage.setItem("ayysingoV8",JSON.stringify(state));

fetch("./cases.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("cases.json yüklenemedi");return r.json()})
.then(d=>{CASES=d;renderPractice();updateStats()})
.catch(e=>{$("practiceCanvas").innerHTML=`<div class="loadError"><b>Vaka verisi yüklenemedi.</b><br>${esc(e.message)}</div>`});

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>setMode(b.dataset.m));
function setMode(m){document.querySelectorAll(".screen").forEach(s=>s.hidden=true);$(m).hidden=false;document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.m===m));if(m==="practice")renderPractice();if(m==="quiz")startQuiz();if(m==="progress")renderProgress();}
function current(){return CASES[state.i%CASES.length]}

function renderPractice(){
 const c=current();$("caseNo").textContent=`${c.id} / 100`;$("topic").textContent=c.topic;$("target").textContent=c.question_mode==="numeric"?"SAYISAL":"TEKNİK";$("q").textContent=c.question;
 $("fb").hidden=true;$("selectedType").textContent="Henüz hedef seçilmedi";$("clickHint").textContent="Önce görseldeki numaralı hedef noktaya tıkla.";
 const box=$("practiceCanvas");box.innerHTML="";
 const stage=document.createElement("div");stage.className="imageStage";const img=document.createElement("img");img.src="./"+c.asset;img.alt=c.original_filename;img.draggable=false;stage.appendChild(img);
 (c.hotspots||[]).forEach((h,idx)=>{const b=document.createElement("button");b.className="hotspot";b.style.left=h.x*100+"%";b.style.top=h.y*100+"%";b.textContent=idx+1;b.onclick=e=>{e.stopPropagation();selectHotspot(c,h,b)};stage.appendChild(b)});
 img.onerror=()=>{img.hidden=true;stage.insertAdjacentHTML("beforeend",`<div class="loadError">Görsel bulunamadı: ${esc(c.asset)}</div>`)};
 box.appendChild(stage);renderAnswerArea(c);
}
function selectHotspot(c,h,b){document.querySelectorAll(".hotspot").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("selectedType").textContent=`Hedef seçildi`;document.getElementById("answerArea").dataset.ready="1";}
function renderAnswerArea(c){
 const area=$("answerArea");
 if(c.question_mode==="numeric"){
  area.innerHTML=`<form class="calcBox" onsubmit="event.preventDefault();checkNumeric()">
  ${c.calculation.fields.map(f=>f.id==="result"?`<label>${esc(f.label)}<select id="calc_${f.id}"><option value="">Seçiniz…</option><option>PASS</option><option>FAIL</option><option>EVET</option><option>HAYIR</option></select></label>`:`<label>${esc(f.label)}<input id="calc_${f.id}" type="number" step="0.001" placeholder="Sonucu yaz"></label>`).join("")}
  <button class="primary" type="submit">Hesabı kontrol et</button></form>`;
 } else {
  area.innerHTML=`<div class="techAnswer"><textarea id="techText" placeholder="Teknik yorumunu yaz…"></textarea><button class="primary" onclick="checkTechnical()">Cevabı kontrol et</button></div>`;
 }
}
function numericEqual(v,a){if(typeof a==="number"){const n=Number(String(v).replace(",","."));return Number.isFinite(n)&&Math.abs(n-a)<=.002}return String(v).trim().toUpperCase()===String(a).trim().toUpperCase()}
function checkNumeric(){const c=current(),ready=$("answerArea").dataset.ready;if(!ready)return alert("Önce görseldeki hedef noktaya tıkla.");let ok=true;let lines=[];c.calculation.fields.forEach(f=>{const v=$("calc_"+f.id)?.value||"";const x=v&&numericEqual(v,f.answer);ok=ok&&x;lines.push(`${esc(f.label)}: <b>${esc(v||"—")}</b> → ${x?"✓":"✕"}`)});finish(ok,lines.join("<br>")+`<hr><b>Doğru sonuçlar:</b><br>${c.calculation.fields.map(f=>`${esc(f.label)} = <b>${esc(f.answer)}</b>`).join("<br>")}`)}
function checkTechnical(){const c=current(),u=($("techText")?.value||"").toLocaleLowerCase("tr-TR");if(!u.trim())return alert("Teknik yorumunu yaz.");const hits=(/tolerans/.test(u)?1:0)+(/datum|referans/.test(u)?1:0)+(/cmm|ölç/.test(u)?1:0);finish(hits>=2,`Yakalanan teknik unsurlar: ${hits}/3<hr><b>Referans yaklaşım:</b> ${esc(c.reference)}`)}
function finish(ok,body){state.done++;if(ok){state.correct++;state.streak++;state.best=Math.max(state.best,state.streak)}else state.streak=0;save();updateStats();$("fb").hidden=false;$("fb").className="feedback "+(ok?"good":"warn");$("fb").innerHTML=`<b>${ok?"✓ Doğru":"✕ Yanlış / eksik"}</b><br>${body}`}
function next(){state.i=(state.i+1)%CASES.length;save();renderPractice()}
function updateStats(){$("score").textContent=state.done?Math.round(state.correct/state.done*100)+"%":"0%";$("done").textContent=state.done;$("streak").textContent=state.streak;$("bar").style.width=Math.min(100,state.done)+"%"}
let quiz=[],qp=0,qs=0;
function startQuiz(){quiz=[...CASES].sort(()=>Math.random()-.5).slice(0,10);qp=0;qs=0;drawQuiz()}
function drawQuiz(){if(qp>=10){$("quizBox").innerHTML=`<div class="result">Sınav bitti: <b>${qs}/10</b></div>`;return}const c=quiz[qp];$("quizBox").innerHTML=`<div class="pill">${qp+1}/10 • ${esc(c.topic)}</div><div id="quizCanvas" class="canvas"></div><h2>${esc(c.question)}</h2><div id="quizArea"></div>`;renderCanvas(c,"quizCanvas");if(c.question_mode==="numeric")$("quizArea").innerHTML=`<div class="calcBox">${c.calculation.fields.map(f=>f.id==="result"?`<label>${esc(f.label)}<select id="q_${f.id}"><option value="">Seçiniz…</option><option>PASS</option><option>FAIL</option></select></label>`:`<label>${esc(f.label)}<input id="q_${f.id}" type="number" step=".001"></label>`).join("")}<button class="primary" onclick="quizNum()">Kontrol</button></div>`;else $("quizArea").innerHTML=`<textarea id="qtech" placeholder="Teknik yorumunu yaz…"></textarea><button class="primary" onclick="quizTech()">Kontrol</button>`}
function renderCanvas(c,id){const b=$(id);const st=document.createElement("div");st.className="imageStage";const im=document.createElement("img");im.src="./"+c.asset;im.alt=c.original_filename;st.appendChild(im);(c.hotspots||[]).forEach((h,idx)=>{const d=document.createElement("button");d.className="hotspot";d.style.left=h.x*100+"%";d.style.top=h.y*100+"%";d.textContent=idx+1;st.appendChild(d)});b.appendChild(st)}
function quizNum(){const c=quiz[qp];let ok=true;c.calculation.fields.forEach(f=>{if(!numericEqual($("q_"+f.id).value,f.answer))ok=false});if(ok)qs++;$("quizArea").insertAdjacentHTML("beforeend",`<div class="feedback ${ok?"good":"warn"}" style="display:block">${ok?"✓ Doğru":"✕ Yanlış"}<br>${c.reference}</div><button onclick="qp++;drawQuiz()">Devam →</button>`)}
function quizTech(){const c=quiz[qp],u=($("qtech").value||"").toLocaleLowerCase("tr-TR"),ok=(/tolerans/.test(u)&&(/datum|referans/.test(u)||/cmm|ölç/.test(u)));if(ok)qs++;$("quizArea").insertAdjacentHTML("beforeend",`<div class="feedback ${ok?"good":"warn"}" style="display:block">${ok?"✓ Doğru":"✕ Eksik"}<br>${esc(c.reference)}</div><button onclick="qp++;drawQuiz()">Devam →</button>`)}
function renderProgress(){$("pScore").textContent=state.done?Math.round(state.correct/state.done*100)+"%":"0%";$("pDone").textContent=state.done;$("pBest").textContent=state.best}
