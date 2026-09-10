'use client';
import { createSpinProfile, spinProgress, createFoodSelector, stopFraction } from '@/lib/case-mechanics';
import { foods, type Food } from '@/lib/foods';
import { useGlobalSpinCount } from '@/hooks/use-global-spin-count';
import { CaseAudio } from '@/lib/case-audio';
import { flushSync } from 'react-dom';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, AudioLines, Volume2, VolumeX, Sparkles, CupSoda, Leaf } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';


const tiers=['QUỐC DÂN','HIẾM','CỰC PHẨM','TỐI MẬT','★ ĐẶC BIỆT'];
const colors=['#4b69ff','#8847ff','#d32ce6','#eb4b4b','#e4ae39'];
function FoodImage({food}:{food:Food}){
 const common=food.image>=120,lunch=food.image>=72&&!common,expanded=food.image>=36;
 const index=common?(food.image-120)%12:lunch?(food.image-72)%12:expanded?(food.image-36)%12:food.image%4;
 const atlas=common?`food-common-${Math.floor((food.image-120)/12)}`:lunch?`food-lunch-${Math.floor((food.image-72)/12)}`:expanded?`food-expanded-${Math.floor((food.image-36)/12)}`:`food-hd-${Math.floor(food.image/4)}`;
 return <div role="img" aria-label={food.name} className="food-image" style={{clipPath:common?"inset(0 0 4% 0)":lunch?"inset(0 0 7% 0)":undefined,backgroundImage:`url(${basePath}/${atlas}.webp)`,backgroundSize:expanded?'400% 300%':'200% 200%',backgroundPosition:expanded?`${index%4/3*100}% ${(common?[0,50,100]:[0,46,92])[Math.floor(index/4)]}%`:`${index%2*100}% ${Math.floor(index/2)*100}%`}}/>
}
function MysteryArt(){return <div className="mystery-art" role="img" aria-label="Đồ uống bí ẩn hạng vàng">
 <div className="mystery-rays"/>
 <svg className="mystery-emblem" viewBox="0 0 240 150" aria-hidden="true">
  <path className="gold-orbit" d="M120 5 174 27 193 75 174 123 120 145 66 123 47 75 66 27Z"/>
  <path fill="#b27a16" d="m120 10 16 38 44-18-18 38 55 7-55 14 18 34-44-16-16 33-16-33-44 16 18-34-55-14 55-7-18-38 44 18Z"/>
  <path fill="#ffe59a" d="m120 18 13 41 38-21-23 35 49 2-49 10 23 31-38-18-13 34-13-34-38 18 23-31-49-10 49-2-23-35 38 21Z"/>
  <path fill="#372414" stroke="#eac366" strokeWidth="2" d="m120 34 35 20 0 42-35 20-35-20V54Z"/>
  <path fill="#fff3ba" d="M104 61c0-22 36-24 36-2 0 10-12 13-13 20v4h-13v-6c0-9 12-12 12-18 0-8-11-7-11 2zm10 28h13v13h-13z"/>
  <path fill="#fff5ce" d="m34 29 3 7 8 2-8 3-3 8-2-8-8-3 8-2zm164 66 3 9 10 2-10 3-3 10-3-10-9-3 9-2zM186 19l3 3-3 3-3-3zM52 117l3 3-3 3-3-3z"/>
 </svg>
 <div className="mystery-sheen"/>
</div>}
const Card=memo(function Card({food,small=false,slot}:{food:Food;small?:boolean;slot?:number}){const mystery=!small&&food.rarity===4;return <div className={`food-card ${small?'small':''} ${mystery?'mystery-card':''}`} data-slot-id={slot} data-food-id={food.image} style={{'--rarity':colors[food.rarity],...(slot===undefined?{}:{position:'absolute',left:slot*254})} as React.CSSProperties}><span className="tier">{tiers[food.rarity]}</span>{mystery?<MysteryArt/>:<FoodImage food={food}/>}<div className="card-copy"><strong>{mystery?'★ ĐỒ UỐNG BÍ ẨN':food.name}</strong><span>{small?`~${food.price}.000đ`:food.sub}</span></div></div>});

export default function Home(){
 const {count:globalSpins,enabled:counterEnabled,recordSpin}=useGlobalSpinCount();
 const [budget,setBudget]=useState('50'),[custom,setCustom]=useState('50'),[veg,setVeg]=useState(false),[sound,setSound]=useState(true),[spinning,setSpinning]=useState(false),[result,setResult]=useState<Food|null>(null),[revealed,setRevealed]=useState(false);
 const [reel,setReel]=useState(()=>foods.slice(0,12).map((food,id)=>({food,id}))),[moving,setMoving]=useState(false);
 const busy=useRef(false),viewport=useRef<HTMLDivElement>(null);
 useEffect(()=>{const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:unknown)=>void}}).modelContext;if(!context)return;const lifecycle=new AbortController();try{context.registerTool({name:'list_drink_items',description:'Read all drink options with approximate prices and dairy-free status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object');return foods.map(({name,price,veg})=>({name,approximatePriceVND:price*1000,dairyFree:!!veg}))}},{signal:lifecycle.signal})}catch{}return ()=>lifecycle.abort()},[]);
 const target=budget==='custom'?Number(custom):Number(budget);
 const validTarget=Number.isInteger(target)&&target>=30&&target<=180;
 const lunchSelector=useMemo(()=>createFoodSelector(foods,validTarget?target:50),[target,validTarget]);
 const eligible=useMemo(()=>foods.filter(f=>!veg||f.veg),[veg]);
 const filteredMean=lunchSelector.meanFor(eligible);

 const audio=useRef<CaseAudio|null>(null);
 useEffect(()=>{
  const engine=new CaseAudio(basePath);audio.current=engine;engine.preload();
  const hide=()=>{if(document.hidden)engine.pause();else engine.recover()};
  document.addEventListener('visibilitychange',hide);
  return ()=>{document.removeEventListener('visibilitychange',hide);engine.dispose();audio.current=null};
 },[]);
 const [visibleStart,setVisibleStart]=useState(0);
 const inventoryCards=useMemo(()=>[...eligible].sort((a,b)=>a.rarity-b.rarity||a.price-b.price||a.name.localeCompare(b.name,'vi')).map(f=><Card food={f} small key={f.name}/>),[eligible]);

 const track=useRef<HTMLDivElement>(null);
 const position=useRef(-400);
 const frame=useRef(0);
 useEffect(()=>()=>{cancelAnimationFrame(frame.current)},[]);
 function open(){
  if(busy.current||!validTarget||!eligible.length||!track.current||!viewport.current)return;
  audio.current?.unlock();
  busy.current=true;
  const winner=lunchSelector.choose(eligible);
  const spinId=crypto.randomUUID();
  const step=254,tileWidth=240,width=viewport.current.clientWidth;
  const start=position.current;
  const center=Math.floor((width/2-start)/step);
  const profile=createSpinProfile();
  const target=center+profile.tiles;
  const end=width/2-tileWidth*stopFraction()-target*step;
  // Keep visible cards at permanent world coordinates. Generate new cards
  // offscreen to the right; the track only travels left, without a reset.
  const rightEdge=Math.ceil((width-start)/step)+1;
  const items=reel.filter(item=>item.id>=center-Math.ceil(width/step)-2&&item.id<=rightEdge);
  const last=Math.max(...items.map(item=>item.id));
  const recent:Food[]=[];
  for(let id=last+1;id<=target+4;id++){
   const alternatives=eligible.filter(food=>!recent.includes(food));
   const food=id===target?winner:lunchSelector.choose(alternatives.length?alternatives:eligible);
   items.push({id,food});recent.push(food);if(recent.length>8)recent.shift();
  }
  flushSync(()=>{setReel(items);setSpinning(true);setMoving(true);setResult(null)});
  audio.current?.play('csgo_ui_crate_open');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration=reduced?150:profile.durationMs;
  const started=performance.now();
  let renderedStart=visibleStart;
  let lastCell=Math.floor((start-width/2)/step);
  const animate=(now:number)=>{
   const progress=Math.max(0,Math.min(1,(now-started)/duration));
   const next=start+(end-start)*spinProgress(progress,profile.friction);
   position.current=next;
   // Only mount a viewport-sized strip, with 4 cards of overscan on either side.
   // Absolute slot coordinates and transform never reset when the window advances.
   const firstVisible=Math.max(0,Math.floor(-next/step));
   if(firstVisible-renderedStart>=4||firstVisible<renderedStart){renderedStart=Math.max(0,firstVisible-2);setVisibleStart(renderedStart)}
   if(track.current)track.current.style.transform=`translate3d(${next}px,0,0)`;
   // Tick when a card actually crosses the pointer, including on slow devices.
   const cell=Math.floor((next-width/2)/step);
   if(cell!==lastCell){audio.current?.play('csgo_ui_crate_item_scroll');lastCell=cell}
   if(progress<1){frame.current=requestAnimationFrame(animate);return}
   void recordSpin(spinId);
   busy.current=false;setSpinning(false);setMoving(false);setResult(winner);setRevealed(true);
   audio.current?.play((['item_reveal3_rare','item_reveal4_mythical','item_reveal5_legendary','item_reveal6_ancient','item_reveal6_ancient'] as const)[winner.rarity]);
  };
  frame.current=requestAnimationFrame(animate);
 }

 return <div className="site-shell">
 <header><a href={`${basePath}/`} className="brand"><span className="brand-icon"><CupSoda size={21}/></span>truanayangi<span className="brand-dot">.</span></a><button className="sound-button" onClick={()=>{audio.current?.setMuted(sound);setSound(!sound)}} aria-label={sound?'Tắt âm thanh':'Bật âm thanh'}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}<span>Âm thanh {sound?'bật':'tắt'}</span></button></header>
 <main><div className="intro"><h1>Mở hòm đồ uống</h1></div>
 {counterEnabled&&<p className="global-counter" title="Tổng số lượt quay hoàn tất của mọi người, tính từ khi bật bộ đếm">Cư dân mạng đã mở <strong>{globalSpins===null?'—':new Intl.NumberFormat('vi-VN').format(globalSpins)}</strong> hòm</p>}
 <section className="case-panel" aria-label="Mở hòm đồ uống">
 <div className={`reel-window ${moving?'is-spinning':''} `} ref={viewport}><div className="selector-line"/><div className="reel-track" ref={track}>{reel.filter(({id})=>id>=visibleStart&&id<visibleStart+12).map(({food,id})=><Card key={id} food={food} slot={id}/>)}</div><div className="reel-fade left"/><div className="reel-fade right"/></div></section>
 <div className="control-bar"><div className="filters"><div className="budget"><label id="budget-label">Mức chi thường ngày</label><Select value={budget} onValueChange={v=>setBudget(v??'50')} disabled={spinning}><SelectTrigger aria-labelledby="budget-label"><SelectValue>{budget==='custom'?'Tuỳ chỉnh':`${budget}.000đ`}</SelectValue></SelectTrigger><SelectContent>{['35','50','75','100','150'].map(v=><SelectItem key={v} value={v}>{v}.000đ</SelectItem>)}<SelectItem value="custom">Tuỳ chỉnh</SelectItem></SelectContent></Select>{budget==='custom'&&<div className="custom-spend"><input aria-label="Mức chi tuỳ chỉnh (nghìn đồng)" aria-invalid={!validTarget} type="number" inputMode="numeric" min="30" max="180" step="1" value={custom} disabled={spinning} onChange={e=>setCustom(e.target.value)}/><span>nghìn / ly</span></div>}{!validTarget&&<small className="spend-note" role="alert">Nhập từ 30 đến 180 nghìn.</small>}{veg&&validTarget&&<small className="spend-note">Pool không sữa: trung bình ~{Math.round(filteredMean)}.000đ / ly</small>}</div><label className="veg"><Switch checked={veg} onCheckedChange={setVeg} disabled={spinning} aria-label="Chỉ đồ uống không sữa"/><span><Leaf size={15}/> Không sữa</span></label></div><div className="open-wrap"><button className="open-button" disabled={spinning||!validTarget||!eligible.length} onClick={open}>{spinning?<AudioLines size={22}/>:<Sparkles size={21}/>} {spinning?'ĐANG MỞ HÒM…':result?'MỞ LẠI':'MỞ HÒM'} <span>↗</span></button></div></div>
 <Dialog open={revealed} onOpenChange={setRevealed}><DialogContent className="winner-dialog" showCloseButton={false}>{result&&<><span className="winner-label">VẬT PHẨM MỚI</span><DialogTitle className="winner-title">{result.name}</DialogTitle><DialogDescription className="winner-description">Giá tham khảo · ~{result.price}.000đ / ly</DialogDescription><div className="winner-art" style={{'--rarity':colors[result.rarity]} as React.CSSProperties}><FoodImage food={result}/></div><div className="winner-actions"><a className="find-button" href={`https://www.google.com/maps/search/${encodeURIComponent(result.name+' gần đây')}`} target="_blank" rel="noreferrer">TÌM QUÁN <ArrowUpRight size={16}/></a><button onClick={()=>setRevealed(false)}>TIẾP TỤC</button></div></>}</DialogContent></Dialog>

 <section className="inventory"><div className="section-heading"><div><span className="eyebrow">TRONG HÒM CÓ GÌ?</span><h2>Vật phẩm trong hòm <span>{eligible.length.toString().padStart(2,'0')}</span></h2></div><div className="rarity-legend">{tiers.map((t,i)=><span key={t}><i style={{background:colors[i]}}/>{t}</span>)}</div></div><div className="inventory-grid">{inventoryCards}</div></section>

 <footer><span>truanayangi.</span><span>Fan-made · SFX: Valve / <a href="https://github.com/sourcesounds/csgo" target="_blank" rel="noreferrer">SourceSounds</a></span></footer>
 </main></div>
}
