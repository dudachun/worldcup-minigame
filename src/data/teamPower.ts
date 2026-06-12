import type { Ratings, TeamPowerProfile } from '../simulator/types';

interface TeamPowerSeed {
  fifaRank: number;
  fifaPoints: number;
  eloRating: number;
}

const teamPowerSeeds: Record<string, TeamPowerSeed> = {
  argentina: { fifaRank: 1, fifaPoints: 1886, eloRating: 2145 },
  france: { fifaRank: 2, fifaPoints: 1860, eloRating: 2108 },
  spain: { fifaRank: 3, fifaPoints: 1853, eloRating: 2096 },
  england: { fifaRank: 4, fifaPoints: 1813, eloRating: 2058 },
  brazil: { fifaRank: 5, fifaPoints: 1775, eloRating: 2044 },
  netherlands: { fifaRank: 6, fifaPoints: 1750, eloRating: 1998 },
  portugal: { fifaRank: 7, fifaPoints: 1748, eloRating: 2006 },
  belgium: { fifaRank: 8, fifaPoints: 1740, eloRating: 1962 },
  germany: { fifaRank: 9, fifaPoints: 1716, eloRating: 2018 },
  croatia: { fifaRank: 10, fifaPoints: 1705, eloRating: 1944 },
  uruguay: { fifaRank: 11, fifaPoints: 1688, eloRating: 1937 },
  colombia: { fifaRank: 12, fifaPoints: 1685, eloRating: 1910 },
  morocco: { fifaRank: 13, fifaPoints: 1680, eloRating: 1882 },
  mexico: { fifaRank: 14, fifaPoints: 1652, eloRating: 1830 },
  'united-states': { fifaRank: 15, fifaPoints: 1650, eloRating: 1818 },
  switzerland: { fifaRank: 16, fifaPoints: 1645, eloRating: 1832 },
  japan: { fifaRank: 17, fifaPoints: 1640, eloRating: 1850 },
  senegal: { fifaRank: 18, fifaPoints: 1638, eloRating: 1792 },
  austria: { fifaRank: 19, fifaPoints: 1625, eloRating: 1845 },
  iran: { fifaRank: 20, fifaPoints: 1615, eloRating: 1770 },
  'south-korea': { fifaRank: 21, fifaPoints: 1585, eloRating: 1758 },
  turkey: { fifaRank: 22, fifaPoints: 1545, eloRating: 1788 },
  australia: { fifaRank: 23, fifaPoints: 1555, eloRating: 1742 },
  ecuador: { fifaRank: 24, fifaPoints: 1535, eloRating: 1836 },
  sweden: { fifaRank: 25, fifaPoints: 1530, eloRating: 1750 },
  canada: { fifaRank: 26, fifaPoints: 1525, eloRating: 1744 },
  norway: { fifaRank: 27, fifaPoints: 1515, eloRating: 1765 },
  egypt: { fifaRank: 28, fifaPoints: 1510, eloRating: 1708 },
  algeria: { fifaRank: 29, fifaPoints: 1505, eloRating: 1715 },
  scotland: { fifaRank: 30, fifaPoints: 1500, eloRating: 1710 },
  tunisia: { fifaRank: 31, fifaPoints: 1495, eloRating: 1690 },
  'ivory-coast': { fifaRank: 32, fifaPoints: 1490, eloRating: 1718 },
  qatar: { fifaRank: 34, fifaPoints: 1460, eloRating: 1624 },
  paraguay: { fifaRank: 35, fifaPoints: 1455, eloRating: 1778 },
  ghana: { fifaRank: 36, fifaPoints: 1450, eloRating: 1654 },
  'saudi-arabia': { fifaRank: 37, fifaPoints: 1445, eloRating: 1638 },
  'czech-republic': { fifaRank: 38, fifaPoints: 1440, eloRating: 1740 },
  'bosnia-herzegovina': { fifaRank: 39, fifaPoints: 1435, eloRating: 1642 },
  'south-africa': { fifaRank: 40, fifaPoints: 1430, eloRating: 1620 },
  jordan: { fifaRank: 41, fifaPoints: 1425, eloRating: 1595 },
  panama: { fifaRank: 42, fifaPoints: 1415, eloRating: 1608 },
  uzbekistan: { fifaRank: 43, fifaPoints: 1410, eloRating: 1666 },
  'dr-congo': { fifaRank: 44, fifaPoints: 1400, eloRating: 1630 },
  'cape-verde': { fifaRank: 45, fifaPoints: 1390, eloRating: 1602 },
  iraq: { fifaRank: 46, fifaPoints: 1385, eloRating: 1622 },
  'new-zealand': { fifaRank: 48, fifaPoints: 1370, eloRating: 1540 },
  china: { fifaRank: 72, fifaPoints: 1285, eloRating: 1450 },
  curacao: { fifaRank: 78, fifaPoints: 1265, eloRating: 1518 },
  haiti: { fifaRank: 82, fifaPoints: 1250, eloRating: 1495 },
};

export function getTeamPowerProfile(teamId: string, ratings: Ratings): TeamPowerProfile {
  const seed = teamPowerSeeds[teamId] ?? { fifaRank: 100, fifaPoints: 1200, eloRating: 1450 };
  const fifaScore = clamp(45 + ((seed.fifaPoints - 1200) / 700) * 50, 40, 96);
  const eloScore = clamp(45 + ((seed.eloRating - 1450) / 750) * 50, 40, 96);
  const squadScore =
    ratings.attack * 0.3 +
    ratings.defense * 0.25 +
    ratings.keeper * 0.2 +
    ratings.tempo * 0.1 +
    ratings.stability * 0.15;
  const rating = round1(clamp(fifaScore * 0.52 + eloScore * 0.18 + squadScore * 0.3, 40, 96));

  return {
    rating,
    tier: getTier(rating),
    fifaRank: seed.fifaRank,
    fifaPoints: seed.fifaPoints,
    eloRating: seed.eloRating,
    source: 'FIFA ranking and World Football Elo local snapshot',
  };
}

function getTier(rating: number): TeamPowerProfile['tier'] {
  if (rating >= 90) return 'S';
  if (rating >= 82) return 'A';
  if (rating >= 74) return 'B';
  if (rating >= 64) return 'C';
  return 'D';
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
