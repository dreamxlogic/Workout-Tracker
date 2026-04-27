const STORAGE_KEY = 'gymBuddyLocal.v1';
const $ = (sel) => document.querySelector(sel);
const app = $('#app');
const modalRoot = $('#modalRoot');
const shell = $('#appShell');
const nav = $('#bottomNav');

const THEMES = {
  pink: { label: 'Pink' }, blue: { label: 'Blue' }, purple: { label: 'Purple' }, red: { label: 'Red' }, orange: { label: 'Orange' }
};
const AVATARS = [
  { id:'woman_ponytail', name:'Ponytail', label:'Ponytail' },
  { id:'woman_bob', name:'Shoulder-length Bob', label:'Bob' },
  { id:'woman_boho_braids', name:'Boho Knotless Braids', label:'Boho Braids' },
  { id:'man_fro', name:'Textured Fro', label:'Fro' },
  { id:'man_braids', name:'Braids', label:'Braids' },
  { id:'man_fade', name:'Clean Fade', label:'Clean Fade' },
];
const TONES = [
  { id:'tone1', label:'158,111,92' },
  { id:'tone2', label:'128,87,64' },
  { id:'tone3', label:'85,55,42' },
];

let equipment = [];
let state = null;
let view = { name:'home', params:{} };
let ui = { search:'', category:'All', favoritesOnly:false, manageTab:'All', badgeTab:'Earned', muscleTab:'today', calendarMonth: new Date(), planEditing:null };

const defaultState = () => ({
  settings: {
    name:'Atiya', theme:'purple', avatar:'woman_ponytail', skinTone:'tone1', beginnerProfile:true,
    weightIncrement:10, firstWeight:40, repIncrement:1, firstReps:10, firstSets:3,
    cardioIncrement:5, firstCardioMinutes:30, useLastValues:true, autoSave:true
  },
  favorites: ['leg-press','dumbbells','seated-row'],
  hidden: [],
  plans: [
    { id: uid(), name:'Full Body Beginner', favorite:true, exerciseIds:['leg-press','chest-press','lat-pulldown','seated-row'], createdAt: new Date().toISOString() },
    { id: uid(), name:'Lower Body', favorite:false, exerciseIds:['leg-press','leg-extension','seated-leg-curl','hip-abductor','treadmill'], createdAt: new Date().toISOString() },
    { id: uid(), name:'Upper Body + Cardio', favorite:false, exerciseIds:['chest-press','lat-pulldown','seated-row','shoulder-press','elliptical'], createdAt: new Date().toISOString() },
  ],
  workouts: seedWorkouts(),
  currentWorkout: null,
  earnedBadges: [],
  difficultyHistory: {}
});

function uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function fmtDate(iso){ const d = new Date(iso); return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
function load(){
  const saved = localStorage.getItem(STORAGE_KEY);
  state = saved ? mergeDefaults(JSON.parse(saved), defaultState()) : defaultState();
  applyTheme();
}
function mergeDefaults(saved, defaults){
  return { ...defaults, ...saved, settings:{...defaults.settings, ...(saved.settings||{})}, plans:saved.plans||defaults.plans, workouts:saved.workouts||defaults.workouts, favorites:saved.favorites||[], hidden:saved.hidden||[], earnedBadges:saved.earnedBadges||[], difficultyHistory:saved.difficultyHistory||{} };
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function applyTheme(){ shell.className = `app-shell theme-${state.settings.theme}`; }
async function init(){
  equipment = window.EQUIPMENT_DATA || [];
  load();
  if(!state.earnedBadges.length && state.workouts.length) state.earnedBadges.push('first-workout');
  save();
  route('home');
}
function route(name, params={}){ view = { name, params }; render(); app.scrollTop = 0; }
function render(){ applyTheme(); renderNav(); const fn = views[view.name] || views.home; app.innerHTML = fn(view.params); bindCommon(); }
function renderNav(){
  const items = [['home','⌂','Home'],['workout','🏋','Workout'],['plans','▣','Plans'],['history','◷','History']];
  nav.innerHTML = items.map(([name,icon,label]) => `<button class="nav-item ${view.name===name||navActive(view.name)===name?'active':''}" data-route="${name}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join('');
}
function navActive(v){ if(['activeWorkout','addExercise'].includes(v)) return 'workout'; if(['planBuilder'].includes(v)) return 'plans'; if(['workoutDetail','calendar','bodyActivity','badges'].includes(v)) return 'history'; return v; }
function bindCommon(){
  document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>route(b.dataset.route));
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>actions[b.dataset.action]?.(b.dataset));
}
function eq(id){ return equipment.find(e=>e.id===id); }
function lastFor(exerciseId){
  const all=[];
  state.workouts.forEach(w => (w.exercises||[]).forEach(ex => { if(ex.id===exerciseId && (ex.sets||[]).length) all.push({w,ex}); }));
  if(!all.length) return null;
  all.sort((a,b)=> new Date(b.w.date)-new Date(a.w.date));
  const last = all[0].ex.sets.at(-1);
  return { ...last, sets: all[0].ex.sets.length, date: all[0].w.date };
}
function targetText(e){ return (e?.targets||[]).slice(0,3).join(' • '); }
function machineArt(id, cls=''){
  return `<span class="machine-art ${cls}" style="--mask-url:url('images/machines/accent-masks/${id}-mask.svg')"><img class="base" src="images/machines/base/${id}-base.svg" alt=""/><span class="accent"></span></span>`;
}
function avatarFigure(id=state.settings.avatar, tone=state.settings.skinTone, cls=''){
  return `<span class="avatar-figure ${cls}" style="--mask-url:url('images/avatars/clothing-masks/${id}-clothing-mask.svg')"><img class="base" src="images/avatars/base/${id}-${tone}.svg" alt="avatar"/><span class="clothing"></span></span>`;
}
function badgeImg(id, cls=''){ return `<img class="${cls}" src="images/badges/badge-${id}.svg" alt="${id}"/>`; }
function pill(label, active=false, extra=''){ return `<button class="chip ${active?'active':''}" ${extra}>${label}</button>`; }
function seedWorkouts(){
  const d = new Date();
  const iso = (daysAgo)=>{ const x=new Date(d); x.setDate(x.getDate()-daysAgo); return x.toISOString(); };
  return [
    { id:uid(), name:'Upper Body Strength', date:iso(1), exercises:[{id:'chest-press', sets:[{weight:50,reps:12},{weight:50,reps:12},{weight:55,reps:10}]},{id:'lat-pulldown', sets:[{weight:60,reps:10},{weight:60,reps:10}]},{id:'seated-row', sets:[{weight:70,reps:10},{weight:70,reps:10}]}] },
    { id:uid(), name:'Lower Body', date:iso(4), exercises:[{id:'leg-press', sets:[{weight:70,reps:10},{weight:70,reps:10},{weight:70,reps:10}]},{id:'leg-extension', sets:[{weight:40,reps:12},{weight:40,reps:12}]},{id:'seated-leg-curl', sets:[{weight:45,reps:10},{weight:45,reps:10}]}] },
    { id:uid(), name:'Cardio + Strength', date:iso(8), exercises:[{id:'treadmill', sets:[{minutes:30,distance:1.4}]},{id:'dumbbells', sets:[{weight:15,reps:10},{weight:15,reps:10}]}] }
  ];
}

const views = {
  home(){
    const latest = state.earnedBadges.at(-1) || 'first-workout';
    const suggested = state.plans[0];
    return `<div class="home-hero"><div class="copy"><h1 class="hero-title">Hi ${escapeHtml(state.settings.name)} 👋</h1><p>Small steps today, stronger you tomorrow.</p><button class="primary-btn" data-action="startWorkout" data-plan="${suggested.id}">▶ Start Workout</button></div><div class="hero-avatar">${avatarFigure()}</div></div>
    <section class="coach-card mt"><div class="coach-icon">💡</div><div><h3>Today’s Coach Tip</h3><p><b>Focus on form, not speed.</b><br/>Good reps today, progress tomorrow.</p></div></section>
    <div class="section-title"><h3>Suggested Today</h3><button class="link" data-route="plans">View All ›</button></div>
    <section class="card suggestion-card"><div>${machineArt(suggested.exerciseIds[0])}</div><div><h3>${suggested.name}</h3><p class="muted">${suggested.exerciseIds.length} exercises • Beginner</p><p>A perfect all-around routine to build strength and confidence.</p></div><button class="icon-btn" data-action="startWorkout" data-plan="${suggested.id}">→</button></section>
    <section class="card badge-home mt"><div>${badgeImg(latest)}</div><div><p class="target">Latest Badge</p><h3>${badgeTitle(latest)}</h3><p>You logged a tiny gym win.</p><button class="ghost-btn" data-route="badges">🏅 View All Badges</button></div></section>
    <div class="section-title"><h3>Recent Workouts</h3><button class="link" data-route="history">View All ›</button></div>
    <section class="card">${state.workouts.slice(0,3).map(w=>workoutRow(w)).join('')}</section>`;
  },
  workout(){
    if(state.currentWorkout) return views.activeWorkout();
    return `<div class="header"><div><h1>Workout</h1><p class="sub">Start fresh or use a saved plan.</p></div><button class="icon-btn" data-route="settings">⚙</button></div>
    <section class="coach-card"><div class="coach-icon">🏋</div><div><h3>Ready when you are.</h3><p>Start empty, pick a plan, or add machines as you go.</p></div></section>
    <div class="grid mt"><button class="primary-wide" data-action="startEmptyWorkout">Start Empty Workout</button><button class="secondary-wide" data-route="addExercise">+ Add Exercise First</button></div>
    <div class="section-title"><h3>Saved Workouts</h3><button class="link" data-route="plans">Manage</button></div>
    <div class="grid">${state.plans.map(planCard).join('')}</div>`;
  },
  activeWorkout(){
    const cw = state.currentWorkout;
    if(!cw) return views.workout();
    const exercises = cw.exercises.map((ex,i)=>exerciseCard(ex,i)).join('') || `<section class="card pad"><h3>No exercises yet</h3><p class="muted">Add a machine to start logging.</p></section>`;
    return `<div class="header"><div><h1>Active Workout</h1><p class="sub">${cw.name}</p></div><div><button class="icon-btn" data-action="undoLast">↶</button></div></div>
    <section class="coach-card mb"><div>${avatarFigure(state.settings.avatar,state.settings.skinTone,'small')}</div><div><h3>Great job so far, ${escapeHtml(state.settings.name)}! 💪</h3><p>${coachSuggestion()}</p></div></section>
    <button class="secondary-wide mb" data-route="addExercise">+ Add Exercise</button>
    ${exercises}
    <button class="primary-wide mt" data-action="openFinishSummary">Finish Workout</button>`;
  },
  addExercise(){
    const visible = filteredEquipment();
    return `<div class="header"><button class="icon-btn" data-route="workout">←</button><div><h2>Add Exercise</h2><p class="sub">Search machines, favorites, and cardio.</p></div></div>
    <div class="search"><span>⌕</span><input id="searchInput" placeholder="Search equipment…" value="${escapeAttr(ui.search)}" /></div>
    <div class="chips"><button class="chip ${ui.favoritesOnly?'active':''}" data-action="toggleFavFilter">★ Favorites</button>${['All','Machines','Cable Machines','Smith Machine','Free Weights','Cardio','Bodyweight'].map(c=>pill(c, ui.category===c, `data-action="setCategory" data-category="${c}"`)).join('')}</div>
    <div class="equip-list mt">${visible.map(equipItem).join('') || `<section class="card pad"><h3>No matches</h3><p class="muted">Try another search or unhide machines in Settings.</p></section>`}</div>`;
  },
  plans(){
    return `<div class="header"><div><h1>Plans</h1><p class="sub">Build routines that fit your goals.</p></div><button class="primary-btn" data-action="newPlan">+ Create</button></div>
    <div class="chips">${['All','Favorites','Beginner'].map((c,i)=>pill(c,i===0)).join('')}</div>
    <section class="card pad mt" data-action="newPlan"><div class="list-row" style="border:0;padding:0"><div class="tile-icon">+</div><div><h3>Create New Plan</h3><p class="muted">Build a custom workout plan.</p></div><b>›</b></div></section>
    <div class="section-title"><h3>Your Saved Plans</h3></div><div class="grid">${state.plans.map(planCard).join('')}</div>`;
  },
  planBuilder(params={}){
    const p = ui.planEditing || { id:null, name:'New Plan', exerciseIds:[] };
    return `<div class="header"><button class="icon-btn" data-route="plans">←</button><div><h2>Create New Plan</h2><p class="sub">Add machines in the order you want.</p></div>${avatarFigure(state.settings.avatar,state.settings.skinTone,'small')}</div>
    <label class="small-note">Plan Name</label><input id="planName" class="inline-input mb" value="${escapeAttr(p.name)}" />
    <section class="card pad mb"><button class="secondary-wide" data-route="addExercise">+ Add Exercise</button><p class="small-note">Tip: add exercises from search, then return here to save.</p></section>
    <div class="section-title"><h3>Your Plan (${p.exerciseIds.length})</h3><span class="small-note">Drag later</span></div>
    <div class="card">${p.exerciseIds.map((id,i)=>planExerciseRow(id,i)).join('') || `<div class="list-row"><div class="tile-icon">+</div><div><b>No exercises yet</b><p class="muted">Add at least one exercise.</p></div></div>`}</div>
    <div class="grid two mt"><button class="secondary-wide" data-action="clearPlan">Clear Plan</button><button class="primary-wide" data-action="savePlan" data-plan="${p.id||''}">Save Plan</button></div>`;
  },
  history(){
    const week = workoutsThisWeek();
    return `<div class="header"><div><h1>History</h1><p class="sub">Review your completed workouts.</p></div><button class="icon-btn" data-route="calendar">📅</button></div>
    <div class="tabs"><button class="tab active">Workouts</button><button class="tab" data-route="bodyActivity">Body Activity</button><button class="tab" data-route="badges">Badges</button></div>
    <section class="card pad"><h3>This Week Overview</h3><div class="stats-row"><div class="stat"><b>${week.length}</b><span>Workouts</span></div><div class="stat"><b>${week.reduce((s,w)=>s+setCount(w),0)}</b><span>Sets</span></div><div class="stat"><b>${new Set(week.flatMap(w=>w.exercises.map(e=>e.id))).size}</b><span>Machines</span></div></div></section>
    <div class="section-title"><h3>Recent Workouts</h3><button class="link" data-route="calendar">Calendar</button></div>
    <section class="card">${state.workouts.map(workoutRow).join('')}</section>`;
  },
  workoutDetail(params){
    const w = state.workouts.find(x=>x.id===params.id) || state.workouts[0];
    return `<div class="header"><button class="icon-btn" data-route="history">←</button><div><h2>Workout Detail</h2><p class="sub">${fmtDate(w.date)}</p></div></div>
    <section class="card pad"><h2>${w.name}</h2><div class="stats-row"><div class="stat"><b>${w.exercises.length}</b><span>exercises</span></div><div class="stat"><b>${setCount(w)}</b><span>sets</span></div><div class="stat"><b>Good</b><span>challenge</span></div></div></section>
    <div class="section-title"><h3>Exercises</h3></div>
    <div class="grid">${w.exercises.map(ex=>detailExercise(ex)).join('')}</div>`;
  },
  bodyActivity(){
    const tab=ui.muscleTab;
    const data = musclesFor(tab==='today'?1:7);
    return `<div class="header"><button class="icon-btn" data-route="history">←</button><div><h2>Body Activity</h2><p class="sub">See what you trained recently.</p></div></div>
    <div class="segment mb"><button class="${tab==='today'?'active':''}" data-action="setMuscleTab" data-tab="today">Today</button><button class="${tab==='week'?'active':''}" data-action="setMuscleTab" data-tab="week">Last 7 Days</button></div>
    <section class="card pad"><h3>${tab==='today'?'Today':'Last 7 Days'}</h3>${muscleMap(data)}<div class="chips mt">${data.map(m=>pill(m,true)).join('')}</div></section>
    <section class="alert mt"><b>💡 ${tab==='today'?'Nice balance today.':'Pattern check.'}</b><br/>${tab==='today'?'You logged the muscle groups shown above.':'Use this to spot areas you may want to rotate next.'}</section>`;
  },
  calendar(){
    return `<div class="header"><button class="icon-btn" data-route="history">←</button><div><h2>Calendar</h2><p class="sub">Workout days at a glance.</p></div></div>
    <section class="card pad">${calendarHtml()}</section>
    <div class="section-title"><h3>Recent Workout Days</h3></div><section class="card">${state.workouts.slice(0,5).map(workoutRow).join('')}</section>`;
  },
  badges(){
    const earned = allBadges().filter(b=>state.earnedBadges.includes(b.id));
    const locked = allBadges().filter(b=>!state.earnedBadges.includes(b.id));
    const list = ui.badgeTab==='Earned'?earned:locked;
    return `<div class="header"><button class="icon-btn" data-route="history">←</button><div><h2>Badge Library</h2><p class="sub">Collect your tiny gym wins.</p></div></div>
    <div class="segment mb"><button class="${ui.badgeTab==='Earned'?'active':''}" data-action="setBadgeTab" data-tab="Earned">Earned</button><button class="${ui.badgeTab==='Locked'?'active':''}" data-action="setBadgeTab" data-tab="Locked">Locked</button></div>
    <div class="grid two">${list.map(badgeCard).join('')}</div>`;
  },
  settings(){
    const s=state.settings;
    return `<div class="header"><div><h1>Settings</h1><p class="sub">Utility controls and personalization.</p></div><button class="icon-btn" data-route="home">⌂</button></div>
    <section class="card pad mb"><div class="list-row" style="border:0;padding:0">${avatarFigure(s.avatar,s.skinTone,'small')}<div><h2>${escapeHtml(s.name)}</h2><p class="muted">Profile & personalization</p></div></div></section>
    <section class="card">${settingRow('Profile','Name and greeting','profile')} ${settingRow('Avatar','Choose your coach avatar','avatar')} ${settingRow('Appearance','Theme color and preview','appearance')} ${settingRow('Increment & Defaults','Picker defaults','increments')} ${settingRow('Equipment','Favorites and hidden machines','manageEquipment')} ${settingRow('Backup & Restore','Export, import and local storage','backup')}</section>`;
  },
  profile(){
    return `<div class="header"><button class="icon-btn" data-route="settings">←</button><div><h2>Profile</h2><p class="sub">Used in greetings and coaching notes.</p></div></div><section class="card pad"><label>Name</label><input id="nameInput" class="inline-input mt" value="${escapeAttr(state.settings.name)}"/><button class="primary-wide mt" data-action="saveProfile">Save Profile</button></section>`;
  },
  avatar(){
    return `<div class="header"><button class="icon-btn" data-route="settings">←</button><div><h2>Choose Your Avatar</h2><p class="sub">Pick your gym buddy and skin tone.</p></div></div>
    <div class="grid three">${AVATARS.map(a=>`<button class="equip-item ${state.settings.avatar===a.id?'selected':''}" data-action="chooseAvatar" data-avatar="${a.id}">${avatarFigure(a.id,state.settings.skinTone,'med')}<b>${a.label}</b></button>`).join('')}</div>
    <section class="card pad mt"><h3>Skin Tone</h3><div class="swatches">${TONES.map(t=>`<button class="swatch ${t.id} ${state.settings.skinTone===t.id?'selected':''}" data-action="chooseTone" data-tone="${t.id}"></button>`).join('')}</div></section>
    <section class="coach-card mt"><div>${avatarFigure()}</div><div><h3>Preview</h3><p>Your coach will appear on Home, Workout, and help screens.</p></div></section>`;
  },
  appearance(){
    return `<div class="header"><button class="icon-btn" data-route="settings">←</button><div><h2>Theme & Appearance</h2><p class="sub">Choose how your app looks.</p></div></div>
    <section class="card pad"><div class="home-hero" style="padding:0"><div><h2>Hi ${escapeHtml(state.settings.name)} 👋</h2><p class="sub">Live preview</p><button class="primary-btn mt">Start Workout</button></div><div class="hero-avatar">${avatarFigure()}</div></div></section>
    <section class="card pad mt"><h3>Choose Theme Color</h3><div class="swatches">${Object.keys(THEMES).map(t=>`<button class="swatch theme-swatch ${t} ${state.settings.theme===t?'selected':''}" data-action="chooseTheme" data-theme="${t}" title="${THEMES[t].label}"></button>`).join('')}</div></section>`;
  },
  increments(){
    const s=state.settings;
    return `<div class="header"><button class="icon-btn" data-route="settings">←</button><div><h2>Increment & Defaults</h2><p class="sub">Control pickers and defaults.</p></div></div>
    <section class="card pad"><h3>Add Set Preview</h3><div class="stats-row"><div class="stat"><b>${s.firstWeight}</b><span>lb</span></div><div class="stat"><b>${s.firstReps}</b><span>reps</span></div><div class="stat"><b>${s.firstSets}</b><span>sets</span></div></div></section>
    <section class="card mt">${numberSetting('Weight increment','weightIncrement',s.weightIncrement,[5,10,15])}${numberInputSetting('Default weight','firstWeight',s.firstWeight)}${numberSetting('Rep increment','repIncrement',s.repIncrement,[1,2,5])}${numberInputSetting('Default reps','firstReps',s.firstReps)}${numberInputSetting('Default sets','firstSets',s.firstSets)}${numberSetting('Cardio minute increment','cardioIncrement',s.cardioIncrement,[5,10,15])}${numberInputSetting('Default cardio minutes','firstCardioMinutes',s.firstCardioMinutes)}</section>
    <section class="card pad mt"><div class="list-row" style="border:0;padding:0"><div><b>Use last logged values</b><p class="muted">Default to your previous weight/reps when available.</p></div><button class="switch ${s.useLastValues?'on':''}" data-action="toggleUseLast"><span></span></button></div></section>`;
  },
  manageEquipment(){
    const visible = equipment.filter(e=> ui.manageTab==='All' || (ui.manageTab==='Favorites'? state.favorites.includes(e.id): state.hidden.includes(e.id)));
    return `<div class="header"><button class="icon-btn" data-route="settings">←</button><div><h2>Manage Equipment</h2><p class="sub">Favorite or hide machines.</p></div></div>
    <div class="search"><span>⌕</span><input id="manageSearch" placeholder="Search equipment…" value="${escapeAttr(ui.search)}"/></div>
    <div class="segment mb">${['All','Favorites','Hidden'].map(t=>`<button class="${ui.manageTab===t?'active':''}" data-action="setManageTab" data-tab="${t}">${t}</button>`).join('')}</div>
    <div class="equip-list">${visible.filter(e=>matchesSearch(e)).map(manageEquipItem).join('')}</div><section class="alert mt">Hidden equipment stays out of exercise search until restored.</section>`;
  },
  backup(){
    return `<div class="header"><button class="icon-btn" data-route="settings">←</button><div><h2>Backup & Restore</h2><p class="sub">All data is stored locally on this device/browser.</p></div></div>
    <section class="card pad"><div class="list-row" style="border:0;padding:0"><div class="tile-icon" style="color:var(--success);background:#dcfce7">✓</div><div><h3>Auto Save On</h3><p class="muted">Changes save automatically.</p></div></div></section>
    <section class="card pad mt"><h3>Backup</h3><button class="primary-wide" data-action="exportData">Create Backup</button><button class="secondary-wide mt" data-action="triggerImport">Import Backup</button><input id="importFile" type="file" accept="application/json" hidden /></section>
    <section class="card pad mt danger"><h3>Danger Zone</h3><p>Clear all local app data from this browser. This cannot be undone.</p><button class="secondary-wide" data-action="clearData">Clear Local Data</button></section>`;
  }
};

function settingRow(title, desc, routeName){ return `<div class="list-row"><div class="tile-icon">${title[0]}</div><div><b>${title}</b><p class="muted">${desc}</p></div><button class="link" data-route="${routeName}">›</button></div>`; }
function numberSetting(label,key,value,opts){ return `<div class="list-row"><div><b>${label}</b></div><div class="chips">${opts.map(o=>`<button class="chip ${value==o?'active':''}" data-action="setNumberSetting" data-key="${key}" data-value="${o}">${o}</button>`).join('')}</div></div>`; }
function numberInputSetting(label,key,value){ return `<div class="list-row"><div><b>${label}</b></div><input class="inline-input" style="width:90px" type="number" value="${value}" data-setting-input="${key}"/><button class="ghost-btn" data-action="saveNumberInputs">Save</button></div>`; }
function workoutRow(w){ return `<button class="recent-row" data-action="openWorkoutDetail" data-id="${w.id}"><div class="tile-icon">🏋</div><div style="text-align:left;flex:1"><b>${w.name}</b><p class="muted">${fmtDate(w.date)} • ${w.exercises.length} exercises • ${setCount(w)} sets</p></div><b>›</b></button>`; }
function planCard(p){ const first=eq(p.exerciseIds[0])||equipment[0]; return `<section class="plan-card"><div class="list-row" style="border:0;padding:0">${machineArt(first.id)}<div><h3>${p.name}</h3><p class="muted">${p.exerciseIds.length} exercises • Beginner</p></div><button class="star ${p.favorite?'on':''}" data-action="togglePlanFav" data-plan="${p.id}">★</button></div><div class="grid two mt"><button class="primary-wide" data-action="startWorkout" data-plan="${p.id}">Start Plan</button><button class="secondary-wide" data-action="editPlan" data-plan="${p.id}">Edit</button></div></section>`; }
function planExerciseRow(id,i){ const e=eq(id); return `<div class="list-row"><span class="muted">${i+1}.</span>${machineArt(id)}<div><b>${e.name}</b><p class="target">${targetText(e)}</p></div><button class="close" data-action="removeFromPlan" data-id="${id}">×</button></div>`; }
function equipItem(e){ const fav=state.favorites.includes(e.id); return `<section class="equip-item"><div>${machineArt(e.id)}</div><div><b>${e.name}</b><p class="target">${targetText(e)}</p></div><div><button class="star ${fav?'on':''}" data-action="toggleFavorite" data-id="${e.id}">★</button><button class="icon-btn" data-action="addExerciseToWorkout" data-id="${e.id}">+</button></div></section>`; }
function manageEquipItem(e){ const fav=state.favorites.includes(e.id), hid=state.hidden.includes(e.id); return `<section class="equip-item"><div>${machineArt(e.id)}</div><div><b>${e.name}</b><p class="target">${targetText(e)}</p></div><div><button class="star ${fav?'on':''}" data-action="toggleFavorite" data-id="${e.id}">★</button><button class="eye" data-action="toggleHidden" data-id="${e.id}">${hid?'🙈':'👁'}</button></div></section>`; }
function exerciseCard(ex,i){ const e=eq(ex.id); const sets=ex.sets||[]; const last=lastFor(ex.id); const type=e.type; return `<section class="card exercise-card"><div class="exercise-top"><div>${machineArt(e.id)}</div><div><div class="exercise-title-line"><h3><span class="tile-icon" style="display:inline-grid;width:34px;height:34px;font-size:15px">${i+1}</span> ${e.name}</h3><div><button class="icon-btn" data-action="showHelp" data-id="${e.id}">?</button></div></div><p class="target">${targetText(e)}</p><p class="last">Last time: ${last?formatSet(last,type):'No history yet'}</p></div></div><div class="row-actions"><button class="main" data-action="showAddSet" data-id="${e.id}">+ ${type==='cardio'?'Log Cardio':'Add Set'}</button><button class="outline" data-action="showHistory" data-id="${e.id}">History</button><button class="main" data-action="showDifficulty" data-id="${e.id}">Done</button></div>${sets.length?`<div class="set-list">${sets.map((s,j)=>`<div class="set-row"><span><span class="done-dot">✓</span> ${type==='cardio'?'Entry':'Set'} ${j+1}</span><b>${type==='cardio'?(s.minutes+' min'):(s.weight+' lb')}</b><b>${type==='cardio'?((s.distance||0)+' mi'):(s.reps+' reps')}</b><button class="close" data-action="deleteSet" data-id="${e.id}" data-index="${j}">×</button></div>`).join('')}</div>`:''}</section>`; }
function detailExercise(ex){ const e=eq(ex.id); return `<section class="card suggestion-card"><div>${machineArt(e.id)}</div><div><h3>${e.name}</h3><p class="target">${targetText(e)}</p>${ex.sets.map((s,i)=>`<p class="muted">${e.type==='cardio'?'Entry':'Set'} ${i+1}: ${formatSet(s,e.type)}</p>`).join('')}</div></section>`; }
function badgeCard(b){ const earned=state.earnedBadges.includes(b.id); return `<button class="badge-card" data-action="showBadge" data-id="${b.id}">${badgeImg(earned?b.id:'locked')}<h3>${b.title}</h3><p class="muted">${earned?'Earned':'Locked'}</p>${!earned?`<div class="small-note">Progress: ${b.progress()}</div>`:''}</button>`; }

function filteredEquipment(){ return equipment.filter(e=> !state.hidden.includes(e.id)).filter(matchesSearch).filter(e=> !ui.favoritesOnly || state.favorites.includes(e.id)).filter(e=> ui.category==='All' || e.category===ui.category); }
function matchesSearch(e){ return !ui.search || (e.name+' '+e.category+' '+(e.targets||[]).join(' ')).toLowerCase().includes(ui.search.toLowerCase()); }
function setCount(w){ return w.exercises.reduce((s,e)=>s+(e.sets?.length||0),0); }
function formatSet(s,type='strength'){ return type==='cardio' ? `${s.minutes||0} min${s.distance?` • ${s.distance} mi`:''}` : `${s.weight||0} lb • ${s.reps||0} reps${s.sets?` • ${s.sets} sets`:''}`; }
function workoutsThisWeek(){ const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-7); return state.workouts.filter(w=>new Date(w.date)>=cutoff); }
function coachSuggestion(){ const ex=state.currentWorkout?.exercises?.[0]; if(!ex) return 'Add your first machine and take it one set at a time.'; const last=lastFor(ex.id); return last ? `You hit ${formatSet(last, eq(ex.id).type)} last time. Stay consistent or try a small increase if it feels right.` : 'Start light today and focus on learning the movement.'; }
function allBadges(){
 return [
  {id:'first-workout', title:'First Workout', progress:()=> state.workouts.length? '1 / 1':'0 / 1'},
  {id:'first-plan', title:'First Saved Plan', progress:()=> state.plans.length? '1 / 1':'0 / 1'},
  {id:'cardio-starter', title:'Cardio Starter', progress:()=> hasCategory('Cardio')?'1 / 1':'0 / 1'},
  {id:'leg-day', title:'Leg Day Logged', progress:()=> hasMuscle('Quads')?'1 / 1':'0 / 1'},
  {id:'machine-explorer', title:'Machine Explorer', progress:()=> `${new Set(state.workouts.flatMap(w=>w.exercises.map(e=>e.id))).size} / 5`},
  {id:'three-workouts-month', title:'3 Workouts This Month', progress:()=> `${state.workouts.length} / 3`},
  {id:'new-machine', title:'Tried a New Machine', progress:()=> `${new Set(state.workouts.flatMap(w=>w.exercises.map(e=>e.id))).size} machines`},
  {id:'consistency-starter', title:'Consistency Starter', progress:()=> `${workoutsThisWeek().length} / 2`}
 ];
}
function hasCategory(cat){ return state.workouts.some(w=>w.exercises.some(x=>eq(x.id)?.category===cat)); }
function hasMuscle(m){ return state.workouts.some(w=>w.exercises.some(x=>eq(x.id)?.targets.includes(m))); }
function badgeTitle(id){ return allBadges().find(b=>b.id===id)?.title || 'First Workout'; }
function musclesFor(days){ const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-days); const set=new Set(); state.workouts.filter(w=>new Date(w.date)>=cutoff).forEach(w=>w.exercises.forEach(x=>(eq(x.id)?.targets||[]).forEach(t=>set.add(t)))); return [...set].slice(0,8); }
function muscleMap(muscles){ const worked = new Set(muscles); const m = (name)=> worked.has(name) ? 'worked':'week'; return `<svg class="muscle-map" viewBox="0 0 300 420"><g class="body"><circle cx="150" cy="42" r="25"/><path d="M112 72 H188 L202 190 H98Z"/><path d="M100 90 L58 195 L72 215 L118 118Z"/><path d="M200 90 L242 195 L228 215 L182 118Z"/><path d="M116 190 L96 365 H132 L150 212Z"/><path d="M184 190 L204 365 H168 L150 212Z"/></g><g><path class="${m('Chest')}" d="M118 88 H150 V130 H110Z"/><path class="${m('Chest')}" d="M150 88 H182 L190 130 H150Z"/><path class="${m('Shoulders')}" d="M96 83 L118 89 L109 121 L87 111Z"/><path class="${m('Shoulders')}" d="M204 83 L182 89 L191 121 L213 111Z"/><path class="${m('Quads')}" d="M113 206 L145 211 L128 315 H104Z"/><path class="${m('Quads')}" d="M187 206 L155 211 L172 315 H196Z"/><path class="${m('Glutes')}" d="M108 177 H148 V215 L113 207Z"/><path class="${m('Glutes')}" d="M152 177 H192 L187 207 L152 215Z"/><path class="${m('Core')}" d="M132 132 H168 V181 H132Z"/></g></svg>`; }
function calendarHtml(){ const dates=new Set(state.workouts.map(w=>new Date(w.date).toDateString())); const now=new Date(); const year=now.getFullYear(), month=now.getMonth(); const first=new Date(year,month,1); const start=first.getDay(); const days=new Date(year,month+1,0).getDate(); let cells=[]; for(let i=0;i<start;i++) cells.push('<div class="day"></div>'); for(let d=1; d<=days; d++){ const dt=new Date(year,month,d); const worked=dates.has(dt.toDateString()); cells.push(`<button class="day ${worked?'worked':''}" ${worked?'data-route="history"':''}>${d}</button>`); } return `<h3>${now.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h3><div class="calendar-grid"><b>S</b><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b>${cells.join('')}</div><p class="small-note mt"><span style="color:var(--theme-primary)">●</span> Workout logged</p>`; }

const actions = {
  startEmptyWorkout(){ state.currentWorkout={id:uid(), name:'Open Workout', date:new Date().toISOString(), exercises:[]}; save(); route('activeWorkout'); },
  startWorkout(ds){ const p=state.plans.find(x=>x.id===ds.plan) || state.plans[0]; state.currentWorkout={id:uid(), name:p.name, date:new Date().toISOString(), exercises:p.exerciseIds.map(id=>({id, sets:[], difficulty:null}))}; save(); route('activeWorkout'); },
  openWorkoutDetail(ds){ route('workoutDetail',{id:ds.id}); },
  newPlan(){ ui.planEditing={id:null,name:'New Plan',exerciseIds:[]}; route('planBuilder'); },
  editPlan(ds){ const p=state.plans.find(x=>x.id===ds.plan); ui.planEditing = p ? JSON.parse(JSON.stringify(p)) : {id:null,name:'New Plan',exerciseIds:[]}; route('planBuilder'); },
  savePlan(ds){ const name=$('#planName')?.value || 'New Plan'; const draft = ui.planEditing || {exerciseIds:[]}; if(draft.id){ const p=state.plans.find(x=>x.id===draft.id); if(p){ p.name=name; p.exerciseIds=[...draft.exerciseIds]; p.favorite=!!draft.favorite; } } else { draft.id=uid(); draft.name=name; draft.createdAt=new Date().toISOString(); state.plans.unshift(draft); unlock('first-plan'); } ui.planEditing=null; save(); route('plans'); },
  clearPlan(){ if(ui.planEditing) ui.planEditing.exerciseIds=[]; render(); },
  removeFromPlan(ds){ if(ui.planEditing) ui.planEditing.exerciseIds=ui.planEditing.exerciseIds.filter(id=>id!==ds.id); render(); },
  toggleFavFilter(){ ui.favoritesOnly=!ui.favoritesOnly; render(); },
  setCategory(ds){ ui.category=ds.category; render(); },
  toggleFavorite(ds){ const i=state.favorites.indexOf(ds.id); if(i>=0) state.favorites.splice(i,1); else state.favorites.push(ds.id); save(); render(); },
  toggleHidden(ds){ const i=state.hidden.indexOf(ds.id); if(i>=0) state.hidden.splice(i,1); else state.hidden.push(ds.id); save(); render(); },
  setManageTab(ds){ ui.manageTab=ds.tab; render(); },
  addExerciseToWorkout(ds){ if(view.name==='planBuilder' || ui.planEditing){ (ui.planEditing||(ui.planEditing={id:null,name:'New Plan',exerciseIds:[]})).exerciseIds.push(ds.id); save(); route('planBuilder'); return; } if(!state.currentWorkout) state.currentWorkout={id:uid(), name:'Open Workout', date:new Date().toISOString(), exercises:[]}; if(!state.currentWorkout.exercises.some(x=>x.id===ds.id)) state.currentWorkout.exercises.push({id:ds.id, sets:[], difficulty:null}); save(); route('activeWorkout'); },
  showAddSet(ds){ showAddSet(ds.id); },
  deleteSet(ds){ const ex=state.currentWorkout.exercises.find(x=>x.id===ds.id); ex.sets.splice(Number(ds.index),1); save(); render(); },
  showDifficulty(ds){ showDifficulty(ds.id); },
  showHelp(ds){ showHelp(ds.id); },
  showHistory(ds){ showMachineHistory(ds.id); },
  undoLast(){ const ex=state.currentWorkout?.exercises?.find(x=>x.sets.length); if(ex) ex.sets.pop(); save(); render(); },
  openFinishSummary(){ showFinishSummary(); },
  setBadgeTab(ds){ ui.badgeTab=ds.tab; render(); },
  showBadge(ds){ showBadge(ds.id); },
  setMuscleTab(ds){ ui.muscleTab=ds.tab; render(); },
  saveProfile(){ state.settings.name=$('#nameInput').value.trim()||'Friend'; save(); route('settings'); },
  chooseAvatar(ds){ state.settings.avatar=ds.avatar; save(); render(); },
  chooseTone(ds){ state.settings.skinTone=ds.tone; save(); render(); },
  chooseTheme(ds){ state.settings.theme=ds.theme; save(); render(); },
  setNumberSetting(ds){ state.settings[ds.key]=Number(ds.value); save(); render(); },
  saveNumberInputs(){ document.querySelectorAll('[data-setting-input]').forEach(i=> state.settings[i.dataset.settingInput]=Number(i.value)); save(); render(); },
  toggleUseLast(){ state.settings.useLastValues=!state.settings.useLastValues; save(); render(); },
  exportData(){ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`gym-app-backup-${todayISO()}.json`; a.click(); URL.revokeObjectURL(a.href); },
  triggerImport(){ const input=$('#importFile'); input.onchange=e=>{ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ state=mergeDefaults(JSON.parse(reader.result), defaultState()); save(); applyTheme(); route('home'); }catch(err){ alert('Could not import that backup file.'); } }; reader.readAsText(file); }; input.click(); },
  clearData(){ if(confirm('Clear all local app data? This cannot be undone.')){ localStorage.removeItem(STORAGE_KEY); load(); route('home'); } }
};

function showAddSet(id){ const e=eq(id); const last=lastFor(id); const s=state.settings; const defWeight=s.useLastValues&&last?.weight?last.weight:s.firstWeight; const defReps=s.useLastValues&&last?.reps?last.reps:s.firstReps; const defMin=s.useLastValues&&last?.minutes?last.minutes:s.firstCardioMinutes; const isCardio=e.type==='cardio';
  openModal(`<div class="modal-head"><h2>${isCardio?'Log Cardio':'Add Set'}</h2><button class="close" data-close>×</button></div><section class="card suggestion-card"><div>${machineArt(id)}</div><div><h3>${e.name}</h3><p class="muted">Last time: ${last?formatSet(last,e.type):'No history yet'}</p></div></section>${isCardio?cardioPicker(defMin):strengthPickers(defWeight,defReps)}<button class="primary-wide mt" id="saveSetBtn">Save ${isCardio?'Cardio':'Set'}</button><button class="secondary-wide mt" data-close>Cancel</button>`);
  $('#saveSetBtn').onclick=()=>{ const ex=ensureExercise(id); if(isCardio){ ex.sets.push({minutes:Number($('#minutesVal').value), distance:Number($('#distanceVal').value||0)}); } else { ex.sets.push({weight:Number($('#weightVal').value), reps:Number($('#repsVal').value)}); } save(); closeModal(); render(); };
}
function strengthPickers(w,r){ return `${picker('Weight (lb)','weightVal',w,0,300,state.settings.weightIncrement)}${picker('Reps','repsVal',r,1,30,state.settings.repIncrement)}`; }
function cardioPicker(m){ return `${picker('Minutes','minutesVal',m,5,120,state.settings.cardioIncrement)}<label class="small-note">Distance (optional)</label><input id="distanceVal" class="inline-input" type="number" step="0.1" placeholder="Distance in miles"/>`; }
function picker(label,id,val,min,max,step){ let vals=[]; for(let i=min;i<=max;i+=step) vals.push(i); return `<div class="picker"><h4>${label}</h4><input id="${id}" type="hidden" value="${val}"/><div class="picker-row">${vals.map(v=>`<button class="pick ${v==val?'active':''}" onclick="document.getElementById('${id}').value=${v}; this.parentElement.querySelectorAll('.pick').forEach(x=>x.classList.remove('active')); this.classList.add('active')">${v}</button>`).join('')}</div></div>`; }
function ensureExercise(id){ if(!state.currentWorkout) state.currentWorkout={id:uid(),name:'Open Workout',date:new Date().toISOString(),exercises:[]}; let ex=state.currentWorkout.exercises.find(x=>x.id===id); if(!ex){ ex={id,sets:[],difficulty:null}; state.currentWorkout.exercises.push(ex); } return ex; }
function showDifficulty(id){ const e=eq(id); const ex=ensureExercise(id); const last=ex.sets.at(-1) || lastFor(id) || {}; openModal(`<div class="modal-head"><h2>Exercise Complete</h2><button class="close" data-close>×</button></div><div style="text-align:center"><div class="tile-icon" style="margin:0 auto 12px">✓</div><h2>Exercise Complete</h2><p class="muted">How did that set feel?</p></div><section class="card suggestion-card"><div>${machineArt(id)}</div><div><h3>${e.name}</h3><p class="muted">Last set: ${formatSet(last,e.type)}</p></div></section><div class="grid" style="grid-template-columns:repeat(5,1fr);gap:8px;margin:16px 0">${['Too Easy','Easy','Good','Hard','Too Hard'].map(x=>`<button class="chip" data-difficulty="${x}">${x}</button>`).join('')}</div><section class="alert">Nice work — one set at a time adds up.</section><button class="primary-wide mt" id="saveDifficulty">Save</button><button class="secondary-wide mt" data-close>Skip</button>`);
  let selected='Good'; document.querySelectorAll('[data-difficulty]').forEach(b=>{ if(b.dataset.difficulty===selected)b.classList.add('active'); b.onclick=()=>{ selected=b.dataset.difficulty; document.querySelectorAll('[data-difficulty]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); }; });
  $('#saveDifficulty').onclick=()=>{ ex.difficulty=selected; (state.difficultyHistory[id] ||= []).push({date:new Date().toISOString(), value:selected}); save(); closeModal(); render(); };
}
function showHelp(id){ const e=eq(id); openModal(`<div class="modal-head"><div><h2>${e.name}</h2><p class="target">${targetText(e)}</p></div><button class="close" data-close>×</button></div><div class="help-hero">${machineArt(id)}</div><h3>How to Use</h3><ol class="clean">${e.instructions.map(x=>`<li>${x}</li>`).join('')}</ol><h3>Common Mistakes</h3><ul class="clean">${e.mistakes.map(x=>`<li>${x}</li>`).join('')}</ul><section class="alert mt"><b>💡 Beginner Tip</b><br/>${e.tip}</section>`, 'sheet'); }
function showMachineHistory(id){ const e=eq(id); const rows=[]; state.workouts.forEach(w=>w.exercises.forEach(ex=>{ if(ex.id===id) rows.push({w,ex}); })); openModal(`<div class="modal-head"><div><h2>${e.name} History</h2><p class="target">${targetText(e)}</p></div><button class="close" data-close>×</button></div><div class="help-hero">${machineArt(id)}</div>${rows.length?rows.map(r=>`<section class="card pad mb"><b>${fmtDate(r.w.date)}</b><p class="muted">${r.ex.sets.map(s=>formatSet(s,e.type)).join(' • ')}</p></section>`).join(''):'<p class="muted">No history yet.</p>'}`, 'sheet'); }
function showFinishSummary(){ const cw=state.currentWorkout; if(!cw) return; openModal(`<div style="text-align:center"><div class="tile-icon" style="margin:0 auto 10px">✓</div><h2>Workout Summary</h2><p class="target">You completed ${cw.exercises.length} exercises.</p></div><section class="coach-card mt"><div>${avatarFigure()}</div><div><h3>Nice work, ${escapeHtml(state.settings.name)} — you finished strong today.</h3><p>Keep it up.</p></div></section><section class="card mt">${cw.exercises.map(ex=>{const e=eq(ex.id);return `<div class="list-row"><div>${machineArt(e.id)}</div><div><b>${e.name}</b><p class="muted">${ex.sets.length} ${e.type==='cardio'?'entries':'sets'}</p></div></div>`}).join('')}</section><div class="stats-row mt"><div class="stat"><b>${cw.exercises.length}</b><span>Machines</span></div><div class="stat"><b>${setCount(cw)}</b><span>Total sets</span></div><div class="stat"><b>✓</b><span>Great job</span></div></div><button class="primary-wide mt" id="saveWorkoutBtn">Save Workout</button><button class="secondary-wide mt" data-close>View Details Later</button>`);
  $('#saveWorkoutBtn').onclick=()=>{ const w={...cw, date:new Date().toISOString()}; state.workouts.unshift(w); state.currentWorkout=null; const newly=checkBadges(); save(); closeModal(); render(); if(newly.length) showBadgeEarned(newly[0]); else route('history'); };
}
function checkBadges(){ const newOnes=[]; const add=(id)=>{ if(!state.earnedBadges.includes(id)){ state.earnedBadges.push(id); newOnes.push(id); } }; add('first-workout'); if(state.plans.length) add('first-plan'); if(hasCategory('Cardio')) add('cardio-starter'); if(hasMuscle('Quads')) add('leg-day'); if(new Set(state.workouts.flatMap(w=>w.exercises.map(e=>e.id))).size>=5) add('machine-explorer'); if(state.workouts.length>=3) add('three-workouts-month'); if(workoutsThisWeek().length>=2) add('consistency-starter'); return newOnes; }
function unlock(id){ if(!state.earnedBadges.includes(id)) state.earnedBadges.push(id); }
function showBadgeEarned(id){ openModal(`<div style="text-align:center">${badgeImg(id,'mb')}<h2>Badge Earned</h2><h3>${badgeTitle(id)}</h3><p class="muted">You logged a new gym win.</p><div class="grid two mt"><button class="secondary-wide" data-close>Nice</button><button class="primary-wide" id="viewBadgesBtn">View Badges</button></div></div>`); $('#viewBadgesBtn').onclick=()=>{closeModal();route('badges');}; }
function showBadge(id){ const b=allBadges().find(x=>x.id===id); const earned=state.earnedBadges.includes(id); openModal(`<div class="modal-head"><h2>${b.title}</h2><button class="close" data-close>×</button></div><div style="text-align:center">${badgeImg(earned?id:'locked')}<p class="muted">${earned?'Earned':'Locked'} • ${b.progress()}</p></div><section class="alert mt"><b>Why it matters</b><br/>Tiny wins help you build confidence and consistency.</section>`, 'sheet'); }
function openModal(html, type='center'){ modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal-card ${type==='sheet'?'sheet':''}">${html}</div></div>`; modalRoot.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal); }
function closeModal(){ modalRoot.innerHTML=''; }
function escapeHtml(s=''){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function escapeAttr(s=''){ return escapeHtml(s).replace(/'/g,'&#039;'); }

app.addEventListener('input', e=>{ if(e.target.id==='searchInput'||e.target.id==='manageSearch'){ ui.search=e.target.value; render(); } });
init();
