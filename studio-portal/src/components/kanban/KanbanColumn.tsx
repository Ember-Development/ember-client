"use client";

import { useState } from "react";

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  status: "BACKLOG" | "PLANNED" | "IN_PROGRESS" | "QA" | "BLOCKED" | "DONE";
  priority: "LOW" | "MED" | "HIGH" | "URGENT";
  dueDate: Date | null;
  assigneeId: string | null;
  assignee: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  estimateDays: number | null;
  sprintId: string | null;
  sprint: {
    id: string;
    name: string;
  } | null;
  orderIndex: number;
}

interface ProjectMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface KanbanColumnProps {
  column: { id: string; title: string; color: string };
  items: Deliverable[];
  onMove: (id: string, status: string, orderIndex: number) => void;
  onEdit: (item: Deliverable) => void;
  onCreate: (title: string) => void;
  onUpdate: (id: string, updates: Partial<Deliverable>) => Promise<void>;
  projectMembers: ProjectMember[];
  sprints: Sprint[];
}

export function KanbanColumn({ column, items, onMove, onEdit, onCreate, onUpdate, projectMembers, sprints }: KanbanColumnProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [editingAssignee, setEditingAssignee] = useState<string | null>(null);
  const [editingEstimate, setEditingEstimate] = useState<string | null>(null);
  const [editingSprint, setEditingSprint] = useState<string | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-red-600";
      case "HIGH":
        return "text-orange-600";
      case "MED":
        return "text-amber-600";
      case "LOW":
        return "text-slate-600";
      default:
        return "text-slate-500";
    }
  };

  const getBgColor = () => {
    switch (column.color) {
      case "gray":
        return "bg-gray-50";
      case "slate":
        return "bg-slate-50";
      case "blue":
        return "bg-blue-50";
      case "purple":
        return "bg-purple-50";
      case "red":
        return "bg-red-50";
      case "emerald":
        return "bg-emerald-50";
      default:
        return "bg-slate-50";
    }
  };

  const getTextColor = () => {
    switch (column.color) {
      case "gray":
        return "text-gray-700";
      case "slate":
        return "text-slate-700";
      case "blue":
        return "text-blue-700";
      case "purple":
        return "text-purple-700";
      case "red":
        return "text-red-700";
      case "emerald":
        return "text-emerald-700";
      default:
        return "text-slate-700";
    }
  };

  const getBorderColor = () => {
    switch (column.color) {
      case "gray":
        return "border-gray-200";
      case "slate":
        return "border-slate-200";
      case "blue":
        return "border-blue-200";
      case "purple":
        return "border-purple-200";
      case "red":
        return "border-red-200";
      case "emerald":
        return "border-emerald-200";
      default:
        return "border-slate-200";
    }
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
    // Also set as application/json for better cross-browser support
    e.dataTransfer.setData("application/json", JSON.stringify({ id: itemId }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Get the item ID from dataTransfer (works across columns)
    let itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) {
      // Fallback to JSON format
      try {
        const data = e.dataTransfer.getData("application/json");
        if (data) {
          const parsed = JSON.parse(data);
          itemId = parsed.id;
        }
      } catch (err) {
        console.error("Failed to parse drag data:", err);
      }
    }
    
    if (!itemId) {
      console.warn("No item ID found in drag data");
      return;
    }

    const newOrderIndex = items.length;
    onMove(itemId, column.id, newOrderIndex);
    setDraggedItem(null);
  };

  const handleAddItemClick = () => {
    setIsAddingItem(true);
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemTitle.trim()) {
      onCreate(newItemTitle.trim());
      setNewItemTitle("");
      setIsAddingItem(false);
    }
  };

  const handleAddItemCancel = () => {
    setIsAddingItem(false);
    setNewItemTitle("");
  };

  const handleAddItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleAddItemCancel();
    }
  };

  return (
    <div
      className={`${getBgColor()} rounded-xl p-4 min-h-[600px] shrink-0 w-80`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${getTextColor()}`}>{column.title}</h3>
        <span className={`text-xs font-medium ${getTextColor()} bg-white px-2 py-1 rounded`}>
          {items.length}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onClick={() => onEdit(item)}
            className={`bg-white rounded-lg border ${getBorderColor()} p-3 shadow-sm hover:shadow-md transition-all cursor-pointer ${
              item.status === "DONE" ? "opacity-90" : ""
            }`}
          >
            <h4
              className={`text-sm font-semibold text-slate-900 mb-2 ${
                item.status === "DONE" ? "line-through" : ""
              }`}
            >
              {item.title}
            </h4>
            {item.description && (
              <p className="text-xs text-slate-600 line-clamp-2 mb-2">{item.description}</p>
            )}
            
            {/* Assignee */}
            <div 
              className="mb-2"
              onClick={(e) => e.stopPropagation()}
            >
              {editingAssignee === item.id ? (
                <select
                  autoFocus
                  value={item.assigneeId || ""}
                  onChange={async (e) => {
                    await onUpdate(item.id, { assigneeId: e.target.value || null });
                    setEditingAssignee(null);
                  }}
                  onBlur={() => setEditingAssignee(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingAssignee(null);
                  }}
                  className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Unassigned</option>
                  {projectMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName && member.lastName
                        ? `${member.firstName} ${member.lastName}`
                        : member.email}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingAssignee(item.id);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {item.assignee
                    ? item.assignee.firstName && item.assignee.lastName
                      ? `${item.assignee.firstName} ${item.assignee.lastName}`
                      : item.assignee.email
                    : "Assign"}
                </button>
              )}
            </div>

            {/* Estimate */}
            <div 
              className="mb-2"
              onClick={(e) => e.stopPropagation()}
            >
              {editingEstimate === item.id ? (
                <input
                  type="number"
                  autoFocus
                  value={item.estimateDays || ""}
                  onChange={async (e) => {
                    const value = e.target.value === "" ? null : parseInt(e.target.value);
                    await onUpdate(item.id, { estimateDays: value });
                    setEditingEstimate(null);
                  }}
                  onBlur={() => setEditingEstimate(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingEstimate(null);
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Days"
                  className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                  min="0"
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingEstimate(item.id);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {item.estimateDays ? `${item.estimateDays} day${item.estimateDays !== 1 ? "s" : ""}` : "Set estimate"}
                </button>
              )}
            </div>

            {/* Sprint Selector */}
            <div 
              className="mb-2"
              onClick={(e) => e.stopPropagation()}
            >
              {editingSprint === item.id ? (
                <select
                  autoFocus
                  value={item.sprintId || ""}
                  onChange={async (e) => {
                    await onUpdate(item.id, { sprintId: e.target.value || null });
                    setEditingSprint(null);
                  }}
                  onBlur={() => setEditingSprint(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingSprint(null);
                  }}
                  className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">No Sprint</option>
                  {sprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSprint(item.id);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {item.sprint ? item.sprint.name : "Set sprint"}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className={`font-medium ${getPriorityColor(item.priority)}`}>
                {item.priority}
              </span>
              {item.dueDate && (
                <span className="text-slate-500">
                  {new Date(item.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && !isAddingItem && (
          <div className={`text-center py-8 text-xs ${getTextColor()} opacity-50`}>
            No items
          </div>
        )}

        {/* Add Item Input */}
        {isAddingItem ? (
          <form onSubmit={handleAddItemSubmit} className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-3">
            <input
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={handleAddItemKeyDown}
              autoFocus
              placeholder="Enter deliverable title..."
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="submit"
                disabled={!newItemTitle.trim()}
                className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                type="button"
                onClick={handleAddItemCancel}
                className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={handleAddItemClick}
            className={`w-full py-2.5 px-3 text-sm font-medium ${getTextColor()} bg-white/50 hover:bg-white border border-dashed ${getBorderColor()} rounded-lg transition-colors flex items-center justify-center gap-2`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        )}
      </div>
    </div>
  );
}

