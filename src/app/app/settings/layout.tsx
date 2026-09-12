import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (user?.role !== "admin") redirect("/app");
  return <>{children}</>;
}