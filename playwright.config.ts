import { defineConfig } from '@playwright/test';

// E2E: 개발 서버를 띄워 1280×720 과 844×390(모바일 가로) 두 크기로 확인한다.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    launchOptions: {
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    { name: 'desktop-1280x720', use: { viewport: { width: 1280, height: 720 } } },
    {
      name: 'mobile-844x390',
      use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: false },
    },
  ],
  webServer: {
    command: 'npm run dev -- --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
