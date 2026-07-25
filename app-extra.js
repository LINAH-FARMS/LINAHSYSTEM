// Auto-associate labels with inputs to fix accessibility warnings
(function(){
  let c = 0;
  document.querySelectorAll('label:not([for])').forEach(function(lbl){
    let inp = lbl.closest('.form-group, .form-floating, td, div');
    if (!inp) inp = lbl.parentElement;
    if (!inp) return;
    inp = inp.querySelector('input:not([type=hidden]), select, textarea');
    if (!inp || inp.id) { if(inp && inp.id) lbl.setAttribute('for',inp.id); return; }
    inp.id = 'auto-label-' + (++c);
    lbl.setAttribute('for', inp.id);
  });
})();

// ====== AI Assistant (Gemini 2.0 Flash) with Function Calling ======
function _safeJsonParse(val, fallback) { try { var r = JSON.parse(val); return (r !== null && r !== undefined) ? r : fallback; } catch(e) { return fallback; } }


// Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙˆØµÙØ§Øª Ø§Ù„Ù…Ø³ØªÙˆØ±Ø¯Ø© Ù…Ù† Ù…Ù„Ù Ø§Ù„Ø±ÙŠØ³Ø¨ÙŠ.xlsx (ÙˆÙÙ„Ù‘Ø¯Øª ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹)
var RECIPES_DEFAULT = [
  { name:"ÙƒØ´Ø±ÙŠ", base:380, items:[{ q:40, u:"ÙƒØ¬Ù…", n:"Ù…ÙƒØ±ÙˆÙ†Ø©" }, { q:10, u:"ÙƒØ¬Ù…", n:"Ø§Ø³Ø¨Ø§Ø¬ÙŠØªÙŠ" }, { q:15, u:"ÙƒØ¬Ù…", n:"Ø§Ø±Ø²" }, { q:10, u:"ÙƒØ¬Ù…", n:"Ø´Ø¹Ø±ÙŠØ©" }, { q:8, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:5, u:"Ù„ØªØ±", n:"Ø²ÙŠØª Ø·Ø¨Ø®" }, { q:250, u:"Ø¬Ù…", n:"Ø´Ø·Ø©" }, { q:4, u:"Ù„ØªØ±", n:"Ø®Ù„" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø¹Ø¯Ø³ Ø§ØµÙØ±" }, { q:4, u:"ÙƒØ¬Ù…", n:"Ø­Ù…Øµ" }, { q:4, u:"ÙƒØ¬Ù…", n:"Ø¹Ø¯Ø³ Ø¨Ø¬Ø¨Ø©" }, { q:70, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:70, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù…Ø·Ø­ÙˆÙ†Ø©" }, { q:80, u:"Ø¬Ù…", n:"ÙƒÙ…ÙˆÙ†" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø«ÙˆÙ…" }, { q:20, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:4, u:"ÙˆØ­Ø¯Ø©", n:"Ø¹Ù„Ø¨Ø© ØµÙ„ØµØ©" }, { q:25, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:12, u:"Ù„ØªØ±", n:"Ø²ÙŠØª ØªØ­Ù…ÙŠØ±" }, { q:2, u:"ÙƒØ¬Ù…", n:"Ø¯Ù‚ÙŠÙ‚" }] },
  { name:"ÙØ±Ø§Ø® Ù…Ø´ÙˆÙŠØ©", base:380, items:[{ q:95, u:"Ø¹Ø¯Ø¯", n:"Ø¯Ø¬Ø§Ø¬Ø©" }, { q:15, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:10, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:550, u:"Ø¬Ù…", n:"Ø«ÙˆÙ…" }, { q:1, u:"ÙƒØ¬Ù…", n:"ÙÙ„ÙÙ„ Ø­Ø§Ø±" }, { q:2, u:"ÙƒØ¬Ù…", n:"ÙÙ„ÙÙ„ Ø¨Ø§Ø±Ø¯" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø¬Ø²Ø±" }, { q:80, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:150, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©" }, { q:200, u:"Ø¬Ù…", n:"Ø¨Ù‡Ø§Ø±Ø§Øª Ø´ÙˆÙŠ" }, { q:50, u:"Ø¬Ù…", n:"ÙƒØ§Ø±ÙŠ" }, { q:50, u:"Ø¬Ù…", n:"Ø¨Ø§Ø¨Ø±ÙŠÙƒØ§" }, { q:120, u:"Ø¬Ù…", n:"Ø«ÙˆÙ… Ø¨ÙˆØ¯Ø±" }, { q:40, u:"Ø¬Ù…", n:"Ø¨ØµÙ„ Ø¨ÙˆØ¯Ø±Ø©" }, { q:7, u:"Ù„ØªØ±", n:"Ø®Ù„" }, { q:2, u:"Ù„ØªØ±", n:"Ø²ÙŠØª Ø·Ø¨Ø®" }, { q:9.5, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:2, u:"Ø´ÙŠÙƒØ§Ø±Ø©", n:"ÙØ­Ù…" }, { q:30, u:"Ù…ØªØ±", n:"Ø³ÙŠÙ„ÙØ± Ø­Ø±Ø§Ø±ÙŠ" }, { q:8, u:"ÙƒØ¬Ù…", n:"Ø·Ø­ÙŠÙ†Ø©" }, { q:80, u:"Ø¬Ù…", n:"13 Ø¨Ù‡Ø§Ø±" }, { q:30, u:"Ø¬Ù…", n:"Ø´Ø·Ø©" }, { q:1, u:"Ø²Ø¬Ø§Ø¬Ø©", n:"Ø²ÙŠØª Ø²ÙŠØªÙˆÙ†" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ù„ÙŠÙ…ÙˆÙ†" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø¯Ù‚ÙŠÙ‚" }] },
  { name:"ÙØ±Ø§Ø® ÙØ±Ù†", base:380, items:[{ q:95, u:"Ø¹Ø¯Ø¯", n:"Ø¯Ø¬Ø§Ø¬Ø©" }, { q:3, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:3, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:50, u:"Ø¬Ù…", n:"ÙˆØ±Ù‚ Ù„Ø§ÙˆØ±Ø§" }, { q:50, u:"Ø¬Ù…", n:"Ø­Ø¨Ù‡Ø§Ù†" }, { q:70, u:"Ø¬Ù…", n:"13 Ø¨Ù‡Ø§Ø±" }, { q:50, u:"Ø¬Ù…", n:"Ø¨Ù‡Ø§Ø±Ø§Øª Ø¯Ø¬Ø§Ø¬" }, { q:50, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:1, u:"ÙˆØ­Ø¯Ø©", n:"Ø¹Ù„Ø¨Ø© ØµÙ„ØµØ©" }, { q:3, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:12, u:"ÙƒØ¬Ù…", n:"Ø¨Ø·Ø§Ø·Ø³" }, { q:8, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:5, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:200, u:"Ø¬Ù…", n:"Ø«ÙˆÙ…" }, { q:10, u:"Ø¬Ù…", n:"7 Ø¨Ù‡Ø§Ø±Ø§Øª" }, { q:20, u:"Ø¬Ù…", n:"Ø´Ø·Ø©" }, { q:50, u:"Ø¬Ù…", n:"Ø¨Ø§Ø¨Ø±ÙŠÙƒØ§" }] },
  { name:"ÙˆØ±Ù‚Ø© Ù„Ø­Ù…Ø©", base:380, items:[{ q:57, u:"ÙƒØ¬Ù…", n:"Ù„Ø­Ù…" }, { q:5, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:3, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:3, u:"ÙƒØ¬Ù…", n:"Ø¨Ø·Ø§Ø·Ø³" }, { q:100, u:"Ø¬Ù…", n:"ÙˆØ±Ù‚ Ù„Ø§ÙˆØ±Ø§" }, { q:70, u:"Ø¬Ù…", n:"13 Ø¨Ù‡Ø§Ø±" }, { q:70, u:"Ø¬Ù…", n:"7 Ø¨Ù‡Ø§Ø±Ø§Øª" }, { q:50, u:"Ø¬Ù…", n:"Ø¨Ù‡Ø§Ø±Ø§Øª Ù„Ø­Ù…" }, { q:60, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:2, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:2, u:"Ù„ÙØ©", n:"Ø³Ù„ÙØ±" }] },
  { name:"Ø³Ù„Ø·Ø© Ø®Ø¶Ø±Ø§Ø¡", base:100, items:[{ q:12, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:4, u:"ÙƒØ¬Ù…", n:"Ø®ÙŠØ§Ø±" }, { q:3, u:"ÙƒØ¬Ù…", n:"ÙÙ„ÙÙ„" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø¬Ø²Ø±" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ù„ÙŠÙ…ÙˆÙ†" }, { q:0.5, u:"ÙƒØ¬Ù…", n:"ÙÙ„ÙÙ„ Ø­Ø§Ø±" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:0.5, u:"Ø²Ø¬Ø§Ø¬Ø©", n:"Ø²ÙŠØª Ø²ÙŠØªÙˆÙ†" }, { q:0.25, u:"Ù„ØªØ±", n:"Ø®Ù„" }, { q:5, u:"Ø±Ø¨Ø·Ø©", n:"Ø®Ø¶Ø±Ø©" }, { q:50, u:"Ø¬Ù…", n:"Ù…Ù„Ø­" }, { q:50, u:"Ø¬Ù…", n:"ÙƒÙ…ÙˆÙ†" }] },
  { name:"Ø§Ø±Ø² Ø¨Ø§Ù„Ù„Ø³Ø§Ù† Ø¹ØµÙÙˆØ± ÙˆØ§Ù„Ø´Ø¹Ø±ÙŠØ©", base:380, items:[{ q:10, u:"ÙƒØ¬Ù…", n:"Ù„Ø³Ø§Ù† Ø¹ØµÙÙˆØ±" }, { q:2, u:"ÙƒØ¬Ù…", n:"Ø´Ø¹Ø±ÙŠØ©" }, { q:50, u:"ÙƒØ¬Ù…", n:"Ø§Ø±Ø²" }, { q:2, u:"Ù„ØªØ±", n:"Ø²ÙŠØª Ø·Ø¨Ø®" }, { q:5, u:"ÙƒØ¬Ù…", n:"Ø³Ù…Ù†Ø©" }, { q:2, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:50, u:"Ø¬Ù…", n:"13 Ø¨Ù‡Ø§Ø±" }, { q:50, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:50, u:"Ø¬Ù…", n:"ÙˆØ±Ù‚ Ù„Ø§ÙˆØ±Ø§" }] },
  { name:"Ù…Ù„ÙˆØ®ÙŠÙ‡", base:380, items:[{ q:10, u:"ÙƒØ¬Ù…", n:"Ù…Ù„ÙˆØ®ÙŠØ©" }, { q:1, u:"Ø¹Ù„Ø¨Ø©", n:"Ù…Ø±Ù‚Ø© Ø¯Ø¬Ø§Ø¬" }, { q:21, u:"ÙƒØ¬Ù…", n:"Ø«ÙˆÙ…" }, { q:250, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©" }, { q:5, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:2, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:20, u:"Ø¬Ù…", n:"Ø´Ø·Ø©" }, { q:4, u:"Ø±Ø¨Ø·Ø©", n:"ÙƒØ³Ø¨Ø±Ø© Ø®Ø¶Ø±Ø§Ø¡" }] },
  { name:"Ø´ÙˆØ±Ø¨Ø© Ø¹Ø¯Ø³", base:380, items:[{ q:15, u:"ÙƒØ¬Ù…", n:"Ø¹Ø¯Ø³" }, { q:1.5, u:"ÙƒØ¬Ù…", n:"Ø³Ù…Ù†" }, { q:4, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:2, u:"ÙƒØ¬Ù…", n:"Ø¨Ø·Ø§Ø·Ø³" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø¬Ø²Ø±" }, { q:500, u:"Ø¬Ù…", n:"Ø«ÙˆÙ…" }, { q:200, u:"Ø¬Ù…", n:"ÙƒÙ…ÙˆÙ†" }] },
  { name:"Ù…Ø³Ù‚Ø¹Ø©", base:380, items:[{ q:40, u:"ÙƒØ¬Ù…", n:"Ø¨Ø§Ø°Ù†Ø¬Ø§Ù† Ø±ÙˆÙ…ÙŠ" }, { q:40, u:"ÙƒØ¬Ù…", n:"Ø¨Ø·Ø§Ø·Ø³" }, { q:8, u:"ÙƒØ¬Ù…", n:"ÙÙ„ÙÙ„" }, { q:1, u:"ÙˆØ­Ø¯Ø©", n:"Ø¹Ù„Ø¨Ø© ØµÙ„ØµØ©" }, { q:7, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:500, u:"Ø¬Ù…", n:"Ø«ÙˆÙ…" }, { q:1.5, u:"Ù„ØªØ±", n:"Ø²ÙŠØª" }, { q:20, u:"Ø¬Ù…", n:"Ø´Ø·Ø©" }, { q:30, u:"Ø¬Ù…", n:"ÙƒÙ…ÙˆÙ†" }, { q:50, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©" }, { q:10, u:"ÙˆØ­Ø¯Ø©", n:"Ù…Ø±Ù‚Ø© Ø¯Ø§Ø¬" }, { q:1, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }] },
  { name:"Ø·Ø¹Ù…ÙŠØ©", base:380, items:[{ q:20, u:"ÙƒØ¬Ù…", n:"Ù…Ø¯Ø´ÙˆØ´" }, { q:20, u:"Ù„ØªØ±", n:"Ø²ÙŠØª" }, { q:10, u:"Ø±Ø¨Ø·Ø©", n:"ÙƒØ±Ø§Øª" }, { q:500, u:"Ø¬Ù…", n:"Ø«ÙˆÙ…" }, { q:250, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†ØµÙ Ø¯Ø´Ø©" }, { q:250, u:"Ø¬Ù…", n:"Ø³Ù…Ø³Ù…" }] },
  { name:"ÙÙˆÙ„", base:380, items:[{ q:15, u:"ÙƒØ¬Ù…", n:"ÙÙˆÙ„ Ø­ØµÙŠ" }, { q:1.5, u:"ÙƒØ¬Ù…", n:"ÙÙˆÙ„ Ù…Ø¯Ø´ÙˆØ´" }, { q:3, u:"ÙƒØ¬Ù…", n:"Ø§Ø±Ø²" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø¹Ø¯Ø³ Ø§ØµÙØ±" }, { q:2.5, u:"ÙƒØ¬Ù…", n:"Ø·Ø­ÙŠÙ†Ø©" }, { q:2, u:"Ù„ØªØ±", n:"Ø²ÙŠØª" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø²ÙŠØª Ø­Ø§Ø±" }, { q:1, u:"Ø²Ø¬Ø§Ø¬Ø©", n:"Ø²ÙŠØª Ø²ÙŠØªÙˆÙ†" }, { q:2, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:200, u:"Ø¬Ù…", n:"ÙƒÙ…ÙˆÙ†" }, { q:300, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©" }] },
  { name:"Ø§Ø±Ø² Ø¨Ù„Ø¨Ù†", base:380, items:[{ q:40, u:"Ù„ØªØ±", n:"Ù„Ø¨Ù†" }, { q:12, u:"ÙƒØ¬Ù…", n:"Ø³ÙƒØ±" }, { q:3, u:"ÙƒØ¬Ù…", n:"Ù†Ø´Ø§" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø²Ø¨ÙŠØ¨" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø²Ø¨ÙŠØ¨" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø¬ÙˆØ² Ù‡Ù†Ø¯" }, { q:5, u:"ÙƒØ¬Ù…", n:"Ø§Ø±Ø²" }, { q:380, u:"ÙˆØ­Ø¯Ø©", n:"Ø¹Ù„Ø¨Ø© Ø¨Ù„Ø§Ø³ØªÙŠÙƒ" }] },
  { name:"Ø¨Ø·Ø§Ø·Ø³ Ù…Ù‡Ø±ÙˆØ³Ø©", base:380, items:[{ q:60, u:"ÙƒØ¬Ù…", n:"Ø¨Ø·Ø§Ø·Ø³" }, { q:2, u:"ÙƒØ¬Ù…", n:"Ø³Ù…Ù†Ø©" }, { q:1.5, u:"Ù„ØªØ±", n:"Ø²ÙŠØª" }, { q:100, u:"Ø¬Ù…", n:"ÙƒØ±ÙƒÙ…" }, { q:50, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:2, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:300, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©" }, { q:100, u:"Ø¬Ù…", n:"Ø´Ø·Ø©" }] },
  { name:"Ø¨Ø·Ø§Ø·Ø³ Ù…Ù‚Ù„ÙŠÙ‡", base:380, items:[{ q:85, u:"ÙƒØ¬Ù…", n:"Ø¨Ø·Ø§Ø·Ø³" }, { q:15, u:"Ù„ØªØ±", n:"Ø²ÙŠØª" }, { q:250, u:"Ø¬Ù…", n:"ØªÙˆØ§Ø¨Ù„ Ø§Ù„Ø´Ø±Ù‚ Ø§Ù„Ø§Ù‚ØµÙŠ" }, { q:2, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }] },
  { name:"Ø¨ÙŠØ¶ Ù…Ø³Ù„ÙˆÙ‚", base:1, items:[{ q:1, u:"Ø¹Ø¯Ø¯", n:"Ø¨ÙŠØ¶Ø©" }] },
  { name:"Ù…Ø±Ø¨ÙŠ", base:1, items:[{ q:1, u:"Ø¹Ø¯Ø¯", n:"Ø¹Ù„Ø¨Ø© Ù…Ø±Ø¨ÙŠ 20 Ø¬Ø±Ø§Ù…" }] },
  { name:"Ø¬Ø¨Ù†Ù‡", base:1, items:[{ q:1, u:"Ø¹Ø¯Ø¯", n:"Ø¹Ù„Ø¨Ø© Ø¬Ø¨Ù†Ø© 125 Ø¬Ø±Ø§Ù…" }] },
  { name:"Ø­Ù„Ø§ÙˆØ©", base:1, items:[{ q:1, u:"Ø¹Ø¯Ø¯", n:"ÙƒÙŠØ³ Ø­Ù„Ø§ÙˆØ©" }] },
  { name:"Ù„Ø­Ù…Ø© Ø¨Ø§Ù„ØµÙˆØµ", base:380, items:[{ q:56.5, u:"ÙƒØ¬Ù…", n:"Ù„Ø­Ù…" }, { q:15, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:10, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:3, u:"ÙƒØ¬Ù…", n:"ÙÙ„ÙÙ„ Ø±ÙˆÙ…ÙŠ" }, { q:40, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:30, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©" }, { q:150, u:"Ø¬Ù…", n:"ÙˆØ±Ù‚ Ù„Ø§ÙˆØ±Ø§" }, { q:40, u:"Ø¬Ù…", n:"Ø­Ø¨Ù‡Ø§Ù†" }, { q:1, u:"ÙƒÙŠØ³", n:"ÙƒÙŠØ³ Ù…Ù„Ø­" }] },
  { name:"Ù„ÙˆØ¨ÙŠØ§", base:380, items:[{ q:1, u:"ÙƒØ¬Ù…", n:"Ø³Ù…Ù†" }, { q:5, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:200, u:"Ø¬Ù…", n:"Ø«ÙˆÙ…" }, { q:3, u:"ÙˆØ­Ø¯Ø©", n:"Ø¹Ù„Ø¨Ø© ØµÙ„ØµØ©" }, { q:1, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:5, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:50, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©" }, { q:40, u:"Ø¬Ù…", n:"7 Ø¨Ù‡Ø§Ø±Ø§Øª" }, { q:40, u:"Ø¬Ù…", n:"13 Ø¨Ù‡Ø§Ø±" }, { q:5, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:15, u:"ÙˆØ­Ø¯Ø©", n:"Ù…Ø±Ù‚Ø© Ø¯Ø¬Ø§Ø¬" }, { q:1, u:"Ù„ØªØ±", n:"Ø²ÙŠØª Ø·Ø¨Ø®" }] },
  { name:"Ø§Ø±Ø²", base:380, items:[{ q:48, u:"ÙƒØ¬Ù…", n:"Ø§Ø±Ø²" }, { q:25, u:"ÙƒØ¬Ù…", n:"Ø´Ø¹Ø±ÙŠØ©" }, { q:4, u:"ÙƒØ¬Ù…", n:"Ø³Ù…Ù†" }, { q:2, u:"Ù„ØªØ±", n:"Ø²ÙŠØª Ø·Ø¨Ø®" }, { q:2, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:15, u:"Ø¬Ù…", n:"13 Ø¨Ù‡Ø§Ø±" }, { q:10, u:"Ø¬Ù…", n:"7 Ø¨Ù‡Ø§Ø±Ø§Øª" }, { q:10, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }] },
  { name:"ÙØ§ØµÙˆÙ„ÙŠØ§", base:380, items:[{ q:1, u:"ÙƒØ¬Ù…", n:"Ø³Ù…Ù†" }, { q:5, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:200, u:"Ø¬Ù…", n:"Ø«ÙˆÙ…" }, { q:3, u:"ÙˆØ­Ø¯Ø©", n:"Ø¹Ù„Ø¨Ø© ØµÙ„ØµØ©" }, { q:1, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:5, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:50, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©" }, { q:40, u:"Ø¬Ù…", n:"7 Ø¨Ù‡Ø§Ø±Ø§Øª" }, { q:40, u:"Ø¬Ù…", n:"13 Ø¨Ù‡Ø§Ø±" }, { q:5, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:15, u:"ÙˆØ­Ø¯Ø©", n:"Ù…Ø±Ù‚Ø© Ø¯Ø¬Ø§Ø¬" }, { q:1, u:"Ù„ØªØ±", n:"Ø²ÙŠØª Ø·Ø¨Ø®" }] },
  { name:"Ø®Ø¶Ø§Ø±  Ù…Ø´ÙƒÙ„ ÙØ±ÙŠØ´", base:380, items:[{ q:35, u:"ÙƒØ¬Ù…", n:"ÙƒÙˆØ³Ø©" }, { q:10, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:250, u:"Ø¬Ù…", n:"Ø«ÙˆÙ…" }, { q:10, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:2.5, u:"ÙˆØ­Ø¯Ø©", n:"Ø¹Ù„Ø¨Ø© ØµÙ„ØµØ©" }, { q:1, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:50, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:50, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©" }, { q:20, u:"Ø¬Ù…", n:"ÙƒÙ…ÙˆÙ†" }, { q:10, u:"Ø¬Ù…", n:"ÙƒØ¨Ø§Ø¨Ø© ØµÙŠÙ†ÙŠ" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø³Ù…Ù†" }, { q:1, u:"Ù„ØªØ±", n:"Ø²ÙŠØª Ø·Ø¨Ø®" }, { q:10, u:"ÙˆØ­Ø¯Ø©", n:"Ù…Ø±Ù‚Ø© Ø¯Ø¬Ø§Ø¬" }] },
  { name:"Ø¨Ø·Ø§Ø·Ø³ ØµÙ†ÙŠØ©", base:380, items:[{ q:50, u:"ÙƒØ¬Ù…", n:"Ø¨Ø·Ø§Ø·Ø³" }, { q:10, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:250, u:"Ø¬Ù…", n:"Ø«ÙˆÙ…" }, { q:10, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:2.5, u:"ÙˆØ­Ø¯Ø©", n:"Ø¹Ù„Ø¨Ø© ØµÙ„ØµØ©" }, { q:1, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:50, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:50, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©" }, { q:20, u:"Ø¬Ù…", n:"ÙƒÙ…ÙˆÙ†" }, { q:10, u:"Ø¬Ù…", n:"ÙƒØ¨Ø§Ø¨Ø© ØµÙŠÙ†ÙŠ" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø³Ù…Ù†" }, { q:1, u:"Ù„ØªØ±", n:"Ø²ÙŠØª Ø·Ø¨Ø®" }, { q:10, u:"ÙˆØ­Ø¯Ø©", n:"Ù…Ø±Ù‚Ø© Ø¯Ø¬Ø§Ø¬" }] },
  { name:"Ø¨Ø³Ù„Ø© Ø¨Ø§Ù„Ø®Ø¶Ø§Ø±", base:380, items:[{ q:45, u:"ÙƒÙŠØ³", n:"Ø¨Ø³Ù„Ø©" }, { q:15, u:"ÙƒØ¬Ù…", n:"Ø·Ù…Ø§Ø·Ù…" }, { q:10, u:"ÙƒØ¬Ù…", n:"Ø¨ØµÙ„" }, { q:15, u:"ÙƒØ¬Ù…", n:"Ø¨Ø·Ø§Ø·Ø³" }, { q:40, u:"Ø¬Ù…", n:"ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±" }, { q:30, u:"Ø¬Ù…", n:"13 Ø¨Ù‡Ø§Ø±" }, { q:10, u:"Ø¬Ù…", n:"ÙƒØ¨Ø§Ø¨Ø© ØµÙŠÙ†ÙŠ" }, { q:40, u:"Ø¬Ù…", n:"ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©" }, { q:1, u:"ÙƒÙŠØ³", n:"Ù…Ù„Ø­" }, { q:200, u:"Ø¬Ù…", n:"Ø«ÙˆÙ…" }, { q:15, u:"Ø¬Ù…", n:"Ø«ÙˆÙ… Ø¨ÙˆØ¯Ø±Ø©" }, { q:15, u:"Ø¬Ù…", n:"Ø¨ØµÙ„ Ø¨ÙˆØ¯Ø±Ø©" }, { q:1, u:"Ù„ØªØ±", n:"Ø²ÙŠØª Ø·Ø¨Ø®" }, { q:1, u:"ÙƒØ¬Ù…", n:"Ø³Ù…Ù†" }, { q:15, u:"ÙˆØ­Ø¯Ø©", n:"Ù…Ø±Ù‚Ø© Ø¯Ø¬Ø§Ø¬" }] }
];

// ===== Ø·Ø¨Ù‚Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙˆØµÙØ§Øª (Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØ¹Ø¯ÙŠÙ„ + Ù…Ø¯Ù…Ø¬Ø© Ø¨ØªÙƒÙ„ÙØ© Ø§Ù„Ø®Ø§Ù…Ø§Øª) =====
function loadChefRecipes() {
  try { var s = JSON.parse(localStorage.getItem('chef_recipes')); if (Array.isArray(s) && s.length) return s; } catch(e){}
  return JSON.parse(JSON.stringify(RECIPES_DEFAULT));
}
var RECIPES = loadChefRecipes();
function saveChefRecipes() { try { localStorage.setItem('chef_recipes', JSON.stringify(RECIPES)); } catch(e){} }
function getRecipeByName(nm) { return RECIPES.find(function(r){ return r.name === nm; }); }
function getRecipeWeightPerPerson(recipeName) {
  var r = getRecipeByName(recipeName); if (!r || !r.items || !r.base) return 0;
  var totalKg = 0;
  r.items.forEach(function(it) {
    var q = it.q || 0;
    if (it.u === 'ÙƒØ¬Ù…' || it.u === 'Ù„ØªØ±') totalKg += q;
    else if (it.u === 'Ø¬Ù…' || it.u === 'Ø¬Ø±Ø§Ù…') totalKg += q / 1000;
    else if (it.u === 'ÙƒÙŠØ³' || it.u === 'Ø±Ø¨Ø·Ø©' || it.u === 'ÙˆØ­Ø¯Ø©' || it.u === 'Ø²Ø¬Ø§Ø¬Ø©' || it.u === 'Ø´ÙŠÙƒØ§Ø±Ø©' || it.u === 'Ù„ÙØ©' || it.u === 'Ù…ØªØ±') totalKg += q * 0.05;
    else totalKg += q * 0.05;
  });
  return totalKg / r.base;
}
var WEEKLY_MENU_DAYS = ['Ø§Ù„Ø³Ø¨Øª','Ø§Ù„Ø£Ø­Ø¯','Ø§Ù„Ø¥Ø«Ù†ÙŠÙ†','Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡','Ø§Ù„Ø£Ø±Ø¨Ø¹Ø§Ø¡','Ø§Ù„Ø®Ù…ÙŠØ³','Ø§Ù„Ø¬Ù…Ø¹Ø©'];
var _weeklyMenu = {};
function loadWeeklyMenu() {
  try { var s = JSON.parse(localStorage.getItem('lineh_weekly_menu')); if (s && typeof s === 'object') return s; } catch(e){}
  return {};
}
function saveWeeklyMenuData() { try { localStorage.setItem('lineh_weekly_menu', JSON.stringify(_weeklyMenu)); } catch(e){} }
function getRecipeNames() { return RECIPES.map(function(r){ return r.name; }); }
function openWeeklyMenu() {
  _weeklyMenu = loadWeeklyMenu();
  renderWeeklyMenu();
  updateWeeklyWeights();
  openModal('modal-weekly-menu');
}
function renderWeeklyMenu() {
  var tbody = document.getElementById('weekly-menu-body');
  if (!tbody) return;
  var names = getRecipeNames();
  var meals = ['ÙØ·Ø§Ø±','ØºØ¯Ø§Ø¡','Ø¹Ø´Ø§Ø¡'];
  var html = '';
  WEEKLY_MENU_DAYS.forEach(function(day) {
    html += '<tr style="border-bottom:1px solid #e0e0e0;">';
    html += '<td style="padding:8px;border:1px solid #e0e0e0;font-weight:700;background:#f5f5f5;">' + day + '</td>';
    meals.forEach(function(meal) {
      var key = day + '|' + meal;
      var selected = _weeklyMenu[key] || [];
      html += '<td style="padding:4px;border:1px solid #e0e0e0;">';
      html += '<select multiple size="4" style="width:100%;font-size:11px;padding:2px;border:1px solid #bbb;border-radius:4px;font-family:Cairo;" onchange="updateWeeklyMeal(this,\'' + key + '\')">';
      names.forEach(function(n) {
        var sel = selected.indexOf(n) >= 0 ? ' selected' : '';
        html += '<option value="' + n.replace(/"/g,'&quot;') + '"' + sel + '>' + n + '</option>';
      });
      html += '</select>';
      html += '</td>';
    });
    html += '</tr>';
  });
  tbody.innerHTML = html;
}
function updateWeeklyMeal(sel, key) {
  _weeklyMenu[key] = Array.from(sel.selectedOptions).map(function(o) { return o.value; });
  updateWeeklyWeights();
}
function updateWeeklyWeights() {
  var el = document.getElementById('wm-weights-display');
  if (!el) return;
  var meals = ['ÙØ·Ø§Ø±','ØºØ¯Ø§Ø¡','Ø¹Ø´Ø§Ø¡'];
  var mealIcons = {'ÙØ·Ø§Ø±':'ðŸŒ…','ØºØ¯Ø§Ø¡':'â˜€ï¸','Ø¹Ø´Ø§Ø¡':'ðŸŒ™'};
  var parts = [];
  meals.forEach(function(meal) {
    var totalW = 0, count = 0;
    WEEKLY_MENU_DAYS.forEach(function(day) {
      var dishes = _weeklyMenu[day + '|' + meal] || [];
      dishes.forEach(function(d) {
        var w = getRecipeWeightPerPerson(d);
        if (w > 0) { totalW += w; count++; }
      });
    });
    if (count > 0) {
      var avgW = (totalW / count * 1000).toFixed(0);
      parts.push(mealIcons[meal] + ' ' + meal + ': ~' + avgW + ' Ø¬Ù…/ÙØ±Ø¯');
    }
  });
  el.innerHTML = parts.length ? parts.join(' | ') : 'â€” Ø­Ø¯Ø¯ Ø£ØµÙ†Ø§Ù Ù„ÙƒÙ„ ÙˆØ¬Ø¨Ø©';
}
function saveWeeklyMenu() {
  saveWeeklyMenuData();
  closeModal('modal-weekly-menu');
}

// ===== ØªØ®Ø·ÙŠØ· ÙˆØ¬Ø¨Ø§Øª Ø§Ù„ØºØ¯ =====
function getPlanDishList(prefix) {
  var list = document.getElementById('plan-' + prefix + '-list');
  if (!list) return [];
  var dishes = [];
  list.querySelectorAll('.plan-dish-item').forEach(function(item) {
    var name = item.getAttribute('data-name');
    var hissa = parseInt(item.getAttribute('data-hissa')) || 1;
    if (name) dishes.push({ name: name, hissa: hissa });
  });
  return dishes;
}
function populatePlanDishSelects() {
  var names = getRecipeNames();
  ['plan-bf-add','plan-lh-add','plan-dn-add'].forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">â€” Ø§Ø®ØªØ± ØµÙ†Ù â€”</option>' + names.map(function(n) { return '<option value="' + n.replace(/"/g,'&quot;') + '">' + n + '</option>'; }).join('');
  });
}
function addPlanDish(prefix) {
  var sel = document.getElementById('plan-' + prefix + '-add');
  var hissaInput = document.getElementById('plan-' + prefix + '-hissa');
  var list = document.getElementById('plan-' + prefix + '-list');
  if (!sel || !list) return;
  var name = sel.value, hissa = parseInt(hissaInput ? hissaInput.value : 1) || 1;
  if (!name) return;
  if (list.querySelector('[data-name="' + name.replace(/"/g,'&quot;') + '"]')) return;
  var div = document.createElement('div');
  div.className = 'plan-dish-item';
  div.setAttribute('data-name', name);
  div.setAttribute('data-hissa', hissa);
  div.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;padding:3px 6px;background:#fff;border:1px solid #e0e0e0;border-radius:4px;';
  div.innerHTML = '<span style="flex:1;font-size:12px;">' + name + ' <span style="color:#888;font-size:10px;">(x' + hissa + ')</span></span>' +
    '<select onchange="updatePlanDishHissa(this)" style="width:45px;padding:1px 2px;border:1px solid #ddd;border-radius:3px;font-size:10px;font-family:Cairo;">' +
    [1,2,3,4,5,6,8,10].map(function(n) { return '<option value="' + n + '"' + (n === hissa ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
    '</select><button class="btn btn-danger" onclick="this.parentElement.remove()" style="padding:0 5px;font-size:10px;line-height:1.5;">âœ•</button>';
  list.appendChild(div);
  sel.value = '';
  if (hissaInput) hissaInput.value = '1';
}
function updatePlanDishHissa(sel) {
  var item = sel.closest('.plan-dish-item');
  if (item) item.setAttribute('data-hissa', sel.value);
}
function resetPlan() {
  ['plan-date','plan-bf-count','plan-lh-count','plan-dn-count'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { if (el.type === 'date') el.value = ''; else el.value = ''; }
  });
  ['plan-bf-list','plan-lh-list','plan-dn-list'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  var res = document.getElementById('plan-results');
  if (res) res.style.display = 'none';
}
function loadPlanFromWeeklyMenu() {
  _weeklyMenu = loadWeeklyMenu();
  var dateInput = document.getElementById('plan-date');
  var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (!dateInput.value) dateInput.value = tomorrow.toISOString().split('T')[0];
  var dayNames = ['Ø§Ù„Ø£Ø­Ø¯','Ø§Ù„Ø¥Ø«Ù†ÙŠÙ†','Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡','Ø§Ù„Ø£Ø±Ø¨Ø¹Ø§Ø¡','Ø§Ù„Ø®Ù…ÙŠØ³','Ø§Ù„Ø¬Ù…Ø¹Ø©','Ø§Ù„Ø³Ø¨Øª'];
  var dayName = dayNames[tomorrow.getDay()];
  var meals = ['ÙØ·Ø§Ø±','ØºØ¯Ø§Ø¡','Ø¹Ø´Ø§Ø¡'];
  var prefixes = ['bf','lh','dn'];
  prefixes.forEach(function(p) { var el = document.getElementById('plan-' + p + '-list'); if (el) el.innerHTML = ''; });
  meals.forEach(function(meal, i) {
    var key = dayName + '|' + meal;
    var dishes = _weeklyMenu[key] || [];
    dishes.forEach(function(d) {
      var sel = document.getElementById('plan-' + prefixes[i] + '-add');
      var list = document.getElementById('plan-' + prefixes[i] + '-list');
      if (!sel || !list) return;
      if (list.querySelector('[data-name="' + d.replace(/"/g,'&quot;') + '"]')) return;
      var div = document.createElement('div');
      div.className = 'plan-dish-item';
      div.setAttribute('data-name', d);
      div.setAttribute('data-hissa', '1');
      div.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;padding:3px 6px;background:#fff;border:1px solid #e0e0e0;border-radius:4px;';
      div.innerHTML = '<span style="flex:1;font-size:12px;">' + d + ' <span style="color:#888;font-size:10px;">(x1)</span></span>' +
        '<select onchange="updatePlanDishHissa(this)" style="width:45px;padding:1px 2px;border:1px solid #ddd;border-radius:3px;font-size:10px;font-family:Cairo;">' +
        [1,2,3,4,5,6,8,10].map(function(n) { return '<option value="' + n + '">' + n + '</option>'; }).join('') +
        '</select><button class="btn btn-danger" onclick="this.parentElement.remove()" style="padding:0 5px;font-size:10px;line-height:1.5;">âœ•</button>';
      list.appendChild(div);
    });
  });
  var s = getTodayMealStats();
  ['plan-bf-count','plan-lh-count','plan-dn-count'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && !el.value) el.value = s.pCount;
  });
}
function calcPlanIngredients() {
  var date = document.getElementById('plan-date').value;
  if (!date) { alert('âš ï¸ Ø§Ø®ØªØ± Ø§Ù„ØªØ§Ø±ÙŠØ® Ø£ÙˆÙ„Ø§Ù‹'); return; }
  var mealConfigs = [
    { prefix:'bf', label:'ðŸŒ… Ø¥ÙØ·Ø§Ø±' },
    { prefix:'lh', label:'â˜€ï¸ ØºØ¯Ø§Ø¡' },
    { prefix:'dn', label:'ðŸŒ™ Ø¹Ø´Ø§Ø¡' }
  ];
  var totals = {}, mealSummaries = [], hasAny = false;
  mealConfigs.forEach(function(m) {
    var count = parseInt(document.getElementById('plan-' + m.prefix + '-count').value) || 0;
    var dishes = getPlanDishList(m.prefix);
    if (count > 0 && dishes.length > 0) {
      hasAny = true;
      mealSummaries.push(m.label + ': ' + count + ' ÙØ±Ø¯ â† ' + dishes.map(function(d) { return d.name + '(x' + d.hissa + ')'; }).join('ØŒ '));
    }
    dishes.forEach(function(d) {
      var r = getRecipeByName(d.name);
      if (!r) return;
      var factor = (count / (r.base || 1)) * d.hissa;
      (r.items || []).forEach(function(it) {
        var key = it.n + '|' + (it.u || 'ÙƒØ¬Ù…');
        if (!totals[key]) totals[key] = { name: it.n, unit: it.u || 'ÙƒØ¬Ù…', qty: 0 };
        totals[key].qty += it.q * factor;
      });
    });
  });
  if (!hasAny) { alert('âš ï¸ Ø­Ø¯Ø¯ Ø§Ù„Ø£ÙØ±Ø§Ø¯ ÙˆØ£Ø¶Ù ØµÙ†ÙØ§Ù‹ ÙˆØ§Ø­Ø¯Ø§Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„'); return; }
  renderPlanResults(totals, mealSummaries);
}
function renderPlanResults(totals, mealSummaries) {
  var el = document.getElementById('plan-results');
  if (!el) return;
  var totalCost = 0, missingCost = 0;
  var sorted = Object.keys(totals).sort().map(function(key) {
    var t = totals[key];
    var unitPrice = getIngCost(t.name, t.unit);
    var lineCost = unitPrice !== undefined ? (unitPrice * t.qty) : undefined;
    if (lineCost !== undefined) totalCost += lineCost; else missingCost++;
    var unitPriceHtml = unitPrice !== undefined ? '<span style="color:#555;">' + unitPrice.toFixed(2) + ' Ø¬</span>' : '<span style="color:#b71c1c;">â€”</span>';
    var costHtml = lineCost !== undefined ? '<span style="font-weight:700;color:#2e7d32;">' + formatQty(lineCost) + ' Ø¬.Ù…</span>' : '<span style="color:#b71c1c;cursor:pointer;" onclick="openRecipeManager()">âš ï¸</span>';
    return '<tr><td>' + t.name + '</td><td style="text-align:center;">' + t.unit + '</td><td style="text-align:center;font-weight:700;color:#1565c0;">' + formatQty(t.qty) + '</td><td style="text-align:center;">' + unitPriceHtml + '</td><td style="text-align:center;">' + costHtml + '</td></tr>';
  }).join('');
  el.style.display = 'block';
  var mealIcon = {'bf':'ðŸŒ…','lh':'â˜€ï¸','dn':'ðŸŒ™'};
  el.innerHTML = '<div style="background:#fff;border:2px solid #2e7d32;border-radius:10px;overflow:hidden;">' +
    '<div style="background:#2e7d32;color:#fff;padding:10px 15px;font-weight:700;display:flex;justify-content:space-between;flex-wrap:wrap;"><span>ðŸ“‹ Ø§Ù„Ø®Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ù€ ' + Object.keys(totals).length + ' Ø®Ø§Ù…Ø©</span>' +
    '<span style="font-weight:400;font-size:12px;">' + (document.getElementById('plan-date').value || '') + '</span></div>' +
    '<div style="padding:10px;max-height:350px;overflow-y:auto;">' +
    (mealSummaries.length ? '<div style="font-size:12px;color:#555;margin-bottom:10px;padding:8px;background:#f5f5f5;border-radius:6px;">' + mealSummaries.join('<br>') + '</div>' : '') +
    '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#e8f5e9;">' +
    '<th style="padding:5px 6px;border:1px solid #c8e6c9;text-align:right;">Ø§Ù„Ø®Ø§Ù…Ø©</th><th style="padding:5px 6px;border:1px solid #c8e6c9;">Ø§Ù„ÙˆØ­Ø¯Ø©</th><th style="padding:5px 6px;border:1px solid #c8e6c9;">Ø§Ù„ÙƒÙ…ÙŠØ©</th><th style="padding:5px 6px;border:1px solid #c8e6c9;">Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©</th><th style="padding:5px 6px;border:1px solid #c8e6c9;">Ø§Ù„ØªÙƒÙ„ÙØ©</th></tr></thead><tbody>' + sorted + '</tbody></table>' +
    (missingCost > 0 ? '<div style="text-align:center;padding:6px;background:#ffebee;font-size:12px;color:#b71c1c;">âš ï¸ ' + missingCost + ' Ø®Ø§Ù…Ø© Ø¨Ø¯ÙˆÙ† Ø³Ø¹Ø± â€” Ø§ÙØªØ­ âš™ï¸ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆØµÙØ§Øª > ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø£Ø³Ø¹Ø§Ø±</div>' : '') +
    (totalCost > 0 ? '<div style="text-align:left;padding:8px;background:#e8f5e9;border-top:2px solid #2e7d32;font-weight:700;font-size:16px;color:#1b5e20;">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØªÙ‚Ø¯ÙŠØ±ÙŠ: ' + formatQty(totalCost) + ' Ø¬.Ù…</div>' : '') +
    '</div></div>';
}
function exportPlanToExcel() {
  var el = document.getElementById('plan-results');
  if (!el || el.style.display === 'none') { alert('âš ï¸ Ø§Ø­Ø³Ø¨ Ø§Ù„Ø®Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ø£ÙˆÙ„Ø§Ù‹'); return; }
  var rows = [], totals = {};
  var mealConfigs = [
    { prefix:'bf', meal:'Ø¥ÙØ·Ø§Ø±' },
    { prefix:'lh', meal:'ØºØ¯Ø§Ø¡' },
    { prefix:'dn', meal:'Ø¹Ø´Ø§Ø¡' }
  ];
  mealConfigs.forEach(function(m) {
    var count = parseInt(document.getElementById('plan-' + m.prefix + '-count').value) || 0;
    var dishes = getPlanDishList(m.prefix);
    var recipeNames = dishes.map(function(d) { var r = getRecipeByName(d.name); return r ? r.name : d.name; });
    if (count > 0 && recipeNames.length > 0) {
      rows.push({ 'Ø§Ù„ÙˆØ¬Ø¨Ø©': m.meal, 'Ø¹Ø¯Ø¯ Ø§Ù„Ø£ÙØ±Ø§Ø¯': count, 'Ø§Ù„Ø£ØµÙ†Ø§Ù': recipeNames.join(', ') });
    }
    dishes.forEach(function(d) {
      var r = getRecipeByName(d.name);
      if (!r) return;
      var factor = (count / (r.base || 1)) * d.hissa;
      (r.items || []).forEach(function(it) {
        var key = it.n + '|' + (it.u || 'ÙƒØ¬Ù…');
        if (!totals[key]) totals[key] = { name: it.n, unit: it.u || 'ÙƒØ¬Ù…', qty: 0 };
        totals[key].qty += it.q * factor;
      });
    });
  });
  Object.keys(totals).sort().forEach(function(key) {
    var t = totals[key];
    rows.push({ 'Ø§Ù„ÙˆØ¬Ø¨Ø©': '', 'Ø¹Ø¯Ø¯ Ø§Ù„Ø£ÙØ±Ø§Ø¯': '', 'Ø§Ù„Ø£ØµÙ†Ø§Ù': '', 'Ø§Ù„Ø®Ø§Ù…Ø©': t.name, 'Ø§Ù„ÙˆØ­Ø¯Ø©': t.unit, 'Ø§Ù„ÙƒÙ…ÙŠØ©': formatQty(t.qty) });
  });
  if (rows.length === 0) return;
  try {
    var ws = XLSX.utils.json_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ø­Ø§Ø³Ø¨Ø©_Ø§Ù„ÙˆØ¬Ø¨Ø§Øª');
    XLSX.writeFile(wb, 'Ø­Ø§Ø³Ø¨Ø©_ÙˆØ¬Ø¨Ø§Øª_' + (document.getElementById('plan-date').value || '').replace(/-/g,'') + '.xlsx');
  } catch(e) { alert('Ø®Ø·Ø£ ÙÙŠ Ø§Ù„ØªØµØ¯ÙŠØ±: ' + e.message); }
}
function printPlanResults() {
  var el = document.getElementById('plan-results');
  if (!el || el.style.display === 'none') { alert('âš ï¸ Ø§Ø­Ø³Ø¨ Ø§Ù„Ø®Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ø£ÙˆÙ„Ø§Ù‹'); return; }
  var content = el.innerHTML;
  var date = document.getElementById('plan-date').value || '';
  var w = window.open('', '_blank');
  w.document.write('<html dir="rtl"><head><meta charset="UTF-8"><title>ØªÙ‚Ø±ÙŠØ± Ø­Ø§Ø³Ø¨Ø© Ø§Ù„ÙˆØ¬Ø¨Ø§Øª</title>' +
    '<style>' +
    'body{font-family:Cairo,"Traditional Arabic",sans-serif;padding:20px;color:#222;}' +
    'h2{color:#1b5e20;text-align:center;margin-bottom:5px;}' +
    '.date{text-align:center;color:#666;margin-bottom:20px;font-size:14px;}' +
    'table{width:100%;border-collapse:collapse;margin-top:10px;}' +
    'th{background:#2e7d32;color:#fff;padding:8px;border:1px solid #2e7d32;text-align:center;font-size:13px;}' +
    'td{padding:8px;border:1px solid #c8e6c9;text-align:center;font-size:12px;}' +
    'tr:nth-child(even){background:#f5f5f5;}' +
    '.total{text-align:left;padding:10px;background:#e8f5e9;font-weight:700;font-size:16px;border-top:2px solid #2e7d32;}' +
    '.meal-summary{font-size:13px;color:#555;margin-bottom:10px;padding:10px;background:#f5f5f5;border-radius:6px;}' +
    '.footer{text-align:center;margin-top:30px;color:#999;font-size:11px;}' +
    '@media print{body{padding:10px;}}' +
    '</style></head><body>' +
    '<h2>ðŸ“‹ Ø­Ø§Ø³Ø¨Ø© Ø§Ù„ÙˆØ¬Ø¨Ø§Øª Ø§Ù„Ù…ØªÙƒØ§Ù…Ù„Ø©</h2>' +
    '<div class="date">' + date + '</div>' + content +
    '<div class="footer">ØªÙ… Ø§Ù„Ø¥Ù†Ø´Ø§Ø¡ Ø¨ÙˆØ§Ø³Ø·Ø© LINAHSYSTEM</div>' +
    '</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 500);
}
// ===== Ù†Ù‡Ø§ÙŠØ© ØªØ®Ø·ÙŠØ· ÙˆØ¬Ø¨Ø§Øª Ø§Ù„ØºØ¯ =====

function getExpectedWeightPerMeal(meal, pCount, dateStr) {
  _weeklyMenu = loadWeeklyMenu();
  var dayNames = ['Ø§Ù„Ø£Ø­Ø¯','Ø§Ù„Ø¥Ø«Ù†ÙŠÙ†','Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡','Ø§Ù„Ø£Ø±Ø¨Ø¹Ø§Ø¡','Ø§Ù„Ø®Ù…ÙŠØ³','Ø§Ù„Ø¬Ù…Ø¹Ø©','Ø§Ù„Ø³Ø¨Øª'];
  var dayName;
  if (dateStr) {
    var d = new Date(dateStr + (dateStr.indexOf('T') === -1 ? 'T12:00:00' : ''));
    dayName = dayNames[d.getDay()];
  } else {
    dayName = dayNames[new Date().getDay()];
  }
  var dishes = _weeklyMenu[dayName + '|' + meal] || [];
  var totalWpp = 0;
  dishes.forEach(function(d) { totalWpp += getRecipeWeightPerPerson(d); });
  return { perPersonKg: totalWpp, expectedKg: totalWpp * pCount, dishes: dishes };
}

// ØªÙƒÙ„ÙØ© Ø§Ù„Ø®Ø§Ù…Ø§Øª: Ù…ÙØªØ§Ø­ "Ø§Ù„Ø§Ø³Ù…|Ø§Ù„ÙˆØ­Ø¯Ø©" -> Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø© (Ø¬.Ù…)
var CHEF_ING_COST_DEFAULT = {};
[['13Ø¨Ù‡Ø§Ø±Ø§Øª','Ø¬Ù…',0.48],['Ø§Ø±Ø²','ÙƒØ¬Ù…',34.0],['Ø¨Ø§Ø¨Ø±ÙŠÙƒØ§','Ø¬Ù…',0.48],['Ø¨ØµÙ„ Ø¨ÙˆØ¯Ø±Ø©','Ø¬Ù…',0.36],['Ø¨ØµÙ„','ÙƒØ¬Ù…',10.0],['Ø¨Ø·Ø§Ø·Ø³','ÙƒØ¬Ù…',25.0],['Ø¨Ù‚Ø³Ù…Ø§Ø· Ù…Ø·Ø­ÙˆÙ†','ÙƒØ¬Ù…',42.0],['Ø¨Ù‡Ø§Ø±Ø§Øª 7','Ø¬Ù…',0.0005],['Ø¨Ù‡Ø§Ø±Ø§Øª Ø§Ù„Ø´ÙˆÙ‰','Ø¬Ù…',0.48],['Ø¨ÙŠØ¶','Ø¹Ø¯Ø¯',3.5],['Ø«ÙˆÙ… Ø¨ÙˆØ¯Ø±Ø©','Ø¬Ù…',0.36],['Ø«ÙˆÙ…','ÙƒØ¬Ù…',180.0],['Ø¬Ø¨Ù†Ø©','Ø¹Ø¯Ø¯',13.0],['Ø¬Ø²Ø±','ÙƒØ¬Ù…',28.0],['Ø¬ÙˆØ² Ù‡Ù†Ø¯','ÙƒØ¬Ù…',380.0],['Ø­Ø¨Ù‡Ø§Ù†','Ø¬Ù…',2.8],['Ø­Ù„Ø§ÙˆØ© Ù‚Ø·Ø¹','Ø¹Ø¯Ø¯',5.75],['Ø­Ù…Øµ','ÙƒØ¬Ù…',80.0],['Ø®Ø¶Ø±Ø©','Ø±Ø¨Ø·Ø©',3.0],['Ø®Ù„','Ø¹Ø¯Ø¯',30.0],['Ø®ÙŠØ§Ø±','ÙƒØ¬Ù…',25.0],['Ø²Ø¨ÙŠØ¨','ÙƒØ¬Ù…',330.0],['Ø²ÙŠØª Ø­Ø§Ø±','Ù„ØªØ±',150.0],['Ø²ÙŠØª','Ù„ØªØ±',100.0],['Ø³Ù…Ø³Ù…','Ø¬Ù…',0.22],['Ø³Ù…Ù†Ø©','Ø¹Ø¯Ø¯',112.0],['Ø³ÙˆØ¯Ø§Ù†Ù‰','ÙƒØ¬Ù…',180.0],['Ø³ÙŠÙ„ÙØ±','Ø¹Ø¯Ø¯',305.0],['Ø´Ø·Ø© Ø­Ù…Ø±Ø§Ø¡','Ø¬Ù…',0.18],['Ø´Ø¹Ø±ÙŠÙ‡','ÙƒØ¬Ù…',26.0],['Ø´ÙŠÙƒØ§Ø±Ø© ÙØ­Ù…','Ø¹Ø¯Ø¯',741.0],['ØµÙ„ØµÙ„Ø©','Ø¬Ù…',0.1],['Ø·Ø­ÙŠÙ†Ø©','ÙƒØ¬Ù…',160.0],['Ø¹Ø¯Ø³ Ø§ØµÙØ±','ÙƒØ¬Ù…',50.0],['Ø¹Ø¯Ø³ Ø¨Ø¬Ø¨Ù‡','ÙƒØ¬Ù…',48.0],['ÙØ§ØµÙˆÙ„ÙŠØ§','ÙƒØ¬Ù…',70.0],['ÙØ±Ø®Ø©','Ø¹Ø¯Ø¯',210.0],['ÙÙ„ÙÙ„ Ø§Ø³ÙˆØ¯','Ø¬Ù…',0.58],['ÙÙˆÙ„ Ù…Ø¯Ø´ÙˆØ´','ÙƒØ¬Ù…',36.0],['ÙÙˆÙ„ Ù…Ø¯Ù…Ø³','ÙƒØ¬Ù…',90.0],['ÙÙŠØ¬ÙŠØªØ§Ø±','ÙƒØ¬Ù…',80.0],['Ù‚Ø±Ù†ÙÙ„','Ø¬Ù…',0.98],['ÙƒØ±Ø§Øª','Ø±Ø¨Ø·Ø©',3.0],['ÙƒØ±ÙƒÙ…','Ø¬Ù…',0.36],['ÙƒØ³Ø¨Ø±Ø©','Ø¬Ù…',0.14],['ÙƒØ³Ø¨Ø±Ù‡ Ù†Ø§Ø¹Ù…Ù‡','Ø¬Ù…',0.14],['ÙƒÙ…ÙˆÙ†','Ø¬Ù…',0.4],['ÙƒÙˆØ³Ø©','ÙƒØ¬Ù…',30.0],['ÙƒÙŠØ³ Ù…Ø®Ù„Ù„','Ø¹Ø¯Ø¯',273.6],['Ù„Ø­Ù…','ÙƒØ¬Ù…',340.0],['Ù„Ø³Ø§Ù† Ø¹ØµÙÙˆØ±','ÙƒØ¬Ù…',26.0],['Ù„ÙˆØ¨ÙŠØ§','ÙƒØ¬Ù…',70.0],['Ù„ÙŠÙ…ÙˆÙ†','ÙƒØ¬Ù…',50.0],['Ù…Ø±Ø¨Ù‰','Ø¹Ø¯Ø¯',3.99],['Ù…Ø±Ù‚Ù‡ Ø¯Ø¬Ø§Ø¬','Ø¹Ø¯Ø¯',1.5],['Ù…ÙƒØ±ÙˆÙ†Ø© Ø§Ø³Ø¨Ø§ÙƒÙŠØªÙ‰','ÙƒØ¬Ù…',26.0],['Ù…ÙƒØ±ÙˆÙ†Ø©','ÙƒØ¬Ù…',26.0],['Ù…Ù„Ø­','Ø¹Ø¯Ø¯',1.75],['Ù…Ù„ÙˆØ®ÙŠØ©','ÙƒØ¬Ù…',200.0],['Ù…ÙˆØ²','ÙƒØ¬Ù…',45.0],['Ù†Ø´Ø§','ÙƒØ¬Ù…',40.0],['ÙˆØ±Ù‚ Ù„ÙˆØ±ÙŠ','Ø¬Ù…',0.24],['Ø³Ù…Ù†','ÙƒØ¬Ù…',100],['Ø¹Ø¯Ø³','ÙƒØ¬Ù…',60],['Ø¹Ù„Ø¨Ø© ØµÙ„ØµØ©','ÙˆØ­Ø¯Ø©',300],['Ø¹Ù„Ø¨Ø© Ø¨Ù„Ø§Ø³ØªÙŠÙƒ','ÙˆØ­Ø¯Ø©',1],['ÙƒØ³Ø¨Ø±Ø© Ù†Ø§Ø¹Ù…Ø©','Ø¬Ù…',30],['ÙÙ„ÙÙ„ Ø§Ø³Ù…Ø±','Ø¬Ù…',20],['Ø·Ù…Ø§Ø·Ù…','ÙƒØ¬Ù…',10],['Ø¯Ù‚ÙŠÙ‚','ÙƒØ¬Ù…',36],['Ø²ÙŠØª Ø²ÙŠØªÙˆÙ†','Ø²Ø¬Ø§Ø¬Ø©',1050],['ÙÙ„ÙÙ„','ÙƒØ¬Ù…',20],['Ø³ÙƒØ±','ÙƒØ¬Ù…',33.5],['Ø§Ø±Ø² Ø¨Ù„Ø¨Ù†','Ù„ØªØ±',55],['Ø¨ÙŠØ¶Ø©','Ø¹Ø¯Ø¯',1.5],['Ø¹Ù„Ø¨Ø© Ù…Ø±Ø¨ÙŠ 20 Ø¬Ø±Ø§Ù…','Ø¹Ø¯Ø¯',30],['Ø¹Ù„Ø¨Ø© Ø¬Ø¨Ù†Ø© 125 Ø¬Ø±Ø§Ù…','Ø¹Ø¯Ø¯',13],['ÙƒÙŠØ³ Ø­Ù„Ø§ÙˆØ©','Ø¹Ø¯Ø¯',5.75],['Ø®Ø¨Ø² Ø¨Ù„Ø¯ÙŠ','Ø¹Ø¯Ø¯',5],['Ù…Ø§Ø¡','Ù„ØªØ±',5]].forEach(function(x){ CHEF_ING_COST_DEFAULT[x[0]+'|'+x[1]] = x[2]; });
// Ù…Ø¹Ø§Ù…Ù„ Ø§Ù…ØªØµØ§Øµ Ø§Ù„Ù…Ø§Ø¡/ÙÙ‚Ø¯Ø§Ù† Ø§Ù„ÙˆØ²Ù† Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø·Ø¨Ø®
var INGREDIENT_FACTOR_MAP = {
  'Ø§Ø±Ø²':2.5,'Ø§Ø±Ø² Ø¨Ù„Ø¨Ù†':2.5,'Ø§Ø±Ø² Ù…ØµØ±ÙŠ':2.5,'Ø£Ø±Ø² Ø§Ø¨Ùˆ Ø§Ù„Ø°Ù‡Ø¨':2.5,
  'Ø¹Ø¯Ø³ Ø§ØµÙØ±':2.5,'Ø¹Ø¯Ø³ Ø¨Ø¬Ø¨Ù‡':2.5,'Ø¹Ø¯Ø³':2.5,'ÙÙˆÙ„ Ù…Ø¯Ø´ÙˆØ´':2,'ÙÙˆÙ„ Ù…Ø¯Ù…Ø³':2,'ÙÙˆÙ„':2,
  'Ø­Ù…Øµ':2,'ÙØ§ØµÙˆÙ„ÙŠØ§':2,'Ù„ÙˆØ¨ÙŠØ§':2,'Ø¨Ø³Ù„Ø©':1.5,
  'Ù…ÙƒØ±ÙˆÙ†Ø©':2.5,'Ù…ÙƒØ±ÙˆÙ†Ø© Ø§Ø³Ø¨Ø§ÙƒÙŠØªÙ‰':2.5,'Ù„Ø³Ø§Ù† Ø¹ØµÙÙˆØ±':2.5,'Ø´Ø¹Ø±ÙŠÙ‡':2.5,
  'Ø¨Ø·Ø§Ø·Ø³':1.3,'Ø¬Ø²Ø±':1.2,'ÙƒÙˆØ³Ø©':1.2,
  'Ø·Ù…Ø§Ø·Ù…':1.1,'Ø¨ØµÙ„':1.1,
  'Ù…Ù„ÙˆØ®ÙŠØ©':2,'Ø¬ÙˆØ² Ù‡Ù†Ø¯':1,
  'ÙØ±Ø®Ø©':0.8,'ÙØ±Ø§Ø®':0.8,'Ù„Ø­Ù…':0.75,'Ù„Ø­Ù…Ø©':0.75,'Ø¨ÙŠØ¶':0.75,'Ø¨ÙŠØ¶Ø©':0.75,
  'Ù…Ø§Ø¡':1,'Ø²ÙŠØª':1,'Ø³Ù…Ù†':1,'Ø³Ù…Ù†Ø©':1,'Ø²ÙŠØª Ø­Ø§Ø±':1
};
function getIngredientFactor(name) {
  if (!name) return 1;
  var key = name.trim();
  if (INGREDIENT_FACTOR_MAP[key]) return INGREDIENT_FACTOR_MAP[key];
  for (var k in INGREDIENT_FACTOR_MAP) {
    if (key.indexOf(k) !== -1 || k.indexOf(key) !== -1) return INGREDIENT_FACTOR_MAP[k];
  }
  return 1;
}
function loadChefIngCosts() {
  try { var s = JSON.parse(localStorage.getItem('chef_ing_costs')); if (s && typeof s === 'object') return s; } catch(e){}
  var merged = JSON.parse(JSON.stringify(CHEF_ING_COST_DEFAULT));
  // Ø¯Ù…Ø¬ Ø§Ù„Ø£Ø³Ø¹Ø§Ø± Ù…Ù† ingredientMaster Ù„Ù„Ø®Ø§Ù…Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø© ÙÙŠ Ø§Ù„ÙˆØµÙØ§Øª ÙÙ‚Ø·
  if (typeof ingredientMaster !== 'undefined' && ingredientMaster.length) {
    var recipeIngs = {};
    if (typeof RECIPES !== 'undefined') {
      RECIPES.forEach(function(r){ (r.items||[]).forEach(function(it){ recipeIngs[it.n+'|'+it.u] = true; }); });
    }
    ingredientMaster.forEach(function(ing) {
      var key = ing.name + '|' + (ing.unit || 'ÙƒØ¬Ù…');
      if (recipeIngs[key] && ing.price > 0) merged[key] = ing.price;
    });
  }
  return merged;
}
var CHEF_ING_COSTS = loadChefIngCosts();
function saveChefIngCosts() { try { localStorage.setItem('chef_ing_costs', JSON.stringify(CHEF_ING_COSTS)); } catch(e){} }
function getIngCost(n, u) { return CHEF_ING_COSTS[n+'|'+u]; }
function getIngCostInput(n, u) {
  var v = getIngCost(n, u);
  var missing = (v === undefined);
  return '<span style="display:inline-flex;align-items:center;gap:4px;">' +
    (missing ? '<span style="color:#c62828;font-weight:700;" title="Ø³Ø¹Ø± Ù…ÙÙ‚ÙˆØ¯">âš ï¸</span>' : '') +
    '<input type="number" step="0.01" min="0" value="' + (v!==undefined?v:'') + '" placeholder="Ø³Ø¹Ø±/'+u+'" data-cost="'+n+'|'+u+'" style="width:80px;padding:3px;border:1px solid ' + (missing ? '#c62828' : '#cfd8dc') + ';border-radius:5px;font-size:12px;" onchange="updateIngCost(this)">' +
    '</span>';
}
function updateIngCost(inp) {
  var key = inp.getAttribute('data-cost');
  var val = parseFloat(inp.value);
  if (!isNaN(val)) {
    CHEF_ING_COSTS[key] = val; saveChefIngCosts();
    var parts = key.split('|');
    var ing = ingredientMaster.find(function(i) { return i.name === parts[0]; });
    if (ing) { ing.price = val; saveIngredientMaster(); }
  }
}

function setupAutocomplete(inp) {
  var wrap = inp.closest('.ac-wrap');
  var drop = wrap.querySelector('.ac-dropdown');
  function getOpts() {
    var names = {};
    RECIPES.forEach(function(r){ (r.items||[]).forEach(function(it){ names[it.n.trim()]=1; }); });
    Object.keys(CHEF_ING_COSTS).forEach(function(k){ names[k.split('|')[0].trim()]=1; });
    return Object.keys(names).sort();
  }
  function filter(v) {
    var q = v.trim().toLowerCase();
    if (!q) { drop.style.display = 'none'; return; }
    var all = getOpts();
    var matches = all.filter(function(n){ return n.toLowerCase().includes(q); });
    if (!matches.length) { drop.style.display = 'none'; return; }
    drop.innerHTML = matches.map(function(n){
      var b = n.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi'), function(m){ return '<b>'+m+'</b>'; });
      return '<div class="ac-item" data-name="'+n+'" style="padding:5px 8px;cursor:pointer;font-size:13px;border-bottom:1px solid #eee;">'+b+'</div>';
    }).join('');
    drop.style.display = 'block';
  }
  function pick(n) {
    inp.value = n; drop.style.display = 'none';
  }
  inp.addEventListener('input', function(){ filter(this.value); });
  inp.addEventListener('focus', function(){ filter(this.value); });
  inp.addEventListener('blur', function(){ setTimeout(function(){ drop.style.display = 'none'; }, 200); });
  drop.addEventListener('mousedown', function(e){ e.preventDefault(); });
  drop.addEventListener('click', function(e){
    var item = e.target.closest('.ac-item');
    if (item) { pick(item.getAttribute('data-name')); inp.focus(); }
  });
  inp.addEventListener('keydown', function(e){
    var items = drop.querySelectorAll('.ac-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); var sel = drop.querySelector('.ac-sel'); if (!sel) { items[0].classList.add('ac-sel'); items[0].style.background = '#e3f2fd'; } else { var n = Array.prototype.indexOf.call(items, sel); sel.classList.remove('ac-sel'); sel.style.background = ''; if (n+1 < items.length) { items[n+1].classList.add('ac-sel'); items[n+1].style.background = '#e3f2fd'; } } }
    if (e.key === 'ArrowUp') { e.preventDefault(); var sel = drop.querySelector('.ac-sel'); if (sel) { var n = Array.prototype.indexOf.call(items, sel); sel.classList.remove('ac-sel'); sel.style.background = ''; if (n>0) { items[n-1].classList.add('ac-sel'); items[n-1].style.background = '#e3f2fd'; } } }
    if (e.key === 'Enter') { e.preventDefault(); var sel = drop.querySelector('.ac-sel'); if (sel) { pick(sel.getAttribute('data-name')); } }
    if (e.key === 'Escape') { drop.style.display = 'none'; }
  });
}

function exportCompareHTML() {
  if (!RECIPES.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ ÙˆØµÙØ§Øª.');
  var rows = '';
  RECIPES.forEach(function(r){
    var totalCost = 0, totalItems = (r.items||[]).length;
    (r.items||[]).forEach(function(it){
      var cost = getIngCost(it.n, it.u);
      if (cost !== undefined) totalCost += cost * it.q;
    });
    var costPerPerson = totalCost / (r.base || 1);
    rows += '<tr><td style="padding:8px;border:1px solid #ccc;text-align:right;font-weight:700;">' + r.name + '</td><td style="padding:8px;border:1px solid #ccc;text-align:center;">' + totalItems + '</td><td style="padding:8px;border:1px solid #ccc;text-align:center;font-weight:700;color:#2e7d32;">' + (costPerPerson > 0 ? costPerPerson.toFixed(2) + ' Ø¬.Ù…' : 'â€”') + '</td></tr>';
  });
  var html = '<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>Ù…Ù‚Ø§Ø±Ù†Ø© Ø§Ù„ÙˆØµÙØ§Øª</title><style>body{font-family:Cairo,Arial,sans-serif;margin:30px;}h2{color:#00796b;}table{width:100%;border-collapse:collapse;}th{background:#00796b;color:#fff;padding:10px;border:1px solid #00796b;}td{padding:8px;border:1px solid #ccc;}.footer{margin-top:20px;color:#888;font-size:12px;text-align:center;}</style></head><body><h2>ðŸ“Š Ù…Ù‚Ø§Ø±Ù†Ø© ØªÙƒÙ„ÙØ© Ø§Ù„ÙˆØµÙØ§Øª</h2><table><thead><tr><th style="text-align:right;">Ø§Ù„ÙˆØµÙØ©</th><th>Ø¹Ø¯Ø¯ Ø§Ù„Ø®Ø§Ù…Ø§Øª</th><th>ØªÙƒÙ„ÙØ© Ø§Ù„ÙØ±Ø¯</th></tr></thead><tbody>' + rows + '</tbody></table><div class="footer">ØªÙ… Ø§Ù„Ø¥Ù†Ø´Ø§Ø¡: ' + new Date().toLocaleString('ar-EG') + '</div></body></html>';
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Ù…Ù‚Ø§Ø±Ù†Ø©_Ø§Ù„ÙˆØµÙØ§Øª_' + new Date().toISOString().split('T')[0] + '.html';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function exportCompareReport() {
  if (!RECIPES.length) return alert('Ù„Ø§ ØªÙˆØ¬Ø¯ ÙˆØµÙØ§Øª.');
  var rows = [['Ø§Ù„ÙˆØµÙØ©','Ø¹Ø¯Ø¯ Ø§Ù„Ø®Ø§Ù…Ø§Øª','ØªÙƒÙ„ÙØ© Ø§Ù„ÙØ±Ø¯']];
  RECIPES.forEach(function(r){
    var totalCost = 0, totalItems = (r.items||[]).length;
    (r.items||[]).forEach(function(it){
      var cost = getIngCost(it.n, it.u);
      if (cost !== undefined) totalCost += cost * it.q;
    });
    var costPerPerson = totalCost / (r.base || 1);
    rows.push([r.name, totalItems, parseFloat(costPerPerson.toFixed(2))]);
  });
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:25},{wch:10},{wch:12}];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ù…Ù‚Ø§Ø±Ù†Ø© Ø§Ù„ÙˆØµÙØ§Øª');
  XLSX.writeFile(wb, 'Ù…Ù‚Ø§Ø±Ù†Ø©_Ø§Ù„ÙˆØµÙØ§Øª_' + new Date().toISOString().split('T')[0] + '.xlsx');
}

function compareRecipes() {
  if (!RECIPES.length) { alert('Ù„Ø§ ØªÙˆØ¬Ø¯ ÙˆØµÙØ§Øª Ù„Ù„Ù…Ù‚Ø§Ø±Ù†Ø©.'); return; }
  _compareRecipesData = RECIPES.slice();
  renderCompareTable();
  openModal('modal-compare-recipes');
}
var _compareRecipesData = [];
function renderCompareTable() {
  var html = '<table id="compare-recipes-table" style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#e0f2f1;color:#004d40;"><th style="padding:8px;border:1px solid #b2dfdb;text-align:right;">Ø§Ù„ÙˆØµÙØ©</th><th style="padding:8px;border:1px solid #b2dfdb;text-align:center;">Ø¹Ø¯Ø¯ Ø§Ù„Ø®Ø§Ù…Ø§Øª</th><th style="padding:8px;border:1px solid #b2dfdb;text-align:center;">ØªÙƒÙ„ÙØ© Ø§Ù„ÙØ±Ø¯</th><th style="padding:8px;border:1px solid #b2dfdb;text-align:center;width:60px;"></th></tr></thead><tbody>';
  _compareRecipesData.forEach(function(r){
    var totalCost = 0, missing = 0, totalItems = (r.items||[]).length;
    (r.items||[]).forEach(function(it){
      var cost = getIngCost(it.n, it.u);
      if (cost !== undefined) totalCost += cost * it.q;
      else missing++;
    });
    var costPerPerson = totalCost / (r.base || 1);
    html += '<tr style="border-bottom:1px solid #e0e0e0;"><td style="padding:8px;border:1px solid #e0e0e0;text-align:right;font-weight:700;">' + r.name + '</td><td style="padding:8px;border:1px solid #e0e0e0;text-align:center;">' + totalItems + '</td><td style="padding:8px;border:1px solid #e0e0e0;text-align:center;font-weight:700;color:#2e7d32;font-size:15px;">' + (costPerPerson > 0 ? formatQty(costPerPerson) + ' Ø¬.Ù…' : (missing > 0 ? 'âš ï¸' : 'â€”')) + '</td>' +
      '<td style="padding:8px;border:1px solid #e0e0e0;text-align:center;"><button class="btn" onclick="analyzeRecipe(\'' + r.name.replace(/'/g,"\\'") + '\')" style="padding:2px 8px;font-size:11px;background:#1565c0;color:#fff;border:none;border-radius:4px;cursor:pointer;">ðŸ” ØªØ­Ù„ÙŠÙ„</button></td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('compare-recipes-table-wrap').innerHTML = html;
}
function analyzeRecipe(name) {
  var r = RECIPES.find(function(x){ return x.name === name; });
  if (!r) return;
  var totalCost = 0, missing = 0;
  var rows = (r.items||[]).map(function(it){
    var cost = getIngCost(it.n, it.u);
    var lineCost = cost !== undefined ? cost * it.q : undefined;
    if (lineCost !== undefined) totalCost += lineCost; else missing++;
    return '<tr><td style="padding:6px;border:1px solid #e0e0e0;">' + it.n + '</td><td style="padding:6px;border:1px solid #e0e0e0;text-align:center;">' + it.u + '</td><td style="padding:6px;border:1px solid #e0e0e0;text-align:center;">' + formatQty(it.q) + '</td><td style="padding:6px;border:1px solid #e0e0e0;text-align:center;">' + (cost !== undefined ? cost.toFixed(2) : '<span style="color:#c62828;">âš ï¸</span>') + '</td><td style="padding:6px;border:1px solid #e0e0e0;text-align:center;font-weight:700;' + (lineCost !== undefined ? 'color:#1565c0;' : 'color:#c62828;') + '">' + (lineCost !== undefined ? formatQty(lineCost) + ' Ø¬.Ù…' : 'âš ï¸') + '</td><td style="padding:6px;border:1px solid #e0e0e0;text-align:center;color:#2e7d32;font-weight:700;">' + (lineCost !== undefined ? (lineCost / (r.base || 1)).toFixed(2) + ' Ø¬.Ù…' : 'â€”') + '</td></tr>';
  }).join('');
  var base = r.base || 1;
  var html =
    '<div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
    '<button class="btn" onclick="renderCompareTable()" style="padding:4px 12px;background:#546e7a;color:#fff;border:none;border-radius:5px;cursor:pointer;">ðŸ”™ Ø±Ø¬ÙˆØ¹</button>' +
    '<span style="font-weight:700;font-size:16px;">' + r.name + '</span>' +
    '<span style="color:#888;font-size:13px;">(Ø£Ø³Ø§Ø³ ' + base + ' ÙØ±Ø¯)</span>' +
    '</div>' +
    '<div style="overflow-x:auto;max-height:400px;overflow-y:auto;">' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#e0f2f1;">' +
    '<th style="padding:6px;border:1px solid #b2dfdb;text-align:right;">Ø§Ù„Ø®Ø§Ù…Ø©</th><th style="padding:6px;border:1px solid #b2dfdb;text-align:center;">Ø§Ù„ÙˆØ­Ø¯Ø©</th><th style="padding:6px;border:1px solid #b2dfdb;text-align:center;">Ø§Ù„ÙƒÙ…ÙŠØ©</th><th style="padding:6px;border:1px solid #b2dfdb;text-align:center;">Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©</th><th style="padding:6px;border:1px solid #b2dfdb;text-align:center;">Ø§Ù„ØªÙƒÙ„ÙØ© Ø§Ù„ÙƒÙ„ÙŠØ©</th><th style="padding:6px;border:1px solid #b2dfdb;text-align:center;">ØªÙƒÙ„ÙØ© Ø§Ù„ÙØ±Ø¯</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div style="margin-top:10px;padding:10px;background:#e8f5e9;border-radius:8px;font-weight:700;font-size:15px;display:flex;justify-content:space-between;flex-wrap:wrap;">' +
    '<span>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØªÙƒÙ„ÙØ©: ' + formatQty(totalCost) + ' Ø¬.Ù…</span>' +
    '<span style="color:#2e7d32;">ØªÙƒÙ„ÙØ© Ø§Ù„ÙØ±Ø¯: ' + (totalCost / base).toFixed(2) + ' Ø¬.Ù…</span>' +
    (missing > 0 ? '<span style="color:#c62828;">âš ï¸ ' + missing + ' Ø®Ø§Ù…Ø© Ø¨Ø¯ÙˆÙ† Ø³Ø¹Ø±</span>' : '') +
    '</div>';
  document.getElementById('compare-recipes-table-wrap').innerHTML = html;
}

// ===== Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆØµÙØ§Øª (Ø¥Ø¶Ø§ÙØ© / ØªØ¹Ø¯ÙŠÙ„ / Ø­Ø°Ù) =====
function openRecipeManager() {
  if (!requireAdmin()) return;
  renderRecipeManager();
  resetRecipeForm();
  renderChefCostEditor();
  openModal('modal-recipe-manager');
}
function renderRecipeManager() {
  var el = document.getElementById('recipe-manager-list');
  if (!el) return;
  el.innerHTML = RECIPES.map(function(r, i){
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:6px;background:#fff;">'+
      '<div style="font-weight:700;">' + r.name + ' <span style="color:#888;font-size:11px;">(Ø£Ø³Ø§Ø³ '+r.base+' ÙØ±Ø¯)</span></div>'+
      '<div style="display:flex;gap:6px;">'+
        '<button class="btn btn-secondary" style="padding:3px 10px;font-size:12px;" onclick="editRecipe('+i+')">âœï¸ ØªØ¹Ø¯ÙŠÙ„</button>'+
        '<button class="btn btn-danger" style="padding:3px 10px;font-size:12px;" onclick="deleteRecipe('+i+')">ðŸ—‘ï¸ Ø­Ø°Ù</button>'+
      '</div></div>';
  }).join('');
}
function deleteRecipe(i) {
  if (!confirm('Ø­Ø°Ù ÙˆØµÙØ© "' + RECIPES[i].name + '"ØŸ')) return;
  RECIPES.splice(i, 1); saveChefRecipes(); renderRecipeManager(); refreshChefDishOptions();
}
function editRecipe(i) {
  var r = RECIPES[i];
  document.getElementById('rm-name').value = r.name;
  document.getElementById('rm-base').value = r.base;
  document.getElementById('rm-edit-idx').value = i;
  var ingWrap = document.getElementById('rm-ingredients');
  ingWrap.innerHTML = '';
  (r.items||[]).forEach(function(it){ addRecipeIngredientRow(it.n, it.u, it.q); });
  document.getElementById('rm-title').textContent = 'ØªØ¹Ø¯ÙŠÙ„ ÙˆØµÙØ©';
  document.getElementById('rm-save-btn').textContent = 'ðŸ’¾ Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª';
}
function addRecipeIngredientRow(n, u, q) {
  var wrap = document.getElementById('rm-ingredients');
  var div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:6px;margin-bottom:5px;align-items:center;flex-wrap:wrap;';
  div.innerHTML =
    '<div class="ac-wrap" style="flex:2;min-width:130px;position:relative;">'+
    '<input type="text" class="rm-ing-name ac-input" value="'+(n||'')+'" placeholder="Ø§Ù„Ø®Ø§Ù…Ø©" autocomplete="off" style="width:100%;padding:5px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;">'+
    '<div class="ac-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ccc;border-radius:0 0 6px 6px;max-height:180px;overflow-y:auto;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div></div>'+
    '<select class="rm-ing-unit" style="padding:5px;border:1px solid #ccc;border-radius:6px;font-size:13px;"><option>ÙƒØ¬Ù…</option><option>Ø¬Ù…</option><option>Ù„ØªØ±</option><option>Ø¹Ø¯Ø¯</option><option>ÙˆØ­Ø¯Ø©</option><option>ÙƒÙŠØ³</option><option>Ø±Ø¨Ø·Ø©</option><option>Ø²Ø¬Ø§Ø¬Ø©</option><option>Ø´ÙŠÙƒØ§Ø±Ø©</option><option>Ù…ØªØ±</option><option>Ù„ÙØ©</option></select>'+
    '<input type="number" class="rm-ing-qty" value="'+(q!==undefined?q:'')+'" placeholder="Ø§Ù„ÙƒÙ…ÙŠØ©" min="0" step="0.01" style="width:90px;padding:5px;border:1px solid #ccc;border-radius:6px;font-size:13px;">'+
    '<button type="button" class="btn btn-danger" onclick="this.parentElement.remove()" style="padding:3px 8px;font-size:11px;">âœ•</button>';
  var sel = div.querySelector('.rm-ing-unit');
  if (u) sel.value = u;
  wrap.appendChild(div);
  setupAutocomplete(div.querySelector('.ac-input'));
}
function saveRecipe() {
  var name = document.getElementById('rm-name').value.trim();
  var base = parseInt(document.getElementById('rm-base').value) || 1;
  if (!name) { alert('Ø§Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„ÙˆØµÙØ©.'); return; }
  var items = [];
  document.querySelectorAll('#rm-ingredients > div').forEach(function(row){
    var inp = row.querySelector('.rm-ing-name');
    if (!inp) return;
    var n = inp.value.trim();
    if (!n) return;
    var u = (row.querySelector('.rm-ing-unit') || {}).value || '';
    var q = parseFloat((row.querySelector('.rm-ing-qty') || {}).value);
    if (isNaN(q)) q = 0;
    items.push({ n:n, u:u, q:q });
  });
  var idx = parseInt(document.getElementById('rm-edit-idx').value);
  if (idx >= 0 && RECIPES[idx]) { RECIPES[idx].name = name; RECIPES[idx].base = base; RECIPES[idx].items = items; }
  else {
    if (RECIPES.some(function(r){ return r.name === name; })) { alert('Ø§Ù„ÙˆØµÙØ© Ù…ÙˆØ¬ÙˆØ¯Ø© Ø¨Ø§Ù„ÙØ¹Ù„.'); return; }
    RECIPES.push({ name:name, base:base, items:items });
  }
  saveChefRecipes();
  closeModal('modal-recipe-manager');
  refreshChefDishOptions();
  alert('ØªÙ… Ø­ÙØ¸ Ø§Ù„ÙˆØµÙØ© Ø¨Ù†Ø¬Ø§Ø­.');
}
function refreshChefDishOptions() {
  document.querySelectorAll('#chef-dishes-list .chef-dish-select').forEach(function(sel){
    var cur = sel.value;
    sel.innerHTML = '<option value="">â€” Ø§Ø®ØªØ± Ø§Ù„ØµÙ†Ù â€”</option>' + RECIPES.map(function(r,i){ return '<option value="'+i+'">'+r.name+'</option>'; }).join('');
    if (cur) sel.value = cur;
  });
  // ØªØ­Ø¯ÙŠØ« Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø§ÙƒØªÙ…Ø§Ù„ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ Ù„Ù„Ø®Ø§Ù…Ø§Øª
  var dl = document.getElementById('chef-ing-master');
  if (dl) {
    var names = {};
    RECIPES.forEach(function(r){ (r.items||[]).forEach(function(it){ names[it.n]=1; }); });
    Object.keys(CHEF_ING_COSTS).forEach(function(k){ names[k.split('|')[0]]=1; });
    dl.innerHTML = Object.keys(names).map(function(n){ return '<option value="'+n+'">'; }).join('');
  }
}
function exportRecipes() {
  var rows = [['Ø§Ø³Ù… Ø§Ù„ÙˆØµÙØ©','Ø£Ø³Ø§Ø³ (ÙØ±Ø¯)','Ø§Ù„Ø®Ø§Ù…Ø©','Ø§Ù„ÙˆØ­Ø¯Ø©','Ø§Ù„ÙƒÙ…ÙŠØ©']];
  RECIPES.forEach(function(r){
    (r.items||[]).forEach(function(it){
      rows.push([r.name, r.base, it.n, it.u, it.q]);
    });
  });
  var ws1 = XLSX.utils.aoa_to_sheet(rows);
  ws1['!cols'] = [{wch:25},{wch:10},{wch:20},{wch:8},{wch:10}];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Ø§Ù„ÙˆØµÙØ§Øª');
  // Ø§Ù„Ø£Ø³Ø¹Ø§Ø±
  var priceRows = [['Ø§Ù„Ø®Ø§Ù…Ø©','Ø§Ù„ÙˆØ­Ø¯Ø©','Ø§Ù„Ø³Ø¹Ø±']];
  Object.keys(CHEF_ING_COSTS).sort().forEach(function(k){
    var parts = k.split('|');
    priceRows.push([parts[0], parts[1]||'', CHEF_ING_COSTS[k]]);
  });
  var ws2 = XLSX.utils.aoa_to_sheet(priceRows);
  ws2['!cols'] = [{wch:25},{wch:8},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Ø§Ù„Ø£Ø³Ø¹Ø§Ø±');
  // Ø¨Ø¯ÙˆÙ† Ø³Ø¹Ø±: Ø®Ø§Ù…Ø§Øª ÙÙŠ Ø§Ù„ÙˆØµÙØ§Øª Ù…Ø´ Ù„Ø§Ù‚ÙŠØ§Ù„Ù‡Ø§Ø´ Ø³Ø¹Ø±
  var missingKeys = {}, missingRows = [['Ø§Ù„Ø®Ø§Ù…Ø©','Ø§Ù„ÙˆØ­Ø¯Ø©','Ø§Ù„ÙˆØµÙØ§Øª Ø§Ù„Ù„ÙŠ ÙÙŠÙ‡Ø§']];
  RECIPES.forEach(function(r){
    (r.items||[]).forEach(function(it){
      var k = it.n+'|'+it.u;
      if (CHEF_ING_COSTS[k] === undefined) {
        if (!missingKeys[k]) missingKeys[k] = [];
        if (missingKeys[k].indexOf(r.name) === -1) missingKeys[k].push(r.name);
      }
    });
  });
  Object.keys(missingKeys).sort().forEach(function(k){
    var parts = k.split('|');
    missingRows.push([parts[0], parts[1]||'', missingKeys[k].join('ØŒ ')]);
  });
  if (missingRows.length > 1) {
    var ws3 = XLSX.utils.aoa_to_sheet(missingRows);
    ws3['!cols'] = [{wch:25},{wch:8},{wch:40}];
    XLSX.utils.book_append_sheet(wb, ws3, 'Ø¨Ø¯ÙˆÙ† Ø³Ø¹Ø±');
  }
  XLSX.writeFile(wb, 'ÙˆØµÙØ§Øª_Ø§Ù„Ø·Ø¨Ø§Ø®_' + new Date().toISOString().slice(0,10) + '.xlsx');
}
function importRecipes(inp) {
  if (!inp.files || !inp.files[0]) return;
  if (!confirm('Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„ÙˆØµÙØ§Øª Ø³ÙŠØ­Ù„ Ù…Ø­Ù„ Ø§Ù„ÙˆØµÙØ§Øª Ø§Ù„Ø­Ø§Ù„ÙŠØ©. Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ØŸ')) { inp.value = ''; return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, {type:'array'});
      var newRecipes = [];

      // Ù…Ø­Ø§ÙˆÙ„Ø© Ù‚Ø±Ø§Ø¡Ø© Ù…Ù† Ø§Ù„ØµÙŠØºØ© Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© (ÙƒÙ„ ÙˆØµÙØ© sheet + Ø§Ø³Ø¹Ø§Ø±)
      var priceSheet = wb.Sheets['Ø§Ø³Ø¹Ø§Ø±'] || wb.Sheets['Ø§Ù„Ø£Ø³Ø¹Ø§Ø±'];
      wb.SheetNames.forEach(function(sn){
        if (sn === 'Ø§Ø³Ø¹Ø§Ø±' || sn === 'Ø§Ù„Ø£Ø³Ø¹Ø§Ø±' || sn === 'Ø§Ù„ÙˆØµÙØ§Øª') return;
        var ws = wb.Sheets[sn];
        var rows = XLSX.utils.sheet_to_json(ws, {header:1});
        if (!rows || rows.length < 2) return;
        var name = rows[0][0] ? String(rows[0][0]).trim() : sn.trim();
        var base = 380;
        if (rows[0][1]) { var m = String(rows[0][1]).match(/\d+/); if (m) base = parseInt(m[0]); }
        var items = [];
        for (var i = 1; i < rows.length; i++) {
          var r = rows[i];
          if (r[2]) { items.push({ n:String(r[2]).trim(), u:(r[1]||'').toString().trim(), q:parseFloat(r[0])||0 }); }
        }
        if (items.length) newRecipes.push({ name:name, base:base, items:items });
      });

      // Ù„Ùˆ Ù…ÙÙŠØ´ Ø­Ø§Ø¬Ø©ØŒ Ø¬Ø±Ø¨ ØµÙŠØºØ© Ø§Ù„ØªØµØ¯ÙŠØ± (Ø§Ù„ÙˆØµÙØ§Øª sheet ÙˆØ§Ø­Ø¯)
      if (newRecipes.length === 0) {
        var ws1 = wb.Sheets['Ø§Ù„ÙˆØµÙØ§Øª'];
        if (ws1) {
          var data = XLSX.utils.sheet_to_json(ws1, {header:1});
          var recipesByName = {};
          data.forEach(function(row, i){
            if (i === 0) return;
            if (!row || !row.length) return;
            var name = row[0], base = row[1], ing = row[2], unit = row[3], qty = row[4];
            if (name && typeof name === 'string' && name.trim()) {
              if (!recipesByName[name.trim()]) recipesByName[name.trim()] = { name:name.trim(), base:parseInt(base)||380, items:[] };
              if (ing && typeof ing === 'string' && ing.trim()) {
                recipesByName[name.trim()].items.push({ n:ing.trim(), u:(unit||'').toString().trim(), q:parseFloat(qty)||0 });
              }
            } else if (ing && typeof ing === 'string' && ing.trim()) {
              // Ù„Ùˆ Ù…ÙÙŠØ´ Ø§Ø³Ù… Ø¬Ø¯ÙŠØ¯ØŒ Ø¶ÙŠÙ Ø¢Ø®Ø± ÙˆØµÙØ© (Ù„Ù„ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ù‚Ø¯ÙŠÙ…)
              var keys = Object.keys(recipesByName);
              if (keys.length) recipesByName[keys[keys.length-1]].items.push({ n:ing.trim(), u:(unit||'').toString().trim(), q:parseFloat(qty)||0 });
            }
          });
          Object.keys(recipesByName).forEach(function(k){ newRecipes.push(recipesByName[k]); });
        }
      }

      if (newRecipes.length) {
        RECIPES.length = 0; newRecipes.forEach(function(r){ RECIPES.push(r); });
        saveChefRecipes();
        renderRecipeManager(); refreshChefDishOptions();
        alert('ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ' + newRecipes.length + ' ÙˆØµÙØ© Ù…Ù† Excel.');
      } else { alert('Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ ÙˆØµÙØ§Øª ÙÙŠ Ø§Ù„Ù…Ù„Ù.'); }

      // Ø§Ù„Ø£Ø³Ø¹Ø§Ø±
      if (priceSheet) {
        var priceData = XLSX.utils.sheet_to_json(priceSheet, {header:1});
        var imported = 0;
        priceData.forEach(function(row, i){
          if (i === 0) return;
          if (row[1] && row[3] !== undefined && row[3] !== null) {
            CHEF_ING_COSTS[String(row[1]).trim()+'|'+(row[2]||'').toString().trim()] = parseFloat(row[3]);
            imported++;
          } else if (row[0] && row[2] !== undefined && row[2] !== null) {
            CHEF_ING_COSTS[String(row[0]).trim()+'|'+(row[1]||'').toString().trim()] = parseFloat(row[2]);
            imported++;
          }
        });
        if (imported) { saveChefIngCosts(); renderChefCostEditor(); }
      }
    } catch(err) { alert('ÙØ´Ù„ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ù„Ù: ' + err.message); }
    inp.value = '';
  };
  reader.readAsArrayBuffer(inp.files[0]);
}
function resetRecipeForm() {
  document.getElementById('rm-name').value = '';
  document.getElementById('rm-base').value = 380;
  document.getElementById('rm-edit-idx').value = -1;
  document.getElementById('rm-ingredients').innerHTML = '';
  document.getElementById('rm-title').textContent = 'âš™ï¸ Ø¥Ø¶Ø§ÙØ© ÙˆØµÙØ© Ø¬Ø¯ÙŠØ¯Ø©';
  document.getElementById('rm-save-btn').textContent = 'ðŸ’¾ Ø­ÙØ¸ Ø§Ù„ÙˆØµÙØ©';
}
function renderChefCostEditor() {
  var el = document.getElementById('chef-cost-editor');
  if (!el) return;
  var ingMap = {};
  RECIPES.forEach(function(r){
    (r.items||[]).forEach(function(it){
      var key = it.n+'|'+it.u;
      if (!ingMap[key]) ingMap[key] = { name: it.n, unit: it.u };
    });
  });
  var keys = Object.keys(ingMap).sort();
  el.innerHTML = keys.map(function(k){
    var item = ingMap[k];
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid #eee;font-size:13px;">'+
      '<span>'+item.name+' <span style="color:#888;font-size:11px;">('+item.unit+')</span></span>'+
      '<span>'+getIngCostInput(item.name, item.unit)+'</span></div>';
  }).join('');
}


function formatQty(q){
  if(!isFinite(q)) return '0';
  var r=Math.round(q*1000)/1000;
  return (Math.abs(r-Math.round(r))<0.001)? String(Math.round(r)) : (Math.round(q*100)/100).toFixed(2);
}
