import { renderDocumentTemplate } from "./templates";

export interface ProjectData {
  name: string;
  client: {
    name: string;
  };
  startDate?: Date | null;
  targetLaunchDate?: Date | null;
  description?: string | null;
  phase?: string;
  status?: string;
}

export function generateDocumentFromTemplate(
  templateId: string,
  projectData: ProjectData
): string {
  const context = {
    projectName: projectData.name,
    clientName: projectData.client.name,
    startDate: projectData.startDate
      ? new Date(projectData.startDate).toLocaleDateString()
      : undefined,
    targetLaunchDate: projectData.targetLaunchDate
      ? new Date(projectData.targetLaunchDate).toLocaleDateString()
      : undefined,
    description: projectData.description || undefined,
    phase: projectData.phase || undefined,
    status: projectData.status || undefined,
  };

  return renderDocumentTemplate(templateId, context);
}

