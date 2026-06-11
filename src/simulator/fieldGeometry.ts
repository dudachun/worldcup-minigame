import type { EventOutcome, FieldPoint, MatchEvent } from './types';

interface ShotResultPointOptions {
  allowOutside?: boolean;
  mirrored?: boolean;
}

export function normalizeFieldPoint(point: FieldPoint, mirrored: boolean): FieldPoint {
  return {
    x: mirrored ? 1 - point.x : point.x,
    y: point.y,
  };
}

export function getShotResultPoint(event: MatchEvent, options: ShotResultPointOptions = {}): FieldPoint {
  const from = normalizeFieldPoint(event.field.from, options.mirrored ?? false);
  const to = normalizeFieldPoint(event.field.to, options.mirrored ?? false);
  const attackingRight = to.x >= from.x;

  return createShotResultPoint(event.outcome, from, to, attackingRight, event.id, options.allowOutside ?? false);
}

export function createShotResultPoint(
  outcome: EventOutcome,
  from: FieldPoint,
  to: FieldPoint,
  attackingRight: boolean,
  eventId: string,
  allowOutside = false,
): FieldPoint {
  if (outcome === 'goal') {
    return { x: attackingRight ? 0.985 : 0.015, y: clamp(to.y, 0.42, 0.58) };
  }

  if (outcome === 'save') {
    return { x: attackingRight ? 0.91 : 0.09, y: clamp(to.y, 0.36, 0.64) };
  }

  if (outcome === 'blocked') {
    return {
      x: clamp(from.x + (attackingRight ? 0.08 : -0.08), 0.08, 0.92),
      y: clamp(from.y + dotOffset(eventId) * 1.4, 0.16, 0.84),
    };
  }

  if (outcome === 'post') {
    return { x: attackingRight ? 0.966 : 0.034, y: to.y < 0.5 ? 0.36 : 0.64 };
  }

  return {
    x: attackingRight ? (allowOutside ? 1.025 : 0.975) : allowOutside ? -0.025 : 0.025,
    y: to.y < 0.5 ? clamp(to.y - 0.17, 0.04, 0.36) : clamp(to.y + 0.17, 0.64, 0.96),
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
