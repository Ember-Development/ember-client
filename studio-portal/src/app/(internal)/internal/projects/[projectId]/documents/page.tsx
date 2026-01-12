import { requireProjectAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { UserType } from ".prisma/client";
import { DocumentList } from "@/components/documents/DocumentList";
import { TemplateSelector } from "@/components/documents/TemplateSelector";
import { CreateDocumentButton } from "@/components/documents/CreateDocumentButton";

export default async function DocumentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, project } = await requireProjectAccess(projectId);

  if (user.userType !== UserType.INTERNAL) return null;

  const documents = await prisma.document.findMany({
    where: { projectId: project.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Documents</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage project documentation and deliverables
          </p>
        </div>
        <CreateDocumentButton projectId={project.id} />
      </div>

      {/* Document List */}
      <DocumentList documents={documents} projectId={project.id} />
    </div>
  );
}

