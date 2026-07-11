// LINAHSYSTEM WhatsApp Bot — reads group messages → detects maintenance → saves to system
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');

// ── Config ──
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cwqghiqykohefaggedjl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8';
const SB_ENDPOINT = SUPABASE_URL + '/rest/v1/sync_data';
const GROUP_NAMES = (process.env.WHATSAPP_GROUP_NAMES || 'صيانة,maintenance').split(',').map(s => s.trim().toLowerCase());
const MODEL = 'gemini-2.5-flash';

if (!GEMINI_KEY) { console.error('❌ GEMINI_API_KEY required'); process.exit(1); }

// ── Supabase headers ──
function sbHeaders() {
  return { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };
}

// ── Local keywords (quick filter before AI) ──
const MAINT_KEYWORDS = [
  'عطلان', 'مكسور', 'كسر', 'خلع', 'صيانة', 'تصليح', 'تصلح', 'تكييف', 'سباكة', 'كهرباء',
  'لمبة', 'باب', 'شباك', 'قفل', 'مقبض', 'خلاط', 'مروحة', 'سخان', 'بوتجاز', 'ثلاجة',
  'غسالة', 'تسريب', 'تسرب', 'مياة', 'مواسير', 'بالوعة', 'بيارة', 'طلمبة', 'محرك',
  'سير', 'بلي', 'غرفة', 'جناح', 'عنبر', 'مطبخ', 'حمام', 'سطح', 'دور', 'قاطع',
  'مفتاح', 'فيشة', 'دش', 'حمام', 'سخان', 'بوتجاز'
];

function hasKeyword(text) {
  const t = text.toLowerCase();
  return MAINT_KEYWORDS.some(k => t.includes(k));
}

// ── Gemini analysis ──
async function analyzeMessage(text, senderName) {
  const prompt = `أنت محلل صيانة. حدد إذا كانت الرسالة التالية طلب صيانة أم لا.
إذا كانت طلب صيانة، أجب بصيغة JSON فقط:
{"isMaintenance":true,"category":"التصنيف (تكييف/سباكة/كهرباء/نجارة/حدادة/عام/أجهزة/محطة مياه)","task":"وصف المشكلة","room":"رقم الغرفة أو المكان","urgent":true/false}
إذا لم تكن طلب صيانة، أجب:
{"isMaintenance":false}

الرسالة: "${text}"
المرسل: ${senderName || 'غير معروف'}`;

  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
      })
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error(e.substring(0, 200)); }
    const data = await resp.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const m = reply.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { isMaintenance: false };
  } catch (e) {
    console.error('Gemini error:', e.message);
    return { isMaintenance: false };
  }
}

// ── Save to Supabase (alldata format) ──
async function saveToSupabase(record) {
  try {
    // 1. Get current alldata
    const resp = await fetch(SB_ENDPOINT + '?id=eq.alldata&select=data', {
      method: 'GET',
      headers: sbHeaders()
    });
    if (!resp.ok) throw new Error('Fetch alldata: ' + resp.status);
    const rows = await resp.json();
    const allData = (rows && rows[0] && rows[0].data) ? rows[0].data : {};

    // 2. Ensure maintenanceRecords array exists
    if (!Array.isArray(allData.maintenanceRecords)) allData.maintenanceRecords = [];

    // 3. Push new record
    allData.maintenanceRecords.push(record);

    // 4. Save back
    const ts = new Date().toISOString();
    const payload = { id: 'alldata', data: allData, updated_at: ts, device_id: 'whatsapp-bot' };
    const saveResp = await fetch(SB_ENDPOINT, {
      method: 'POST',
      headers: Object.assign(sbHeaders(), { 'Prefer': 'resolution=merge-duplicates' }),
      body: JSON.stringify(payload)
    });
    if (!saveResp.ok) throw new Error('Save: ' + saveResp.status);
    console.log('✅ Saved to Supabase:', record.task);
  } catch (e) {
    console.error('❌ Supabase save error:', e.message);
  }
}

// ── Format record ──
function makeRecord(analysis, text, sender, groupName) {
  return {
    id: Date.now(),
    category: analysis.category || 'عام',
    task: analysis.task || text.substring(0, 100),
    room: analysis.room || '',
    urgent: analysis.urgent || false,
    date: new Date().toISOString().split('T')[0],
    status: 'جديد',
    source: 'واتساب',
    groupName: groupName,
    sender: sender,
    originalText: text,
    createdAt: new Date().toISOString()
  };
}

// ══════════════════════════════════════
//  WhatsApp Client
// ══════════════════════════════════════

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' }
});

client.on('qr', qr => {
  console.log('📱 Scan this QR code with WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// ── Helper: normalize phone to international format ──
function normalizePhone(raw) {
  if (!raw) return null;
  var digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = '2' + digits;
  }
  return digits;
}

// ── Send WhatsApp to an individual ──
async function sendToPhone(phoneRaw, text) {
  var phone = normalizePhone(phoneRaw);
  if (!phone) { console.warn('⚠️ No phone to send to'); return false; }
  try {
    var chatId = phone + '@c.us';
    await client.sendMessage(chatId, text);
    console.log('📤 Sent to ' + phone + ': ' + text.substring(0, 50));
    return true;
  } catch (e) {
    console.error('❌ Failed to send to ' + phone + ': ' + e.message);
    return false;
  }
}

// ── Send thank-you for new complaint ──
async function sendThankYou(report) {
  if (!client?.info?.wid) { console.warn('⚠️ Bot not ready'); return false; }
  if (!report || !report.phone) { console.warn('⚠️ No phone in report'); return false; }
  var msg = 'شكراً لك ' + (report.name || 'المُبلِّغ') + ' 🙏\nتم استلام بلاغك رقم #' + report.id + ' بنجاح.\nسنقوم بمعالجته في أقرب وقت.\n\n📋 نوع العطل: ' + (report.type || report.desc || '') + '\n📅 تاريخ الإبلاغ: ' + (report.opened_at || report.date || '') + '\n\nللمتابعة: https://linahfarms.github.io/LinahSystem/';
  return await sendToPhone(report.phone, msg);
}

// ── Send resolution notification ──
async function sendResolution(report) {
  if (!client?.info?.wid) { console.warn('⚠️ Bot not ready'); return false; }
  if (!report || !report.phone) { console.warn('⚠️ No phone in report'); return false; }
  var msg = 'تم إصلاح البلاغ رقم #' + report.id + ' ✅\n\n📋 ' + (report.type || report.desc || '') + '\nتاريخ الإبلاغ: ' + (report.opened_at || report.date || '') + '\nتم الإغلاق: ' + (report.closed_at || '') + '\n\nنشكرك على تواصلك معنا.';
  return await sendToPhone(report.phone, msg);
}

// ── Poll for new complaints (interval: 60s, ~3KB per check) ──
async function pollNewComplaints() {
  if (!client?.info?.wid) return;
  try {
    var resp = await fetch(SB_ENDPOINT + '?id=eq.incident_reports&select=data', { method: 'GET', headers: sbHeaders() });
    if (!resp.ok) return;
    var rows = await resp.json();
    if (!rows || !rows[0] || !rows[0].data) return;
    var reports = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
    if (!Array.isArray(reports)) return;

    var changed = false;
    for (var i = 0; i < reports.length; i++) {
      var r = reports[i];
      if (!r.phone) continue;
      // Send thank-you if new and not yet thanked
      if (r.status === 'جديد' && !r._whatsappThankYou) {
        if (await sendThankYou(r)) {
          r._whatsappThankYou = true;
          changed = true;
        }
      }
      // Send resolution if closed and not yet resolved (regardless of thank-you)
      if (r.status === 'مغلق' && !r._whatsappResolved) {
        // Send thank-you first if not sent yet (complaint was closed before poll)
        if (!r._whatsappThankYou) {
          if (await sendThankYou(r)) {
            r._whatsappThankYou = true;
            changed = true;
          }
        }
        if (await sendResolution(r)) {
          r._whatsappResolved = true;
          changed = true;
        }
      }
    }
    if (changed) {
      await fetch(SB_ENDPOINT, {
        method: 'POST',
        headers: Object.assign(sbHeaders(), { 'Prefer': 'resolution=merge-duplicates' }),
        body: JSON.stringify({ id: 'incident_reports', data: reports, updated_at: new Date().toISOString(), device_id: 'whatsapp-bot' })
      });
    }
  } catch (e) {
    console.error('❌ poll error:', e.message);
  }
}

// ── HTTP server for instant closure notifications ──
var http = require('http');
var HTTP_PORT = 3456;

var httpServer = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return; }

  var body = '';
  req.on('data', function(chunk) { body += chunk; });
  req.on('end', async function() {
    var data;
    try { data = JSON.parse(body); } catch(e) { res.writeHead(400); res.end('Invalid JSON'); return; }
    var ok = false;

    if (req.url === '/send-complaint') {
      ok = await sendThankYou(data);
      if (ok) {
        try {
          var r1 = await fetch(SB_ENDPOINT + '?id=eq.incident_reports&select=data', { method: 'GET', headers: sbHeaders() });
          var rows1 = await r1.json();
          if (rows1 && rows1[0] && rows1[0].data) {
            var reports1 = typeof rows1[0].data === 'string' ? JSON.parse(rows1[0].data) : rows1[0].data;
            for (var i1 = 0; i1 < reports1.length; i1++) {
              if (reports1[i1].id == data.id) { reports1[i1]._whatsappThankYou = true; break; }
            }
            await fetch(SB_ENDPOINT, {
              method: 'POST',
              headers: Object.assign(sbHeaders(), { 'Prefer': 'resolution=merge-duplicates' }),
              body: JSON.stringify({ id: 'incident_reports', data: reports1, updated_at: new Date().toISOString(), device_id: 'whatsapp-bot' })
            });
          }
        } catch(e) { console.error('❌ mark thank-you error:', e.message); }
      }
    } else if (req.url === '/send-resolution') {
      // Send thank-you first if not sent yet, then resolution
      if (!data._whatsappThankYou) await sendThankYou(data);
      ok = await sendResolution(data);
      if (ok) {
        try {
          var r2 = await fetch(SB_ENDPOINT + '?id=eq.incident_reports&select=data', { method: 'GET', headers: sbHeaders() });
          var rows2 = await r2.json();
          if (rows2 && rows2[0] && rows2[0].data) {
            var reports2 = typeof rows2[0].data === 'string' ? JSON.parse(rows2[0].data) : rows2[0].data;
            for (var i2 = 0; i2 < reports2.length; i2++) {
              if (reports2[i2].id == data.id) {
                reports2[i2]._whatsappThankYou = true;
                reports2[i2]._whatsappResolved = true;
                break;
              }
            }
            await fetch(SB_ENDPOINT, {
              method: 'POST',
              headers: Object.assign(sbHeaders(), { 'Prefer': 'resolution=merge-duplicates' }),
              body: JSON.stringify({ id: 'incident_reports', data: reports2, updated_at: new Date().toISOString(), device_id: 'whatsapp-bot' })
            });
          }
        } catch(e) { console.error('❌ mark error:', e.message); }
      }
    } else {
      res.writeHead(404); res.end('Unknown action'); return;
    }
    res.writeHead(ok ? 200 : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: ok }));
  });
});

httpServer.listen(HTTP_PORT, function() {
  console.log('🌐 HTTP server on http://localhost:' + HTTP_PORT);
});

client.on('ready', function() {
  console.log('✅ WhatsApp bot connected!');
  console.log('👂 Listening to groups containing:', GROUP_NAMES.join(', '));
  setInterval(pollNewComplaints, 60000);
  console.log('📋 Polling new complaints every 60s');
});

client.on('message', async (msg) => {
  try {
    // Only process group messages
    if (!msg.from.endsWith('@g.us')) return;

    // Skip own messages
    if (msg.fromMe) return;

    // Skip non-text (images, stickers, etc.)
    if (msg.type !== 'chat') return;

    const text = msg.body.trim();
    if (!text || text.length < 5) return;

    // Get group info
    const chat = await msg.getChat();
    const groupName = chat.name || '';

    // Check if this group is monitored
    const isTargetGroup = GROUP_NAMES.some(g => groupName.toLowerCase().includes(g));
    if (!isTargetGroup) return;

    // Quick keyword filter (saves API calls)
    if (!hasKeyword(text)) return;

    const sender = msg._data?.notifyName || msg.author || 'Unknown';
    console.log(`📩 [${groupName}] ${sender}: ${text.substring(0, 60)}`);

    // Ask Gemini to analyze
    const analysis = await analyzeMessage(text, sender);
    if (!analysis.isMaintenance) return;

    console.log(`🔧 Detected maintenance:`, analysis);

    const record = makeRecord(analysis, text, sender, groupName);
    await saveToSupabase(record);

    // Reply in group confirming
    const reply = `✅ تم تسجيل الصيانة:\n🔧 ${analysis.category}\n📝 ${analysis.task}${analysis.room ? '\n📍 ' + analysis.room : ''}${analysis.urgent ? '\n🚨 عاجل' : ''}`;
    await msg.reply(reply);
    console.log('✅ Replied in group');

  } catch (e) {
    console.error('Error processing message:', e.message);
  }
});

client.initialize();

console.log('🚀 LINAHSYSTEM WhatsApp Bot starting...');
