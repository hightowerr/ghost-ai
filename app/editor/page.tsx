import { getCurrentProjectIdentity } from "@/lib/project-access";
import { getProjectsForUser } from "@/lib/projects";
import { EditorHomeClient } from "@/components/editor/editor-home-client";

export default async function EditorPage() {
  const identity = await getCurrentProjectIdentity();
  const { owned, shared } = await getProjectsForUser(identity.userId, identity.email);
  return <EditorHomeClient owned={owned} shared={shared} />;
}
