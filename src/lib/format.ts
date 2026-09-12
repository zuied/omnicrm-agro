export function formatIDR(n: number | string, withDecimals = false): string {
  const v = Number(n) || 0;
  return "Rp " + v.toLocaleString("id-ID", { maximumFractionDigits: withDecimals ? 2 : 0 });
}

export function formatNumber(n: number | string): string {
  const v = Number(n) || 0;
  return v.toLocaleString("id-ID");
}

export function formatQty(n: number | string): string {
  const v = Number(n) || 0;
  if (Number.isInteger(v)) return v.toLocaleString("id-ID") + " Pcs";
  return v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "-";
  const date = new Date(String(d).includes("T") ? d : d + "T00:00:00");
  if (isNaN(date.getTime())) return String(d);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  return date.toLocaleDateString("id-ID", opts);
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "-";
  const date = new Date(String(d).replace(" ", "T") + (String(d).includes("T") ? "" : ""));
  if (isNaN(date.getTime())) return String(d);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };
  return date.toLocaleString("id-ID", opts);
}

export function timeAgo(d: string | null | undefined): string {
  if (!d) return "-";
  const t = new Date(String(d).replace(" ", "T")).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return mins + " mnt lalu";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + " jam lalu";
  const days = Math.floor(hours / 24);
  return days + " hari lalu";
}

export function displayMoneyHuman(v: number | string): string {
  const n = Number(v) || 0;
  if (n >= 1_000_000_000) return "Rp " + (n / 1_000_000_000).toFixed(1).replace(".0", "") + " M";
  if (n >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(1).replace(".0", "") + " Jt";
  if (n >= 1_000) return "Rp " + (n / 1_000).toFixed(0) + " Rb";
  return "Rp " + n;
}