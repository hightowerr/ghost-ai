import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export interface CollaboratorRecord {
  email: string;
  clerkUserId: string | null;
  name: string | null;
  imageUrl: string | null;
}

export interface ProjectShareDetails {
  projectId: string;
  ownerClerkId: string;
  collaborators: CollaboratorRecord[];
}

export async function getProjectShareDetails(
  projectId: string
): Promise<ProjectShareDetails> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });

  const rows = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { addedAt: "asc" },
    select: { email: true },
  });

  if (rows.length === 0) {
    return { projectId: project.id, ownerClerkId: project.ownerId, collaborators: [] };
  }

  const client = await clerkClient();
  const clerkUsers = await client.users.getUserList({
    emailAddress: rows.map((r) => r.email),
    limit: rows.length,
  });

  const clerkByEmail = new Map(
    clerkUsers.data.flatMap((u) =>
      u.emailAddresses.map((e) => [
        e.emailAddress,
        {
          clerkUserId: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || null,
          imageUrl: u.imageUrl ?? null,
        },
      ])
    )
  );

  const collaborators: CollaboratorRecord[] = rows.map((row) => {
    const profile = clerkByEmail.get(row.email);
    return {
      email: row.email,
      clerkUserId: profile?.clerkUserId ?? null,
      name: profile?.name ?? null,
      imageUrl: profile?.imageUrl ?? null,
    };
  });

  return { projectId: project.id, ownerClerkId: project.ownerId, collaborators };
}
