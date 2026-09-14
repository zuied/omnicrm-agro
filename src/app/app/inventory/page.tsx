import { getSession } from "@/lib/auth";
import InventoryClient from "./inventory-client";

export default async function InventoryPage() {
  const user = await getSession();
  return <InventoryClient isAdmin={user?.role === "admin"} />;
}