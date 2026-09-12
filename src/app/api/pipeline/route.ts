import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listDeals } from "@/lib/pipeline";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const stage = sp.get("stage") ?? undefined;
  const customerType = (sp.get("type") as "B2B" | "B2C") ?? undefined;
  const q = sp.get("q") ?? undefined;

  let ownerId: number | undefined;
  if (user.role === "agent") ownerId = user.id;

  const deals = await listDeals({ stage, customerType, ownerId, q });
  return NextResponse.json({ deals });
}