export type MatchDuration = 60 | 120 | 180;

export type TacticId =
  | 'balanced'
  | 'highPress'
  | 'counter'
  | 'wideRush'
  | 'centralBreak';

export type FormationId =
  | '4-3-3'
  | '4-4-2'
  | '4-2-3-1'
  | '3-5-2'
  | '5-3-2'
  | '4-5-1'
  | '3-4-3';

export type AttackRoute =
  | 'central'
  | 'wide'
  | 'counter'
  | 'longShot'
  | 'throughBall'
  | 'scramble';

export type ShotType = 'placed' | 'power' | 'header' | 'low' | 'farCorner' | 'rebound';

export type EventOutcome = 'goal' | 'save' | 'offTarget' | 'blocked' | 'post';

export interface Ratings {
  attack: number;
  defense: number;
  keeper: number;
  tempo: number;
  stability: number;
}

export interface Attacker {
  id: string;
  name: string;
  number: number;
  position: string;
  shooting: number;
  speed: number;
  creativity: number;
  finishing: number;
}

export interface Goalkeeper {
  id: string;
  name: string;
  number: number;
  position: '门将';
  saving: number;
  reflex: number;
  stability: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  region: string;
  group: string;
  emblemUrl: string;
  colors: {
    primary: string;
    secondary: string;
  };
  defaultFormationId: FormationId;
  defaultTacticId: TacticId;
  ratings: Ratings;
  attackers: Attacker[];
  goalkeeper: Goalkeeper;
}

export interface Tactic {
  id: TacticId;
  name: string;
  description: string;
  attackFrequency: number;
  chanceQuality: number;
  defenseRisk: number;
  possessionBias: number;
  routeBias: Partial<Record<AttackRoute, number>>;
}

export interface FieldPoint {
  x: number;
  y: number;
}

export interface MatchEvent {
  id: string;
  second: number;
  displayMinute: number;
  attackingTeamId: string;
  defendingTeamId: string;
  shooterId: string;
  keeperId: string;
  route: AttackRoute;
  shotType: ShotType;
  outcome: EventOutcome;
  xg: number;
  shotOnTarget: boolean;
  commentary: string;
  field: {
    from: FieldPoint;
    to: FieldPoint;
  };
  scoreAfter: {
    home: number;
    away: number;
  };
}

export interface TeamMatchStats {
  teamId: string;
  possession: number;
  shots: number;
  shotsOnTarget: number;
  goals: number;
  saves: number;
  blocked: number;
  offTarget: number;
  posts: number;
  keyChances: number;
  xg: number;
}

export interface PlayerMatchStats {
  playerId: string;
  teamId: string;
  name: string;
  number: number;
  position: string;
  shots: number;
  shotsOnTarget: number;
  goals: number;
  keyAttacks: number;
  xg: number;
  saves?: number;
  goalsAgainst?: number;
}

export interface MatchResult {
  id: string;
  seed: number;
  duration: MatchDuration;
  homeTeam: Team;
  awayTeam: Team;
  homeTactic: Tactic;
  awayTactic: Tactic;
  events: MatchEvent[];
  finalScore: {
    home: number;
    away: number;
  };
  teamStats: Record<string, TeamMatchStats>;
  playerStats: Record<string, PlayerMatchStats>;
  mvpPlayerId: string;
  matchTag: string;
}
