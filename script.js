function saNormalize(t){
  return t.replace(/نص\s*(باكو|كجم|كيلو|لتر)?/g,'0.5 $1')
          .replace(/ربع\s*(باكو|كجم|كيلو|لتر)?/g,'0.25 $1');
}
function saParse(t){
  t=saNormalize(t);
  var dt='';var ds=t.match(/(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{2,4})/);
  if(ds){var d=('0'+ds[1]).slice(-2),m=('0'+ds[2]).slice(-2),y=ds[3];if(y.length===2)y='20'+y;dt=y+'-'+m+'-'+d;}
  var si=t.indexOf('للمقاولين');if(si<0)si=t.indexOf('المقاولين');var farm=si>=0?t.substring(0,si):t;var ctr=si>=0?t.substring(si):'';
  var kx=farm.match(/([\d.]+)\s*كيلو\s*.?\s*دقيق\s*[=:]\s*(\d+)/);var kf=kx?parseFloat(kx[1]):0;var kb=kx?parseInt(kx[2]):0;
  var kdM=farm.match(/(?:تسليم|للمطبخ)\s*(\d+)/);var kd=kdM?parseInt(kdM[1]):0;
  var krM=farm.match(/(?:داخل|الفرن|متبقي|باقي)\s*(\d+)/);var kr=krM?parseInt(krM[1]):0;
  var yeast=0,salt=0,bran=0,waste=0;
  farm.split(/\n/).forEach(function(ln){
    if(/خميره/.test(ln)||/خميرة/.test(ln)){var m=ln.match(/([\d.]+)/);if(m)yeast+=parseFloat(m[1]);}
    if(/ملح/.test(ln)){var m=ln.match(/([\d.]+)/);if(m)salt+=parseFloat(m[1]);}
    if(/رده/.test(ln)||/ردة/.test(ln)){var m=ln.match(/([\d.]+)/);if(m)bran+=parseFloat(m[1]);}
    if(/هالك/.test(ln)){var m=ln.match(/([\d.]+)/);if(m)waste+=parseFloat(m[1]);}
  });
  var cx=ctr.match(/([\d.]+)\s*كيلو\s*.?\s*دقيق\s*[=:]\s*(\d+)/);var cf=cx?parseFloat(cx[1]):0;var cb=cx?parseInt(cx[2]):0;
  var cYeast=0,cSalt=0,cBran=0;
  ctr.split(/\n/).forEach(function(ln){
    if(/خميره/.test(ln)||/خميرة/.test(ln)){var m=ln.match(/([\d.]+)/);if(m)cYeast+=parseFloat(m[1]);}
    if(/ملح/.test(ln)){var m=ln.match(/([\d.]+)/);if(m)cSalt+=parseFloat(m[1]);}
    if(/رده/.test(ln)||/ردة/.test(ln)){var m=ln.match(/([\d.]+)/);if(m)cBran+=parseFloat(m[1]);}
  });
  return{dt:dt,kb:kb,kf:kf,kd:kd,kr:kr,yeast:yeast,salt:salt,bran:bran,waste:waste,cb:cb,cf:cf,cYeast:cYeast,cSalt:cSalt,cBran:cBran,fl:kf+cf};
}
function saAnalyze(){
  var inp=document.getElementById('sa-input');if(!inp)return;var txt=inp.value.trim();if(!txt)return;
  var p=saParse(txt);var res=document.getElementById('sa-result');if(!res)return;
  var rows=[];
  function addRow(label,id,val,step){
    rows.push('<span style="font-size:12px;color:#555;">'+label+'</span><span><input type="'+(id==='sa-ed-dt'?'date':'number')+'" id="'+id+'" value="'+val+'"'+(step?' step="'+step+'"':'')+' style="width:100%;padding:2px 6px;border:1px solid #ccc;border-radius:4px;font-size:12px;font-family:Cairo;"></span>');
  }
  addRow('📅 التاريخ','sa-ed-dt',p.dt);
  addRow('🍞 رغيف المزرعة','sa-ed-kb',p.kb);
  if(p.kd>0) addRow('🚚 تسليم مطبخ','sa-ed-kd',p.kd);
  if(p.kr>0) addRow('🔥 بالفرن','sa-ed-kr',p.kr);
  addRow('🌾 دقيق','sa-ed-fl',p.fl,'0.1');
  if(p.yeast>0) addRow('🧫 خميرة','sa-ed-yeast',p.yeast,'0.1');
  if(p.salt>0) addRow('🧂 ملح','sa-ed-salt',p.salt,'0.1');
  if(p.bran>0) addRow('🌾 ردة','sa-ed-bran',p.bran,'0.1');
  if(p.waste>0) addRow('❌ هالك','sa-ed-waste',p.waste,'0.1');
  if(p.cb>0) addRow('👷 رغيف مقاولين','sa-ed-cb',p.cb);
  if(p.cf>0) addRow('🌾 دقيق مقاولين','sa-ed-cf',p.cf,'0.1');
  if(p.cYeast>0) addRow('🧫 خميرة مقاولين','sa-ed-cyeast',p.cYeast,'0.1');
  if(p.cSalt>0) addRow('🧂 ملح مقاولين','sa-ed-csalt',p.cSalt,'0.1');
  if(p.cBran>0) addRow('🌾 ردة مقاولين','sa-ed-cbran',p.cBran,'0.1');
  var notes=[];if(p.kd>0)notes.push('تسليم: '+p.kd);if(p.kr>0)notes.push('باقي: '+p.kr);
  var h='<div style="background:#f8fdf8;padding:10px;border-radius:8px;border:1px solid #c8e6c9;font-size:13px;">';
  h+='<strong style="color:#1b5e20;">✅ تم التحليل — راجع القيم وعدلها:</strong>';
  h+='<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;margin-top:6px;">'+rows.join('')+'</div>';
  if(notes.length)h+='<div style="margin-top:4px;font-size:12px;color:#888;">📝 هتتحط في ملاحظات الإنتاج: '+notes.join(' | ')+'</div>';
  h+='<div style="margin-top:8px;display:flex;gap:6px;"><button onclick="saFill()" style="padding:6px 16px;background:#1b5e20;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-family:Cairo;">📋 تعبئة النموذج</button><button onclick="saClear()" style="padding:6px 16px;background:#757575;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-family:Cairo;">✕ مسح</button></div>';
  h+='</div>';res.innerHTML=h;
}
function saFill(){
  var g=function(id){return document.getElementById(id);};
  if(g('bprod-date')&&g('sa-ed-dt'))g('bprod-date').value=g('sa-ed-dt').value;
  if(g('bprod-count')&&g('sa-ed-kb'))g('bprod-count').value=parseInt(g('sa-ed-kb').value);
  if(g('bprod-ing-ING001')&&g('sa-ed-fl'))g('bprod-ing-ING001').value=parseFloat(g('sa-ed-fl').value);
  if(g('bprod-ing-ING002')&&g('sa-ed-yeast'))g('bprod-ing-ING002').value=parseFloat(g('sa-ed-yeast').value);
  if(g('bprod-ing-ING003')&&g('sa-ed-salt'))g('bprod-ing-ING003').value=parseFloat(g('sa-ed-salt').value);
  if(g('bprod-ing-ING004')&&g('sa-ed-bran'))g('bprod-ing-ING004').value=parseFloat(g('sa-ed-bran').value);
  var notes=[];
  if(g('sa-ed-kd')&&parseInt(g('sa-ed-kd').value)>0)notes.push('تسليم: '+parseInt(g('sa-ed-kd').value));
  if(g('sa-ed-kr')&&parseInt(g('sa-ed-kr').value)>0)notes.push('باقي: '+parseInt(g('sa-ed-kr').value));
  if(g('sa-ed-waste')&&parseFloat(g('sa-ed-waste').value)>0)notes.push('هالك: '+parseFloat(g('sa-ed-waste').value));
  if(g('bprod-notes'))g('bprod-notes').value=notes.join(' | ');
  var r=document.getElementById('sa-result');
  if(r)r.innerHTML='<div style="background:#e8f5e9;padding:8px 12px;border-radius:8px;color:#1b5e20;font-size:13px;font-weight:600;">✅ تم التعبئة! راجع القيم واحفظ.</div>';
  setTimeout(function(){if(document.getElementById('sa-result'))document.getElementById('sa-result').innerHTML='';},5000);
}
function saClear(){
  if(document.getElementById('sa-result'))document.getElementById('sa-result').innerHTML='';
  if(document.getElementById('sa-input'))document.getElementById('sa-input').value='';
}
