"use client";

import { useState } from "react";
import { ProjectPhase } from ".prisma/client";

interface PhaseSelectorProps {
  projectId: string;
  currentPhase: ProjectPhase;
  onUpdate?: (phase: ProjectPhase) => void;
}

const phaseLabels: Record<ProjectPhase, string> = {
  DISCOVERY: "Discovery",
  DESIGN: "Design",
  BUILD: "Build",
  QA: "QA",
  LAUNCH: "Launch",
  SUPPORT: "Support",
};

export function PhaseSelector({ projectId, currentPhase, onUpdate }: PhaseSelectorProps) {
  const [phase, setPhase] = useState<ProjectPhase>(currentPhase);
  const [loading, setLoading] = useState(false);

  const handleChange = async (newPhase: ProjectPhase) => {
    if (newPhase === phase) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: newPhase }),
      });

      if (response.ok) {
        setPhase(newPhase);
        onUpdate?.(newPhase);
      } else {
        const error = await response.json();
        console.error("Failed to update phase:", error);
        // Revert on error
        setPhase(phase);
      }
    } catch (error) {
      console.error("Error updating phase:", error);
      // Revert on error
      setPhase(phase);
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={phase}
      onChange={(e) => handleChange(e.target.value as ProjectPhase)}
      disabled={loading}
      className="ml-2 px-3 py-1 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {Object.entries(phaseLabels).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

