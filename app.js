const $=id=>document.getElementById(id);
const F={カメラ:false,音声:false,位置情報:false,録音録画:false,ネットワーク:false,システム診断:false,AI:false,メモ:false,タイマー:false,ゲーム:false,リマインダー:false};
let stream=null,recorder=null,chunks=[],recognition=null,timerId=null,timerEnd=0;
const notes=JSON.parse(localStorage.getItem('nova-notes')||'[]');

function render(){ $('features').innerHTML=Object.entries(F).map(([k,v])=>`<div class="feature"><span>${k}</span><span class="${v?'ok':''}">${v?'ON':'OFF'}</span></div>`).join('') }
function out(t){$('output').textContent=t}
function openPanel(title,html){$('panelTitle').textContent=title;$('panelBody').innerHTML=html;$('panel').classList.remove('hidden')}
function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
function closePanel(){stopCamera();$('panel').classList.add('hidden')}
$('closePanel').onclick=closePanel;
render();
if('serviceWorker'in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});

$('power').onclick=()=>{const on=$('power').textContent!=='ON';$('power').textContent=on?'ON':'OFF';$('state').textContent=on?'NOVA稼働中':'NOVA待機中';$('status').textContent=on?'司令塔：'+$('leader').value:'停止中';out(on?'NOVAを起動しました。':'NOVAを停止しました。')};
$('leader').onchange=e=>$('status').textContent='司令塔：'+e.target.value;
$('run').onclick=runCommand;$('voice').onclick=startSpeech;
document.querySelectorAll('.grid button[data-f]').forEach(b=>b.onclick=()=>feature(b.dataset.f));

function runCommand(){
 if($('power').textContent!=='ON') return out('先にNOVAをONにしてください。');
 const t=$('command').value.trim(); if(!t)return out('指示を入力してください。');
 if(/カメラ|OCR|画像/.test(t))return feature('camera');
 if(/マイク|音声|話して|聞いて/.test(t))return startSpeech();
 if(/位置|現在地|距離|場所/.test(t))return getLocation();
 if(/録音|録画/.test(t))return feature('record');
 if(/ネット|通信|Wi-?Fi|回線|接続/.test(t))return feature('connect');
 if(/性能|システム|負荷|バッテリー/.test(t))return feature('performance');
 if(/AI|質問|答えて|相談/.test(t))return feature('ai');
 if(/メモ|記録/.test(t))return feature('notes',t.replace(/.*(?:メモ|記録)/,'').trim());
 if(/タイマー|分|秒/.test(t))return feature('timer',t);
 if(/ゲーム|FPS|感度/.test(t))return feature('game');
 if(/リマインダー|通知/.test(t))return feature('reminder');
 out('受信：'+t+'\n\nこのWeb版NOVAでは、対応している端末機能を実行できます。汎用AIの回答機能はAIサービスの接続が必要です。');
}
function feature(f,arg=''){
 if(f==='camera')return cameraPanel();
 if(f==='mic')return startSpeech();
 if(f==='location')return getLocation();
 if(f==='record')return recordPanel();
 if(f==='connect')return networkPanel();
 if(f==='performance')return performancePanel();
 if(f==='ai')return aiPanel();
 if(f==='notes')return notesPanel(arg);
 if(f==='timer')return timerPanel(arg);
 if(f==='game')return gamePanel();
 if(f==='reminder')return reminderPanel();
}

async function cameraPanel(){
 openPanel('カメラ / OCR',`<video id="video" class="preview" autoplay playsinline></video><div class="actions"><button id="startCam">📷 カメラ開始</button><button id="shot">📸 撮影</button></div><div id="ocr" class="result">カメラを開始してください。</div>`);
 $('startCam').onclick=startCamera;$('shot').onclick=takeOCR;
}
async function startCamera(){try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});$('video').srcObject=stream;F.カメラ=true;render();out('カメラを起動しました。')}catch(e){out('カメラを使用できません：'+e.message)}}
async function takeOCR(){
 if(!stream)return out('先にカメラを開始してください。');
 const v=$('video'),c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);
 $('ocr').textContent='撮影しました。OCRは必要時にのみ読み込みます。';
 try{
  if(!window.Tesseract) await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
  $('ocr').textContent='OCR解析中…';
  const r=await Tesseract.recognize(c,'jpn+eng',{logger:m=>{if(m.progress)$('ocr').textContent=`OCR解析中… ${Math.round(m.progress*100)}%`}});
  $('ocr').textContent=r.data.text.trim()||'文字を検出できませんでした。';out('OCR結果：\n'+(r.data.text.trim()||'文字なし'));
 }catch(e){$('ocr').textContent='OCRエラー：'+e.message}
}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}

function startSpeech(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR)return out('このブラウザでは音声認識APIが利用できません。');
 recognition?.stop();recognition=new SR();recognition.lang='ja-JP';recognition.interimResults=false;recognition.continuous=false;
 recognition.onstart=()=>{F.音声=true;render();out('🎙️ 聞いています…')};
 recognition.onresult=e=>{$('command').value=e.results[0][0].transcript;out('認識：'+$('command').value);runCommand()};
 recognition.onerror=e=>out('音声認識エラー：'+e.error);recognition.onend=render;
 try{recognition.start()}catch(e){out('音声認識を開始できませんでした。')}
}

function getLocation(){
 if(!navigator.geolocation)return out('位置情報を利用できません。');
 out('📍 現在地を取得中…');
 navigator.geolocation.getCurrentPosition(p=>{F.位置情報=true;render();out(`現在地\n緯度：${p.coords.latitude}\n経度：${p.coords.longitude}\n精度：約${Math.round(p.coords.accuracy)}m`)},e=>out('位置情報エラー：'+e.message),{enableHighAccuracy:true,timeout:10000,maximumAge:10000});
}

function recordPanel(){
 openPanel('録音 / 録画',`<p>カメラとマイクを使用します。</p><video id="recPreview" class="preview" autoplay playsinline muted></video><div class="actions"><button id="startRec">⏺ 開始</button><button id="stopRec">⏹ 停止</button></div><a id="saveRec" hidden download="nova-recording.webm">保存</a><div id="recState" class="result">待機中</div>`);
 $('startRec').onclick=startRecording;$('stopRec').onclick=stopRecording;
}
async function startRecording(){
 try{
  const s=await navigator.mediaDevices.getUserMedia({video:true,audio:true});$('recPreview').srcObject=s;chunks=[];
  const types=['video/mp4','video/webm;codecs=vp9,opus','video/webm'];const mime=types.find(t=>MediaRecorder.isTypeSupported?.(t));
  recorder=new MediaRecorder(s,mime?{mimeType:mime}:undefined);recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  recorder.onstop=()=>{const b=new Blob(chunks,{type:recorder.mimeType||'video/webm'});const a=$('saveRec');a.href=URL.createObjectURL(b);a.hidden=false;$('recState').textContent='録画完了';s.getTracks().forEach(t=>t.stop())};
  recorder.start();F.録音録画=true;render();$('recState').textContent='録画中…';
 }catch(e){$('recState').textContent='録画開始エラー：'+e.message}
}
function stopRecording(){if(recorder&&recorder.state!=='inactive')recorder.stop()}

function networkPanel(){
 const conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 openPanel('ネットワーク診断',`<div class="result">オンライン：${navigator.onLine?'はい':'いいえ'}\n接続種別：${conn?.effectiveType||'取得不可'}\n推定下り速度：${conn?.downlink?conn.downlink+' Mbps':'取得不可'}\nRTT：${conn?.rtt?conn.rtt+' ms':'取得不可'}\nHTTPS：${location.protocol==='https:'?'はい':'いいえ'}</div>`);
 F.ネットワーク=navigator.onLine;render();out('ネットワーク状態を確認しました。');
}

async function performancePanel(){
 let battery='取得不可';try{if(navigator.getBattery){const b=await navigator.getBattery();battery=Math.round(b.level*100)+'%'+(b.charging?'（充電中）':'')}}
 catch{}
 const mem=navigator.deviceMemory||'取得不可',cores=navigator.hardwareConcurrency||'取得不可';
 openPanel('システム診断',`<div class="result">論理CPUコア：${cores}\n推定メモリ：${mem} GB\nバッテリー：${battery}\n画面：${screen.width} × ${screen.height}\nPixel Ratio：${devicePixelRatio}\nオンライン：${navigator.onLine?'ON':'OFF'}</div><p class="note">WebアプリからiPhoneのCPU/GPUを直接オーバークロックすることはできません。NOVAは取得可能な情報を使って処理負荷を抑えます。</p>`);
 F.システム診断=true;render();out('システム診断完了。');
}

function aiPanel(){
 openPanel('AIチャット',`<p class="note">AI APIを安全に接続するための画面です。APIキーをこのPWAに直接埋め込む方式は使いません。</p><textarea id="aiText" placeholder="AIに質問"></textarea><button id="aiSend">送信</button><div id="aiResult" class="result">AIサービス未接続</div>`);
 $('aiSend').onclick=()=>{$('aiResult').textContent='現在はAI API未接続です。安全なバックエンドを接続するとここからAIに質問できます。';F.AI=true;render()};
}

function notesPanel(initial=''){
 openPanel('メモ',`<textarea id="noteText" placeholder="メモ">${initial}</textarea><button id="saveNote">保存</button><div id="noteList" class="result">${notes.map((n,i)=>`${i+1}. ${escapeHtml(n)}`).join('\n')||'メモなし'}</div>`);
 $('saveNote').onclick=()=>{const v=$('noteText').value.trim();if(!v)return;notes.push(v);localStorage.setItem('nova-notes',JSON.stringify(notes));F.メモ=true;render();notesPanel()};
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function timerPanel(arg=''){
 const m=arg.match(/(\d+(?:\.\d+)?)\s*(分|秒)/);const sec=m?(m[2]==='分'?Number(m[1])*60:Number(m[1])):60;
 openPanel('タイマー',`<input id="timerSec" type="number" min="1" value="${sec}" /><span>秒</span><button id="timerStart">開始</button><button id="timerStop">停止</button><div id="timerView" class="result">00:00</div>`);
 $('timerStart').onclick=()=>{clearInterval(timerId);timerEnd=Date.now()+Number($('timerSec').value)*1000;F.タイマー=true;render();tickTimer() ;timerId=setInterval(tickTimer,250)};
 $('timerStop').onclick=()=>{clearInterval(timerId);$('timerView').textContent='停止'};
 function tickTimer(){const left=Math.max(0,timerEnd-Date.now());$('timerView').textContent=new Date(left).toISOString().substring(14,19);if(!left){clearInterval(timerId);$('timerView').textContent='時間です！';navigator.vibrate?.(200)}}
}

function gamePanel(){
 openPanel('ゲームツール',`<div class="result">NOVAゲームツール</div><label>感度メモ <input id="sens" placeholder="例：4-3 Linear"></label><button id="saveSens">保存</button><div id="sensOut" class="result">${localStorage.getItem('nova-sens')||'未登録'}</div><p class="note">ゲーム内設定をNOVAから直接変更する機能ではありません。</p>`);
 $('saveSens').onclick=()=>{const v=$('sens').value.trim();localStorage.setItem('nova-sens',v);$('sensOut').textContent=v||'未登録';F.ゲーム=true;render()};
}
function reminderPanel(){
 openPanel('リマインダー',`<input id="remText" placeholder="内容"><input id="remMin" type="number" min="1" value="5"><span>分後</span><button id="remSet">設定</button><div id="remOut" class="result">※ページを閉じるとWebタイマーは止まる場合があります。</div>`);
 $('remSet').onclick=()=>{const t=$('remText').value||'NOVAリマインダー';const ms=Math.max(1,Number($('remMin').value))*60000;setTimeout(()=>{if('Notification'in window&&Notification.permission==='granted')new Notification('NOVA',{body:t});alert(t)},ms);F.リマインダー=true;render();$('remOut').textContent=`設定しました：${t}`;if('Notification'in window&&Notification.permission==='default')Notification.requestPermission()}};
window.addEventListener('online',()=>render());window.addEventListener('offline',()=>render());
