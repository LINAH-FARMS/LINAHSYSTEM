// LINAHSYSTEM Telegram Bot — with Gemini AI + Function Calling
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');

// ── Config from environment ──
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tglkjlxrplbiqebzeuxr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!BOT_TOKEN) { console.error('❌ TELEGRAM_BOT_TOKEN required'); process.exit(1); }
if (!GEMINI_KEY) { console.error('❌ GEMINI_API_KEY required'); process.exit(1); }

const MODEL = 'gemini-2.5-flash';
const bot = new Telegraf(BOT_TOKEN);

// ── Session (per chat) ──
const sessions = {};

function getSession(chatId) {
  if (!sessions[chatId]) sessions[chatId] = { messages: [] };
  return sessions[chatId];
}

// ── Tools (same as web version) ──
const TOOLS = [
  {
    name: 'addMaintenanceRecord',
    description: 'إضافة سجل صيانة جديد (تسجيل صيانة في النظام)',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'تصنيف الصيانة (تكييف، سباكة، كهرباء، نجارة، حدادة)' },
        task: { type: 'string', description: 'وصف المهمة' },
        room: { type: 'string', description: 'رقم الغرفة أو المكان' },
        urgent: { type: 'boolean', description: 'عاجل؟' }
      },
      required: ['category', 'task']
    }
  },
  {
    name: 'addSepticRecord',
    description: 'تسجيل كشف بيارة',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'القطاع أو اسم البيارة' },
        date: { type: 'string', description: 'التاريخ YYYY-MM-DD' },
        trips: { type: 'number', description: 'عدد المرات' }
      },
      required: ['name']
    }
  },
  {
    name: 'addWaterStationRecord',
    description: 'تسجيل صيانة محطة مياه',
    parameters: {
      type: 'object',
      properties: {
        station: { type: 'string', description: 'المحطة القديمة أو المحطة الجديدة' },
        type: { type: 'string', description: 'نوع الصيانة' },
        date: { type: 'string', description: 'التاريخ YYYY-MM-DD' },
        notes: { type: 'string', description: 'ملاحظات' }
      },
      required: ['station', 'type']
    }
  }
];

// ── System prompt builder ──
function buildSystemPrompt() {
  return `أنت مساعد LINAHSYSTEM الذكي. أجب بالعامية المصرية.
لديك صلاحية تسجيل صيانة، بيارات، ومحطات مياه في النظام.
استخدم الأدوات المتاحة عندما يطلب المستخدم تسجيل شيء.
إذا طلب تحليل أو إحصاء — حلل من البيانات المتاحة.
التاريخ الحالي: ${new Date().toLocaleDateString('ar-EG')}`;
}

// ── Execute tool ──
async function executeTool(fnName, args) {
  // For now, push to Supabase directly
  const result = { success: true, message: '' };
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  if (fnName === 'addMaintenanceRecord') {
    const record = { id: Date.now(), category: args.category, task: args.task, room: args.room || '', urgent: args.urgent || false, date: today, status: 'جديد', createdAt: now };
    result.message = `🔧 صيانة: ${args.category} — ${args.task}${args.room ? ' في ' + args.room : ''}`;
    if (SUPABASE_KEY) {
      try {
        const existing = await fetch(`${SUPABASE_URL}/rest/v1/maintenanceRecords?select=id`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
        const rows = await existing.json();
        const current = Array.isArray(rows) ? rows : [];
        current.push(record);
        await fetch(`${SUPABASE_URL}/rest/v1/maintenanceRecords?id=eq.maintenanceRecords`, { method: 'PATCH', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ data: current }) });
      } catch(e) { console.error('Supabase error:', e.message); }
    }
  } else if (fnName === 'addSepticRecord') {
    const record = { id: Date.now(), name: args.name, date: args.date || today, trips: args.trips || 1, createdAt: now };
    result.message = `💧 كشف بيارة: ${args.name}${args.trips ? ' (' + args.trips + ' مرة)' : ''}`;
    if (SUPABASE_KEY) {
      try {
        const existing = await fetch(`${SUPABASE_URL}/rest/v1/septicRecords?select=id`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
        const rows = await existing.json();
        const current = Array.isArray(rows) ? rows : [];
        current.push(record);
        await fetch(`${SUPABASE_URL}/rest/v1/septicRecords?id=eq.septicRecords`, { method: 'PATCH', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ data: current }) });
      } catch(e) { console.error('Supabase error:', e.message); }
    }
  } else if (fnName === 'addWaterStationRecord') {
    const record = { id: 'ws_' + Date.now(), station: args.station, type: args.type, date: args.date || today, notes: args.notes || '', status: 'نشطة', createdAt: now };
    result.message = `💧 صيانة محطة: ${args.station} — ${args.type}`;
    if (SUPABASE_KEY) {
      try {
        const existing = await fetch(`${SUPABASE_URL}/rest/v1/waterStations?select=id`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
        const rows = await existing.json();
        const current = Array.isArray(rows) ? rows : [];
        current.push(record);
        await fetch(`${SUPABASE_URL}/rest/v1/waterStations?id=eq.waterStations`, { method: 'PATCH', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ data: current }) });
      } catch(e) { console.error('Supabase error:', e.message); }
    }
  }
  return result;
}

// ── Call Gemini ──
async function callGemini(chatHistory, userText) {
  const contents = [
    { role: 'user', parts: [{ text: buildSystemPrompt() }] },
    { role: 'model', parts: [{ text: 'فهمت! أنا جاهز.' }] }
  ];
  // Add history
  for (const m of chatHistory) {
    contents.push({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.text }] });
  }
  contents.push({ role: 'user', parts: [{ text: userText }] });

  const body = { contents, tools: [{ functionDeclarations: TOOLS }], generationConfig: { temperature: 0.4, maxOutputTokens: 2048 } };

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API ${resp.status}: ${err.substring(0, 200)}`);
  }
  return resp.json();
}

function extractFunctionCall(data) {
  if (!data?.candidates?.[0]?.content?.parts) return null;
  for (const p of data.candidates[0].content.parts) {
    if (p.functionCall) return p.functionCall;
  }
  return null;
}

function extractText(data) {
  if (!data?.candidates?.[0]?.content?.parts) return null;
  return data.candidates[0].content.parts.filter(p => p.text).map(p => p.text).join('');
}

// ── Bot handlers ──
bot.start((ctx) => {
  ctx.reply('🤖 مرحباً بك في LINAHSYSTEM!\nأقدر أسجل صيانة، بيارات، ومحطات مياه.\nجرب:\n- "سجل صيانة للغرفة ٣ تكييف عطلان"\n- "كشف بيارة قطاع المزرعة"\n- "صيانة للمحطة الجديدة"');
});

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const userText = ctx.message.text;
  const session = getSession(chatId);

  try {
    const data = await callGemini(session.messages, userText);
    const fnCall = extractFunctionCall(data);

    if (fnCall) {
      const args = fnCall.args || {};
      const result = await executeTool(fnCall.name, args);
      session.messages.push({ role: 'user', text: userText });
      session.messages.push({ role: 'ai', text: result.message + ' ✅ تم التسجيل في النظام' });
      if (session.messages.length > 20) session.messages = session.messages.slice(-20);
      await ctx.reply(`✅ ${result.message}\nتم التسجيل في النظام بنجاح!`);
    } else {
      const reply = extractText(data) || '⚠️ لم أفهم الطلب';
      session.messages.push({ role: 'user', text: userText });
      session.messages.push({ role: 'ai', text: reply });
      if (session.messages.length > 20) session.messages = session.messages.slice(-20);
      await ctx.reply(reply, { parse_mode: 'HTML' });
    }
  } catch (e) {
    console.error('Error:', e.message);
    await ctx.reply('⚠️ حصل خطأ: ' + e.message.substring(0, 200));
  }
});

bot.launch().then(() => console.log('🤖 Bot running...'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
