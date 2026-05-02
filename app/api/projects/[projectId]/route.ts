import { NextResponse } from "next/server";
import { getCurrentProjectIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const identity = await getCurrentProjectIdentity().catch(() => null);
  if (!identity) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { projectId } = await params;
  const existing = await prisma.project.findUnique({ where: { id: projectId } });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerId !== identity.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const name: string | undefined =
    typeof body?.name === "string" && body.name.trim() ? body.name.trim() : undefined;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const updated = await prisma.project.update({ where: { id: projectId }, data: { name } });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentProjectIdentity().catch(() => null);
  if (!identity) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { projectId } = await params;
  const existing = await prisma.project.findUnique({ where: { id: projectId } });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerId !== identity.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.project.delete({ where: { id: projectId } });
  return new NextResponse(null, { status: 204 });
}
