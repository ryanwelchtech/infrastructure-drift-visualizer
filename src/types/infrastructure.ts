export type DriftStatus = 'synced' | 'modified' | 'missing' | 'added';

export type ResourceType =
  | 'ec2'
  | 's3'
  | 'rds'
  | 'vpc'
  | 'subnet'
  | 'security_group'
  | 'iam_role'
  | 'iam_user'
  | 'iam_policy'
  | 'lambda'
  | 'api_gateway'
  | 'api_gateway_v2'
  | 'cloudfront'
  | 'route53'
  | 'route53_zone'
  | 'elb'
  | 'alb'
  | 'nlb'
  | 'ecs'
  | 'eks'
  | 'fargate'
  | 'autoscaling'
  | 'cloudwatch'
  | 'logs'
  | 'sqs'
  | 'sns'
  | 'kinesis'
  | 'dynamodb'
  | 'documentdb'
  | 'neptune'
  | 'redshift'
  | 'elasticache'
  | 'elasticache_replication_group'
  | 'mq'
  | 'mq_broker'
  | 'efs'
  | 'fsx'
  | 'glacier'
  | 's3_object_lambda'
  | 'dms'
  | 'dms_replication_task'
  | 'transfer'
  | 'directconnect'
  | 'vpn'
  | 'vpc_peering'
  | 'vpc_endpoint'
  | 'vpc_flow_log'
  | 'nat_gateway'
  | 'internet_gateway'
  | 'egress_only_gateway'
  | 'customer_gateway'
  | 'launch_template'
  | 'placement_group'
  | 'key_pair'
  | 'spot_fleet'
  | 'dedicated_host'
  | 'vpc_dhcp_options'
  | 'vpc_dhcp_options_association'
  | 'vpc_address'
  | 'vpc_ipam'
  | 'vpc_ipam_pool'
  | 'vpc_ipam_allocation'
  | 'vpc_ipam_preview'
  | 'vpc_ipam_scope'
  | 'kms'
  | 'secretsmanager'
  | 'ssm'
  | 'elastic_beanstalk'
  | 'glue'
  | 'athena'
  | 'quicksight'
  | 'macie'
  | 'guardduty'
  | 'securityhub'
  | 'config'
  | 'waf'
  | 'shield'
  | 'detective'
  | 'inspector';

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
