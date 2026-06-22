import {
  DEFAULT_INCLINE_UNIT,
  INCLINE_UNIT_META_KEY,
  type InclineUnit,
} from '@/constants/TreadmillSettings';
import { getMeta, setMeta } from '@/core/database';

export async function loadInclineUnit(): Promise<InclineUnit> {
  const stored = await getMeta(INCLINE_UNIT_META_KEY);
  return stored === 'percent' ? 'percent' : DEFAULT_INCLINE_UNIT;
}

export async function saveInclineUnit(unit: InclineUnit): Promise<void> {
  await setMeta(INCLINE_UNIT_META_KEY, unit);
}
