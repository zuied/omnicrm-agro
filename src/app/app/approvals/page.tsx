import { getSession } from "@/lib/auth";
import ApprovalsClient from "./approvals-client";

export default async function ApprovalsPage() {
  const user = await getSession();
  return <ApprovalsClient role={user?.role ?? "agent"} />;
}