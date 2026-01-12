"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectStatus, ProjectPhase, PricingModel } from ".prisma/client";

interface Client {
  id: string;
  name: string;
}

interface InternalUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [internalUsers, setInternalUsers] = useState<InternalUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    clientId: "",
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
    clientEmails: [] as string[],
    internalUserIds: [] as string[],
  });

  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchInternalUsers();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoadingData(false);
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

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      setError("Client name is required");
      return;
    }

    setCreatingClient(true);
    setError(null);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName,
          website: null,
          notes: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create client");
      }

      const newClient = await response.json();
      setClients([...clients, newClient]);
      setFormData({ ...formData, clientId: newClient.id });
      setNewClientName("");
      setShowCreateClient(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setCreatingClient(false);
    }
  };

  const handleAddClientEmail = () => {
    if (newClientEmail.trim() && !formData.clientEmails.includes(newClientEmail.trim())) {
      setFormData({
        ...formData,
        clientEmails: [...formData.clientEmails, newClientEmail.trim()],
      });
      setNewClientEmail("");
    }
  };

  const handleRemoveClientEmail = (email: string) => {
    setFormData({
      ...formData,
      clientEmails: formData.clientEmails.filter((e) => e !== email),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.clientId || !formData.dueDate) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          clientId: formData.clientId,
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
          clientEmails: formData.clientEmails.length > 0 ? formData.clientEmails : undefined,
          internalUserIds:
            formData.internalUserIds.length > 0 ? formData.internalUserIds : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      const data = await response.json();
      router.push(`/internal/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/internal/projects"
          className="text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← Back to Projects
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Create New Project</h1>

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
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Client <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCreateClient(!showCreateClient)}
                  className="px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  {showCreateClient ? "Cancel" : "+ New Client"}
                </button>
              </div>

              {showCreateClient && (
                <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Client Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="ACME Corp"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateClient}
                      disabled={creatingClient || !newClientName.trim()}
                      className="w-full px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {creatingClient ? "Creating..." : "Create Client"}
                    </button>
                  </div>
                </div>
              )}
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

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Internal Team Members
              </label>
              <div className="space-y-2">
                {internalUsers.map((user) => (
                  <label key={user.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.internalUserIds.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            internalUserIds: [...formData.internalUserIds, user.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            internalUserIds: formData.internalUserIds.filter((id) => id !== user.id),
                          });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.email}
                      </div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

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
              {formData.clientEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.clientEmails.map((email) => (
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
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
            <Link
              href="/internal/projects"
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

