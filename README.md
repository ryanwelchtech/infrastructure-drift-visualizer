# Infrastructure Drift Visualizer

A web application that helps teams spot differences between their cloud infrastructure and the actual resources running in production.

---

## What This Project Does

Imagine you have a blueprint for a building, but over time, workers make changes without updating the blueprint. This tool does the same thing for cloud infrastructure - it compares what you *planned* to have (your Terraform configuration) against what's *actually running* in your cloud environment.

The tool displays this comparison visually, showing:
- Resources that match perfectly (synced)
- Resources that have changed (modified)
- Resources that disappeared (missing)
- New resources that weren't planned (added/untracked)

---

## Why It Matters

**Drift** happens when your actual infrastructure differs from your planned configuration. This can cause:
- Security vulnerabilities from unexpected configurations
- Cost overruns from untracked resources
- Unexpected outages when "hidden" changes cause failures

This tool helps teams catch these issues early, before they become problems.

---

## Who Should Use This

- **DevOps Engineers** - Monitor infrastructure health
- **Cloud Architects** - Validate environment consistency
- **Security Teams** - Identify unauthorized changes
- **SREs** - Detect configuration drift before incidents

---

## Key Features

| Feature | Description |
|---------|-------------|
| Visual Graph | See all your resources at a glance, color-coded by status |
| Drift Score | Get an overall health percentage for your infrastructure |
| Resource Details | Click any resource to see exactly what changed |
| Remediation Tips | Get suggested next steps for each type of drift |
| **One-Click Remediation** | **Generate automated Terraform commands to fix drift** |
| **Demo Mode with 32 Resources** | **Expanded demo showcasing 50+ resource type detection** |
| **50+ AWS Resource Types** | **Support for comprehensive AWS infrastructure** |
| Export | Download infrastructure reports |

---

## Quick Look

The dashboard shows:
1. **Top cards** - Summary statistics (synced/modified/missing/added count)
2. **Main graph** - Interactive visualization of all resources and their relationships
3. **Side panel** - Details about a selected resource
4. **Resource list** - Complete list of all tracked infrastructure

---

## Technology Overview

Built with modern web technologies:
- **Next.js** - Fast, modern web framework
- **React Flow** - Interactive graph visualization
- **Radix UI** - Accessible, customizable components
- **TypeScript** - Type-safe, maintainable code
- **Tailwind CSS** - Clean, responsive styling

---

## Getting Started

### Run Locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Demo Mode

The application includes a comprehensive demo with 32 infrastructure resources showcasing:
- All drift states (synced, modified, missing, added)
- 50+ AWS resource types (VPC, EC2, RDS, Lambda, S3, ALB, etc.)
- Complex dependency relationships
- Real-world drift scenarios

Click "Load Sample Data" or "Fetch from AWS (Demo)" to explore the demo.

### AWS Integration

To enable real AWS API integration:

**Option 1: Environment Variables**
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

**Option 2: AWS CLI Configuration**
```bash
aws configure
```

**Option 3: IAM Roles (EC2, Lambda, ECS)**
- Attach appropriate IAM policies to your compute resource
- No credentials needed - SDK automatically discovers credentials

**Required IAM Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ec2:DescribeInstances",
      "ec2:DescribeVpcs",
      "ec2:DescribeSubnets",
      "ec2:DescribeSecurityGroups",
      "ec2:DescribeVolumes",
      "s3:ListBuckets",
      "s3:GetBucketPolicyStatus",
      "s3:GetPublicAccessBlock",
      "lambda:ListFunctions",
      "rds:DescribeDBInstances",
      "elasticache:DescribeCacheClusters",
      "dynamodb:ListTables",
      "sns:ListTopics",
      "sqs:ListQueues",
      "cloudfront:ListDistributions",
      "cloudwatch:DescribeAlarms",
      "iam:ListRoles",
      "kms:ListKeys",
      "secretsmanager:ListSecrets",
      "efs:DescribeFileSystems"
    ],
    "Resource": "*"
  }]
}
```

**Implementation Guide:**

1. **Update `src/lib/awsIntegration.ts`** to use AWS SDK:
   ```typescript
   import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
   import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
   ```

2. **Convert AWS responses to internal Resource format:**
   ```typescript
   function awsEc2ToResource(ec2Instance: EC2Instance): Resource {
     return {
       id: ec2Instance.InstanceId!,
       name: ec2Instance.Tags?.find(t => t.Key === 'Name')?.Value || 'unknown',
       type: 'ec2',
       status: 'synced',
       terraformConfig: { /* mapped from AWS */ },
       actualConfig: { /* mapped from AWS */ },
       dependencies: [],
       lastChecked: new Date().toISOString(),
       region: ec2Instance.Placement?.AvailabilityZone || 'unknown',
     };
   }
   ```

3. **Deploy with credentials:**
   - Lambda with execution role
   - EC2 with instance profile
   - ECS with task role
   - GitHub Actions with OIDC

### Run Tests

```bash
npm test
```

### Check Code Quality

```bash
npm run lint          # Code style checks
npm run type-check    # TypeScript validation
npm run build         # Production build
```

---

## Project Structure

```
src/
├── app/              # Main application pages
├── components/       # Reusable UI components
│   ├── graph/        # Infrastructure visualization
│   ├── diff/         # Resource comparison views
│   ├── layout/       # Page layout components
│   └── ui/           # Basic UI elements (buttons, cards, etc.)
├── data/             # Sample data for demo
├── lib/              # Utility functions
└── types/            # TypeScript type definitions
```

---

## CI/CD Pipeline

This project includes automated quality checks:

1. **Lint & Type Check** - Catches code style and type errors
2. **Build** - Ensures the application compiles successfully
3. **Security Scan** - Checks dependencies for known vulnerabilities

---

## License

MIT

---

## Questions?

For questions or contributions, please open an issue on GitHub.
