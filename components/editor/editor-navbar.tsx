"use client";

import { UserButton } from "@clerk/nextjs";

interface EditorNavbarProps {
  projectName?: string;
}

export function EditorNavbar({ projectName }: EditorNavbarProps) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-surface-border bg-surface">
      <div className="flex items-center gap-2 shrink-0">
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
