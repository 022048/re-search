// 사건 모듈이 함께 쓰는 작은 조각들: 자료 읽기, 목적 상자, 즉시 피드백 문항, 활동 요약
import { h, tabs } from './ui.js';

export const sec = (t) => h('h3', { class: 'sec' }, t);
export const callout = (cls, ...c) => h('div', { class: 'callout ' + cls }, ...c);

export function paper(title, src, stampText, ...body) {
  return h('div', { class: 'paper' }, stampText ? h('span', { class: 'stamp ' + (stampText === '1차 기록' ? 'primary' : stampText === '2차 자료' ? 'secondary' : 'recon') }, stampText) : null,
    h('h4', {}, title), h('div', { class: 'src' }, src), ...body.map((b) => (typeof b === 'string' ? h('p', {}, b) : b)));
}

/** 단계 맨 위에 두는 "무엇을, 왜" 상자 */
export function goal(what, why) {
  return h('div', { class: 'callout goal' }, h('b', {}, '이 단계에서 할 일. '), what, h('br'), h('span', { class: 'sub' }, '왜 하나: ' + why));
}

/** 탭으로 나뉜 자료를 모두 열어 보면 다음 단계로 */
export function readDocs(ctx, docs) {
  const view = h('div');
  const tb = tabs(docs.map((d) => d[0]), (i) => { view.innerHTML = ''; view.appendChild(docs[i][1]); check(); });
  const check = () => {
    if (ctx.state.read || tb.api.seen().size >= docs.length) { ctx.state.read = true; ctx.ready(true); }
    else ctx.ready(false, `자료 ${docs.length - tb.api.seen().size}개를 더 열어 보세요`);
  };
  view.appendChild(docs[0][1]);
  ctx.el.append(tb, view);
  check();
}

/**
 * 바로 피드백이 나오는 선택 문항. 틀려도 다시 고를 수 있고, 첫 시도에 맞히면 1점, 이후에 맞히면 0.5점.
 * store: 단계 state 안의 객체(다시 들어와도 유지), onResolve(score): 맞히면 호출
 */
export function mcq({ store, q, opts, ans, why, hint, onResolve }) {
  const box = h('div', { class: 'callout' });
  const render = () => {
    box.className = 'callout ' + (store.done ? 'good' : store.tries ? 'warn' : '');
    box.innerHTML = '';
    box.appendChild(h('div', { style: { marginBottom: '8px' } }, h('b', {}, q)));
    const list = h('div', { class: 'stack' });
    opts.forEach(([v, l]) => list.appendChild(h('button', {
      class: 'opt' + (store.done && v === ans ? ' right' : (store.wrong || []).includes(v) ? ' wrong' : ''), disabled: store.done || (store.wrong || []).includes(v),
      onclick: () => {
        store.tries = (store.tries || 0) + 1;
        if (v === ans) store.done = true; else (store.wrong ||= []).push(v);
        render();
        if (store.done) onResolve?.(store.tries === 1 ? 1 : 0.5);
      },
    }, h('span', { class: 'dot' }), h('span', {}, l))));
    box.appendChild(list);
    if (!store.done && store.tries && hint) box.appendChild(h('p', { class: 'sub', style: { margin: '8px 0 0' } }, '힌트: ' + hint));
    if (store.done) box.appendChild(h('p', { class: 'sub', style: { margin: '8px 0 0' } }, why));
  };
  render();
  if (store.done) onResolve?.(store.tries === 1 ? 1 : 0.5);
  return box;
}

/** 결과 화면: 점수 고리와 항목별 막대 */
export function scoreView(res) {
  const wrap = h('div', { class: 'stack' });
  wrap.appendChild(h('div', { class: 'score-ring' }, h('div', { class: 'ring', style: { '--p': res.total } }, h('b', {}, res.total)), h('div', {}, h('div', { style: { fontFamily: 'var(--serif)', fontSize: '20px' } }, res.rank), h('div', { class: 'sub' }, '단계별 점수의 가중 평균'))));
  res.items.forEach((s) => wrap.appendChild(h('div', {}, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'sub' }, s.label), h('span', { class: 'sub' }, Math.round(s.value * 100) + '점')), h('div', { class: 'bar' }, h('i', { style: { width: s.value * 100 + '%' } })))));
  return wrap;
}

/** 복사할 수 있는 활동 요약 (본인 기록 초안) */
export function summaryBox(text) {
  const ta = h('textarea', { rows: 9, style: { width: '100%', font: 'inherit', fontSize: '13px', background: 'var(--raise)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '4px', padding: '10px' } });
  ta.value = text;
  return h('div', { class: 'stack' },
    h('p', { class: 'sub' }, '내가 한 활동과 얻은 값으로 만든 초안입니다. 읽은 책의 문장과 내가 느낀 점을 직접 보태어 고쳐 쓰세요.'),
    ta, h('button', { class: 'btn sm', onclick: () => { ta.select(); try { navigator.clipboard.writeText(ta.value); } catch (e) { document.execCommand?.('copy'); } } }, '복사'));
}
