import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { MatchField } from './game/MatchField';
import { teams, worldCupGroups, worldCupGroupsWithChina } from './data/teams';
import { tactics } from './data/tactics';
import { getShotResultPoint } from './simulator/fieldGeometry';
import { simulateMatch } from './simulator/matchSimulator';
import { getVisibleScore } from './simulator/scoreboard';
import type { MatchDuration, MatchEvent, MatchResult, TacticId, Team } from './simulator/types';

const durations: MatchDuration[] = [60, 120, 180];
const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

type Screen = 'home' | 'transition' | 'setup' | 'match';
type MatchPhase = 'running' | 'results';
type TeamPoolMode = 'free' | 'official' | 'china';

const matchModes: Array<{ id: TeamPoolMode; label: string; description: string }> = [
  { id: 'free', label: '自由49队', description: '测试池，包含中国和官方48队。' },
  { id: 'official', label: '官方48队', description: '按当前2026世界杯分组，不包含中国。' },
  { id: 'china', label: '中国替换', description: '中国进入I组，替换伊拉克。' },
];

const outcomeLabels: Record<MatchEvent['outcome'], string> = {
  goal: '进球',
  save: '扑救',
  offTarget: '偏出',
  blocked: '封堵',
  post: '门框',
};

const routeLabels: Record<MatchEvent['route'], string> = {
  central: '中路渗透',
  wide: '边路冲击',
  counter: '快速反击',
  longShot: '远射',
  throughBall: '直塞',
  scramble: '混战',
};

const shotTypeLabels: Record<MatchEvent['shotType'], string> = {
  placed: '推射',
  power: '抽射',
  header: '头球',
  low: '低射',
  farCorner: '远角',
  rebound: '补射',
};

function App() {
  const tacticById = useMemo(() => Object.fromEntries(tactics.map((tactic) => [tactic.id, tactic])), []);
  const [screen, setScreen] = useState<Screen>('home');
  const [teamPoolMode, setTeamPoolMode] = useState<TeamPoolMode>('free');
  const availableTeams = useMemo(() => getTeamsByMode(teamPoolMode), [teamPoolMode]);
  const availableTeamIds = useMemo(() => new Set(availableTeams.map((team) => team.id)), [availableTeams]);
  const [homeTeamId, setHomeTeamId] = useState(availableTeams[0].id);
  const [awayTeamId, setAwayTeamId] = useState(availableTeams[1].id);
  const [duration, setDuration] = useState<MatchDuration>(120);
  const [homeTacticId, setHomeTacticId] = useState<TacticId>(availableTeams[0].defaultTacticId);
  const [awayTacticId, setAwayTacticId] = useState<TacticId>(availableTeams[1].defaultTacticId);
  const [matchPhase, setMatchPhase] = useState<MatchPhase>('running');
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const homeTeam = availableTeams.find((team) => team.id === homeTeamId) ?? availableTeams[0];
  const awayTeam = availableTeams.find((team) => team.id === awayTeamId) ?? availableTeams[1];
  const revealedEvents = match?.events.filter((event) => event.second <= elapsed) ?? [];
  const currentEvent = revealedEvents[revealedEvents.length - 1] ?? null;
  const liveScore = matchPhase === 'results' && match ? match.finalScore : getVisibleScore(match?.events ?? [], elapsed);
  const remaining = match ? Math.max(0, match.duration - elapsed) : duration;

  useEffect(() => {
    const firstAvailable = availableTeams[0]?.id;
    const secondAvailable = availableTeams.find((team) => team.id !== homeTeamId)?.id ?? firstAvailable;

    if (firstAvailable && !availableTeamIds.has(homeTeamId)) {
      setHomeTeamId(firstAvailable);
      setHomeTacticId(availableTeams[0].defaultTacticId);
    }

    if (secondAvailable && (!availableTeamIds.has(awayTeamId) || awayTeamId === homeTeamId)) {
      setAwayTeamId(secondAvailable);
      const nextAwayTeam = availableTeams.find((team) => team.id === secondAvailable);
      if (nextAwayTeam) {
        setAwayTacticId(nextAwayTeam.defaultTacticId);
      }
    }
  }, [availableTeamIds, availableTeams, awayTeamId, homeTeamId]);

  function changeHomeTeam(teamId: string) {
    const nextTeam = availableTeams.find((team) => team.id === teamId);
    if (!nextTeam) return;

    setHomeTeamId(teamId);
    setHomeTacticId(nextTeam.defaultTacticId);
  }

  function changeAwayTeam(teamId: string) {
    const nextTeam = availableTeams.find((team) => team.id === teamId);
    if (!nextTeam) return;

    setAwayTeamId(teamId);
    setAwayTacticId(nextTeam.defaultTacticId);
  }

  useEffect(() => {
    if (screen !== 'match' || matchPhase !== 'running' || !match) return;

    const timer = window.setInterval(() => {
      setElapsed((current) => {
        const next = Math.min(match.duration, current + 1);
        if (next >= match.duration) {
          setMatchPhase('results');
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screen, matchPhase, match]);

  function startMatch() {
    const nextHome = homeTeam;
    const nextAway = awayTeam.id === nextHome.id ? availableTeams.find((team) => team.id !== nextHome.id)! : awayTeam;
    const nextMatch = simulateMatch({
      homeTeam: nextHome,
      awayTeam: nextAway,
      duration,
      homeTactic: tacticById[homeTacticId],
      awayTactic: tacticById[awayTacticId],
    });

    setAwayTeamId(nextAway.id);
    setMatch(nextMatch);
    setElapsed(0);
    setMatchPhase('running');
    setScreen('match');
  }

  function startSetupTransition() {
    setScreen('transition');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(
      () => {
        setScreen('setup');
      },
      prefersReducedMotion ? 180 : 1320,
    );
  }

  function returnToSetup() {
    setScreen('setup');
    setMatch(null);
    setElapsed(0);
    setMatchPhase('running');
  }

  function returnHome() {
    setScreen('home');
    setMatch(null);
    setElapsed(0);
    setMatchPhase('running');
  }

  function finishNow() {
    if (!match) return;
    setElapsed(match.duration);
    setMatchPhase('results');
  }

  return (
    <main className={`app-shell app-shell-${screen}`}>
      {screen === 'home' ? <HomeScreen onStart={startSetupTransition} /> : null}

      {screen === 'transition' ? <KickoffTransition /> : null}

      {screen === 'setup' ? (
        <SetupScreen
          teamPoolMode={teamPoolMode}
          onTeamPoolModeChange={setTeamPoolMode}
          availableTeams={availableTeams}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeTeamId={homeTeamId}
          awayTeamId={awayTeamId}
          onHomeTeamChange={changeHomeTeam}
          onAwayTeamChange={changeAwayTeam}
          duration={duration}
          onDurationChange={setDuration}
          homeTacticId={homeTacticId}
          awayTacticId={awayTacticId}
          onHomeTacticChange={setHomeTacticId}
          onAwayTacticChange={setAwayTacticId}
          onStartMatch={startMatch}
          onBackHome={returnHome}
        />
      ) : null}

      {screen === 'match' ? (
        <MatchScreen
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          liveScore={liveScore}
          remaining={remaining}
          match={match}
          matchPhase={matchPhase}
          currentEvent={currentEvent}
          revealedEvents={revealedEvents}
          onFinishNow={finishNow}
          onRestart={startMatch}
          onBackSetup={returnToSetup}
        />
      ) : null}
    </main>
  );
}

function KickoffTransition() {
  return (
    <section className="kickoff-transition" aria-label="进入赛前设置" aria-live="polite">
      <div className="kickoff-transition-bg" aria-hidden="true" />
      <div className="kickoff-ball" aria-hidden="true" />
      <span>开球准备</span>
    </section>
  );
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="home-screen" aria-label="游戏首页">
      <div className="home-hero">
        <div className="home-copy">
          <span>H5 AI Football Simulator</span>
          <h1>2026 世界杯 AI 模拟器</h1>
          <p>选择球队和战术，生成一场只保留关键射门回合的极速比赛。</p>
        </div>
        <button className="home-start-button" type="button" onClick={onStart}>
          开始游戏
        </button>
      </div>
    </section>
  );
}

function SetupScreen({
  teamPoolMode,
  onTeamPoolModeChange,
  availableTeams,
  homeTeam,
  awayTeam,
  homeTeamId,
  awayTeamId,
  onHomeTeamChange,
  onAwayTeamChange,
  duration,
  onDurationChange,
  homeTacticId,
  awayTacticId,
  onHomeTacticChange,
  onAwayTacticChange,
  onStartMatch,
  onBackHome,
}: {
  teamPoolMode: TeamPoolMode;
  onTeamPoolModeChange: (mode: TeamPoolMode) => void;
  availableTeams: Team[];
  homeTeam: Team;
  awayTeam: Team;
  homeTeamId: string;
  awayTeamId: string;
  onHomeTeamChange: (teamId: string) => void;
  onAwayTeamChange: (teamId: string) => void;
  duration: MatchDuration;
  onDurationChange: (duration: MatchDuration) => void;
  homeTacticId: TacticId;
  awayTacticId: TacticId;
  onHomeTacticChange: (tactic: TacticId) => void;
  onAwayTacticChange: (tactic: TacticId) => void;
  onStartMatch: () => void;
  onBackHome: () => void;
}) {
  return (
    <section className="setup-screen" aria-label="赛前设置">
      <div className="screen-topbar">
        <button className="text-action" type="button" onClick={onBackHome}>
          返回首页
        </button>
        <strong>赛前设置</strong>
      </div>

      <div className="setup-panel setup-panel-full">
        <div className="panel-heading">
          <h1>选择球队与战术</h1>
          <p>配置主客队、比赛时长和两队战术，确认后进入比赛直播界面。</p>
        </div>

        <ModeSwitch value={teamPoolMode} onChange={onTeamPoolModeChange} disabled={false} />

        <div className="versus-board" aria-label="当前对阵">
          <TeamSlot team={homeTeam} label="主队" tacticId={homeTacticId} />
          <div className="versus-core" aria-hidden="true">
            <strong>VS</strong>
            <span>{duration}s</span>
          </div>
          <TeamSlot team={awayTeam} label="客队" tacticId={awayTacticId} />
        </div>

        <div className="team-picker-grid setup-team-grid">
          <TeamPicker
            label="主队"
            teams={availableTeams}
            value={homeTeamId}
            onChange={onHomeTeamChange}
            blockedTeamId={awayTeamId}
            disabled={false}
          />
          <TeamPicker
            label="客队"
            teams={availableTeams}
            value={awayTeamId}
            onChange={onAwayTeamChange}
            blockedTeamId={homeTeamId}
            disabled={false}
          />
        </div>

        <div className="setup-options-grid">
          <section className="setup-option-panel">
            <div className="section-label">比赛时长</div>
            <div className="segmented">
              {durations.map((option) => (
                <button
                  className={duration === option ? 'active' : ''}
                  type="button"
                  key={option}
                  onClick={() => onDurationChange(option)}
                >
                  {option}s
                </button>
              ))}
            </div>
          </section>

          <section className="setup-option-panel">
            <div className="tactic-columns">
              <TacticPicker
                label={`${homeTeam.name}战术`}
                value={homeTacticId}
                onChange={onHomeTacticChange}
                disabled={false}
              />
              <TacticPicker
                label={`${awayTeam.name}战术`}
                value={awayTacticId}
                onChange={onAwayTacticChange}
                disabled={false}
              />
            </div>
          </section>
        </div>

        <div className="actions setup-actions">
          <button className="primary-action" type="button" onClick={onStartMatch}>
            开始模拟比赛
          </button>
        </div>
      </div>
    </section>
  );
}

function TeamSlot({ team, label, tacticId }: { team: Team; label: string; tacticId: TacticId }) {
  const tactic = tactics.find((item) => item.id === tacticId);

  return (
    <article className="team-slot" style={teamVars(team)}>
      <span className="team-slot-label">{label}</span>
      <div className="team-slot-main">
        <img src={team.emblemUrl} alt="" aria-hidden="true" />
        <div>
          <strong>{team.name}</strong>
          <small>{team.shortName}</small>
        </div>
      </div>
      <div className="team-slot-meta">
        <span>{team.group}组</span>
        <span>{team.region}</span>
        <span>{team.defaultFormationId}</span>
        <span>{tactic?.name ?? '默认战术'}</span>
      </div>
    </article>
  );
}

function MatchScreen({
  homeTeam,
  awayTeam,
  liveScore,
  remaining,
  match,
  matchPhase,
  currentEvent,
  revealedEvents,
  onFinishNow,
  onRestart,
  onBackSetup,
}: {
  homeTeam: Team;
  awayTeam: Team;
  liveScore: { home: number; away: number };
  remaining: number;
  match: MatchResult | null;
  matchPhase: MatchPhase;
  currentEvent: MatchEvent | null;
  revealedEvents: MatchResult['events'];
  onFinishNow: () => void;
  onRestart: () => void;
  onBackSetup: () => void;
}) {
  return (
    <section className="match-screen" aria-label="比赛直播与结果">
      <section className="scoreboard" aria-label="比赛记分牌">
        <TeamScore team={homeTeam} score={liveScore.home} align="left" />
        <div className="clock">
          <span>{matchPhase === 'results' ? '0s' : `${remaining}s`}</span>
          <strong>{matchPhase === 'results' ? '完场' : 'AI Match'}</strong>
        </div>
        <TeamScore team={awayTeam} score={liveScore.away} align="right" />
      </section>

      <section className="match-stage">
        <div className="field-panel">
          <MatchField match={match} currentEvent={currentEvent} />
          <LiveFeed match={match} events={revealedEvents} phase={matchPhase} />
        </div>

        <div className="match-actions">
          {matchPhase === 'running' ? (
            <button className="secondary-action" type="button" onClick={onFinishNow}>
              立即结算
            </button>
          ) : (
            <>
              <button className="primary-action" type="button" onClick={onRestart}>
                再来一场
              </button>
              <button className="secondary-action" type="button" onClick={onBackSetup}>
                重新选队
              </button>
            </>
          )}
        </div>
      </section>

      {match && matchPhase === 'results' ? <ResultsPanel match={match} /> : null}
    </section>
  );
}

function ModeSwitch({
  value,
  onChange,
  disabled,
}: {
  value: TeamPoolMode;
  onChange: (mode: TeamPoolMode) => void;
  disabled: boolean;
}) {
  return (
    <section className="mode-switch" aria-label="队伍模式">
      {matchModes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={value === mode.id ? 'active' : ''}
          onClick={() => onChange(mode.id)}
          disabled={disabled}
        >
          <strong>{mode.label}</strong>
          <span>{mode.description}</span>
        </button>
      ))}
    </section>
  );
}

function TeamScore({ team, score, align }: { team: Team; score: number; align: 'left' | 'right' }) {
  return (
    <div className={`team-score ${align}`} style={teamVars(team)}>
      <img className="emblem-image" src={team.emblemUrl} alt="" aria-hidden="true" />
      <div>
        <span>{team.shortName}</span>
        <strong>{team.name}</strong>
      </div>
      <b key={score}>{score}</b>
    </div>
  );
}

function TeamPicker({
  label,
  teams: selectableTeams,
  value,
  onChange,
  blockedTeamId,
  disabled,
}: {
  label: string;
  teams: Team[];
  value: string;
  blockedTeamId: string;
  disabled: boolean;
  onChange: (teamId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('全部');
  const [group, setGroup] = useState('全部');
  const selectedTeam = selectableTeams.find((team) => team.id === value) ?? selectableTeams[0];
  const regions = useMemo(() => ['全部', ...Array.from(new Set(selectableTeams.map((team) => team.region)))], [selectableTeams]);
  const filteredTeams = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return selectableTeams.filter((team) => {
      const matchesQuery =
        !keyword ||
        team.name.toLowerCase().includes(keyword) ||
        team.shortName.toLowerCase().includes(keyword) ||
        team.region.toLowerCase().includes(keyword) ||
        team.group.toLowerCase().includes(keyword);
      const matchesRegion = region === '全部' || team.region === region;
      const matchesGroup = group === '全部' || team.group === group;
      return matchesQuery && matchesRegion && matchesGroup;
    });
  }, [group, query, region, selectableTeams]);

  return (
    <section className="team-picker" style={teamVars(selectedTeam)}>
      <div className="team-picker-title">
        <span>{label}</span>
        <strong>{selectedTeam.name}</strong>
      </div>
      <div className="team-filter-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索球队、小组、洲"
          disabled={disabled}
        />
        <select value={region} onChange={(event) => setRegion(event.target.value)} disabled={disabled}>
          {regions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={group} onChange={(event) => setGroup(event.target.value)} disabled={disabled}>
          <option value="全部">全部小组</option>
          {groups.map((item) => (
            <option key={item} value={item}>
              {item}组
            </option>
          ))}
        </select>
      </div>
      <div className="team-list" role="listbox" aria-label={`${label}球队列表`}>
        {filteredTeams.map((team) => {
          const isBlocked = team.id === blockedTeamId;
          return (
            <button
              key={team.id}
              type="button"
              role="option"
              aria-selected={team.id === value}
              className={team.id === value ? 'active' : ''}
              onClick={() => onChange(team.id)}
              disabled={disabled || isBlocked}
              style={teamVars(team)}
            >
              <span className="team-card-logo" aria-hidden="true">
                <img src={team.emblemUrl} alt="" />
              </span>
              <span className="team-card-copy">
                <strong>{team.name}</strong>
                <small className="team-card-meta">
                  <span>{team.group}组</span>
                  <span>{team.region}</span>
                  <span>{team.shortName}</span>
                  <span>{team.defaultFormationId}</span>
                </small>
              </span>
              {isBlocked ? <em className="team-card-state">已选</em> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TacticPicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: TacticId;
  onChange: (tactic: TacticId) => void;
  disabled: boolean;
}) {
  return (
    <div className="tactic-picker">
      <div className="section-label">{label}</div>
      <div className="tactic-list">
        {tactics.map((tactic) => (
          <button
            type="button"
            key={tactic.id}
            className={value === tactic.id ? 'active' : ''}
            onClick={() => onChange(tactic.id)}
            disabled={disabled}
            title={tactic.description}
          >
            {tactic.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function LiveFeed({
  match,
  events,
  phase,
}: {
  match: MatchResult | null;
  events: MatchResult['events'];
  phase: MatchPhase;
}) {
  const items = events.slice().reverse();

  return (
    <aside className="live-feed" aria-label="实时赛况">
      <div className="feed-header">
        <span>实时解说</span>
        <strong>{phase === 'running' ? '进行中' : match ? '完场' : '待开赛'}</strong>
      </div>
      <div className="feed-list">
        {items.length > 0 ? (
          items.map((event) => (
            <article className={event.outcome === 'goal' ? 'goal-event' : ''} key={event.id}>
              <time>{event.displayMinute}分钟</time>
              <p>{event.commentary}</p>
            </article>
          ))
        ) : (
          <article>
            <time>赛前</time>
            <p>{phase === 'running' ? '双方正在寻找第一脚射门机会。' : '比赛结束，可查看赛后数据。'}</p>
          </article>
        )}
      </div>
    </aside>
  );
}

function ResultsPanel({ match }: { match: MatchResult }) {
  const [selectedEventId, setSelectedEventId] = useState(() => getInitialEventId(match));
  const homeStats = match.teamStats[match.homeTeam.id];
  const awayStats = match.teamStats[match.awayTeam.id];
  const mvp = match.playerStats[match.mvpPlayerId];
  const selectedEvent = match.events.find((event) => event.id === selectedEventId) ?? match.events[0] ?? null;
  const playerRows = Object.values(match.playerStats).sort((a, b) => {
    if (a.teamId !== b.teamId) return a.teamId === match.homeTeam.id ? -1 : 1;
    return b.goals - a.goals || b.shotsOnTarget - a.shotsOnTarget || b.xg - a.xg;
  });

  useEffect(() => {
    setSelectedEventId(getInitialEventId(match));
  }, [match]);

  return (
    <section className="results-panel">
      <div className="result-hero">
        <div>
          <span>完场结果</span>
          <h2>
            {match.homeTeam.name} {match.finalScore.home}-{match.finalScore.away} {match.awayTeam.name}
          </h2>
        </div>
        <div className="mvp-card">
          <span>本场最佳</span>
          <strong>{mvp.name}</strong>
          <small>{match.matchTag}</small>
        </div>
      </div>

      <div className="shot-review-grid">
        <ShotMap events={match.events} selectedEventId={selectedEvent?.id ?? ''} onSelect={setSelectedEventId} />
        <ShotEventPanel match={match} selectedEvent={selectedEvent} onSelect={setSelectedEventId} />
      </div>

      <div className="stat-grid">
        <StatCompare label="控球率" home={homeStats.possession} away={awayStats.possession} suffix="%" />
        <StatCompare label="总射门" home={homeStats.shots} away={awayStats.shots} />
        <StatCompare label="射正" home={homeStats.shotsOnTarget} away={awayStats.shotsOnTarget} />
        <StatCompare label="预期进球" home={homeStats.xg} away={awayStats.xg} />
        <StatCompare label="扑救" home={homeStats.saves} away={awayStats.saves} />
        <StatCompare label="关键机会" home={homeStats.keyChances} away={awayStats.keyChances} />
      </div>

      <div className="player-table-wrap">
        <table className="player-table">
          <thead>
            <tr>
              <th>球员</th>
              <th>球队</th>
              <th>位置</th>
              <th>射门</th>
              <th>射正</th>
              <th>进球</th>
              <th>xG</th>
              <th>扑救</th>
            </tr>
          </thead>
          <tbody>
            {playerRows.map((player) => (
              <tr key={player.playerId}>
                <td>
                  <strong>{player.name}</strong>
                  <span>#{player.number}</span>
                </td>
                <td>{player.teamId === match.homeTeam.id ? match.homeTeam.name : match.awayTeam.name}</td>
                <td>{player.position}</td>
                <td>{player.shots}</td>
                <td>{player.shotsOnTarget}</td>
                <td>{player.goals}</td>
                <td>{player.xg.toFixed(2)}</td>
                <td>{player.saves ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ShotMap({
  events,
  selectedEventId,
  onSelect,
}: {
  events: MatchEvent[];
  selectedEventId: string;
  onSelect: (eventId: string) => void;
}) {
  return (
    <section className="shot-map-card" aria-label="射门地图">
      <div className="shot-map-header">
        <span>射门地图</span>
        <div className="shot-map-legend">
          <b className="goal" />进球
          <b className="save" />扑救
          <b className="miss" />未进
        </div>
      </div>
      <div className="shot-map-field">
        {events.map((event) => {
          const point = getShotResultPoint(event);
          return (
            <button
              key={event.id}
              className={`shot-dot ${event.outcome} ${event.id === selectedEventId ? 'active' : ''}`}
              style={{
                left: `${point.x * 100}%`,
                top: `${point.y * 100}%`,
              }}
              type="button"
              onClick={() => onSelect(event.id)}
              aria-label={`第${event.displayMinute}分钟，${outcomeLabels[event.outcome]}，xG ${event.xg}`}
              title={`第${event.displayMinute}分钟 xG ${event.xg}`}
            />
          );
        })}
      </div>
    </section>
  );
}

function ShotEventPanel({
  match,
  selectedEvent,
  onSelect,
}: {
  match: MatchResult;
  selectedEvent: MatchEvent | null;
  onSelect: (eventId: string) => void;
}) {
  const shooter = selectedEvent ? match.playerStats[selectedEvent.shooterId] : null;
  const attackingTeam = selectedEvent
    ? selectedEvent.attackingTeamId === match.homeTeam.id
      ? match.homeTeam
      : match.awayTeam
    : null;

  return (
    <section className="shot-detail-card" aria-label="射门事件详情">
      <div className="shot-detail-header">
        <span>事件回放</span>
        <strong>{selectedEvent ? `第 ${selectedEvent.displayMinute} 分钟` : '暂无事件'}</strong>
      </div>

      {selectedEvent ? (
        <>
          <div className={`shot-detail-result ${selectedEvent.outcome}`}>
            <b>{outcomeLabels[selectedEvent.outcome]}</b>
            <span>{attackingTeam?.name ?? '-'}进攻</span>
          </div>
          <div className="shot-detail-metrics">
            <span>
              球员
              <strong>{shooter?.name ?? '-'}</strong>
            </span>
            <span>
              路线
              <strong>{routeLabels[selectedEvent.route]}</strong>
            </span>
            <span>
              射门
              <strong>{shotTypeLabels[selectedEvent.shotType]}</strong>
            </span>
            <span>
              xG
              <strong>{selectedEvent.xg.toFixed(2)}</strong>
            </span>
          </div>
          <p>{selectedEvent.commentary}</p>
        </>
      ) : (
        <p>本场没有生成射门事件。</p>
      )}

      <div className="shot-event-list" aria-label="射门事件列表">
        {match.events.map((event) => (
          <button
            key={event.id}
            className={event.id === selectedEvent?.id ? 'active' : ''}
            type="button"
            onClick={() => onSelect(event.id)}
          >
            <span>{event.displayMinute}'</span>
            <strong>{outcomeLabels[event.outcome]}</strong>
            <small>xG {event.xg.toFixed(2)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function StatCompare({
  label,
  home,
  away,
  suffix = '',
}: {
  label: string;
  home: number;
  away: number;
  suffix?: string;
}) {
  return (
    <div className="stat-compare">
      <b>
        {home}
        {suffix}
      </b>
      <span>{label}</span>
      <b>
        {away}
        {suffix}
      </b>
    </div>
  );
}

function getInitialEventId(match: MatchResult) {
  return match.events.find((event) => event.outcome === 'goal')?.id ?? match.events[0]?.id ?? '';
}

function getTeamsByMode(mode: TeamPoolMode) {
  if (mode === 'free') {
    return teams;
  }

  const groupMap = mode === 'official' ? worldCupGroups : worldCupGroupsWithChina;
  const orderedIds = groups.flatMap((group) => groupMap[group] ?? []);
  return orderedIds.map((teamId) => teams.find((team) => team.id === teamId)).filter(Boolean) as Team[];
}

function teamVars(team: Team): CSSProperties {
  return {
    '--team-primary': team.colors.primary,
    '--team-secondary': team.colors.secondary,
  } as CSSProperties;
}

export default App;
