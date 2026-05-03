"use client";

import { UserButton } from "@clerk/nextjs";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorNavbarProps {
  projectName?: string;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export function EditorNavbar({ projectName, isSidebarOpen, onToggleSidebar }: EditorNavbarProps) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-surface-border bg-surface">
      <div className="flex items-center gap-2 shrink-0">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            className="h-8 w-8 text-copy-muted hover:text-copy-primary"
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
        )}
        <div className="h-6 w-6 rounded-lg bg-brand flex items-center justify-center shrink-0">
          <span className="text-[10px] font-black text-[#001417] leading-none">G</span>
        </div>
        <span className="text-sm font-semibold text-copy-primary tracking-tight">Ghost AI</span>
      </div>

      {projectName && (
        <span className="text-sm font-medium text-copy-secondary truncate max-w-xs">
          {projectName}
        </span>
      )}

      <div className="shrink-0">
        <UserButton />
      </div>
    </header>
  );
}
