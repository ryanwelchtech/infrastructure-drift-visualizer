'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiffViewer } from '@/components/diff/DiffViewer';
import { ErrorBoundary } from '@/components/graph/ErrorBoundary';
import { FileUpload } from '@/components/ui/file-upload';
import { sampleResources as sampleResourcesData, sampleSummary as sampleSummaryData } from '@/data/sampleData';
import { Resource, DriftSummary, RemediationPlan } from '@/types/infrastructure';
import { getDriftSeverity, calculateDriftScore } from '@/lib/utils';
import { parseTerraformStateFile, parseActualStateFile, compareStates, calculateSummary } from '@/lib/terraformParser';
import { generateRemediationPlan, downloadRemediationPlan, fetchAWSResources } from '@/lib/awsIntegration';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  FileCode,
  Play,
  Download,
  Upload,
  RefreshCw,
  Database,
  FileJson,
  Wand2,
  Cloud,
  Trash2,
  Import,
  ArrowRight,
} from 'lucide-react';

const InfrastructureGraph = dynamic(
  () => import('@/components/graph/InfrastructureGraph').then((mod) => mod.InfrastructureGraph),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center">Loading graph...</div> }
);

const statusIcons = {
  synced: CheckCircle,
  modified: AlertTriangle,
  missing: XCircle,
  added: Plus,
};

const statusColors = {
  synced: 'text-green-500',
  modified: 'text-yellow-500',
  missing: 'text-red-500',
  added: 'text-blue-500',
};

const REFRESH_SIMULATION_DELAY_MS = 1500;

const SAMPLE_PLANNED_JSON = JSON.stringify({
  version: 4,
  terraform_version: "1.6.0",
  serial: 42,
  lineage: "abc123-def456",
  resources: [
    {
      type: "aws_vpc",
      name: "production",
      mode: "managed",
      instances: [{
        attributes: {
          id: "vpc-0123456789abcdef0",
          cidr_block: "10.0.0.0/16",
          enable_dns_hostnames: true,
          enable_dns_support: true,
          tags: { Name: "production-vpc", Environment: "production" }
        },
        depends_on: []
      }]
    },
    {
      type: "aws_subnet",
      name: "public_1a",
      mode: "managed",
      instances: [{
        attributes: {
          id: "subnet-0123456789abcdef0",
          vpc_id: "vpc-0123456789abcdef0",
          cidr_block: "10.0.1.0/24",
          availability_zone: "us-east-1a",
          map_public_ip_on_launch: true,
          tags: { Name: "public-subnet-1a" }
        },
        depends_on: ["aws_vpc.production"]
      }]
    },
    {
      type: "aws_subnet",
      name: "private_1a",
      mode: "managed",
      instances: [{
        attributes: {
          id: "subnet-0123456789abcdef1",
          vpc_id: "vpc-0123456789abcdef0",
          cidr_block: "10.0.2.0/24",
          availability_zone: "us-east-1a",
          map_public_ip_on_launch: false,
          tags: { Name: "private-subnet-1a" }
        },
        depends_on: ["aws_vpc.production"]
      }]
    },
    {
      type: "aws_security_group",
      name: "web",
      mode: "managed",
      instances: [{
        attributes: {
          id: "sg-0123456789abcdef0",
          name: "web-sg",
          vpc_id: "vpc-0123456789abcdef0",
          ingress: [
            { from_port: 443, to_port: 443, protocol: "tcp", cidr_blocks: ["0.0.0.0/0"] },
            { from_port: 80, to_port: 80, protocol: "tcp", cidr_blocks: ["0.0.0.0/0"] }
          ],
          egress: [{ from_port: 0, to_port: 0, protocol: "-1", cidr_blocks: ["0.0.0.0/0"] }]
        },
        depends_on: ["aws_vpc.production"]
      }]
    },
    {
      type: "aws_instance",
      name: "web_server",
      mode: "managed",
      instances: [{
        attributes: {
          id: "i-0123456789abcdef0",
          ami: "ami-0abcdef1234567890",
          instance_type: "t3.medium",
          key_name: "production-key",
          monitoring: true,
          tags: { Name: "web-server-1" }
        },
        depends_on: ["aws_subnet.public_1a", "aws_security_group.web"]
      }]
    }
  ]
}, null, 2);

const SAMPLE_ACTUAL_JSON = JSON.stringify({
  resources: [
    {
      type: "aws_vpc",
      name: "production",
      config: {
        id: "vpc-0123456789abcdef0",
        cidr_block: "10.0.0.0/16",
        enable_dns_hostnames: true,
        enable_dns_support: true,
        tags: { Name: "production-vpc", Environment: "production" }
      },
      depends_on: [],
      region: "us-east-1"
    },
    {
      type: "aws_subnet",
      name: "public_1a",
      config: {
        id: "subnet-0123456789abcdef0",
        vpc_id: "vpc-0123456789abcdef0",
        cidr_block: "10.0.1.0/24",
        availability_zone: "us-east-1a",
        map_public_ip_on_launch: true,
        tags: { Name: "public-subnet-1a" }
      },
      depends_on: ["aws_vpc.production"],
      region: "us-east-1"
    },
    {
      type: "aws_subnet",
      name: "private_1a",
      config: {
        id: "subnet-0123456789abcdef1",
        vpc_id: "vpc-0123456789abcdef0",
        cidr_block: "10.0.2.0/24",
        availability_zone: "us-east-1a",
        map_public_ip_on_launch: true,
        tags: { Name: "private-subnet-1a" }
      },
      depends_on: ["aws_vpc.production"],
      region: "us-east-1"
    },
    {
      type: "aws_security_group",
      name: "web",
      config: {
        id: "sg-0123456789abcdef0",
        name: "web-sg",
        vpc_id: "vpc-0123456789abcdef0",
        ingress: [
          { from_port: 443, to_port: 443, protocol: "tcp", cidr_blocks: ["0.0.0.0/0"] },
          { from_port: 80, to_port: 80, protocol: "tcp", cidr_blocks: ["0.0.0.0/0"] },
          { from_port: 22, to_port: 22, protocol: "tcp", cidr_blocks: ["0.0.0.0/0"] }
        ],
        egress: [{ from_port: 0, to_port: 0, protocol: "-1", cidr_blocks: ["0.0.0.0/0"] }]
      },
      depends_on: ["aws_vpc.production"],
      region: "us-east-1"
    },
    {
      type: "aws_instance",
      name: "web_server",
      config: {
        id: "i-0123456789abcdef0",
        ami: "ami-0abcdef1234567890",
        instance_type: "t3.large",
        key_name: "production-key",
        monitoring: false,
        tags: { Name: "web-server-1" }
      },
      depends_on: ["aws_subnet.public_1a", "aws_security_group.web"],
      region: "us-east-1"
    }
  ]
}, null, 2);

export default function Home() {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingAWS, setIsLoadingAWS] = useState(false);
  const [plannedState, setPlannedState] = useState<string | null>(null);
  const [actualState, setActualState] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>(sampleResourcesData);
  const [summary, setSummary] = useState<DriftSummary>(sampleSummaryData);
  const [dataMode, setDataMode] = useState<'sample' | 'custom' | 'aws'>('sample');
  const [remediationPlan, setRemediationPlan] = useState<RemediationPlan | null>(null);
  const graphRef = useRef<{ resetGraph?: () => void }>({});

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, REFRESH_SIMULATION_DELAY_MS));
    setIsRefreshing(false);
  }, []);

  const handleNodeSelect = useCallback((resource: Resource | null) => {
    setSelectedResource(resource);
  }, []);

  const tryCompare = useCallback((planned: string, actual: string) => {
    try {
      const plannedData = parseTerraformStateFile(planned);
      const actualData = parseActualStateFile(actual);
      const comparedResources = compareStates(plannedData, actualData);
      setResources(comparedResources);
      setSummary(calculateSummary(comparedResources));
      setDataMode('custom');
    } catch (error) {
      console.error('Error comparing states:', error);
    }
  }, []);

  const handlePlannedLoaded = useCallback((content: string, _filename: string) => {
    setPlannedState(content);
    if (actualState) {
      tryCompare(content, actualState);
    }
  }, [actualState, tryCompare]);

  const handleActualLoaded = useCallback((content: string, _filename: string) => {
    setActualState(content);
    if (plannedState) {
      tryCompare(plannedState, content);
    }
  }, [plannedState, tryCompare]);

  const loadSampleData = useCallback(() => {
    setResources(sampleResourcesData);
    setSummary(sampleSummaryData);
    setPlannedState(null);
    setActualState(null);
    setDataMode('sample');
    setSelectedResource(null);
  }, []);

  const loadBuiltinSample = useCallback(async () => {
    setPlannedState(SAMPLE_PLANNED_JSON);
    setActualState(SAMPLE_ACTUAL_JSON);
    try {
      const plannedData = parseTerraformStateFile(SAMPLE_PLANNED_JSON);
      const actualData = parseActualStateFile(SAMPLE_ACTUAL_JSON);
      const comparedResources = compareStates(plannedData, actualData);
      setResources(comparedResources);
      setSummary(calculateSummary(comparedResources));
      setDataMode('custom');
    } catch (error) {
      console.error('Error comparing builtin sample:', error);
    }
  }, []);

  const loadAWSResources = useCallback(async () => {
    setIsLoadingAWS(true);
    try {
      const awsResources = await fetchAWSResources({ region: 'us-east-1' });
      const summary = calculateSummary(awsResources);
      setResources(awsResources);
      setSummary(summary);
      setDataMode('aws');
      setPlannedState(null);
      setActualState(null);
      setSelectedResource(null);
    } catch (error) {
      console.error('Error fetching AWS resources:', error);
    } finally {
      setIsLoadingAWS(false);
    }
  }, []);

  const generatePlan = useCallback(() => {
    const plan = generateRemediationPlan(resources);
    setRemediationPlan(plan);
  }, [resources]);

  const downloadPlan = useCallback(() => {
    if (remediationPlan) {
      downloadRemediationPlan(remediationPlan);
    }
  }, [remediationPlan]);

  const handleResetGraph = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).GraphReset) {
      (window as any).GraphReset();
    }
    setSelectedResource(null);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (typeof window !== 'undefined') {
      (window as any).reactFlowInstance?.zoomIn({ duration: 200 });
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (typeof window !== 'undefined') {
      (window as any).reactFlowInstance?.zoomOut({ duration: 200 });
    }
  }, []);

  const handleFitView = useCallback(() => {
    if (typeof window !== 'undefined') {
      (window as any).reactFlowInstance?.fitView({ duration: 200, padding: 0.2 });
    }
  }, []);

  const score = useMemo(() =>
    calculateDriftScore(summary.synced, summary.modified, summary.missing, summary.added),
    [summary]
  );
  const severity = getDriftSeverity(score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onResetGraph={handleResetGraph}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
      />

      <main className="pt-20 p-4">
        <div className="container mx-auto">
          <Card className="glass-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Terraform State Files
              </CardTitle>
              <CardDescription>
                Compare your planned Terraform state against actual cloud resources to detect drift
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <FileUpload
                  label="Planned State (Terraform)"
                  description="Upload or paste your Terraform state JSON"
                  onFileLoaded={handlePlannedLoaded}
                  onLoadSample={loadBuiltinSample}
                  acceptedType="planned"
                  sampleData={SAMPLE_PLANNED_JSON}
                />
                <FileUpload
                  label="Actual State (Cloud Resources)"
                  description="Upload or paste actual cloud state JSON"
                  onFileLoaded={handleActualLoaded}
                  acceptedType="actual"
                  sampleData={SAMPLE_ACTUAL_JSON}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={loadAWSResources} disabled={isLoadingAWS}>
                  <Cloud className="h-4 w-4 mr-2" />
                  {isLoadingAWS ? 'Fetching...' : 'Fetch from AWS'}
                </Button>
                <Button variant="outline" size="sm" onClick={loadBuiltinSample}>
                  <Database className="h-4 w-4 mr-2" />
                  Load Sample Data
                </Button>
                <Button variant="outline" size="sm" onClick={loadSampleData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset to Demo
                </Button>
                <Button variant="default" size="sm" onClick={generatePlan} disabled={resources.length === 0}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Fix Plan
                </Button>
                {remediationPlan && (
                  <Button variant="outline" size="sm" onClick={downloadPlan}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Plan
                  </Button>
                )}
                {dataMode === 'custom' && (
                  <Badge variant="modified" className="gap-1">
                    <FileJson className="h-3 w-3" />
                    Custom Data Loaded
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Drift Score</p>
                    <p className="text-3xl font-bold">{score}%</p>
                  </div>
                  <Badge variant={severity}>{severity}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.synced}</p>
                  <p className="text-sm text-muted-foreground">Synced</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.modified}</p>
                  <p className="text-sm text-muted-foreground">Modified</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.missing}</p>
                  <p className="text-sm text-muted-foreground">Missing</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <Plus className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.added}</p>
                  <p className="text-sm text-muted-foreground">Untracked</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-card lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Infrastructure Graph</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] w-full">
                  <ErrorBoundary
                    fallback={
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Failed to load infrastructure graph
                      </div>
                    }
                  >
                    <InfrastructureGraph
                      resources={resources}
                      onNodeSelect={handleNodeSelect}
                    />
                  </ErrorBoundary>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>
                  {selectedResource ? selectedResource.name : 'Resource Details'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedResource ? (
                  <Tabs defaultValue="diff">
                    <TabsList className="w-full">
                      <TabsTrigger value="diff" className="flex-1">Diff</TabsTrigger>
                      <TabsTrigger value="remediation" className="flex-1">Fix</TabsTrigger>
                    </TabsList>

                    <TabsContent value="diff" className="mt-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const Icon = statusIcons[selectedResource.status];
                            return (
                              <Icon className={`h-5 w-5 ${statusColors[selectedResource.status]}`} />
                            );
                          })()}
                          <Badge variant={selectedResource.status as 'synced' | 'modified' | 'missing' | 'added'}>
                            {selectedResource.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {selectedResource.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <DiffViewer resource={selectedResource} />
                      </div>
                    </TabsContent>

                    <TabsContent value="remediation" className="mt-4">
                      <div className="space-y-4">
                        {remediationPlan ? (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                Generated remediation plan with {remediationPlan.totalActions} actions:
                              </p>
                              <Badge variant={remediationPlan.riskLevel === 'high' ? 'destructive' : remediationPlan.riskLevel === 'medium' ? 'default' : 'secondary'}>
                                {remediationPlan.riskLevel} risk
                              </Badge>
                            </div>
                            <div className="space-y-3">
                        {remediationPlan.actions
                          .filter(action => action.resourceId === selectedResource.id)
                          .map((action) => (
                                  <div key={action.id} className="p-3 bg-muted/50 rounded-lg border">
                                    <div className="flex items-start gap-3">
                                      <div className={`mt-0.5 p-1 rounded ${
                                        action.risk === 'high' ? 'bg-red-500/20 text-red-500' :
                                        action.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                                        'bg-green-500/20 text-green-500'
                                      }`}>
                                        {action.type === 'apply' && <Play className="h-4 w-4" />}
                                        {action.type === 'import' && <Import className="h-4 w-4" />}
                                        {action.type === 'destroy' && <Trash2 className="h-4 w-4" />}
                                        {action.type === 'manual' && <FileCode className="h-4 w-4" />}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{action.description}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Risk: {action.risk} • Time: {action.estimatedTime}
                                        </p>
                                        <code className="block mt-2 p-2 bg-background rounded text-xs">
                                          {action.command}
                                        </code>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Click &quot;Generate Fix Plan&quot; to create automated remediation steps
                          </p>
                        )}

                        {selectedResource.status === 'modified' && (
                          <div className="space-y-3">
                            <Button variant="outline" className="w-full justify-start">
                              <FileCode className="h-4 w-4 mr-2" />
                              Update Terraform to match actual state
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                              <Play className="h-4 w-4 mr-2" />
                              Apply Terraform to restore expected state
                            </Button>
                          </div>
                        )}

                        {selectedResource.status === 'missing' && (
                          <div className="space-y-3">
                            <Button variant="outline" className="w-full justify-start text-red-500">
                              <XCircle className="h-4 w-4 mr-2" />
                              Remove from Terraform state
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                              <Play className="h-4 w-4 mr-2" />
                              Recreate resource with terraform apply
                            </Button>
                          </div>
                        )}

                        {selectedResource.status === 'added' && (
                          <div className="space-y-3">
                            <Button variant="outline" className="w-full justify-start">
                              <Plus className="h-4 w-4 mr-2" />
                              Import into Terraform state
                            </Button>
                            <Button variant="outline" className="w-full justify-start text-red-500">
                              <XCircle className="h-4 w-4 mr-2" />
                              Delete untracked resource
                            </Button>
                          </div>
                        )}

                        {selectedResource.status === 'synced' && (
                          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                            {/* eslint-disable-next-line react/no-unescaped-entities */}
                            <p className="text-sm text-green-600 dark:text-green-400">
                              This resource is in sync. No action required.
                            </p>
                          </div>
                        )}

                        <div className="mt-6 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs font-mono text-muted-foreground">
                            terraform plan -target={selectedResource.type}.{selectedResource.name}
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Select a resource from the graph to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card mt-6">
            <CardHeader>
              <CardTitle>All Resources ({resources.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {resources.map((resource) => {
                  const Icon = statusIcons[resource.status];
                  return (
                    <div
                      key={resource.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedResource?.id === resource.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => handleNodeSelect(resource)}
                    >
                      <div className="flex items-center gap-4">
                        <Icon className={`h-5 w-5 ${statusColors[resource.status]}`} />
                        <div className="flex-1">
                          <p className="font-medium">{resource.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {resource.type.replace('_', ' ')} • {resource.region}
                          </p>
                        </div>
                        <Badge variant={resource.status as 'synced' | 'modified' | 'missing' | 'added'}>
                          {resource.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
