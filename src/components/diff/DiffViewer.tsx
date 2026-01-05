'use client';

import { useMemo } from 'react';
import { Resource } from '@/types/infrastructure';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  resource: Resource;
}

interface DiffLine {
  key: string;
  terraformValue: string;
  actualValue: string;
  isDifferent: boolean;
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function getDiffLines(terraform: Record<string, unknown>, actual: Record<string, unknown>): DiffLine[] {
  const allKeys = Array.from(new Set([...Object.keys(terraform), ...Object.keys(actual)]));
  const lines: DiffLine[] = [];

  allKeys.forEach((key) => {
    const terraformValue = stringify(terraform[key]);
    const actualValue = stringify(actual[key]);
    lines.push({
      key,
      terraformValue,
      actualValue,
      isDifferent: terraformValue !== actualValue,
    });
  });

  return lines.sort((a, b) => {
    if (a.isDifferent && !b.isDifferent) return -1;
    if (!a.isDifferent && b.isDifferent) return 1;
    return a.key.localeCompare(b.key);
  });
}

function getRemediationSuggestion(key: string, actualValue: unknown): string {
  const valueStr = stringify(actualValue);
  const suggestions: Record<string, string> = {
    instance_type: `Update Terraform to: ${valueStr}`,
    map_public_ip_on_launch: `Set to ${valueStr} in Terraform`,
    monitoring: `${valueStr === 'true' ? 'Enable' : 'Disable'} monitoring in Terraform`,
    memory_size: `Increase memory_size to ${valueStr} MB`,
    timeout: `Set timeout to ${valueStr} seconds`,
    port: `Add port ${valueStr} to Terraform security group`,
    cidr: `Update CIDR block to ${valueStr}`,
  };

  const exactMatch = suggestions[key];
  if (exactMatch) return exactMatch;

  if (key.includes('port') || key.includes('cidr') || key.includes('instance_type')) {
    return `Update ${key} to match actual state: ${valueStr}`;
  }

  return `Set ${key} = ${valueStr} in Terraform configuration`;
}

export function DiffViewer({ resource }: DiffViewerProps) {
  const diffLines = useMemo(
    () => getDiffLines(resource.terraformConfig, resource.actualConfig),
    [resource]
  );

  const changedCount = diffLines.filter((l) => l.isDifferent).length;
  const differentLines = diffLines.filter((l) => l.isDifferent);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Configuration Diff</h3>
        {changedCount > 0 && (
          <Badge variant="warning">{changedCount} difference{changedCount > 1 ? 's' : ''}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-sm font-medium text-muted-foreground p-2 bg-muted/50 rounded-t-lg">
          Terraform (Expected)
        </div>
        <div className="text-sm font-medium text-muted-foreground p-2 bg-muted/50 rounded-t-lg">
          Actual (Current)
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {diffLines.map((line, index) => (
          <div key={line.key} className={cn('grid grid-cols-2', index > 0 && 'border-t')}>
            <div
              className={cn(
                'p-3 font-mono text-sm',
                line.isDifferent && 'bg-red-500/10'
              )}
            >
              <span className="text-muted-foreground">{line.key}: </span>
              <span className={cn(line.isDifferent && 'text-red-500 line-through')}>
                {line.terraformValue}
              </span>
            </div>
            <div
              className={cn(
                'p-3 font-mono text-sm border-l',
                line.isDifferent && 'bg-green-500/10'
              )}
            >
              <span className="text-muted-foreground">{line.key}: </span>
              <span className={cn(line.isDifferent && 'text-green-500 font-semibold')}>
                {line.actualValue}
              </span>
            </div>
          </div>
        ))}
      </div>

      {resource.status === 'synced' && changedCount === 0 && (
        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full" />
            This resource is fully synchronized. No changes required.
          </p>
        </div>
      )}

      {differentLines.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-foreground">Remediation Steps</h4>
          <p className="text-sm text-muted-foreground">
            To align your actual infrastructure with your Terraform configuration, apply the following changes:
          </p>
          <div className="space-y-2">
            {differentLines.map((line) => (
              <div
                key={line.key}
                className="p-3 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{line.key}</span>
                  <Badge variant="modified" className="text-xs">Modified</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Terraform: </span>
                    <span className="font-mono text-red-500">{line.terraformValue}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actual: </span>
                    <span className="font-mono text-green-500">{line.actualValue}</span>
                  </div>
                </div>
                <div className="mt-2 p-2 bg-primary/5 rounded text-xs">
                  <span className="text-muted-foreground">Fix: </span>
                  <span className="font-medium">{getRemediationSuggestion(line.key, line.actualValue)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs font-mono text-muted-foreground">
              terraform plan -target={resource.type}.{resource.name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Run the above command to see the planned changes, then apply with:
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              terraform apply -target={resource.type}.{resource.name}
            </p>
          </div>
        </div>
      )}

      {resource.status === 'missing' && (
        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
          <p className="text-sm text-red-500 font-medium mb-2">
            This resource exists in Terraform but was not found in actual infrastructure.
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            It may have been manually deleted. Recommended actions:
          </p>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              terraform apply -target={resource.type}.{resource.name}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              terraform state rm {resource.type}.{resource.name}
            </Button>
          </div>
        </div>
      )}

      {resource.status === 'added' && (
        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <p className="text-sm text-blue-500 font-medium mb-2">
            This resource exists in actual infrastructure but is not managed by Terraform.
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            Recommended actions:
          </p>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              terraform import {resource.type}.{resource.name} {resource.id}
            </Button>
            <Button variant="destructive" size="sm" className="w-full justify-start">
              Delete untracked resource from cloud
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
