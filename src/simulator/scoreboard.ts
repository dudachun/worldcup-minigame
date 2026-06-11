export interface ScoreLine {
  home: number;
  away: number;
}

interface TimedScore {
  second: number;
  scoreAfter: ScoreLine;
}

export function getVisibleScore(events: TimedScore[], elapsed: number): ScoreLine {
  const latestEvent = events.reduce<TimedScore | null>((latest, event) => {
    if (event.second > elapsed) return latest;
    if (!latest || event.second >= latest.second) return event;
    return latest;
  }, null);

  return latestEvent?.scoreAfter ?? { home: 0, away: 0 };
}
