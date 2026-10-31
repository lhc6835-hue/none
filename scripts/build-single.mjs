// 단독 실행 HTML 만들기: `npm run build:single` → dist-single/dotline-garden.html
// 코드와 갈무리 글꼴(base64)을 한 파일에 넣어서 더블클릭만으로 열린다(file:// 에서는 외부 모듈 스크립트를 브라우저가 막는다).
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

execFileSync('npx', ['vite', 'build', '--config', 'scripts/vite.single.config.mjs'], {
  stdio: 'inherit',
});

const out = 'dist-single/build';
const fontsDir = 'public/fonts';
const fonts = {};
for (const f of readdirSync(fontsDir)) {
  if (f.endsWith('.woff2'))
    fonts[f] = 'data:font/woff2;base64,' + readFileSync(`${fontsDir}/${f}`).toString('base64');
}
const entry = readdirSync(`${out}/assets`).find((f) => /^index-.*\.js$/.test(f));
const js = readFileSync(`${out}/assets/${entry}`, 'utf8');
if (/<\/script/i.test(js) || js.includes('<!--')) throw new Error('script-unsafe sequence in bundle');

let html = readFileSync(`${out}/index.html`, 'utf8');
html = html.replace(/\s*<link rel="(?:module)?preload"[^>]*>/g, '');
html = html.replace(/\s*<script type="module"[^>]*><\/script>/, '');
const ofl = readFileSync(`${fontsDir}/OFL.txt`, 'utf8').replace(/-{2,}/g, (m) => '='.repeat(m.length));
const note = `\n    <!-- Galmuri 2.40.3 (https://galmuri.quiple.dev), SIL Open Font License 1.1. Full text below.\n${ofl}\n    -->`;
html = html.replace(/<meta charset="UTF-8" \/>/, (m) => m + note);

// 폰트는 FontFace 로 올리므로 파일 요청을 내장 데이터로 바꿔 준다
const shim = `<script>
(function () {
  var D = ${JSON.stringify(fonts)};
  var O = window.FontFace;
  function F(family, source, desc) {
    if (typeof source === 'string') {
      var m = /fonts\\/([\\w.-]+\\.woff2)/.exec(source);
      if (m && D[m[1]]) source = "url(" + D[m[1]] + ") format('woff2')";
    }
    return new O(family, source, desc);
  }
  F.prototype = O.prototype;
  window.FontFace = F;
})();
</script>
<script type="module">
${js}
</script>
`;
html = html.replace('</body>', () => shim + '</body>');
writeFileSync('dist-single/dotline-garden.html', html);
console.log(`dist-single/dotline-garden.html (${(html.length / 1e6).toFixed(1)} MB)`);
