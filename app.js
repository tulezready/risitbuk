(function(){
"use strict";
const KEY="risitbuk.v1";
const $=id=>document.getElementById(id);
const pad=(n,l=2)=>String(n).padStart(l,"0");
const today=()=>{const d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
const addDays=(k,n)=>{const[a,b,c]=k.split("-").map(Number);const d=new Date(a,b-1,c+n);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
const fmtDate=k=>{if(!k)return"";const[a,b,c]=k.split("-").map(Number);return c+" "+["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][b-1]+" "+a};
const kina=n=>"K"+(Math.round(n*100)/100).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const num=v=>{const x=parseFloat(String(v).replace(/[^0-9.]/g,""));return isFinite(x)&&x>=0?Math.min(x,1e9):0};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const PREFIX={receipt:"RCT",invoice:"INV",quote:"QUO"};

// tiny DOM builder: only ever sets text through textContent, never HTML
function h(tag,attrs,...kids){const el=document.createElement(tag);
  if(attrs)for(const k in attrs){const v=attrs[k];if(v==null||v===false)continue;
    if(k==="class")el.className=v;else if(k.startsWith("on"))el.addEventListener(k.slice(2),v);else el.setAttribute(k,v===true?"":v)}
  kids.flat(Infinity).forEach(c=>{if(c==null||c===false)return;el.appendChild(typeof c==="object"?c:document.createTextNode(String(c)))});
  return el}

// ---------- state ----------
let S;
function fresh(type){return{id:uid(),type:type||"receipt",no:"",date:today(),due:addDays(today(),14),cust:{name:"",phone:"",addr:""},
  items:[{d:"",q:1,p:0}],paidBy:"Cash",ref:"",notes:"",status:"",saved:false}}
function sample(){
  return{biz:{name:"Tavui Kai Bar",addr:"Section 12, Lot 4, Kokopo, ENB",phone:"7000 0000",email:"",ipa:"6-000000000",tin:"",gst:false,logo:"",bank:"BSP Kokopo",accname:"Tavui Kai Bar",accno:"",example:true},
    counters:{RCT:0,INV:0,QUO:0},docs:[],
    draft:Object.assign(fresh("receipt"),{cust:{name:"Kokopo Youth Group",phone:"",addr:""},items:[{d:"Lunch packs (rice, chicken, greens)",q:20,p:12},{d:"Cold drinks 600ml",q:20,p:4.5}],notes:""})}}
function load(){try{const r=localStorage.getItem(KEY);if(r){S=JSON.parse(r);if(S&&S.biz&&S.draft)return}}catch(e){}S=sample()}
let saveT;function persist(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast("Phone storage is full. Delete old documents or remove the logo.")}},250)}

function toast(m){const t=$("toast");t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2400)}
const D=()=>S.draft;
function calc(doc){const sub=doc.items.reduce((a,i)=>a+num(i.q)*num(i.p),0);const gst=S.biz.gst?Math.round(sub*10)/100:0;return{sub,gst,tot:sub+gst}}
function title(doc){if(doc.type==="receipt")return"RECEIPT";if(doc.type==="quote")return"QUOTATION";return S.biz.gst?"TAX INVOICE":"INVOICE"}
function nextNo(type){const p=PREFIX[type];return p+"-"+pad((S.counters[p]||0)+1,4)}

// ---------- view switching ----------
let view="edit";
function show(v){view=v;["edit","preview","list"].forEach(x=>$("v-"+x).hidden=x!==v);window.scrollTo(0,0);
  if(v==="preview")renderPreview();if(v==="list")renderList()}

// ---------- editor ----------
const bizFields={name:"b-name",addr:"b-addr",phone:"b-phone",email:"b-email",ipa:"b-ipa",tin:"b-tin",bank:"b-bank",accname:"b-accname",accno:"b-accno"};
function fillEditor(){
  const b=S.biz,d=D();
  for(const k in bizFields)$(bizFields[k]).value=b[k]||"";
  $("b-gst").checked=!!b.gst;
  $("biz-example").hidden=!b.example;
  renderLogo();
  $("c-name").value=d.cust.name;$("c-phone").value=d.cust.phone;$("c-addr").value=d.cust.addr;
  $("d-date").value=d.date;$("d-due").value=d.due;$("d-paid").value=d.paidBy;$("d-ref").value=d.ref;$("d-notes").value=d.notes;
  renderItems();refreshType();
}
function refreshType(){const d=D();
  document.querySelectorAll(".seg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.type===d.type));
  $("cust-h").textContent=d.type==="receipt"?"Received from":"Customer";
  $("due-wrap").hidden=d.type==="receipt";$("due-lbl").textContent=d.type==="quote"?"Valid until":"Due date";
  $("paid-wrap").hidden=d.type!=="receipt";$("ref-wrap").hidden=d.type!=="receipt";
  $("d-no").value=d.no||nextNo(d.type)+" (next)";
  $("biz-sum").textContent=S.biz.example?"Example details. Tap to put in yours.":[S.biz.name||"Add your business name",S.biz.tin?"TIN "+S.biz.tin:""].filter(Boolean).join(" · ");
  renderSums()}
function renderLogo(){const box=$("logo-box");box.textContent="";
  if(S.biz.logo){box.appendChild(h("img",{src:S.biz.logo,alt:"Your logo"}));$("b-logo-x").hidden=false}else{box.textContent="No logo";$("b-logo-x").hidden=true}}
let armedItem=-1;
function renderItems(){const wrap=$("items");wrap.textContent="";
  D().items.forEach((it,i)=>{
    const lt=h("div",{class:"lt"},"Line total ",h("b",null,kina(num(it.q)*num(it.p))));
    const row=h("div",{class:"item"},
      h("label",{class:"desc"},"Description",h("input",{id:"it-d-"+i,maxlength:"80",value:it.d,placeholder:"What did you sell?",oninput:e=>{it.d=e.target.value;changed(false)}})),
      lt,
      h("label",null,"Qty",h("input",{id:"it-q-"+i,inputmode:"decimal",value:String(it.q),oninput:e=>{it.q=e.target.value;lt.lastChild.textContent=kina(num(it.q)*num(it.p));changed(false)}})),
      h("label",null,"Price (K)",h("input",{id:"it-p-"+i,inputmode:"decimal",value:it.p?String(it.p):"",placeholder:"0.00",oninput:e=>{it.p=e.target.value;lt.lastChild.textContent=kina(num(it.q)*num(it.p));changed(false)}})),
      h("button",{type:"button",class:"rm"+(armedItem===i?" sure":""),"aria-label":"Remove item",onclick:()=>{
        if(D().items.length===1){D().items[0]={d:"",q:1,p:0};armedItem=-1}
        else if(armedItem===i){D().items.splice(i,1);armedItem=-1}else armedItem=i;
        renderItems();changed(false)}},armedItem===i?"Sure?":"×"));
    wrap.appendChild(row)})}
function renderSums(){const c=calc(D()),s=$("sums");s.textContent="";
  if(S.biz.gst){s.append(h("div",null,h("span",null,"Subtotal (excl. GST)"),h("span",null,kina(c.sub))),h("div",null,h("span",null,"GST 10%"),h("span",null,kina(c.gst))))}
  s.append(h("div",{class:"tot"},h("span",null,"Total"),h("span",null,kina(c.tot))));
  $("bar-total").textContent=kina(c.tot);$("bar-lbl").textContent=title(D()).charAt(0)+title(D()).slice(1).toLowerCase()+" total"}
function changed(rerender){if(rerender)renderItems();renderSums();persist()}

function bindEditor(){
  for(const k in bizFields)$(bizFields[k]).addEventListener("input",e=>{S.biz[k]=e.target.value;if(S.biz.example){S.biz.example=false;$("biz-example").hidden=true}refreshType();persist()});
  $("b-gst").addEventListener("change",e=>{S.biz.gst=e.target.checked;if(e.target.checked&&!S.biz.tin)toast("GST-registered businesses must show their TIN. Add it above.");refreshType();persist()});
  $("b-logo").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";if(!f)return;
    // phones' file pickers sometimes report no type, so also accept by file name
    const okType=/^image\//.test(f.type)||(!f.type&&/\.(png|jpe?g|webp|gif)$/i.test(f.name||""));
    if(!okType){toast("Use a PNG or JPG picture for the logo.");return}
    if(f.size>10*1024*1024){toast("That picture is too big. Use one under 10 MB.");return}
    const fail=()=>toast("Couldn't read that picture. Save it as PNG or JPG and try again.");
    const rd=new FileReader(); // read as a data: link, which the security policy allows (blob: links are blocked)
    rd.onerror=fail;
    rd.onload=()=>{const img=new Image();
      img.onload=()=>{ // redraw on a canvas: shrinks it and strips hidden photo data (location etc.)
        if(!img.width||!img.height){fail();return}
        const m=360,sc=Math.min(1,m/Math.max(img.width,img.height)),c=document.createElement("canvas");
        c.width=Math.max(1,Math.round(img.width*sc));c.height=Math.max(1,Math.round(img.height*sc));c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        S.biz.logo=c.toDataURL("image/png");S.biz.example=false;$("biz-example").hidden=true;renderLogo();persist();toast("Logo added")};
      img.onerror=fail;img.src=String(rd.result)};
    rd.readAsDataURL(f)});
  $("b-logo-x").onclick=()=>{S.biz.logo="";renderLogo();persist()};
  [["c-name","name"],["c-phone","phone"],["c-addr","addr"]].forEach(([id,k])=>$(id).addEventListener("input",e=>{D().cust[k]=e.target.value;persist()}));
  $("d-date").addEventListener("change",e=>{D().date=e.target.value||today();persist()});
  $("d-due").addEventListener("change",e=>{D().due=e.target.value;persist()});
  $("d-paid").addEventListener("change",e=>{D().paidBy=e.target.value;persist()});
  $("d-ref").addEventListener("input",e=>{D().ref=e.target.value;persist()});
  $("d-notes").addEventListener("input",e=>{D().notes=e.target.value;persist()});
  document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{const d=D();if(d.type===b.dataset.type)return;
    d.type=b.dataset.type;if(d.saved){d.id=uid();d.saved=false;d.no=""} // changing type makes a new document
    if(d.type==="quote")d.due=addDays(d.date,30);if(d.type==="invoice")d.due=addDays(d.date,14);
    fillEditor();persist()});
  $("add-item").onclick=()=>{D().items.push({d:"",q:1,p:0});armedItem=-1;renderItems();const i=D().items.length-1;$("it-d-"+i).focus()};
  $("go-preview").onclick=()=>{const err=check();if(err){toast(err);return}show("preview")};
  $("nav-new").onclick=()=>{S.draft=fresh(D().type);armedItem=-1;fillEditor();persist();show("edit");toast("New "+title(D()).toLowerCase())};
  $("nav-list").onclick=()=>show("list");
}
function check(){const d=D();
  if(!S.biz.name.trim())return"Add your business name first.";
  if(!d.items.some(i=>i.d.trim()&&num(i.q)>0))return"Add at least one item with a description.";
  if(calc(d).tot<=0)return"Put a price on your items.";
  return""}

// ---------- document ----------
function buildDoc(doc){
  const b=S.biz,c=calc(doc),no=doc.no||nextNo(doc.type);
  const lines=doc.items.filter(i=>i.d.trim()||num(i.p)>0);
  const regs=[b.ipa&&h("span",null,"IPA Reg. ",h("b",null,b.ipa)),b.tin&&h("span",null,"TIN ",h("b",null,b.tin)),b.gst&&h("span",null,h("b",null,"GST registered"))].filter(Boolean);
  const meta=[["Date",fmtDate(doc.date)]];
  if(doc.type==="invoice"&&doc.due)meta.push(["Due date",fmtDate(doc.due)]);
  if(doc.type==="quote"&&doc.due)meta.push(["Valid until",fmtDate(doc.due)]);
  if(doc.type==="receipt"){meta.push(["Paid by",doc.paidBy]);if(doc.ref)meta.push(["Reference",doc.ref])}
  const cust=doc.cust.name.trim()?[h("p",{class:"nm"},doc.cust.name),doc.cust.addr&&h("p",null,doc.cust.addr),doc.cust.phone&&h("p",null,"Ph "+doc.cust.phone)]:[h("p",{class:"nm"},"Cash customer")];
  const totRows=[];
  if(b.gst){totRows.push(h("div",null,h("span",null,"Subtotal (excl. GST)"),h("span",null,kina(c.sub))),h("div",null,h("span",null,"GST 10%"),h("span",null,kina(c.gst))))}
  totRows.push(h("div",{class:"grand"},h("span",null,doc.type==="receipt"?"Amount received":doc.type==="quote"?"Quote total":"Amount due"),kina(c.tot)));
  const pay=doc.type!=="receipt"&&(b.bank||b.accno)?h("div",{class:"box"},h("div",{class:"lbl"},doc.type==="quote"?"Payment details (if accepted)":"How to pay"),
      h("p",null,[b.bank,b.accname&&("Account name: "+b.accname),b.accno&&("Account no: "+b.accno)].filter(Boolean).join("  ·  ")),
      h("p",null,"Please use "+no+" as your payment reference.")):null;
  return h("div",{class:"doc"},
    h("div",{class:"dh"},
      h("div",{class:"bz"},b.logo&&h("img",{src:b.logo,alt:""}),h("div",null,h("h3",null,b.name),b.addr&&h("p",null,b.addr),h("p",null,[b.phone&&("Ph "+b.phone),b.email].filter(Boolean).join("  ·  ")))),
      h("div",{class:"ttl"},h("h2",null,title(doc)),h("p",null,"No. ",h("b",null,no)))),
    regs.length?h("div",{class:"regs"},regs):null,
    h("div",{class:"parties"},
      h("div",null,h("div",{class:"lbl"},doc.type==="receipt"?"Received from":doc.type==="quote"?"Prepared for":"Bill to"),cust),
      h("div",{class:"meta"},meta.map(([k,v])=>[h("span",null,k),h("b",null,v)]))),
    h("table",null,
      h("thead",null,h("tr",null,h("th",null,"Description"),h("th",{class:"n"},"Qty"),h("th",{class:"n"},"Unit price"),h("th",{class:"n"},"Amount"))),
      h("tbody",null,lines.map(i=>h("tr",null,h("td",null,i.d),h("td",{class:"n"},String(num(i.q))),h("td",{class:"n"},kina(num(i.p))),h("td",{class:"n"},kina(num(i.q)*num(i.p))))))),
    h("div",{class:"trow"},doc.type==="receipt"?h("div",{class:"stamp"},"PAID",h("small",null,fmtDate(doc.date))):h("div"),h("div",{class:"tots"},totRows)),
    pay,
    doc.notes.trim()?h("div",{class:"box"},h("div",{class:"lbl"},"Notes"),h("p",null,doc.notes)):null,
    h("div",{class:"grow"}),
    h("div",{class:"df"},
      h("div",null,h("div",{class:"thx"},doc.type==="quote"?"Thank you for the opportunity.":"Thank you for your business."),
        h("div",null,b.gst?"Prices in PNG Kina. GST included where shown.":"Prices in PNG Kina."+(doc.type!=="quote"?" Not registered for GST.":""))),
      h("div",null,h("div",{class:"sign"},"Authorised signature"))),
    h("div",{class:"lbl"},"Made with Risit Buk · Ready Digital Consultancy, Kokopo · 70254566"));
}
function fitPreview(){const v=$("doc-view"),f=$("doc-frame");if(!v.firstChild)return;
  const w=f.clientWidth-20,s=Math.min(1,w/794);v.style.transform="scale("+s+")";v.style.width="794px";f.style.height=(v.firstChild.offsetHeight*s+20)+"px"}
function renderPreview(){const v=$("doc-view");v.textContent="";v.appendChild(buildDoc(D()));$("p-msg").hidden=true;
  requestAnimationFrame(fitPreview);if(document.fonts)document.fonts.ready.then(fitPreview)}
window.addEventListener("resize",()=>{if(view==="preview")fitPreview()});

function commit(){const d=D();
  if(!d.no){const p=PREFIX[d.type];S.counters[p]=(S.counters[p]||0)+1;d.no=p+"-"+pad(S.counters[p],4)}
  if(!d.status)d.status=d.type==="receipt"?"paid":d.type==="quote"?"quote":"unpaid";
  d.saved=true;d.updated=Date.now();
  const copy=JSON.parse(JSON.stringify(d)),i=S.docs.findIndex(x=>x.id===d.id);
  if(i>=0)S.docs[i]=copy;else S.docs.unshift(copy);
  $("saved-count").textContent=S.docs.length;persist();refreshType()}

let busy=false;
async function makePdf(){
  if(!window.html2canvas||!window.jspdf)throw new Error("lib");
  commit();
  const host=$("doc-print");host.textContent="";host.appendChild(buildDoc(D()));
  if(document.fonts)await document.fonts.ready;
  const el=host.firstChild;
  const canvas=await html2canvas(el,{scale:2,backgroundColor:"#ffffff",logging:false,useCORS:false});
  host.textContent="";
  const pdf=new window.jspdf.jsPDF({unit:"mm",format:"a4",orientation:"portrait",compress:true});
  const pw=210,ph=297,ih=canvas.height*pw/canvas.width,img=canvas.toDataURL("image/jpeg",0.92);
  let y=0;pdf.addImage(img,"JPEG",0,0,pw,ih);
  while(ih-y>ph+1){y+=ph;pdf.addPage();pdf.addImage(img,"JPEG",0,-y,pw,ih)}
  const d=D(),safe=(S.biz.name||"Business").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,30);
  pdf.setProperties({title:title(d)+" "+d.no,author:S.biz.name,creator:"Risit Buk"});
  return{blob:pdf.output("blob"),name:safe+"-"+d.no+".pdf"}}
function download(blob,name){const u=URL.createObjectURL(blob),a=h("a",{href:u,download:name});document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
async function run(kind){if(busy)return;busy=true;const m=$("p-msg");m.hidden=false;m.textContent="Making your PDF…";
  try{const{blob,name}=await makePdf();const file=new File([blob],name,{type:"application/pdf"});
    if(kind==="share"&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:name});m.textContent="Sent. "+D().no+" is saved under Saved."}
      catch(e){m.textContent=e&&e.name==="AbortError"?"Not sent. "+D().no+" is saved under Saved.":"This phone couldn't share the file, so it was downloaded instead.";if(!(e&&e.name==="AbortError"))download(blob,name)}}
    else{download(blob,name);m.textContent=(kind==="share"?"This phone can't send files straight from the browser, so the PDF was downloaded. Attach it in WhatsApp. ":"Downloaded "+name+". ")}
  }catch(e){m.textContent="Couldn't make the PDF here. Open Risit Buk from its own web address (or the installed app) and try again."}
  finally{busy=false}}

// ---------- saved list ----------
let filter="all",armedDel=null;
function statusOf(d){if(d.type==="invoice"&&d.status==="unpaid"&&d.due&&d.due<today())return"overdue";return d.status}
function renderList(){const L=$("list"),F=$("filters");L.textContent="";F.textContent="";
  const kinds=[["all","All"],["unpaid","Unpaid invoices"],["receipt","Receipts"],["quote","Quotes"]];
  kinds.forEach(([k,lbl])=>F.appendChild(h("button",{type:"button","aria-pressed":String(filter===k),onclick:()=>{filter=k;renderList()}},lbl)));
  const docs=S.docs.filter(d=>filter==="all"||(filter==="unpaid"?d.type==="invoice"&&d.status!=="paid":d.type===filter));
  if(!docs.length){L.appendChild(h("div",{class:"empty"},S.docs.length?"Nothing here yet.":"Your saved receipts, invoices and quotes will show here. Make one, then tap Send PDF or Download."));return}
  const unpaid=S.docs.filter(d=>d.type==="invoice"&&d.status!=="paid").reduce((a,d)=>a+calcSaved(d),0);
  if(unpaid>0&&filter!=="receipt"&&filter!=="quote")L.appendChild(h("div",{class:"hint"},"Customers owe you ",h("b",null,kina(unpaid))," on unpaid invoices."));
  docs.forEach(d=>{const st=statusOf(d);
    const acts=[h("button",{type:"button",class:"pri",onclick:()=>openDoc(d.id)},"Open")];
    if(d.type==="invoice"&&d.status!=="paid")acts.push(h("button",{type:"button",onclick:()=>toReceipt(d.id)},"Paid → make receipt"));
    if(d.type==="quote")acts.push(h("button",{type:"button",onclick:()=>convert(d.id,"invoice")},"Turn into invoice"));
    acts.push(h("button",{type:"button",onclick:()=>dup(d.id)},"Copy"));
    acts.push(h("button",{type:"button",class:"del"+(armedDel===d.id?" sure":""),onclick:()=>{if(armedDel===d.id){S.docs=S.docs.filter(x=>x.id!==d.id);armedDel=null;$("saved-count").textContent=S.docs.length;persist()}else armedDel=d.id;renderList()}},armedDel===d.id?"Sure? Delete":"Delete"));
    L.appendChild(h("div",{class:"doccard"},
      h("div",{class:"r1"},
        h("div",{class:"who"},h("b",null,d.cust.name||"Cash customer"),h("small",null,d.no+" · "+fmtDate(d.date)),h("div",null,h("span",{class:"pill "+st},st==="quote"?"Quote":st))),
        h("div",{class:"amt"},kina(calcSaved(d)))),
      h("div",{class:"acts"},acts)))})}
function calcSaved(d){const sub=d.items.reduce((a,i)=>a+num(i.q)*num(i.p),0);return sub+(S.biz.gst?Math.round(sub*10)/100:0)}
function openDoc(id){const d=S.docs.find(x=>x.id===id);if(!d)return;S.draft=JSON.parse(JSON.stringify(d));fillEditor();persist();show("preview")}
function dup(id){const d=S.docs.find(x=>x.id===id);if(!d)return;S.draft=Object.assign(JSON.parse(JSON.stringify(d)),{id:uid(),no:"",saved:false,status:"",date:today()});fillEditor();persist();show("edit");toast("Copied. Change what you need.")}
function convert(id,type){const d=S.docs.find(x=>x.id===id);if(!d)return;
  S.draft=Object.assign(JSON.parse(JSON.stringify(d)),{id:uid(),type,no:"",saved:false,status:"",date:today(),due:addDays(today(),14),notes:(d.notes?d.notes+"\n":"")+"Based on quotation "+d.no+"."});
  fillEditor();persist();show("edit");toast("Invoice ready. Check it, then send.")}
function toReceipt(id){const d=S.docs.find(x=>x.id===id);if(!d)return;d.status="paid";
  S.draft=Object.assign(JSON.parse(JSON.stringify(d)),{id:uid(),type:"receipt",no:"",saved:false,status:"",date:today(),notes:"Payment for invoice "+d.no+"."});
  fillEditor();persist();show("edit");toast("Invoice marked paid. Check the receipt, then send.")}

// ---------- install + offline ----------
let deferred=null;
const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
const noInstall=()=>{try{return localStorage.getItem("risitbuk.noinstall")==="1"}catch(e){return false}};
function showInstall(){if(standalone()||noInstall())return;
  if(deferred){$("install-msg").textContent="Add Risit Buk to your phone. It works with no data too.";$("install-go").hidden=false;$("install").hidden=false}
  else if(ios){$("install-msg").textContent="On iPhone: tap Share, then \"Add to Home Screen\".";$("install-go").hidden=true;$("install").hidden=false}}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;showInstall()});
window.addEventListener("appinstalled",()=>{$("install").hidden=true;deferred=null});
$("install-go").onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;$("install").hidden=true};
$("install-x").onclick=()=>{$("install").hidden=true;try{localStorage.setItem("risitbuk.noinstall","1")}catch(e){}};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));

// ---------- start ----------
$("p-back").onclick=()=>show("edit");
$("p-share").onclick=()=>run("share");
$("p-pdf").onclick=()=>run("download");
load();bindEditor();fillEditor();$("saved-count").textContent=S.docs.length;showInstall();
})();
