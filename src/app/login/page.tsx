import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./login-form";

export const metadata: Metadata = { title: "Masuk - OmniCRM Agro" };

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect("/app");
  return <LoginForm />;
}