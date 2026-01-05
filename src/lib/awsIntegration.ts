import { Resource, RemediationPlan, RemediationAction, DriftStatus, ResourceType } from '@/types/infrastructure';

export interface AWSResourceConfig {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

export async function fetchAWSResources(config: AWSResourceConfig): Promise<Resource[]> {
  const { region = 'us-east-1' } = config;

  return fetchDemoResources(region);
}

async function fetchRealAWSResources(_region: string): Promise<Resource[]> {
  const resources: Resource[] = [];
  const now = new Date().toISOString();

  try {
    const { EC2Client, DescribeInstancesCommand, DescribeVpcsCommand, DescribeSubnetsCommand, DescribeSecurityGroupsCommand } = await import('@aws-sdk/client-ec2');
    const ec2Client = new EC2Client({ region: _region });
    
    const [vpcs, subnets, sgs, instances] = await Promise.all([
      ec2Client.send(new DescribeVpcsCommand({})),
      ec2Client.send(new DescribeSubnetsCommand({})),
      ec2Client.send(new DescribeSecurityGroupsCommand({})),
      ec2Client.send(new DescribeInstancesCommand({})),
    ]);

    vpcs.Vpcs?.forEach((vpc) => {
      resources.push({
        id: vpc.VpcId || `vpc-${Date.now()}`,
        name: vpc.Tags?.find(t => t.Key === 'Name')?.Value || 'unknown-vpc',
        type: 'vpc' as ResourceType,
        status: 'synced' as DriftStatus,
        terraformConfig: {},
        actualConfig: { cidr_block: vpc.CidrBlock || '' },
        dependencies: [],
        lastChecked: now,
        region: _region,
      });
    });

    subnets.Subnets?.forEach((subnet) => {
      resources.push({
        id: subnet.SubnetId || `subnet-${Date.now()}`,
        name: subnet.Tags?.find(t => t.Key === 'Name')?.Value || 'unknown-subnet',
        type: 'subnet' as ResourceType,
        status: 'synced' as DriftStatus,
        terraformConfig: {},
        actualConfig: { cidr_block: subnet.CidrBlock || '10.0.0.0/24' },
        dependencies: [],
        lastChecked: now,
        region: _region,
      });
    });

    sgs.SecurityGroups?.forEach((sg) => {
      resources.push({
        id: sg.GroupId || `sg-${Date.now()}`,
        name: sg.GroupName || 'unknown-sg',
        type: 'security_group' as ResourceType,
        status: 'synced' as DriftStatus,
        terraformConfig: {},
        actualConfig: {},
        dependencies: [],
        lastChecked: now,
        region: _region,
      });
    });

    instances.Reservations?.forEach((res) => {
      res.Instances?.forEach((instance) => {
        resources.push({
          id: instance.InstanceId || `i-${Date.now()}`,
          name: instance.Tags?.find(t => t.Key === 'Name')?.Value || 'unknown-instance',
          type: 'ec2' as ResourceType,
          status: 'synced' as DriftStatus,
          terraformConfig: {},
          actualConfig: { instance_type: instance.InstanceType || 't3.micro' },
          dependencies: [],
          lastChecked: now,
          region: _region,
        });
      });
    });
  } catch (error) {
    console.error('Error fetching EC2 resources:', error);
  }

  return resources;
}

export function enableRealAWSMode(): void {
  if (typeof window !== 'undefined') {
    (window as any).__USE_REAL_AWS__ = true;
  }
}

export function disableRealAWSMode(): void {
  if (typeof window !== 'undefined') {
    (window as any).__USE_REAL_AWS__ = false;
  }
}

export function isRealAWSModeEnabled(): boolean {
  if (typeof window !== 'undefined') {
    return (window as any).__USE_REAL_AWS__ === true;
  }
  return false;
}

function fetchDemoResources(region: string): Resource[] {
  return [
    {
      id: 'vpc-1',
      name: 'production-vpc',
      type: 'vpc' as ResourceType,
      status: 'synced' as DriftStatus,
      terraformConfig: { cidr_block: '10.0.0.0/16', enable_dns_hostnames: true, enable_dns_support: true },
      actualConfig: { cidr_block: '10.0.0.0/16', enable_dns_hostnames: true, enable_dns_support: true },
      dependencies: [],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'subnet-1',
      name: 'public-subnet-1a',
      type: 'subnet' as ResourceType,
      status: 'synced' as DriftStatus,
      terraformConfig: { cidr_block: '10.0.1.0/24', availability_zone: `${region}a`, map_public_ip_on_launch: true },
      actualConfig: { cidr_block: '10.0.1.0/24', availability_zone: `${region}a`, map_public_ip_on_launch: true },
      dependencies: ['vpc-1'],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'subnet-2',
      name: 'private-subnet-1a',
      type: 'subnet' as ResourceType,
      status: 'modified' as DriftStatus,
      terraformConfig: { cidr_block: '10.0.10.0/24', availability_zone: `${region}a`, map_public_ip_on_launch: false },
      actualConfig: { cidr_block: '10.0.10.0/24', availability_zone: `${region}a`, map_public_ip_on_launch: true },
      dependencies: ['vpc-1'],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'sg-1',
      name: 'web-security-group',
      type: 'security_group' as ResourceType,
      status: 'modified' as DriftStatus,
      terraformConfig: { ingress: [{ port: 443, protocol: 'tcp', cidr: '0.0.0.0/0' }, { port: 80, protocol: 'tcp', cidr: '0.0.0.0/0' }] },
      actualConfig: { ingress: [{ port: 443, protocol: 'tcp', cidr: '0.0.0.0/0' }, { port: 80, protocol: 'tcp', cidr: '0.0.0.0/0' }, { port: 22, protocol: 'tcp', cidr: '10.0.0.0/16' }] },
      dependencies: ['vpc-1'],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'ec2-1',
      name: 'web-server-1',
      type: 'ec2' as ResourceType,
      status: 'synced' as DriftStatus,
      terraformConfig: { instance_type: 't3.medium', ami: 'ami-0123456789abcdef0', key_name: 'production-key' },
      actualConfig: { instance_type: 't3.medium', ami: 'ami-0123456789abcdef0', key_name: 'production-key' },
      dependencies: ['subnet-1', 'sg-1'],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'ec2-2',
      name: 'web-server-2',
      type: 'ec2' as ResourceType,
      status: 'modified' as DriftStatus,
      terraformConfig: { instance_type: 't3.medium', ami: 'ami-0123456789abcdef0', key_name: 'production-key' },
      actualConfig: { instance_type: 't3.xlarge', ami: 'ami-0123456789abcdef0', key_name: 'production-key' },
      dependencies: ['subnet-2', 'sg-1'],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'rds-1',
      name: 'production-database',
      type: 'rds' as ResourceType,
      status: 'synced' as DriftStatus,
      terraformConfig: { engine: 'postgres', engine_version: '15.4', instance_class: 'db.r6g.large', multi_az: true },
      actualConfig: { engine: 'postgres', engine_version: '15.4', instance_class: 'db.r6g.large', multi_az: true },
      dependencies: ['subnet-2', 'sg-1'],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 's3-1',
      name: 'app-assets-bucket',
      type: 's3' as ResourceType,
      status: 'synced' as DriftStatus,
      terraformConfig: { bucket: 'app-assets-prod-2024', versioning: true, encryption: 'AES256' },
      actualConfig: { bucket: 'app-assets-prod-2024', versioning: true, encryption: 'AES256' },
      dependencies: [],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'lambda-1',
      name: 'api-handler-function',
      type: 'lambda' as ResourceType,
      status: 'added' as DriftStatus,
      terraformConfig: {},
      actualConfig: { runtime: 'nodejs18.x', memory_size: 256, timeout: 30, handler: 'index.handler' },
      dependencies: [],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'alb-1',
      name: 'production-alb',
      type: 'alb' as ResourceType,
      status: 'synced' as DriftStatus,
      terraformConfig: { load_balancer_type: 'application', scheme: 'internet-facing' },
      actualConfig: { load_balancer_type: 'application', scheme: 'internet-facing' },
      dependencies: ['subnet-1', 'subnet-2', 'sg-1'],
      lastChecked: new Date().toISOString(),
      region,
    },
  ];
}

export function generateRemediationPlan(resources: Resource[]): RemediationPlan {
  const actions: RemediationAction[] = [];

  resources.forEach((resource) => {
    switch (resource.status) {
      case 'modified':
        actions.push({
          id: `action-${resource.id}-apply`,
          type: 'apply',
          resourceId: resource.id,
          resourceName: resource.name,
          description: `Apply Terraform changes to sync ${resource.type} "${resource.name}"`,
          command: generateTerraformApplyCommand(resource),
          risk: 'medium',
          estimatedTime: '2-5 minutes',
        });
        break;
      case 'missing':
        actions.push({
          id: `action-${resource.id}-import`,
          type: 'import',
          resourceId: resource.id,
          resourceName: resource.name,
          description: `Import existing ${resource.type} "${resource.name}" into Terraform state`,
          command: generateTerraformImportCommand(resource),
          risk: 'low',
          estimatedTime: '1-2 minutes',
        });
        break;
      case 'added':
        actions.push({
          id: `action-${resource.id}-tf`,
          type: 'manual',
          resourceId: resource.id,
          resourceName: resource.name,
          description: `Add ${resource.type} "${resource.name}" to Terraform configuration`,
          command: generateTerraformResource(resource),
          risk: 'medium',
          estimatedTime: '5-10 minutes',
        });
        actions.push({
          id: `action-${resource.id}-destroy`,
          type: 'destroy',
          resourceId: resource.id,
          resourceName: resource.name,
          description: `Remove untracked ${resource.type} "${resource.name}" from AWS`,
          command: `aws ${resource.type} delete-${resource.type.replace(/_/g, '-')} --resource-id ${resource.id}`,
          risk: 'high',
          estimatedTime: '3-10 minutes',
        });
        break;
    }
  });

  const totalActions = actions.length;
  const highRiskActions = actions.filter((a) => a.risk === 'high').length;
  const mediumRiskActions = actions.filter((a) => a.risk === 'medium').length;

  const riskLevel: 'low' | 'medium' | 'high' =
    highRiskActions > 0 ? 'high' : mediumRiskActions > 0 ? 'medium' : 'low';

  const totalTime = totalActions * 3;

  return {
    id: `plan-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    actions,
    totalActions,
    estimatedDuration: `${totalTime}-${totalTime * 2} minutes`,
    riskLevel,
  };
}

function generateTerraformApplyCommand(resource: Resource): string {
  return `terraform apply -target=${resource.type}.${resource.name}`;
}

function generateTerraformImportCommand(resource: Resource): string {
  const resourceId = resource.actualConfig.id || resource.id;
  return `terraform import ${resource.type}.${resource.name} ${resourceId}`;
}

function generateTerraformResource(resource: Resource): string {
  const configEntries = Object.entries(resource.actualConfig)
    .filter(([key]) => key !== 'id')
    .map(([key, value]) => {
      if (typeof value === 'object') {
        return `  ${key} = ${JSON.stringify(value, null, 2).replace(/\n/g, '\n  ')}`;
      }
      return `  ${key} = ${JSON.stringify(value)}`;
    })
    .join('\n');

  return `resource "${resource.type}" "${resource.name}" {
${configEntries}
}`;
}

export function exportRemediationPlan(plan: RemediationPlan): string {
  const lines = [
    '# Infrastructure Remediation Plan',
    `# Generated: ${plan.generatedAt}`,
    `# Total Actions: ${plan.totalActions}`,
    `# Risk Level: ${plan.riskLevel}`,
    `# Estimated Duration: ${plan.estimatedDuration}`,
    '',
    '## Execution Order',
    '',
  ];

  plan.actions.forEach((action, index) => {
    lines.push(`### ${index + 1}. ${action.description}`);
    lines.push(`- **Type**: ${action.type}`);
    lines.push(`- **Risk**: ${action.risk}`);
    lines.push(`- **Estimated Time**: ${action.estimatedTime}`);
    lines.push(`- **Command**: \`${action.command}\``);
    lines.push('');
  });

  return lines.join('\n');
}

export function downloadRemediationPlan(plan: RemediationPlan): void {
  const content = exportRemediationPlan(plan);
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `remediation-plan-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
