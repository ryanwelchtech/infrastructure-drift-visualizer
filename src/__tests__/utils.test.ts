import { calculateDriftScore, getDriftSeverity, getStatusColor, formatDate } from '../lib/utils';

describe('utils', () => {
  describe('calculateDriftScore', () => {
    it('should return 100 when all resources are synced', () => {
      const score = calculateDriftScore(10, 0, 0, 0);
      expect(score).toBe(100);
    });

    it('should return 0 when all resources are missing', () => {
      const score = calculateDriftScore(0, 0, 10, 0);
      expect(score).toBe(0);
    });

    it('should calculate weighted score correctly', () => {
      const score = calculateDriftScore(5, 3, 1, 1);
      const expected = Math.round(((5 * 1 + 3 * 0.5 + 1 * 0.3 + 1 * 0) / 10) * 100);
      expect(score).toBe(expected);
    });

    it('should return 100 when no resources', () => {
      const score = calculateDriftScore(0, 0, 0, 0);
      expect(score).toBe(100);
    });

    it('should handle edge case of single synced resource', () => {
      const score = calculateDriftScore(1, 0, 0, 0);
      expect(score).toBe(100);
    });

    it('should handle edge case of single modified resource', () => {
      const score = calculateDriftScore(0, 1, 0, 0);
      expect(score).toBe(50);
    });

    it('should handle edge case of single added resource', () => {
      const score = calculateDriftScore(0, 0, 0, 1);
      expect(score).toBe(30);
    });
  });

  describe('getDriftSeverity', () => {
    it('should return critical for score below 50', () => {
      expect(getDriftSeverity(0)).toBe('critical');
      expect(getDriftSeverity(25)).toBe('critical');
      expect(getDriftSeverity(49)).toBe('critical');
    });

    it('should return warning for score between 50 and 79', () => {
      expect(getDriftSeverity(50)).toBe('warning');
      expect(getDriftSeverity(65)).toBe('warning');
      expect(getDriftSeverity(79)).toBe('warning');
    });

    it('should return healthy for score 80 and above', () => {
      expect(getDriftSeverity(80)).toBe('healthy');
      expect(getDriftSeverity(90)).toBe('healthy');
      expect(getDriftSeverity(100)).toBe('healthy');
    });
  });

  describe('getStatusColor', () => {
    it('should return green for synced', () => {
      expect(getStatusColor('synced')).toBe('#22c55e');
    });

    it('should return yellow for modified', () => {
      expect(getStatusColor('modified')).toBe('#eab308');
    });

    it('should return red for missing', () => {
      expect(getStatusColor('missing')).toBe('#ef4444');
    });

    it('should return blue for added', () => {
      expect(getStatusColor('added')).toBe('#3b82f6');
    });

    it('should return gray for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('#6b7280');
    });
  });

  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const date = '2024-01-15T10:30:00.000Z';
      const formatted = formatDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should format Date object correctly', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const formatted = formatDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
    });
  });
});
