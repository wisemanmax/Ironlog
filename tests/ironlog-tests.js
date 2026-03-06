// IRONLOG Test Harness
// Run: open ironlog-tests.html in a browser, check console
// Tests pure logic functions — no React/DOM dependencies needed

(function(){
  let pass=0,fail=0;
  const assert=(name,cond)=>{if(cond){pass++;console.log(`  ✅ ${name}`);}else{fail++;console.error(`  ❌ ${name}`);}};
  const group=(name,fn)=>{console.group(`📦 ${name}`);fn();console.groupEnd();};

  // ─── 1RM Calculator ───
  group('calc1RM', ()=>{
    assert('1 rep = weight', calc1RM(225,1)===225);
    assert('5 reps > weight', calc1RM(200,5)>200);
    assert('10 reps Epley', calc1RM(135,10)===Math.round(135*(1+10/30)));
    assert('0 weight = 0', calc1RM(0,5)===0);
  });

  // ─── Plate Calculator ───
  group('calcPlates', ()=>{
    assert('225 = two 45s', JSON.stringify(calcPlates(225))==='[45,45]');
    assert('135 = one 45', JSON.stringify(calcPlates(135))==='[45]');
    assert('45 = empty bar', JSON.stringify(calcPlates(45))==='[]');
    assert('315 = three 45s', JSON.stringify(calcPlates(315))==='[45,45,45]');
    assert('null for impossible', calcPlates(50)===null);
  });

  // ─── Date Helpers ───
  group('Date helpers', ()=>{
    assert('today format', /^\d{4}-\d{2}-\d{2}$/.test(today()));
    assert('ago returns date string', /^\d{4}-\d{2}-\d{2}$/.test(ago(7)));
    assert('ago(0) = today', ago(0)===today());
    assert('fmtShort returns string', typeof fmtShort(today())==='string');
  });

  // ─── Unit Conversion ───
  group('Unit conversion', ()=>{
    assert('toKg(100) ≈ 45.4', Math.abs(toKg(100)-45.4)<0.1);
    assert('toLbs(45) ≈ 99.2', Math.abs(toLbs(45)-99.2)<0.2);
    assert('wUnit lbs', wUnit('lbs')==='lbs');
    assert('wUnit kg', wUnit('kg')==='kg');
    assert('roundtrip 225', Math.abs(toLbs(toKg(225))-225)<1);
  });

  // ─── Workout Validation ───
  group('validateWorkout', ()=>{
    const mockState={exercises:[{id:'bench',name:'Bench Press',cat:'Chest'}],workouts:[],units:'lbs'};
    const normalW={exercises:[{exerciseId:'bench',sets:[{weight:135,reps:10}]}],date:'2026-01-01'};
    const crazyW={exercises:[{exerciseId:'bench',sets:[{weight:1200,reps:10}]}],date:'2026-01-01'};
    const highReps={exercises:[{exerciseId:'bench',sets:[{weight:50,reps:150}]}],date:'2026-01-01'};
    assert('normal workout: no warnings', validateWorkout(normalW,mockState).length===0);
    assert('1200lb bench: warning', validateWorkout(crazyW,mockState).length>0);
    assert('150 reps: warning', validateWorkout(highReps,mockState).length>0);
  });

  // ─── Nutrition Validation ───
  group('validateNutrition', ()=>{
    assert('normal: no warning', validateNutrition({cal:2000,protein:150}).length===0);
    assert('10000 cal: warning', validateNutrition({cal:10000,protein:150}).length>0);
    assert('600g protein: warning', validateNutrition({cal:2000,protein:600}).length>0);
  });

  // ─── Readiness Score ───
  group('calcReadiness', ()=>{
    const mockS={checkins:[{date:today(),soreness:2,energy:4,motivation:5,sleep:8}],
      nutrition:[{date:today(),sleep:8}],workouts:[],body:[]};
    const r=calcReadiness(mockS);
    assert('returns score', typeof r.score==='number');
    assert('score 0-100', r.score>=0&&r.score<=100);
    assert('returns level', typeof r.level==='string');
    assert('returns color', typeof r.color==='string');
  });

  // ─── Strength Score ───
  group('calcStrengthScore', ()=>{
    const ws=[{exercises:[{exerciseId:'bench',sets:[{weight:225,reps:5}]},{exerciseId:'squat',sets:[{weight:315,reps:5}]},{exerciseId:'deadlift',sets:[{weight:405,reps:5}]}]}];
    const r=calcStrengthScore(ws,180);
    assert('returns score', typeof r.score==='number');
    assert('returns level', typeof r.level==='string');
    assert('score > 0 for decent lifts', r.score>0);
  });

  // ─── Muscle Heat Map ───
  group('calcMuscleHeat', ()=>{
    const ws=[{date:today(),exercises:[{exerciseId:'bench',sets:[{weight:135,reps:10},{weight:135,reps:10}]}]}];
    const exs=[{id:'bench',name:'Bench Press',cat:'Chest'}];
    const heat=calcMuscleHeat(ws,exs,30);
    assert('returns object', typeof heat==='object');
    assert('chest > 0', (heat.chest||0)>0);
  });

  // ─── Streak ───
  group('useStreak logic', ()=>{
    // Manually test streak logic
    const td=today();
    const yd=ago(1);
    const ws=[{date:td},{date:yd}];
    let streak=0;const d=new Date();
    for(let i=0;i<365;i++){
      const ds=d.toISOString().split("T")[0];
      if(ws.find(w=>w.date===ds)){streak++;d.setDate(d.getDate()-1);}else break;
    }
    assert('2-day streak', streak===2);
  });

  // ─── Summary ───
  console.log(`\n${'═'.repeat(40)}`);
  console.log(`Tests: ${pass} passed, ${fail} failed`);
  console.log(`${'═'.repeat(40)}`);
  if(fail===0)console.log('🎉 All tests passed!');
  else console.error(`⚠️ ${fail} test(s) failed`);
})();
