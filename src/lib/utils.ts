import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateDriftScore(
  synced: number,
  modified: number,
  missing: number,
  added: number
): number {
  const total = synced + modified + missing + added;
  if (total === 0) return 100;

  const score =
    ((synced * 1 + modified * 0.5 + added * 0.3 + missing * 0) / total) * 100;
  return Math.round(score);
}

export function getDriftSeverity(
  score: number
): 'critical' | 'warning' | 'healthy' {
  if (score < 50) return 'critical';
  if (score < 80) return 'warning';
  return 'healthy';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'synced':
      return '#22c55e';
    case 'modified':
      return '#eab308';
    case 'missing':
      return '#ef4444';
    case 'added':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
}
