const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fetch = require('node-fetch');

puppeteer.use(StealthPlugin());

const GEMINI_KEY = 'AQ.Ab8RN6JhHFnYqNt6F2O2yf3UX1qdBFvqjhCY3YO8e0wVIGS0dg';
const SB_URL = 'https://cwqghiqykohefaggedjl.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8';
const KEYWORDS = ['عطلان','مكسور','كسر','خلع','صيانة','تصليح','تكييف','سباكة','كهرباء','لمبة','باب','شباك','قفل','خلاط','مروحة','سخان','تسريب','بيارة','طلمبة','غرفة','مياة','تسرب'];
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE_DIR = 'C:\\Users\\Salem Magdy\\Desktop\\LINAHSYSTEM\\whatsapp-profile';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForLogin(page) {
  console.log('Waiting for WhatsApp login...');
  for (let i = 0; i < 600; i++) {
    const info = await page.evaluate(() => {
      const r = { ready: false, hasQR: false, bodyLen: document.body?.innerText?.length || 0, title: document.title };
      if (document.querySelector('canvas')) r.hasQR = true;
      if (document.querySelector('header[data-testid="chatlist-header"]') || document.querySelector('[data-testid="chatlist-header"]')) r.ready = true;
      return r;
    });
    if (info.ready) { console.log('WhatsApp loaded'); return true; }
    if (info.hasQR) { console.log('QR code detected — scan with phone'); await page.waitForFunction("!document.querySelector('canvas')", { timeout: 600000 }).catch(() => {}); continue; }
    if (i % 10 === 0) console.log('Waiting...', info.title, 'body:', info.bodyLen);
    await sleep(2000);
  }
  throw new Error('Login timeout');
}

async function clickFirstChat(page) {
  return page.evaluate(() => {
    const chats = document.querySelectorAll('div[role="row"]');
    for (const chat of chats) {
      if (chat.querySelector('[aria-label*="غير مقروء"]') || chat.querySelector('[aria-label*="unread"]')) {
        chat.click();
        return true;
      }
    }
    if (chats.length > 0) { chats[0].click(); return true; }
    return false;
  });
}

async function detectMessages(page) {
  return page.evaluate((kw) => {
    const msgs = [];
    const msgDivs = document.querySelectorAll('div.message-in, div.message-out, [data-testid="msg-container"]');
    msgDivs.forEach(div => {
      const spans = div.querySelectorAll('span.selectable-text, span[dir="ltr"], span[dir="rtl"], span[dir="auto"]');
      spans.forEach(span => {
        const t = span.textContent.trim();
        if (t.length > 5 && kw.some(k => t.includes(k))) {
          const sender = div.querySelector('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') || '';
          msgs.push({ text: t, sender });
        }
      });
    });
    return [...new Map(msgs.map(m => [m.text, m])).values()];
  }, kw);
}

async function main() {
  console.log('Starting WhatsApp Monitor...');
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME_PATH,
    userDataDir: PROFILE_DIR,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-web-security','--disable-features=IsolateOrigins,site-per-process']
  });
  const page = await browser.newPage();
  await page.setBypassCSP(true);
  await page.goto('https://web.whatsapp.com', { waitUntil: 'load', timeout: 60000 });
  await waitForLogin(page);
  await sleep(3000);
  await clickFirstChat(page);
  console.log('Monitoring for maintenance messages...');

  const seen = new Set();
  let noChatOpened = false;

  setInterval(async () => {
    try {
      const msgs = await detectMessages(page);
      if (msgs.length === 0 && !noChatOpened) {
        const clicked = await clickFirstChat(page);
        if (!clicked) { noChatOpened = true; console.log('No chat to click — open a conversation manually'); }
        else { await sleep(2000); }
      }
      for (const msg of msgs) {
        if (seen.has(msg.text)) continue;
        seen.add(msg.text); if (seen.size > 2000) seen.clear();
        console.log('Found:', msg.text.substring(0, 60));
        const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
          method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':GEMINI_KEY},
          body: JSON.stringify({contents:[{role:'user',parts:[{text:'Analyze: is this a maintenance request? Reply JSON only: {"is":true/false,"cat":"","task":"","room":""}\nMessage: '+msg.text}]}],generationConfig:{temperature:0.1,maxOutputTokens:200}})
        });
        const data = await resp.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const m = reply.match(/\{[\s\S]*\}/);
        const analysis = m ? JSON.parse(m[0]) : { is: false };
        if (!analysis.is) continue;
        const record = {
          id: Date.now(), category: analysis.cat||'عام', task: analysis.task||msg.text.substring(0,100),
          room: analysis.room||'', date: new Date().toISOString().split('T')[0], status:'جديد',
          source:'واتساب', sender:msg.sender, originalText:msg.text, createdAt:new Date().toISOString()
        };
        const r = await fetch(SB_URL+'/rest/v1/sync_data?id=eq.alldata&select=data', {headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
        const rows = await r.json();
        const allData = (rows&&rows[0]&&rows[0].data)||{};
        if (!Array.isArray(allData.maintenanceRecords)) allData.maintenanceRecords = [];
        allData.maintenanceRecords.push(record);
        await fetch(SB_URL+'/rest/v1/sync_data', {method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},body:JSON.stringify({id:'alldata',data:allData,updated_at:new Date().toISOString(),device_id:'whatsapp-puppeteer'})});
        console.log('Saved:', analysis.task);
      }
    } catch(e) { console.log('Monitor error:', e.message); }
  }, 4000);
}

main().catch(e => console.error('Fatal:', e.message));
