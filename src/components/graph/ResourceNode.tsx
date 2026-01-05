'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Server,
  Database,
  HardDrive,
  Globe,
  Shield,
  Cloud,
  Layers,
  Network,
  Cpu,
  Box,
  Settings,
  Eye,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResourceType, DriftStatus } from '@/types/infrastructure';

interface ResourceNodeData {
  label: string;
  resourceType: ResourceType;
  status: DriftStatus;
}

const iconMap: Partial<Record<ResourceType, React.ComponentType<{ className?: string }>>> = {
  ec2: Server,
  s3: HardDrive,
  rds: Database,
  vpc: Network,
  subnet: Layers,
  security_group: Shield,
  iam_role: Shield,
  iam_user: Shield,
  iam_policy: Shield,
  lambda: Cpu,
  api_gateway: Globe,
  api_gateway_v2: Globe,
  cloudfront: Cloud,
  route53: Globe,
  route53_zone: Globe,
  elb: Globe,
  alb: Globe,
  nlb: Globe,
  ecs: Box,
  eks: Box,
  fargate: Box,
  autoscaling: Box,
  cloudwatch: Cloud,
  logs: HardDrive,
  sqs: HardDrive,
  sns: Cloud,
  kinesis: Network,
  dynamodb: Database,
  documentdb: Database,
  neptune: Database,
  redshift: Database,
  elasticache: Box,
  elasticache_replication_group: Box,
  mq: Cloud,
  mq_broker: Cloud,
  efs: HardDrive,
  fsx: HardDrive,
  glacier: HardDrive,
  s3_object_lambda: HardDrive,
  dms: Network,
  dms_replication_task: Network,
  transfer: Network,
  directconnect: Network,
  vpn: Shield,
  vpc_peering: Network,
  vpc_endpoint: Network,
  vpc_flow_log: Cloud,
  nat_gateway: Network,
  internet_gateway: Globe,
  egress_only_gateway: Network,
  customer_gateway: Network,
  launch_template: HardDrive,
  placement_group: Layers,
  key_pair: Shield,
  spot_fleet: Server,
  dedicated_host: Server,
  vpc_dhcp_options: Network,
  vpc_dhcp_options_association: Network,
  vpc_address: Globe,
  vpc_ipam: Network,
  vpc_ipam_pool: Database,
  vpc_ipam_allocation: Globe,
  vpc_ipam_preview: Cloud,
  vpc_ipam_scope: Settings,
  kms: Shield,
  secretsmanager: Shield,
  ssm: Cloud,
  elastic_beanstalk: Box,
  glue: Database,
  athena: Database,
  quicksight: Database,
  macie: Eye,
  guardduty: Shield,
  securityhub: Shield,
  config: Settings,
  waf: Shield,
  shield: Shield,
  detective: Search,
  inspector: Search,
};

const statusStyles: Record<DriftStatus, string> = {
  synced: 'border-green-500 bg-green-500/10',
  modified: 'border-yellow-500 bg-yellow-500/10',
  missing: 'border-red-500 bg-red-500/10',
  added: 'border-blue-500 bg-blue-500/10',
};

const statusDotStyles: Record<DriftStatus, string> = {
  synced: 'bg-green-500',
  modified: 'bg-yellow-500',
  missing: 'bg-red-500',
  added: 'bg-blue-500',
};

function ResourceNodeComponent({ data, selected }: NodeProps<ResourceNodeData>) {
  const Icon = iconMap[data.resourceType] || Box;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <div
        className={cn(
          'px-4 py-3 rounded-xl border-2 min-w-[160px] transition-all duration-300',
          'backdrop-blur-sm shadow-lg',
          statusStyles[data.status],
          selected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background scale-105'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-background/50">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', statusDotStyles[data.status])} />
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {data.resourceType.replace('_', ' ')}
              </span>
            </div>
            <p className="font-semibold truncate text-sm">{data.label}</p>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </>
  );
}

export const ResourceNode = memo(ResourceNodeComponent);
