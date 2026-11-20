// 사건 01 · 연소의 저울 (파리, 1772–1777)
import { h, fmt, choice, tabs, kv, lineChart, toast } from '../ui.js';
import * as L from '../sim/lavoisier.js';
import { runQuiz, copyButton } from '../quiz.js';
import { createLavoisierScene } from '../scenes/lavoisier.js';

const sim = (ctx) => (ctx.run.sim ||= L.makeRun(ctx.run.seed));
const K = (c) => c + 273.15;
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
const sec = (t) => h('h3', { class: 'sec' }, t);
const callout = (cls, ...c) => h('div', { class: 'callout ' + cls }, ...c);
function paper(title, src, stampText, ...body) {
  return h('div', { class: 'paper' }, stampText ? h('span', { class: 'stamp ' + (stampText === '2차 자료' ? 'secondary' : 'recon') }, stampText) : null,
    h('h4', {}, title), h('div', { class: 'src' }, src), ...body.map((b) => (typeof b === 'string' ? h('p', {}, b) : b)));
}
const goal = (g, why) => callout('', h('b', {}, '목표. '), g, h('br'), h('span', { class: 'sub' }, '왜 하나. ' + why));

/* ================= 1. 사건 기록 ================= */
function stepDossier(ctx) {
  const docs = [
    ['사건 개요', paper('타는 것은 무엇을 잃는가', '파리 · 1772–1777', '재구성',
      '나무는 타고 나면 가벼워집니다. 그런데 금속을 달구면 광택을 잃고 부서지기 쉬운 재(칼크스, 오늘날의 금속 산화물)가 되는데, 이 재는 처음 금속보다 무겁습니다. 같은 불인데 저울은 정반대를 가리킵니다.',
      '1772년 라부아지에는 인과 황을 태워도 무게가 늘어난다는 것을 확인하고 이를 봉인한 메모로 아카데미에 맡겼습니다. 이것은 가설일 뿐이었고, 증명은 몇 해에 걸친 정량 실험으로 이루어졌습니다.',
      callout('warn', h('b', {}, '당신의 임무. '), '"늘어난 무게는 어디서 왔는가"에 실험 자료로 답합니다. 이 사건은 화학공학이 쓰는 질량수지(들어온 것 − 나간 것 = 쌓인 것)의 출발점이기도 합니다.'))],
    ['두 가설', paper('같은 현상, 두 설명', '당시 학계의 두 입장', '2차 자료',
      h('p', {}, h('b', {}, '플로지스톤설. '), '타는 물질은 "플로지스톤"을 품고 있고, 탈 때 그것이 빠져나간다고 봅니다. 그런데 금속은 타면 무거워지므로 "플로지스톤이 가볍다(음의 무게)"는 보조가설을 붙였습니다.'),
      h('p', {}, h('b', {}, '공기결합설. '), '금속이 공기의 한 부분과 결합해 칼크스가 된다고 봅니다. 늘어난 무게는 결합한 기체의 무게여야 합니다. (레이 1630, 이후 라부아지에)'),
      callout('', h('b', {}, '가설을 가르는 법. '), '두 설명은 같은 결과를 설명할 수 있습니다. 한쪽만 맞는 예측, 즉 "두 가설의 예측이 갈리는 측정"이 필요합니다.'))],
    ['실험에서 주의할 점', paper('저울과 기체를 다룰 때', '이 시뮬레이션의 가정', '재구성',
      h('p', {}, h('b', {}, '언제 다는가. '), '뜨거운 물체는 위로 오르는 기류 때문에 가볍게 읽힙니다. 비교는 항상 같은 조건(실온)의 값끼리 합니다.'),
      h('p', {}, h('b', {}, '기체 부피. '), '온도와 압력이 달라지면 같은 양의 기체도 부피가 달라집니다. 두 시점을 비교하려면 같은 조건으로 환산해야 합니다. (이 계산은 자동으로 해 줍니다.)'),
      h('p', {}, h('b', {}, '안전. '), '수은과 수은 화합물은 독성이 있습니다. 오늘날 이 실험은 하지 않으며, 여기서는 수치와 절차만 재구성했습니다.'))],
  ];
  const view = h('div');
  const tb = tabs(docs.map((d) => d[0]), (i) => { view.innerHTML = ''; view.appendChild(docs[i][1]); check(); });
  const check = () => { if (ctx.state.read || tb.api.seen().size >= docs.length) { ctx.state.read = true; ctx.ready(true); } else ctx.ready(false, `자료 ${docs.length - tb.api.seen().size}개를 더 읽어 주세요`); };
  view.appendChild(docs[0][1]);
  ctx.el.append(tb, view);
  check();
}

/* ================= 2. 증거 판별 ================= */
const CARDS = [
  { id: 'A', t: '밀폐한 용기를 가열한 뒤 식혀 달면, 가열 전과 무게가 같다.', a: 'none', why: '물질이 용기를 드나들지 않으면 어느 가설에서도 총량은 그대로입니다. 보존의 확인일 뿐 가설을 가르지는 못합니다.' },
  { id: 'B', t: '밀폐 용기의 목을 깨뜨리면 공기가 들어오고, 그만큼 용기가 무거워진다.', a: 'air', why: '밀폐 안의 기체가 줄어 있었다는 직접 증거입니다. 금속이 공기의 일부를 붙잡았다는 공기결합설만 이것을 예측합니다.' },
  { id: 'C', t: '칼크스를 숯과 함께 가열하면 금속이 되돌아온다.', a: 'none', why: '플로지스톤설은 "숯이 플로지스톤을 준다"로, 공기결합설은 "숯이 결합한 성분을 빼앗는다"로 둘 다 설명합니다.' },
  { id: 'D', t: '수은의 붉은 재는 숯 없이 가열만 해도 수은과 기체로 갈라진다.', a: 'air', why: '플로지스톤을 대 줄 물질이 없는데 금속이 돌아옵니다. 플로지스톤설은 "불이 공급한다"는 가정이 더 필요하고, 공기결합설은 결합했던 기체가 풀려난 것으로 바로 설명합니다.' },
  { id: 'E', t: '숯은 타고 나면 재가 거의 남지 않는다.', a: 'phlo', why: '당시에는 플로지스톤설 쪽이 더 자연스러웠습니다. 기체 생성물(이산화탄소)을 달지 못했기 때문입니다. 열린 계에서는 나간 질량이 장부에서 사라집니다.' },
];
const CLS = [{ value: 'phlo', label: '플로지스톤설 쪽' }, { value: 'air', label: '공기결합설 쪽' }, { value: 'none', label: '가르지 못함' }];
function stepClassify(ctx) {
  const st = ctx.state; st.pick ||= {};
  const root = h('div', { class: 'stack' });
  const render = () => {
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'lead' }, '관찰마다, 어느 가설이 더 잘 예측하는지 고르세요. 두 가설이 똑같이 설명하면 "가르지 못함"입니다. 고르면 바로 해설이 나옵니다.'));
    CARDS.forEach((c) => {
      const pick = st.pick[c.id], done = pick !== undefined;
      const box = h('div', { class: 'callout ' + (done ? (pick === c.a ? 'good' : 'bad') : '') });
      box.appendChild(h('div', { style: { marginBottom: '8px' } }, h('b', {}, c.id + '. '), c.t));
      const row = h('div', { class: 'row' });
      CLS.forEach((o) => row.appendChild(h('button', { class: 'btn sm' + (pick === o.value ? ' primary' : ''), disabled: done, onclick: () => { st.pick[c.id] = o.value; render(); } }, o.label)));
      box.appendChild(row);
      if (done) box.appendChild(h('p', { class: 'sub', style: { margin: '8px 0 0' } }, (pick === c.a ? '맞습니다. ' : `정답은 "${CLS.find((o) => o.value === c.a).label}". `) + c.why));
      root.appendChild(box);
    });
    const n = Object.keys(st.pick).length;
    if (n === CARDS.length) {
      const right = CARDS.filter((c) => st.pick[c.id] === c.a).length;
      ctx.score('classify', right / CARDS.length, 20, '증거 판별');
      root.appendChild(callout('good', h('b', {}, `${right}/${CARDS.length}개 일치. `), '핵심은 B와 D입니다. 그래서 실험에서는 "밀폐한 채 먼저 달고, 그다음에 연다"와 "붉은 가루를 가열만 한다"를 확인합니다.'));
      ctx.ready(true);
    } else ctx.ready(false, `${CARDS.length - n}개를 더 고르세요`);
  };
  render();
  ctx.el.appendChild(root);
}

/* ================= 3. 실험 ================= */
const nb = (ctx, tag, label, value, unit, digits, note, flag) => ctx.notebook.add({ tag, label, value, unit, digits, note, flag });

function stepLab(ctx) {
  const S = sim(ctx), api = ctx.scene.api;
  const lab = (ctx.run.lab ||= { tab: 0, r: { stage: 0, bursts: 0, furnace: 2, heated: false }, b: { readings: [] }, g: { done: false } });
  if (!ctx.notebook.get('V')) { nb(ctx, 'V', '레토르트 부피', S.retort.V, 'L', 1); nb(ctx, 'T0', '실온', S.T0 - 273.15, '°C', 1); nb(ctx, 'P0', '대기압', S.P0mm, 'mmHg', 0); }
  const M0true = () => S.retort.vessel + S.retort.mSn + (S.P0 * S.retort.V / (L.R * S.T0)) * L.MW.air;
  const tilt = (m) => api.setTilt(clamp((m - lab.r.M0) * 0.35, -0.12, 0.12));
  const root = h('div', { class: 'stack' }), body = h('div', { class: 'stack' });
  const tb = tabs(['① 밀폐 레토르트', '② 수은 종', '③ 붉은 수은 가루'], (i) => { lab.tab = i; render(); }, lab.tab);
  root.append(tb, body);
  const gate = () => {
    const miss = [lab.r.stage < 4 && '①', !lab.b.readings.some((x) => x.days >= 12) && '②', !lab.g.done && '③'].filter(Boolean);
    if (!miss.length) { ctx.score('lab', 1 - 0.25 * lab.r.bursts, 10, '실험 수행'); ctx.ready(true, '세 실험을 모두 마쳤습니다'); } else ctx.ready(false, `남은 실험: ${miss.join(' ')}`);
  };
  const btn = (label, fn, cls = 'primary') => h('button', { class: 'btn ' + cls, onclick: () => { fn(); render(); } }, label);

  function retort() {
    const r = lab.r, el = body;
    el.appendChild(goal('밀폐한 채 달아 총 무게를 먼저 확인하고, 연 뒤의 무게 변화를 금속의 증가분과 비교합니다.', '두 가설의 예측이 갈리는 곳은 "열었을 때 무슨 일이 일어나는가"입니다.'));
    const steps = ['처음 무게', '가열', '식은 뒤 무게', '개봉 후 무게'];
    el.appendChild(h('div', { class: 'row sub' }, ...steps.map((s, i) => h('span', { style: { color: i === r.stage ? 'var(--accent)' : i < r.stage ? 'var(--good)' : 'var(--muted)' } }, `${i < r.stage ? '✓' : i + 1} ${s}`))));
    const log = [];
    if (r.M0 != null) log.push(['M0 (처음, 밀폐)', `${fmt(r.M0, 2)} g`]);
    if (r.M1 != null) log.push(['M1 (식은 뒤, 밀폐)', `${fmt(r.M1, 2)} g`], ['안쪽 압력이 바깥보다', `${fmt(r.dP, 1)} mmHg 낮음`]);
    if (r.M2 != null) log.push(['M2 (개봉 직후)', `${fmt(r.M2, 2)} g`], ['금속(주석+재) 질량', `${fmt(r.mc, 2)} g (처음 ${fmt(r.mSn, 2)} g)`]);
    if (r.stage === 0) {
      el.append(h('p', { class: 'sub' }, '① 주석을 레토르트에 넣고 목을 녹여 막은 뒤, 주석과 용기 전체의 무게를 답니다.'),
        btn('달기', () => { r.mSn = L.readBalance(S, S.retort.mSn); r.M0true = M0true(); r.M0 = L.readBalance(S, r.M0true); nb(ctx, 'mSn', '주석 처음 질량', r.mSn, 'g', 2); nb(ctx, 'M0', '봉인 직후 전체 M0', r.M0, 'g', 2); ctx.fly('balance'); api.weigh(); api.setTilt(0); api.setRetort({ calx: 0, tipBroken: false, hot: 0 }); api.setFurnace(0); r.stage = 1; }));
    } else if (r.stage === 1 && !r.heated) {
      el.append(h('p', { class: 'sub' }, '② 불의 세기를 고르세요. 밀폐한 유리는 압력이 한계(2.2 atm)를 넘으면 깨집니다. 센 불은 깨질 위험이 있는지 아래 숫자로 확인하세요.'),
        choice({ options: L.FURNACE.map((f) => ({ value: f.id, label: `${f.label} (${f.C} °C)`, desc: `최고 압력 약 ${fmt(L.peakAtm(S, f.C), 2)} atm` + (L.peakAtm(S, f.C) > L.BURST_ATM ? ' — 한계 초과' : '') })), value: r.furnace, name: '불의 세기', onChange: (v) => { r.furnace = v; render(); } }),
        btn('12시간 가열', () => {
          const hh = L.retortHeat(S, r.furnace, 12);
          if (hh.burst) { r.bursts++; toast('레토르트가 깨졌습니다. 다시 봉인합니다'); r.stage = 0; api.setFurnace(0); api.setRetort({ calx: 0, hot: 0 }); return; }
          api.setFurnace(hh.F.power); api.setRetort({ calx: clamp(hh.f / 0.6, 0, 1), hot: 1 }); ctx.fly('furnace', 1.6); r.heated = true; r.heat = hh; nb(ctx, 'fire', '가열 조건', `${hh.F.C} °C, 12 h`, '', 0);
        }));
    } else if (r.stage === 1 && r.heated) {
      el.append(callout('warn', '가열이 끝났습니다. 레토르트는 아직 뜨겁습니다. 지금 바로 달면 어떻게 읽힐까요? 선택 사항이니 한번 달아 보세요.'),
        h('div', { class: 'row' },
          btn('뜨거운 채로 달기', () => { r.hot = L.readBalance(S, r.M0true - L.hotShift(S, r.heat.F.C)); nb(ctx, 'Mhot', '뜨거울 때 단 값', r.hot, 'g', 2, '뜨거운 상태의 측정', true); ctx.fly('balance'); api.weigh(); tilt(r.hot); }, 'ghost'),
          btn('불을 끄고 식히기', () => { api.setFurnace(0); api.setRetort({ hot: 0 }); r.stage = 2; toast('실온까지 식혔습니다'); })));
      if (r.hot != null) el.appendChild(callout('bad', h('b', {}, `${fmt(r.hot, 2)} g `), `(처음보다 ${fmt(r.M0 - r.hot, 2)} g 가벼움). 용기에서 아무것도 빠지지 않았는데도 가볍게 읽혔습니다. 뜨거울 때의 값은 쓸 수 없고, 식은 뒤에 달아야 합니다.`));
    } else if (r.stage === 2) {
      el.append(h('p', { class: 'sub' }, '③ 목은 아직 막힌 채입니다. 식은 레토르트의 무게(M1)를 달고, 수은 마노미터로 안쪽 압력이 바깥보다 얼마나 낮은지 읽습니다.'),
        btn('달고 압력 읽기', () => {
          r.M1 = L.readBalance(S, r.M0true); r.dP = Math.max(0, r.heat.dP_atm * L.MMHG + L.gauss(S.r) * S.noise.P);
          nb(ctx, 'M1', '식은 뒤 전체 M1', r.M1, 'g', 2); nb(ctx, 'dP', '안쪽 압력 감소', r.dP, 'mmHg', 1); ctx.fly('balance'); api.weigh(); tilt(r.M1); r.stage = 3;
        }));
    } else if (r.stage === 3) {
      el.append(h('p', { class: 'sub' }, '④ 목을 깨뜨리면 무슨 일이 일어날까요? 깨뜨린 즉시 용기째 다시 달고, 안의 주석과 재도 꺼내 답니다.'),
        btn('목을 깨고 달기', () => {
          r.M2 = L.readBalance(S, r.M0true + r.heat.gainAir); r.mc = L.readBalance(S, S.retort.mSn + r.heat.gainMetal);
          nb(ctx, 'M2', '개봉 직후 전체 M2', r.M2, 'g', 2); nb(ctx, 'mc', '금속(주석+재) 질량', r.mc, 'g', 2);
          api.setRetort({ tipBroken: true }); toast('쉬익, 바깥 공기가 들어옵니다'); api.weigh(); tilt(r.M2); r.stage = 4;
        }));
    } else el.appendChild(callout('good', '실험 ①을 마쳤습니다. 분석 단계에서 이 값들을 비교합니다.'));
    if (log.length) el.appendChild(h('div', { style: { marginTop: '8px' } }, ...log.map(([a, b]) => kv(a, b))));
    if (r.bursts) el.appendChild(h('p', { class: 'sub', style: { color: 'var(--warn)' } }, `레토르트가 ${r.bursts}번 깨졌습니다.`));
  }

  function bell() {
    const b = lab.b, rd = b.readings, el = body;
    el.appendChild(goal('수은 위에 가둔 공기의 부피가 가열 후 얼마나 줄어드는지 읽습니다.', '금속이 공기 전체와 결합하는지, 일부와만 결합하는지는 부피로 알 수 있습니다.'));
    const add = (d) => {
      const x = L.bellRead(S, d); rd.push(x); rd.sort((p, q) => p.days - q.days);
      api.setBell({ level: clamp(x.truth.fTrue / L.Y_O2, 0, 1), calx: clamp(d / 12, 0, 1), lamp: d > 0 }); ctx.fly('belljar');
      if (d === 0) nb(ctx, 'b0', '0일 부피 V0', x.V, 'cm³', 1); else nb(ctx, 'bV', `${d}일 후 부피`, x.V, 'cm³', 1);
    };
    const has = (d) => rd.some((x) => x.days === d);
    const row = h('div', { class: 'row' });
    [[0, '① 처음 읽기'], [4, '② 4일 후 읽기'], [12, '③ 12일 후 읽기']].forEach(([d, label], i) => {
      const prev = i === 0 || has([0, 4, 12][i - 1]);
      row.appendChild(h('button', { class: 'btn ' + (has(d) ? 'ghost' : prev ? 'primary' : ''), disabled: has(d) || !prev, onclick: () => { add(d); render(); } }, (has(d) ? '✓ ' : '') + label));
    });
    el.appendChild(row);
    if (rd.length) {
      const t = h('table', { class: 'data' }, h('tr', {}, ...['일', 'V (cm³)', 'h (mm)', 'T (°C)', 'P (mmHg)'].map((x) => h('th', {}, x))));
      rd.forEach((x) => t.appendChild(h('tr', {}, h('td', {}, x.days), h('td', { class: 'n' }, fmt(x.V, 1)), h('td', { class: 'n' }, fmt(x.h, 1)), h('td', { class: 'n' }, fmt(x.T, 1)), h('td', { class: 'n' }, fmt(x.P, 1)))));
      el.appendChild(t);
      el.appendChild(h('p', { class: 'sub' }, 'h는 종 안의 수은면이 바깥보다 높은 정도입니다. 온도·기압과 함께 분석 단계에서 자동으로 보정합니다.'));
    }
    if (rd.length > 1) el.appendChild(lineChart({ w: 400, h: 170, x: { min: 0, max: 12, ticks: 6, label: '가열 일수' }, y: { min: 0.7, max: 1.02, ticks: 4, fmt: (v) => v.toFixed(2), label: 'V / V0 (보정 전)' }, series: [{ pts: rd.map((x) => [x.days, x.V / rd[0].V]), color: 'var(--accent)', dots: 3.5 }], title: '종 안 공기의 부피 (보정 전)' }));
    if (has(12)) el.appendChild(h('div', { class: 'row' }, btn('남은 기체로 촛불 시험', () => { api.setCandle('n2'); ctx.fly('candle'); nb(ctx, 'obsN2', '종 속 남은 기체', '촛불이 곧 꺼짐', '', 0); toast('촛불이 꺼집니다'); }, 'ghost')));
  }

  function hgo() {
    const g = lab.g, el = body;
    el.appendChild(goal('붉은 수은 가루(HgO)를 숯 없이 가열만 해서, 금속과 기체로 돌아가는지 확인합니다.', '금속이 공기와 결합했다면, 칼크스를 가열하면 그 기체가 다시 나와야 합니다.'));
    if (g.m0 == null) el.append(h('p', { class: 'sub' }, '① 붉은 가루의 처음 질량을 답니다.'), btn('달기', () => { g.m0 = L.readBalance(S, S.hgo.m); nb(ctx, 'hm0', '붉은 가루 처음 질량', g.m0, 'g', 2); ctx.fly('balance'); api.weigh(); }));
    else if (!g.done) el.append(kv('붉은 가루', `${fmt(g.m0, 2)} g`), h('p', { class: 'sub' }, '② 30분 가열한 뒤, 생긴 기체의 부피와 수은 방울, 남은 가루를 답니다.'),
      btn('30분 가열하고 재기', () => {
        const x = L.hgoRead(S, 30); g.final = x; g.done = true; api.setFurnace(0.85); api.setRetort({ hot: 0.6 }); ctx.fly('furnace');
        nb(ctx, 'hV', '모은 기체 부피', x.V, 'cm³', 1); nb(ctx, 'hHg', '모은 수은', x.Hg, 'g', 2); nb(ctx, 'hRes', '남은 붉은 가루', x.residue, 'g', 2); nb(ctx, 'hT', '기체 온도', x.T, '°C', 1); nb(ctx, 'hP', '기체 압력', x.P, 'mmHg', 0);
      }));
    else {
      el.append(kv('처음 붉은 가루', `${fmt(g.m0, 2)} g`), kv('남은 붉은 가루', `${fmt(g.final.residue, 2)} g`), kv('모은 수은', `${fmt(g.final.Hg, 2)} g`), kv('모은 기체', `${fmt(g.final.V, 1)} cm³`),
        h('div', { class: 'row' }, btn('얻은 기체로 촛불 시험', () => { api.setCandle('o2'); ctx.fly('candle'); nb(ctx, 'obsO2', '붉은 가루에서 나온 기체', '촛불이 훨씬 밝게 탐', '', 0); toast('촛불이 눈부시게 탑니다'); }, 'ghost')));
      if (ctx.notebook.get('obsO2')) el.appendChild(callout('good', '이 기체에서는 촛불이 훨씬 밝게 탔습니다. 공기 전체가 아니라, 공기 중 연소를 돕는 한 성분이 금속과 결합했다가 풀려난 것입니다.'));
    }
  }

  function render() { body.innerHTML = ''; [retort, bell, hgo][lab.tab](); gate(); }
  ctx.fly('overview'); render(); ctx.el.appendChild(root);
}

/* ================= 4. 분석 ================= */
function stepAnalysis(ctx) {
  const S = sim(ctx), nbv = (t) => ctx.notebook.val(t), lab = ctx.run.lab, st = ctx.state;
  const r0 = lab.b.readings.find((x) => x.days === 0), rb = lab.b.readings.find((x) => x.days === 12);
  const g = lab.g.final;
  const dClosed = nbv('M1') - nbv('M0'), dOpen = nbv('M2') - nbv('M1'), dMetal = nbv('mc') - nbv('mSn'), ratio = dOpen / dMetal;
  const Vc = rb.V * ((rb.P - rb.h) / (r0.P - r0.h)) * (K(r0.T) / K(rb.T));
  const fBell = (1 - Vc / r0.V) * 100, fRaw = (1 - rb.V / r0.V) * 100;
  const o2gas = ((g.P / L.MMHG) * (g.V / 1000)) / (L.R * K(g.T)) * L.MW.O2;
  const dec = lab.g.m0 - g.residue, sum = g.Hg + o2gas;
  const qs = [
    { k: 'q1', type: 'mc', title: '1. 밀폐한 채 가열했을 때 총 무게', body: '밀폐 상태에서 가열 전(M0)과 식은 뒤(M1)를 비교한 값입니다.',
      data: [['M0', `${fmt(nbv('M0'), 2)} g`], ['M1', `${fmt(nbv('M1'), 2)} g`], ['M1 − M0', `${fmt(dClosed, 2)} g`]],
      opts: [['a', '변하지 않았다 (저울 오차 안)'], ['b', '눈에 띄게 늘었다'], ['c', '눈에 띄게 줄었다']], ans: 'a', hint: '저울의 읽기 오차는 약 0.01 g입니다.',
      sol: '물질이 용기를 드나들지 않으면 총 무게는 보존됩니다. 다만 이것은 두 가설 모두와 맞아서, 이 결과만으로는 가설을 가르지 못합니다.' },
    { k: 'q2', type: 'mc', title: '2. 열었을 때 늘어난 무게와 금속의 증가분', body: '목을 깨자 늘어난 무게(M2 − M1)와, 주석이 재가 되면서 늘어난 무게를 비교합니다.',
      data: [['열었을 때 늘어난 무게', `${fmt(dOpen, 2)} g`], ['금속이 늘어난 무게', `${fmt(dMetal, 2)} g`], ['비 (앞 ÷ 뒤)', fmt(ratio, 2)]],
      opts: [['a', '서로 비슷하다 (10% 안팎의 차이)'], ['b', '전혀 관계가 없다'], ['c', '금속의 증가분이 훨씬 작다']], ans: 'a', hint: '비가 1에 가까우면 비슷하다고 봅니다.',
      sol: '들어온 공기의 무게가 금속이 얻은 무게와 거의 같습니다. 금속이 공기의 일부를 붙잡았다는 공기결합설의 예측과 맞고, 플로지스톤설로는 설명할 수 없는 결과입니다.' },
    { k: 'q3', type: 'mc', title: '3. 왜 비가 정확히 1이 아닐까', body: '비는 약 0.9에 가깝게 나옵니다. 이유로 가장 알맞은 것은?',
      opts: [['a', '없어진 기체는 산소(분자량 32)이고, 들어온 기체는 공기(평균 29)라서 같은 양이어도 무게가 다르다'], ['b', '저울이 항상 10% 틀리기 때문이다'], ['c', '들어온 공기가 일부 굳어 버리기 때문이다']], ans: 'a', hint: '"무게"가 아니라 "양(몰수)"이 같다고 생각해 보세요.',
      sol: '사라진 것은 산소만이고 들어온 것은 산소와 질소가 섞인 공기입니다. 같은 몰수라도 무게는 29/32배가 됩니다. 이처럼 무게가 아닌 양(몰)으로 맞추는 것이 화학공학 물질수지의 기본입니다.' },
    { k: 'q4', type: 'mc', title: '4. 수은 종: 소비된 공기의 비율', body: '온도, 기압, 종 안 수은면 높이를 같은 조건으로 환산하면, 처음 공기 중 얼마가 줄었는지 계산됩니다. (자동 계산)',
      data: [['보정 전 감소', `${fmt(fRaw, 1)} %`], ['보정 후 감소', `${fmt(fBell, 1)} %`], ['보정으로 달라진 폭', `${fmt(Math.abs(fBell - fRaw), 1)} %p`]],
      opts: [['a', '약 5% (거의 안 줄었다)'], ['b', '약 1/6~1/5 (일부만 줄었다)'], ['c', '약 1/2 (절반이 줄었다)']], ans: 'b', hint: '보정 후 값에 가장 가까운 것을 고르세요.',
      sol: `공기 전체가 아니라 일부(약 1/5)만 금속과 결합했습니다. 라부아지에는 약 1/6로 보고했고, 오늘날 공기 중 산소는 약 21%입니다. 보정하지 않으면 ${fmt(Math.abs(fBell - fRaw), 1)}%p 어긋납니다.` },
    { k: 'q5', type: 'mc', title: '5. 붉은 가루의 분해: 질량이 맞는가', body: '분해된 가루의 질량과, 얻은 수은 + 기체(부피로 계산한 산소 질량)의 합을 비교합니다. (자동 계산)',
      data: [['분해된 가루 (처음 − 남은)', `${fmt(dec, 2)} g`], ['모은 수은', `${fmt(g.Hg, 2)} g`], ['기체의 질량 (PV/RT × 32)', `${fmt(o2gas, 2)} g`], ['수은 + 기체', `${fmt(sum, 2)} g`]],
      opts: [['a', '거의 같다 (몇 % 안)'], ['b', '합이 훨씬 크다'], ['c', '합이 훨씬 작다']], ans: 'a', hint: '네 숫자를 위에서 아래로 비교해 보세요.',
      sol: '가루가 사라진 만큼의 질량이 수은과 기체로 나타났습니다. 합성(금속 + 기체 → 가루)과 분해(가루 → 금속 + 기체)가 모두 질량을 보존합니다. 작은 차이는 수은이 일부 증발하거나 튀어서 생깁니다.' },
  ];
  const root = h('div', { class: 'stack' }), conc = h('div', { class: 'stack' });
  st.c ||= { claim: null, ev: [], done: false };
  const claims = [['a', '금속은 타면서 플로지스톤을 잃고, 불의 입자가 붙어서 무거워진다'], ['b', '금속이 타면 공기의 한 성분과 결합하고, 늘어난 무게는 그 성분의 무게다'], ['c', '무게가 늘어난 것은 부력 때문에 생긴 측정 착오다']];
  const evs = [
    { v: 'e1', ok: true, t: '열었더니 공기가 들어왔고, 그 무게가 금속의 증가분과 비슷했다' },
    { v: 'e2', ok: true, t: '수은 종 안의 공기가 약 1/5 줄었다' },
    { v: 'e3', ok: true, t: '붉은 가루가 가열만으로 수은과 기체로 갈라졌고 질량이 맞았다' },
    { v: 'e4', ok: false, t: '밀폐한 채 달았을 때 총 무게가 변하지 않았다' },
    { v: 'e5', ok: false, t: '촛불이 종 속 남은 기체에서 곧 꺼졌다' },
    { v: 'e6', ok: false, t: '뜨거울 때 달면 더 가벼웠다' },
  ];
  const paintConc = () => {
    conc.innerHTML = '';
    const c = st.c;
    conc.appendChild(sec('결론 쓰기'));
    conc.appendChild(h('p', { class: 'sub' }, '지금까지의 결과로 결론을 정리합니다. 주장 하나와 근거 두 개를 고르세요.'));
    const cc = choice({ options: claims.map(([v, l]) => ({ value: v, label: l })), value: c.claim, name: '주장', onChange: (v) => { if (!c.done) { c.claim = v; sub.disabled = !(c.claim && c.ev.length === 2); } } });
    const ee = choice({ options: evs.map((x) => ({ value: x.v, label: x.t })), value: c.ev, multi: true, max: 2, name: '근거', onChange: (v) => { if (!c.done) { c.ev = v; sub.disabled = !(c.claim && c.ev.length === 2); } } });
    const sub = h('button', { class: 'btn primary', disabled: !(c.claim && c.ev.length === 2) || c.done, onclick: () => {
      c.done = true; const ok = c.ev.filter((v) => evs.find((x) => x.v === v).ok).length;
      ctx.score('report', (c.claim === 'b' ? 0.5 : 0) + 0.5 * (ok / 2), 30, '결론'); ctx.ready(true); paintConc();
    } }, '결론 제출');
    if (c.done) {
      cc.api.buttons().forEach((b, i) => { b.disabled = true; if (claims[i][0] === 'b') b.classList.add('right'); else if (c.claim === claims[i][0]) b.classList.add('wrong'); });
      ee.api.buttons().forEach((b, i) => { b.disabled = true; if (evs[i].ok) b.classList.add('right'); else if (c.ev.includes(evs[i].v)) b.classList.add('wrong'); });
    }
    conc.append(cc, sec('근거'), ee, sub);
    if (c.done) conc.appendChild(callout(c.claim === 'b' ? 'good' : 'bad', h('b', {}, '해설. '), '결정적인 근거는 가설의 예측이 갈리는 세 가지(열었을 때 들어온 공기, 공기 부피 감소, 붉은 가루의 분해)입니다. 밀폐 총 무게 불변, 촛불 소등, 뜨거울 때의 값은 가설을 가르지 못하거나 측정의 함정입니다. 다만 질량이 보존된다는 것 자체는 이 논증의 전제이지 증명된 결론이 아닙니다.'));
  };
  const quiz = runQuiz(ctx, qs, { scoreKey: 'analysis', weight: 40, label: '결과 해석', intro: '숫자는 자동으로 계산해 두었습니다. 결과를 보고 무엇을 뜻하는지 고르세요.', onDone: () => { st.qdone = true; conc.style.display = ''; ctx.ready(st.c.done); } });
  root.append(quiz, conc); paintConc();
  conc.style.display = qs.every((q) => st.q?.[q.k]?.ok || st.q?.[q.k]?.shown) ? '' : 'none';
  if (!st.c.done) ctx.ready(false, '문항과 결론을 마치세요');
  ctx.el.appendChild(root);
  ctx.fly('overview');
}

/* ================= 5. 사건 해설 ================= */
function stepDebrief(ctx) {
  const res = (ctx.state.res ||= ctx.finish());
  const lab = ctx.run.lab, nbv = (t) => ctx.notebook.val(t);
  const wrap = h('div', { class: 'stack' });
  wrap.appendChild(h('div', { class: 'score-ring' }, h('div', { class: 'ring', style: { '--p': res.total } }, h('b', {}, res.total)), h('div', {}, h('div', { style: { fontFamily: 'var(--serif)', fontSize: '20px' } }, res.rank), h('div', { class: 'sub' }, '단계별 점수의 가중 평균'))));
  res.items.forEach((s) => wrap.appendChild(h('div', {}, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'sub' }, s.label), h('span', { class: 'sub' }, Math.round(s.value * 100) + '점')), h('div', { class: 'bar' }, h('i', { style: { width: s.value * 100 + '%' } })))));
  wrap.appendChild(sec('실제 역사는 어떻게 흘렀나'));
  wrap.appendChild(h('ul', { class: 'timeline' },
    ...[['1630', '레이: 주석·납이 가열 후 무거워진다고 기록하고 공기가 붙은 것이라 해석한다.'],
      ['1772', '라부아지에: 인·황 연소에서 무게 증가를 확인하고 봉인 메모를 제출한다.'],
      ['1774', '밀폐 레토르트 실험. 같은 해 프리스틀리가 붉은 수은회에서 기체를 얻고, 가을에 파리에서 라부아지에와 이야기를 나눈다.'],
      ['1777', '수은을 12일 가열하는 부피 실험. 공기의 약 6분의 1이 줄었다고 보고한다.'],
      ['1789', '《화학 원론》: 반응의 앞뒤 질량이 같다는 원리를 체계의 바탕에 둔다.']].map(([y, t]) => h('li', {}, h('b', {}, y), t))));
  wrap.appendChild(sec('화학공학과 이어지는 곳'));
  wrap.appendChild(callout('', h('b', {}, '질량수지. '), '들어온 것 − 나간 것 + 생성된 것 = 쌓인 것. 열린 계에서 기체 생성물을 달지 못하면 타는 물질이 가벼워지는 것처럼 보입니다. 이 장부는 오늘날 모든 공정 설계의 첫 계산이고, 다음 사건(하버–보슈)의 순환 루프에서도 그대로 쓰입니다.'));
  wrap.appendChild(sec('함께 생각해 볼 것'));
  wrap.appendChild(h('ul', { class: 'sub', style: { paddingLeft: '18px', margin: 0 } },
    h('li', {}, '마리안 폴즈(라부아지에 부인)는 실험 기록과 도판, 번역을 맡은 공동 작업자였다.'),
    h('li', {}, '프리스틀리와 셸레도 산소를 독립적으로 얻었다. 누가 "발견"했는가는 단순하지 않다.'),
    h('li', {}, '라부아지에도 틀렸다. 산소가 모든 산의 필수 성분이라 믿었고, 열을 "칼로릭"이라는 물질로 다뤘다.'),
    h('li', {}, '이 게임의 수치는 현대 정밀도로 재구성한 것이며 실제 실험값이 아니다.')));
  const text = () => `[사건 01 · 연소의 저울] 금속을 태우면 왜 무거워지는지를 밀폐 레토르트, 수은 종, 붉은 수은 가루 실험으로 재구성해 조사함. `
    + `밀폐 상태 총 무게 변화 ${fmt(nbv('M1') - nbv('M0'), 2)} g(보존), 개봉 시 늘어난 무게 ${fmt(nbv('M2') - nbv('M1'), 2)} g과 금속 증가분 ${fmt(nbv('mc') - nbv('mSn'), 2)} g이 비슷함을 확인함. `
    + `공기 부피가 약 1/5 줄고, 붉은 가루가 가열만으로 금속과 기체로 분해됨을 근거로 "금속이 공기 중 한 성분과 결합한다"고 결론 내림. 질량 보존이 전제임을 한계로 정리함. (결과 ${res.total}점)`;
  wrap.appendChild(sec('활동 기록 초안'));
  wrap.appendChild(h('p', { class: 'sub' }, '내가 한 활동을 정리한 초안입니다. 그대로 쓰지 말고, 실제로 한 것과 느낀 점을 직접 고쳐 쓰세요.'));
  wrap.appendChild(h('div', { class: 'paper', style: { fontSize: '13px' } }, text()));
  wrap.appendChild(h('div', { class: 'row', style: { marginTop: '8px' } }, copyButton(text), h('button', { class: 'btn primary', onclick: () => ctx.exit() }, '사건 목록으로'), h('button', { class: 'btn', onclick: () => ctx.restart() }, '다시 조사하기')));
  ctx.el.appendChild(wrap);
  ctx.fly('overview');
}

export default {
  id: 'lavoisier', no: '01', year: '1774', title: '연소의 저울',
  blurb: '금속을 태우면 왜 무거워질까. 밀폐 레토르트, 수은 종, 붉은 수은 가루 실험으로 두 가설을 가르는 증거를 찾는다.',
  tags: [{ label: '화학사', on: false }, { label: '질량수지', on: true }, { label: '기체 보정', on: false }],
  accent: '#d3a355',
  viewButtons: [{ id: 'overview', label: '전체' }, { id: 'balance', label: '저울' }, { id: 'furnace', label: '가열로' }, { id: 'belljar', label: '수은 종' }, { id: 'candle', label: '촛불' }],
  createScene(e) { return createLavoisierScene(e); },
  steps: [
    { id: 'file', label: '사건 기록', title: '사건 기록', sub: '자료를 읽으세요', gate: '자료를 모두 읽으세요', view: 'overview', mount: stepDossier },
    { id: 'classify', label: '증거 판별', title: '증거 판별', sub: '무엇이 가설을 가르는가', gate: '관찰을 모두 고르세요', view: 'overview', mount: stepClassify },
    { id: 'lab', label: '실험', title: '실험', sub: '세 가지를 직접 확인합니다', gate: '세 실험을 모두 마치세요', view: 'overview', mount: stepLab },
    { id: 'analysis', label: '분석·결론', title: '분석과 결론', sub: '결과를 해석하고 결론을 씁니다', gate: '문항과 결론을 마치세요', view: 'overview', mount: stepAnalysis },
    { id: 'debrief', label: '사건 해설', title: '사건 해설', sub: '결과와 실제 역사', view: 'overview', mount: stepDebrief },
  ],
};
