import { getAccessibleProject } from "@/lib/project-access";
import { AccessDenied } from "@/components/editor/access-denied";
import { EditorWorkspaceClient } from "@/components/editor/editor-workspace-client";

interface Props {
  params: Promise<{ roomId: string }>;
}

export default async function EditorWorkspacePage({ params }: Props) {
  const { roomId } = await params;
  const project = await getAccessibleProject(roomId);
  if (!project) return <AccessDenied />;
  return <EditorWorkspaceClient project={project} />;
}
