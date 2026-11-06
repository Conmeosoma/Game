'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
require('../assets/data.js');
const G=require('../assets/engine.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
test('reference content covers every chapter and stage',()=>{
  assert.equal(Object.keys(G.data.NhanVat).length,333);assert.equal(G.stages.length,1405);
  assert.equal(G.data.GiangHo.length,92);
  for(const m of G.stages){assert.ok(Array.isArray(m.DoiHinh)&&m.DoiHinh.length>0,m.TenHienThi);for(const f of m.DoiHinh)assert.ok(f.Mau>0&&f.Cong>0,m.TenHienThi);}
});
test('fresh save roundtrips and corruption is rejected',()=>{
  const s=G.fresh();assert.deepEqual(G.validate(clone(s)),s);
  for(const mutate of [x=>x.gold=-1,x=>x.next=100,x=>x.formation.push(x.formation[0]),x=>x.roster[x.formation[0]].level=1000,x=>x.skills.push('missing'),x=>x.skills.push('__proto__')]){
    const invalid=clone(s);mutate(invalid);assert.throws(()=>G.validate(invalid));
  }
});
test('recovery respects cap, interval and backward clock',()=>{
  const s=G.fresh(1000000);s.energy=10;G.recover(s,1900000);assert.equal(s.energy,13);
  G.recover(s,1900001);assert.equal(s.energy,13);G.recover(s,1000000000);assert.equal(s.energy,50);
  G.recover(s,1);assert.equal(s.energy,50);assert.equal(s.energyAt,1);
});
test('summoning uses currency, probability tiers and shards',()=>{
  const s=G.fresh();s.gold=3000;const r=G.summon(s,3,10,seeded(12));
  assert.equal(s.gold,0);assert.equal(r.length,10);assert.equal(s.summons,10);
  for(const x of r)assert.ok([1,2].includes(G.data.NhanVat[x.code].Hang));
  assert.throws(()=>G.summon(s,3,1));assert.equal(s.summons,10);
  s.gold=600;const a=G.summon(s,3,1,()=>0),b=G.summon(s,3,1,()=>0);
  assert.equal(a[0].code,b[0].code);assert.equal(b[0].duplicate,true);assert.ok(s.shards[b[0].code]>=1);
  G.validate(s);
});
test('equipment transfers uniquely and improves stats',()=>{
  const s=G.fresh(),[a,b]=s.formation,g=s.equipment[0],before=G.stats(s,a).Cong;
  G.equip(s,a,g.id);assert.ok(G.stats(s,a).Cong>before);G.equip(s,b,g.id);
  assert.equal(s.roster[a].gear.VK,undefined);assert.equal(s.roster[b].gear.VK,g.id);
  const silver=s.silver;G.forge(s,g.id);assert.equal(g.level,2);assert.ok(s.silver<silver);G.validate(s);
});
test('formation cannot become empty or exceed eight',()=>{
  const s=G.fresh();G.toggle(s,s.formation[2]);G.toggle(s,s.formation[1]);assert.throws(()=>G.toggle(s,s.formation[0]));
  s.gold=100000;G.summon(s,3,10,seeded(6));for(const k of Object.keys(s.roster))if(!s.formation.includes(k)&&s.formation.length<8)G.toggle(s,k);
  assert.equal(s.formation.length,8);const extra=Object.keys(s.roster).find(k=>!s.formation.includes(k));if(extra)assert.throws(()=>G.toggle(s,extra));G.validate(s);
});
test('victory settles once, survives serialization, unlocks next stage',()=>{
  let s=G.fresh(),rng=seeded(99),b=G.buildBattle(s,0,rng);assert.equal(s.energy,49);assert.equal(b.win,true);
  assert.throws(()=>G.train(s,s.formation[0]));assert.throws(()=>G.buildBattle(s,0));
  s=G.validate(clone(s));const gold=s.gold,first=G.settle(s,b.id,rng);assert.equal(first.win,true);assert.equal(s.gold,gold+30);assert.equal(s.next,1);
  const malformed=clone(b);malformed.initial[0].uid='p0" onclick="alert(1)';const bad=clone(s);bad.battle=malformed;assert.throws(()=>G.validate(bad));
  assert.throws(()=>G.settle(s,b.id));const replay=G.buildBattle(s,0,rng);G.settle(s,replay.id,rng);assert.equal(s.gold,gold+30);G.validate(s);
});
test('locked missions, repeat farming and defeat cannot advance improperly',()=>{
  const s=G.fresh();assert.throws(()=>G.buildBattle(s,1));assert.throws(()=>G.sweep(s,0));
  const b=G.buildBattle(s,0,seeded(2));G.settle(s,b.id);const energy=s.energy,win=s.wins;
  G.sweep(s,0,5);assert.equal(s.energy,energy-5);assert.equal(s.wins,win+5);assert.equal(s.next,1);
  s.energy=0;assert.throws(()=>G.sweep(s,0));
});
test('daily claim is not repeatable on same day, spending cannot go negative',()=>{
  const s=G.fresh(),date=new Date(2026,10,6,12).getTime();G.daily(s,date);const gold=s.gold;
  assert.throws(()=>G.daily(s,date));assert.equal(s.gold,gold);s.silver=0;assert.throws(()=>G.train(s,s.formation[0]));assert.equal(s.roster[s.formation[0]].level,1);
});
test('combat terminates with finite HP and bounded events on sampled later stages',()=>{
  for(const n of [0,15,90,300,700,1404]){
    const s=G.fresh();s.next=n;s.cleared[n-1]=true;for(const h of Object.values(s.roster))h.level=100;
    const b=G.buildBattle(s,n,seeded(n+1));assert.ok(b.events.length>0&&b.events.length<=480);
    const max=new Map(b.initial.map(f=>[f.uid,f.maxHp]));
    for(const e of b.events)for(const t of e.targets)assert.ok(Number.isFinite(t.hp)&&t.hp>=0&&t.hp<=max.get(t.uid));
    const before=s.next,result=G.settle(s,b.id);if(!result.win)assert.equal(s.next,before);
  }
});
