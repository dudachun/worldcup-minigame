import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { getFormationOutfield } from '../data/formations';
import pitchUrl from '../assets/pitch-bg.webp';
import { getShotResultPoint, normalizeFieldPoint } from '../simulator/fieldGeometry';
import type { EventOutcome, FieldPoint, FormationId, MatchEvent, MatchResult } from '../simulator/types';

interface MatchFieldProps {
  match: MatchResult | null;
  currentEvent: MatchEvent | null;
}

type GoalSide = 'left' | 'right';

interface FieldFrame {
  homePlayers: FieldPoint[];
  awayPlayers: FieldPoint[];
  homeKeeper: FieldPoint;
  awayKeeper: FieldPoint;
  ball: FieldPoint;
  transitionMs: number;
  status: string;
  trail: { from: FieldPoint; to: FieldPoint; outcome: EventOutcome } | null;
  effect: EventOutcome | null;
  goalFlash: GoalSide | null;
}

const fallbackFormationId: FormationId = '4-3-3';
const idleHomeKeeper: FieldPoint = { x: 0.046, y: 0.5 };
const idleAwayKeeper: FieldPoint = { x: 0.954, y: 0.5 };
const centerBall: FieldPoint = { x: 0.5, y: 0.5 };
const fieldVerticalRatio = 9 / 16;

export function MatchField({ match, currentEvent }: MatchFieldProps) {
  const timersRef = useRef<number[]>([]);
  const [frame, setFrame] = useState<FieldFrame>(() => createIdleFrame(null, false, '等待下一次攻防'));
  const fieldStyle = useMemo(
    () =>
      ({
        '--home-primary': match?.homeTeam.colors.primary ?? '#45aaf2',
        '--home-secondary': match?.homeTeam.colors.secondary ?? '#f8fafc',
        '--away-primary': match?.awayTeam.colors.primary ?? '#e25555',
        '--away-secondary': match?.awayTeam.colors.secondary ?? '#f8c84e',
        backgroundImage: `linear-gradient(180deg, rgba(6, 18, 12, 0.28), rgba(6, 18, 12, 0.1)), url(${pitchUrl})`,
      }) as CSSProperties,
    [match],
  );

  useEffect(() => {
    clearTimeline(timersRef.current);

    if (!match || !currentEvent) {
      setFrame(createIdleFrame(match, false, '等待下一次攻防'));
      return;
    }

    const timeline = buildTimeline(match, currentEvent);
    setFrame(timeline.build);

    timersRef.current = [
      window.setTimeout(() => setFrame(timeline.shot), 1150),
      window.setTimeout(() => setFrame(timeline.result), 1750),
      window.setTimeout(() => setFrame(timeline.reset), 3050),
      window.setTimeout(() => setFrame(timeline.idle), 3950),
    ];

    return () => clearTimeline(timersRef.current);
  }, [match, currentEvent]);

  return (
    <div className="match-field" aria-label="2D 比赛球场">
      <div className={`field-playfield ${frame.effect ? `effect-${frame.effect}` : ''}`} style={fieldStyle}>
        <div className={`field-goal field-goal-left ${frame.goalFlash === 'left' ? 'flash' : ''}`} />
        <div className={`field-goal field-goal-right ${frame.goalFlash === 'right' ? 'flash' : ''}`} />

        {frame.trail ? <ShotTrail {...frame.trail} /> : null}

        {frame.homePlayers.map((point, index) => (
          <span
            className="field-player home"
            key={`home-${index}`}
            style={pointStyle(point, frame.transitionMs)}
            aria-hidden="true"
          />
        ))}
        {frame.awayPlayers.map((point, index) => (
          <span
            className="field-player away"
            key={`away-${index}`}
            style={pointStyle(point, frame.transitionMs)}
            aria-hidden="true"
          />
        ))}
        <span className="field-player keeper home-keeper" style={pointStyle(frame.homeKeeper, frame.transitionMs)} aria-hidden="true" />
        <span className="field-player keeper away-keeper" style={pointStyle(frame.awayKeeper, frame.transitionMs)} aria-hidden="true" />
        <span className={`field-ball ${frame.effect ? `ball-${frame.effect}` : ''}`} style={pointStyle(frame.ball, frame.transitionMs)} />

        <div className="field-status">{frame.status}</div>
      </div>
    </div>
  );
}

function ShotTrail({ from, to, outcome }: { from: FieldPoint; to: FieldPoint; outcome: EventOutcome }) {
  return <span className={`field-shot-trail trail-${outcome}`} style={trailStyle(from, to)} aria-hidden="true" />;
}

function buildTimeline(match: MatchResult, event: MatchEvent) {
  const mirrored = event.displayMinute > 45;
  const idle = createIdleFrame(match, mirrored, '等待下一次攻防');
  const from = normalizeFieldPoint(event.field.from, mirrored);
  const rawTo = normalizeFieldPoint(event.field.to, mirrored);
  const attackingRight = rawTo.x >= from.x;
  const resultPoint = getShotResultPoint(event, { mirrored, allowOutside: true });
  const attackIsHome = event.attackingTeamId === match.homeTeam.id;
  const defendingIsHome = event.defendingTeamId === match.homeTeam.id;
  const attackingPlayers = attackIsHome ? idle.homePlayers : idle.awayPlayers;
  const defendingPlayers = defendingIsHome ? idle.homePlayers : idle.awayPlayers;
  const shooterIndex = Math.max(0, attackingPlayers.length - 1 - (hashString(event.shooterId) % Math.min(4, attackingPlayers.length)));
  const defenderIndex = hashString(event.id) % Math.min(5, defendingPlayers.length);
  const build = cloneFrame(idle);
  const shot = cloneFrame(idle);
  const result = cloneFrame(idle);
  const reset = createIdleFrame(match, mirrored, '阵型复位');
  const idleAfter = createIdleFrame(match, mirrored, '等待下一次攻防');
  const attackingName = attackIsHome ? match.homeTeam.shortName : match.awayTeam.shortName;
  const defendingName = defendingIsHome ? match.homeTeam.shortName : match.awayTeam.shortName;
  const defendingKeeperBase = defendingIsHome ? idle.homeKeeper : idle.awayKeeper;

  movePlayer(build, attackIsHome, shooterIndex, {
    x: clamp(from.x - (attackingRight ? 0.045 : -0.045), 0.04, 0.96),
    y: clamp(from.y + dotOffset(event.id), 0.12, 0.88),
  });
  build.ball = from;
  build.transitionMs = 1050;
  build.status = `${attackingName}推进`;

  movePlayer(shot, attackIsHome, shooterIndex, {
    x: clamp(from.x - (attackingRight ? 0.025 : -0.025), 0.04, 0.96),
    y: clamp(from.y + dotOffset(event.shooterId), 0.12, 0.88),
  });
  if (event.outcome === 'blocked') {
    movePlayer(shot, defendingIsHome, defenderIndex, {
      x: clamp(resultPoint.x + (attackingRight ? 0.025 : -0.025), 0.04, 0.96),
      y: clamp(resultPoint.y + dotOffset(event.keeperId), 0.12, 0.88),
    });
  }
  if (event.outcome === 'goal' || event.outcome === 'save' || event.outcome === 'post') {
    moveKeeper(shot, defendingIsHome, {
      x: defendingKeeperBase.x,
      y: clamp(resultPoint.y, 0.25, 0.75),
    });
  }
  shot.ball = resultPoint;
  shot.transitionMs = 460;
  shot.trail = { from, to: resultPoint, outcome: event.outcome };
  shot.status = `${attackingName}起脚`;

  result.homePlayers = shot.homePlayers;
  result.awayPlayers = shot.awayPlayers;
  result.homeKeeper = shot.homeKeeper;
  result.awayKeeper = shot.awayKeeper;
  result.ball = resultPoint;
  result.transitionMs = 120;
  result.trail = { from, to: resultPoint, outcome: event.outcome };
  result.effect = event.outcome;
  result.goalFlash = event.outcome === 'goal' ? (resultPoint.x > 0.5 ? 'right' : 'left') : null;
  result.status = resultStatus(event.outcome, attackingName, defendingName);

  reset.transitionMs = 900;
  reset.trail = null;

  return { build, shot, result, reset, idle: idleAfter };
}

function createIdleFrame(match: MatchResult | null, mirrored: boolean, status: string): FieldFrame {
  return {
    homePlayers: createTeamOutfield(match?.homeTeam.defaultFormationId ?? fallbackFormationId, 'home', mirrored),
    awayPlayers: createTeamOutfield(match?.awayTeam.defaultFormationId ?? fallbackFormationId, 'away', mirrored),
    homeKeeper: normalizeFieldPoint(idleHomeKeeper, mirrored),
    awayKeeper: normalizeFieldPoint(idleAwayKeeper, mirrored),
    ball: normalizeFieldPoint(centerBall, mirrored),
    transitionMs: 700,
    status,
    trail: null,
    effect: null,
    goalFlash: null,
  };
}

function createTeamOutfield(formationId: FormationId, side: 'home' | 'away', mirrored: boolean): FieldPoint[] {
  return getFormationOutfield(formationId)
    .map((point) => (side === 'home' ? point : { ...point, x: 1 - point.x }))
    .map((point) => normalizeFieldPoint(point, mirrored));
}

function cloneFrame(frame: FieldFrame): FieldFrame {
  return {
    ...frame,
    homePlayers: frame.homePlayers.map((point) => ({ ...point })),
    awayPlayers: frame.awayPlayers.map((point) => ({ ...point })),
    homeKeeper: { ...frame.homeKeeper },
    awayKeeper: { ...frame.awayKeeper },
    ball: { ...frame.ball },
    trail: frame.trail ? { ...frame.trail, from: { ...frame.trail.from }, to: { ...frame.trail.to } } : null,
  };
}

function movePlayer(frame: FieldFrame, home: boolean, index: number, point: FieldPoint) {
  if (home) {
    frame.homePlayers[index] = point;
  } else {
    frame.awayPlayers[index] = point;
  }
}

function moveKeeper(frame: FieldFrame, home: boolean, point: FieldPoint) {
  if (home) {
    frame.homeKeeper = point;
  } else {
    frame.awayKeeper = point;
  }
}

function resultStatus(outcome: EventOutcome, attackingName: string, defendingName: string) {
  if (outcome === 'goal') return `${attackingName}破门`;
  if (outcome === 'save') return `${defendingName}门将扑救`;
  if (outcome === 'blocked') return `${defendingName}封堵`;
  if (outcome === 'post') return '击中门框';
  return '射门偏出';
}

function pointStyle(point: FieldPoint, transitionMs: number): CSSProperties {
  return {
    left: `${point.x * 100}%`,
    top: `${point.y * 100}%`,
    transitionDuration: `${transitionMs}ms`,
  };
}

function trailStyle(from: FieldPoint, to: FieldPoint): CSSProperties {
  const dx = to.x - from.x;
  const dy = (to.y - from.y) * fieldVerticalRatio;
  const length = Math.hypot(dx, dy) * 100;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return {
    left: `${from.x * 100}%`,
    top: `${from.y * 100}%`,
    width: `${length}%`,
    transform: `translateY(-50%) rotate(${angle}deg)`,
  };
}

function dotOffset(seed: string) {
  return ((hashString(seed) % 7) - 3) * 0.012;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clearTimeline(timers: number[]) {
  for (const timer of timers) {
    window.clearTimeout(timer);
  }
  timers.length = 0;
}
