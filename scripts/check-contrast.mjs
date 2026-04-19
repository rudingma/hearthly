#!/usr/bin/env node
// WCAG 2.x relative-luminance contrast checker for Hearthly design tokens.

function parse(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function toLin(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function L(hex) {
  const [r, g, b] = parse(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function cr(a, b) {
  const la = L(a);
  const lb = L(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
function mix10(fg, bg) {
  const [fr, fgn, fb] = parse(fg);
  const [sr, sg, sb] = parse(bg);
  const m = (a, s) => Math.round(0.1 * a + 0.9 * s);
  return `#${[m(fr, sr), m(fgn, sg), m(fb, sb)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

const rows = [
  ['Primary button (light)', '#ffffff', '#7a3919', 4.5],
  ['Primary button (dark)', '#ffffff', '#a85230', 4.5],
  ['Accent text on Warm Stone (light)', '#a85230', '#f8f7f5', 4.5],
  ['Accent text on Clean Surface (light)', '#a85230', '#ffffff', 4.5],
  ['Accent text on dark canvas', '#e89468', '#0f0e0d', 4.5],
  ['Accent text on dark surface', '#e89468', '#1c1a18', 4.5],
  ['Body-muted on Warm Stone (light)', '#65605b', '#f8f7f5', 4.5],
  ['Body-muted on dark canvas', '#b5b0aa', '#0f0e0d', 4.5],
  ['Body-muted on dark surface', '#b5b0aa', '#1c1a18', 4.5],
  ['UI-label on Clean Surface (light)', '#78716c', '#ffffff', 4.5],
  ['UI-label on dark surface', '#a39e98', '#1c1a18', 4.5],
  ['Focus ring on Warm Stone (light)', '#a85230', '#f8f7f5', 3.0],
  ['Focus ring on dark canvas', '#e89468', '#0f0e0d', 3.0],
];
rows.push([
  '.badge--primary text on 10% tint (light)',
  '#a85230',
  mix10('#a85230', '#ffffff'),
  4.5,
]);
rows.push([
  '.badge--primary text on 10% tint (dark)',
  '#e89468',
  mix10('#e89468', '#1c1a18'),
  4.5,
]);

let failed = 0;
for (const [name, fg, bg, target] of rows) {
  const r = cr(fg, bg);
  const ok = r >= target;
  if (!ok) failed++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${r
      .toFixed(2)
      .padStart(5)}:1 (target ${target})  ${name}  fg=${fg} bg=${bg}`
  );
}
process.exit(failed === 0 ? 0 : 1);
