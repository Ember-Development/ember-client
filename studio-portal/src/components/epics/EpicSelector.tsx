"use client";

interface Epic {
  id: string;
  title: string;
  status: string;
}

interface EpicSelectorProps {
  epics: Epic[];
  selectedEpicId: string | null;
  onChange: (epicId: string | null) => void;
  className?: string;
}

export function EpicSelector({
  epics,
  selectedEpicId,
  onChange,
  className = "",
}: EpicSelectorProps) {
  return (
    <select
      value={selectedEpicId || ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={className}
    >
      <option value="">No Epic</option>
      {epics.map((epic) => (
        <option key={epic.id} value={epic.id}>
          {epic.title}
        </option>
      ))}
    </select>
  );
}

