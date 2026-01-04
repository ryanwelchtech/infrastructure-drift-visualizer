'use client';

import { useMemo } from 'react';
import { Resource } from '@/types/infrastructure';
import { Badge } from '@/components/ui/badge';
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
  const allKeys = new Set([...Object.keys(terraform), ...Object.keys(actual)]);
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

export function DiffViewer({ resource }: DiffViewerProps) {
  const diffLines = useMemo(
    () => getDiffLines(resource.terraformConfig, resource.actualConfig),
    [resource]
  );

  const changedCount = diffLines.filter((l) => l.isDifferent).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Configuration Diff</h3>
        {changedCount > 0 && (
          <Badge variant="warning">{changedCount} difference{changedCount > 1 ? 's' : ''}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Header */}
        <div className="text-sm font-medium text-muted-foreground p-2 bg-muted/50 rounded-t-lg">
          Terraform State (Expected)
        </div>
        <div className="text-sm font-medium text-muted-foreground p-2 bg-muted/50 rounded-t-lg">
          Actual State (Current)
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {diffLines.map((line, index) => (
          <div key={line.key} className={cn('grid grid-cols-2', index > 0 && 'border-t')}>
            {/* Terraform Side */}
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

            {/* Actual Side */}
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

      {resource.status === 'missing' && (
        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
          <p className="text-sm text-red-500 font-medium">
            This resource exists in Terraform state but was not found in the actual infrastructure.
            It may have been manually deleted.
          </p>
        </div>
      )}

      {resource.status === 'added' && (
        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <p className="text-sm text-blue-500 font-medium">
            This resource exists in the actual infrastructure but is not managed by Terraform.
            Consider importing it or removing it.
          </p>
        </div>
      )}
    </div>
  );
}
