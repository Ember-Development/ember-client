"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  userType: string;
  internalRole: string | null;
  clientRole: string | null;
  isActive: boolean;
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    clientName: string;
    clientId: string;
    membershipId: string;
  }>;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  notes: string | null;
  status: string | null;
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    phase: string;
    createdAt: string;
  }>;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  clientName: string;
  clientId: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "companies">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUserToProject, setAddingUserToProject] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, companiesRes, projectsRes] = await Promise.all([
        fetch("/api/settings/users"),
        fetch("/api/settings/companies"),
        fetch("/api/settings/projects"),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData.companies);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      alert("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromProject = async (userId: string, projectId: string) => {
    if (!confirm("Are you sure you want to remove this user from the project?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/settings/users/${userId}/projects?projectId=${projectId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to remove user from project");
      }
    } catch (error) {
      console.error("Failed to remove user from project:", error);
      alert("Failed to remove user from project");
    }
  };

  const handleAddToProject = async (userId: string) => {
    if (!selectedProjectId) {
      alert("Please select a project");
      return;
    }

    setAddingUserToProject(userId);
    try {
      const response = await fetch(`/api/settings/users/${userId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });

      if (response.ok) {
        setSelectedProjectId("");
        setAddingUserToProject(null);
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add user to project");
      }
    } catch (error) {
      console.error("Failed to add user to project:", error);
      alert("Failed to add user to project");
    } finally {
      setAddingUserToProject(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/users/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user");
    }
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage users, projects, and companies
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("users")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "users"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("companies")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "companies"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Companies
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Users</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage users and their project assignments
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                No users found
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {getUserDisplayName(user)}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          {user.userType}
                        </span>
                        {user.internalRole && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            {user.internalRole}
                          </span>
                        )}
                        {!user.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{user.email}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="px-3 py-1.5 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                      Delete User
                    </button>
                  </div>

                  {/* Projects List */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Projects ({user.projects.length})
                    </h4>
                    {user.projects.length === 0 ? (
                      <p className="text-sm text-slate-500">No projects assigned</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {user.projects.map((project) => (
                          <div
                            key={project.membershipId}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <span className="text-sm text-slate-700">
                              {project.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({project.clientName})
                            </span>
                            <button
                              onClick={() => handleRemoveFromProject(user.id, project.id)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              title="Remove from project"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add to Project */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a project to add...</option>
                      {projects
                        .filter((p) => !user.projects.some((up) => up.id === p.id))
                        .map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name} ({project.clientName})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => handleAddToProject(user.id)}
                      disabled={!selectedProjectId || addingUserToProject === user.id}
                      className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingUserToProject === user.id ? "Adding..." : "Add to Project"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Companies Tab */}
      {activeTab === "companies" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Companies</h2>
            <p className="mt-1 text-sm text-slate-500">
              View companies and their associated projects
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {companies.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                No companies found
              </div>
            ) : (
              companies.map((company) => (
                <div key={company.id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-900 mb-1">
                        {company.name}
                      </h3>
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {company.website}
                        </a>
                      )}
                      {company.notes && (
                        <p className="text-sm text-slate-600 mt-2">{company.notes}</p>
                      )}
                    </div>
                    {company.status && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                        {company.status}
                      </span>
                    )}
                  </div>

                  {/* Projects List */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Projects ({company.projects.length})
                    </h4>
                    {company.projects.length === 0 ? (
                      <p className="text-sm text-slate-500">No projects</p>
                    ) : (
                      <div className="space-y-2">
                        {company.projects.map((project) => (
                          <a
                            key={project.id}
                            href={`/internal/projects/${project.id}`}
                            className="block px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium text-slate-900">
                                  {project.name}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                    {project.status}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                    {project.phase}
                                  </span>
                                </div>
                              </div>
                              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

