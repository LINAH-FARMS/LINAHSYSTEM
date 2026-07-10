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

client.on('ready', () => {
  console.log('✅ WhatsApp bot connected!');
  console.log('👂 Listening to groups containing:', GROUP_NAMES.join(', '));
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
