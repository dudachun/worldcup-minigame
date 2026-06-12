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
await page.evaluate(() => {
  window.localStorage.setItem('worldcup-minigame-assist-balance-cents', '1000000');
});
await page.goto(targetUrl, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: /2026 世界杯 AI 模拟器/ }).waitFor();

const desktopHomeShot = path.join(outputDir, 'desktop-home.png');
await page.screenshot({ path: desktopHomeShot, fullPage: true });

await page.getByRole('button', { name: '开始游戏' }).click();
await page.getByRole('heading', { name: '选择主队与客队' }).waitFor();

const regionPillCount = await page.locator('.region-pills button').count();
if (regionPillCount < 38) {
  throw new Error(`Expected region and group pills for both team pickers, found ${regionPillCount}`);
}

const groupPillVisible = await page.getByRole('button', { name: 'A组' }).first().isVisible();
if (!groupPillVisible) {
  throw new Error('Expected World Cup group pills such as A组 to be visible');
}

const durationText = await page.locator('.match-duration-chip strong').innerText();
if (durationText.trim() !== '60s') {
  throw new Error(`Expected fixed 60s match duration, found ${durationText}`);
}

const durationControlCount = await page.locator('.segmented button').count();
if (durationControlCount !== 0) {
  throw new Error(`Expected no selectable duration buttons, found ${durationControlCount}`);
}

const tacticButtonCount = await page.locator('.tactic-list button').count();
if (tacticButtonCount !== 0) {
  throw new Error(`Expected read-only tactics without tactic buttons, found ${tacticButtonCount}`);
}

const teamCardCount = await page.locator('.team-list button').count();
if (teamCardCount < 40) {
  throw new Error(`Expected at least 40 visible team cards, found ${teamCardCount}`);
}

const desktopTeamListColumns = await page.locator('.team-list').first().evaluate((node) =>
  window.getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length,
);
if (desktopTeamListColumns > 5) {
  throw new Error(`Expected desktop team list to use at most 5 columns, found ${desktopTeamListColumns}`);
}

const desktopRegionOverflow = await page.locator('.region-pills').first().evaluate((node) => ({
  x: node.scrollWidth > node.clientWidth + 1,
  y: node.scrollHeight > node.clientHeight + 1,
}));
if (desktopRegionOverflow.x || desktopRegionOverflow.y) {
  throw new Error(`Expected desktop region pills without scrollbar, found overflow ${JSON.stringify(desktopRegionOverflow)}`);
}

const desktopVisibleRows = await page.locator('.team-list').first().evaluate((node) => {
  const firstCard = node.querySelector('button');
  if (!(firstCard instanceof HTMLElement)) return 0;
  const rowHeight = firstCard.getBoundingClientRect().height;
  return node.clientHeight / rowHeight;
});
if (desktopVisibleRows > 1.12) {
  throw new Error(`Expected desktop team list to show one row, found ${desktopVisibleRows.toFixed(2)} visible rows`);
}

const desktopShot = path.join(outputDir, 'desktop-setup.png');
await page.screenshot({ path: desktopShot, fullPage: true });

await page.getByRole('button', { name: '开始模拟比赛' }).click();
await page.getByRole('heading', { name: '选择支持球队' }).waitFor();

const assistCardCount = await page.locator('.assist-team-card').count();
if (assistCardCount !== 2) {
  throw new Error(`Expected 2 assist team cards, found ${assistCardCount}`);
}

const assistBalanceText = await page.locator('.assist-balance strong').innerText();
if (assistBalanceText.trim() !== '10000.00') {
  throw new Error(`Expected initial assist balance 10000.00, found ${assistBalanceText}`);
}

const assistPowerValues = await page.locator('.assist-team-card .assist-card-data b').evaluateAll((nodes) =>
  nodes.map((node) => Number.parseFloat(node.textContent ?? '0')),
);
if (assistPowerValues.some((value) => !Number.isFinite(value) || value < 40 || value > 96)) {
  throw new Error(`Expected valid assist power values, found ${assistPowerValues.join(', ')}`);
}

await page.locator('.assist-input input').fill('500.25');
const assistPreviewText = await page.locator('.assist-preview').innerText();
if (!assistPreviewText.includes('若胜') || !assistPreviewText.includes('若负') || !assistPreviewText.includes('平局')) {
  throw new Error(`Expected assist preview to show win/loss/draw settlement, found ${assistPreviewText}`);
}

const desktopAssistShot = path.join(outputDir, 'desktop-assist.png');
await page.screenshot({ path: desktopAssistShot, fullPage: true });

await page.getByRole('button', { name: '确认助力，开始比赛' }).click();
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

const pitchLineLayerCount = await page.locator('.pitch-lines').count();
if (pitchLineLayerCount !== 0) {
  throw new Error(`Expected pitch texture to provide field lines, found ${pitchLineLayerCount} extra line layer(s)`);
}

const fieldCanvasCount = await page.locator('.match-field canvas').count();
if (fieldCanvasCount !== 0) {
  throw new Error(`Expected DOM/CSS match field without canvas, found ${fieldCanvasCount} canvas element(s)`);
}

const fieldTextureLayers = await page.locator('.field-playfield').evaluate((node) => {
  const field = window.getComputedStyle(node);
  const overlay = window.getComputedStyle(node, '::before');
  const fieldImageCount = (field.backgroundImage.match(/url\(/g) ?? []).length;
  const overlayImageCount = (overlay.backgroundImage.match(/url\(/g) ?? []).length;
  const overlayHasTexturePattern = overlay.backgroundImage.includes('repeating-linear-gradient');
  return {
    fieldBackground: field.backgroundImage,
    overlayBackground: overlay.backgroundImage,
    textureLayerCount: fieldImageCount + overlayImageCount + (overlayHasTexturePattern ? 1 : 0),
  };
});
if (fieldTextureLayers.textureLayerCount !== 1) {
  throw new Error(`Expected one pitch texture layer, found ${JSON.stringify(fieldTextureLayers)}`);
}

const feedHeaderText = await page.locator('.feed-header').innerText();
if (feedHeaderText.includes('/')) {
  throw new Error(`Live feed header exposes event progress: ${feedHeaderText}`);
}

const desktopMatchShot = path.join(outputDir, 'desktop-match-animation.png');
await page.screenshot({ path: desktopMatchShot, fullPage: true });

await page.getByRole('button', { name: '立即结算' }).click();
await page.getByText('完场结果').waitFor();

const assistResultText = await page.locator('.assist-result-card').innerText();
if (!assistResultText.includes('助力结算') || !assistResultText.includes('当前余额')) {
  throw new Error(`Expected assist settlement after match, found ${assistResultText}`);
}

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
await page.getByRole('heading', { name: '选择主队与客队' }).waitFor();

const mobileTeamCards = await page.locator('.team-list button').count();
if (mobileTeamCards < 40) {
  throw new Error(`Expected at least 40 mobile team cards, found ${mobileTeamCards}`);
}

const mobileTeamListColumns = await page.locator('.team-list').first().evaluate((node) =>
  window.getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length,
);
if (mobileTeamListColumns > 2) {
  throw new Error(`Expected mobile team list to use at most 2 columns, found ${mobileTeamListColumns}`);
}

const mobileRegionOverflow = await page.locator('.region-pills').first().evaluate((node) => ({
  x: node.scrollWidth > node.clientWidth + 1,
  y: node.scrollHeight > node.clientHeight + 1,
}));
if (mobileRegionOverflow.x || mobileRegionOverflow.y) {
  throw new Error(`Expected mobile region pills without scrollbar, found overflow ${JSON.stringify(mobileRegionOverflow)}`);
}

const mobileVisibleRows = await page.locator('.team-list').first().evaluate((node) => {
  const firstCard = node.querySelector('button');
  if (!(firstCard instanceof HTMLElement)) return 0;
  const rowHeight = firstCard.getBoundingClientRect().height;
  return node.clientHeight / rowHeight;
});
if (mobileVisibleRows > 1.12) {
  throw new Error(`Expected mobile team list to show one row, found ${mobileVisibleRows.toFixed(2)} visible rows`);
}

const mobileShot = path.join(outputDir, 'mobile-setup.png');
await page.screenshot({ path: mobileShot, fullPage: true });

await page.getByRole('button', { name: '开始模拟比赛' }).click();
await page.getByRole('heading', { name: '选择支持球队' }).waitFor();

const mobileAssistCards = await page.locator('.assist-team-card').count();
if (mobileAssistCards !== 2) {
  throw new Error(`Expected 2 mobile assist team cards, found ${mobileAssistCards}`);
}

const mobileAssistShot = path.join(outputDir, 'mobile-assist.png');
await page.screenshot({ path: mobileAssistShot, fullPage: true });

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
      regionPillCount,
      desktopTeamListColumns,
      desktopVisibleRows,
      mobileTeamListColumns,
      mobileVisibleRows,
      fieldPlayerCount,
      feedItemCount,
      shotDots,
      assistCardCount,
      assistResultText,
      screenshots: [desktopHomeShot, desktopShot, desktopAssistShot, desktopMatchShot, resultsShot, mobileShot, mobileAssistShot],
    },
    null,
    2,
  ),
);
