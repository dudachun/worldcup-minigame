import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const targetUrl = process.env.QA_URL ?? 'http://127.0.0.1:5175/';
const outputDir = path.join(os.tmpdir(), 'world-cup-ai-shootout-qa');

await mkdir(outputDir, { recursive: true });

const systemBrowserPath = [
  process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((candidate) => candidate && existsSync(candidate));

const browser = await chromium.launch(systemBrowserPath ? { executablePath: systemBrowserPath } : undefined);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const consoleIssues = [];
const responseIssues = [];

page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type()) && !/Failed to load resource/i.test(message.text())) {
    consoleIssues.push(`${message.type()}: ${message.text()}`);
  }
});

page.on('pageerror', (error) => {
  consoleIssues.push(`pageerror: ${error.message}`);
});

page.on('response', (response) => {
  const status = response.status();
  const url = response.url();
  if (status >= 400 && !/favicon/i.test(url)) {
    responseIssues.push(`${status}: ${url}`);
  }
});

await page.goto(targetUrl, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: /2026 世界杯 AI 模拟器/ }).waitFor();

const desktopHomeShot = path.join(outputDir, 'desktop-home.png');
await page.screenshot({ path: desktopHomeShot, fullPage: true });

await page.getByRole('button', { name: '开始游戏' }).click();
await page.getByRole('heading', { name: '选择球队与战术' }).waitFor();

const teamCardCount = await page.locator('.team-list button').count();
if (teamCardCount < 40) {
  throw new Error(`Expected at least 40 visible team cards, found ${teamCardCount}`);
}

const desktopShot = path.join(outputDir, 'desktop-setup.png');
await page.screenshot({ path: desktopShot, fullPage: true });

await page.getByRole('button', { name: '60s' }).click();
await page.getByRole('button', { name: '开始模拟比赛' }).click();
await page.getByRole('button', { name: '立即结算' }).waitFor();

const initialScoreText = await page.locator('.team-score b').evaluateAll((nodes) =>
  nodes.map((node) => node.textContent?.trim() ?? ''),
);
if (initialScoreText.join('-') !== '0-0') {
  throw new Error(`Expected initial live scoreboard to start at 0-0, found ${initialScoreText.join('-')}`);
}

await page.waitForTimeout(2200);

const fieldPlayerCount = await page.locator('.field-player').count();
if (fieldPlayerCount !== 22) {
  throw new Error(`Expected 22 DOM field players including keepers, found ${fieldPlayerCount}`);
}

const fieldCanvasCount = await page.locator('.match-field canvas').count();
if (fieldCanvasCount !== 0) {
  throw new Error(`Expected DOM/CSS match field without canvas, found ${fieldCanvasCount} canvas element(s)`);
}

const feedHeaderText = await page.locator('.feed-header').innerText();
if (feedHeaderText.includes('/')) {
  throw new Error(`Live feed header exposes event progress: ${feedHeaderText}`);
}

const desktopMatchShot = path.join(outputDir, 'desktop-match-animation.png');
await page.screenshot({ path: desktopMatchShot, fullPage: true });

await page.getByRole('button', { name: '立即结算' }).click();
await page.getByText('完场结果').waitFor();

const shotDots = await page.locator('.shot-dot').count();
if (shotDots === 0) {
  throw new Error('Expected shot-map dots after finishing a match');
}

const misplacedShotDots = await page.locator('.shot-dot:not(.blocked)').evaluateAll((dots) =>
  dots
    .map((dot) => Number.parseFloat((dot instanceof HTMLElement ? dot.style.left : '50').replace('%', '')))
    .filter((left) => left >= 18 && left <= 82),
);
if (misplacedShotDots.length > 0) {
  throw new Error(`Expected non-blocked shot-map dots near goal, found central x positions: ${misplacedShotDots.join(', ')}`);
}

const feedItemCount = await page.locator('.feed-list article').count();
if (feedItemCount < 10 || feedItemCount > 15) {
  throw new Error(`Expected 10 to 15 live feed items after finishing a match, found ${feedItemCount}`);
}

const resultsShot = path.join(outputDir, 'desktop-results.png');
await page.screenshot({ path: resultsShot, fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(targetUrl, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: /2026 世界杯 AI 模拟器/ }).waitFor();
await page.getByRole('button', { name: '开始游戏' }).click();
await page.getByRole('heading', { name: '选择球队与战术' }).waitFor();

const mobileTeamCards = await page.locator('.team-list button').count();
if (mobileTeamCards < 40) {
  throw new Error(`Expected at least 40 mobile team cards, found ${mobileTeamCards}`);
}

const mobileShot = path.join(outputDir, 'mobile-setup.png');
await page.screenshot({ path: mobileShot, fullPage: true });

await browser.close();

const relevantIssues = [...consoleIssues, ...responseIssues].filter((issue) => !/favicon/i.test(issue));
if (relevantIssues.length > 0) {
  throw new Error(`Console issues found:\n${relevantIssues.join('\n')}`);
}

console.log(
  JSON.stringify(
    {
      targetUrl,
      teamCardCount,
      fieldPlayerCount,
      feedItemCount,
      shotDots,
      screenshots: [desktopHomeShot, desktopShot, desktopMatchShot, resultsShot, mobileShot],
    },
    null,
    2,
  ),
);
