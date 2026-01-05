'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ResourceNode } from './ResourceNode';
import { Resource, DriftStatus } from '@/types/infrastructure';
import { getStatusColor } from '@/lib/utils';

interface InfrastructureGraphProps {
  resources: Resource[];
  onNodeSelect: (resource: Resource | null) => void;
}

const nodeTypes: NodeTypes = {
  resource: ResourceNode,
};

interface GridLayoutConfig {
  columns: number;
  spacingX: number;
  spacingY: number;
  offsetX: number;
  offsetY: number;
}

const DEFAULT_LAYOUT_CONFIG: GridLayoutConfig = {
  columns: 4,
  spacingX: 280,
  spacingY: 180,
  offsetX: 100,
  offsetY: 100,
};

const getNodePosition = (index: number, config: GridLayoutConfig = DEFAULT_LAYOUT_CONFIG) => {
  const row = Math.floor(index / config.columns);
  const col = index % config.columns;
  return {
    x: config.offsetX + col * config.spacingX,
    y: config.offsetY + row * config.spacingY,
  };
};

export function InfrastructureGraph({ resources, onNodeSelect }: InfrastructureGraphProps) {
  const layoutConfig = useMemo(() => {
    const resourceCount = resources.length;
    const optimalColumns = Math.ceil(Math.sqrt(resourceCount));
    return {
      columns: Math.max(2, Math.min(optimalColumns, 6)),
      spacingX: 280,
      spacingY: 180,
      offsetX: 100,
      offsetY: 100,
    };
  }, [resources]);

  const initialNodes: Node[] = useMemo(
    () =>
      resources.map((resource, index) => ({
        id: resource.id,
        type: 'resource',
        position: getNodePosition(index, layoutConfig),
        data: {
          label: resource.name,
          resourceType: resource.type,
          status: resource.status,
          resource,
        },
      })),
    [resources, layoutConfig]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      resources.flatMap((resource) =>
        resource.dependencies.map((depId) => ({
          id: `${depId}-${resource.id}`,
          source: depId,
          target: resource.id,
          animated: resource.status !== 'synced',
          style: {
            stroke: getStatusColor(resource.status as DriftStatus),
            strokeWidth: 2,
          },
        }))
      ),
    [resources]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const resource = resources.find((r) => r.id === node.id);
      onNodeSelect(resource || null);
    },
    [resources, onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="#888" gap={20} size={1} />
        <Controls className="!rounded-xl !border !border-border" />
        <MiniMap
          nodeColor={(node) => {
            const status = node.data?.status as DriftStatus;
            return getStatusColor(status);
          }}
          maskColor="rgba(0, 0, 0, 0.2)"
          className="!rounded-xl !border !border-border"
        />
      </ReactFlow>
    </div>
  );
}
