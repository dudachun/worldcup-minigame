import { describe, expect, it } from 'vitest';
import { formations } from '../src/data/formations';
import { teams } from '../src/data/teams';
import { tactics } from '../src/data/tactics';
import { getShotResultPoint } from '../src/simulator/fieldGeometry';
import { simulateMatch } from '../src/simulator/matchSimulator';
import { getVisibleScore } from '../src/simulator/scoreboard';
import type { MatchDuration, MatchResult } from '../src/simulator/types';

const tacticById = Object.fromEntries(tactics.map((tactic) => [tactic.id, tactic]));

function simulate(duration: MatchDuration, seed = 20260610) {
  return simulateMatch({
    homeTeam: teams.find((team) => team.id === 'brazil') ?? teams[0],
    awayTeam: teams.find((team) => team.id === 'france') ?? teams[1],
    duration,
    homeTactic: tacticById.highPress,
    awayTactic: tacticById.counter,
    seed,
  });
}

function expectStatsClosed(match: MatchResult) {
  const { homeTeam, awayTeam, teamStats, finalScore, events } = match;
  const home = teamStats[homeTeam.id];
  const away = teamStats[awayTeam.id];

  expect(home.possession + away.possession).toBe(100);
  expect(home.shots + away.shots).toBe(events.length);
  expect(home.goals).toBe(finalScore.home);
  expect(away.goals).toBe(finalScore.away);
  expect(home.shotsOnTarget).toBe(home.goals + away.saves);
  expect(away.shotsOnTarget).toBe(away.goals + home.saves);
  expect(finalScore.home).toBeLessThanOrEqual(home.shots);
  expect(finalScore.away).toBeLessThanOrEqual(away.shots);
  expect(match.playerStats[match.mvpPlayerId]).toBeDefined();
}

describe('simulateMatch', () => {
  it('defines valid 11-player formations and default tactics for every team', () => {
    for (const formation of Object.values(formations)) {
      expect(formation.outfield).toHaveLength(10);
      for (const point of formation.outfield) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(1);
      }
    }

    for (const team of teams) {
      expect(formations[team.defaultFormationId]).toBeDefined();
      expect(tacticById[team.defaultTacticId]).toBeDefined();
    }
  });

  it('keeps team and player statistics internally consistent', () => {
    const match = simulate(120);
    expectStatsClosed(match);
  });

  it.each<MatchDuration>([60, 120, 180])('maps %s second matches onto a 90 minute display clock', (duration) => {
    const match = simulate(duration, 260000 + duration);

    expect(match.events.length).toBeGreaterThan(0);
    for (const event of match.events) {
      expect(event.displayMinute).toBeGreaterThanOrEqual(1);
      expect(event.displayMinute).toBeLessThanOrEqual(90);
      expect(event.commentary).toContain(`第 ${event.displayMinute} 分钟`);
    }
  });

  it('creates a hidden live commentary set of 10 to 15 events per match', () => {
    for (const duration of [60, 120, 180] satisfies MatchDuration[]) {
      for (let index = 0; index < 20; index += 1) {
        const match = simulate(duration, 1000 + duration * 10 + index);

        expect(match.events.length).toBeGreaterThanOrEqual(10);
        expect(match.events.length).toBeLessThanOrEqual(15);
      }
    }
  });

  it('keeps the visible scoreboard at 0-0 until scored events are revealed', () => {
    const events = [
      { second: 12, scoreAfter: { home: 0, away: 0 } },
      { second: 28, scoreAfter: { home: 1, away: 0 } },
      { second: 52, scoreAfter: { home: 1, away: 1 } },
    ];

    expect(getVisibleScore(events, 0)).toEqual({ home: 0, away: 0 });
    expect(getVisibleScore(events, 27)).toEqual({ home: 0, away: 0 });
    expect(getVisibleScore(events, 28)).toEqual({ home: 1, away: 0 });
    expect(getVisibleScore(events, 90)).toEqual({ home: 1, away: 1 });
  });

  it('keeps generated shot locations inside the field bounds', () => {
    const match = simulate(180, 8888);

    for (const event of match.events) {
      expect(event.field.from.x).toBeGreaterThanOrEqual(0);
      expect(event.field.from.x).toBeLessThanOrEqual(1);
      expect(event.field.from.y).toBeGreaterThanOrEqual(0);
      expect(event.field.from.y).toBeLessThanOrEqual(1);
      expect(event.field.to.x).toBeGreaterThanOrEqual(0);
      expect(event.field.to.x).toBeLessThanOrEqual(1);
      expect(event.field.to.y).toBeGreaterThanOrEqual(0);
      expect(event.field.to.y).toBeLessThanOrEqual(1);
    }
  });

  it('places shot-map result points near the goal for goalmouth outcomes', () => {
    const match = simulate(180, 7891);

    for (const event of match.events) {
      const point = getShotResultPoint(event);

      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);

      if (event.outcome !== 'blocked') {
        expect(point.x < 0.18 || point.x > 0.82).toBe(true);
      }
    }
  });

  it('stays statistically closed across multiple deterministic seeds', () => {
    for (const duration of [60, 120, 180] satisfies MatchDuration[]) {
      for (let index = 0; index < 20; index += 1) {
        expectStatsClosed(simulate(duration, 9000 + duration * 10 + index));
      }
    }
  });
});
