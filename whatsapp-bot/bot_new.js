// LINAHSYSTEM WhatsApp Monitor — uses your existing Chrome session
const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const GEMINI_KEY = 'AQ.Ab8RN6JhHFnYqNt6F2O2yf3UX1qdBFvqjhCY3YO8e0wVIGS0dg';
const SB_URL = 'https://cwqghiqykohefaggedjl.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8';

// Chrome user data dir — same as your Chrome
const USER_DATA_DIR = 'C:\\Users\\Salem Magdy\\AppData\\Local\\Google\\Chrome\\User Data';

console.log('🚀 Starting bot (reusing your Chrome session)...');
console.log('📁 User Data: ' + USER_DATA_DIR);

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'linah' }),
  puppeteer: {
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=${USER_DATA_DIR}`
    ],
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  }
});

client.on('qr', () => {
  console.log('⚠️ QR appeared (should not happen since we reuse Chrome)');
});

client.on('ready', () => {
  const num = client?.info?.me?.user || 'Bot';
  console.log('✅ Connected as: ' + num);
  console.log('👂 Monitoring groups for maintenance messages...');
});

client.on('message', async (msg) => {
  try {
    if (msg.fromMe) return;
    if (msg.type !== 'chat') return;

    const chat = await msg.getChat();
    const groupName = chat.isGroup ? (chat.name || '') : '';

    // Check group name
    if (!['صيانة', 'إدارة', 'مزرعة', 'الشؤون', 'ادارية'].some(k => groupName.includes(k))) return;

    const text = msg.body.trim();
    if (!text || text.length < 5) return;

    // Check keywords
    const keywords = ['عطلان', 'مكسور', 'كسر', 'خلع', 'صيانة', 'تصليح', 'تكييف', 'سباكة', 'كهرباء', 'لمبة', 'باب', 'شباك', 'قفل', 'خلاط', 'مروحة', 'سخان', 'تسريب', 'بيارة', 'طلمبة', 'غرفة', 'مياة', 'تسرب'];
    if (!keywords.some(k => text.includes(k))) return;

    const sender = msg._data?.notifyName || msg.author || 'Someone';
    console.log('📩 ' + groupName + ' - ' + sender + ': ' + text.substring(0, 60));

    // Call Gemini
    let analysis;
    try {
      const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'هل هذه طلب صيانة؟ أجب JSON فقط {"is":true/false,"cat":"","task":"","room":""}\nالرسالة: ' + text }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
        })
      });
      const data = await resp.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const m = reply.match(/\{[\s\S]*\}/);
      analysis = m ? JSON.parse(m[0]) : { is: false };
    } catch (e) {
      console.log('⚠️ Gemini error: ' + e.message);
      analysis = { is: false };
    }

    if (!analysis || !analysis.is) return;

    // Save to Supabase
    const record = {
      id: Date.now(),
      category: analysis.cat || 'عام',
      task: analysis.task || text.substring(0, 100),
      room: analysis.room || '',
      date: new Date().toISOString().split('T')[0],
      status: 'جديد',
      source: 'واتساب',
      groupName: groupName,
      sender: sender,
      originalText: text,
      createdAt: new Date().toISOString()
    };

    try {
      const r = await fetch(SB_URL + '/rest/v1/sync_data?id=eq.alldata&select=data', {
        headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
      });
      const rows = await r.json();
      const allData = (rows && rows[0] && rows[0].data) || {};
      if (!Array.isArray(allData.maintenanceRecords)) allData.maintenanceRecords = [];
      allData.maintenanceRecords.push(record);
      await fetch(SB_URL + '/rest/v1/sync_data', {
        method: 'POST',
        headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: 'alldata', data: allData, updated_at: new Date().toISOString(), device_id: 'whatsapp-bot' })
      });
      console.log('✅ Saved: ' + (analysis.task || ''));
      await msg.reply('✅ تم تسجيل طلب الصيانة\n🔧 ' + (analysis.cat || 'عام') + (analysis.room ? '\n📍 ' + analysis.room : ''));
    } catch (e) {
      console.log('⚠️ Save error: ' + e.message);
    }
  } catch (e) {
    console.log('⚠️ Error: ' + e.message);
  }
});

client.initialize();
