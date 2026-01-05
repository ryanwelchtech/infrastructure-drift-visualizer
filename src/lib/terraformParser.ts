import { Resource, ResourceConfig, DriftStatus, ResourceType, DriftSummary } from '@/types/infrastructure';
import { mapTerraformTypeToResourceType } from '@/data/awsResourceTypes';

export interface ParsedTerraformState {
  version: number;
  terraform_version: string;
  serial: number;
  lineage: string;
  outputs: Record<string, { value: unknown; type: string }>;
  resources: ParsedResource[];
}

export interface ParsedResource {
  type: string;
  name: string;
  provider_name: string;
  mode: string;
  instances: ParsedInstance[];
}

export interface ParsedInstance {
  attributes: Record<string, unknown>;
  attributes_flat?: Record<string, unknown>;
  depends_on: string[];
  index_key?: number;
}

export interface ParsedActualState {
  resources: ActualResource[];
}

export interface ActualResource {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  depends_on?: string[];
  region?: string;
}

export function parseTerraformStateFile(content: string): ParsedTerraformState {
  try {
    const parsed = JSON.parse(content);
    
    if (parsed.version !== 4) {
      console.warn('Unexpected Terraform state version:', parsed.version);
    }

    const resources: ParsedResource[] = parsed.resources || [];

    return {
      version: parsed.version || 4,
      terraform_version: parsed.terraform_version || 'unknown',
      serial: parsed.serial || 0,
      lineage: parsed.lineage || '',
      outputs: parsed.outputs || {},
      resources,
    };
  } catch (error) {
    throw new Error('Invalid Terraform state file format. Please upload a valid JSON state file.');
  }
}

export function parseActualStateFile(content: string): ParsedActualState {
  try {
    const parsed = JSON.parse(content);
    
    if (Array.isArray(parsed)) {
      return { resources: parsed.map((r: Record<string, unknown>) => normalizeActualResource(r)) };
    }
    
    if (parsed.resources) {
      return { resources: parsed.resources.map((r: Record<string, unknown>) => normalizeActualResource(r)) };
    }

    return { resources: [] };
  } catch (error) {
    throw new Error('Invalid actual state file format. Please upload a valid JSON file.');
  }
}

function normalizeActualResource(resource: Record<string, unknown>): ActualResource {
  const type = String(resource.type || '');
  const name = String(resource.name || '');
  const config = (resource.config || {}) as Record<string, unknown>;
  const depends_on = (resource.depends_on || []) as string[];
  const id = String(resource.id || `${type}.${name}`);
  const region = resource.region as string | undefined;
  
  return {
    id,
    type,
    name,
    config,
    depends_on,
    region,
  };
}

export function compareStates(
  plannedState: ParsedTerraformState,
  actualState: ParsedActualState
): Resource[] {
  const resources: Resource[] = [];
  
  const plannedMap = new Map<string, ParsedResource>();
  const actualMap = new Map<string, ActualResource>();

  plannedState.resources.forEach((r) => {
    const key = `${r.type}.${r.name}`;
    plannedMap.set(key, r);
  });

  actualState.resources.forEach((r) => {
    const key = `${r.type}.${r.name}`;
    actualMap.set(key, r);
  });

  const allKeys = Array.from(new Set<string>(Array.from(plannedMap.keys()).concat(Array.from(actualMap.keys()))));

  allKeys.forEach((key) => {
    const planned = plannedMap.get(key);
    const actual = actualMap.get(key);

    let status: DriftStatus = 'synced';
    let terraformConfig: ResourceConfig = {};
    let actualConfig: ResourceConfig = {};

    if (planned && actual) {
      const terraformAttrs = planned.instances[0]?.attributes || {};
      const actualAttrs = actual.config || {};

      const diff = findConfigDiff(terraformAttrs, actualAttrs);
      
      terraformConfig = terraformAttrs as ResourceConfig;
      actualConfig = actualAttrs as ResourceConfig;

      if (diff.length > 0) {
        status = 'modified';
      }
    } else if (planned && !actual) {
      status = 'missing';
      const terraformAttrs = planned.instances[0]?.attributes || {};
      terraformConfig = terraformAttrs as ResourceConfig;
      actualConfig = {};
    } else if (!planned && actual) {
      status = 'added';
      terraformConfig = {};
      const cleanConfig: ResourceConfig = {};
      Object.entries(actual.config).forEach(([k, v]) => {
        cleanConfig[k] = v as string | number | boolean | object | string[];
      });
      actualConfig = cleanConfig;
    }

    const resourceType = mapResourceType(planned?.type || actual?.type || 'unknown');

    resources.push({
      id: `${resourceType}-${planned?.name || actual?.name || key}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      name: planned?.name || actual?.name || key,
      type: resourceType,
      status,
      terraformConfig: terraformConfig as ResourceConfig,
      actualConfig: actualConfig as ResourceConfig,
      dependencies: (planned?.instances[0]?.depends_on || actual?.depends_on || []).map((d) => {
        const match = d.match(/^(aws_(?:vpc|subnet|security_group|instance|db_instance|s3_bucket|lambda_function|alb)).*/i);
        return match ? match[1].toLowerCase().replace(/_/g, '-') : d;
      }),
      lastChecked: new Date().toISOString(),
      region: actual?.region || 'us-east-1',
    });
  });

  return resources;
}

interface ConfigDiff {
  field: string;
  terraformValue: unknown;
  actualValue: unknown;
}

function findConfigDiff(
  terraform: Record<string, unknown>,
  actual: Record<string, unknown>
): ConfigDiff[] {
  const diffs: ConfigDiff[] = [];
  const allKeys = Array.from(new Set([...Object.keys(terraform), ...Object.keys(actual)]));

  allKeys.forEach((key) => {
    const tfValue = terraform[key];
    const actualValue = actual[key];

    if (JSON.stringify(tfValue) !== JSON.stringify(actualValue)) {
      diffs.push({
        field: key,
        terraformValue: tfValue,
        actualValue,
      });
    }
  });

  return diffs;
}

function mapResourceType(type: string): ResourceType {
  return mapTerraformTypeToResourceType(type);
}

export function calculateSummary(resources: Resource[]): DriftSummary {
  const synced = resources.filter((r) => r.status === 'synced').length;
  const modified = resources.filter((r) => r.status === 'modified').length;
  const missing = resources.filter((r) => r.status === 'missing').length;
  const added = resources.filter((r) => r.status === 'added').length;
  const total = resources.length;

  return {
    total,
    synced,
    modified,
    missing,
    added,
    score: total > 0 ? Math.round(((synced * 1 + modified * 0.5 + added * 0.3 + missing * 0) / total) * 100) : 100,
  };
}
