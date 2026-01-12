import { requireProjectAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { UserType } from ".prisma/client";
import { DocumentEditorWrapper } from "@/components/documents/DocumentEditorWrapper";
import { redirect } from "next/navigation";

export default async function DocumentEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; documentId: string }>;
}) {
  const { projectId, documentId } = await params;
  const { user, project } = await requireProjectAccess(projectId);

  if (user.userType !== UserType.INTERNAL) {
    redirect(`/internal/projects/${projectId}`);
  }

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      projectId: project.id,
    },
  });

  if (!document) {
    redirect(`/internal/projects/${projectId}/documents`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a
            href={`/internal/projects/${projectId}/documents`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Back to Documents
          </a>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Edit Document
          </h1>
        </div>
      </div>

      <DocumentEditorWrapper
        document={{
          id: document.id,
          title: document.title,
          type: document.type,
          content: document.content,
          description: document.description,
          versionLabel: document.versionLabel,
          clientVisible: document.clientVisible,
        }}
        projectId={projectId}
        documentId={documentId}
      />
    </div>
  );
}

