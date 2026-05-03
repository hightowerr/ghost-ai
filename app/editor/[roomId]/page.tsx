import { getAccessibleProject, getCurrentProjectIdentity } from "@/lib/project-access";
import { AccessDenied } from "@/components/editor/access-denied";
import { EditorWorkspaceClient } from "@/components/editor/editor-workspace-client";

interface Props {
  params: Promise<{ roomId: string }>;
}

export default async function EditorWorkspacePage({ params }: Props) {
  const { roomId } = await params;

  const [project, identity] = await Promise.all([
    getAccessibleProject(roomId),
    getCurrentProjectIdentity().catch(() => null),
  ]);

  if (!project) return <AccessDenied />;

  const isOwner = identity ? project.ownerId === identity.userId : false;

  return <EditorWorkspaceClient project={project} isOwner={isOwner} />;
}
