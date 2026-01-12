"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Handle,
  Position,
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface ArchitectureEditorProps {
  content: string | null;
  onChange: (content: string) => void;
}

const createNodeComponent = (bgColor: string, borderColor: string, textColor: string) => {
  return ({ data, selected }: any) => {
    const [localValue, setLocalValue] = useState(data.label || "");

    useEffect(() => {
      setLocalValue(data.label || "");
    }, [data.label]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      data.onChange?.(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
      e.stopPropagation();
    };

    return (
      <div
        className={`px-4 py-3 ${bgColor} border-2 rounded-lg shadow-sm min-w-[120px] ${
          selected ? "border-blue-500" : borderColor
        }`}
      >
        <Handle type="target" position={Position.Top} style={{ background: "#6366f1" }} />
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={`w-full outline-none text-sm font-medium ${textColor} bg-transparent border-none`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        />
        <Handle type="source" position={Position.Bottom} style={{ background: "#6366f1" }} />
      </div>
    );
  };
};

const nodeTypes = {
  custom: createNodeComponent("bg-white", "border-slate-300", "text-slate-900"),
  database: createNodeComponent("bg-emerald-50", "border-emerald-300", "text-emerald-900"),
  service: createNodeComponent("bg-blue-50", "border-blue-300", "text-blue-900"),
  gateway: createNodeComponent("bg-purple-50", "border-purple-300", "text-purple-900"),
};

const createInitialNodes = (): Node[] => [
  {
    id: "1",
    type: "gateway",
    position: { x: 250, y: 100 },
    data: { label: "API Gateway", onChange: () => {} },
  },
  {
    id: "2",
    type: "service",
    position: { x: 100, y: 200 },
    data: { label: "Service 1", onChange: () => {} },
  },
  {
    id: "3",
    type: "database",
    position: { x: 400, y: 200 },
    data: { label: "Database", onChange: () => {} },
  },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e1-3", source: "1", target: "3" },
];

export function ArchitectureEditor({ content, onChange }: ArchitectureEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const nodeIdRef = useRef(4);
  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved diagram only once on mount
  useEffect(() => {
    if (content && isInitialLoad.current) {
      try {
        const saved = JSON.parse(content);
        if (saved.nodes && saved.edges && Array.isArray(saved.nodes) && Array.isArray(saved.edges)) {
          // Update onChange handlers for loaded nodes
          const loadedNodes = saved.nodes.map((node: Node) => ({
            ...node,
            data: {
              ...node.data,
              onChange: (newLabel: string) => {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n
                  )
                );
              },
            },
          }));
          setNodes(loadedNodes);
          setEdges(saved.edges);
          const maxId = Math.max(
            ...saved.nodes.map((n: Node) => {
              const idNum = parseInt(n.id);
              return isNaN(idNum) ? 0 : idNum;
            }),
            0
          );
          nodeIdRef.current = maxId + 1;
        }
      } catch (e) {
        // Invalid JSON, use defaults
      }
      isInitialLoad.current = false;
    }
  }, [content, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const addNode = (type: string, label: string) => {
    const newNodeId = nodeIdRef.current.toString();
    const newNode: Node = {
      id: newNodeId,
      type,
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        label,
        onChange: (newLabel: string) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNodeId
                ? { ...node, data: { ...node.data, label: newLabel } }
                : node
            )
          );
        },
      },
    };
    setNodes((nds) => [...nds, newNode]);
    nodeIdRef.current++;
  };

  const deleteSelectedNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)
      );
      setSelectedNode(null);
    }
  };

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const onPaneClick = () => {
    setSelectedNode(null);
  };

  // Save diagram whenever nodes or edges change (debounced)
  useEffect(() => {
    if (isInitialLoad.current) return; // Don't save during initial load
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save to prevent too frequent updates
    saveTimeoutRef.current = setTimeout(() => {
      const diagramData = JSON.stringify({ nodes, edges });
      onChange(diagramData);
    }, 500); // Wait 500ms after last change

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, onChange]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (typeof window !== "undefined" && window.document.documentElement.requestFullscreen) {
        window.document.documentElement.requestFullscreen();
      }
    } else {
      setIsFullscreen(false);
      if (typeof window !== "undefined" && window.document.exitFullscreen) {
        window.document.exitFullscreen();
      }
    }
  };

  return (
    <div className={`flex flex-col ${isFullscreen ? "fixed inset-0 z-50" : "h-full"} bg-slate-50`}>
      {/* Toolbar */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => addNode("custom", "Component")}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded hover:bg-slate-50"
          >
            + Component
          </button>
          <button
            onClick={() => addNode("service", "Service")}
            className="px-3 py-1.5 text-xs font-medium bg-blue-50 border border-blue-300 rounded hover:bg-blue-100 text-blue-700"
          >
            + Service
          </button>
          <button
            onClick={() => addNode("database", "Database")}
            className="px-3 py-1.5 text-xs font-medium bg-emerald-50 border border-emerald-300 rounded hover:bg-emerald-100 text-emerald-700"
          >
            + Database
          </button>
          <button
            onClick={() => addNode("gateway", "Gateway")}
            className="px-3 py-1.5 text-xs font-medium bg-purple-50 border border-purple-300 rounded hover:bg-purple-100 text-purple-700"
          >
            + Gateway
          </button>
        </div>
        <div className="flex-1" />
        {selectedNode && (
          <button
            onClick={deleteSelectedNode}
            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <TrashIcon className="h-4 w-4" />
            Delete Selected
          </button>
        )}
        <button
          onClick={toggleFullscreen}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded"
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>

      {/* Diagram Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          connectionLineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
          defaultEdgeOptions={{ style: { stroke: "#6366f1", strokeWidth: 2 } }}
          connectOnClick={false}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
        >
          <Background />
          <Controls />
          <MiniMap />
          <Panel position="top-right" className="bg-white/80 backdrop-blur-sm rounded-lg p-2 text-xs text-slate-600">
            Click and drag to move nodes • Click nodes to edit text • Drag from node handles to connect
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
