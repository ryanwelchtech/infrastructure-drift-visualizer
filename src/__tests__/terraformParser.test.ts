import { 
  parseTerraformStateFile, 
  parseActualStateFile, 
  compareStates, 
  calculateSummary 
} from '../lib/terraformParser';

describe('terraformParser', () => {
  describe('parseTerraformStateFile', () => {
    it('should parse valid Terraform state file', () => {
      const validState = JSON.stringify({
        version: 4,
        terraform_version: '1.6.0',
        serial: 42,
        lineage: 'abc123',
        outputs: { test: { value: 'hello', type: 'string' } },
        resources: []
      });

      const result = parseTerraformStateFile(validState);

      expect(result.version).toBe(4);
      expect(result.terraform_version).toBe('1.6.0');
      expect(result.serial).toBe(42);
      expect(result.outputs).toHaveProperty('test');
    });

    it('should handle empty resources array', () => {
      const emptyState = JSON.stringify({
        version: 4,
        resources: []
      });

      const result = parseTerraformStateFile(emptyState);

      expect(result.resources).toEqual([]);
      expect(result.outputs).toEqual({});
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseTerraformStateFile('invalid json')).toThrow('Invalid Terraform state file format');
    });

    it('should handle missing optional fields', () => {
      const minimalState = JSON.stringify({
        resources: [{ type: 'aws_instance', name: 'test', instances: [] }]
      });

      const result = parseTerraformStateFile(minimalState);

      expect(result.version).toBe(4);
      expect(result.terraform_version).toBe('unknown');
      expect(result.serial).toBe(0);
      expect(result.resources).toHaveLength(1);
    });
  });

  describe('parseActualStateFile', () => {
    it('should parse actual state with resources array', () => {
      const actualState = JSON.stringify({
        resources: [
          { id: 'i-123', type: 'aws_instance', name: 'test', config: { instance_type: 't3.micro' }, region: 'us-east-1' }
        ]
      });

      const result = parseActualStateFile(actualState);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].id).toBe('i-123');
    });

    it('should parse plain array of resources', () => {
      const plainArray = JSON.stringify([
        { id: 'i-123', type: 'aws_instance', name: 'test', config: {} }
      ]);

      const result = parseActualStateFile(plainArray);

      expect(result.resources).toHaveLength(1);
    });

    it('should handle empty resources', () => {
      const emptyState = JSON.stringify({ resources: [] });
      const result = parseActualStateFile(emptyState);
      expect(result.resources).toEqual([]);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseActualStateFile('invalid')).toThrow('Invalid actual state file format');
    });
  });

  describe('compareStates', () => {
    it('should identify synced resources', () => {
      const plannedState = {
        version: 4,
        terraform_version: '1.6.0',
        serial: 1,
        lineage: 'abc',
        outputs: {},
        resources: [{
          type: 'aws_instance',
          name: 'web',
          provider_name: 'aws',
          mode: 'managed',
          instances: [{
            attributes: { id: 'i-123', instance_type: 't3.micro' },
            depends_on: []
          }]
        }]
      };

      const actualState = {
        resources: [{
          id: 'i-123',
          type: 'aws_instance',
          name: 'web',
          config: { id: 'i-123', instance_type: 't3.micro' }
        }]
      };

      const result = compareStates(plannedState, actualState);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('synced');
    });

    it('should identify modified resources', () => {
      const plannedState = {
        version: 4,
        terraform_version: '1.6.0',
        serial: 1,
        lineage: 'abc',
        outputs: {},
        resources: [{
          type: 'aws_instance',
          name: 'web',
          provider_name: 'aws',
          mode: 'managed',
          instances: [{
            attributes: { id: 'i-123', instance_type: 't3.micro' },
            depends_on: []
          }]
        }]
      };

      const actualState = {
        resources: [{
          id: 'i-123',
          type: 'aws_instance',
          name: 'web',
          config: { instance_type: 't3.large' }
        }]
      };

      const result = compareStates(plannedState, actualState);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('modified');
    });

    it('should identify missing resources', () => {
      const plannedState = {
        version: 4,
        terraform_version: '1.6.0',
        serial: 1,
        lineage: 'abc',
        outputs: {},
        resources: [{
          type: 'aws_instance',
          name: 'deleted-server',
          provider_name: 'aws',
          mode: 'managed',
          instances: [{
            attributes: { id: 'i-deleted', instance_type: 't3.micro' },
            depends_on: []
          }]
        }]
      };

      const actualState = {
        resources: []
      };

      const result = compareStates(plannedState, actualState);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('missing');
    });

    it('should identify added resources', () => {
      const plannedState = {
        version: 4,
        terraform_version: '1.6.0',
        serial: 1,
        lineage: 'abc',
        outputs: {},
        resources: []
      };

      const actualState = {
        resources: [{
          id: 'i-new',
          type: 'aws_instance',
          name: 'untracked-server',
          config: { instance_type: 't3.micro' }
        }]
      };

      const result = compareStates(plannedState, actualState);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('added');
    });

    it('should handle multiple resources with different statuses', () => {
      const plannedState = {
        version: 4,
        terraform_version: '1.6.0',
        serial: 1,
        lineage: 'abc',
        outputs: {},
        resources: [
          {
            type: 'aws_instance',
            name: 'synced-server',
            provider_name: 'aws',
            mode: 'managed',
            instances: [{ attributes: { id: 'i-1', instance_type: 't3.micro' }, depends_on: [] }]
          },
          {
            type: 'aws_instance',
            name: 'modified-server',
            provider_name: 'aws',
            mode: 'managed',
            instances: [{ attributes: { id: 'i-2', instance_type: 't3.micro' }, depends_on: [] }]
          },
          {
            type: 'aws_instance',
            name: 'deleted-server',
            provider_name: 'aws',
            mode: 'managed',
            instances: [{ attributes: { id: 'i-3', instance_type: 't3.micro' }, depends_on: [] }]
          }
        ]
      };

      const actualState = {
        resources: [
          { id: 'i-1', type: 'aws_instance', name: 'synced-server', config: { id: 'i-1', instance_type: 't3.micro' } },
          { id: 'i-2', type: 'aws_instance', name: 'modified-server', config: { id: 'i-2', instance_type: 't3.large' } }
        ]
      };

      const result = compareStates(plannedState, actualState);

      expect(result).toHaveLength(3);
      expect(result.find(r => r.name === 'synced-server')?.status).toBe('synced');
      expect(result.find(r => r.name === 'modified-server')?.status).toBe('modified');
      expect(result.find(r => r.name === 'deleted-server')?.status).toBe('missing');
    });
  });

  describe('calculateSummary', () => {
    it('should calculate correct summary', () => {
      const resources = [
        { status: 'synced' },
        { status: 'synced' },
        { status: 'modified' },
        { status: 'missing' },
        { status: 'added' }
      ] as any;

      const result = calculateSummary(resources);

      expect(result.total).toBe(5);
      expect(result.synced).toBe(2);
      expect(result.modified).toBe(1);
      expect(result.missing).toBe(1);
      expect(result.added).toBe(1);
    });

    it('should return 100% score when no resources', () => {
      const result = calculateSummary([]);
      expect(result.score).toBe(100);
    });

    it('should calculate score correctly', () => {
      const resources = [
        { status: 'synced' },
        { status: 'synced' },
        { status: 'modified' },
        { status: 'missing' },
        { status: 'added' }
      ] as any;

      const result = calculateSummary(resources);

      const expectedScore = Math.round(((2 * 1 + 1 * 0.5 + 1 * 0.3 + 1 * 0) / 5) * 100);
      expect(result.score).toBe(expectedScore);
    });
  });
});
