'use client';

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
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
  ReactFlowInstance,
  useReactFlow,
  Panel,
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

function GraphControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel position="top-right" className="flex gap-2">
      <button
        onClick={() => zoomIn({ duration: 200 })}
        className="p-2 bg-background border rounded-lg hover:bg-accent transition-colors"
        title="Zoom In"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      </button>
      <button
        onClick={() => zoomOut({ duration: 200 })}
        className="p-2 bg-background border rounded-lg hover:bg-accent transition-colors"
        title="Zoom Out"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M8 11h6" />
        </svg>
      </button>
      <button
        onClick={() => fitView({ duration: 200, padding: 0.2 })}
        className="p-2 bg-background border rounded-lg hover:bg-accent transition-colors"
        title="Fit View"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </svg>
      </button>
    </Panel>
  );
}

export function InfrastructureGraph({ resources, onNodeSelect }: InfrastructureGraphProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

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
        draggable: true,
        selectable: true,
        focusable: true,
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
          type: 'smoothstep',
        }))
      ),
    [resources]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const resource = resources.find((r) => r.id === node.id);
      if (resource) {
        onNodeSelect(resource);
      }
    },
    [resources, onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  const handleReset = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    reactFlowInstance?.fitView({ duration: 200, padding: 0.2 });
  }, [initialNodes, initialEdges, setNodes, setEdges, reactFlowInstance]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).GraphReset = handleReset;
    }
  }, [handleReset]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        nodesDraggable
        nodesConnectable={false}
        preventScrolling
        snapToGrid
        snapGrid={[20, 20]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <GraphControls />
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
