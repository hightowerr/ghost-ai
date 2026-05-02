"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@prisma/client";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditorHomeClientProps {
  owned: Project[];
  shared: Project[];
}

export function EditorHomeClient({ owned: initialOwned, shared: initialShared }: EditorHomeClientProps) {
  const router = useRouter();
  const [ownedProjects, setOwnedProjects] = useState<Project[]>(initialOwned);
  const [sharedProjects] = useState<Project[]>(initialShared);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Project" }),
      });
      if (!res.ok) return;
      const project: Project = await res.json();
      setOwnedProjects((prev) => [project, ...prev]);
      setEditingId(project.id);
      setEditName(project.name);
      setTimeout(() => inputRef.current?.select(), 0);
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(project: Project) {
    setEditingId(project.id);
    setEditName(project.name);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commitRename(projectId: string) {
    const trimmed = editName.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      const updated: Project = await res.json();
      setOwnedProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updated : p))
      );
    }
    cancelEdit();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function handleDelete(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) {
      setOwnedProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <EditorNavbar />

      <div className="flex-1 flex justify-center py-10 px-4">
        <div className="w-full max-w-2xl flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-copy-muted">
                My Projects
              </h2>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isCreating}
                className="text-xs"
              >
                {isCreating ? "Creating…" : "New Project"}
              </Button>
            </div>

            {ownedProjects.length === 0 ? (
              <p className="text-sm text-copy-muted py-4 text-center">
                No projects yet. Create one to get started.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {ownedProjects.map((project) => (
                  <li
                    key={project.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-surface-border bg-surface hover:bg-elevated transition-colors group"
                  >
                    {editingId === project.id ? (
                      <Input
                        ref={inputRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(project.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        onBlur={() => commitRename(project.id)}
                        className="flex-1 h-7 text-sm bg-elevated border-surface-border text-copy-primary rounded-lg px-2"
                        autoFocus
                      />
                    ) : (
                      <button
                        className="flex-1 text-left text-sm text-copy-primary truncate"
                        onClick={() => router.push(`/editor/${project.id}`)}
                      >
                        {project.name}
                      </button>
                    )}

                    {editingId !== project.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => startEditing(project)}
                          aria-label="Rename project"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className="size-3"
                          >
                            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.699 1.198l-.45 1.795a.75.75 0 0 0 .92.92l1.795-.45a2.75 2.75 0 0 0 1.198-.699l4.261-4.263a1.75 1.75 0 0 0 0-2.475ZM3.5 12.25V13h.75l4.263-4.263-.75-.75L3.5 12.25Z" />
                          </svg>
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => setDeletingId(project.id)}
                          aria-label="Delete project"
                          className="text-state-error hover:text-state-error"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className="size-3"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {sharedProjects.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-copy-muted">
                Shared with me
              </h2>
              <ul className="flex flex-col gap-1">
                {sharedProjects.map((project) => (
                  <li
                    key={project.id}
                    className="flex items-center px-3 py-2.5 rounded-xl border border-surface-border bg-surface hover:bg-elevated transition-colors"
                  >
                    <button
                      className="flex-1 text-left text-sm text-copy-primary truncate"
                      onClick={() => router.push(`/editor/${project.id}`)}
                    >
                      {project.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The project and all its data will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
