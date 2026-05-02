import Link from "next/link";
import { ShieldOff } from "lucide-react";

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-base gap-4">
      <ShieldOff className="h-8 w-8 text-copy-muted" />
      <p className="text-sm text-copy-muted">You do not have access to this project.</p>
      <Link href="/editor" className="text-xs text-brand hover:underline">
        Back to projects
      </Link>
    </div>
  );
}
