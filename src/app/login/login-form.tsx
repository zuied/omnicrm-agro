"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Leaf, LogIn, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button, Field, Spinner } from "@/components/ui";

const DEMO_ACCOUNTS = [
  { label: "Agent (Ahmad Suhendra)", email: "agent@omnicrm.id", pass: "agent123" },
  { label: "Manager (Budi Santoso)", email: "manager@omnicrm.id", pass: "manager123" },
  { label: "Admin", email: "admin@omnicrm.id", pass: "admin123" },
];

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Gagal masuk");
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fill = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setError(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-agro-deep via-agro to-agro px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Leaf className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">OmniCRM Agro</h1>
          <p className="mt-1 text-sm text-white/80">Agro &amp; Equipment Enterprise System · Fase 1</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.id"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-ink outline-none transition focus:border-agro focus:ring-2 focus:ring-agro/20"
                required
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-sm text-ink outline-none transition focus:border-agro focus:ring-2 focus:ring-agro/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {error && <div className="rounded-xl bg-danger-mist px-4 py-3 text-sm font-medium text-danger">{error}</div>}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              Masuk
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Akun demo UAT
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => fill(a.email, a.pass)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-mist px-3 py-2.5 text-left text-xs transition hover:border-agro/40 hover:bg-agro-mist"
                >
                  <span className="font-semibold text-ink">{a.label}</span>
                  <span className="text-slate-500">{a.email.split("@")[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/60">
          DIJALANKAN DI CHROME ANDROID · ASK INSTALLABLE (PWA) · DIIOPTIMALKAN UNTUK SINYAL 3G/4G
        </p>
      </div>
    </div>
  );
}