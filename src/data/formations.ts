import type { FieldPoint, FormationId } from '../simulator/types';

export interface Formation {
  id: FormationId;
  label: string;
  outfield: FieldPoint[];
}

const ySlots = {
  one: [0.5],
  two: [0.36, 0.64],
  three: [0.25, 0.5, 0.75],
  four: [0.18, 0.38, 0.62, 0.82],
  five: [0.14, 0.32, 0.5, 0.68, 0.86],
} as const;

export const formations: Record<FormationId, Formation> = {
  '4-3-3': {
    id: '4-3-3',
    label: '4-3-3',
    outfield: [...line(0.24, ySlots.four), ...line(0.48, ySlots.three), ...line(0.72, ySlots.three)],
  },
  '4-4-2': {
    id: '4-4-2',
    label: '4-4-2',
    outfield: [...line(0.24, ySlots.four), ...line(0.5, ySlots.four), ...line(0.72, ySlots.two)],
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    label: '4-2-3-1',
    outfield: [...line(0.23, ySlots.four), ...line(0.43, ySlots.two), ...line(0.6, ySlots.three), ...line(0.76, ySlots.one)],
  },
  '3-5-2': {
    id: '3-5-2',
    label: '3-5-2',
    outfield: [...line(0.22, ySlots.three), ...line(0.48, ySlots.five), ...line(0.72, ySlots.two)],
  },
  '5-3-2': {
    id: '5-3-2',
    label: '5-3-2',
    outfield: [...line(0.2, ySlots.five), ...line(0.49, ySlots.three), ...line(0.72, ySlots.two)],
  },
  '4-5-1': {
    id: '4-5-1',
    label: '4-5-1',
    outfield: [...line(0.22, ySlots.four), ...line(0.5, ySlots.five), ...line(0.74, ySlots.one)],
  },
  '3-4-3': {
    id: '3-4-3',
    label: '3-4-3',
    outfield: [...line(0.22, ySlots.three), ...line(0.48, ySlots.four), ...line(0.72, ySlots.three)],
  },
};

export function getFormationOutfield(formationId: FormationId) {
  return formations[formationId].outfield.map((point) => ({ ...point }));
}

function line(x: number, ys: readonly number[]) {
  return ys.map((y) => ({ x, y }));
}
