"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ProjectStatus, ProjectPhase } from ".prisma/client";

type PricingModel = "HOURLY" | "FIXED_PRICE" | "RETAINER" | "MILESTONE_BASED" | "TBD";

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  clientId: string;
  description: string | null;
  status: ProjectStatus;
  phase: ProjectPhase;
  startDate: string | null;
  targetLaunchDate: string | null;
  dueDate: string;
  pricingModel: PricingModel | null;
  weeklyCapacityHours: number | null;
  hourlyRateCents: number | null;
  fixedPriceCents: number | null;
  retainerAmountCents: number | null;
  retainerFrequency: string | null;
  pricingNotes: string | null;
  client: {
    id: string;
    name: string;
  };
}

interface InternalUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface ProjectMember {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    userType: string;
  };
}

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [internalUsers, setInternalUsers] = useState<InternalUser[]>([]);
  const [currentMembers, setCurrentMembers] = useState<ProjectMember[]>([]);
  const [selectedInternalUserIds, setSelectedInternalUserIds] = useState<string[]>([]);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [clientEmails, setClientEmails] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "PLANNING" as ProjectStatus,
    phase: "DISCOVERY" as ProjectPhase,
    startDate: "",
    targetLaunchDate: "",
    dueDate: "",
    pricingModel: "TBD" as PricingModel | "",
    weeklyCapacityHours: "",
    hourlyRateCents: "",
    fixedPriceCents: "",
    retainerAmountCents: "",
    retainerFrequency: "",
    pricingNotes: "",
  });

  useEffect(() => {
    fetchProject();
    fetchClients();
    fetchInternalUsers();
    fetchProjectMembers();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch project");
      }
      const data = await response.json();
      const proj = data.project;
      setProject(proj);
      setFormData({
        name: proj.name,
        description: proj.description || "",
        status: proj.status,
        phase: proj.phase,
        startDate: proj.startDate ? proj.startDate.split("T")[0] : "",
        targetLaunchDate: proj.targetLaunchDate ? proj.targetLaunchDate.split("T")[0] : "",
        dueDate: proj.dueDate ? proj.dueDate.split("T")[0] : "",
        pricingModel: proj.pricingModel || "TBD",
        weeklyCapacityHours: proj.weeklyCapacityHours?.toString() || "",
        hourlyRateCents: proj.hourlyRateCents?.toString() || "",
        fixedPriceCents: proj.fixedPriceCents?.toString() || "",
        retainerAmountCents: proj.retainerAmountCents?.toString() || "",
        retainerFrequency: proj.retainerFrequency || "",
        pricingNotes: proj.pricingNotes || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  };

  const fetchInternalUsers = async () => {
    try {
      const response = await fetch("/api/users?type=INTERNAL");
      if (response.ok) {
        const data = await response.json();
        setInternalUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch internal users:", err);
    }
  };

  const fetchProjectMembers = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`);
      if (response.ok) {
        const data = await response.json();
        setCurrentMembers(data.members || []);
        // Set selected internal user IDs from current members
        const internalMemberIds = (data.members || [])
          .filter((m: ProjectMember) => m.user.userType === "INTERNAL")
          .map((m: ProjectMember) => m.userId);
        setSelectedInternalUserIds(internalMemberIds);
      }
    } catch (err) {
      console.error("Failed to fetch project members:", err);
    }
  };

  const handleAddClientEmail = () => {
    if (newClientEmail.trim() && !clientEmails.includes(newClientEmail.trim())) {
      setClientEmails([...clientEmails, newClientEmail.trim()]);
      setNewClientEmail("");
    }
  };

  const handleRemoveClientEmail = (email: string) => {
    setClientEmails(clientEmails.filter((e) => e !== email));
  };

  const handleAddMembers = async () => {
    setAddingMembers(true);
    setError(null);

    try {
      // Add internal users
      const internalUsersToAdd = selectedInternalUserIds.filter(
        (id) => !currentMembers.some((m) => m.userId === id)
      );

      for (const userId of internalUsersToAdd) {
        const response = await fetch(`/api/projects/${projectId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to add user ${userId}`);
        }
      }

      // Invite client users
      for (const email of clientEmails) {
        const response = await fetch(`/api/projects/${projectId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, clientRole: "CLIENT_ADMIN" }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to invite ${email}`);
        }
      }

      // Refresh members list
      await fetchProjectMembers();
      setClientEmails([]);
      setNewClientEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add members");
    } finally {
      setAddingMembers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.dueDate) {
      setError("Please fill in all required fields");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          status: formData.status,
          phase: formData.phase,
          startDate: formData.startDate || null,
          targetLaunchDate: formData.targetLaunchDate || null,
          dueDate: formData.dueDate,
          pricingModel: formData.pricingModel || null,
          weeklyCapacityHours: formData.weeklyCapacityHours
            ? parseInt(formData.weeklyCapacityHours)
            : null,
          hourlyRateCents: formData.hourlyRateCents
            ? parseInt(formData.hourlyRateCents)
            : null,
          fixedPriceCents: formData.fixedPriceCents
            ? parseInt(formData.fixedPriceCents)
            : null,
          retainerAmountCents: formData.retainerAmountCents
            ? parseInt(formData.retainerAmountCents)
            : null,
          retainerFrequency: formData.retainerFrequency || null,
          pricingNotes: formData.pricingNotes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update project");
      }

      router.push(`/internal/projects/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-red-900 mb-2">Project Not Found</h1>
          <p className="text-sm text-red-700 mb-4">
            The project you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link
            href="/internal/projects"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/internal/projects/${projectId}`}
          className="text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← Back to Project
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Project</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Basic Information
            </h2>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Client</label>
              <div className="px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                {project?.client.name || "N/A"}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Client cannot be changed after project creation
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Project description..."
              />
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Project Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as ProjectStatus })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETE">Complete</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Phase</label>
                <select
                  value={formData.phase}
                  onChange={(e) =>
                    setFormData({ ...formData, phase: e.target.value as ProjectPhase })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DISCOVERY">Discovery</option>
                  <option value="DESIGN">Design</option>
                  <option value="BUILD">Build</option>
                  <option value="QA">QA</option>
                  <option value="LAUNCH">Launch</option>
                  <option value="SUPPORT">Support</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Target Launch Date
                </label>
                <input
                  type="date"
                  value={formData.targetLaunchDate}
                  onChange={(e) =>
                    setFormData({ ...formData, targetLaunchDate: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Pricing (Optional)
            </h2>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Pricing Model
              </label>
              <select
                value={formData.pricingModel}
                onChange={(e) =>
                  setFormData({ ...formData, pricingModel: e.target.value as PricingModel | "" })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="TBD">To Be Determined</option>
                <option value="HOURLY">Hourly Rate</option>
                <option value="FIXED_PRICE">Fixed Price</option>
                <option value="RETAINER">Retainer</option>
                <option value="MILESTONE_BASED">Milestone-Based</option>
              </select>
            </div>

            {/* Hourly Pricing Fields */}
            {formData.pricingModel === "HOURLY" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Hourly Rate (cents)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.hourlyRateCents}
                    onChange={(e) =>
                      setFormData({ ...formData, hourlyRateCents: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Weekly Capacity (hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.weeklyCapacityHours}
                    onChange={(e) =>
                      setFormData({ ...formData, weeklyCapacityHours: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="40"
                  />
                </div>
              </div>
            )}

            {/* Fixed Price Fields */}
            {formData.pricingModel === "FIXED_PRICE" && (
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Fixed Price (cents)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.fixedPriceCents}
                  onChange={(e) =>
                    setFormData({ ...formData, fixedPriceCents: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="100000"
                />
              </div>
            )}

            {/* Retainer Fields */}
            {formData.pricingModel === "RETAINER" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Retainer Amount (cents)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.retainerAmountCents}
                    onChange={(e) =>
                      setFormData({ ...formData, retainerAmountCents: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Frequency
                  </label>
                  <select
                    value={formData.retainerFrequency}
                    onChange={(e) =>
                      setFormData({ ...formData, retainerFrequency: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select frequency</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
            )}

            {/* Milestone-Based or TBD - Show Notes */}
            {/* Pricing Notes - Available for all models */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Pricing Notes <span className="text-xs font-normal text-slate-500">(Optional)</span>
              </label>
              <textarea
                value={formData.pricingNotes}
                onChange={(e) =>
                  setFormData({ ...formData, pricingNotes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={
                  formData.pricingModel === "MILESTONE_BASED"
                    ? "Describe milestone-based pricing structure..."
                    : formData.pricingModel === "TBD" || !formData.pricingModel
                    ? "Add pricing details or notes..."
                    : "Add additional pricing notes or clarifications..."
                }
              />
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              Team Members
            </h2>

            {/* Current Members */}
            {currentMembers.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Current Members
                </label>
                <div className="space-y-2">
                  {currentMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          {member.user.firstName && member.user.lastName
                            ? `${member.user.firstName} ${member.user.lastName}`
                            : member.user.email}
                        </div>
                        <div className="text-xs text-slate-500">{member.user.email}</div>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-white text-slate-600 border border-slate-200">
                        {member.user.userType === "INTERNAL" ? "Internal" : "Client"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Internal Team Members */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Add Internal Team Members
              </label>
              <div className="space-y-2">
                {internalUsers.map((user) => {
                  const isCurrentMember = currentMembers.some((m) => m.userId === user.id);
                  const isSelected = selectedInternalUserIds.includes(user.id);
                  
                  return (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isCurrentMember
                          ? "border-slate-200 bg-slate-50 opacity-60"
                          : "border-slate-200 hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isCurrentMember}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInternalUserIds([...selectedInternalUserIds, user.id]);
                          } else {
                            setSelectedInternalUserIds(selectedInternalUserIds.filter((id) => id !== user.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.email}
                        </div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                      {isCurrentMember && (
                        <span className="text-xs text-slate-500">Already a member</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Invite Client Users */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Invite Client Users
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddClientEmail();
                    }
                  }}
                  placeholder="client@example.com"
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddClientEmail}
                  disabled={!newClientEmail.trim()}
                  className="px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
              {clientEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {clientEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveClientEmail(email)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Client users will be invited via email. If they don't have an account, one will be
                created for them.
              </p>
            </div>

            {/* Add Members Button */}
            {(selectedInternalUserIds.some((id) => !currentMembers.some((m) => m.userId === id)) ||
              clientEmails.length > 0) && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddMembers}
                  disabled={addingMembers}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingMembers ? "Adding..." : "Add Selected Members"}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href={`/internal/projects/${projectId}`}
              className="px-5 py-2.5 text-slate-800 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

