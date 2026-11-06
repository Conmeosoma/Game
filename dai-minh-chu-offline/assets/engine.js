(function (root) {
  'use strict';
  const D = root.DMC_DATA;
  const stages = D.GiangHo.flatMap((c, chapter) => c.NhiemVuList.map((s, mission) => ({...s, chapter, mission})));
  const heroes = Object.keys(D.NhanVat).filter(k => k.startsWith('NV_') && D.NhanVat[k].MauCoSo > 10);
  const ranks = ['', 'S', 'A', 'B', 'C'];
  const fail = message => { throw new Error(message); };
  const own = (map, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key);
  const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
  const choose = (a, rng) => a[Math.min(a.length - 1, Math.floor(rng() * a.length))];
  function fresh(now = Date.now()) {
    const starters = ['NV_LenhHoXung','NV_NhacLinhSan','NV_LamBinhChi'].filter(k => D.NhanVat[k]);
    while (starters.length < 3) { const k=heroes.find(x => !starters.includes(x)); starters.push(k); }
    const s = {version:1, name:'Vô Danh phái', silver:30000, gold:1000, energy:50, energyAt:now,
      xp:0, roster:{}, shards:{}, formation:[...starters], equipment:[], skills:[], cleared:{},
      next:0, wins:0, summons:0, daily:'', speed:1, sound:false, battle:null, serial:0};
    starters.forEach(k => {s.roster[k] = {level:1, xp:0, asc:0, gear:{}, skill:null};});
    ['VK_MieuDao', 'AG_BoY', 'TS_ThanhLongTrac'].filter(k=>D.TrangBi[k]).forEach(code=>s.equipment.push({id:++s.serial, code, level:1}));
    if (!s.equipment.length) s.equipment.push({id:++s.serial, code:Object.keys(D.TrangBi)[0], level:1});
    s.skills = ['VC_VoDanhKiemPhap','VC_VoDanhDaoPhap'].filter(k=>D.VoCong[k]);
    return s;
  }
  function validate(raw) {
    if (!raw || raw.version !== 1 || typeof raw.name !== 'string' || raw.name.length > 40) fail('Bản lưu không hợp lệ hoặc khác phiên bản.');
    for (const k of ['silver','gold','xp','wins','summons','serial']) if(!integer(raw[k],0,1e12)) fail('Dữ liệu '+k+' không hợp lệ.');
    if (!integer(raw.next,0,stages.length) || !integer(raw.energy,0,50) || !Number.isFinite(raw.energyAt)) fail('Tiến trình không hợp lệ.');
    if (![1,2,4].includes(raw.speed) || typeof raw.sound!=='boolean' || typeof raw.daily!=='string' || raw.daily.length>20) fail('Thiết lập không hợp lệ.');
    if (!raw.roster || Array.isArray(raw.roster) || Object.keys(raw.roster).length > heroes.length) fail('Danh sách đệ tử không hợp lệ.');
    for (const [k,h] of Object.entries(raw.roster)) {
      if (!heroes.includes(k) || !h || !integer(h.level,1,150) || !integer(h.xp,0,1e9) || !integer(h.asc,0,10) || !h.gear || (h.skill!==null && !own(D.VoCong,h.skill))) fail('Thông tin đệ tử không hợp lệ.');
    }
    if (!Array.isArray(raw.formation) || raw.formation.length<1 || raw.formation.length>8 || new Set(raw.formation).size!==raw.formation.length || raw.formation.some(k=>!raw.roster[k])) fail('Đội hình không hợp lệ.');
    if (!Array.isArray(raw.equipment) || raw.equipment.length>10000 || raw.equipment.some(g=>!g || !own(D.TrangBi,g.code) || !integer(g.id,1,1e12) || !integer(g.level,1,150))) fail('Trang bị không hợp lệ.');
    if(new Set(raw.equipment.map(g=>g.id)).size!==raw.equipment.length || raw.equipment.some(g=>g.id>raw.serial)) fail('Mã trang bị không hợp lệ.');
    const assigned=[];
    for(const h of Object.values(raw.roster)) for(const [slot,id] of Object.entries(h.gear)) {
      const g=raw.equipment.find(x=>x.id===id);
      if(!['VK','AG','TS'].includes(slot) || !g || !g.code.startsWith(slot+'_') || assigned.includes(id)) fail('Trang bị trùng hoặc sai vị trí.');
      assigned.push(id);
    }
    if(!Array.isArray(raw.skills) || raw.skills.some(k=>!own(D.VoCong,k)) || new Set(raw.skills).size!==raw.skills.length) fail('Bí kíp không hợp lệ.');
    if(Object.values(raw.roster).some(h=>h.skill && !raw.skills.includes(h.skill))) fail('Bí kíp chưa sở hữu.');
    if(!raw.shards || Object.entries(raw.shards).some(([k,v])=>!heroes.includes(k)||!integer(v,0,1e9))) fail('Hồn phách không hợp lệ.');
    if(!raw.cleared || Object.keys(raw.cleared).some(k=>!/^\d+$/.test(k)||+k>=stages.length||raw.cleared[k]!==true)) fail('Màn đã vượt không hợp lệ.');
    if(raw.next>0 && !raw.cleared[raw.next-1]) fail('Tiến trình mở khóa không hợp lệ.');
    if(raw.battle !== null) {
      const b=raw.battle;
      if(!b || typeof b.id!=='string' || !integer(b.stage,0,stages.length-1) || b.stage>raw.next || !Array.isArray(b.initial) || b.initial.length<2 || b.initial.length>16 || !Array.isArray(b.events) || b.events.length>1000 || typeof b.win!=='boolean') fail('Trận đang chơi không hợp lệ.');
      const ids=new Set();
      for(const f of b.initial) {if(!f || typeof f.uid!=='string' || !/^[pe][0-7]$/.test(f.uid) || ids.has(f.uid) || !own(D.NhanVat,f.code) || ![0,1].includes(f.side) || !Number.isFinite(f.maxHp) || f.maxHp<1 || !Number.isFinite(f.hp) || f.hp<0 || f.hp>f.maxHp) fail('Đấu sĩ không hợp lệ.'); ids.add(f.uid);}
      for(const e of b.events) if(!e || !ids.has(e.actor) || !Array.isArray(e.targets) || e.targets.some(t=>!ids.has(t.uid)||!Number.isFinite(t.hp)||t.hp<0||!Number.isFinite(t.amount))) fail('Diễn biến trận không hợp lệ.');
    }
    return raw;
  }
  function recover(s, now=Date.now()) {
    if(now < s.energyAt) { s.energyAt=now; return; }
    const ticks=Math.floor((now-s.energyAt)/300000);
    if(s.energy>=50) s.energyAt=now;
    else if(ticks>0) {s.energy=Math.min(50,s.energy+ticks); s.energyAt += ticks*300000;}
  }
  function idle(s) {if(s.battle) fail('Hãy hoàn tất trận đang chơi trước.');}
  function spend(s, currency, amount) {if(s[currency]<amount) fail(currency==='gold'?'Không đủ vàng.':'Không đủ bạc.');s[currency]-=amount;}
  function level(s) {return 1+Math.floor(Math.sqrt(s.xp/50));}
  function stats(s, code, team=s.formation) {
    const h=s.roster[code], d=D.NhanVat[code];
    const out={Mau:d.MauCoSo+d.MauTangTruong*(h.level-1), Cong:d.CongCoSo+d.CongTangTruong*(h.level-1), Thu:d.ThuCoSo+d.ThuTangTruong*(h.level-1), NoiLuc:d.NoiLucCoSo+d.NoiLucTangTruong*(h.level-1)};
    for(const id of Object.values(h.gear)) {
      const g=s.equipment.find(x=>x.id===id);if(!g)continue;
      const gd=D.TrangBi[g.code], stat=g.code.startsWith('VK_')?'Cong':g.code.startsWith('AG_')?'Thu':'Mau';
      out[stat]+=gd.CoSo+gd.TangTruong*(g.level-1);
    }
    const bonus={Mau:0,Cong:0,Thu:0,NoiLuc:0};
    for(const bond of d.DuyenPhan || []) {
      let active=false;
      if(bond.LoaiDuyenPhanStr==='CungDoi') active=bond.DoiTuong.every(k=>team.includes(k));
      if(bond.LoaiDuyenPhanStr==='TrangBiDo') active=bond.DoiTuong.every(k=>Object.values(h.gear).some(id=>s.equipment.find(g=>g.id===id)?.code===k));
      if(bond.LoaiDuyenPhanStr==='TrangBiVoCong') active=bond.DoiTuong.every(k=>h.skill===k || d.VoCongMacDinh===k);
      if(active && bond.LoaiPhuTroStr in bonus) bonus[bond.LoaiPhuTroStr]+=bond.HeSo;
    }
    const passive=D.VoCong[h.skill];
    if(passive?.LoaiStr==='PhuTro' && passive.LoaiPhuTroStr in bonus) bonus[passive.LoaiPhuTroStr]+=passive.CoSo;
    for(const k of Object.keys(out))out[k]=Math.max(1,Math.round(out[k]*(1+h.asc*0.12)*(1+bonus[k]/100)));
    return out;
  }
  function power(s) {return s.formation.reduce((n,k)=>{const x=stats(s,k);return n+x.Mau+x.Cong*3+x.Thu*2+x.NoiLuc;},0);}
  function train(s,code) {
    idle(s);const h=s.roster[code];if(!h)fail('Chưa có đệ tử này.');
    if(h.level>=150)fail('Đã đạt cấp tối đa.');
    spend(s,'silver',h.level*180);h.level++;
  }
  function ascend(s,code) {
    idle(s);const h=s.roster[code];if(!h)fail('Chưa có đệ tử này.');
    if(h.asc>=10)fail('Đã đột phá tối đa.');
    const cost=3*(h.asc+1);if((s.shards[code]||0)<cost)fail('Cần '+cost+' hồn phách nhân vật này.');
    s.shards[code]-=cost;h.asc++;
  }
  function toggle(s,code) {
    idle(s);if(!s.roster[code])fail('Chưa có đệ tử này.');
    const i=s.formation.indexOf(code);
    if(i>=0) {if(s.formation.length===1)fail('Cần ít nhất một đệ tử xuất trận.');s.formation.splice(i,1);}
    else {if(s.formation.length>=8)fail('Đội hình đã đủ 8 người.');s.formation.push(code);}
  }
  function swap(s,a,b) {idle(s);if(!integer(a,0,s.formation.length-1)||!integer(b,0,s.formation.length-1))fail('Vị trí không hợp lệ.');[s.formation[a],s.formation[b]]=[s.formation[b],s.formation[a]];}
  function summon(s,mode=3,count=1,rng=Math.random) {
    idle(s);if(![1,2,3].includes(mode)||![1,10].includes(count))fail('Lựa chọn chiêu mộ không hợp lệ.');
    const price=D.Other['LayNhanVat'+mode+'_Gia']*count;
    spend(s,'gold',price);
    const results=[];
    for(let i=0;i<count;i++) {
      const r=rng()*100;let rank=4,acc=0;
      for(const h of [1,2,3,4]) {acc+=D.Other['LayNhanVat'+mode+'_TiLeHang'+h]||0;if(r<acc){rank=h;break;}}
      const pool=heroes.filter(k=>D.NhanVat[k].Hang===rank);
      const code=choose(pool.length?pool:heroes,rng), duplicate=!!s.roster[code];
      if(duplicate)s.shards[code]=(s.shards[code]||0)+1;
      else s.roster[code]={level:1,xp:0,asc:0,gear:{},skill:null};
      results.push({code,duplicate});s.summons++;
    }
    return results;
  }
  function equip(s,code,id) {
    idle(s);const h=s.roster[code],g=s.equipment.find(x=>x.id===id);if(!h||!g)fail('Không tìm thấy trang bị.');
    const slot=g.code.slice(0,2);if(!['VK','AG','TS'].includes(slot))fail('Chưa hỗ trợ loại trang bị này.');
    for(const hero of Object.values(s.roster))if(hero.gear[slot]===id)delete hero.gear[slot];
    h.gear[slot]=id;
  }
  function forge(s,id) {idle(s);const g=s.equipment.find(x=>x.id===id);if(!g)fail('Không có trang bị.');if(g.level>=150)fail('Đã đạt cấp tối đa.');spend(s,'silver',g.level*120);g.level++;}
  function learn(s,code,skill) {idle(s);if(!s.roster[code] || (skill!==null&&!s.skills.includes(skill)))fail('Chưa có bí kíp.');s.roster[code].skill=skill;}
  function daily(s,now=Date.now()) {
    idle(s);const date=new Date(now),stamp=date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate();
    if(s.daily===stamp)fail('Hôm nay đã nhận quà.');
    s.daily=stamp;s.gold+=300;s.silver+=5000;s.energy=Math.min(50,s.energy+20);return stamp;
  }
  function buy(s,type) {idle(s);if(type==='energy'){if(s.energy>=50)fail('Thể lực đã đầy.');spend(s,'gold',30);s.energy=Math.min(50,s.energy+20);}else if(type==='silver'){spend(s,'gold',50);s.silver+=10000;}else fail('Vật phẩm không hợp lệ.');}
  function buildBattle(s,index,rng=Math.random) {
    idle(s);recover(s);if(!integer(index,0,stages.length-1)||index>s.next)fail('Chưa mở nhiệm vụ này.');
    if(s.energy<1)fail('Hết thể lực. Mỗi 5 phút hồi 1 điểm.');
    const stage=stages[index];
    const team=s.formation.map((code,i)=>{const x=stats(s,code);return {uid:'p'+i,code,side:0,pos:i,hp:x.Mau,maxHp:x.Mau,atk:x.Cong,def:x.Thu,sp:x.NoiLuc,level:s.roster[code].level,skill:s.roster[code].skill&&D.VoCong[s.roster[code].skill]?.LoaiStr!=='PhuTro'?s.roster[code].skill:D.NhanVat[code].VoCongMacDinh};});
    const enemies=(stage.DoiHinh || []).slice(0,8).map((n,i)=>({uid:'e'+i,code:n.NhanVatCode,side:1,pos:i,hp:Math.max(1,n.Mau||50),maxHp:Math.max(1,n.Mau||50),atk:n.Cong||20,def:n.Thu||10,sp:n.NoiLuc||20,level:stage.CapDoDeNghi||1,skill:n.VoCong1Code}));
    if(!enemies.length)fail('Nhiệm vụ chưa có cấu hình đối thủ.');
    const initial=JSON.parse(JSON.stringify([...enemies,...team])),fighters=[...team,...enemies],events=[];
    for(let round=1;round<=30;round++) {
      for(let pos=0;pos<8;pos++)for(const side of [0,1]) {
        if(!fighters.some(f=>f.side===0&&f.hp>0)||!fighters.some(f=>f.side===1&&f.hp>0))break;
        const actor=fighters.find(f=>f.side===side&&f.pos===pos&&f.hp>0);if(!actor)continue;
        const opponents=fighters.filter(f=>f.side!==side&&f.hp>0),skill=D.VoCong[actor.skill];
        const cast=skill && skill.LoaiStr!=='PhuTro' && rng()*100<(skill.XacSuatRaDon||25);
        const targets=cast&&skill.LoaiStr==='DaThe'?opponents:[opponents.find(f=>f.pos===pos)||opponents[0]];
        const critical=rng()<0.08, outcomes=[];
        for(const target of targets) {
          const boost=cast?1.25+Math.min(1,(skill.CoSo||10)/150):1;
          const amount=Math.max(1,Math.round(actor.atk*(100/(100+target.def))*boost*(targets.length>1?0.7:1)*(critical?1.5:1)*(0.9+rng()*0.2)));
          const dealt=Math.min(target.hp,amount);target.hp=Math.max(0,target.hp-amount);
          outcomes.push({uid:target.uid,hp:target.hp,amount:dealt});
        }
        events.push({round,actor:actor.uid,targets:outcomes,skill:cast?skill.TenHienThi:'Thường công',critical});
      }
      if(!team.some(f=>f.hp>0)||!enemies.some(f=>f.hp>0))break;
    }
    s.energy--;
    s.battle={id:String(Date.now())+'-'+(++s.serial),stage:index,initial,events,win:team.some(f=>f.hp>0)&&!enemies.some(f=>f.hp>0)};
    return s.battle;
  }
  function rewards(s,index,rng=Math.random) {
    const stage=stages[index],first=!s.cleared[index];
    const result={silver:Math.max(20,stage.BacThuong||35),xp:Math.max(5,stage.ExpThuong||8),gold:first?30:0,drops:[]};
    s.silver+=result.silver;s.gold+=result.gold;s.xp+=result.xp;s.wins++;s.cleared[index]=true;
    if(index===s.next)s.next++;
    for(const code of s.formation) {
      const h=s.roster[code];h.xp+=result.xp;
      while(h.level<150&&h.xp>=h.level*40){h.xp-=h.level*40;h.level++;}
    }
    for(const drop of stage.PhanThuong||[]) {
      const code=drop.PhanThuongCode;if(rng()*100>=(drop.TiLe||0))continue;
      if(D.TrangBi[code]){s.equipment.push({id:++s.serial,code,level:1});result.drops.push(code);}
      else if(D.VoCong[code]&&!s.skills.includes(code)){s.skills.push(code);result.drops.push(code);}
      else if(heroes.includes(code)){if(s.roster[code])s.shards[code]=(s.shards[code]||0)+1;else s.roster[code]={level:1,xp:0,asc:0,gear:{},skill:null};result.drops.push(code);}
    }
    return result;
  }
  function settle(s,id,rng=Math.random) {
    if(!s.battle || s.battle.id!==id)fail('Trận này đã kết thúc.');
    const b=s.battle;s.battle=null;
    return {win:b.win,...(b.win?rewards(s,b.stage,rng):{silver:0,xp:0,gold:0,drops:[]})};
  }
  function sweep(s,index,count=1,rng=Math.random) {
    idle(s);recover(s);if(!integer(index,0,stages.length-1)||!s.cleared[index])fail('Cần thắng nhiệm vụ trước khi càn quét.');
    if(![1,5].includes(count))fail('Số lượt không hợp lệ.');if(s.energy<count)fail('Không đủ thể lực.');
    s.energy-=count;const out={silver:0,xp:0,gold:0,drops:[]};for(let i=0;i<count;i++){const r=rewards(s,index,rng);out.silver+=r.silver;out.xp+=r.xp;out.gold+=r.gold;out.drops.push(...r.drops);}return out;
  }
  const api={data:D,stages,heroes,ranks,fresh,validate,recover,level,stats,power,train,ascend,toggle,swap,summon,equip,forge,learn,daily,buy,buildBattle,settle,sweep};
  root.DMC=api;
  if(typeof module!=='undefined')module.exports=api;
})(globalThis);
