/* Athletic Day – vanilla JS PWA. Saves everything in localStorage. */
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>[...document.querySelectorAll(s)];

const DEFAULTS = {
  kcal: 3400,
  protein: 150,
  waterGoal: 12, // cups (~250–300ml each)
  dayType: 'upper',
  schedule: [
    {t:'06:45', label:'Wake + water', done:false},
    {t:'06:50', label:'Wake-up mobility (8 min)', done:false},
    {t:'07:00', label:'Breakfast', done:false},
    {t:'07:30', label:'Commute + sunlight', done:false},
    {t:'08:30–15:30', label:'School (snacks 10:30 & 13:00)', done:false},
    {t:'15:45', label:'Pre-workout snack', done:false},
    {t:'16:15–17:30', label:'Training', done:false},
    {t:'17:30', label:'Post-workout meal', done:false},
    {t:'18:15–20:00', label:'Homework (Pomodoro)', done:false},
    {t:'20:00', label:'Dinner', done:false},
    {t:'20:30', label:'Prep bag + tidy', done:false},
    {t:'21:00', label:'Stretch/mobility (20–25 min)', done:false},
    {t:'21:30', label:'Shower + journal', done:false},
    {t:'22:30', label:'Pre-bed snack', done:false},
    {t:'22:30–23:00', label:'Sleep', done:false},
  ],
  meals: [
    {label:'Breakfast: 3 eggs + 2 pita + kiwi + milk', done:false},
    {label:'Snack 1: yogurt + granola + banana', done:false},
    {label:'Lunch: chicken + potatoes/rice + salad', done:false},
    {label:'Pre: banana + PB (or dates + milk)', done:false},
    {label:'Post: choc milk + pita w/ eggs/turkey', done:false},
    {label:'Dinner: steak/chicken + potatoes + salad', done:false},
    {label:'Bed: yogurt/cottage cheese + honey', done:false},
  ],
  mobility: [
    'Couch stretch (hip flexor/quads)',
    'Pigeon or figure-4 (glute)',
    'Hamstring strap stretch',
    'Calf wall stretch',
    'Quad lying prone',
    'Pec doorway + Lat stretch',
    'Ankle kneeling hold',
    '2 min nasal breathing',
  ]
};

const WORKOUTS = {
  upper: {
    title: 'Upper Body (75 min)',
    warmup: ['Jump rope 2 min','Band pull-aparts 2×15','Scap push-ups 2×12','Empty-bar complex'],
    main: [
      'Barbell bench press 4×5–8 (2 RIR)',
      'Pull-ups or lat pulldown 4×AMRAP/8–12',
      'DB overhead press 3×6–10',
      '1‑arm DB row 3×8–12/side',
      'Dips or weighted push-ups 3×8–12',
      'Face pulls or Y‑T‑W 2×12–15',
    ],
    armsCore: ['DB curls 3×10–12','Rope pressdown 3×10–12','Dead bug 3×10/side'],
    cooldown: ['Pec doorway + Lat stretch','2 min nasal breathing'],
  },
  legs: {
    title: 'Legs (75 min)',
    warmup: ['Bike 3 min','Ankle rocks / leg swings / hip airplanes','Bodyweight squats 2×10'],
    main: [
      'Back squat (or goblet/leg press) 4×5–8',
      'Romanian deadlift 3×6–10',
      'Bulgarian split squat 3×8–10/leg',
      'Hip thrust 3×8–12',
      'Calf raises 4×10–15',
      'Nordic curl (assist) or ham curl 2–3×6–8 (slow eccentrics)',
    ],
    plyo: ['Pogo hops 3×15','Box jumps 3×3 (soft landings)'],
    core: ['Front plank 3×30–45s','Side plank 2×30s/side'],
    cooldown: ['Couch stretch, hamstring, calves'],
  },
  recovery: {
    title: 'Stretch/Skills (30–45 min)',
    skills: ['Form shooting + ball-handling (10–20 min) OR brisk walk/cycle'],
    flow: DEFAULTS.mobility,
  }
};

// ---------- STATE ----------
const todayKey = () => {
  const d = new Date();
  return d.toISOString().slice(0,10);
};

function loadState(){
  const saved = JSON.parse(localStorage.getItem('athleteDayState') || '{}');
  // Ensure we reset checkboxes day-to-day, but keep settings
  if(saved.date !== todayKey()){
    saved.date = todayKey();
    saved.schedule = structuredClone(DEFAULTS.schedule);
    saved.meals = structuredClone(DEFAULTS.meals);
    saved.water = 0;
    saved.kcalIn = 0; saved.proteinIn = 0;
    saved.dayType = saved.dayType || DEFAULTS.dayType;
  }
  // Defaults
  if(!saved.settings){
    saved.settings = { kcal: DEFAULTS.kcal, protein: DEFAULTS.protein, waterGoal: DEFAULTS.waterGoal };
  }
  if(!saved.schedule) saved.schedule = structuredClone(DEFAULTS.schedule);
  if(!saved.meals) saved.meals = structuredClone(DEFAULTS.meals);
  if(typeof saved.water !== 'number') saved.water = 0;
  if(!saved.mobility) saved.mobility = DEFAULTS.mobility;
  if(!saved.weights) saved.weights = [];
  if(!saved.notes) saved.notes = '';
  if(!saved.dayType) saved.dayType = DEFAULTS.dayType;
  if(!saved.kcalIn) saved.kcalIn = 0;
  if(!saved.proteinIn) saved.proteinIn = 0;

  localStorage.setItem('athleteDayState', JSON.stringify(saved));
  return saved;
}
let STATE = loadState();

function save(){ localStorage.setItem('athleteDayState', JSON.stringify(STATE)); updateUI(); }

// ---------- UI BUILD ----------
function renderSchedule(){
  const list = $('#scheduleList');
  list.innerHTML = '';
  STATE.schedule.forEach((item, idx)=>{
    const li = document.createElement('li');
    const labelDiv = document.createElement('div');
    labelDiv.className = 'inline';
    const timeSpan = document.createElement('b');
    timeSpan.textContent = item.t;
    const txt = document.createElement('span');
    txt.textContent = ' — ' + item.label;
    labelDiv.appendChild(timeSpan); labelDiv.appendChild(txt);

    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = item.done;
    cb.addEventListener('change', ()=>{ STATE.schedule[idx].done = cb.checked; save(); });

    if(item.done){ timeSpan.classList.add('strike'); txt.classList.add('strike'); }

    li.appendChild(labelDiv);
    li.appendChild(cb);
    list.appendChild(li);
  });

  const done = STATE.schedule.filter(x=>x.done).length;
  $('#tasksDone').textContent = done;
  $('#tasksTotal').textContent = STATE.schedule.length;
  const pct = Math.round(100*done/Math.max(1, STATE.schedule.length));
  $('#dayProgress').style.width = pct + '%';
}

function renderWorkout(){
  const wrap = $('#workoutContainer');
  wrap.innerHTML = '';

  const type = STATE.dayType;
  const w = WORKOUTS[type];

  function section(title, items){
    const div = document.createElement('div');
    const h = document.createElement('div'); h.className='small'; h.innerHTML = '<b>'+title+'</b>';
    div.appendChild(h);
    const ul = document.createElement('ul'); ul.className='list';
    items.forEach((txt,i)=>{
      const li = document.createElement('li');
      const span = document.createElement('span'); span.textContent = txt;
      const cb = document.createElement('input'); cb.type='checkbox';
      // Persist by key
      const key = 'w_'+type+'_'+title+'_'+i;
      cb.checked = !!STATE[key];
      if(cb.checked) span.classList.add('strike');
      cb.addEventListener('change', ()=>{
        STATE[key] = cb.checked; save();
      });
      li.appendChild(span); li.appendChild(cb); ul.appendChild(li);
    });
    div.appendChild(ul);
    return div;
  }

  if(type==='upper'){
    wrap.appendChild(section('Warm-up', w.warmup));
    wrap.appendChild(section('Main', w.main));
    wrap.appendChild(section('Arms/Core', w.armsCore));
    wrap.appendChild(section('Cool-down', w.cooldown));
  } else if(type==='legs'){
    wrap.appendChild(section('Warm-up', w.warmup));
    wrap.appendChild(section('Main', w.main));
    wrap.appendChild(section('Optional Plyo', w.ployo || w.plyo));
    wrap.appendChild(section('Core', w.core));
    wrap.appendChild(section('Cool-down', w.cooldown));
  } else {
    wrap.appendChild(section('Skills', w.skills));
    wrap.appendChild(section('Mobility Flow', w.flow));
  }
}

function renderMeals(){
  const list = $('#mealsList'); list.innerHTML='';
  STATE.meals.forEach((m, i)=>{
    const li = document.createElement('li');
    const span = document.createElement('span'); span.textContent = m.label;
    const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = m.done;
    cb.addEventListener('change', ()=>{ STATE.meals[i].done = cb.checked; save(); });
    if(m.done){ span.classList.add('strike'); }
    li.appendChild(span); li.appendChild(cb); list.appendChild(li);
  });
}

function renderMobility(){
  const list = $('#mobilityList'); list.innerHTML='';
  STATE.mobility.forEach((m,i)=>{
    const li = document.createElement('li');
    const span = document.createElement('span'); span.textContent = m;
    const cb = document.createElement('input'); cb.type='checkbox';
    const key = 'mob_'+i;
    cb.checked = !!STATE[key];
    if(cb.checked) span.classList.add('strike');
    cb.addEventListener('change', ()=>{ STATE[key] = cb.checked; save(); });
    li.appendChild(span); li.appendChild(cb); list.appendChild(li);
  });
}

function renderWeights(){
  const list = $('#weightList'); list.innerHTML='';
  const sorted = [...(STATE.weights||[])].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,7);
  sorted.forEach((w)=>{
    const li = document.createElement('li');
    const left = document.createElement('span'); left.textContent = w.date;
    const right = document.createElement('b'); right.textContent = w.kg + ' kg';
    li.appendChild(left); li.appendChild(right); list.appendChild(li);
  });
}

function renderTop(){
  $('#kcalTarget').textContent = STATE.settings.kcal;
  $('#proteinTarget').textContent = STATE.settings.protein + 'g';
  $('#waterGoal').textContent = STATE.settings.waterGoal;
  $('#waterCups').textContent = STATE.water || 0;
  $('#waterNow').textContent = STATE.water || 0;
  $('#kcalIn').value = STATE.kcalIn || '';
  $('#proteinIn').value = STATE.proteinIn || '';
  $('#dayType').value = STATE.dayType;
  $('#typeLabel').textContent = STATE.dayType==='upper'?'Upper':STATE.dayType==='legs'?'Legs':'Stretch/Skills';
  $('#todayLabel').textContent = new Date().toLocaleDateString();
  $('#notes').value = STATE.notes || '';
}

function updateUI(){
  renderTop();
  renderSchedule();
  renderWorkout();
  renderMeals();
  renderMobility();
  renderWeights();
}

// ---------- EVENTS ----------
$('#dayType').addEventListener('change', (e)=>{ STATE.dayType = e.target.value; save(); });

$('#resetDay').addEventListener('click', ()=>{
  if(confirm('Reset today? This will clear checkboxes, water, and nutrition entries for today.')){
    const keep = { settings: STATE.settings, dayType: STATE.dayType, weights: STATE.weights, notes: STATE.notes };
    STATE = loadState(); // re-init
    STATE.settings = keep.settings; STATE.dayType = keep.dayType; STATE.weights = keep.weights; STATE.notes = keep.notes;
    save();
  }
});

$('#plusWater').addEventListener('click', ()=>{ STATE.water=(STATE.water||0)+1; save(); });
$('#minusWater').addEventListener('click', ()=>{ STATE.water=Math.max(0,(STATE.water||0)-1); save(); });
$('#setWaterGoal').addEventListener('click', ()=>{
  const g = prompt('Set daily water goal (cups):', STATE.settings.waterGoal);
  if(g){ STATE.settings.waterGoal = Math.max(1, parseInt(g,10)); save(); }
});

$('#saveNutrition').addEventListener('click', ()=>{
  const kcal = parseInt($('#kcalIn').value||'0',10);
  const p = parseInt($('#proteinIn').value||'0',10);
  if(!isNaN(kcal)) STATE.kcalIn = kcal;
  if(!isNaN(p)) STATE.proteinIn = p;
  save();
});

$('#addWeight').addEventListener('click', ()=>{
  const kg = parseFloat($('#weightInput').value||'');
  if(isNaN(kg)) return alert('Enter your weight in kg');
  STATE.weights = STATE.weights || [];
  STATE.weights.push({ date: new Date().toISOString().slice(0,10), kg: kg.toFixed(1) });
  $('#weightInput').value = '';
  // keep only last 60
  if(STATE.weights.length>60) STATE.weights = STATE.weights.slice(-60);
  save();
});

$('#notes').addEventListener('input', (e)=>{ STATE.notes = e.target.value; save(); });

$('#markAll').addEventListener('click', ()=>{
  STATE.schedule.forEach(s=>s.done=true);
  STATE.meals.forEach(m=>m.done=true);
  save();
});

// Pomodoro
let timerId=null, remaining=0, isWork=true;
function setTimerDisplay(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = Math.floor(sec%60).toString().padStart(2,'0');
  $('#timerDisplay').textContent = m+':'+s + (isWork?' ⏱️':' ☕');
}
$('#startTimer').addEventListener('click', ()=>{
  const work = parseInt($('#workMins').value,10)*60;
  const brk  = parseInt($('#breakMins').value,10)*60;
  if(!timerId){
    remaining = isWork?work:brk;
    setTimerDisplay(remaining);
    timerId = setInterval(()=>{
      remaining--;
      if(remaining<=0){
        // vibrate if possible
        if('vibrate' in navigator){ navigator.vibrate([200,100,200]); }
        clearInterval(timerId); timerId=null; isWork=!isWork;
        alert(isWork?'Break over — back to work!':'Work block done — take a break!');
      }
      setTimerDisplay(Math.max(0,remaining));
    },1000);
  }
});
$('#stopTimer').addEventListener('click', ()=>{ if(timerId){ clearInterval(timerId); timerId=null; }});
$('#resetTimer').addEventListener('click', ()=>{ if(timerId){ clearInterval(timerId); timerId=null; } isWork=true; setTimerDisplay(0); });

// Settings dialog (simple prompts to keep code light)
$('#settingsBtn').addEventListener('click', ()=>{
  const kcal = prompt('Daily calories target:', STATE.settings.kcal);
  const protein = prompt('Daily protein target (g):', STATE.settings.protein);
  const water = prompt('Daily water goal (cups):', STATE.settings.waterGoal);
  if(kcal) STATE.settings.kcal = parseInt(kcal,10);
  if(protein) STATE.settings.protein = parseInt(protein,10);
  if(water) STATE.settings.waterGoal = parseInt(water,10);
  save();
});

// Install prompt (PWA)
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault(); deferredPrompt=e;
});
$('#installBtn').addEventListener('click', async ()=>{
  if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; }
  else { alert('To install: Share > Add to Home Screen (Safari on iPhone).'); }
});

// Initial UI setup
updateUI();

// Service worker
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=> navigator.serviceWorker.register('./service-worker.js') );
}
