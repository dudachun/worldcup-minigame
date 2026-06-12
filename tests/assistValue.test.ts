import { describe, expect, it } from 'vitest';
import { teams } from '../src/data/teams';
import { tactics } from '../src/data/tactics';
import {
  createAssistMarket,
  createAssistSlip,
  formatAssistCents,
  getPotentialProfitCents,
  maxAssistStakeCents,
  parseAssistAmountToCents,
  settleAssistSlip,
  validateAssistStake,
} from '../src/simulator/assistValue';
import { simulateMatch } from '../src/simulator/matchSimulator';

const tacticById = Object.fromEntries(tactics.map((tactic) => [tactic.id, tactic]));

describe('assist value system', () => {
  it('defines a power profile for every team', () => {
    for (const team of teams) {
      expect(team.power.rating).toBeGreaterThanOrEqual(40);
      expect(team.power.rating).toBeLessThanOrEqual(96);
      expect(['S', 'A', 'B', 'C', 'D']).toContain(team.power.tier);
      expect(team.power.fifaRank).toBeGreaterThan(0);
      expect(team.power.fifaPoints).toBeGreaterThan(0);
      expect(team.power.eloRating).toBeGreaterThan(0);
    }
  });

  it('parses and validates two-decimal assist amounts as integer cents', () => {
    expect(parseAssistAmountToCents('1')).toBe(100);
    expect(parseAssistAmountToCents('100.5')).toBe(10050);
    expect(parseAssistAmountToCents('2000.00')).toBe(maxAssistStakeCents);
    expect(parseAssistAmountToCents('3.141')).toBeNull();
    expect(parseAssistAmountToCents('abc')).toBeNull();

    expect(validateAssistStake(parseAssistAmountToCents('0.99'), 10_000)).toContain('最低');
    expect(validateAssistStake(parseAssistAmountToCents('2000.01'), 1_000_000)).toContain('最多');
    expect(validateAssistStake(parseAssistAmountToCents('500'), 10_000)).toContain('不足');
    expect(validateAssistStake(parseAssistAmountToCents('500'), 100_000)).toBe('');
  });

  it('creates higher returns for the lower-rated side', () => {
    const argentina = teams.find((team) => team.id === 'argentina') ?? teams[0];
    const china = teams.find((team) => team.id === 'china') ?? teams[1];
    const market = createAssistMarket(argentina, china);

    expect(market.home.winChance).toBeGreaterThan(market.away.winChance);
    expect(market.home.profitRate).toBeLessThan(market.away.profitRate);
    expect(market.home.winChance + market.away.winChance + market.drawChance).toBeCloseTo(1, 1);
  });

  it('settles win, loss, and draw without floating-point currency drift', () => {
    const homeTeam = teams.find((team) => team.id === 'brazil') ?? teams[0];
    const awayTeam = teams.find((team) => team.id === 'france') ?? teams[1];
    const market = createAssistMarket(homeTeam, awayTeam);
    const slip = createAssistSlip(market, 'home', 100_025);
    const winMatch = makeMatchResult(homeTeam, awayTeam, 2, 1);
    const lossMatch = makeMatchResult(homeTeam, awayTeam, 0, 1);
    const drawMatch = makeMatchResult(homeTeam, awayTeam, 1, 1);

    const win = settleAssistSlip(winMatch, slip, 1_000_000);
    const loss = settleAssistSlip(lossMatch, slip, 1_000_000);
    const draw = settleAssistSlip(drawMatch, slip, 1_000_000);

    expect(win.deltaCents).toBe(getPotentialProfitCents(slip.stakeCents, slip.profitRate));
    expect(loss.deltaCents).toBe(-100_025);
    expect(draw.deltaCents).toBe(0);
    expect(formatAssistCents(win.balanceAfterCents)).toMatch(/^\d+\.\d{2}$/);
  });
});

function makeMatchResult(homeTeam: (typeof teams)[number], awayTeam: (typeof teams)[number], home: number, away: number) {
  const match = simulateMatch({
    homeTeam,
    awayTeam,
    duration: 60,
    homeTactic: tacticById[homeTeam.defaultTacticId],
    awayTactic: tacticById[awayTeam.defaultTacticId],
    seed: 20260611,
  });

  return {
    ...match,
    finalScore: { home, away },
  };
}
