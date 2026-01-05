'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiffViewer } from '@/components/diff/DiffViewer';
import { ErrorBoundary } from '@/components/graph/ErrorBoundary';
import { sampleResources, sampleSummary } from '@/data/sampleData';
import { Resource } from '@/types/infrastructure';
import { getDriftSeverity, calculateDriftScore } from '@/lib/utils';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  FileCode,
  Play,
  Download,
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

export default function Home() {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, REFRESH_SIMULATION_DELAY_MS));
    setIsRefreshing(false);
  }, []);

  const handleNodeSelect = useCallback((resource: Resource | null) => {
    setSelectedResource(resource);
  }, []);

  const score = calculateDriftScore(
    sampleSummary.synced,
    sampleSummary.modified,
    sampleSummary.missing,
    sampleSummary.added
  );
  const severity = getDriftSeverity(score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      <main className="pt-20 p-4">
        <div className="container mx-auto">
          {/* Summary Cards */}
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
                  <p className="text-2xl font-bold">{sampleSummary.synced}</p>
                  <p className="text-sm text-muted-foreground">Synced</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{sampleSummary.modified}</p>
                  <p className="text-sm text-muted-foreground">Modified</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{sampleSummary.missing}</p>
                  <p className="text-sm text-muted-foreground">Missing</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <Plus className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{sampleSummary.added}</p>
                  <p className="text-sm text-muted-foreground">Untracked</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Graph */}
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
                      resources={sampleResources}
                      onNodeSelect={handleNodeSelect}
                    />
                  </ErrorBoundary>
                </div>
              </CardContent>
            </Card>

            {/* Details Panel */}
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
                      <TabsTrigger value="remediation" className="flex-1">Remediation</TabsTrigger>
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
                        <p className="text-sm text-muted-foreground">
                          Recommended actions to resolve drift:
                        </p>

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

          {/* Resource List */}
          <Card className="glass-card mt-6">
            <CardHeader>
              <CardTitle>All Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sampleResources.map((resource) => {
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
