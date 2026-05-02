import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { liveblocks, getUserColor } from "@/lib/liveblocks";
import { userHasProjectAccess } from "@/lib/project-access";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "Missing roomId" }, { status: 400 });

  const hasAccess = await userHasProjectAccess(roomId);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
    "Anonymous";
  const avatar = user.imageUrl ?? "";
  const color = getUserColor(userId);

  const session = liveblocks.prepareSession(userId, {
    userInfo: { name, avatar, color },
  });
  session.allow(roomId, session.FULL_ACCESS);

  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
