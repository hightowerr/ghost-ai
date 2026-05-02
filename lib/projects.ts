import { prisma } from "@/lib/prisma";
import type { Project } from "@prisma/client";

export interface ProjectsForUser {
  owned: Project[];
  shared: Project[];
}

export async function getProjectsForUser(
  userId: string,
  userEmail: string
): Promise<ProjectsForUser> {
  const [owned, sharedLinks] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.projectCollaborator.findMany({
      where: { email: userEmail },
      include: { project: true },
    }),
  ]);

  const shared = sharedLinks
    .map((link) => link.project)
    .filter((p) => p.ownerId !== userId);

  return { owned, shared };
}
