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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResourceType, DriftStatus } from '@/types/infrastructure';

interface ResourceNodeData {
  label: string;
  resourceType: ResourceType;
  status: DriftStatus;
}

const iconMap: Record<ResourceType, React.ComponentType<{ className?: string }>> = {
  ec2: Server,
  s3: HardDrive,
  rds: Database,
  vpc: Network,
  subnet: Layers,
  security_group: Shield,
  iam_role: Shield,
  lambda: Cpu,
  api_gateway: Globe,
  cloudfront: Cloud,
  route53: Globe,
  elb: Globe,
  ecs: Box,
  eks: Box,
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
