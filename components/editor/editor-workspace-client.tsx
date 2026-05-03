"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@prisma/client";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { useProjectActions } from "@/hooks/use-project-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditorWorkspaceClientProps {
  project: Project;
  isOwner: boolean;
}

export function EditorWorkspaceClient({
  project,
  isOwner,
}: EditorWorkspaceClientProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectName, setProjectName] = useState(project.name);
  const actions = useProjectActions({
    onDeleted: () => router.push("/editor"),
  });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleRename() {
    const trimmed = actions.name.trim();
    if (!trimmed || trimmed === projectName) {
      actions.closeDialog();
      return;
    }

    actions.setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        actions.setLoading(false);
        return;
      }

      const updated: Project = await res.json();
      setProjectName(updated.name);
      actions.closeDialog();
    } catch {
      actions.setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-base">
      <EditorNavbar
        projectName={projectName}
        isSidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <main className="flex-1 relative overflow-hidden">
        {/* V3: Mobile backdrop scrim */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-10 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {sidebarOpen && (
          <EditorSidebar
            projectName={projectName}
            isOwner={isOwner}
            onRename={() => actions.openRename(projectName)}
            onDelete={actions.openDelete}
          />
        )}

        {/* Canvas placeholder — React Flow canvas mounts here */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-copy-faint select-none">Canvas</p>
        </div>
      </main>

      {/* V1: Rename dialog */}
      <Dialog
        open={actions.dialog === "rename"}
        onOpenChange={(open) => {
          if (!open) actions.closeDialog();
        }}
      >
        <DialogContent
          className="sm:max-w-md bg-surface border-surface-border rounded-3xl"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-copy-primary">Rename project</DialogTitle>
          </DialogHeader>

          <Input
            ref={inputRef}
            value={actions.name}
            onChange={(e) => actions.setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleRename();
              }
            }}
            placeholder="Project name"
            className="bg-elevated border-surface-border text-copy-primary"
            disabled={actions.loading}
          />

          <DialogFooter>
            <Button
              onClick={handleRename}
              disabled={actions.loading || !actions.name.trim()}
            >
              {actions.loading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* V2: Delete dialog */}
      <Dialog
        open={actions.dialog === "delete"}
        onOpenChange={(open) => {
          if (!open && !actions.loading) actions.closeDelete();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md bg-surface border-surface-border rounded-3xl"
        >
          <DialogHeader>
            <DialogTitle className="text-copy-primary">Delete project?</DialogTitle>
            <DialogDescription className="text-copy-secondary">
              <strong className="text-copy-primary">{projectName}</strong> will be
              permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={actions.closeDelete}
              disabled={actions.loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => actions.handleDelete(project.id)}
              disabled={actions.loading}
            >
              {actions.loading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
