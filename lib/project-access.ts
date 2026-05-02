import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Project } from "@prisma/client";

export interface ProjectIdentity {
  userId: string;
  email: string;
  name: string;
  imageUrl: string;
}

export async function getCurrentProjectIdentity(): Promise<ProjectIdentity> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const user = await currentUser();
  if (!user) throw new Error("User not found");

  const email = user.emailAddresses[0]?.emailAddress ?? "";

  return {
    userId,
    email,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || email,
    imageUrl: user.imageUrl,
  };
}

export async function getAccessibleProject(roomId: string): Promise<Project | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress ?? null;

  const project = await prisma.project.findUnique({
    where: { id: roomId },
    include: { collaborators: true },
  });

  if (!project) return null;

  if (project.ownerId === userId) return project;

  if (email && project.collaborators.some((c) => c.email === email)) {
    return project;
  }

  return null;
}

export async function userHasProjectAccess(roomId: string): Promise<boolean> {
  const project = await getAccessibleProject(roomId);
  return project !== null;
}
