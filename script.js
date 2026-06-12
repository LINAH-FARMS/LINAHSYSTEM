function saAddMsg(t,r){var d=document.createElement('div');d.style.cssText='max-width:88%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.6;word-wrap:break-word;';d.style.background=r==='user'?'#e8f5e9':'#fff';d.style.alignSelf=r==='user'?'flex-end':'flex-start';d.style.borderBottomLeftRadius=r==='user'?'4px':'12px';d.style.borderBottomRightRadius=r==='user'?'12px':'4px';d.innerHTML=t;document.getElementById('sa-msgs').appendChild(d);d.scrollIntoView({behavior:'smooth',block:'end'});return d;}
function saSend(){var i=document.getElementById('sa-input'),t=i.value.trim();if(!t)return;i.value='';saAddMsg(t,'user');saHandle(t);}
var saLast=null;
function saHandle(t){
  var p=saParse(t);
  if(p&&(p.kb>0||p.cb>0||p.fl>0)){saLast=p;var h='<strong>✅ تم التحليل:</strong><br>';if(p.dt)h+='📅 '+p.dt+'<br>';if(p.kb>0)h+='🍞 مطبخ: '+p.kb+' رغيف<br>';if(p.kd>0)h+='🚚 تسليم: '+p.kd+'<br>';if(p.kr>0)h+='🔥 بالفرن: '+p.kr+'<br>';if(p.cb>0)h+='👷 مقاولين: '+p.cb+' رغيف<br>';h+='<br>صحيح? <button onclick="saConfirm()" style="padding:4px 12px;background:#1b5e20;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">✅ نعم</button>';saAddMsg(h,'bot');return;}
  saAskGemini(t);
}
function saAskGemini(t){var k=localStorage.getItem('sa_gemini_key');if(!k){k=prompt('🔑 أدخل مفتاح Gemini API:','');if(!k){saAddMsg('❌ لا يوجد مفتاح API.','bot');return;}localStorage.setItem('sa_gemini_key',k);}saAddMsg('⏳ جاري التفكير...','bot');fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='+k,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:'أنت مساعد إداري لنظام لينه فارمز أجب بالعامية المصرية: '+t}]}]})}).then(function(r){return r.json();}).then(function(d){try{var r=d.candidates[0].content.parts[0].text;saAddMsg(r,'bot');}catch(e){saAddMsg('❌ خطأ: '+(d.error&&d.error.message?d.error.message:JSON.stringify(d)),'bot');}}).catch(function(e){saAddMsg('❌ خطأ: '+e.message,'bot');});
}
function saConfirm(){var p=saLast;if(!p)return;var d=document.getElementById('bprod-date');if(d&&p.dt)d.value=p.dt;var c=document.getElementById('bprod-count');if(c)c.value=p.kb+p.cb;var g=document.getElementById('bprod-ing-ING001');if(g)g.value=p.fl;if(p.yeast>0){var y=document.getElementById('bprod-ing-ING002');if(y)y.value=p.yeast;}if(p.salt>0){var s=document.getElementById('bprod-ing-ING003');if(s)s.value=p.salt;}if(p.bran>0){var b=document.getElementById('bprod-ing-ING004');if(b)b.value=p.bran;}var n=[];if(p.kd>0)n.push('تسليم: '+p.kd);if(p.kr>0)n.push('باقي: '+p.kr);var nf=document.getElementById('bprod-notes');if(nf)nf.value=n.join(' | ');saLast=null;saAddMsg('✅ تم تعبئة النموذج!','bot');}
function saParse(t){
  var l=t.split(/\n/).filter(Boolean),dt='';
  for(var i=0;i<l.length;i++){var ds=l[i].match(/(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{2,4})/);if(ds){var d=('0'+ds[1]).slice(-2),m=('0'+ds[2]).slice(-2),y=ds[3];if(y.length===2)y='20'+y;dt=y+'-'+m+'-'+d;break;}}
  var si=t.indexOf('للمقاولين');if(si<0)si=t.indexOf('المقاولين');var kb=si>=0?t.substring(0,si):t,cb2=si>=0?t.substring(si):'';
  var kf=0,kbr=0,kd=0,kr=0;var kx=kb.match(/([\d.,]+)\s*كيلو\s*.?\s*دقيق\s*[=:]\s*(\d+)/);if(kx){kf=parseFloat(kx[1].replace(',','.'));kbr=parseInt(kx[2]);}
  var km=kb.match(/(?:تسليم|للمطبخ)\s*\d+/);if(km)kd=parseInt(km[0].match(/\d+/)[0]);
  var km2=kb.match(/(?:داخل|الفرن|متبقي|باقي)\s*\d+/);if(km2)kr=parseInt(km2[0].match(/\d+/)[0]);
  var cf=0,cbr=0;var cx=cb2.match(/([\d.,]+)\s*كيلو\s*.?\s*دقيق\s*[=:]\s*(\d+)/);if(cx){cf=parseFloat(cx[1].replace(',','.'));cbr=parseInt(cx[2]);}
  var yi=0,si2=0,bi=0;
  for(var j=0;j<l.length;j++){var ln=l[j];if(ln.indexOf('خميرة')>=0){var m=ln.match(/([\d.,]+)/);if(m&&!yi)yi=parseFloat(m[1].replace(',','.'));}if(ln.indexOf('ملح')>=0){var m=ln.match(/([\d.,]+)/);if(m&&!si2)si2=parseFloat(m[1].replace(',','.'));}if(ln.indexOf('ردة')>=0){var m=ln.match(/([\d.,]+)/);if(m&&!bi)bi=parseFloat(m[1].replace(',','.'));}}
  return{dt:dt,kb:kbr,kf:kf,kd:kd,kr:kr,cb:cbr,cf:cf,fl:kf+cf,yeast:yi,salt:si2,bran:bi};
}
