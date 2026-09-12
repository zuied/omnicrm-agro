"use client";

import React from "react";
import { MessageCircle, Mail, Send, Phone, Megaphone } from "lucide-react";
import { apiFetcher } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Button, Modal, Chip, EmptyState, Spinner } from "@/components/ui";

interface Msg {
  id: number;
  direction: "inbound" | "outbound";
  channel: "whatsapp" | "email";
  counterpart: string;
  deal_label: string | null;
  deal_ref: string | null;
  subject: string | null;
  body: string;
  status: string;
  created_at: string;
}
interface Promo { id: number; title: string; target_crop: string; channel: string; message_template: string; }

export default function InboxClient() {
  const [channel, setChannel] = React.useState<"all" | "whatsapp" | "email">("all");
  const [msgs, setMsgs] = React.useState<Msg[] | null>(null);
  const [promos, setPromos] = React.useState<Promo[]>([]);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [form, setForm] = React.useState<{ channel: "whatsapp" | "email"; counterpart: string; subject?: string; body: string }>({
    channel: "whatsapp",
    counterpart: "",
    body: "",
  });

  const load = React.useCallback(async (c: string) => {
    const r = await apiFetcher<{ messages: Msg[]; promos: Promo[] }>(`/api/inbox?channel=${c}`);
    setMsgs(r.messages);
    setPromos(r.promos);
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setMsgs(null);
      load(channel).catch(() => setMsgs([]));
    }, 0);
    return () => clearTimeout(t);
  }, [channel, load]);

  const send = async () => {
    if (!form.counterpart.trim() || !form.body.trim()) return;
    await apiFetcher("/api/inbox", { method: "POST", body: JSON.stringify(form) });
    setComposeOpen(false);
    setForm({ channel: "whatsapp", counterpart: "", body: "" });
    load(channel).catch(() => {});
  };

  const list = msgs ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
            <MessageCircle className="h-5 w-5 text-agro" /> Inbox WA &amp; Email
          </h1>
          <p className="text-sm text-slate-500">Pesan otomasi persetujuan, promo musiman, dan komunikasi pelanggan.</p>
        </div>
        <Button onClick={() => setComposeOpen(true)}><Send className="h-4 w-4" /> Tulis Pesan</Button>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {(["all", "whatsapp", "email"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition ${channel === c ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
          >
            {c === "whatsapp" ? <Phone className="h-4 w-4" /> : c === "email" ? <Mail className="h-4 w-4" /> : null}
            {c === "all" ? "Semua" : c === "whatsapp" ? "WhatsApp" : "Email"}
          </button>
        ))}
      </div>

      {promos.length > 0 && (
        <div className="rounded-2xl border border-violet/20 bg-violet-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700">
            <Megaphone className="h-4 w-4" /> Promo Musiman Aktif
          </div>
          <div className="space-y-2">
            {promos.map((p) => (
              <div key={p.id} className="rounded-xl bg-white px-3 py-2.5 text-sm">
                <div className="font-bold text-ink">{p.title} <Chip tone="green">{p.target_crop}</Chip></div>
                <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{p.message_template}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!msgs ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : list.length === 0 ? (
        <EmptyState emoji="📪" title="Tidak ada pesan" desc="Pesan akan muncul di sini setelah ada aktivitas." />
      ) : (
        <div className="space-y-3">
          {list.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.channel === "whatsapp" ? "bg-agro-mist text-agro" : "bg-corporate-soft text-corporate"}`}>
                  {m.channel === "whatsapp" ? <MessageCircle className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-ink">{m.counterpart}</span>
                    <Chip tone={m.direction === "outbound" ? "blue" : "slate"}>{m.direction === "outbound" ? "Keluar" : "Masuk"}</Chip>
                    {m.deal_ref && <span className="text-[11px] font-semibold text-corporate">{m.deal_ref}</span>}
                    <span className="ml-auto text-[11px] text-slate-400">{formatDateTime(m.created_at)}</span>
                  </div>
                  {m.subject && <div className="mt-0.5 text-xs font-semibold text-slate-500">{m.subject}</div>}
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{m.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)}>
        <h2 className="mb-4 pr-8 text-lg font-bold text-ink">Tulis Pesan</h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["whatsapp", "email"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setForm((f) => ({ ...f, channel: c }))}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition ${
                  form.channel === c ? "border-agro bg-agro text-white" : "border-slate-200 bg-mist text-slate-600"
                }`}
              >
                {c === "whatsapp" ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                {c === "whatsapp" ? "WhatsApp" : "Email"}
              </button>
            ))}
          </div>
          <input
            value={form.counterpart}
            onChange={(e) => setForm((f) => ({ ...f, counterpart: e.target.value }))}
            placeholder={form.channel === "whatsapp" ? "Nomor tujuan (+628xx…)" : "Email tujuan"}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
          <input
            value={form.subject ? form.subject : ""}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Subjek (opsional)"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={4}
            placeholder="Isi pesan…"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
          <Button size="lg" className="w-full" onClick={send}><Send className="h-4 w-4" /> Kirim</Button>
        </div>
      </Modal>
    </div>
  );
}