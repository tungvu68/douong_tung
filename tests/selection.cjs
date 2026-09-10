const assert=require('node:assert/strict');const {mkdtempSync,rmSync}=require('node:fs');const {tmpdir}=require('node:os');const {join}=require('node:path');const {execFileSync}=require('node:child_process');
const out=mkdtempSync(join(tmpdir(),'lunch-selection-'));
try{
 execFileSync(process.execPath,['node_modules/typescript/bin/tsc','lib/foods.ts','lib/case-mechanics.ts','--outDir',out,'--module','commonjs','--target','es2020','--skipLibCheck']);
 const {foods}=require(join(out,'foods.js'));const {createFoodSelector,priceRarity,TARGET_LUNCH_PRICE}=require(join(out,'case-mechanics.js'));
 assert.equal(TARGET_LUNCH_PRICE,50);foods.forEach(f=>assert.equal(f.rarity,priceRarity(f.price)));
 let seed=12345;const rng=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);const rows=[];
 for(const target of [30,35,50,75,100,150,180]){
  const s=createFoodSelector(foods,target),mass=f=>s.probabilities.get(f);
  assert.ok(Math.abs(s.expectedPrice-target)<1e-9);assert.ok(Math.abs([...s.probabilities.values()].reduce((a,b)=>a+b)-1)<1e-12);
  let spend=0;const counts=[0,0,0,0,0];for(let i=0;i<100000;i++){const f=s.choose(foods,rng);spend+=f.price;counts[f.rarity]++}
  assert.ok(Math.abs(spend/100000-target)<.7);
  const tiers=counts.map((_,t)=>foods.filter(f=>f.rarity===t).reduce((a,f)=>a+mass(f),0));tiers.forEach((p,t)=>assert.ok(Math.abs(p-counts[t]/100000)<.007));
  for(const pool of [foods,foods.filter(f=>f.veg)]){let cum=0;const total=pool.reduce((a,f)=>a+mass(f),0);for(const f of pool){assert.equal(s.choose(pool,()=>(cum+mass(f)/2)/total),f);cum+=mass(f)}assert.ok(Math.abs(s.meanFor(pool)-pool.reduce((a,f)=>a+f.price*mass(f),0)/total)<1e-9)}
  const near=foods.filter(f=>f.price>=target*.7&&f.price<=target*1.3).reduce((a,f)=>a+mass(f),0);
  if(target>=50&&target<=150)assert.ok(near>.65);
  rows.push({target,tiers:tiers.map(x=>+(x*100).toFixed(3)),near:+(near*100).toFixed(1),vegMean:+s.meanFor(foods.filter(f=>f.veg)).toFixed(1)});
 }
 // Monotone cumulative higher tiers over the full supported control range.
 let previous=[0,0,0,0];for(let m=30;m<=180;m++){const s=createFoodSelector(foods,m);const tails=[1,2,3,4].map(t=>foods.filter(f=>f.rarity>=t).reduce((a,f)=>a+s.probabilities.get(f),0));tails.forEach((x,i)=>assert.ok(x>=previous[i]-1e-12));previous=tails}
 // Catalog duplicates at an existing price must not alter price-group masses.
 for(const m of [50,150]){const a=createFoodSelector(foods,m),extra=[...foods,...Array.from({length:10},()=>({...foods[0]}))],b=createFoodSelector(extra,m);for(const price of new Set(foods.map(f=>f.price))){const sum=(items,s)=>items.filter(f=>f.price===price).reduce((v,f)=>v+s.probabilities.get(f),0);assert.ok(Math.abs(sum(foods,a)-sum(extra,b))<1e-12)}}
 const s=createFoodSelector(foods);assert.throws(()=>s.choose([]));assert.throws(()=>s.choose([{price:50,rarity:1}]));assert.throws(()=>s.choose(foods,()=>1));assert.throws(()=>createFoodSelector([],50));for(const m of [0,NaN,Infinity,24,261])assert.throws(()=>createFoodSelector(foods,m));
 const equal=[{price:50,rarity:0},{price:50,rarity:4}];assert.deepEqual([...createFoodSelector(equal).probabilities.values()],[.5,.5]);
 for(const m of [25,260]){const s=createFoodSelector(foods,m);assert.ok(Math.abs(s.expectedPrice-m)<1e-9);assert.equal(s.choose(foods,rng).price,m)}
 const veg=foods.filter(f=>f.veg),v=createFoodSelector(foods,150);assert.ok(Math.max(...veg.map(f=>v.probabilities.get(f)/veg.reduce((a,x)=>a+v.probabilities.get(x),0)))<.8);
 console.log(JSON.stringify(rows,null,2));console.log('PASS: means, spread, 700k draws, tier monotonicity, duplicate neutrality, vegetarian conditioning, edge cases');
}finally{rmSync(out,{recursive:true,force:true})}
