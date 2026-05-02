"use client";

import type { Project } from "@prisma/client";
import { EditorNavbar } from "@/components/editor/editor-navbar";

interface EditorWorkspaceClientProps {
  project: Project;
}

export function EditorWorkspaceClient({ project }: EditorWorkspaceClientProps) {
  return (
    <div className="flex flex-col h-screen bg-base">
      <EditorNavbar projectName={project.name} />
      <main className="flex-1" />
    </div>
  );
}
