// 사건 03 · 침묵의 봄 (클리어 호수 1949–1959, 레이첼 카슨 『침묵의 봄』에 소개된 사례)
import { h, fmt, slider, choice, tabs, kv, lineChart, legend, toast } from '../ui.js';
import * as S from '../sim/silentspring.js';
import { goal, sec, callout, paper, readDocs, mcq, scoreView } from '../kit.js';
import { copyButton } from '../quiz.js';
import { createLakeScene } from '../scenes/lake.js';

const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
const NS = 'http://www.w3.org/2000/svg';
const nbadd = (ctx, tag, label, value, unit, digits, note, flag) => ctx.notebook.add({ tag, label, value, unit, digits, note, flag });
const ppmTxt = (v) => (v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 1 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3));

/** 선택 문항 하나. 결과 점수는 ctx.state.sc[key]에 저장한다. */
function Q(ctx, key, spec, after) {
  const st = ((ctx.state.mc ||= {})[key] ||= {});
  return mcq({ store: st, ...spec, onResolve: (sc) => { (ctx.state.sc ||= {})[key] = sc; after?.(); } });
}
const qScore = (ctx, keys) => keys.reduce((a, k) => a + (ctx.state.sc?.[k] ?? 0), 0) / keys.length;

/* ================= 1. 사건 기록 ================= */
function stepDossier(ctx) {
  readDocs(ctx, [
    ['사건 개요', paper('호수의 각다귀와 약제', '미국 캘리포니아 클리어 호수 · 1949–1959', '재구성',
      '클리어 호수는 캘리포니아 북부의 큰 호수로, 호숫가 휴양지의 주민과 관광객은 해마다 늘어나는 각다귀(모기와 닮은 작은 곤충) 때문에 괴로워했습니다. 1949년 당국은 DDT와 가까운 약제 DDD를 호수에 뿌려 유충을 잡기로 합니다. 물속 농도는 약 0.02 ppm이 되도록 맞췄습니다. 이 농도는 사람에게도 해가 없는 수준이라고 여겨졌습니다.',
      '각다귀는 크게 줄었지만 몇 해 뒤 다시 늘었고, 1954년과 1957년에 같은 약제를 다시 뿌렸습니다. 그 사이 호수의 논병아리가 눈에 띄게 줄고 죽은 새가 발견되었습니다. 기록에 따르면 1,000쌍이 넘던 번식쌍이 1950년대 말에는 수십 쌍 아래로 떨어졌습니다.',
      callout('warn', h('b', {}, '당신의 임무. '), '약제가 왜 물 속 0.02 ppm에서 새의 몸 속 수천 ppm까지 올라갔는지 실험으로 이해하고, 각다귀는 줄이되 새는 지키는 살포 계획을 세웁니다.'))],
    ['알아 두기', paper('이 사건을 읽는 데 필요한 말', '용어', '2차 자료',
      h('p', {}, h('b', {}, 'ppm. '), '백만분의 일입니다. 물 1,000 L(1톤)에 약제 0.02 g이 녹아 있으면 0.02 ppm입니다.'),
      h('p', {}, h('b', {}, '지방에 잘 녹는 물질. '), '기름과 물을 섞었을 때 기름 쪽에 많이 녹는 물질은, 생물의 몸에서도 물보다 지방 조직에 모입니다.'),
      h('p', {}, h('b', {}, '반감기. '), '물질의 양이 절반으로 줄어드는 데 걸리는 시간입니다. 반감기가 길면 오래 남습니다.'),
      h('p', {}, h('b', {}, '먹이사슬. '), '플랑크톤 → 작은 물고기 → 큰 물고기 → 새 순으로 먹고 먹힙니다. 먹는 쪽은 많은 먹이를 먹으므로, 먹이 속 물질이 분해되지 않으면 몸에 쌓입니다.'))],
    ['책 속의 사건', paper('『침묵의 봄』', '레이철 카슨, 1962', '2차 자료',
      h('p', {}, '레이철 카슨은 『침묵의 봄』에서 살충제가 먹이사슬을 따라 농축되는 사례들을 모았고, 클리어 호수의 논병아리 사건이 그 가운데 하나로 소개됩니다.'),
      callout('', h('b', {}, '이 게임에서. '), '책의 문장을 옮기지 않고, 사건의 핵심인 "왜 농도가 올라가는가"를 직접 실험하고 계산하는 방식으로 재구성했습니다. 활동을 마치면 책에서 해당 부분을 직접 읽고 비교해 보세요.'),
      callout('warn', h('b', {}, '모델의 한계. '), '수치는 문헌에 인용되는 규모(물 0.02 ppm, 플랑크톤 수 ppm, 큰 물고기 수십~수천 ppm, 논병아리 지방 약 1,600 ppm)를 따라 맞춘 교육용 모델입니다. 출처마다 값이 다르고, 약제 B·C와 판정 기준(각다귀 30 %, 새 100 ppm 등)은 게임을 위해 정했습니다.'))],
  ]);
  ctx.fly('overview');
}

/* ================= 2. 분배와 분해 실험 ================= */
const SUBS = [
  { id: 'sugar', name: '설탕', logKow: -2.0, note: '물에 아주 잘 녹는 물질(비교용)' },
  { id: 'fast', name: '약제 C', logKow: S.COMPOUNDS.fast.logKow },
  { id: 'mid', name: '약제 B', logKow: S.COMPOUNDS.mid.logKow },
  { id: 'ddd', name: 'DDD', logKow: S.COMPOUNDS.ddd.logKow },
];
function funnel(frac, animate) {
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 220 210'); svg.setAttribute('class', 'chart'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', '기름과 물이 든 분액 깔때기');
  const dots = 40, nOil = Math.round(frac * dots);
  let s = `<rect x="40" y="18" width="140" height="44" fill="#d9b24a" opacity=".55"/><rect x="40" y="62" width="140" height="130" fill="#3a8aa8" opacity=".5"/><rect x="40" y="18" width="140" height="174" fill="none" stroke="#9fb0bd" stroke-width="1.5"/>
  <text x="186" y="44" style="fill:#e8c76a;font-size:11px">기름</text><text x="186" y="130" style="fill:#7fc4de;font-size:11px">물</text>`;
  svg.innerHTML = s;
  for (let i = 0; i < dots; i++) {
    const c = document.createElementNS(NS, 'circle'), x = 52 + ((i * 37) % 11) * 11.2, yW = 78 + ((i * 53) % 9) * 12, yO = 26 + ((i * 29) % 4) * 9;
    c.setAttribute('cx', x); c.setAttribute('cy', yW); c.setAttribute('r', 3.2); c.setAttribute('fill', '#f2f2e6');
    c.style.transition = 'transform 1.2s ease-in-out'; c.style.transitionDelay = (i % 8) * 0.07 + 's';
    svg.appendChild(c);
    if (i < nOil) { const go = () => { c.style.transform = `translateY(${yO - yW}px)`; }; if (animate) requestAnimationFrame(() => requestAnimationFrame(go)); else { c.style.transition = 'none'; go(); } }
  }
  return svg;
}

function stepLab(ctx) {
  const st = ctx.state; st.tab ??= 0; st.shook ??= {}; st.aged ??= {};
  const root = h('div', { class: 'stack' }), body = h('div', { class: 'stack' });
  const keys = ['m1', 'm2'];
  const gate = () => {
    if (keys.every((k) => ctx.state.sc?.[k] != null)) { ctx.score('lab', qScore(ctx, keys), 30, '실험 해석'); ctx.ready(true); }
    else ctx.ready(false, '두 실험을 하고 질문에 답하세요');
  };
  const tab1 = () => {
    body.append(goal('물 위에 기름 한 층이 있는 용기에 물질을 넣고 흔들어, 어느 층에 모이는지 봅니다.', '생물의 몸에서 "물"은 체액, "기름"은 지방 조직에 해당합니다. 어느 쪽에 모이는 물질인지 알아야 몸 속에서 어디에 쌓일지 알 수 있습니다.'),
      h('p', { class: 'sub' }, '기름 1 mL와 물 1 L를 섞은 용기입니다(실제 기름층은 그림보다 훨씬 얇습니다). 점 하나는 물질의 2.5 %를 뜻합니다. 네 가지를 모두 흔들어 보세요.'));
    const fig = h('div'), row = h('div', { class: 'row' });
    const show = (sub, anim) => { fig.innerHTML = ''; const f = S.fracOil(sub.logKow); fig.append(funnel(f, anim), h('p', { class: 'sub', style: { margin: '4px 0 0' } }, `${sub.name}: 기름층에 ${fmt(f * 100, f < 0.01 ? 3 : 1)} % (기름/물 농도비 K = 10^${fmt(sub.logKow, 1)})`)); };
    SUBS.forEach((sub) => row.appendChild(h('button', { class: 'btn ' + (st.shook[sub.id] ? 'ghost' : 'primary'), onclick: () => {
      const f = S.fracOil(sub.logKow);
      if (!st.shook[sub.id]) { st.shook[sub.id] = true; nbadd(ctx, 'oil_' + sub.id, `${sub.name}: 기름층 비율`, f * 100, '%', f < 0.01 ? 3 : 1, `logKow ${sub.logKow}`); }
      render(); show(sub, true);
    } }, (st.shook[sub.id] ? '✓ ' : '') + sub.name + ' 흔들기')));
    body.append(row, fig);
    if (st.last) show(SUBS.find((x) => x.id === st.last), false);
    if (SUBS.every((x) => st.shook[x.id])) body.appendChild(Q(ctx, 'm1', { q: 'DDD가 생물의 몸에 들어가면 어디에 모일까?', opts: [['a', '지방 조직 — 기름 쪽에 거의 다 모이는 물질이므로'], ['b', '체액 — 물에 잘 녹으므로'], ['c', '어디에도 모이지 않고 소변으로 바로 나간다']], ans: 'a', hint: '네 물질 중 DDD의 기름층 비율을 보세요.', why: 'DDD는 기름 쪽에 99.9 %가 모입니다. 몸 안에서는 지방 조직에 쌓이고, 지방은 쉽게 배출되지 않습니다. 약제 C는 중간 정도, 설탕은 물에 남습니다.' }, gate));
  };
  const tab2 = () => {
    body.append(goal('약제가 환경에서 얼마나 오래 남는지, 시간이 지난 뒤 남은 양을 읽습니다.', '지방에 쌓이는 물질이라도 금방 분해되면 쌓일 시간이 없습니다. "얼마나 녹나"와 "얼마나 오래 남나"는 서로 다른 성질입니다.'),
      h('p', { class: 'sub' }, '호수에 한 번 뿌린 뒤 7일, 90일, 1년 뒤의 남은 양을 확인하세요. 세 약제 모두 3가지 시점을 읽으면 됩니다.'));
    const comps = ['ddd', 'mid', 'fast'], days = [7, 90, 365];
    comps.forEach((id) => {
      const c = S.COMPOUNDS[id]; st.aged[id] ||= {};
      body.appendChild(h('div', { class: 'callout' }, h('div', { style: { marginBottom: '6px' } }, h('b', {}, c.name), h('span', { class: 'sub' }, '  ' + c.note)),
        h('div', { class: 'row' }, ...days.map((d) => { const has = st.aged[id][d] != null;
          return h('button', { class: 'btn sm ' + (has ? 'ghost' : 'primary'), onclick: () => { st.aged[id][d] = S.remain(c.hlEnv, d) * 100; nbadd(ctx, `rem_${id}_${d}`, `${c.name} ${d}일 후 남은 양`, st.aged[id][d], '%', 1); render(); } }, has ? `${d}일: ${fmt(st.aged[id][d], st.aged[id][d] < 1 ? 2 : 0)} %` : `${d}일 후 재기`); }))));
    });
    const done = comps.every((id) => days.every((d) => st.aged[id][d] != null));
    if (done) {
      const pts = (id) => { const p = []; for (let d = 0; d <= 365; d += 5) p.push([d, S.remain(S.COMPOUNDS[id].hlEnv, d) * 100]); return p; };
      body.append(lineChart({ w: 400, h: 190, x: { min: 0, max: 365, ticks: 5, label: '지난 날수' }, y: { min: 0, max: 100, ticks: 4, label: '남은 양 (%)' }, series: [{ pts: pts('ddd'), color: '#d4624a', width: 2.2 }, { pts: pts('mid'), color: '#e0b04a', width: 2.2 }, { pts: pts('fast'), color: '#6fbf8b', width: 2.2 }], title: '시간에 따라 남는 양' }),
        legend([{ color: '#d4624a', label: 'DDD' }, { color: '#e0b04a', label: '약제 B' }, { color: '#6fbf8b', label: '약제 C' }]),
        Q(ctx, 'm2', { q: '1년이 지났을 때, 호수 환경에 가장 많이 남아 있는 약제는?', opts: [['a', 'DDD — 분해가 아주 느려서'], ['b', '약제 C — 가장 늦게 뿌렸으므로'], ['c', '셋 다 비슷하다']], ans: 'a', hint: '1년 뒤 남은 %를 비교하세요.', why: 'DDD는 1년 뒤에도 약 70 %가 남습니다(이 모델의 값). 지방에 잘 녹고(1단계) 분해도 느린 물질이 가장 위험한 조합입니다.' }, gate));
    }
  };
  const render = () => { body.innerHTML = ''; [tab1, tab2][st.tab](); gate(); };
  const tb = tabs(['① 어디에 녹나', '② 얼마나 오래 남나'], (i) => { st.tab = i; render(); }, st.tab);
  root.append(tb, body); ctx.el.appendChild(root);
  ctx.fly('under'); render();
}

/* ================= 3. 먹이사슬 추적 ================= */
function stepChain(ctx) {
  const st = ctx.state; st.sel ??= 'ddd'; st.level ??= { ddd: 0, mid: 0, fast: 0 };
  const api = ctx.scene.api;
  const root = h('div', { class: 'stack' }), body = h('div', { class: 'stack' });
  const keys = ['c1', 'c2'];
  const gate = () => { if (keys.every((k) => ctx.state.sc?.[k] != null)) { ctx.score('chain', qScore(ctx, keys), 30, '먹이사슬 해석'); ctx.ready(true); } else ctx.ready(false, '추적을 마치고 질문에 답하세요'); };
  const render = () => {
    body.innerHTML = '';
    const id = st.sel, c = S.COMPOUNDS[id], ch = S.chain(c, S.WATER_PPM), lv = st.level[id];
    body.append(goal('호수에 0.02 ppm으로 뿌린 약제가 먹이사슬을 한 단계씩 올라갈 때 농도가 어떻게 바뀌는지 따라갑니다.', '농도가 오르는 단계와 그 크기를 보면, 어떤 약제가 왜 위험한지 숫자로 알 수 있습니다.'),
      choice({ options: Object.values(S.COMPOUNDS).map((x) => ({ value: x.id, label: x.name, desc: x.note })), value: id, name: '추적할 약제', onChange: (v) => { st.sel = v; render(); } }),
      h('button', { class: 'btn primary', disabled: lv >= ch.length - 1, onclick: () => { st.level[id] = lv + 1; api.highlight(lv + 1); if (lv + 1 === ch.length - 1) { nbadd(ctx, 'grebe_' + id, `${c.name}: 논병아리 지방`, ch[4].ppm, 'ppm', 1); ctx.fly('grebes'); } else ctx.fly(lv + 1 >= 2 ? 'under' : 'overview'); render(); } }, lv >= ch.length - 1 ? '모두 따라갔습니다' : `다음: ${ch[lv + 1].name}로 올라가기`));
    const max = Math.log10(Math.max(...ch.map((x) => x.ppm), 1) * 1.2), min = -2.2;
    const rows = ch.slice(0, lv + 1).map((x, i) => h('div', {},
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'sub' }, x.name), h('span', { class: 'sub' }, `${ppmTxt(x.ppm)} ppm` + (i ? `  (앞 단계의 ×${fmt(x.factor, x.factor < 10 ? 1 : 0)})` : ''))),
      h('div', { class: 'bar', style: { height: '10px' } }, h('i', { style: { width: clamp(((Math.log10(Math.max(x.ppm, 0.01)) - min) / (max - min)) * 100, 2, 100) + '%' } }))));
    body.append(h('div', { class: 'stack' }, ...rows), h('p', { class: 'sub' }, '막대는 농도를 로그 눈금(10배가 같은 간격)으로 그렸습니다.'));
    if (lv >= ch.length - 1) {
      const tot = ch[4].ppm / ch[0].ppm;
      body.append(callout(id === 'ddd' ? 'bad' : 'good', h('b', {}, `물 대비 ×${tot >= 100 ? Math.round(tot).toLocaleString('en-US') : fmt(tot, 1)}. `), id === 'ddd' ? '0.02 ppm이던 물이 새의 지방에서는 수천 ppm이 되었습니다.' : '농도가 거의 오르지 않았습니다.'));
      if (id === 'ddd') body.append(callout('', h('b', {}, '실제 기록과 비교. '), `문헌에 인용되는 값은 플랑크톤 약 5 ppm, 큰 물고기 수십~수천 ppm, 논병아리 지방 약 1,600 ppm입니다. 이 모델은 플랑크톤 ${ppmTxt(ch[1].ppm)}, 큰 물고기 ${ppmTxt(ch[3].ppm)}, 논병아리 ${ppmTxt(ch[4].ppm)} ppm으로 같은 규모를 따라갑니다.`));
      if (st.level.ddd >= 4) {
        body.append(Q(ctx, 'c1', { q: '물 0.02 ppm이 새의 몸 속에서 수천 ppm이 된 이유는?', opts: [['a', '지방에 녹아 쌓이고 분해되지 않는 물질을, 위 단계로 갈수록 먹이를 통해 많이 모으기 때문'], ['b', '새가 약제를 일부러 마셨기 때문'], ['c', '살포하는 동안 농도가 계속 올라갔기 때문']], ans: 'a', hint: '앞 단계의 ×배수가 몇 번 곱해졌는지 보세요.', why: '농축 계수(물→플랑크톤 ×250)와 먹이 단계마다의 배수가 모두 곱해집니다. 이를 생물농축이라 부릅니다. 한 단계 한 단계는 작아 보여도 곱하면 10만 배 가까이 됩니다.' }, gate));
        if (st.level.fast >= 4 || st.level.mid >= 4) body.append(Q(ctx, 'c2', { q: '약제 C는 왜 먹이사슬에서 거의 오르지 않을까?', opts: [['a', '지방에 덜 녹고 몸 속에서 금방 분해·배출되어 쌓일 틈이 없다'], ['b', '농도를 낮게 뿌렸기 때문'], ['c', '플랑크톤이 먹지 않기 때문']], ans: 'a', hint: '앞 실험의 약제 C의 기름층 비율과 남는 양을 떠올려 보세요.', why: '약제 C는 기름층 비율이 낮고 반감기가 며칠입니다. 같은 0.02 ppm을 뿌려도 생물에 쌓이지 않습니다.' }, gate));
        else body.append(callout('', '약제 C 또는 약제 B도 위까지 따라가 보세요. 그러면 다음 질문이 열립니다.'));
      }
    }
    gate();
  };
  root.append(body); ctx.el.appendChild(root); render();
}

/* ================= 4. 살포 계획 ================= */
const START = { id: 'ddd', dose: 1, n: 1 };
const HINT = { id: 'fast', dose: 1.5, n: 4 };
function stepPlan(ctx) {
  const st = ctx.state, api = ctx.scene.api;
  const P = (ctx.run.plan ||= { ...START, hint: false });
  const root = h('div', { class: 'stack' }), ctl = h('div', { class: 'stack' }), out = h('div', { class: 'stack' }), after = h('div', { class: 'stack' });
  const NAME = { gnat: '각다귀 ≤ 무처리의 30 %', grebe: '논병아리 지방 ≤ 100 ppm', budget: `약제 사용량 ≤ ${S.BUDGET}` };
  const hintOf = (J) => {
    const c = J.checks.filter((x) => !x.ok).map((x) => x.id);
    if (c.includes('grebe')) return P.id === 'fast' ? '' : `논병아리 지방 농도가 최대 ${ppmTxt(J.maxGrebe)} ppm입니다. 농도를 낮추는 것만으로 충분한지 실험해 보세요. 약제의 성질(지방에 녹는 정도·남는 기간)을 바꾸는 쪽이 더 큰 효과가 있습니다.`;
    if (c.includes('gnat')) return '각다귀가 충분히 줄지 않았습니다. 살포 횟수나 농도를 늘리세요. 빨리 분해되는 약제는 자주 뿌려야 합니다.';
    if (c.includes('budget')) return '사용량이 너무 많습니다. (살포 횟수 × 농도 배수)를 줄이세요.';
    return '';
  };
  const paint = () => {
    const J = S.judge(P), last = J.ys[J.ys.length - 1]; out.innerHTML = '';
    J.checks.forEach((c) => out.appendChild(kv(NAME[c.id], c.id === 'gnat' ? `${fmt(J.maxGnat * 100, 0)} %` : c.id === 'grebe' ? `${ppmTxt(J.maxGrebe)} ppm` : fmt(J.use, 1), '', c.ok ? 'good' : 'bad')));
    const xs = J.ys.map((y) => y.year);
    out.append(
      lineChart({ w: 400, h: 170, x: { min: 1, max: S.YEARS, ticks: S.YEARS - 1, label: '해' }, y: { min: 0, max: 100, ticks: 4, label: '각다귀 (%)' }, series: [{ pts: J.ys.map((y) => [y.year, y.gnat * 100]), color: '#e0b04a', width: 2.2, dots: 3 }], hlines: [{ y: S.GNAT_GOAL * 100, color: '#6fbf8b', label: '목표 30 %' }], title: '각다귀 개체수' }),
      lineChart({ w: 400, h: 190, x: { min: 1, max: S.YEARS, ticks: S.YEARS - 1, label: '해' }, y: { min: -1, max: 4, ticks: 5, label: '논병아리 지방 (ppm)', fmt: (v) => (10 ** v >= 1 ? Math.round(10 ** v) : (10 ** v).toFixed(1)) }, series: [{ pts: J.ys.map((y) => [y.year, Math.log10(Math.max(y.grebe, 0.1))]), color: '#d4624a', width: 2.2, dots: 3 }], hlines: [{ y: Math.log10(S.GREBE_LIMIT), color: '#e0715c', label: '한계 100 ppm' }], title: '논병아리 몸 속 농도 (로그 눈금)' }),
      legend([{ color: '#e0b04a', label: '각다귀' }, { color: '#d4624a', label: '논병아리 지방' }]));
    const bad = J.checks.filter((c) => !c.ok);
    if (bad.length && hintOf(J)) out.appendChild(callout('warn', h('b', {}, '먼저 고칠 곳. '), hintOf(J)));
    if (!st.done) out.appendChild(h('button', { class: 'btn primary', disabled: bad.length > 0, onclick: () => submit(J) }, bad.length ? `조건 ${bad.length}개를 더 맞추세요` : '계획 확정'));
    api.setSpray(P.n > 0); api.setGrebes(S.grebeAlive(J.maxGrebe));
    return J;
  };
  const submit = (J) => {
    st.done = true; ctx.score('plan', clamp(1 - (P.hint ? 0.1 : 0), 0, 1), 30, '살포 계획');
    nbadd(ctx, 'plan', '확정한 계획', `${S.COMPOUNDS[P.id].name} · ${P.dose}배 · 연 ${P.n}회`, '', 0);
    toast('계획 확정'); paint(); paintAfter();
  };
  const paintAfter = () => {
    after.innerHTML = '';
    if (!st.done) { ctx.ready(false, '모든 조건을 만족하고 확정하세요'); return; }
    after.append(sec('계획의 근거'),
      Q(ctx, 'p1', { q: 'DDD는 한 번만 뿌려도 오래 효과가 나는데, 왜 이 계획에서는 쓸 수 없었나?', opts: [['a', '지방에 잘 녹고 분해가 느려 먹이사슬에서 농축되므로, 아주 낮게 뿌려도 새의 몸 속 농도가 한계를 넘는다'], ['b', '비용이 가장 많이 들어서'], ['c', '각다귀를 줄이지 못해서']], ans: 'a', hint: '위 그래프에서 DDD로 농도를 0.25배까지 낮춰 본 결과를 떠올리세요.', why: '농도를 낮추면 물속 농도는 줄지만 농축 계수는 그대로 곱해지고, DDD는 해마다 이월되어 오히려 쌓입니다. 문제는 양이 아니라 물질의 성질이었습니다.' }, fin),
      Q(ctx, 'p2', { q: '"사람에게 해가 없는 농도"라는 기준만으로 이 사건을 막을 수 있었을까?', opts: [['a', '아니다. 물 속 농도가 안전해도 먹이사슬 위쪽 생물에서는 수만 배가 될 수 있어, 생물 단계별로 확인해야 한다'], ['b', '그렇다. 물 농도만 낮으면 안전하다'], ['c', '새는 약제와 상관이 없다']], ans: 'a', hint: '3단계에서 본 물→새의 배수를 떠올리세요.', why: '1949년 판단은 물 속 농도와 사람에 대한 영향 중심이었습니다. 먹이사슬 위쪽에서의 농축이 사건을 키웠고, 이후 약제 평가에서 생물농축이 중요한 항목이 되었습니다.' }, fin));
    fin();
  };
  const fin = () => { const ks = ['p1', 'p2']; if (ks.every((k) => ctx.state.sc?.[k] != null)) { ctx.score('why', qScore(ctx, ks), 10, '계획의 근거'); ctx.ready(true); } else ctx.ready(false, '두 질문에 답하세요'); };
  const buildCtl = () => {
    ctl.innerHTML = '';
    const comp = choice({ options: Object.values(S.COMPOUNDS).map((x) => ({ value: x.id, label: x.name, desc: x.note })), value: P.id, name: '약제', onChange: (v) => { P.id = v; paint(); } });
    const sD = slider({ label: '한 번에 뿌리는 농도', unit: '배 (1배 = 0.02 ppm)', min: 0.25, max: 4, step: 0.25, value: P.dose, digits: 2, onInput: (v) => { P.dose = v; paint(); }, note: '많이 뿌릴수록 효과는 크지만 몸에 쌓이는 양도 늘어납니다.' });
    const sN = slider({ label: '해마다 뿌리는 횟수', unit: '회', min: 1, max: 6, step: 1, value: P.n, onInput: (v) => { P.n = v; paint(); }, note: '여름 동안 고르게 나누어 뿌립니다. 같은 계획을 6년 동안 되풀이합니다.' });
    const hint = h('button', { class: 'btn sm ghost', onclick: () => { Object.assign(P, HINT, { hint: true }); toast('추천 출발점을 불러왔습니다 (점수 10 % 감점)'); buildCtl(); paint(); } }, '막히면: 추천 계획 불러오기 (감점 10 %)');
    ctl.append(comp, sD, sN, hint);
  };
  root.append(goal('아래 세 조건을 모두 만족하는 6년 살포 계획을 찾습니다. 처음 값은 1949년의 선택(DDD 1회)입니다.', '각다귀를 줄이는 것과 새를 지키는 것을 동시에 만족하려면 무엇을 바꿔야 하는지 직접 확인하기 위해서입니다.'), out, sec('조절'), ctl, after);
  ctx.el.appendChild(root); ctx.fly('boat'); buildCtl(); paint(); paintAfter();
}

/* ================= 5. 사건 해설 ================= */
function stepDebrief(ctx) {
  const res = (ctx.state.res ||= ctx.finish());
  const P = ctx.run.plan || START;
  const wrap = h('div', { class: 'stack' }, scoreView(res));
  wrap.append(sec('실제 역사는 어떻게 흘렀나'), h('ul', { class: 'timeline' },
    ...[['1949', '클리어 호수에 DDD를 처음 살포한다. 각다귀가 크게 줄어든다.'],
      ['1954 · 1957', '각다귀가 다시 늘어 같은 약제를 두 번 더 살포한다.'],
      ['1950년대 말', '논병아리의 번식쌍이 1,000쌍 이상에서 수십 쌍 아래로 줄고, 새의 지방에서 높은 농도가 검출된다. 1959년 이후에는 이 약제를 쓰지 않는다.'],
      ['1962', '레이철 카슨이 『침묵의 봄』을 출간한다.'],
      ['1972', '미국에서 DDT 사용이 금지된다. 이후 논병아리 등 개체수는 회복되어 갔다.']].map(([y, t]) => h('li', {}, h('b', {}, y), t))));
  wrap.append(sec('화학공학·환경과 이어지는 곳'), callout('', h('b', {}, '물질의 성질이 곧 환경 거동. '), '지방 친화성(옥탄올–물 분배)과 분해 속도는 약제를 설계·평가할 때 반드시 보는 값입니다. 오늘날 새로운 화학물질을 만들 때도 "목적을 이루면서 환경에서 빨리 분해되는가"를 설계 조건으로 둡니다. 공정에서 새는 물질의 이동·분해를 계산하는 것도 화학공학의 일입니다.'));
  wrap.append(sec('책과 함께 생각해 볼 것'), h('ul', { class: 'sub', style: { paddingLeft: '18px', margin: 0 } },
    h('li', {}, '『침묵의 봄』에서 이 사건 말고 어떤 사례와 근거를 들어 주장을 펼쳤는지 찾아보세요.'),
    h('li', {}, '책을 쓰던 당시에는 이 모델처럼 계산할 도구가 없었습니다. 카슨은 무엇으로 독자를 설득했을까요?'),
    h('li', {}, '해충으로 인한 불편과 생태계 보호가 부딪칠 때, 내가 의사결정자라면 어떤 기준을 세울까요?'),
    h('li', {}, '이 게임의 약제 B·C와 판정 기준은 교육용으로 정한 값입니다. 실제 평가에서는 어떤 자료가 더 필요할까요?')));
  const text = () => `[사건 03 · 침묵의 봄] 레이철 카슨의 『침묵의 봄』에 소개된 클리어 호수 사건(1949–1959, 각다귀 방제를 위한 DDD 살포 후 논병아리가 줄어든 사건)을 재구성해 조사함. `
    + `기름과 물에 물질을 섞는 실험으로 DDD가 지방에 거의 다 녹는다는 점과 분해가 매우 느리다는 점을 확인함. 먹이사슬 추적에서 물속 0.02 ppm이 플랑크톤, 물고기를 거쳐 새의 지방에서는 수천 ppm 규모로 농축되는 과정을 계산으로 확인함(교육용 모델). `
    + `살포 계획 시뮬레이션에서 농도를 낮추는 것만으로는 한계를 지킬 수 없고, 지방 친화성과 지속성이 낮은 약제를 횟수를 늘려 쓰는 방식이 각다귀 방제와 새 보호를 함께 만족함을 확인함(최종 선택: ${S.COMPOUNDS[P.id].name}, ${P.dose}배, 연 ${P.n}회). (결과 ${res.total}점)`;
  wrap.append(sec('활동 기록 초안'), h('p', { class: 'sub' }, '내가 한 활동을 정리한 초안입니다. 그대로 쓰지 말고, 책을 읽고 느낀 점과 실제로 한 것을 직접 고쳐 쓰세요.'), h('div', { class: 'paper', style: { fontSize: '13px' } }, text()),
    h('div', { class: 'row', style: { marginTop: '8px' } }, copyButton(text), h('button', { class: 'btn primary', onclick: () => ctx.exit() }, '사건 목록으로'), h('button', { class: 'btn', onclick: () => ctx.restart() }, '다시 조사하기')));
  ctx.el.appendChild(wrap); ctx.scene.api.setSpray(false); ctx.scene.api.highlight(-1); ctx.scene.api.setGrebes(1); ctx.fly('overview');
}

export default {
  id: 'silentspring', no: '03', year: '1949–1959', title: '침묵의 봄',
  blurb: '각다귀를 없애려 뿌린 약제가 먹이사슬을 따라 농축되어 호수의 새를 줄였다. 『침묵의 봄』에 소개된 클리어 호수 사건을 실험과 계산으로 다시 조사한다.',
  tags: [{ label: '환경화학', on: true }, { label: '생물농축', on: true }, { label: '독서 연계', on: false }],
  accent: '#8cc46a',
  viewButtons: [{ id: 'overview', label: '호수 전체' }, { id: 'boat', label: '살포선' }, { id: 'grebes', label: '논병아리' }, { id: 'under', label: '물속' }],
  createScene(e) { return createLakeScene(e); },
  steps: [
    { id: 'file', label: '사건 기록', title: '사건 기록', sub: '자료를 읽으세요', gate: '자료를 모두 읽으세요', view: 'overview', mount: stepDossier },
    { id: 'lab', label: '실험', title: '약제의 성질 실험', sub: '두 가지를 확인합니다', gate: '두 실험을 마치세요', view: 'under', mount: stepLab },
    { id: 'chain', label: '먹이사슬', title: '먹이사슬 추적', sub: '농도가 어떻게 오르는가', gate: '추적을 마치고 질문에 답하세요', view: 'overview', mount: stepChain },
    { id: 'plan', label: '살포 계획', title: '살포 계획', sub: '세 조건을 모두 만족시킵니다', gate: '조건을 만족하고 확정하세요', view: 'boat', mount: stepPlan },
    { id: 'debrief', label: '사건 해설', title: '사건 해설', sub: '결과와 실제 역사', view: 'overview', mount: stepDebrief },
  ],
};
