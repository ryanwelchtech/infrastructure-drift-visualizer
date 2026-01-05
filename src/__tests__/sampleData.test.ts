import { sampleResources, sampleSummary } from '../data/sampleData';
import { Resource } from '../types/infrastructure';

describe('sampleData', () => {
  describe('sampleResources', () => {
    it('should contain resources', () => {
      expect(sampleResources.length).toBeGreaterThan(20);
    });

    it('should have valid resource structure', () => {
      sampleResources.forEach((resource: Resource) => {
        expect(resource).toHaveProperty('id');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('type');
        expect(resource).toHaveProperty('status');
        expect(resource).toHaveProperty('terraformConfig');
        expect(resource).toHaveProperty('actualConfig');
        expect(resource).toHaveProperty('dependencies');
        expect(resource).toHaveProperty('lastChecked');
        expect(resource).toHaveProperty('region');
      });
    });

    it('should have all drift statuses represented', () => {
      const statuses = new Set(sampleResources.map(r => r.status));
      expect(statuses).toContain('synced');
      expect(statuses).toContain('modified');
      expect(statuses).toContain('missing');
      expect(statuses).toContain('added');
    });

    it('should have at least 10 different resource types', () => {
      const types = new Set(sampleResources.map(r => r.type));
      expect(types.size).toBeGreaterThanOrEqual(10);
    });

    it('should have VPC as first resource with no dependencies', () => {
      const vpc = sampleResources.find(r => r.type === 'vpc');
      expect(vpc).toBeDefined();
      expect(vpc?.dependencies).toHaveLength(0);
    });
  });

  describe('sampleSummary', () => {
    it('should have correct totals', () => {
      expect(sampleSummary.total).toBe(32);
      expect(sampleSummary.synced + sampleSummary.modified + sampleSummary.missing + sampleSummary.added).toBe(32);
    });

    it('should have valid drift score', () => {
      expect(sampleSummary.score).toBeGreaterThanOrEqual(0);
      expect(sampleSummary.score).toBeLessThanOrEqual(100);
    });
  });
});
