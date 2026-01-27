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

interface DatabaseERDEditorProps {
  content: string | null;
  onChange: (content: string) => void;
}

// ERD Entity Node Component (represents a database table)
const EntityNode = ({ data, selected }: any) => {
  const [tableName, setTableName] = useState(data.tableName || "Table");
  const [attributes, setAttributes] = useState<string[]>(data.attributes || ["id", "created_at"]);

  useEffect(() => {
    setTableName(data.tableName || "Table");
    setAttributes(data.attributes || ["id", "created_at"]);
  }, [data.tableName, data.attributes]);

  const handleTableNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setTableName(newName);
    data.onTableNameChange?.(newName);
  };

  const handleAttributeChange = (index: number, value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index] = value;
    setAttributes(newAttributes);
    data.onAttributesChange?.(newAttributes);
  };

  const addAttribute = () => {
    const newAttributes = [...attributes, "new_field"];
    setAttributes(newAttributes);
    data.onAttributesChange?.(newAttributes);
  };

  const removeAttribute = (index: number) => {
    const newAttributes = attributes.filter((_, i) => i !== index);
    setAttributes(newAttributes);
    data.onAttributesChange?.(newAttributes);
  };

  return (
    <div
      className={`bg-white border-2 rounded-lg shadow-lg min-w-[200px] ${
        selected ? "border-blue-500" : "border-slate-400"
      }`}
    >
      {/* Table Header */}
      <div className="bg-slate-700 text-white px-3 py-2 rounded-t-md">
        <input
          type="text"
          value={tableName}
          onChange={handleTableNameChange}
          onKeyDown={(e) => e.stopPropagation()}
          className="bg-transparent border-none text-white font-semibold text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-300 rounded"
          placeholder="Table Name"
        />
      </div>
      
      {/* Attributes */}
      <div className="divide-y divide-slate-200">
        {attributes.map((attr, index) => (
          <div key={index} className="px-3 py-1.5 flex items-center gap-2 group hover:bg-slate-50">
            <input
              type="text"
              value={attr}
              onChange={(e) => handleAttributeChange(index, e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="flex-1 text-xs bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-300 rounded text-slate-700"
              placeholder="field_name"
            />
            <button
              onClick={() => removeAttribute(index)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
              title="Remove attribute"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={addAttribute}
          className="w-full px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center gap-1 transition-colors"
        >
          <PlusIcon className="h-3 w-3" />
          Add Field
        </button>
      </div>

      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400" />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-400" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-400" />
    </div>
  );
};

const nodeTypes = {
  entity: EntityNode,
};

const createInitialNodes = (): Node[] => [
  {
    id: "1",
    type: "entity",
    position: { x: 100, y: 100 },
    data: {
      tableName: "users",
      attributes: ["id", "email", "name", "created_at"],
      onTableNameChange: () => {},
      onAttributesChange: () => {},
    },
  },
  {
    id: "2",
    type: "entity",
    position: { x: 400, y: 100 },
    data: {
      tableName: "posts",
      attributes: ["id", "user_id", "title", "content", "created_at"],
      onTableNameChange: () => {},
      onAttributesChange: () => {},
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    label: "1:N",
    labelStyle: { fill: "#374151", fontWeight: 600 },
    style: { stroke: "#64748b", strokeWidth: 2 },
        markerEnd: {
          type: "arrowclosed" as any,
          color: "#64748b",
        },
  },
];

export function DatabaseERDEditor({ content, onChange }: DatabaseERDEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const nodeIdRef = useRef(3);
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
              onTableNameChange: (newName: string) => {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id ? { ...n, data: { ...n.data, tableName: newName } } : n
                  )
                );
              },
              onAttributesChange: (newAttributes: string[]) => {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id ? { ...n, data: { ...n.data, attributes: newAttributes } } : n
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

  // Save diagram to content
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (!isInitialLoad.current) {
      saveTimeoutRef.current = setTimeout(() => {
        const diagramData = {
          nodes: nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: {
              tableName: node.data.tableName,
              attributes: node.data.attributes,
            },
          })),
          edges,
        };
        onChange(JSON.stringify(diagramData, null, 2));
      }, 500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, onChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        label: "1:N",
        labelStyle: { fill: "#374151", fontWeight: 600 },
        style: { stroke: "#64748b", strokeWidth: 2 },
        markerEnd: {
          type: "arrowclosed" as any,
          color: "#64748b",
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const addEntity = () => {
    const newNodeId = nodeIdRef.current.toString();
    const newNode: Node = {
      id: newNodeId,
      type: "entity",
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        tableName: `table_${newNodeId}`,
        attributes: ["id", "created_at"],
        onTableNameChange: (newName: string) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNodeId
                ? { ...node, data: { ...node.data, tableName: newName } }
                : node
            )
          );
        },
        onAttributesChange: (newAttributes: string[]) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNodeId
                ? { ...node, data: { ...node.data, attributes: newAttributes } }
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

  return (
    <div className="w-full h-full bg-slate-100">
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
        className="bg-slate-50"
      >
        <Background color="#cbd5e1" gap={16} />
        <Controls className="bg-white border border-slate-300 rounded-lg shadow-sm" />
        <MiniMap
          className="bg-white border border-slate-300 rounded-lg shadow-sm"
          nodeColor="#64748b"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Panel position="top-left" className="bg-white border border-slate-300 rounded-lg shadow-sm p-2">
          <div className="flex items-center gap-2">
            <button
              onClick={addEntity}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1"
            >
              <PlusIcon className="h-4 w-4" />
              Add Table
            </button>
            {selectedNode && (
              <button
                onClick={deleteSelectedNode}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors flex items-center gap-1"
              >
                <TrashIcon className="h-4 w-4" />
                Delete Table
              </button>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

