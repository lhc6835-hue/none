// 단독 실행 HTML 용 빌드 설정: 청크를 나누지 않고 한 파일로 묶는다(build-single.mjs 가 이어서 HTML 하나로 합친다).
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export default {
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    target: 'es2022',
    outDir: 'dist-single/build',
    emptyOutDir: true,
    modulePreload: false,
    chunkSizeWarningLimit: 5000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
};
