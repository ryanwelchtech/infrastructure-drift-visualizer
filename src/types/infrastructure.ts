export type DriftStatus = 'synced' | 'modified' | 'missing' | 'added';

export type ResourceType =
  | 'ec2'
  | 's3'
  | 'rds'
  | 'vpc'
  | 'subnet'
  | 'security_group'
  | 'iam_role'
  | 'lambda'
  | 'api_gateway'
  | 'cloudfront'
  | 'route53'
  | 'elb'
  | 'ecs'
  | 'eks';

export interface ResourceConfig {
  [key: string]: string | number | boolean | string[] | object;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  status: DriftStatus;
  terraformConfig: ResourceConfig;
  actualConfig: ResourceConfig;
  dependencies: string[];
  lastChecked: string;
  region?: string;
  tags?: Record<string, string>;
}

export interface DriftChange {
  field: string;
  terraformValue: string | number | boolean | object;
  actualValue: string | number | boolean | object;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DriftReport {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  status: DriftStatus;
  changes: DriftChange[];
  detectedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface InfrastructureState {
  lastSync: string;
  resources: Resource[];
  summary: DriftSummary;
}

export interface DriftSummary {
  total: number;
  synced: number;
  modified: number;
  missing: number;
  added: number;
  score: number;
}

export interface RemediationAction {
  id: string;
  type: 'apply' | 'import' | 'destroy' | 'manual';
  resourceId: string;
  resourceName: string;
  description: string;
  command: string;
  risk: 'low' | 'medium' | 'high';
  estimatedTime: string;
}

export interface RemediationPlan {
  id: string;
  generatedAt: string;
  actions: RemediationAction[];
  totalActions: number;
  estimatedDuration: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    resourceType: ResourceType;
    status: DriftStatus;
    resource: Resource;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  style?: {
    stroke: string;
    strokeWidth: number;
  };
}
