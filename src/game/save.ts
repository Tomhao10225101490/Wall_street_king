import { GameSave, SAVE_VERSION } from '../types/game';

const STORAGE_KEY = 'market-beast-save-v1';

export function loadSave(): GameSave | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameSave;
    if (data.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function persistSave(save: GameSave): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasSave(): boolean {
  return loadSave() !== null;
}

export function exportDayReportJson(report: unknown, day: number): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `market-beast-day-${day}-report.json`;
  a.click();
  URL.revokeObjectURL(url);
}
