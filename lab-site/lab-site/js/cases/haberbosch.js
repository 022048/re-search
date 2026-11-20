// 사건 02 · 공기에서 빵을 (카를스루에 1909 → 오파우 1913)
import { h, fmt, slider, choice, tabs, kv, lineChart, legend, toast } from '../ui.js';
import * as C from '../sim/chem.js';
import { runQuiz, copyButton } from '../quiz.js';
import { createHaberScene } from '../scenes/haber.js';

const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
const sec = (t) => h('h3', { class: 'sec' }, t);
const callout = (cls, ...c) => h('div', { class: 'callout ' + cls }, ...c);
function paper(title, src, stampText, ...body) {
  return h('div', { class: 'paper' }, stampText ? h('span', { class: 'stamp ' + (stampText === '2차 자료' ? 'secondary' : 'recon') }, stampText) : null,
    h('h4', {}, title), h('div', { class: 'src' }, src), ...body.map((b) => (typeof b === 'string' ? h('p', {}, b) : b)));
}
const hab = (ctx) => (ctx.run.hab ||= { vessel: null, vFails: 0, P: 250, Tgas: 500, hint: false, d: null, bench: [] });
const nbadd = (ctx, tag, label, value, unit, digits, note, flag) => ctx.notebook.add({ tag, label, value, unit, digits, note, flag });

/** 실제값(막대)과 평형값(회색 눈금)을 같이 보여 주는 결과 막대 */
function resultBars(rows, max) {
  return h('div', { class: 'stack' }, ...rows.map((r) => h('div', {},
    h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'sub' }, r.label), h('span', { class: 'sub' }, `출구 ${fmt(r.y, 1)} % · 평형 ${fmt(r.eq, 1)} %`)),
    h('div', { style: { position: 'relative' } },
      h('div', { class: 'bar', style: { height: '10px' } }, h('i', { style: { width: clamp((r.y / max) * 100, 0.5, 100) + '%' } })),
      h('div', { style: { position: 'absolute', top: '-2px', left: clamp((r.eq / max) * 100, 0, 100) + '%', width: '2px', height: '14px', background: '#aab6c2' }, title: '평형' })))));
}
/** 즉시 피드백 선택 문항 하나 */
function mcBox(ctx, key, q) {
  const st = (ctx.state.mc ||= {}); const s = (st[key] ||= { tries: 0, ok: false, shown: false, val: null });
  const box = h('div', { class: 'callout ' + (s.ok ? 'good' : s.shown ? 'bad' : '') });
  box.appendChild(h('div', { style: { marginBottom: '8px' } }, h('b', {}, q.title)));
  const ch = choice({ options: q.opts.map(([v, l]) => ({ value: v, label: l })), value: s.val, name: q.title, onChange: (v) => {
    if (s.ok || s.shown) return; s.val = v; s.tries++;
    if (v === q.ans) s.ok = true; else if (s.tries >= 2) s.shown = true; else toast('아쉽습니다. 힌트를 보고 다시 골라 보세요');
    q.onChange?.(); rebuild();
  } });
  ch.api.buttons().forEach((b, i) => { if ((s.ok || s.shown) && q.opts[i][0] === q.ans) b.classList.add('right'); if (s.val === q.opts[i][0] && !s.ok) b.classList.add('wrong'); if (s.ok || s.shown) b.disabled = true; });
  box.appendChild(ch);
  if (!s.ok && !s.shown && s.tries >= 1 && q.hint) box.appendChild(h('p', { class: 'sub', style: { color: 'var(--warn)', margin: '8px 0 0' } }, '힌트: ' + q.hint));
  if (s.ok || s.shown) box.appendChild(h('p', { class: 'sub', style: { margin: '8px 0 0' } }, (s.ok ? '정답. ' : '') + q.sol));
  function rebuild() { const n = mcBox(ctx, key, q); box.replaceWith(n); }
  return box;
}
const mcDone = (ctx, key) => { const s = ctx.state.mc?.[key]; return !!(s && (s.ok || s.shown)); };
const mcScore = (ctx, keys) => keys.reduce((a, k) => { const s = ctx.state.mc?.[k]; return a + (s?.ok ? (s.tries === 1 ? 1 : 0.5) : 0); }, 0) / keys.length;

/* ================= 1. 사건 기록 ================= */
function stepDossier(ctx) {
  const docs = [
    ['사건 개요', paper('식량이 질소에 달려 있다', '1898–1913', '재구성',
      '1898년 윌리엄 크룩스는 영국학술협회 연설에서, 질소 비료의 원료인 칠레 초석만으로는 늘어나는 식량 수요를 감당할 수 없다고 경고했습니다. 공기의 78%가 질소지만 N≡N 결합이 단단해서 식물이 쓸 수 있는 형태로 바꾸기가 어려웠습니다.',
      '질소와 수소로 암모니아를 만드는 반응은 종이 위에서는 단순합니다. 문제는 이것을 하루 수십 톤 규모로, 안전하게, 계속 돌리는 일입니다.',
      callout('warn', h('b', {}, '당신의 임무. '), '1909년의 탁상 실험으로 반응의 성질을 이해하고, 1913년의 공장 반응기와 순환 루프를 설계합니다.'))],
    ['반응의 원리', paper('평형과 속도의 충돌', '알아 두기', '2차 자료',
      h('div', { class: 'formula' }, 'N₂ + 3 H₂ ⇌ 2 NH₃    (발열, 기체 4몰 → 2몰)'),
      h('p', {}, h('b', {}, '평형. '), '발열 반응이라 온도를 낮출수록 암모니아가 많아지고, 기체 몰수가 줄어드는 반응이라 압력을 높일수록 많아집니다.'),
      h('p', {}, h('b', {}, '속도. '), '온도가 낮으면 반응이 너무 느립니다. 촉매는 속도를 올리지만 평형 위치는 바꾸지 못합니다.'),
      callout('', h('b', {}, '그래서 타협이 필요합니다. '), '빠르려면 온도를 올려야 하고, 올리면 평형이 불리해집니다. 압력으로 그 손실을 메우면 장비가 버텨야 합니다.'))],
    ['실험대에서 공장으로', paper('하버, 미타슈, 보슈', '1909–1913 · 요약', '2차 자료',
      h('p', {}, '1909년 하버는 약 200기압 부근의 압력, 오스뮴 촉매, 반응하지 않은 가스를 암모니아를 빼낸 뒤 되돌리는 순환을 갖춘 탁상 장치를 시연했습니다. BASF가 이를 평가했습니다.'),
      h('p', {}, '오스뮴은 너무 귀해서 BASF의 미타슈 팀이 철에 촉진제를 넣은 촉매를 찾아냈습니다. 보슈는 뜨거운 고압 수소가 강철을 약하게 만드는 문제를, 연철 라이너를 안에 넣는 이중 구조로 풀었습니다. 1913년 오파우에서 최초의 상업 공장이 가동됐습니다.'),
      callout('warn', h('b', {}, '모델의 한계. '), '이 게임의 모델은 교육용입니다. 이상기체와 조정한 속도식을 쓰며 수치는 실제 오파우의 값이 아닙니다. "하루 30톤"은 이 게임이 정한 목표입니다.'))],
  ];
  const view = h('div');
  const tb = tabs(docs.map((d) => d[0]), (i) => { view.innerHTML = ''; view.appendChild(docs[i][1]); check(); });
  const check = () => { if (ctx.state.read || tb.api.seen().size >= docs.length) { ctx.state.read = true; ctx.ready(true); } else ctx.ready(false, `자료 ${docs.length - tb.api.seen().size}개를 더 읽어 주세요`); };
  view.appendChild(docs[0][1]);
  ctx.el.append(tb, view);
  check();
}

/* ================= 2. 1909 실험대 ================= */
function stepBench(ctx) {
  const api = ctx.scene.api, H = hab(ctx), st = ctx.state;
  st.t ||= { 0: [], 1: [], 2: [] }; st.tab ??= 0;
  const root = h('div', { class: 'stack' }), body = h('div', { class: 'stack' });
  const keys = ['m1', 'm2', 'm3', 'm4'];
  const gate = () => {
    if (keys.every((k) => mcDone(ctx, k))) { ctx.score('bench', mcScore(ctx, keys), 30, '실험 해석'); ctx.ready(true); } else ctx.ready(false, '세 실험의 측정과 질문을 모두 마치세요');
  };
  const goal = (g, why) => callout('', h('b', {}, '목표. '), g, h('br'), h('span', { class: 'sub' }, '왜 하나. ' + why));
  const run = (i, T, P, cat) => { const r = C.labTube(T, P, cat, 10000); const rec = { T, P, cat, y: r.y * 100, eq: r.yEq * 100 }; return rec; };
  const presets = (i, list, labelOf) => {
    const done = st.t[i];
    return h('div', { class: 'row' }, ...list.map((c) => {
      const has = done.some((x) => x.label === labelOf(c));
      return h('button', { class: 'btn ' + (has ? 'ghost' : 'primary'), onclick: () => {
        if (!has) { const rec = run(i, c.T, c.P, c.cat); rec.label = labelOf(c); done.push(rec); nbadd(ctx, `b${i}_${done.length}`, `실험 ${i + 1}: ${rec.label}`, rec.y, '% NH₃', 1, `평형 ${fmt(rec.eq, 1)} %`); api.setBench(clamp((c.T - 300) / 300, 0, 1)); api.setPressure(c.P); }
        render();
      } }, (has ? '✓ ' : '') + labelOf(c));
    }));
  };
  const allDone = (i, n) => st.t[i].length >= n;
  const ex = [
    () => { // 온도
      body.append(goal('압력과 촉매를 고정하고 온도만 바꿨을 때 출구 암모니아가 어떻게 달라지는지 봅니다.', '평형은 저온이 유리한데 공장은 왜 중간 온도에서 돌릴까를 이해하는 첫걸음입니다.'),
        h('p', { class: 'sub' }, '조건: 200 bar, 철 촉매. 세 온도를 모두 측정하세요.'),
        presets(0, [{ T: 300, P: 200, cat: 'fe' }, { T: 450, P: 200, cat: 'fe' }, { T: 600, P: 200, cat: 'fe' }], (c) => `${c.T} °C`));
      if (st.t[0].length) body.appendChild(resultBars(st.t[0].slice().sort((a, b) => a.T - b.T), 65));
      if (allDone(0, 3)) body.appendChild(mcBox(ctx, 'm1', { title: '450 °C에서 가장 많이 나온 이유는?', opts: [['a', '낮은 온도는 반응이 너무 느려 평형에 못 닿고, 높은 온도는 평형 자체가 낮아진다'], ['b', '온도가 높을수록 항상 암모니아가 많아진다'], ['c', '600 °C에서는 촉매가 사라진다']], ans: 'a', hint: '회색 눈금(평형)과 막대(실제)의 차이를 300 °C와 600 °C에서 비교해 보세요.', sol: '300 °C는 평형(61%)은 높은데 속도가 느려 1%밖에 못 갔고, 600 °C는 평형 자체가 8%로 낮습니다. 속도와 평형이 타협되는 중간이 최적입니다.', onChange: () => render() }));
    },
    () => { // 압력
      body.append(goal('온도와 촉매를 고정하고 압력만 바꿔 봅니다.', '압력을 올리면 정말 유리한지, 그리고 얼마나 올려야 하는지 가늠하기 위해서입니다.'),
        h('p', { class: 'sub' }, '조건: 450 °C, 철 촉매. 세 압력을 모두 측정하세요.'),
        presets(1, [{ T: 450, P: 1, cat: 'fe' }, { T: 450, P: 50, cat: 'fe' }, { T: 450, P: 200, cat: 'fe' }], (c) => `${c.P} bar`));
      if (st.t[1].length) body.appendChild(resultBars(st.t[1].slice().sort((a, b) => a.P - b.P), 30));
      if (allDone(1, 3)) body.appendChild(mcBox(ctx, 'm2', { title: '압력을 올리면 어떻게 되나?', opts: [['a', '평형과 실제 출구 모두 크게 늘어난다 (기체 몰수가 줄어드는 반응이라서)'], ['b', '평형은 줄지만 실제는 늘어난다'], ['c', '거의 달라지지 않는다']], ans: 'a', hint: '1 bar와 200 bar의 막대를 비교하세요.', sol: '4몰이 2몰로 줄어드는 반응이라 압력이 평형을 생성물 쪽으로 밉니다. 그래서 하버는 약 200기압을 택했고, 이 압력을 견디는 장비가 다음 문제가 됩니다.', onChange: () => render() }));
    },
    () => { // 촉매
      body.append(goal('온도·압력을 고정하고 촉매만 바꿔 봅니다.', '촉매가 암모니아를 "더 많이" 만드는지, "더 빨리" 만드는지 구분하기 위해서입니다.'),
        h('p', { class: 'sub' }, '조건: 450 °C, 200 bar. 세 촉매를 모두 측정하세요.'),
        presets(2, [{ T: 450, P: 200, cat: 'fe' }, { T: 450, P: 200, cat: 'feK' }, { T: 450, P: 200, cat: 'os' }], (c) => ({ fe: '무촉진 철', feK: '철 + 촉진제', os: '오스뮴' }[c.cat])));
      if (st.t[2].length) body.appendChild(resultBars(st.t[2], 26));
      if (allDone(2, 3)) {
        body.appendChild(mcBox(ctx, 'm3', { title: '촉매는 무엇을 바꾸나?', opts: [['a', '평형 위치는 그대로이고, 평형에 더 가까워지게(더 빨리 도달하게) 한다'], ['b', '평형 암모니아 농도를 높인다'], ['c', '평형 암모니아 농도를 낮춘다']], ans: 'a', hint: '회색 눈금(평형)의 위치가 촉매마다 바뀌는지 보세요.', sol: '평형은 24%로 같고 막대만 길어집니다. 오스뮴은 평형까지 도달했지만 너무 귀했고, 촉진제를 넣은 철이 현실적인 답이었습니다.', onChange: () => render() }));
        const good = st.t[2].find((x) => x.cat === 'feK'), xi = (4 * good.y / 100) / (2 + 2 * good.y / 100);
        if (mcDone(ctx, 'm3')) {
          body.appendChild(callout('', h('b', {}, '한 번 통과 전환율. '), `촉진 철의 출구 ${fmt(good.y, 1)} %는 반응기를 한 번 지났을 때 N₂·H₂의 약 ${fmt(xi * 100, 0)} %만 암모니아가 됐다는 뜻입니다. (y = 2ξ / (4 − 2ξ) → ξ = ${fmt(xi * 100, 1)} %)`, h('br'), `암모니아를 빼낸 뒤 나머지를 되돌려 보내면, 새로 넣는 가스 1 kmol당 반응기에는 ${fmt(1 / xi - 1, 1)} kmol이 더 돌아야 합니다.`));
          body.appendChild(mcBox(ctx, 'm4', { title: '한 번 통과 전환이 낮은데 어떻게 거의 전부 암모니아로 만드나?', opts: [['a', '생성된 암모니아를 냉각해 빼내고, 남은 가스를 다시 반응기로 순환시킨다'], ['b', '압력을 계속 올려서 한 번에 끝낸다'], ['c', '온도를 낮춰 한 번에 평형에 도달시킨다']], ans: 'a', hint: '"빼내고 되돌린다"는 두 동작을 떠올려 보세요.', sol: '이것이 하버의 순환 합성입니다. 대신 순환 가스를 다시 압축할 동력과, 반응하지 않는 불활성 기체가 쌓이는 문제가 생깁니다. 3단계에서 이 균형을 직접 설계합니다.', onChange: () => render() }));
        }
      }
    },
  ];
  const render = () => { body.innerHTML = ''; ex[st.tab](); gate(); };
  const tb = tabs(['① 온도', '② 압력', '③ 촉매와 순환'], (i) => { st.tab = i; render(); }, st.tab);
  root.append(tb, body); ctx.el.appendChild(root);
  ctx.fly('bench'); render();
}

/* ================= 3. 용기 재료 ================= */
function stepVessel(ctx) {
  const H = hab(ctx), api = ctx.scene.api, st = ctx.state;
  st.sel ??= 'carbon';
  const root = h('div', { class: 'stack' }), out = h('div', { class: 'stack' }), res = h('div');
  const pH2 = () => (H.P * 0.6) / 10;
  const chart = () => {
    const sel = C.vesselCheck(st.sel, { P: H.P, pH2Bar: pH2() * 10, Tgas: H.Tgas });
    const curve = (f) => { const p = []; for (let x = 0.5; x <= 20; x += 0.5) p.push([x, f(x)]); return p; };
    return h('div', {}, lineChart({ w: 400, h: 210, x: { min: 0, max: 20, ticks: 5, label: '수소 분압 (MPa)' }, y: { min: 100, max: 550, ticks: 5, label: '온도 (°C)' },
      series: [{ pts: curve(C.nelsonCS), color: '#d4624a', width: 2.2 }],
      marks: [{ x: pH2(), y: sel.Twall, color: sel.ok ? '#6fbf8b' : '#e0715c', fill: sel.ok ? '#6fbf8b' : '#e0715c', label: '벽 온도' }], title: '탄소강이 견디는 한계 (선 위쪽은 위험)' }),
      legend([{ color: '#d4624a', label: '탄소강의 수소 침해 한계' }, { color: sel.ok ? '#6fbf8b' : '#e0715c', label: '선택한 구조의 벽 온도' }]));
  };
  const render = () => {
    out.innerHTML = '';
    const opts = Object.values(C.VESSELS).filter((v) => v.id !== 'crmo').map((v) => ({ value: v.id, label: v.name, desc: `정격 ${v.rating} bar. ${v.desc}` }));
    out.append(
      callout('', h('b', {}, '알아 두기. '), '뜨거운 고압 수소는 강철 속 탄소와 반응해 강철을 약하게 만듭니다(수소 침해). 벽 온도가 한계선 위로 올라가면 균열이 진행됩니다. 라이너 구조는 압력을 맡는 바깥 강철을 식혀 두는 방식으로 이 문제를 피합니다.'),
      h('p', { class: 'sub' }, `시험 조건: ${H.P} bar, 촉매층 가스 ${H.Tgas} °C`),
      choice({ options: opts, value: st.sel, name: '용기 구조', onChange: (v) => { st.sel = v; render(); } }),
      h('button', { class: 'btn primary', onclick: () => {
        const v = C.vesselCheck(st.sel, { P: H.P, pH2Bar: pH2() * 10, Tgas: H.Tgas });
        res.innerHTML = '';
        if (v.ok) {
          H.vessel = st.sel; api.setAlert(false); toast('이 구조는 견딥니다'); nbadd(ctx, 'vessel', '채택한 용기', C.VESSELS[st.sel].name, '', 0);
          ctx.score('vessel', Math.max(0, 1 - 0.3 * H.vFails), 10, '용기 재료'); ctx.ready(true);
          res.appendChild(callout('good', h('b', {}, '통과. '), `벽 온도 ${fmt(v.Twall, 0)} °C ≤ 한계 ${fmt(v.Tlim, 0)} °C, ${H.P} bar ≤ 정격 ${C.VESSELS[st.sel].rating} bar.`));
        } else {
          H.vFails++; api.setAlert(true); setTimeout(() => api.setAlert(false), 2400); toast('용기 파손');
          res.appendChild(callout('bad', h('b', {}, `약 ${v.hoursToFail === Infinity ? '—' : fmt(v.hoursToFail, 0)}시간 뒤 파손. `), v.reasons.join(' · '), h('br'), h('span', { class: 'sub' }, '파란 점(벽 온도)이 곡선 위로 올라가 있는지 그래프에서 확인하세요.')));
          ctx.ready(!!H.vessel);
        }
        render2();
      } }, '이 구조로 시험 가동'), res, h('div', { id: 'chartbox' }, chart()));
    function render2() { const b = out.querySelector('#chartbox'); if (b) b.replaceChildren(chart()); }
  };
  root.append(h('p', { class: 'lead' }, '반응기 벽이 수소에 상하면 공장이 서고, 고압 가스가 새면 사람이 다칩니다. 어떤 구조가 이 조건을 견디는지 시험으로 찾으세요.'), out);
  ctx.el.appendChild(root);
  ctx.fly('reactor'); api.setBeds([440, 500, 470]); api.setPressure(H.P); api.setFlow(0.6);
  render();
  if (!H.vessel) ctx.ready(false, '조건을 견디는 구조를 찾으세요'); else ctx.ready(true);
}

/* ================= 4. 루프 설계 ================= */
const SPLIT = [1, 3, 3];
const START = { P: 200, Tin: [420, 430, 420], V: 4, F: 150, purge: 1.5, purif: 'none' };
const GOOD = { P: 250, Tin: [380, 400, 380], V: 6, F: 190, purge: 3, purif: 'wash' };
function stepLoop(ctx) {
  const H = hab(ctx), api = ctx.scene.api, st = ctx.state;
  H.d ||= JSON.parse(JSON.stringify(START)); const d = H.d;
  const root = h('div', { class: 'stack' }), ctl = h('div', { class: 'stack' }), out = h('div', { class: 'stack' }), after = h('div', { class: 'stack' });
  const solve = () => C.solveLoop({ P: d.P, Tin: d.Tin, V: d.V, F: d.F, yI: 0.015, purge: d.purge / 100, TsepC: -10, cat: 'feK', purif: d.purif, split: SPLIT });
  const judge = (r) => {
    const lim = C.CATALYSTS.feK.Tmax, Tmax = r.Tmax - 273.15;
    const v = H.vessel ? C.vesselCheck(H.vessel, { P: d.P, pH2Bar: d.P * r.yIn.H2, Tgas: Tmax }) : { ok: false, reasons: ['용기를 먼저 고르세요'] };
    return [
      { ok: r.tpd >= 30, label: '생산량 ≥ 30 t/d', val: `${fmt(r.tpd, 1)} t/d`, hint: r.act < 0.2 ? '촉매가 독에 중독되어 활성이 크게 떨어졌습니다. 원료 가스의 CO·황 화합물을 "물 세척"으로 제거하세요.' : '신규 공급량 또는 촉매량을 늘리거나 압력을 높여 보세요.' },
      { ok: Tmax <= lim, label: `촉매 최고온도 ≤ ${lim} °C`, val: `${fmt(Tmax, 0)} °C`, hint: '각 층 입구 온도를 낮추세요. 발열로 층 안에서 온도가 더 오릅니다.' },
      { ok: v.ok, label: '용기 안전', val: v.ok ? '통과' : v.reasons[0], hint: '설계압이 용기 정격을 넘었거나 벽 온도가 한계를 넘었습니다. 압력을 낮추세요.' },
      { ok: r.inertIn <= 0.14, label: '순환 가스 불활성 ≤ 14 %', val: `${fmt(r.inertIn * 100, 1)} %`, hint: '반응하지 않는 불활성 기체가 쌓이고 있습니다. 퍼지를 늘리세요.' },
    ];
  };
  const energy = (r) => clamp((4.6 - r.GJperT) / 1.4, 0, 1);
  let last = null;
  const paintOut = () => {
    const r = solve();
    out.innerHTML = '';
    if (!r.converged) { out.appendChild(callout('bad', '순환 계산이 수렴하지 않았습니다. 조건을 조금 바꿔 보세요.')); return; }
    const J = judge(r); last = { r, J };
    J.forEach((j) => out.appendChild(kv(j.label, j.val, '', j.ok ? 'good' : 'bad')));
    out.appendChild(h('div', {}, kv('순환비 (재순환 / 신규)', fmt(r.recycleRatio, 1)), kv('한 번 통과 N₂ 전환', fmt(r.perPassN2 * 100, 1), '%'), kv('루프 동력', fmt(r.GJperT, 2), 'GJ/t')));
    const eq = []; for (let T = 340; T <= 620; T += 5) { const y = C.eqNH3Fraction(T + 273.15, d.P) * 100; if (y <= 40) eq.push([y, T]); }
    const path = []; r.rx.beds.forEach((b) => b.profile.forEach((p, i) => { if (i % 3 === 0 || i === b.profile.length - 1) path.push([p.y * 100, p.T - 273.15]); }));
    out.append(lineChart({ w: 400, h: 220, x: { min: 0, max: 40, ticks: 8, label: 'NH₃ 몰분율 (%)' }, y: { min: 340, max: 620, ticks: 7, label: '온도 (°C)' },
      series: [{ pts: eq, color: '#8a98a6', dash: '5 4', width: 1.5 }, { pts: path, color: 'var(--accent)', width: 2.2 }], hlines: [{ y: C.CATALYSTS.feK.Tmax, color: '#e0715c', label: '촉매 한계' }], title: '가스의 온도–농도 경로' }),
      legend([{ color: '#8a98a6', label: '평형 곡선 (이 선에 닿으면 그 층은 끝)' }, { color: 'var(--accent)', label: '실제 경로 (층마다 오르고 층 사이에서 식음)' }]));
    const bad = J.filter((j) => !j.ok);
    if (bad.length) out.appendChild(callout('warn', h('b', {}, '먼저 고칠 곳. '), bad[0].hint));
    if (st.done) return;
    out.appendChild(h('button', { class: 'btn primary', disabled: bad.length > 0, onclick: () => submit(r, J) }, bad.length ? `조건 ${bad.length}개를 더 맞추세요` : '설계 확정'));
    api.setBeds(r.rx.beds.map((b) => b.Tout - 273.15)); api.setPressure(d.P); api.setFlare(clamp(d.purge / 6, 0, 1)); api.setSeparator({ frost: 1, liquid: clamp(r.tpd / 50, 0.1, 1) }); api.setFlow(clamp(0.3 + d.F / 300, 0.3, 1)); api.setAlert(!J[2].ok);
  };
  const submit = (r, J) => {
    st.done = true;
    const base = J.filter((j) => j.ok).length / J.length;
    ctx.score('loop', clamp(base * (0.75 + 0.25 * energy(r)) - (H.hint ? 0.1 : 0), 0, 1), 40, '루프 설계');
    nbadd(ctx, 'design', '확정 설계', `${d.P} bar · ${fmt(r.tpd, 1)} t/d · ${fmt(r.GJperT, 2)} GJ/t`, '', 0);
    toast('설계 확정'); H.last = { r, J }; paintOut(); paintAfter();
  };
  const paintAfter = () => {
    after.innerHTML = '';
    if (!st.done) { ctx.ready(false, '모든 조건을 만족하고 확정하세요'); return; }
    const qs = [
      { k: 'w1', type: 'mc', title: '1. 촉매층 사이에서 가스를 식히는 이유', body: '위 그래프에서 경로가 층마다 꺾여 내려오는 부분입니다.', opts: [['a', '평형 곡선에 닿으면 그 층은 더 못 가므로, 식혀서 평형에서 다시 멀어지게 해야 반응을 이어 갈 수 있다'], ['b', '압력을 낮추기 위해'], ['c', '촉매를 재생하기 위해']], ans: 'a', hint: '경로가 어느 선에 가까워질 때 식히는지 보세요.', sol: '발열로 온도가 오르면 경로가 평형 곡선(회색)에 다가가 전환이 멈춥니다. 식히면 같은 농도에서 평형이 더 위에 있게 되어 다음 층에서 다시 진행합니다.' },
      { k: 'w2', type: 'mc', title: '2. 퍼지를 두는 이유', body: '퍼지는 반응물을 일부 버리는 일인데도 하는 이유입니다.', opts: [['a', '반응하지 않는 불활성 기체(Ar, CH₄)가 루프에 쌓여 속도를 떨어뜨리므로, 일부를 내보내 농도를 일정하게 유지한다'], ['b', '암모니아를 안전하게 태우기 위해'], ['c', '압력이 너무 오르는 것을 막기 위해']], ans: 'a', hint: '순환 루프에서 반응하지 않는 물질이 나가는 길은 어디일까요.', sol: '정상상태에서 불활성 기체의 유입량과 퍼지 유출량이 같아야 합니다. 퍼지를 늘리면 반응물 손실이 늘고, 줄이면 불활성 농도가 오릅니다.' },
    ];
    after.appendChild(sec('설계 근거'));
    after.appendChild(runQuiz({ ...ctx, state: { ...ctx.state, q: (ctx.state.wq ||= {}) }, score: ctx.score, ready: ctx.ready }, qs, { scoreKey: 'why', weight: 20, label: '설계 근거', intro: '확정한 설계가 왜 그렇게 타협되어야 했는지 확인합니다.' }));
  };
  const buildCtl = () => {
    ctl.innerHTML = '';
    const rerun = () => { paintOut(); };
    const sP = slider({ label: '운전 압력', unit: 'bar', min: 150, max: 300, step: 10, value: d.P, onInput: (v) => { d.P = v; rerun(); }, note: '높을수록 평형·속도에 유리하지만, 압축 동력과 용기 부담이 커집니다.' });
    const tins = d.Tin.map((_, i) => slider({ label: `${i + 1}단 입구 온도`, unit: '°C', min: 330, max: 440, step: 5, value: d.Tin[i], onInput: (v) => { d.Tin[i] = v; rerun(); } }));
    const sV = slider({ label: '촉매량', unit: 'm³', min: 2, max: 10, step: 0.5, value: d.V, digits: 1, onInput: (v) => { d.V = v; rerun(); }, note: '많을수록 반응은 진행되지만 비용이 듭니다.' });
    const sF = slider({ label: '신규 공급 가스', unit: 'kmol/h', min: 100, max: 240, step: 5, value: d.F, onInput: (v) => { d.F = v; rerun(); }, note: '생산량은 결국 새로 넣는 가스의 양이 정합니다.' });
    const sG = slider({ label: '퍼지 (순환 가스 중 버리는 비율)', unit: '%', min: 0.5, max: 6, step: 0.5, value: d.purge, digits: 1, onInput: (v) => { d.purge = v; rerun(); }, note: '원료 가스에는 불활성 기체가 1.5% 섞여 있습니다.' });
    const pur = choice({ options: [{ value: 'none', label: '정제 안 함', desc: 'CO·황 화합물이 촉매를 독화시킨다' }, { value: 'wash', label: '물 세척 정제', desc: '1913년에 쓸 수 있는 방법' }], value: d.purif, name: '원료 가스 정제', onChange: (v) => { d.purif = v; rerun(); } });
    const hint = h('button', { class: 'btn sm ghost', onclick: () => { Object.assign(d, JSON.parse(JSON.stringify(GOOD))); H.hint = true; toast('추천 출발점을 불러왔습니다 (점수 10% 감점)'); buildCtl(); paintOut(); } }, '막히면: 추천 출발점 불러오기 (감점 10%)');
    ctl.append(h('p', { class: 'sub' }, '촉매는 촉진 철을 씁니다. 분리기는 −10 °C로 고정입니다.'), sec('반응기'), sP, ...tins, sV, pur, sec('순환 루프'), sF, sG, hint);
  };
  root.append(callout('', h('b', {}, '목표. '), '아래 네 조건을 모두 만족하는 설계를 찾습니다. 값을 바꾸면 결과가 바로 갱신됩니다. 막히면 "먼저 고칠 곳"의 안내를 따라가세요.'), out, sec('조절'), ctl, after);
  ctx.el.appendChild(root);
  ctx.fly('overview'); buildCtl(); paintOut(); paintAfter();
}

/* ================= 5. 사건 해설 ================= */
function stepDebrief(ctx) {
  const res = (ctx.state.res ||= ctx.finish()), H = hab(ctx);
  const wrap = h('div', { class: 'stack' });
  wrap.appendChild(h('div', { class: 'score-ring' }, h('div', { class: 'ring', style: { '--p': res.total } }, h('b', {}, res.total)), h('div', {}, h('div', { style: { fontFamily: 'var(--serif)', fontSize: '20px' } }, res.rank), h('div', { class: 'sub' }, '단계별 점수의 가중 평균'))));
  res.items.forEach((s) => wrap.appendChild(h('div', {}, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'sub' }, s.label), h('span', { class: 'sub' }, Math.round(s.value * 100) + '점')), h('div', { class: 'bar' }, h('i', { style: { width: s.value * 100 + '%' } })))));
  wrap.appendChild(sec('실제 역사는 어떻게 흘렀나'));
  wrap.appendChild(h('ul', { class: 'timeline' },
    ...[['1898', '크룩스: 고정 질소 부족이 곧 닥칠 식량 문제라고 경고한다.'],
      ['1909', '하버: 고압 순환 탁상 장치 시연. BASF가 사업화를 추진한다.'],
      ['1910–12', '미타슈 팀의 촉매 탐색, 보슈의 고압 반응기와 라이너 구조.'],
      ['1913', '오파우 공장 가동.'],
      ['1918 · 1931', '하버(1918), 보슈와 베르기우스(1931)가 노벨 화학상을 받는다.'],
      ['1921', '오파우의 비료 저장 설비에서 폭발이 일어나 수백 명이 죽는다.']].map(([y, t]) => h('li', {}, h('b', {}, y), t))));
  wrap.appendChild(sec('화학공학과 이어지는 곳'));
  wrap.appendChild(callout('', h('b', {}, '순환, 퍼지, 평형 한계, 재료. '), '한 번 통과 전환율이 낮은 반응도 분리와 순환으로 총 전환을 높일 수 있고, 그 대가로 순환 동력과 불활성 축적이 생깁니다. 라부아지에 사건에서 배운 질량수지가 이 루프의 장부가 됩니다.'));
  wrap.appendChild(sec('함께 생각해 볼 것'));
  wrap.appendChild(h('ul', { class: 'sub', style: { paddingLeft: '18px', margin: 0 } },
    h('li', {}, '이 공정으로 만든 질소 비료는 오늘날 인류 식량의 상당 부분을 떠받친다는 추정이 널리 인용됩니다. 같은 기술은 폭약의 원료이기도 했습니다.'),
    h('li', {}, '하버는 1차 세계대전에서 독가스 개발도 이끌었습니다. 노벨상 수상 자체를 두고도 당시부터 논란이 있었습니다.'),
    h('li', {}, '이 게임의 수치(30 t/d 등)는 교육용 모델의 값이며 실제 오파우의 값이 아닙니다.')));
  const text = () => `[사건 02 · 공기에서 빵을] 암모니아 합성(하버–보슈법)을 1909년 실험대와 1913년 공장 설계로 재구성해 조사함. `
    + `온도·압력·촉매를 바꾸어 측정하며 평형은 저온·고압에 유리하지만 속도 때문에 중간 온도가 최적임을 확인함. 촉매는 평형을 바꾸지 못하고 속도만 높임을 확인함. `
    + `고압 수소에 의한 탄소강의 수소 침해와 라이너 구조의 필요성을 시험으로 확인하고, 층간 냉각·순환·퍼지·원료 정제를 조합해 하루 30톤 이상(모델 기준)을 만드는 루프를 설계함. (결과 ${res.total}점)`;
  wrap.appendChild(sec('활동 기록 초안'));
  wrap.appendChild(h('p', { class: 'sub' }, '내가 한 활동을 정리한 초안입니다. 그대로 쓰지 말고, 실제로 한 것과 느낀 점을 직접 고쳐 쓰세요.'));
  wrap.appendChild(h('div', { class: 'paper', style: { fontSize: '13px' } }, text()));
  wrap.appendChild(h('div', { class: 'row', style: { marginTop: '8px' } }, copyButton(text), h('button', { class: 'btn primary', onclick: () => ctx.exit() }, '사건 목록으로'), h('button', { class: 'btn', onclick: () => ctx.restart() }, '다시 조사하기')));
  ctx.el.appendChild(wrap);
  ctx.fly('overview');
}

export default {
  id: 'haber', no: '02', year: '1913', title: '공기에서 빵을',
  blurb: '평형은 저온을, 속도는 고온을 원한다. 1909년 실험대에서 이 충돌을 확인하고, 용기와 순환 루프를 설계해 하루 30톤의 암모니아를 만든다.',
  tags: [{ label: '반응공학', on: true }, { label: '화학평형', on: true }, { label: '재료', on: false }],
  accent: '#6cc0dd',
  viewButtons: [{ id: 'overview', label: '전체' }, { id: 'reactor', label: '반응기' }, { id: 'loop', label: '순환 루프' }, { id: 'bench', label: '1909 실험대' }],
  createScene(e) { return createHaberScene(e); },
  steps: [
    { id: 'file', label: '사건 기록', title: '사건 기록', sub: '자료를 읽으세요', gate: '자료를 모두 읽으세요', view: 'overview', mount: stepDossier },
    { id: 'bench', label: '1909 실험', title: '1909년 실험대', sub: '세 가지를 확인합니다', gate: '세 실험을 마치세요', view: 'bench', mount: stepBench },
    { id: 'vessel', label: '용기', title: '용기 재료', sub: '고압 수소를 견디는 구조', gate: '조건을 견디는 구조를 찾으세요', view: 'reactor', mount: stepVessel },
    { id: 'loop', label: '루프 설계', title: '합성 루프 설계', sub: '네 조건을 모두 만족시킵니다', gate: '조건을 만족하고 확정하세요', view: 'overview', mount: stepLoop },
    { id: 'debrief', label: '사건 해설', title: '사건 해설', sub: '결과와 실제 역사', view: 'overview', mount: stepDebrief },
  ],
};
