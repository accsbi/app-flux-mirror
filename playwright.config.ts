import { defineConfig, devices } from '@playwright/test'

// 正式 E2E テスト（@playwright/test）。手動スクショ目視でなく test()/expect() で自動判定。
// 実機解像度(Pixel5=1080×2340 等。Google INFO規格 1080×1920 とは別)・en/ja/zh・HTMLレポート。
export default defineConfig({
  testDir: './e2e_test',
  testMatch: '**/specs/*.spec.ts',  // 各 <game>/specs/ を対象。1ゲームのみ: `npx playwright test e2e_test/<game>/specs`
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // サーバ不要の単一 HTML 方針。Playwright のフォルダ型レポートは作らない（list のみ）。
  // 証跡は _helpers.snap が e2e_test/<game>/screenshots/ に保存し、scripts/build_report.py が単一 test-report.html を生成。
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5210',
    screenshot: 'off',         // 証跡は _helpers.snap が screenshots/ に保存（フォルダ型レポート不使用）。
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'pixel5', use: { ...devices['Pixel 5'] } },  // 393×851@2.75 = 1080×2340 (実機)
  ],
  webServer: {
    command: 'npx vite --port 5210',
    url: `http://127.0.0.1:5210/web-games/android/${process.env.GAME ?? 'old-maid'}.html`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
