// 문항 묶음 UI. 선택형(mc)은 바로 피드백을 주고, 두 번 틀리면 정답과 풀이를 보여 준다.
// 숫자형(num)은 허용 오차를 넉넉히 두고 "풀이 보기"를 언제나 열어 둔다.
import { h, toast, choice } from './ui.js';

/**
 * qs: [{k, type:'num'|'mc', title, body, data?:[[label,value]], hint?, unit?, exp?, tol?, rel?, opts?:[[v,label]], ans?, sol}]
 * 모두 해결하면 ctx.score(scoreKey, 평균, weight, label)과 ctx.ready(true)를 호출한다.
 */
export function runQuiz(ctx, qs, { scoreKey, weight, label, intro, tries = [1, 0.6, 0.3], onDone }) {
  const st = (ctx.state.q ||= {});
  const root = h('div', { class: 'stack' });
  const settled = () => qs.every((q) => st[q.k]?.ok || st[q.k]?.shown);
  const upd = () => {
    if (settled()) {
      const v = qs.map((q) => { const s = st[q.k]; return s.ok ? tries[Math.min(s.tries - 1, tries.length - 1)] : 0; });
      if (scoreKey) ctx.score(scoreKey, v.reduce((a, b) => a + b, 0) / v.length, weight, label);
      ctx.ready(true);
      onDone?.();
    } else ctx.ready(false, '아래 문항을 모두 마치면 다음으로 갈 수 있습니다');
  };
  const render = () => {
    root.innerHTML = '';
    if (intro) root.appendChild(h('p', { class: 'lead' }, intro));
    qs.forEach((q) => {
      const s = (st[q.k] ||= { tries: 0, ok: false, shown: false });
      const box = h('div', { class: 'callout ' + (s.ok ? 'good' : s.shown ? 'bad' : '') });
      box.appendChild(h('div', {}, h('b', {}, q.title)));
      box.appendChild(h('p', { class: 'sub', style: { margin: '4px 0 8px' } }, q.body));
      if (q.data) box.appendChild(h('div', { style: { marginBottom: '8px' } }, ...q.data.map(([a, b]) => h('div', { class: 'kv' }, h('span', {}, a), h('b', {}, b)))));
      if (q.type === 'num') {
        const inp = h('input', { type: 'number', step: 'any', inputmode: 'decimal', disabled: s.ok || s.shown, 'aria-label': q.title, value: s.val ?? '' });
        const go = () => {
          const v = parseFloat(inp.value); if (!Number.isFinite(v)) return;
          s.val = inp.value; s.tries++;
          const err = q.rel ? Math.abs(v - q.exp) / Math.abs(q.exp) : Math.abs(v - q.exp);
          if (err <= q.tol) s.ok = true; else toast('값이 맞지 않습니다');
          render(); upd();
        };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        box.appendChild(h('div', { class: 'num-row' + (s.ok ? ' ok' : s.tries && !s.shown ? ' no' : '') }, inp, h('button', { class: 'btn sm', disabled: s.ok || s.shown, onclick: go }, '확인'), h('span', { class: 'unit' }, q.unit || '')));
        if (!s.ok && !s.shown) box.appendChild(h('button', { class: 'btn sm ghost', style: { marginTop: '8px' }, onclick: () => { s.shown = true; render(); upd(); } }, '풀이 보기'));
      } else {
        const ch = choice({ options: q.opts.map(([v, l]) => ({ value: v, label: l })), value: s.val, name: q.title, onChange: (v) => {
          if (s.ok || s.shown) return;
          s.val = v; s.tries++;
          if (v === q.ans) s.ok = true; else if (s.tries >= 2) s.shown = true; else toast('아쉽습니다. 힌트를 보고 다시 골라 보세요');
          render(); upd();
        } });
        ch.api.buttons().forEach((b, i) => {
          if ((s.ok || s.shown) && q.opts[i][0] === q.ans) b.classList.add('right');
          if (s.val === q.opts[i][0] && !s.ok) b.classList.add('wrong');
          if (s.ok || s.shown) b.disabled = true;
        });
        box.appendChild(ch);
        if (!s.ok && !s.shown && s.tries >= 1 && q.hint) box.appendChild(h('p', { class: 'sub', style: { margin: '8px 0 0', color: 'var(--warn)' } }, '힌트: ' + q.hint));
      }
      if (s.ok || s.shown) box.appendChild(h('p', { class: 'sub', style: { margin: '8px 0 0' } }, (s.ok ? '정답. ' : '정답은 위에 표시했습니다. ') + q.sol));
      root.appendChild(box);
    });
  };
  render(); upd();
  return root;
}

/** 활동 요약 텍스트 복사 버튼 */
export function copyButton(getText, label = '활동 요약 복사') {
  return h('button', { class: 'btn', onclick: async (e) => {
    const t = getText();
    try { await navigator.clipboard.writeText(t); toast('복사했습니다'); }
    catch { const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('복사했습니다'); } catch { toast('복사하지 못했습니다'); } ta.remove(); }
  } }, label);
}
