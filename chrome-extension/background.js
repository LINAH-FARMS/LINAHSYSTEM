// LINAHSYSTEM Background Script — handles API calls
const GEMINI_KEY = 'AQ.Ab8RN6JhHFnYqNt6F2O2yf3UX1qdBFvqjhCY3YO8e0wVIGS0dg';
const SB_URL = 'https://cwqghiqykohefaggedjl.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ANALYZE_MESSAGE') {
    analyzeAndSave(msg.text, msg.sender);
  }
});

async function analyzeAndSave(text, sender) {
  console.log('🔍 Analyzing: ' + text.substring(0, 60));
  try {
    // Call Gemini
    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'هل هذه طلب صيانة؟ أجب JSON فقط {"is":true/false,"cat":"","task":"","room":""}\nالرسالة: ' + text }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
      })
    });

    if (!resp.ok) {
      console.log('⚠️ Gemini error: ' + resp.status);
      return;
    }

    const data = await resp.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const m = reply.match(/\{[\s\S]*\}/);
    const analysis = m ? JSON.parse(m[0]) : { is: false };

    if (!analysis.is) {
      console.log('❌ Not a maintenance request');
      return;
    }

    console.log('✅ Detected: ' + (analysis.task || ''));

    // Save to Supabase
    const record = {
      id: Date.now(),
      category: analysis.cat || 'عام',
      task: analysis.task || text.substring(0, 100),
      room: analysis.room || '',
      date: new Date().toISOString().split('T')[0],
      status: 'جديد',
      source: 'واتساب',
      sender: sender,
      originalText: text,
      createdAt: new Date().toISOString()
    };

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
      body: JSON.stringify({ id: 'alldata', data: allData, updated_at: new Date().toISOString(), device_id: 'whatsapp-extension' })
    });

    console.log('✅ Saved to Supabase');
  } catch (e) {
    console.log('⚠️ Error: ' + e.message);
  }
}
