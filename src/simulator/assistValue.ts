import type { MatchResult, Team } from './types';

export type AssistSide = 'home' | 'away';
export type AssistOutcome = 'win' | 'loss' | 'draw';

export interface AssistMarketTeam {
  side: AssistSide;
  teamId: string;
  powerRating: number;
  tier: Team['power']['tier'];
  winChance: number;
  profitRate: number;
}

export interface AssistMarket {
  home: AssistMarketTeam;
  away: AssistMarketTeam;
  drawChance: number;
}

export interface AssistSlip {
  side: AssistSide;
  teamId: string;
  stakeCents: number;
  profitRate: number;
  winChance: number;
}

export interface AssistSettlement {
  slip: AssistSlip;
  outcome: AssistOutcome;
  deltaCents: number;
  balanceAfterCents: number;
}

export const initialAssistBalanceCents = 1_000_000;
export const minAssistStakeCents = 100;
export const maxAssistStakeCents = 200_000;

export function createAssistMarket(homeTeam: Team, awayTeam: Team): AssistMarket {
  const powerGap = homeTeam.power.rating - awayTeam.power.rating;
  const rawHomeWinChance = 1 / (1 + 10 ** (-powerGap / 18));
  const drawChance = roundProbability(clamp(0.24 - Math.abs(powerGap) * 0.0022, 0.16, 0.3));
  const homeWinChance = roundProbability(rawHomeWinChance * (1 - drawChance));
  const awayWinChance = roundProbability((1 - rawHomeWinChance) * (1 - drawChance));

  return {
    home: createMarketTeam('home', homeTeam, homeWinChance),
    away: createMarketTeam('away', awayTeam, awayWinChance),
    drawChance,
  };
}

export function parseAssistAmountToCents(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{0,2})?$/.test(trimmed)) return null;

  const [whole, fraction = ''] = trimmed.split('.');
  const wholeCents = Number.parseInt(whole, 10) * 100;
  const fractionCents = Number.parseInt(fraction.padEnd(2, '0'), 10) || 0;
  const cents = wholeCents + fractionCents;

  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

export function validateAssistStake(stakeCents: number | null, balanceCents: number) {
  if (stakeCents === null) return '请输入最多两位小数的助力值';
  if (stakeCents < minAssistStakeCents) return '最低投入 1.00 助力值';
  if (stakeCents > maxAssistStakeCents) return '单次最多投入 2000.00 助力值';
  if (stakeCents > balanceCents) return '助力值余额不足';
  return '';
}

export function createAssistSlip(market: AssistMarket, side: AssistSide, stakeCents: number): AssistSlip {
  const marketTeam = market[side];
  return {
    side,
    teamId: marketTeam.teamId,
    stakeCents,
    profitRate: marketTeam.profitRate,
    winChance: marketTeam.winChance,
  };
}

export function settleAssistSlip(match: MatchResult, slip: AssistSlip, balanceCents: number): AssistSettlement {
  const winnerTeamId = getWinnerTeamId(match);
  const outcome: AssistOutcome = winnerTeamId === null ? 'draw' : winnerTeamId === slip.teamId ? 'win' : 'loss';
  const deltaCents =
    outcome === 'draw' ? 0 : outcome === 'win' ? Math.round(slip.stakeCents * slip.profitRate) : -slip.stakeCents;

  return {
    slip,
    outcome,
    deltaCents,
    balanceAfterCents: Math.max(0, balanceCents + deltaCents),
  };
}

export function formatAssistCents(cents: number) {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

export function formatAssistPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function getPotentialProfitCents(stakeCents: number, profitRate: number) {
  return Math.round(stakeCents * profitRate);
}

function createMarketTeam(side: AssistSide, team: Team, winChance: number): AssistMarketTeam {
  return {
    side,
    teamId: team.id,
    powerRating: team.power.rating,
    tier: team.power.tier,
    winChance,
    profitRate: getProfitRate(winChance),
  };
}

function getProfitRate(winChance: number) {
  return round2(clamp(0.82 / Math.max(0.08, winChance) - 1, 0.18, 3));
}

function getWinnerTeamId(match: MatchResult) {
  if (match.finalScore.home === match.finalScore.away) return null;
  return match.finalScore.home > match.finalScore.away ? match.homeTeam.id : match.awayTeam.id;
}

function roundProbability(value: number) {
  return Math.round(value * 1000) / 1000;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
