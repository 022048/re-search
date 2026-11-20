// 마스코트: 보안경을 이마에 올린 노란 오리 (직접 그린 SVG)
export function duckSvg() {
  const s = document.createElement('span');
  s.className = 'mascot';
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', '보안경을 이마에 올린 오리');
  s.innerHTML = `<svg viewBox="0 0 220 205" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">
  <g fill="#ff9f43" stroke="#4a3320" stroke-width="5"><path d="M92 184 l-10 14 h26 z"/><path d="M134 182 l-8 14 h26 z"/></g>
  <path d="M38 122 C28 82 68 62 112 66 C162 70 192 100 186 142 C180 178 132 188 96 184 C58 180 44 158 38 122 Z" fill="#ffd54f" stroke="#4a3320" stroke-width="5"/>
  <path d="M120 112 C152 100 178 120 168 146 C150 152 128 142 120 112 Z" fill="#ffc107" stroke="#4a3320" stroke-width="5"/>
  <path d="M50 72 C38 36 74 12 106 22 C138 32 144 66 122 86 C100 104 60 102 50 72 Z" fill="#ffd54f" stroke="#4a3320" stroke-width="5"/>
  <path d="M42 64 C22 60 12 74 20 84 C30 94 52 90 62 82 Z" fill="#ff9f43" stroke="#4a3320" stroke-width="5"/>
  <path d="M68 33 C92 22 120 28 130 46" fill="none" stroke="#3b6ea5" stroke-width="8"/>
  <circle cx="100" cy="27" r="14" fill="#cdeaf6" stroke="#4a3320" stroke-width="5"/>
  <path d="M93 22 C96 18 101 17 105 19" fill="none" stroke="#fff" stroke-width="3"/>
  <circle cx="80" cy="54" r="5.5" fill="#2b1d12" stroke="none"/><circle cx="82" cy="52" r="1.8" fill="#fff" stroke="none"/>
  <ellipse cx="68" cy="74" rx="8" ry="5" fill="#ff8f7a" opacity=".55" stroke="none"/>
</svg>`;
  return s;
}
