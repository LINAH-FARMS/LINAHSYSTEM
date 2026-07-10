// ==UserScript==
// @name         LINAHSYSTEM - مراقب جروب الصيانة
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  يقرا رسايل جروب الصيانة ويسجلها تلقائيا
// @author       LINAHSYSTEM
// @match        https://web.whatsapp.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=whatsapp.com
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// @connect      cwqghiqykohefaggedjl.supabase.co
// ==/UserScript==

(function() {
    'use strict';

    const GEMINI_KEY = 'AQ.Ab8RN6JhHFnYqNt6F2O2yf3UX1qdBFvqjhCY3YO8e0wVIGS0dg';
    const SB_URL = 'https://cwqghiqykohefaggedjl.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWdoaXF5a29oZWZhZ2dlZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjUyMjEsImV4cCI6MjA5NjYwMTIyMX0.3a3hRcNdmYQCtjYjBroAT6df1T_7oz-XWUeD3wagYw8';
    const GROUP_KEYWORDS = ['صيانة', 'maintenance', 'إدارة', 'مزرعة', 'الشؤون'];
    const MAINT_KEYWORDS = ['عطلان','مكسور','كسر','خلع','صيانة','تصليح','تكييف','سباكة','كهرباء','لمبة','باب','شباك','قفل','خلاط','مروحة','سخان','تسريب','بيارة','طلمبة','غرفة','مياة','تسرب','شئون','ادارية'];

    let processedMessages = new Set();
    let botNumber = '';

    // ── Get bot's own number ──
    function getBotNumber() {
        try {
            const spans = document.querySelectorAll('span[title]');
            for (const s of spans) {
                const t = s.getAttribute('title') || '';
                if (t.includes('أنت') || t === 'You') {
                    // Try to find the number from the profile
                    const profileImg = s.closest('div[role="button"]');
                    if (profileImg) profileImg.click();
                }
            }
        } catch(e) {}
    }

    // ── Get current group name ──
    function getCurrentGroupName() {
        try {
            const header = document.querySelector('header div[role="button"] span[title]');
            return header ? header.getAttribute('title') || '' : '';
        } catch { return ''; }
    }

    // ── Call Gemini API ──
    async function analyzeText(text) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: 'هل هذه طلب صيانة؟ أجب JSON فقط {"is":true/false,"cat":"","task":"","room":""}\nالرسالة: ' + text }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
                }),
                onload: function(r) {
                    try {
                        const d = JSON.parse(r.responseText);
                        const reply = d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        const m = reply.match(/\{[\s\S]*\}/);
                        resolve(m ? JSON.parse(m[0]) : { is: false });
                    } catch { resolve({ is: false }); }
                },
                onerror: function() { resolve({ is: false }); }
            });
        });
    }

    // ── Save to Supabase ──
    async function saveRecord(record) {
        return new Promise((resolve) => {
            // Fetch current data
            GM_xmlhttpRequest({
                method: 'GET',
                url: SB_URL + '/rest/v1/sync_data?id=eq.alldata&select=data',
                headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY },
                onload: function(r) {
                    try {
                        const rows = JSON.parse(r.responseText);
                        const allData = (rows && rows[0] && rows[0].data) || {};
                        if (!Array.isArray(allData.maintenanceRecords)) allData.maintenanceRecords = [];
                        allData.maintenanceRecords.push(record);
                        // Save back
                        GM_xmlhttpRequest({
                            method: 'POST',
                            url: SB_URL + '/rest/v1/sync_data',
                            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
                            data: JSON.stringify({ id: 'alldata', data: allData, updated_at: new Date().toISOString(), device_id: 'whatsapp-web' }),
                            onload: function() { resolve(true); },
                            onerror: function() { resolve(false); }
                        });
                    } catch { resolve(false); }
                },
                onerror: function() { resolve(false); }
            });
        });
    }

    // ── Send reply in chat ──
    function sendReply(text) {
        try {
            const inputBox = document.querySelector('div[contenteditable="true"][data-tab="10"]');
            if (!inputBox) return;
            inputBox.focus();
            document.execCommand('insertText', false, text);
            // Trigger send button
            const sendBtn = document.querySelector('button[data-tab="11"]') || document.querySelector('span[data-icon="send"]');
            if (sendBtn) sendBtn.click();
        } catch(e) { console.log('Send error:', e); }
    }

    // ── Process a message ──
    async function processMessage(messageText, senderName, groupName) {
        if (!messageText || messageText.length < 5) return;
        if (processedMessages.has(messageText)) return;
        processedMessages.add(messageText);
        if (processedMessages.size > 500) processedMessages.clear();

        // Check if this is the right group
        if (!GROUP_KEYWORDS.some(g => groupName.toLowerCase().includes(g))) return;
        // Check keywords
        if (!MAINT_KEYWORDS.some(k => messageText.includes(k))) return;

        console.log('🔍 Analyzing: ' + messageText.substring(0, 50));

        const analysis = await analyzeText(messageText);
        if (!analysis.is) return;

        const record = {
            id: Date.now(),
            category: analysis.cat || 'عام',
            task: analysis.task || messageText.substring(0, 100),
            room: analysis.room || '',
            urgent: false,
            date: new Date().toISOString().split('T')[0],
            status: 'جديد',
            source: 'واتساب ويب',
            groupName: groupName,
            sender: senderName,
            originalText: messageText,
            createdAt: new Date().toISOString()
        };

        const saved = await saveRecord(record);
        if (saved) {
            const replyMsg = '✅ تم تسجيل الصيانة:\n🔧 ' + (analysis.cat || 'عام') + '\n📝 ' + (analysis.task || messageText.substring(0, 80)) + (analysis.room ? '\n📍 ' + analysis.room : '');
            sendReply(replyMsg);
            console.log('✅ Saved: ' + (analysis.task || ''));
            // Show notification
            showNotification('✅ تم تسجيل صيانة', analysis.cat + ': ' + (analysis.task || ''));
        }
    }

    // ── Show notification ──
    function showNotification(title, body) {
        try {
            if (Notification.permission === 'granted') {
                new Notification(title, { body: body, icon: 'https://web.whatsapp.com/favicon.ico' });
            }
        } catch(e) {}
    }

    // ── Start monitoring ──
    function startMonitoring() {
        console.log('🤖 LINAHSYSTEM monitor started!');
        console.log('👂 Listening to groups with: صيانة');
        showNotification('🤖 مراقب الصيانة', 'تم التشغيل — يقرا جروب الصيانة');

        // Request notification permission
        if (Notification.permission === 'default') Notification.requestPermission();

        // Monitor DOM for new messages
        setInterval(() => {
            try {
                const groupName = getCurrentGroupName();
                if (!groupName) return;

                // Find message elements
                const messages = document.querySelectorAll('div.message-in, div.message-out');
                messages.forEach((msgEl) => {
                    try {
                        // Check if it's from another person (not us)
                        if (msgEl.classList.contains('message-out')) return;

                        const textEl = msgEl.querySelector('span.selectable-text');
                        if (!textEl) return;

                        const fullText = textEl.textContent.trim();
                        if (!fullText) return;

                        // Get sender name
                        const nameEl = msgEl.querySelector('span[dir="auto"]');
                        const sender = nameEl ? nameEl.textContent.trim() : 'شخص';

                        processMessage(fullText, sender, groupName);
                    } catch(e) {}
                });
            } catch(e) {}
        }, 3000); // Check every 3 seconds
    }

    // Wait for WhatsApp to load
    let checkCount = 0;
    const waitInterval = setInterval(() => {
        checkCount++;
        if (document.querySelector('div[contenteditable="true"]')) {
            clearInterval(waitInterval);
            setTimeout(startMonitoring, 3000);
        }
        if (checkCount > 60) clearInterval(waitInterval); // 2 minutes max
    }, 2000);

    console.log('⏳ Waiting for WhatsApp Web to load...');
})();
