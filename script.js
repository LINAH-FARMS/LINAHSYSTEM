function saNorm(t){
  return t.replace(/نص\s*(باكو|كجم|كيلو|لتر)?/g,'0.5 $1').replace(/ربع\s*(باكو|كجم|كيلو|لتر)?/g,'0.25 $1');
}
function saGetQty(t,kw,def){
  var r=new RegExp('([\\d.]+)\\s*(?:كجم|كيلو|باكو|لتر|وحدة)?\\s*'+kw);var m=t.match(r);
  if(m)return parseFloat(m[1]);
  if(t.indexOf(kw)>=0)return def;
  return 0;
}
function saParse(t){
  t=saNorm(t);
  var dt='';var ds=t.match(/(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{2,4})/);
  if(ds){var d=('0'+ds[1]).slice(-2),m=('0'+ds[2]).slice(-2),y=ds[3];if(y.length===2)y='20'+y;dt=y+'-'+m+'-'+d;}
  if(!dt){var nd=new Date();dt=nd.getFullYear()+'-'+('0'+(nd.getMonth()+1)).slice(-2)+'-'+('0'+nd.getDate()).slice(-2);}
  var si=t.indexOf('للمقاولين');if(si<0)si=t.indexOf('المقاولين');var farm=si>=0?t.substring(0,si):t;var ctrPart=si>=0?t.substring(si):'';
  var kx=farm.match(/([\d.]+)\s*كيلو\s*.?\s*دقيق\s*[=:]\s*(\d+)/);var kf=kx?parseFloat(kx[1]):0;var kb=kx?parseInt(kx[2]):0;
  var kdM=farm.match(/(?:تسليم\s*المطبخ|تسليم|للمطبخ)\s*(\d+)/);var kd=kdM?parseInt(kdM[1]):0;
  var krM=farm.match(/(?:داخل\s*الفرن|الفرن|متبقي|باقي)\s*(\d+)/);var kr=krM?parseInt(krM[1]):0;
  var yeast=saGetQty(farm,'خميره',1)||saGetQty(farm,'خميرة',1);
  var salt=saGetQty(farm,'ملح',1);
  var bran=saGetQty(farm,'رده',0)||saGetQty(farm,'ردة',0);
  var waste=saGetQty(farm,'هالك',0);
  var diesel=saGetQty(farm,'سولار',0)||saGetQty(farm,'سولر',0);
  var cx=ctrPart.match(/([\d.]+)\s*كيلو\s*.?\s*دقيق\s*[=:]\s*(\d+)/);var cf=cx?parseFloat(cx[1]):0;var cb=cx?parseInt(cx[2]):0;
  var cYeast=saGetQty(ctrPart,'خميره',1)||saGetQty(ctrPart,'خميرة',1);
  var cSalt=saGetQty(ctrPart,'ملح',1);
  var cBran=saGetQty(ctrPart,'رده',0)||saGetQty(ctrPart,'ردة',0);
  var ctrNames=[];var noCtr=0;
  var ctrClean=ctrPart.replace(/[\d.]+\s*(?:كجم|كيلو|باكو|لتر)?\s*(?:خميره|خميرة|ملح|رده|ردة|سولار|دقيق)\s*(?:[=:]\s*\d+)?/g,'');
  var ctrRe=/([\u0600-\u06FF][\u0600-\u06FF\s.]+?)\s*(\d+)(?=\s|$)/g;var cm;
  while((cm=ctrRe.exec(ctrClean))!==null){
    var cn=cm[1].trim(),cc=parseInt(cm[2]);
    if(cc>0&&cc<(cb||99999)&&!/للمقاولين|وتم|استخدام/.test(cn)){ctrNames.push({name:cn,count:cc});noCtr+=cc;}
  }
  if(ctrNames.length&&noCtr<cb){ctrNames.push({name:'باقي',count:cb-noCtr});}
  return{dt:dt,kb:kb,kf:kf,kd:kd,kr:kr,yeast:yeast,salt:salt,bran:bran,waste:waste,diesel:diesel,cb:cb,cf:cf,cYeast:cYeast,cSalt:cSalt,cBran:cBran,fl:kf+cf,ctrNames:ctrNames};
}
function saAnalyze(){
  var inp=document.getElementById('sa-input');if(!inp)return;var txt=inp.value.trim();if(!txt)return;
  var p=saParse(txt);var res=document.getElementById('sa-result');if(!res)return;
  function row(label,id,val,step,unit){
    return '<span style="font-size:12px;color:#555;">'+label+'</span><span><input type="'+(id==='sa-ed-dt'?'date':'number')+'" id="'+id+'" value="'+val+'"'+(step?' step="'+step+'"':'')+' style="width:100%;padding:2px 6px;border:1px solid #ccc;border-radius:4px;font-size:12px;font-family:Cairo;">'+(unit||'')+'</span>';
  }
  var r=[];
  r.push(row('📅 التاريخ','sa-ed-dt',p.dt));
  r.push(row('🍞 إنتاج المزرعة','sa-ed-kb',p.kb));
  r.push(row('🌾 دقيق','sa-ed-fl',p.fl,'0.1',' كجم'));
  if(p.yeast>0)r.push(row('🧫 خميرة','sa-ed-yeast',p.yeast,'0.1',' كجم'));
  if(p.salt>0)r.push(row('🧂 ملح','sa-ed-salt',p.salt,'0.1',' كجم'));
  if(p.bran>0)r.push(row('🌾 ردة','sa-ed-bran',p.bran,'0.1',' كجم'));
  if(p.waste>0)r.push(row('❌ هالك','sa-ed-waste',p.waste,'0.1',' كجم'));
  var dieselVal=p.diesel||Math.round((p.kb+p.cb)*0.00979*100)/100;
  r.push(row('⛽ سولار','sa-ed-diesel',dieselVal,'1',' لتر'));
  var notes=[];if(p.kd>0)notes.push('تسليم مطبخ: '+p.kd);if(p.kr>0)notes.push('بالفرن احتياطي: '+p.kr);
  var h='<div style="background:#f8fdf8;padding:10px;border-radius:8px;border:1px solid #c8e6c9;font-size:13px;">';
  h+='<div style="display:flex;justify-content:space-between;"><strong style="color:#1b5e20;">✅ إنتاج المزرعة</strong>';
  if(p.cb>0)h+='<span style="color:#e65100;">👷 مقاولين: '+p.cb+' رغيف</span>';
  h+='</div><div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;margin-top:6px;">'+r.join('')+'</div>';
  if(notes.length)h+='<div style="margin-top:4px;font-size:12px;color:#888;">📝 ملاحظات: '+notes.join(' | ')+'</div>';
  if(p.ctrNames&&p.ctrNames.length){
    h+='<hr style="margin:6px 0;border:none;border-top:1px dashed #ccc;">';
    h+='<strong style="color:#e65100;">👷 المقاولين:</strong><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;margin-top:4px;">';
    p.ctrNames.forEach(function(c,i){
      h+='<span style="font-size:12px;color:#555;">'+(i+1)+'. '+c.name+'</span><span><input type="number" id="sa-ed-ctr-'+i+'" data-name="'+c.name+'" value="'+c.count+'" style="width:80px;padding:2px 6px;border:1px solid #ccc;border-radius:4px;font-size:12px;font-family:Cairo;"></span>';
    });
    h+='</div>';
  }
  h+='<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;"><button onclick="saFill()" style="padding:6px 16px;background:#1b5e20;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-family:Cairo;">📋 تعبئة + توريد مقاولين</button><button onclick="saClear()" style="padding:6px 16px;background:#757575;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-family:Cairo;">✕ مسح</button></div>';
  h+='</div>';res.innerHTML=h;
}
function saFill(){
  var g=function(id){return document.getElementById(id);};
  if(g('bprod-date')&&g('sa-ed-dt'))g('bprod-date').value=g('sa-ed-dt').value;
  if(g('bprod-count')&&g('sa-ed-kb'))g('bprod-count').value=parseInt(g('sa-ed-kb').value);
  var nFl=g('sa-ed-fl');if(nFl&&g('bprod-ing-ING001'))g('bprod-ing-ING001').value=parseFloat(nFl.value);
  var nY=g('sa-ed-yeast');if(nY&&g('bprod-ing-ING002'))g('bprod-ing-ING002').value=parseFloat(nY.value);
  var nS=g('sa-ed-salt');if(nS&&g('bprod-ing-ING003'))g('bprod-ing-ING003').value=parseFloat(nS.value);
  var nB=g('sa-ed-bran');if(nB&&g('bprod-ing-ING004'))g('bprod-ing-ING004').value=parseFloat(nB.value);
  var nD=g('sa-ed-diesel');if(nD&&g('bprod-ing-ING007')){
    var dv=parseFloat(nD.value);if(dv<=0||dv===33){
      var ttl=parseInt(g('sa-ed-kb').value)||0;var ctrInputs=document.querySelectorAll('[id^="sa-ed-ctr-"]');
      ctrInputs.forEach(function(x){ttl+=parseInt(x.value)||0;});
      if(ttl>0)dv=Math.round(ttl*0.00979*100)/100;
    }
    g('bprod-ing-ING007').value=dv;
  }
  var notes=[];
  g('sa-ed-kd')&&parseInt(g('sa-ed-kd').value)>0?notes.push('تسليم مطبخ: '+parseInt(g('sa-ed-kd').value)):0;
  g('sa-ed-kr')&&parseInt(g('sa-ed-kr').value)>0?notes.push('بالفرن احتياطي: '+parseInt(g('sa-ed-kr').value)):0;
  g('sa-ed-waste')&&parseFloat(g('sa-ed-waste').value)>0?notes.push('هالك: '+parseFloat(g('sa-ed-waste').value)):0;
  if(g('bprod-notes'))g('bprod-notes').value=notes.join(' | ');
  var i=0;var saved=0;var dt=g('sa-ed-dt')?g('sa-ed-dt').value:'';
  while(g('sa-ed-ctr-'+i)){
    var cnt=parseInt(g('sa-ed-ctr-'+i).value);if(cnt>0){
      var p=2;
      var nm='مقاول '+(i+1);var li=g('sa-ed-ctr-'+i);
      if(li&&li.getAttribute('data-name'))nm=li.getAttribute('data-name');
      if(typeof bakeryContractorSupplies!=='undefined'){
        var nrm=typeof normalizeDateStr==='function'?normalizeDateStr(dt):dt;
        var dup=typeof bakeryContractorSupplies.find==='function'?bakeryContractorSupplies.find(function(r){return r.date===nrm&&r.name===nm}):null;
        if(!dup&&typeof getBakeryNextId==='function'){
          bakeryContractorSupplies.push({id:getBakeryNextId('CTR',bakeryContractorSupplies),date:nrm,name:nm,count:cnt,price:p,paid:0,prodCost:0,revenue:cnt*p,profit:cnt*p,responsible:'',notes:'',ingredients:{}});saved++;
        }
      }
    }i++;
  }
  if(saved>0&&typeof syncStorage==='function')syncStorage();
  if(typeof renderBakeryContractorSupplies==='function')renderBakeryContractorSupplies();
  if(typeof updateBakeryStats==='function')updateBakeryStats();
  if(typeof updateBreadSupplyStats==='function')updateBreadSupplyStats();
  var msg='✅ تم تعبئة نموذج الإنتاج!';
  if(saved>0)msg+='<br>👷 تم إضافة '+saved+' توريد مقاولين (راجع تبويب التوريد).';
  msg+='<br><span style="font-size:12px;color:#888;">⚠️ الخامات بتتخصم عند الحفظ من نموذج الإنتاج.</span>';
  var ra=document.getElementById('sa-result');if(ra)ra.innerHTML='<div style="background:#e8f5e9;padding:8px 12px;border-radius:8px;color:#1b5e20;font-size:13px;font-weight:600;">'+msg+'</div>';
  setTimeout(function(){if(document.getElementById('sa-result'))document.getElementById('sa-result').innerHTML='';},6000);
}
function saClear(){
  var r=document.getElementById('sa-result');if(r)r.innerHTML='';
  var i=document.getElementById('sa-input');if(i)i.value='';
}
