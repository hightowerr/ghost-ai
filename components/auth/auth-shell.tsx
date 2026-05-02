import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand / marketing */}
      <div
        className="hidden md:flex w-1/2 flex-col justify-between p-14 border-r border-surface-border overflow-hidden shrink-0"
        style={{
          background: [
            "radial-gradient(ellipse at 80% 10%, color-mix(in srgb, var(--accent-ai) 12%, transparent) 0%, transparent 60%)",
            "radial-gradient(ellipse at 15% 90%, color-mix(in srgb, var(--accent-primary) 7%, transparent) 0%, transparent 50%)",
            "var(--bg-surface)",
          ].join(", "),
        }}
      >
        {/* Wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-xl bg-brand flex items-center justify-center shrink-0">
            <span className="text-[11px] font-black text-[#001417] leading-none">G</span>
          </div>
          <span className="text-base font-semibold text-copy-primary tracking-tight">Ghost AI</span>
        </div>

        {/* Copy */}
        <div className="flex flex-col gap-5">
          <h1 className="text-5xl font-bold text-copy-primary leading-[1.1] tracking-tight">
            Design systems.<br />
            Together.
          </h1>
          <p className="text-base text-copy-muted leading-relaxed max-w-[22rem]">
            Describe your architecture in plain English. Ghost AI generates the canvas,
            your team refines it in real time.
          </p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-base p-8">
        {children}
      </div>
    </div>
  );
}
