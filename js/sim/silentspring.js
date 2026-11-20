// 사건 03 시뮬레이션: 약제의 지방 친화성(옥탄올–물 분배), 먹이사슬 생물농축, 살포 계획의 다년 시뮬레이션.
// 클리어 호수 사건을 "재구성"한 교육용 모델이다. 실제 호수의 값이 아니라 경향을 보여 주는 단순식이다.
export const WATER_PPM = 0.02;            // 기준 살포 농도 (물 기준, 사료에 인용되는 값의 규모)
export const GREBE_LIMIT = 100;           // 게임 기준: 논병아리 지방 조직이 이 값(ppm)을 넘으면 번식 실패가 시작된다고 가정
export const GNAT_GOAL = 0.3;             // 게임 기준: 각다귀 개체수가 무처리의 30 % 이하여야 "불편이 사라졌다"고 본다
export const BUDGET = 8;                  // 게임 기준: 한 해 약제 사용량 상한 (살포 횟수 × 농도 배수)
export const YEARS = 6;

/** 약제 후보. logKow: 지방 친화성, hlEnv: 호수 환경에서 절반이 사라지는 날수, hlBody: 몸속 잔류 정도, pot: 각다귀에 대한 효력 */
export const COMPOUNDS = {
  ddd: { id: 'ddd', name: 'DDD (유기염소계)', logKow: 6.0, hlEnv: 700, hlBody: 1000, pot: 2.6, note: '효과가 강하고 오래 남는다' },
  mid: { id: 'mid', name: '약제 B (중간)', logKow: 5.0, hlEnv: 120, hlBody: 150, pot: 1.2, note: '중간 정도로 남는다' },
  fast: { id: 'fast', name: '약제 C (빨리 분해)', logKow: 2.8, hlEnv: 5, hlBody: 3, pot: 1.8, note: '며칠이면 대부분 사라진다' },
};

/* ---------- 1. 분배 ---------- */
/** 기름 1 mL, 물 1 L 를 섞어 흔들었을 때 기름 쪽에 있는 비율 */
export const Kow = (logKow) => 10 ** logKow;
export const OIL_RATIO = 0.001;   // 기름 1 mL : 물 1 L (호수 물에 비해 생물의 지방은 아주 적다)
export const fracOil = (logKow) => { const K = Kow(logKow) * OIL_RATIO; return K / (1 + K); };

/* ---------- 2. 사라지는 속도 ---------- */
export const remain = (halfLifeDays, days) => 0.5 ** (days / halfLifeDays);

/* ---------- 3. 먹이사슬 ---------- */
export const LEVELS = [
  { id: 'water', name: '호수 물', w: 0 },
  { id: 'plankton', name: '플랑크톤', w: 0 },
  { id: 'smallfish', name: '작은 물고기', w: 0.04 },
  { id: 'bigfish', name: '큰 물고기', w: 0.5 },
  { id: 'grebe', name: '논병아리 (지방 조직)', w: 0.4 },
];
/** 물 → 플랑크톤 농축 계수(BCF). logKow가 클수록 지방에 잘 쌓인다. */
export const bcf = (logKow) => Math.max(1, 10 ** (logKow - 3.6));
/** 먹이 한 단계 올라갈 때 배수(BMF). 지방 친화적이고 오래 남을수록 커진다. */
export function bmf(c, w) {
  const kfac = Math.max(1, 10 ** (0.5 * (c.logKow - 3)));
  const ret = c.hlBody / (c.hlBody + 30);
  return 1 + (kfac - 1) * ret * w;
}
/** 물속 농도(ppm) 하나가 주어졌을 때 각 단계의 농도 */
export function chain(c, waterPpm) {
  const out = [{ ...LEVELS[0], ppm: waterPpm, factor: 1 }];
  let cur = waterPpm * bcf(c.logKow);
  out.push({ ...LEVELS[1], ppm: cur, factor: bcf(c.logKow) });
  for (let i = 2; i < LEVELS.length; i++) { const f = bmf(c, LEVELS[i].w); cur *= f; out.push({ ...LEVELS[i], ppm: cur, factor: f }); }
  return out;
}

/* ---------- 4. 살포 계획 ---------- */
/**
 * plan: { id, dose(배수, 1 = 0.02 ppm), n(해마다 살포 횟수) }.
 * 매년 같은 계획을 YEARS년 되풀이한다. 하루 단위로 물속 농도와 각다귀 개체수를 따라간다.
 * 반환: years[{gnat, waterPeak, grebe, bigfish, plankton}], ok 판정에 쓰는 요약
 */
export function simulate(plan, years = YEARS) {
  const c = COMPOUNDS[plan.id];
  const kdec = Math.log(2) / c.hlEnv;
  const dose = plan.dose * WATER_PPM;
  const season = 180, rGrow = 0.045, kill = 0.11;
  let water = 0, sed = 0;               // 물, 각다귀 지수, 바닥 퇴적물에 남은 몫(다음 해로 이월)
  const out = [];
  for (let y = 0; y < years; y++) {
    let G = 1, sumG = 0, peak = 0;
    const days = [];
    for (let k = 0; k < plan.n; k++) days.push(Math.round(((k + 0.5) / plan.n) * 120));   // 5월 초에서 늦여름까지 고르게
    water += sed; sed = 0;
    for (let d = 0; d < season; d++) {
      if (days.includes(d)) water += dose;
      peak = Math.max(peak, water);
      const mortality = 1 - Math.exp(-kill * c.pot * water / WATER_PPM);
      G = Math.min(1, G * Math.exp(rGrow) * (1 - mortality));
      G = Math.max(G, 0.005);
      sumG += G;
      water *= Math.exp(-kdec);
    }
    // 이월: 지속성이 큰 약제는 퇴적물·생물체에 남아 다음 해 물로 돌아온다
    sed = water * (c.hlEnv > 200 ? 0.6 : 0.05);
    const ch = chain(c, peak);
    out.push({ year: y + 1, gnat: sumG / season, waterPeak: peak, plankton: ch[1].ppm, bigfish: ch[3].ppm, grebe: ch[4].ppm });
    water = 0;
  }
  return out;
}

export function judge(plan) {
  const ys = simulate(plan);
  const last = ys[ys.length - 1];
  const maxGrebe = Math.max(...ys.map((y) => y.grebe));
  const maxGnat = Math.max(...ys.slice(1).map((y) => y.gnat), ys[0].gnat);
  const use = plan.n * plan.dose;
  return {
    ys, last, maxGrebe, maxGnat, use,
    checks: [
      { id: 'gnat', ok: maxGnat <= GNAT_GOAL },
      { id: 'grebe', ok: maxGrebe <= GREBE_LIMIT },
      { id: 'budget', ok: use <= BUDGET },
    ],
  };
}

/** 논병아리 번식쌍 비율 (그림용): 지방 농도가 한계에 가까워질수록 줄어든다 */
export const grebeAlive = (ppm) => Math.max(0.02, Math.min(1, 1 / (1 + (ppm / (GREBE_LIMIT * 3)) ** 1.6)));
