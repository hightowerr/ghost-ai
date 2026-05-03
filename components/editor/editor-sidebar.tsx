"use client";

import { useRouter } from "next/navigation";
import {
  LayoutTemplate,
  Layers,
  Users,
  FileText,
  ChevronRight,
  ArrowLeft,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorSidebarProps {
  projectName: string;
  isOwner: boolean;
  onRename: () => void;
  onDelete: () => void;
}

const NAV_ITEMS = [
  { icon: LayoutTemplate, label: "Templates", badge: null },
  { icon: Layers, label: "Layers", badge: null },
  { icon: Users, label: "Collaborators", badge: null },
  { icon: FileText, label: "Specs", badge: null },
] as const;

export function EditorSidebar({
  projectName,
  isOwner,
  onRename,
  onDelete,
}: EditorSidebarProps) {
  const router = useRouter();

  return (
    <aside className="absolute left-3 top-3 bottom-3 w-56 z-20 flex flex-col rounded-2xl bg-surface/90 backdrop-blur-sm border border-surface-border shadow-xl overflow-hidden">
      {/* Back to projects */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => router.push("/editor")}
          className="flex items-center gap-1.5 text-xs text-copy-muted hover:text-copy-secondary transition-colors group"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
          All Projects
        </button>
      </div>

      {/* Project name + owner actions */}
      <div className="px-3 pb-3 border-b border-surface-border flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-copy-primary truncate">{projectName}</p>
        {isOwner && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onRename}
              className="p-1 rounded text-copy-muted hover:text-copy-secondary hover:bg-elevated transition-colors"
              aria-label="Rename project"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded text-copy-muted hover:text-state-error hover:bg-elevated transition-colors"
              aria-label="Delete project"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-copy-secondary hover:text-copy-primary hover:bg-elevated rounded-lg mx-1 transition-colors group"
            style={{ width: "calc(100% - 8px)" }}
          >
            <Icon className="h-4 w-4 shrink-0 text-copy-muted group-hover:text-copy-secondary transition-colors" />
            <span className="flex-1 text-left">{label}</span>
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-surface-border">
        <Button size="sm" className="w-full text-xs">
          Generate Spec
        </Button>
      </div>
    </aside>
  );
}
