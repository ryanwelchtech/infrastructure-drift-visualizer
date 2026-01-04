import { Resource, DriftSummary } from '@/types/infrastructure';

export const sampleResources: Resource[] = [
  {
    id: 'vpc-1',
    name: 'production-vpc',
    type: 'vpc',
    status: 'synced',
    terraformConfig: {
      cidr_block: '10.0.0.0/16',
      enable_dns_hostnames: true,
      enable_dns_support: true,
      tags: { Name: 'production-vpc', Environment: 'production' },
    },
    actualConfig: {
      cidr_block: '10.0.0.0/16',
      enable_dns_hostnames: true,
      enable_dns_support: true,
      tags: { Name: 'production-vpc', Environment: 'production' },
    },
    dependencies: [],
    lastChecked: new Date().toISOString(),
    region: 'us-east-1',
  },
  {
    id: 'subnet-1',
    name: 'public-subnet-1a',
    type: 'subnet',
    status: 'synced',
    terraformConfig: {
      cidr_block: '10.0.1.0/24',
      availability_zone: 'us-east-1a',
      map_public_ip_on_launch: true,
    },
    actualConfig: {
      cidr_block: '10.0.1.0/24',
      availability_zone: 'us-east-1a',
      map_public_ip_on_launch: true,
    },
    dependencies: ['vpc-1'],
    lastChecked: new Date().toISOString(),
    region: 'us-east-1',
  },
  {
    id: 'subnet-2',
    name: 'private-subnet-1a',
    type: 'subnet',
    status: 'modified',
    terraformConfig: {
      cidr_block: '10.0.2.0/24',
      availability_zone: 'us-east-1a',
      map_public_ip_on_launch: false,
    },
    actualConfig: {
      cidr_block: '10.0.2.0/24',
      availability_zone: 'us-east-1a',
      map_public_ip_on_launch: true, // DRIFT: Changed to true
    },
    dependencies: ['vpc-1'],
    lastChecked: new Date().toISOString(),
    region: 'us-east-1',
  },
  {
    id: 'sg-1',
    name: 'web-security-group',
    type: 'security_group',
    status: 'modified',
    terraformConfig: {
      ingress: [
        { port: 443, protocol: 'tcp', cidr: '0.0.0.0/0' },
        { port: 80, protocol: 'tcp', cidr: '0.0.0.0/0' },
      ],
      egress: [{ port: 0, protocol: '-1', cidr: '0.0.0.0/0' }],
    },
    actualConfig: {
      ingress: [
        { port: 443, protocol: 'tcp', cidr: '0.0.0.0/0' },
        { port: 80, protocol: 'tcp', cidr: '0.0.0.0/0' },
        { port: 22, protocol: 'tcp', cidr: '0.0.0.0/0' }, // DRIFT: SSH opened
      ],
      egress: [{ port: 0, protocol: '-1', cidr: '0.0.0.0/0' }],
    },
    dependencies: ['vpc-1'],
    lastChecked: new Date().toISOString(),
    region: 'us-east-1',
  },
  {
    id: 'ec2-1',
    name: 'web-server-1',
    type: 'ec2',
    status: 'synced',
    terraformConfig: {
      instance_type: 't3.medium',
      ami: 'ami-0123456789',
      key_name: 'production-key',
      monitoring: true,
    },
    actualConfig: {
      instance_type: 't3.medium',
      ami: 'ami-0123456789',
      key_name: 'production-key',
      monitoring: true,
    },
    dependencies: ['subnet-1', 'sg-1'],
    lastChecked: new Date().toISOString(),
    region: 'us-east-1',
  },
  {
    id: 'ec2-2',
    name: 'web-server-2',
    type: 'ec2',
    status: 'modified',
    terraformConfig: {
      instance_type: 't3.medium',
      ami: 'ami-0123456789',
      key_name: 'production-key',
      monitoring: true,
    },
    actualConfig: {
      instance_type: 't3.large', // DRIFT: Instance type changed
      ami: 'ami-0123456789',
      key_name: 'production-key',
      monitoring: false, // DRIFT: Monitoring disabled
    },
    dependencies: ['subnet-1', 'sg-1'],
    lastChecked: new Date().toISOString(),
    region: 'us-east-1',
  },
  {
    id: 'rds-1',
    name: 'production-database',
    type: 'rds',
    status: 'synced',
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
      instance_class: 'db.r6g.large',
      multi_az: true,
      storage_encrypted: true,
    },
    dependencies: ['subnet-2', 'sg-1'],
    lastChecked: new Date().toISOString(),
    region: 'us-east-1',
  },
  {
    id: 's3-1',
    name: 'app-assets-bucket',
    type: 's3',
    status: 'missing',
    terraformConfig: {
      bucket: 'app-assets-prod-2024',
      versioning: true,
      encryption: 'AES256',
      public_access_block: true,
    },
    actualConfig: {},
    dependencies: [],
    lastChecked: new Date().toISOString(),
    region: 'us-east-1',
  },
  {
    id: 'elb-1',
    name: 'production-alb',
    type: 'elb',
    status: 'synced',
    terraformConfig: {
      load_balancer_type: 'application',
      scheme: 'internet-facing',
      idle_timeout: 60,
    },
    actualConfig: {
      load_balancer_type: 'application',
      scheme: 'internet-facing',
      idle_timeout: 60,
    },
    dependencies: ['subnet-1', 'sg-1'],
    lastChecked: new Date().toISOString(),
    region: 'us-east-1',
  },
  {
    id: 'lambda-1',
    name: 'api-handler',
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
    region: 'us-east-1',
  },
];

export const sampleSummary: DriftSummary = {
  total: 10,
  synced: 5,
  modified: 3,
  missing: 1,
  added: 1,
  score: 65,
};

export const getNodePosition = (index: number, total: number) => {
  const cols = 4;
  const spacing = { x: 280, y: 180 };
  const row = Math.floor(index / cols);
  const col = index % cols;
  return {
    x: 100 + col * spacing.x,
    y: 100 + row * spacing.y,
  };
};
