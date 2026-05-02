import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectShareDetails } from "@/lib/project-collaborators";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = project.ownerId === userId;
  const isCollaborator =
    primaryEmail != null &&
    (await prisma.projectCollaborator.findUnique({
      where: { projectId_email: { projectId, email: primaryEmail } },
    })) !== null;

  if (!isOwner && !isCollaborator)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const details = await getProjectShareDetails(projectId);
  return NextResponse.json({ collaborators: details.collaborators });
}

export async function POST(req: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.ownerId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const email: string = (body?.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const client = await clerkClient();
  const ownerUser = await client.users.getUser(userId);
  const ownerEmails = ownerUser.emailAddresses.map((e) => e.emailAddress.toLowerCase());
  if (ownerEmails.includes(email))
    return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });

  await prisma.projectCollaborator.upsert({
    where: { projectId_email: { projectId, email } },
    create: { projectId, email },
    update: {},
  });

  const { collaborators } = await getProjectShareDetails(projectId);
  const added = collaborators.find((c) => c.email === email)!;
  return NextResponse.json({ collaborator: added }, { status: 201 });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.ownerId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const email: string = (body?.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  await prisma.projectCollaborator.deleteMany({ where: { projectId, email } });
  return NextResponse.json({ removed: true });
}
