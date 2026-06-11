import type {
  AttackRoute,
  Attacker,
  EventOutcome,
  FieldPoint,
  MatchDuration,
  MatchEvent,
  MatchResult,
  PlayerMatchStats,
  ShotType,
  Team,
  TeamMatchStats,
  Tactic,
} from './types';
import { clamp, createRandom, createSeed, pickOne, pickWeighted } from './random';

interface SimulateMatchInput {
  homeTeam: Team;
  awayTeam: Team;
  duration: MatchDuration;
  homeTactic: Tactic;
  awayTactic: Tactic;
  seed?: number;
}

const routeLabels: Record<AttackRoute, string> = {
  central: '中路渗透',
  wide: '边路冲击',
  counter: '快速反击',
  longShot: '禁区外远射',
  throughBall: '直塞身后',
  scramble: '门前混战',
};

const shotLabels: Record<ShotType, string> = {
  placed: '推射',
  power: '抽射',
  header: '头球',
  low: '低射',
  farCorner: '远角弧线球',
  rebound: '补射',
};

const baseRouteWeights: Record<AttackRoute, number> = {
  central: 1,
  wide: 1,
  counter: 0.8,
  longShot: 0.7,
  throughBall: 0.9,
  scramble: 0.65,
};

const shotTypesByRoute: Record<AttackRoute, Partial<Record<ShotType, number>>> = {
  central: { placed: 1.2, farCorner: 1, power: 0.8, low: 0.8 },
  wide: { header: 1.35, power: 0.8, farCorner: 0.75, rebound: 0.7 },
  counter: { low: 1.25, placed: 1, power: 0.8, farCorner: 0.8 },
  longShot: { power: 1.35, farCorner: 1, placed: 0.45 },
  throughBall: { placed: 1.25, low: 1.05, farCorner: 0.9 },
  scramble: { rebound: 1.5, power: 0.7, header: 0.75, low: 0.65 },
};

type CommentaryContext = {
  attackingTeam: Team;
  defendingTeam: Team;
  shooter: Attacker;
  route: AttackRoute;
  shotType: ShotType;
};

const attackTemplates: Array<(context: CommentaryContext) => string> = [
  (c) => `${c.attackingTeam.name}在中场完成连续传递，开始向前提速，`,
  (c) => `${c.attackingTeam.name}抢下二点球后立刻发动推进，`,
  (c) => `${c.attackingTeam.name}通过${routeLabels[c.route]}撕开第一道防线，`,
  (c) => `${c.attackingTeam.name}把节奏压到禁区前沿，耐心寻找空当，`,
  (c) => `${c.attackingTeam.name}突然加快传球速度，防线被迫回收，`,
  (c) => `${c.shooter.name}在肋部接应，转身摆脱盯防，`,
  (c) => `${c.shooter.name}拿球后向禁区方向推进，队友拉开空间，`,
  (c) => `${c.attackingTeam.name}把球转移到弱侧，进攻空间被打开，`,
  (c) => `${c.attackingTeam.name}利用一次反抢制造前场机会，`,
  (c) => `${c.defendingTeam.name}防线短暂失位，${c.shooter.name}获得处理球时间，`,
  (c) => `${c.attackingTeam.name}从边路倒三角回传，禁区弧顶出现空当，`,
  (c) => `${c.shooter.name}接到直塞后顺势领球，直接面对防守压力，`,
  (c) => `${c.attackingTeam.name}连续横向调动，终于找到纵向线路，`,
  (c) => `${c.attackingTeam.name}前场多人压上，形成局部人数优势，`,
  (c) => `${c.shooter.name}在混乱中率先判断落点，抢到射门空间，`,
];

const shotTemplates: Array<(context: CommentaryContext) => string> = [
  (c) => `${c.shooter.name}选择${shotLabels[c.shotType]}，皮球直奔球门方向。`,
  (c) => `${c.shooter.name}没有犹豫，完成一脚${shotLabels[c.shotType]}。`,
  (c) => `${c.shooter.name}调整一步后起脚，射门线路很清楚。`,
  (c) => `${c.shooter.name}在防守贴身前完成射门，球速很快。`,
  (c) => `${c.shooter.name}压低重心打出一脚质量不错的射门。`,
  (c) => `${c.shooter.name}瞄准远侧角度，试图避开门将控制范围。`,
  (c) => `${c.shooter.name}顺着来球方向直接处理，射门节奏很快。`,
  (c) => `${c.shooter.name}把球扣到惯用脚，随即完成打门。`,
  (c) => `${c.shooter.name}在禁区边缘找到缝隙，果断起脚。`,
  (c) => `${c.shooter.name}用一脚低平球考验门将反应。`,
  (c) => `${c.shooter.name}把射门角度压得很刁，防守球员来不及封堵。`,
  (c) => `${c.shooter.name}迎球发力，皮球带着明显旋转飞向球门。`,
];

const goalTemplates: Array<(context: CommentaryContext) => string> = [
  (c) => `球进了！${c.defendingTeam.name}门将判断慢了半拍。`,
  () => '皮球越过门线，进球有效。',
  () => '这脚射门角度足够刁钻，门将没有办法。',
  () => '皮球钻入网窝，比分被改写。',
  () => '射门力量和角度都很到位，球进。',
  () => '门前机会被把握住了，这是一粒关键进球。',
  () => '防线没能完成最后一脚封堵，进球出现。',
  () => '球速太快，门将伸手也没碰到。',
  () => '这次进攻终于转化成进球。',
  () => '皮球贴着门柱内侧入网。',
];

const saveTemplates: Array<(context: CommentaryContext) => string> = [
  (c) => `${c.defendingTeam.goalkeeper.name}反应很快，把球挡出危险区域。`,
  (c) => `${c.defendingTeam.goalkeeper.name}提前移动，稳稳完成扑救。`,
  (c) => `${c.defendingTeam.goalkeeper.name}侧身下地，单掌把球托出。`,
  (c) => `${c.defendingTeam.goalkeeper.name}站位准确，没给补射机会。`,
  (c) => `${c.defendingTeam.goalkeeper.name}用身体封住近角，化解险情。`,
  (c) => `${c.defendingTeam.goalkeeper.name}注意力非常集中，完成关键扑救。`,
  (c) => `${c.defendingTeam.goalkeeper.name}把球扑到边路，防线随即解围。`,
  (c) => `${c.defendingTeam.goalkeeper.name}判断对了方向，这球没能越过他。`,
];

const missTemplates: Record<EventOutcome, Array<(context: CommentaryContext) => string>> = {
  goal: goalTemplates,
  save: saveTemplates,
  blocked: [
    (c) => `${c.defendingTeam.name}防线及时上抢，射门被封堵。`,
    (c) => `${c.defendingTeam.name}中卫伸脚挡住线路，危险解除。`,
    () => '皮球打在防守球员身上弹出禁区。',
    () => '射门线路被提前读到，没能形成真正威胁。',
    () => '防守球员完成关键封堵，门将没有被直接考验。',
    () => '禁区内人数太密，皮球被挡了下来。',
  ],
  offTarget: [
    () => '皮球稍稍偏出立柱。',
    () => '射门角度没有压住，球飞出底线。',
    () => '这脚射门差了一点准星。',
    () => '皮球擦着门框外侧飞出。',
    () => '机会不错，但最后处理偏得有些多。',
    () => '射门力量够了，角度没有控制好。',
  ],
  post: [
    () => '皮球击中门框弹出，差一点就是进球。',
    () => '门柱帮了防守方一次。',
    () => '横梁拒绝了这次精彩射门。',
    () => '皮球重重砸在门框上，现场只差一点。',
    () => '这球已经越过门将，但没有越过门框。',
    () => '门框声音很清脆，比分暂时没有变化。',
  ],
};

export function simulateMatch(input: SimulateMatchInput): MatchResult {
  const seed = input.seed ?? createSeed();
  const random = createRandom(seed);
  const events: MatchEvent[] = [];
  const teamStats = createTeamStats(input.homeTeam, input.awayTeam);
  const playerStats = createPlayerStats(input.homeTeam, input.awayTeam);
  const score = { home: 0, away: 0 };
  const eventCount = getEventCount(input.duration, input.homeTactic, input.awayTactic, random);
  const eventSeconds = createEventSeconds(input.duration, eventCount, random);
  const possession = calculatePossession(input, random);

  teamStats[input.homeTeam.id].possession = possession.home;
  teamStats[input.awayTeam.id].possession = possession.away;

  for (let index = 0; index < eventCount; index += 1) {
    const eventSecond = eventSeconds[index];
    const displayMinute = toDisplayMinute(eventSecond, input.duration);
    const homePressure = teamAttackWeight(input.homeTeam, input.homeTactic, score.home, score.away);
    const awayPressure = teamAttackWeight(input.awayTeam, input.awayTactic, score.away, score.home);
    const attackingSide = pickWeighted(
      [
        { side: 'home' as const, weight: homePressure },
        { side: 'away' as const, weight: awayPressure },
      ],
      (item) => item.weight,
      random,
    ).side;

    const attackingTeam = attackingSide === 'home' ? input.homeTeam : input.awayTeam;
    const defendingTeam = attackingSide === 'home' ? input.awayTeam : input.homeTeam;
    const attackingTactic = attackingSide === 'home' ? input.homeTactic : input.awayTactic;
    const defendingTactic = attackingSide === 'home' ? input.awayTactic : input.homeTactic;
    const shooter = pickShooter(attackingTeam, random);
    const route = pickRoute(attackingTactic, random);
    const shotType = pickShotType(route, random);
    const xg = calculateXg({
      attackingTeam,
      defendingTeam,
      shooter,
      attackingTactic,
      defendingTactic,
      route,
      shotType,
      scoreDiff: attackingSide === 'home' ? score.home - score.away : score.away - score.home,
      random,
    });
    const outcome = determineOutcome(xg, defendingTeam, defendingTactic, random);
    const shotOnTarget = outcome === 'goal' || outcome === 'save';

    if (outcome === 'goal') {
      score[attackingSide] += 1;
    }

    updateStats({
      stats: teamStats,
      playerStats,
      attackingTeam,
      defendingTeam,
      shooter,
      outcome,
      xg,
      shotOnTarget,
    });

    const event: MatchEvent = {
      id: `event-${index + 1}`,
      second: eventSecond,
      displayMinute,
      attackingTeamId: attackingTeam.id,
      defendingTeamId: defendingTeam.id,
      shooterId: shooter.id,
      keeperId: defendingTeam.goalkeeper.id,
      route,
      shotType,
      outcome,
      xg,
      shotOnTarget,
      commentary: buildCommentary({
        displayMinute,
        attackingTeam,
        defendingTeam,
        shooter,
        route,
        shotType,
        outcome,
        score: { ...score },
        random,
      }),
      field: createFieldPath(attackingSide, route, random),
      scoreAfter: { ...score },
    };

    events.push(event);
  }

  const mvpPlayerId = chooseMvp(playerStats);

  return {
    id: `match-${seed}`,
    seed,
    duration: input.duration,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    homeTactic: input.homeTactic,
    awayTactic: input.awayTactic,
    events,
    finalScore: score,
    teamStats,
    playerStats,
    mvpPlayerId,
    matchTag: createMatchTag(score, teamStats, input.homeTeam.id, input.awayTeam.id),
  };
}

function createTeamStats(homeTeam: Team, awayTeam: Team): Record<string, TeamMatchStats> {
  return {
    [homeTeam.id]: emptyTeamStats(homeTeam.id),
    [awayTeam.id]: emptyTeamStats(awayTeam.id),
  };
}

function emptyTeamStats(teamId: string): TeamMatchStats {
  return {
    teamId,
    possession: 50,
    shots: 0,
    shotsOnTarget: 0,
    goals: 0,
    saves: 0,
    blocked: 0,
    offTarget: 0,
    posts: 0,
    keyChances: 0,
    xg: 0,
  };
}

function createPlayerStats(homeTeam: Team, awayTeam: Team): Record<string, PlayerMatchStats> {
  const stats: Record<string, PlayerMatchStats> = {};
  for (const team of [homeTeam, awayTeam]) {
    for (const player of team.attackers) {
      stats[player.id] = {
        playerId: player.id,
        teamId: team.id,
        name: player.name,
        number: player.number,
        position: player.position,
        shots: 0,
        shotsOnTarget: 0,
        goals: 0,
        keyAttacks: 0,
        xg: 0,
      };
    }

    stats[team.goalkeeper.id] = {
      playerId: team.goalkeeper.id,
      teamId: team.id,
      name: team.goalkeeper.name,
      number: team.goalkeeper.number,
      position: team.goalkeeper.position,
      shots: 0,
      shotsOnTarget: 0,
      goals: 0,
      keyAttacks: 0,
      xg: 0,
      saves: 0,
      goalsAgainst: 0,
    };
  }
  return stats;
}

function getEventCount(_duration: MatchDuration, homeTactic: Tactic, awayTactic: Tactic, random: () => number) {
  const base = 10 + Math.floor(random() * 6);
  const tacticTempo = (homeTactic.attackFrequency + awayTactic.attackFrequency) / 2;
  const tempoModifier = Math.round((tacticTempo - 1) * 2);
  return clamp(base + tempoModifier, 10, 15);
}

function createEventSeconds(duration: MatchDuration, eventCount: number, random: () => number) {
  const slice = duration / (eventCount + 1);
  return Array.from({ length: eventCount }, (_, index) => {
    const jitter = (random() - 0.5) * slice * 0.5;
    return Math.round(clamp(slice * (index + 1) + jitter, 4, duration - 3));
  }).sort((a, b) => a - b);
}

function toDisplayMinute(second: number, duration: MatchDuration) {
  return clamp(Math.round((second / duration) * 90), 1, 90);
}

function calculatePossession(input: SimulateMatchInput, random: () => number) {
  const homeBase =
    input.homeTeam.ratings.tempo +
    input.homeTeam.ratings.attack * 0.35 +
    input.homeTeam.ratings.stability * 0.25 +
    input.homeTactic.possessionBias;
  const awayBase =
    input.awayTeam.ratings.tempo +
    input.awayTeam.ratings.attack * 0.35 +
    input.awayTeam.ratings.stability * 0.25 +
    input.awayTactic.possessionBias;
  const home = clamp(Math.round(50 + (homeBase - awayBase) * 0.25 + (random() - 0.5) * 8), 35, 65);
  return { home, away: 100 - home };
}

function teamAttackWeight(team: Team, tactic: Tactic, ownGoals: number, opponentGoals: number) {
  const trailingBoost = opponentGoals > ownGoals ? 9 : ownGoals > opponentGoals ? -4 : 0;
  return (team.ratings.attack * 0.9 + team.ratings.tempo * 0.45 + trailingBoost) * tactic.attackFrequency;
}

function pickShooter(team: Team, random: () => number) {
  return pickWeighted(
    team.attackers,
    (player) => player.shooting * 0.45 + player.finishing * 0.35 + player.creativity * 0.15 + player.speed * 0.05,
    random,
  );
}

function pickRoute(tactic: Tactic, random: () => number) {
  const routes = Object.keys(baseRouteWeights) as AttackRoute[];
  return pickWeighted(
    routes,
    (route) => baseRouteWeights[route] * (tactic.routeBias[route] ?? 1),
    random,
  );
}

function pickShotType(route: AttackRoute, random: () => number) {
  const weights = shotTypesByRoute[route];
  const shots = Object.keys(weights) as ShotType[];
  return pickWeighted(shots, (shot) => weights[shot] ?? 1, random);
}

function calculateXg(input: {
  attackingTeam: Team;
  defendingTeam: Team;
  shooter: Attacker;
  attackingTactic: Tactic;
  defendingTactic: Tactic;
  route: AttackRoute;
  shotType: ShotType;
  scoreDiff: number;
  random: () => number;
}) {
  const routeBase: Record<AttackRoute, number> = {
    central: 0.18,
    wide: 0.15,
    counter: 0.21,
    longShot: 0.08,
    throughBall: 0.23,
    scramble: 0.25,
  };
  const shotBonus: Partial<Record<ShotType, number>> = {
    placed: 0.03,
    power: 0.01,
    header: -0.01,
    low: 0.02,
    farCorner: 0.025,
    rebound: 0.04,
  };
  const teamDelta =
    (input.attackingTeam.ratings.attack - input.defendingTeam.ratings.defense) * 0.0035 +
    (input.shooter.shooting + input.shooter.finishing - 160) * 0.0026 -
    (input.defendingTeam.ratings.keeper - 80) * 0.003;
  const tacticDelta =
    (input.attackingTactic.chanceQuality - 1) * 0.18 -
    (1 - input.defendingTactic.defenseRisk) * 0.07;
  const scoreDelta = input.scoreDiff < 0 ? 0.025 : input.scoreDiff > 0 ? -0.015 : 0;
  const randomness = (input.random() - 0.5) * 0.12;

  return Number(
    clamp(
      routeBase[input.route] + (shotBonus[input.shotType] ?? 0) + teamDelta + tacticDelta + scoreDelta + randomness,
      0.03,
      0.5,
    ).toFixed(2),
  );
}

function determineOutcome(xg: number, defendingTeam: Team, defendingTactic: Tactic, random: () => number): EventOutcome {
  const keeperWall = (defendingTeam.ratings.keeper - 80) * 0.002 + (1 - defendingTactic.defenseRisk) * 0.04;
  const goalChance = clamp(xg * 0.84 - keeperWall, 0.018, 0.42);
  const roll = random();

  if (roll < goalChance) {
    return 'goal';
  }

  const remainingRoll = random();
  if (remainingRoll < 0.42) return 'save';
  if (remainingRoll < 0.64) return 'blocked';
  if (remainingRoll < 0.88) return 'offTarget';
  return 'post';
}

function updateStats(input: {
  stats: Record<string, TeamMatchStats>;
  playerStats: Record<string, PlayerMatchStats>;
  attackingTeam: Team;
  defendingTeam: Team;
  shooter: Attacker;
  outcome: EventOutcome;
  xg: number;
  shotOnTarget: boolean;
}) {
  const team = input.stats[input.attackingTeam.id];
  const opponent = input.stats[input.defendingTeam.id];
  const shooter = input.playerStats[input.shooter.id];
  const keeper = input.playerStats[input.defendingTeam.goalkeeper.id];

  team.shots += 1;
  team.xg = Number((team.xg + input.xg).toFixed(2));
  shooter.shots += 1;
  shooter.xg = Number((shooter.xg + input.xg).toFixed(2));
  if (input.xg >= 0.25) {
    team.keyChances += 1;
    shooter.keyAttacks += 1;
  }

  if (input.shotOnTarget) {
    team.shotsOnTarget += 1;
    shooter.shotsOnTarget += 1;
  }

  if (input.outcome === 'goal') {
    team.goals += 1;
    shooter.goals += 1;
    keeper.goalsAgainst = (keeper.goalsAgainst ?? 0) + 1;
  }

  if (input.outcome === 'save') {
    opponent.saves += 1;
    keeper.saves = (keeper.saves ?? 0) + 1;
  }

  if (input.outcome === 'blocked') team.blocked += 1;
  if (input.outcome === 'offTarget') team.offTarget += 1;
  if (input.outcome === 'post') team.posts += 1;
}

function buildCommentary(input: {
  displayMinute: number;
  attackingTeam: Team;
  defendingTeam: Team;
  shooter: Attacker;
  route: AttackRoute;
  shotType: ShotType;
  outcome: EventOutcome;
  score: { home: number; away: number };
  random: () => number;
}) {
  const context = {
    attackingTeam: input.attackingTeam,
    defendingTeam: input.defendingTeam,
    shooter: input.shooter,
    route: input.route,
    shotType: input.shotType,
  };
  const attack = pickOne(attackTemplates, input.random)(context);
  const shot = pickOne(shotTemplates, input.random)(context);
  const result = pickOne(missTemplates[input.outcome], input.random)(context);
  const scoreText = input.outcome === 'goal' ? `场上比分改写为 ${input.score.home}-${input.score.away}。` : '';

  return `第 ${input.displayMinute} 分钟，${attack}${shot}${result}${scoreText}`;
}

function createFieldPath(side: 'home' | 'away', route: AttackRoute, random: () => number): { from: FieldPoint; to: FieldPoint } {
  const attackingRight = side === 'home';
  const goalX = attackingRight ? 0.94 : 0.06;
  const startXBase = attackingRight ? 0.52 : 0.48;
  const shotXBase = attackingRight ? 0.74 : 0.26;
  const routeY: Record<AttackRoute, number> = {
    central: 0.5,
    wide: random() > 0.5 ? 0.24 : 0.76,
    counter: random() > 0.5 ? 0.42 : 0.58,
    longShot: random() > 0.5 ? 0.45 : 0.55,
    throughBall: random() > 0.5 ? 0.38 : 0.62,
    scramble: 0.5 + (random() - 0.5) * 0.22,
  };

  const from: FieldPoint = {
    x: clamp(startXBase + (random() - 0.5) * 0.18, 0.12, 0.88),
    y: clamp(routeY[route] + (random() - 0.5) * 0.12, 0.16, 0.84),
  };
  const to: FieldPoint = {
    x: goalX,
    y: clamp(0.5 + (random() - 0.5) * 0.24, 0.32, 0.68),
  };

  if (route === 'longShot') {
    from.x = clamp(shotXBase + (attackingRight ? -0.12 : 0.12), 0.16, 0.84);
  }

  return { from, to };
}

function chooseMvp(playerStats: Record<string, PlayerMatchStats>) {
  const ranked = Object.values(playerStats).sort((a, b) => {
    const aScore =
      a.goals * 100 +
      a.shotsOnTarget * 16 +
      a.keyAttacks * 14 +
      a.xg * 25 +
      (a.saves ?? 0) * 22 -
      (a.goalsAgainst ?? 0) * 8;
    const bScore =
      b.goals * 100 +
      b.shotsOnTarget * 16 +
      b.keyAttacks * 14 +
      b.xg * 25 +
      (b.saves ?? 0) * 22 -
      (b.goalsAgainst ?? 0) * 8;
    return bScore - aScore;
  });
  return ranked[0].playerId;
}

function createMatchTag(
  score: { home: number; away: number },
  stats: Record<string, TeamMatchStats>,
  homeTeamId: string,
  awayTeamId: string,
) {
  const totalGoals = score.home + score.away;
  const totalSaves = stats[homeTeamId].saves + stats[awayTeamId].saves;
  const xgGap = Math.abs(stats[homeTeamId].xg - stats[awayTeamId].xg);

  if (totalGoals >= 5) return '火力对轰';
  if (totalSaves >= 5) return '门将之夜';
  if (score.home !== score.away && xgGap < 0.25) return '细节决胜';
  if (score.home === score.away) return '僵持拉满';
  return '效率制胜';
}
