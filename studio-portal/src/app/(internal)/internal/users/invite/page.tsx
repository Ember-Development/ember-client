"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserType, InternalRole, ClientRole } from ".prisma/client";

export default function InviteUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    userType: "INTERNAL" as UserType,
    internalRole: "MEMBER" as InternalRole,
    clientRole: "CLIENT_ADMIN" as ClientRole,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }

    if (formData.userType === "INTERNAL" && !formData.internalRole) {
      setError("Internal role is required for internal users");
      return;
    }

    if (formData.userType === "CLIENT" && !formData.clientRole) {
      setError("Client role is required for client users");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          firstName: formData.firstName.trim() || null,
          lastName: formData.lastName.trim() || null,
          userType: formData.userType,
          internalRole: formData.userType === "INTERNAL" ? formData.internalRole : null,
          clientRole: formData.userType === "CLIENT" ? formData.clientRole : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to invite user");
      }

      setSuccess(`Invitation sent to ${formData.email}`);
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        userType: "INTERNAL",
        internalRole: "MEMBER",
        clientRole: "CLIENT_ADMIN",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/internal"
          className="text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Invite User</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              User Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.userType}
              onChange={(e) => {
                const newType = e.target.value as UserType;
                setFormData({
                  ...formData,
                  userType: newType,
                  internalRole: newType === "INTERNAL" ? "MEMBER" : formData.internalRole,
                  clientRole: newType === "CLIENT" ? "CLIENT_ADMIN" : formData.clientRole,
                });
              }}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="INTERNAL">Internal User</option>
              <option value="CLIENT">Client User</option>
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="user@example.com"
              required
            />
          </div>

          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Role */}
          {formData.userType === "INTERNAL" && (
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Internal Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.internalRole}
                onChange={(e) =>
                  setFormData({ ...formData, internalRole: e.target.value as InternalRole })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
          )}

          {formData.userType === "CLIENT" && (
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Client Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.clientRole}
                onChange={(e) =>
                  setFormData({ ...formData, clientRole: e.target.value as ClientRole })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="CLIENT_ADMIN">Client Admin</option>
                <option value="CLIENT_VIEWER">Client Viewer</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? "Sending Invitation..." : "Send Invitation"}
            </button>
            <Link
              href="/internal"
              className="px-5 py-2.5 text-slate-800 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> An invitation email with a magic link will be sent to the user.
            They can use this link to sign in and set up their account.
          </p>
        </div>
      </div>
    </div>
  );
}

