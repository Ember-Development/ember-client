"use client";

import { useState, useEffect, useRef } from "react";
import { SprintSelector } from "@/components/sprints/SprintSelector";
import { CommentSection } from "./CommentSection";

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  status: "BACKLOG" | "PLANNED" | "IN_PROGRESS" | "QA" | "BLOCKED" | "DONE";
  priority: "LOW" | "MED" | "HIGH" | "URGENT";
  dueDate: Date | null;
  assigneeId: string | null;
  estimateDays: number | null;
  sprintId: string | null;
}

interface Attachment {
  id: string;
  fileName: string;
  fileMimeType: string | null;
  fileSizeBytes: number | null;
  externalUrl: string | null;
  storageKey: string | null;
  createdAt: string;
}

interface DeliverableTask {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
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

interface DeliverableModalProps {
  deliverable: Deliverable | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Deliverable>) => void;
  onDelete?: () => void;
  projectMembers: ProjectMember[];
  sprints: Sprint[];
  projectId: string;
  highlightCommentId?: string | null;
  isReadOnly?: boolean; // For client users - view only except comments
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "BACKLOG": return "bg-gray-100 text-gray-700";
    case "PLANNED": return "bg-slate-100 text-slate-700";
    case "IN_PROGRESS": return "bg-blue-100 text-blue-700";
    case "QA": return "bg-purple-100 text-purple-700";
    case "BLOCKED": return "bg-red-100 text-red-700";
    case "DONE": return "bg-emerald-100 text-emerald-700";
    default: return "bg-slate-100 text-slate-700";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "URGENT": return "text-red-600";
    case "HIGH": return "text-orange-600";
    case "MED": return "text-amber-600";
    case "LOW": return "text-slate-600";
    default: return "text-slate-500";
  }
};

export function DeliverableModal({
  deliverable,
  isOpen,
  onClose,
  onSave,
  onDelete,
  projectMembers,
  sprints,
  projectId,
  highlightCommentId,
  isReadOnly = false,
}: DeliverableModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Deliverable["status"]>("BACKLOG");
  const [priority, setPriority] = useState<Deliverable["priority"]>("MED");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [estimateDays, setEstimateDays] = useState<string>("");
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<DeliverableTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    if (deliverable) {
      setTitle(deliverable.title);
      setDescription(deliverable.description || "");
      setStatus(deliverable.status);
      setPriority(deliverable.priority);
      setDueDate(deliverable.dueDate ? new Date(deliverable.dueDate).toISOString().split("T")[0] : "");
      setAssigneeId(deliverable.assigneeId);
      setEstimateDays(deliverable.estimateDays?.toString() || "");
      setSprintId(deliverable.sprintId);
      fetchAttachments();
      fetchTasks();
    } else {
      resetForm();
    }
  }, [deliverable, isOpen]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("BACKLOG");
    setPriority("MED");
    setDueDate("");
    setAssigneeId(null);
    setEstimateDays("");
    setSprintId(null);
    setAttachments([]);
    setTasks([]);
    setNewTaskTitle("");
  };

  const fetchAttachments = async () => {
    if (!deliverable) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${deliverable.id}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error("Failed to fetch attachments:", error);
    }
  };

  const fetchTasks = async () => {
    if (!deliverable) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${deliverable.id}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !deliverable) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${deliverable.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTasks([...tasks, data.task]);
        setNewTaskTitle("");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create task");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      alert("Failed to create task");
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    if (!deliverable) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${deliverable.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTasks(tasks.map(t => t.id === taskId ? data.task : t));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update task");
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
      alert("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!deliverable) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${deliverable.id}/tasks/${taskId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== taskId));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete task");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Failed to delete task");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !deliverable) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`/api/projects/${projectId}/deliverables/${deliverable.id}/attachments`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setAttachments((prev) => [...prev, data.attachment]);
        }
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!deliverable) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${deliverable.id}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      }
    } catch (error) {
      console.error("Failed to delete attachment:", error);
    }
  };

  const handleSave = () => {
    onSave({
      title,
      description: description || null,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId: assigneeId || null,
      estimateDays: estimateDays ? parseInt(estimateDays) : null,
      sprintId: sprintId || null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-300 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-slate-900">
              {isReadOnly ? "View Deliverable" : deliverable ? "Edit Deliverable" : "Create Deliverable"}
            </h2>
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-2">
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              {isReadOnly ? (
                <h3 className="text-2xl font-semibold text-slate-900">{title || "Untitled"}</h3>
              ) : (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Deliverable title"
                  className="w-full text-2xl font-semibold text-slate-900 border-none focus:outline-none focus:ring-0 p-0 placeholder:text-slate-500 bg-transparent"
                />
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-slate-300">
              {isReadOnly ? (
                <>
                  {/* Status - Read Only */}
                  <div className={`px-3 py-1.5 text-sm font-semibold rounded ${getStatusColor(status)}`}>
                    {status.replace(/_/g, " ")}
                  </div>
                  {/* Priority - Read Only */}
                  <div className={`px-3 py-1.5 text-sm font-medium rounded border border-slate-300 bg-white ${getPriorityColor(priority)}`}>
                    {priority}
                  </div>
                  {/* Assignee - Read Only */}
                  {assigneeId && (() => {
                    const assignee = projectMembers.find((m) => m.id === assigneeId);
                    return assignee ? (
                      <div className="px-3 py-1.5 text-sm font-medium text-slate-900 rounded border border-slate-300 bg-white">
                        {assignee.firstName && assignee.lastName
                          ? `${assignee.firstName} ${assignee.lastName}`
                          : assignee.email}
                      </div>
                    ) : null;
                  })()}
                  {/* Sprint - Read Only */}
                  {sprintId && (() => {
                    const sprint = sprints.find((s) => s.id === sprintId);
                    return sprint ? (
                      <div className="px-3 py-1.5 text-sm font-medium text-blue-600 rounded border border-blue-200 bg-blue-50">
                        {sprint.name}
                      </div>
                    ) : null;
                  })()}
                  {/* Due Date - Read Only */}
                  {dueDate && (
                    <div className="px-3 py-1.5 text-sm font-medium text-slate-900 rounded border border-slate-300 bg-white">
                      Due: {new Date(dueDate).toLocaleDateString()}
                    </div>
                  )}
                  {/* Estimate - Read Only */}
                  {estimateDays && (
                    <div className="px-3 py-1.5 text-sm font-medium text-slate-900 rounded border border-slate-300 bg-white">
                      {estimateDays} days
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Status */}
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Deliverable["status"])}
                      className={`px-3 py-1.5 text-sm font-semibold rounded border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${getStatusColor(status)}`}
                    >
                      <option value="BACKLOG" className="bg-white text-gray-700">Backlog</option>
                      <option value="PLANNED" className="bg-white text-slate-700">Planned</option>
                      <option value="IN_PROGRESS" className="bg-white text-blue-700">In Progress</option>
                      <option value="QA" className="bg-white text-purple-700">QA</option>
                      <option value="BLOCKED" className="bg-white text-red-700">Blocked</option>
                      <option value="DONE" className="bg-white text-emerald-700">Done</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="relative">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Deliverable["priority"])}
                      className="px-3 py-1.5 text-sm font-medium text-slate-900 rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="LOW" className="text-slate-600">Low</option>
                      <option value="MED" className="text-amber-600">Medium</option>
                      <option value="HIGH" className="text-orange-600">High</option>
                      <option value="URGENT" className="text-red-600">Urgent</option>
                    </select>
                  </div>

                  {/* Assignee */}
                  <div className="relative">
                    <select
                      value={assigneeId || ""}
                      onChange={(e) => setAssigneeId(e.target.value || null)}
                      className="px-3 py-1.5 text-sm font-medium text-slate-900 rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="" className="text-slate-500">Unassigned</option>
                      {projectMembers.map((member) => (
                        <option key={member.id} value={member.id} className="text-slate-900">
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sprint */}
                  <div className="relative">
                    <SprintSelector
                      selectedSprintId={sprintId}
                      sprints={sprints}
                      onChange={setSprintId}
                      className="px-3 py-1.5 text-sm font-medium text-slate-900 rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Due Date */}
                  <div className="relative">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="px-3 py-1.5 text-sm font-medium text-slate-900 rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Due date"
                    />
                  </div>

                  {/* Estimate */}
                  <div className="relative">
                    <input
                      type="number"
                      value={estimateDays}
                      onChange={(e) => setEstimateDays(e.target.value)}
                      placeholder="Estimate (days)"
                      min="0"
                      className="px-3 py-1.5 text-sm font-medium text-slate-900 rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32 placeholder:text-slate-400"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Description
              </label>
              {isReadOnly ? (
                <div className="w-full px-4 py-3 text-sm text-slate-900 rounded-lg border border-slate-200 bg-slate-50 min-h-[120px] whitespace-pre-wrap">
                  {description || <span className="text-slate-400 italic">No description</span>}
                </div>
              ) : (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 text-sm text-slate-900 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder:text-slate-400"
                  placeholder="Add a description..."
                />
              )}
            </div>

            {/* Tasks */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Tasks
              </label>
              {!isReadOnly && deliverable && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleCreateTask()}
                    placeholder="Add a task..."
                    className="flex-1 px-3 py-2 text-sm text-slate-900 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
                  />
                  <button
                    onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              )}
              {tasks.length === 0 ? (
                <p className="text-sm font-medium text-slate-600 italic">
                  No tasks yet. {!isReadOnly && deliverable && "Add a task above to get started."}
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => !isReadOnly && handleToggleTask(task.id, task.completed)}
                        disabled={isReadOnly}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span
                        className={`flex-1 text-sm ${
                          task.completed
                            ? "line-through text-slate-500"
                            : "text-slate-900"
                        }`}
                      >
                        {task.title}
                      </span>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          title="Delete task"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-slate-900">
                  Attachments
                </label>
                {deliverable && !isReadOnly && (
                  <label className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer transition-colors">
                    {uploading ? "Uploading..." : "Upload"}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((attachment) => {
                    // Check if attachment has a file (old attachments won't have externalUrl or storageKey)
                    const hasFile = attachment.externalUrl || attachment.storageKey;
                    
                    return (
                      <div
                        key={attachment.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          hasFile 
                            ? "bg-slate-50 border-slate-300" 
                            : "bg-amber-50 border-amber-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <svg 
                            className={`w-5 h-5 shrink-0 ${
                              hasFile ? "text-slate-600" : "text-amber-600"
                            }`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            {hasFile ? (
                              <>
                                <a
                                  href={`/api/projects/${projectId}/deliverables/${deliverable?.id ?? ""}/attachments/${attachment.id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-semibold text-slate-900 hover:text-blue-600 truncate block"
                                >
                                  {attachment.fileName}
                                </a>
                                {attachment.fileSizeBytes && (
                                  <p className="text-xs font-medium text-slate-600">
                                    {(attachment.fileSizeBytes / 1024).toFixed(1)} KB
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-semibold text-amber-900 truncate">
                                  {attachment.fileName}
                                </p>
                                <p className="text-xs font-medium text-amber-700 mt-1">
                                  This attachment was uploaded before file storage was enabled. Please delete and re-upload the file.
                                </p>
                                {attachment.fileSizeBytes && (
                                  <p className="text-xs font-medium text-amber-600 mt-0.5">
                                    {(attachment.fileSizeBytes / 1024).toFixed(1)} KB
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            className={`transition-colors ml-2 p-1 ${
                              hasFile 
                                ? "text-slate-500 hover:text-red-600" 
                                : "text-amber-600 hover:text-red-600"
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-600 italic">
                  {deliverable ? "No attachments yet. Click 'Upload' to add files." : "Save the deliverable first to add attachments."}
                </p>
              )}
            </div>

            {/* Comments */}
            {deliverable && (
              <div className="border-t border-slate-300 pt-6">
                <CommentSection
                  deliverableId={deliverable.id}
                  projectId={projectId}
                  highlightCommentId={highlightCommentId}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
