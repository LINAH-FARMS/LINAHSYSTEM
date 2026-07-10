// LINAHSYSTEM — WhatsApp monitoring content script
console.log('🔍 LINAHSYSTEM loaded');

const KW = ['عطلان','مكسور','كسر','خلع','صيانة','تصليح','تكييف','سباكة','كهرباء','لمبة','باب','شباك','قفل','خلاط','مروحة','سخان','تسريب','بيارة','طلمبة','غرفة','مياة','تسرب'];
let seen = new Set();

function scan() {
  // Scan ALL visible text in the chat panel
  const rows = document.querySelectorAll('[role="row"]');
  rows.forEach(row => {
    const spans = row.querySelectorAll('span');
    spans.forEach(span => {
      const text = span.textContent.trim();
      if (!text || text.length < 5 || seen.has(text)) return;
      seen.add(text);
      if (seen.size > 2000) seen.clear();
      if (!KW.some(k => text.includes(k))) return;
      // Found a potential maintenance message
      const sender = row.querySelector('[dir="auto"]')?.textContent?.trim() || 'شخص';
      chrome.runtime.sendMessage({ type: 'MSG', text, sender });
      console.log('📩 Sent:', text.substring(0, 40));
    });
  });
}

// Start scanning after WhatsApp loads
let tries = 0;
const iv = setInterval(() => {
  tries++;
  if (document.querySelector('[role="application"]')) {
    clearInterval(iv);
    console.log('✅ LINAHSYSTEM scanning');
    scan();
    setInterval(scan, 3000);
  }
  if (tries > 60) clearInterval(iv);
}, 2000);
