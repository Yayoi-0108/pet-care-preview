'use strict';

const STORAGE_KEY='pet-care-v3';
const $=selector=>document.querySelector(selector);
const main=$('#main'), title=$('#title'), back=$('#back');
const nowLocal=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
const today=()=>nowLocal().slice(0,10);
const uid=()=>`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const petAssets={moko:'assets/pets/moko.png',komugi:'assets/pets/komugi.png',sora:'assets/pets/sora.png'};

const initialState={
  currentPetId:'moko',
  pets:[
    {id:'moko',name:'もこ',species:'犬',breed:'トイプードル',color:'アプリコット',birthday:'2021-04-10',photo:petAssets.moko,mealGoal:2,showSnacks:true},
    {id:'komugi',name:'こむぎ',species:'猫',breed:'ミックス',color:'シルバータビー',birthday:'2024-02-18',photo:petAssets.komugi,mealGoal:2,showSnacks:true},
    {id:'sora',name:'そら',species:'犬',breed:'柴犬',color:'クリーム',birthday:'2023-07-03',photo:petAssets.sora,mealGoal:2,showSnacks:false}
  ],
  records:[],events:[],medicines:[],health:[],careDone:{},
  notificationPrefs:{reminderTime:'09:00',clinic:true,trimming:true,vaccine:true,birthday7:true,birthday1:true,birthday0:true}
};

function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(saved?.pets?.length)return {...initialState,...saved,notificationPrefs:{...initialState.notificationPrefs,...saved.notificationPrefs}};
    const legacy=JSON.parse(localStorage.getItem('pet-care-demo-v2')||localStorage.getItem('pet-care-demo-v1')||'null');
    if(legacy){
      const migrated=structuredClone(initialState);
      migrated.records=(legacy.records||[]).map(r=>({...r,id:uid(),petId:'moko',type:r.kind||'メモ',datetime:r.timestamp||new Date().toISOString(),recorder:'あなた'}));
      migrated.events=(legacy.events||[]).map(e=>({...e,id:uid(),petId:'moko',time:'',place:'',remind:false}));
      migrated.pets[0].mealGoal=Number(legacy.mealGoal)||2;migrated.pets[0].showSnacks=legacy.showSnacks!==false;
      return migrated;
    }
  }catch(error){console.warn('保存データを読み込めませんでした',error)}
  return structuredClone(initialState);
}
let state=load(), route='home';
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(error){alert('保存容量を超えました。写真を減らすかバックアップ後に整理してください。')}}
function pet(){return state.pets.find(p=>p.id===state.currentPetId)||state.pets[0]}
function petRecords(type){return state.records.filter(r=>r.petId===pet().id&&(!type||r.type===type)).sort((a,b)=>String(b.datetime).localeCompare(String(a.datetime)))}
function petEvents(){return state.events.filter(e=>e.petId===pet().id).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))}
function petHealth(kind){return state.health.filter(h=>h.petId===pet().id&&(!kind||h.kind===kind)).sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
function age(birthday){if(!birthday)return '年齢未設定';const b=new Date(`${birthday}T00:00:00`),n=new Date();let y=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))y--;return `${Math.max(0,y)}歳`}
function petCard(p=pet()){return `<button class="pet-card" data-page="pets"><img class="avatar" src="${esc(p.photo||petAssets.moko)}" alt="${esc(p.name)}の写真"><span class="pet-copy"><span class="pet-name">${esc(p.name)} ♡</span><span class="pet-meta">${esc(p.breed||p.species)}<br>${age(p.birthday)}・${esc(p.color||'')}</span></span><span class="chev">›</span></button>`}
function row(icon,name,sub='',tail='›',attrs=''){return `<button class="row" ${attrs} style="width:100%;border-left:0;border-right:0;border-top:0;background:none;text-align:left"><span class="row-icon">${icon}</span><span class="row-body"><span class="row-title">${esc(name)}</span><span class="row-sub">${esc(sub)}</span></span><span class="chev">${tail}</span></button>`}
function photoInput(id='photo'){return `<label>写真（任意）</label><input id="${id}" type="file" accept="image/*"><img id="${id}Preview" class="photo-preview" hidden alt="選択した写真のプレビュー">`}
function formatDateTime(value){if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function mealCount(){return petRecords('ごはん').filter(r=>String(r.datetime).slice(0,10)===today()).length}
function doneList(){return state.careDone[`${pet().id}:${today()}`]||[]}

const titles={home:'ホーム',pets:'ペットを選択',petForm:'ペット登録',records:'記録・写真',recordForm:'詳しい記録',meal:'ごはんの記録',schedule:'カレンダー・予定',health:'健康まとめ',healthForm:'健康情報の登録',medicine:'お薬の管理',notifications:'お知らせ設定',album:'写真・アルバム',family:'家族で共有',settings:'設定・その他',backup:'バックアップ'};
function navigate(name){route=name;render()}
function render(){
  title.textContent=titles[route]||'Pet Care';back.hidden=['home','records','schedule','health','settings'].includes(route);
  document.querySelectorAll('nav button').forEach(button=>button.classList.toggle('active',button.dataset.page===route));
  const renderer=pages[route]||pages.home;main.innerHTML=renderer();window.scrollTo({top:0,behavior:'smooth'});
}

const pages={
  home(){
    const done=doneList(), p=pet(), tasks=[['🍚','ごはん',`${mealCount()}/${p.mealGoal}回`],['💊','お薬',`${petRecords('お薬').filter(r=>String(r.datetime).slice(0,10)===today()).length}件`],['💩','うんち',`${petRecords('うんち').filter(r=>String(r.datetime).slice(0,10)===today()).length}件`]];
    return petCard()+`<div class="card soft"><div class="stat"><div><small>今日のお世話</small><div class="progress">${done.length}/3</div></div><span style="font-size:31px">🐾</span></div><div class="bar"><i style="width:${Math.min(100,done.length/3*100)}%"></i></div>${tasks.map(t=>row(t[0],t[1],'タップして完了',t[2]+(done.includes(t[1])?' ✓':''),`data-care="${t[1]}"`)).join('')}</div><div class="section-title"><h2>次の予定</h2><button class="link" data-page="schedule">すべて見る</button></div><div class="card">${eventRows(2)}</div><div class="section-title"><h2>健康情報</h2><button class="link" data-page="health">健康まとめ</button></div><div class="quick-grid"><button class="quick" data-page="meal">🍚<span>ごはん</span></button><button class="quick" data-record="うんち">💩<span>うんち</span></button><button class="quick" data-page="medicine">💊<span>お薬</span></button><button class="quick" data-page="album">📷<span>写真</span></button></div>`;
  },
  pets(){return state.pets.map(p=>`<button class="pet-card" data-pet="${p.id}"><img class="avatar" src="${esc(p.photo||petAssets.moko)}" alt="${esc(p.name)}の写真"><span class="pet-copy"><span class="pet-name">${esc(p.name)}</span><span class="pet-meta">${esc(p.species)}・${esc(p.breed)}・${age(p.birthday)}</span></span>${p.id===pet().id?'<span class="done">✓</span>':'<span class="chev">›</span>'}</button>`).join('')+`<button class="primary" data-page="petForm">＋ ペットを追加</button>`},
  petForm(){return `<div class="card"><h2>ペット情報</h2><label>名前</label><input id="petName" required placeholder="名前"><label>動物種</label><select id="petSpecies"><option>犬</option><option>猫</option><option>その他</option></select><label>犬種・猫種など</label><input id="petBreed" placeholder="例：トイプードル"><label>毛色</label><input id="petColor" placeholder="例：アプリコット"><label>誕生日</label><input id="petBirthday" type="date">${photoInput('petPhoto')}<label>1日のごはん回数</label><input id="petMealGoal" type="number" min="1" max="12" value="2"><label class="check"><input id="petSnacks" type="checkbox" checked>おやつ項目を表示する</label><button class="primary" data-action="savePet">登録する</button></div>`},
  records(){const p=pet();return petCard()+`<div class="section-title"><h2>記録する</h2></div><div class="quick-grid"><button class="quick" data-page="meal">🍚<span>ごはん</span></button><button class="quick" data-record="うんち">💩<span>うんち</span></button><button class="quick" data-record="嘔吐">🤢<span>嘔吐</span></button><button class="quick" data-record="メモ">📷<span>メモ</span></button></div>${p.showSnacks?'<button class="secondary" data-record="おやつ">🍪 おやつを記録</button>':''}<div class="inline-actions"><button class="secondary" data-record="散歩">散歩</button><button class="secondary" data-record="体重">体重</button><button class="secondary" data-page="medicine">お薬</button></div><div class="section-title"><h2>最近の記録</h2><button class="link" data-page="album">写真一覧</button></div><div class="card">${recordRows()}</div>`},
  meal(){return petCard()+`<div class="card"><h2>ごはんの記録</h2><p class="progress">今日 ${mealCount()}/${pet().mealGoal}回</p><label>日時</label><input id="recordDatetime" type="datetime-local" value="${nowLocal()}"><label>種類</label><select id="foodType"><option>ドライフード</option><option>ウェットフード</option><option>手作り</option><option>その他</option></select><label>量</label><input id="amount" placeholder="例：50g"><label>メモ</label><textarea id="recordNote" placeholder="食欲や残した量など"></textarea>${photoInput()}<button class="primary" data-action="saveMeal">保存</button></div>`},
  recordForm(){const type=main.dataset.recordType||'メモ';return petCard()+`<div class="card"><h2>${esc(type)}の記録</h2><input id="recordType" type="hidden" value="${esc(type)}"><label>日時</label><input id="recordDatetime" type="datetime-local" value="${nowLocal()}">${type==='うんち'?`<label>回数</label><input id="count" type="number" min="1" value="1"><label>形</label><select id="shape"><option>普通</option><option>硬め</option><option>柔らかめ</option><option>下痢</option></select><label>色</label><select id="color"><option>茶色</option><option>濃い茶色</option><option>黄色</option><option>黒色</option><option>赤色</option><option>その他</option></select><label>量</label><select id="volume"><option>少ない</option><option selected>普通</option><option>多い</option></select>`:''}${type==='嘔吐'?`<label>状態</label><select id="condition"><option>食べたもの</option><option>泡・胃液</option><option>毛玉</option><option>その他</option></select>`:''}${type==='体重'?'<label>体重（kg）</label><input id="weight" type="number" min="0" step="0.01" required>':''}<label>メモ</label><textarea id="recordNote" placeholder="状態や気づいたこと"></textarea>${photoInput()}<button class="primary" data-action="saveRecord">保存</button></div>`},
  schedule(){return `<div class="card"><div class="calendar"><b>日</b><b>月</b><b>火</b><b>水</b><b>木</b><b>金</b><b>土</b>${Array.from({length:30},(_,i)=>{const day=i+1,has=petEvents().some(e=>Number(e.date.slice(-2))===day);return `<span class="${day===new Date().getDate()?'active ':''}${has?'has-event':''}">${day}</span>`}).join('')}</div></div><div class="section-title"><h2>今後の予定</h2><button class="link" data-page="notifications">通知希望</button></div><div class="card">${eventRows()}</div><div class="card"><h2>予定を追加</h2><label>種類</label><select id="eventType"><option>通院</option><option>トリミング</option><option>予防接種</option><option>健診</option><option>お薬</option><option>その他</option></select><label>日付</label><input id="eventDate" type="date" required><label>時刻</label><input id="eventTime" type="time"><label>場所</label><input id="eventPlace" placeholder="病院・サロンなど"><label>メモ</label><textarea id="eventNote"></textarea><label class="check"><input id="eventRemind" type="checkbox">前日にお知らせを希望する</label><p class="notice">希望設定は保存されますが、端末へのプッシュ通知はまだ配信されません。</p><button class="primary" data-action="saveEvent">予定を保存</button></div>`},
  notifications(){const n=state.notificationPrefs;return `<div class="card"><h2>お知らせ設定</h2><p class="notice">この画面では通知希望を保存できます。ブラウザを閉じている間の端末通知は未実装です。</p><label>前日のお知らせ時刻</label><input id="reminderTime" type="time" value="${n.reminderTime}">${[['clinic','通院の前日'],['trimming','トリミングの前日'],['vaccine','予防接種の前日'],['birthday7','誕生日の7日前'],['birthday1','誕生日の前日'],['birthday0','誕生日当日']].map(x=>`<label class="check"><input type="checkbox" data-pref="${x[0]}" ${n[x[0]]?'checked':''}>${x[1]}</label>`).join('')}<button class="primary" data-action="saveNotifications">希望を保存</button></div>`},
  medicine(){const meds=state.medicines.filter(m=>m.petId===pet().id);return petCard()+`<div class="card">${meds.length?meds.map(m=>`<div class="row"><span class="row-icon">💊</span><span class="row-body"><span class="row-title">${esc(m.name)}</span><span class="row-sub">${esc(m.times.join('・'))} ${esc(m.note)}</span></span><span class="badge ${m.enabled?'':'off'}">${m.enabled?'ON':'OFF'}</span></div>`).join(''):'<p class="empty">お薬はまだ登録されていません</p>'}</div><div class="card"><h2>お薬を追加</h2><label>薬の名前</label><input id="medicineName" placeholder="薬・サプリメント名"><label>服薬時刻（カンマ区切り）</label><input id="medicineTimes" placeholder="08:00, 20:00"><label>メモ</label><input id="medicineNote"><label class="check"><input id="medicineEnabled" type="checkbox" checked>お知らせ希望</label><p class="notice">時刻と希望は保存されますが、端末通知は未実装です。</p><button class="primary" data-action="saveMedicine">登録</button></div>`},
  health(){const diseases=petHealth('現在の病気');return petCard()+`<div class="card soft"><div class="stat"><div><h2>健康まとめ</h2><p class="muted">病院で見せる情報をペット別に整理</p></div><span style="font-size:35px">💗</span></div></div><div class="card"><h2>現在の病気</h2>${diseases.length?diseases.map(h=>`<div class="health-block"><strong>${esc(h.name)}</strong><div class="muted">診断日 ${esc(h.date||'未設定')}・${esc(h.status||'治療中')}</div>${h.medicine?`<span class="pill">薬：${esc(h.medicine)}</span>`:''}<p class="muted">${esc(h.note)}</p></div>`).join(''):'<p class="empty">登録はありません</p>'}<button class="secondary" data-health="現在の病気">＋ 病名を登録</button></div><div class="card">${[['⚖️','最近の体重',latestWeight()],['💉','予防接種歴',`${petHealth('予防接種').length}件`],['✂️','トリミング歴',`${petHealth('トリミング').length}件`],['🩺','既往歴',`${petHealth('既往歴').length}件`],['🏥','手術歴',`${petHealth('手術歴').length}件`],['🗒️','通院歴',`${petHealth('通院').length}件`]].map(x=>row(x[0],x[1],x[2],'＋',`data-health="${x[1].replace('歴','')}"`)).join('')}</div>`},
  healthForm(){const kind=main.dataset.healthKind||'現在の病気';return `<div class="card"><h2>${esc(kind)}を登録</h2><input id="healthKind" type="hidden" value="${esc(kind)}"><label>${kind==='現在の病気'?'病名':'項目名'}</label><input id="healthName" required placeholder="名称"><label>日付</label><input id="healthDate" type="date"><label>治療状況</label><select id="healthStatus"><option>治療中</option><option>経過観察</option><option>治療終了</option><option>記録のみ</option></select><label>関連する薬</label><input id="healthMedicine" placeholder="薬の名前（任意）"><label>メモ</label><textarea id="healthNote"></textarea>${photoInput('healthPhoto')}<button class="primary" data-action="saveHealth">保存</button></div>`},
  album(){const photos=[...petRecords().map(r=>r.photo),...petHealth().map(h=>h.photo)].filter(Boolean);return `<div class="section-title"><h2>${esc(pet().name)}の写真</h2></div>${photos.length?`<div class="album">${photos.map(src=>`<img src="${src}" alt="記録写真">`).join('')}</div>`:'<p class="empty">記録に写真を添付すると、ここに表示されます。</p>'}`},
  family(){return `<div class="card soft" style="text-align:center"><div style="font-size:55px">👨‍👩‍👧</div><h2>家族で共有</h2><p class="muted">記録・予定・健康情報を家族で共有するための機能です。</p><button class="secondary" data-unavailable="家族の招待・ログイン・端末間同期">家族を招待する（未実装）</button></div><p class="notice"><strong>未実装：</strong>現在はこの端末のブラウザ内だけに保存されます。招待、ログイン、アクセス制御、家族のスマホとの同期は利用できません。</p>`},
  backup(){return `<div class="card"><h2>データのバックアップ</h2><p class="muted">このブラウザに保存されたペット情報、記録、予定、健康情報をJSONファイルとして保存・復元できます。</p><button class="primary" data-action="export">バックアップを書き出す</button><button class="secondary" data-action="import">バックアップを読み込む</button></div><p class="notice">バックアップには登録した写真や健康情報が含まれる場合があります。安全な場所に保管してください。</p>`},
  settings(){const p=pet();return `<div class="card">${row('🔔','お知らせ設定','希望は保存可能・端末通知は未実装','›','data-page="notifications"')}${row('💊','お薬の管理','薬ごとの時刻と回数','›','data-page="medicine"')}${row('📷','写真・アルバム','記録に添付した写真','›','data-page="album"')}${row('👨‍👩‍👧','家族で共有（未実装）','端末間同期は利用できません','›','data-page="family"')}${row('☁️','データのバックアップ','書き出し・復元','›','data-page="backup"')}</div><div class="card"><h2>${esc(p.name)}の食事設定</h2><label>1日のごはん回数</label><input id="mealGoal" type="number" min="1" max="12" value="${p.mealGoal}"><label class="check"><input id="showSnacks" type="checkbox" ${p.showSnacks?'checked':''}>おやつ項目を表示する</label><button class="primary" data-action="saveSettings">保存</button></div>`}
};

function eventRows(limit){const events=petEvents().filter(e=>e.date>=today()).slice(0,limit||999);return events.length?events.map(e=>`<div class="row"><span class="row-icon">${e.type==='トリミング'?'✂️':e.type==='予防接種'?'💉':'🩺'}</span><span class="row-body"><span class="row-title">${esc(e.type)}</span><span class="row-sub">${esc(e.date)} ${esc(e.time)} ${esc(e.place)}</span></span>${e.remind?'<span class="badge">前日希望</span>':''}</div>`).join(''):'<p class="empty">今後の予定はありません</p>'}
function recordRows(){const records=petRecords().slice(0,20);return records.length?records.map(r=>`<div class="row">${r.photo?`<img class="thumb" src="${r.photo}" alt="記録写真">`:`<span class="row-icon">${r.type==='ごはん'?'🍚':r.type==='うんち'?'💩':r.type==='嘔吐'?'🤢':'📝'}</span>`}<span class="row-body"><span class="row-title">${esc(r.type)}</span><span class="row-sub">${formatDateTime(r.datetime)}・${esc(r.recorder||'あなた')} ${esc(r.note||r.amount||'')}</span></span></div>`).join(''):'<p class="empty">まだ記録はありません</p>'}
function latestWeight(){const r=petRecords('体重')[0];return r?.weight?`${r.weight}kg`:'未登録'}
async function imageData(id){const file=$(`#${id}`)?.files?.[0];if(!file)return '';if(file.size>5*1024*1024){alert('写真は5MB以下を選んでください');throw new Error('large image')}return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)})}
function showPreview(input){const preview=$(`#${input.id}Preview`),file=input.files[0];if(!preview)return;if(!file){preview.hidden=true;return}const url=URL.createObjectURL(file);preview.src=url;preview.hidden=false;preview.onload=()=>URL.revokeObjectURL(url)}

document.addEventListener('change',event=>{if(event.target.matches('input[type="file"]'))showPreview(event.target)});
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.page){navigate(button.dataset.page);return}
  if(button.dataset.pet){state.currentPetId=button.dataset.pet;save();navigate('home');return}
  if(button.dataset.record){main.dataset.recordType=button.dataset.record;navigate('recordForm');return}
  if(button.dataset.health){main.dataset.healthKind=button.dataset.health;navigate('healthForm');return}
  if(button.dataset.unavailable){alert(`${button.dataset.unavailable}は未実装です。現在はこの端末内で使える機能のみ利用できます。`);return}
  if(button.dataset.care){const key=`${pet().id}:${today()}`,list=state.careDone[key]||[];state.careDone[key]=list.includes(button.dataset.care)?list.filter(x=>x!==button.dataset.care):[...list,button.dataset.care];save();render();return}
  try{
    if(button.dataset.action==='savePet'){
      const name=$('#petName').value.trim();if(!name){alert('名前を入力してください');return}const id=uid();state.pets.push({id,name,species:$('#petSpecies').value,breed:$('#petBreed').value,color:$('#petColor').value,birthday:$('#petBirthday').value,photo:await imageData('petPhoto')||petAssets.moko,mealGoal:Number($('#petMealGoal').value)||2,showSnacks:$('#petSnacks').checked});state.currentPetId=id;save();navigate('home');
    }else if(button.dataset.action==='saveMeal'){
      state.records.push({id:uid(),petId:pet().id,type:'ごはん',datetime:$('#recordDatetime').value,foodType:$('#foodType').value,amount:$('#amount').value,note:$('#recordNote').value,photo:await imageData('photo'),recorder:'あなた'});save();navigate('home');
    }else if(button.dataset.action==='saveRecord'){
      const type=$('#recordType').value;state.records.push({id:uid(),petId:pet().id,type,datetime:$('#recordDatetime').value,note:$('#recordNote').value,photo:await imageData('photo'),count:$('#count')?.value,shape:$('#shape')?.value,color:$('#color')?.value,volume:$('#volume')?.value,condition:$('#condition')?.value,weight:$('#weight')?.value,recorder:'あなた'});save();navigate('records');
    }else if(button.dataset.action==='saveEvent'){
      if(!$('#eventDate').value){alert('日付を選んでください');return}state.events.push({id:uid(),petId:pet().id,type:$('#eventType').value,date:$('#eventDate').value,time:$('#eventTime').value,place:$('#eventPlace').value,note:$('#eventNote').value,remind:$('#eventRemind').checked});save();render();
    }else if(button.dataset.action==='saveMedicine'){
      const name=$('#medicineName').value.trim();if(!name){alert('薬の名前を入力してください');return}state.medicines.push({id:uid(),petId:pet().id,name,times:$('#medicineTimes').value.split(',').map(x=>x.trim()).filter(Boolean),note:$('#medicineNote').value,enabled:$('#medicineEnabled').checked});save();render();
    }else if(button.dataset.action==='saveHealth'){
      const name=$('#healthName').value.trim();if(!name){alert('名称を入力してください');return}state.health.push({id:uid(),petId:pet().id,kind:$('#healthKind').value,name,date:$('#healthDate').value,status:$('#healthStatus').value,medicine:$('#healthMedicine').value,note:$('#healthNote').value,photo:await imageData('healthPhoto')});save();navigate('health');
    }else if(button.dataset.action==='saveSettings'){
      pet().mealGoal=Math.max(1,Math.min(12,Number($('#mealGoal').value)||2));pet().showSnacks=$('#showSnacks').checked;save();navigate('home');
    }else if(button.dataset.action==='saveNotifications'){
      state.notificationPrefs.reminderTime=$('#reminderTime').value;document.querySelectorAll('[data-pref]').forEach(i=>state.notificationPrefs[i.dataset.pref]=i.checked);save();alert('通知希望を保存しました。端末通知の配信は未実装です。');
    }else if(button.dataset.action==='export')exportBackup();
    else if(button.dataset.action==='import')$('#importFile').click();
  }catch(error){if(error.message!=='large image'){console.error(error);alert('保存できませんでした')}}
});

back.addEventListener('click',()=>navigate('home'));
$('#importFile').addEventListener('change',event=>{const file=event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!Array.isArray(data.pets)){throw new Error('invalid')}state={...initialState,...data};save();navigate('home');alert('バックアップを読み込みました')}catch(error){alert('このバックアップファイルは読み込めません')}};reader.readAsText(file)});
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`pet-care-backup-${today()}.json`;a.click();URL.revokeObjectURL(url)}
render();
