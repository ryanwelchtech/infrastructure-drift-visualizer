import { Resource, RemediationPlan, RemediationAction, DriftStatus, ResourceType } from '@/types/infrastructure';

export interface AWSResourceConfig {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

export async function fetchAWSResources(config: AWSResourceConfig): Promise<Resource[]> {
  const { region = 'us-east-1' } = config;

  const mockResources: Resource[] = [
    {
      id: 'ec2-1',
      name: 'production-web-server',
      type: 'ec2',
      status: 'synced',
      terraformConfig: {
        instance_type: 't3.medium',
        ami: 'ami-0123456789abcdef0',
        key_name: 'production-key',
        monitoring: true,
      },
      actualConfig: {
        instance_type: 't3.medium',
        ami: 'ami-0123456789abcdef0',
        key_name: 'production-key',
        monitoring: true,
      },
      dependencies: ['subnet-1', 'sg-1'],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 's3-1',
      name: 'app-assets-bucket',
      type: 's3',
      status: 'synced',
      terraformConfig: {
        bucket: 'app-assets-prod',
        versioning: true,
        encryption: 'AES256',
      },
      actualConfig: {
        bucket: 'app-assets-prod',
        versioning: true,
        encryption: 'AES256',
      },
      dependencies: [],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'rds-1',
      name: 'production-database',
      type: 'rds',
      status: 'modified',
      terraformConfig: {
        engine: 'postgres',
        engine_version: '15.4',
        instance_class: 'db.r6g.large',
        multi_az: true,
        storage_encrypted: true,
      },
      actualConfig: {
        engine: 'postgres',
        engine_version: '15.4',
        instance_class: 'db.r6g.xlarge',
        multi_az: true,
        storage_encrypted: true,
      },
      dependencies: ['subnet-2', 'sg-2'],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'lambda-1',
      name: 'api-handler-function',
      type: 'lambda',
      status: 'added',
      terraformConfig: {},
      actualConfig: {
        runtime: 'nodejs18.x',
        memory_size: 256,
        timeout: 30,
        handler: 'index.handler',
      },
      dependencies: [],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'subnet-1',
      name: 'public-subnet-1a',
      type: 'subnet',
      status: 'synced',
      terraformConfig: {
        cidr_block: '10.0.1.0/24',
        availability_zone: `${region}a`,
        map_public_ip_on_launch: true,
      },
      actualConfig: {
        cidr_block: '10.0.1.0/24',
        availability_zone: `${region}a`,
        map_public_ip_on_launch: true,
      },
      dependencies: ['vpc-1'],
      lastChecked: new Date().toISOString(),
      region,
    },
    {
      id: 'vpc-1',
      name: 'production-vpc',
      type: 'vpc',
      status: 'synced',
      terraformConfig: {
        cidr_block: '10.0.0.0/16',
        enable_dns_hostnames: true,
        enable_dns_support: true,
      },
      actualConfig: {
        cidr_block: '10.0.0.0/16',
        enable_dns_hostnames: true,
        enable_dns_support: true,
      },
      dependencies: [],
      lastChecked: new Date().toISOString(),
      region,
    },
  ];

  return new Promise((resolve) => {
    setTimeout(() => resolve(mockResources), 500);
  });
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
