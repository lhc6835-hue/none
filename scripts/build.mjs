// src/main.js 를 하나로 묶어서 HTML 한 파일(dist/index.html)로 만든다.
// --watch 를 주면 고칠 때마다 다시 만든다.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');
mkdirSync('dist', { recursive: true });

function writeHtml(js) {
  const shell = readFileSync('index.html', 'utf8');
  const html = shell.replace('<script type="module" src="src/main.js"></script>', () => `<script>\n${js}\n</script>`);
  if (html === shell) throw new Error('index.html 에서 스크립트 자리를 못 찾았어요');
  writeFileSync('dist/index.html', html);
  console.log(`dist/index.html (${(html.length / 1024).toFixed(0)} KB)`);
}

const options = {
  entryPoints: ['src/main.js'], bundle: true, format: 'iife', target: 'es2020',
  minify: !watch, write: false, legalComments: 'none',
};

if (watch) {
  const ctx = await esbuild.context({ ...options, plugins: [{ name: 'html', setup(b) {
    b.onEnd(r => { if (!r.errors.length) writeHtml(r.outputFiles[0].text); });
  } }] });
  await ctx.watch();
  console.log('고칠 때마다 dist/index.html 을 다시 만들어요. 브라우저에서 열어두고 새로고침하세요.');
} else {
  const r = await esbuild.build(options);
  writeHtml(r.outputFiles[0].text);
}
