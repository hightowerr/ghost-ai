import { NextResponse } from "next/server";
import { getCurrentProjectIdentity } from "@/lib/project-access";
import { getProjectsForUser } from "@/lib/projects";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const identity = await getCurrentProjectIdentity().catch(() => null);
  if (!identity) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { owned, shared } = await getProjectsForUser(identity.userId, identity.email);
  return NextResponse.json({ owned, shared });
}

export async function POST(request: Request) {
  const identity = await getCurrentProjectIdentity().catch(() => null);
  if (!identity) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name: string =
    typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Untitled Project";

  const project = await prisma.project.create({
    data: { ownerId: identity.userId, name },
  });

  return NextResponse.json(project, { status: 201 });
}
