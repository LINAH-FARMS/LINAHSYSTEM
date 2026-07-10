// LINAHSYSTEM WhatsApp Bot — using whatsapp-web.js + puppeteer-extra-stealth
const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const qrcode = require('qrcode');
const fetch = require('node-fetch');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const SB_URL = 'https://cwqghiqykohefaggedjl.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8';
const GEMINI_KEY = 'AQ.Ab8RN6JhHFnYqNt6F2O2yf3UX1qdBFvqjhCY3YO8e0wVIGS0dg';

async function analyze(text) {
  try {
    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':GEMINI_KEY},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:'هل هذه طلب صيانة؟ أجب JSON فقط {"is":true/false,"cat":"","task":"","room":""}\nالرسالة: '+text}]}],generationConfig:{temperature:0.1,maxOutputTokens:200}})
    });
    const data = await resp.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const m = reply.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { is: false };
  } catch { return { is: false }; }
}

async function saveRecord(record) {
  try {
    const r = await fetch(SB_URL+'/rest/v1/sync_data?id=eq.alldata&select=data', { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer '+SB_KEY } });
    const rows = await r.json();
    const allData = (rows&&rows[0]&&rows[0].data)||{};
    if (!Array.isArray(allData.maintenanceRecords)) allData.maintenanceRecords = [];
    allData.maintenanceRecords.push(record);
    await fetch(SB_URL+'/rest/v1/sync_data', { method:'POST', headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'}, body:JSON.stringify({id:'alldata',data:allData,updated_at:new Date().toISOString(),device_id:'whatsapp-bot'}) });
    return true;
  } catch { return false; }
}

console.log('🚀 Bot starting (stealth mode)...');

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'linah' }),
  puppeteer: { headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-web-security','--disable-features=IsolateOrigins,site-per-process'], executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' }
});

client.on('qr', async (qr) => {
  const img = await qrcode.toDataURL(qr, { width: 350, margin: 1 });
  const html = `<!DOCTYPE html><html dir=rtl><head><meta charset=utf-8><title>LINAHSYSTEM Bot</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#f0f2f5;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Tahoma,sans-serif;}
.card{background:#fff;padding:30px;border-radius:16px;box-shadow:0 2px 20px rgba(0,0,0,.1);text-align:center;max-width:420px;}
h2{color:#075e54;margin-bottom:4px;font-size:20px;}
p{color:#555;font-size:13px;margin-bottom:14px;}
.qr-img{width:350px;height:350px;border-radius:8px;border:3px solid #25D366;}
.steps{text-align:right;margin-top:14px;font-size:12px;color:#333;line-height:1.9;border-top:1px solid #e0e0e0;padding-top:10px;}
.steps b{color:#075e54;}
</style></head><body><div class=card>
<h2>🤖 LINAHSYSTEM</h2>
<p>امسح QR لربط بوت الصيانة</p>
<img class=qr-img src="${img}">
<div style=margin-top:6px;font-size:12px;color:#075e54;>📱 واتساب ← القائمة ← الأجهزة المرتبطة</div>
<div class=steps><b>🔹 الخطوات:</b><br>
<b>١.</b> افتح واتساب على تلفونك<br>
<b>٢.</b> اضغط ⋮ ← الأجهزة المرتبطة<br>
<b>٣.</b> اضغط «ربط جهاز»<br>
<b>٤.</b> امسح QR ده<br>
<br><div style=background:#e8f5e9;border-radius:8px;padding:8px;text-align:center;font-size:13px;color:#1b5e20;>بعد المسح — ضيف الرقم في جروب «صيانة»</div>
</div></div></html>`;
  fs.writeFileSync('qr-code.html', html);
  console.log('✅ QR page ready');
});

client.on('ready', () => {
  const n = client?.info?.me?.user || 'غير معروف';
  console.log('✅ Bot connected!');
  console.log('📱 الرقم: ' + n);
  fs.writeFileSync('bot-number.txt', n);
  const html2 = `<!DOCTYPE html><html dir=rtl><head><meta charset=utf-8><title>البوت جاهز</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#f0f2f5;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Tahoma,sans-serif;}
.card{background:#fff;padding:30px;border-radius:16px;box-shadow:0 2px 20px rgba(0,0,0,.1);text-align:center;max-width:420px;}
h2{color:#075e54;}.ok{font-size:60px;}.num{background:#f5f5f5;padding:10px;border-radius:8px;font-size:18px;direction:ltr;margin:8px 0;font-weight:bold;}</style></head><body><div class=card><div class=ok>✅</div><h2>البوت متصل!</h2><p style=color:#555;>رقم البوت — ضيفه في جروب «صيانة»</p><div class=num>${n}</div></div></html>`;
  fs.writeFileSync('qr-code.html', html2);
});

client.on('message', async (msg) => {
  try {
    if (!msg.from.endsWith('@g.us') || msg.fromMe || msg.type !== 'chat') return;
    const text = msg.body.trim();
    if (!text || text.length < 5) return;
    const chat = await msg.getChat();
    const gn = chat.name || '';
    if (!['صيانة','maintenance'].some(g => gn.toLowerCase().includes(g))) return;
    if (!['عطلان','مكسور','كسر','خلع','صيانة','تصليح','تكييف','سباكة','كهرباء','لمبة','باب','شباك','قفل','خلاط','مروحة','سخان','تسريب','بيارة','طلمبة','غرفة','مياة'].some(k => text.includes(k))) return;
    const sender = msg._data?.notifyName || msg.author || 'Unknown';
    console.log('📩 '+gn+' - '+sender+': '+text.substring(0,50));
    const an = await analyze(text);
    if (!an.is) return;
    const rec = { id:Date.now(), category:an.cat||'عام', task:an.task||text.substring(0,100), room:an.room||'', urgent:false, date:new Date().toISOString().split('T')[0], status:'جديد', source:'واتساب', groupName:gn, sender, originalText:text, createdAt:new Date().toISOString() };
    if (await saveRecord(rec)) {
      await msg.reply('✅ تم تسجيل الصيانة:\n🔧 '+(an.cat||'عام')+'\n📝 '+(an.task||text.substring(0,80))+(an.room?'\n📍 '+an.room:''));
      console.log('✅ Saved');
    }
  } catch(e) { console.error('Err:', e.message); }
});

client.initialize();
