export function createSeed() {
  return Math.floor(Date.now() % 1_000_000_000);
}

export function createRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function pickOne<T>(items: T[], random: () => number) {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

export function pickWeighted<T>(
  items: T[],
  getWeight: (item: T) => number,
  random: () => number,
) {
  const total = items.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0);

  if (total <= 0) {
    return pickOne(items, random);
  }

  let cursor = random() * total;
  for (const item of items) {
    cursor -= Math.max(0, getWeight(item));
    if (cursor <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}
