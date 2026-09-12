"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Camera, RefreshCcw, ImagePlus, Check, Loader2, MapPin, Wrench } from "lucide-react";
import { apiFetcher, type DealCard } from "@/lib/types";
import { Button, Chip } from "@/components/ui";

const MAX_KB = 500;

/** Kompres gambar (dataURL) ke target <= MAX_KB dengan canvas, kualitas menurun. */
export function compressImage(src: HTMLImageElement, maxKb = MAX_KB): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const maxDim = 1080;
    const scale = Math.min(1, maxDim / Math.max(src.naturalWidth, src.naturalHeight));
    canvas.width = Math.max(320, Math.round(src.naturalWidth * scale));
    canvas.height = Math.max(240, Math.round(src.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas tidak didukung."));
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);

    let quality = 0.85;
    let out = canvas.toDataURL("image/jpeg", quality);
    const size = (d: string) => Math.round((d.length - 22) * 0.75 / 1024);
    let sizeKb = size(out);
    while (sizeKb > maxKb && quality > 0.35) {
      quality -= 0.12;
      out = canvas.toDataURL("image/jpeg", quality);
      sizeKb = size(out);
    }
    resolve({ dataUrl: out, sizeKb });
  });
}

export default function DemplotClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const [deals, setDeals] = React.useState<DealCard[]>([]);
  const dealId = sp.get("deal") ?? "";

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [cameraOn, setCameraOn] = React.useState(false);
  const [camError, setCamError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<HTMLImageElement | null>(null);
  const [rawDataUrl, setRawDataUrl] = React.useState<string | null>(null);
  const [rawSizeKb, setRawSizeKb] = React.useState(0);
  const [compressing, setCompressing] = React.useState(false);
  const [compressed, setCompressed] = React.useState<{ dataUrl: string; sizeKb: number } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [caption, setCaption] = React.useState("");
  const [geo, setGeo] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    apiFetcher<{ deals: DealCard[] }>("/api/pipeline").then((r) => setDeals(r.deals)).catch(() => {});
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setGeo({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const stopCamera = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  React.useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (e) {
      setCamError(`Kamera tidak tersedia di sini: ${(e as Error).message}`);
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !cameraOn) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    onChangeFile(canvas.toDataURL("image/jpeg", 0.92));
    stopCamera();
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChangeFile(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onChangeFile = (dataUrl: string) => {
    setDone(false);
    setError(null);
    setCompressed(null);
    setRawDataUrl(dataUrl);
    setRawSizeKb(Math.round((dataUrl.length - 22) * 0.75 / 1024));
    const img = new Image();
    img.onload = () => setPreview(img);
    img.src = dataUrl;
  };

  const doCompress = async () => {
    if (!preview) return;
    setCompressing(true);
    setError(null);
    try {
      // Simulasi progres animasi (kompresi kilat) — UI tetap informatif di sinyal 3G
      const { dataUrl, sizeKb } = await compressImage(preview);
      await new Promise((r) => setTimeout(r, 350));
      setCompressed({ dataUrl, sizeKb });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCompressing(false);
    }
  };

  const save = async () => {
    if (!dealId || !compressed) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetcher("/api/demplot/upload", {
        method: "POST",
        body: JSON.stringify({
          dealId: Number(dealId),
          imageDataUrl: compressed.dataUrl,
          caption,
          geo,
        }),
      });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <Camera className="h-5 w-5 text-agro" /> Kamera Demplot
        </h1>
        <p className="text-sm text-slate-500">Bukti demonstrasi plot dikompres di perangkat sebelum diunggah (&le;{MAX_KB}KB).</p>
      </div>

      {/* Pilih deal */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Deal Tujuan</label>
        <select
          value={dealId}
          onChange={(e) => router.replace(`/app/demplot${e.target.value ? `?deal=${e.target.value}` : ""}`)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
        >
          <option value="">Pilih deal…</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>{d.ref_no} — {d.customer_name}</option>
          ))}
        </select>
        {!dealId && <div className="mt-2 text-xs text-slate-400">Pilih deal terlebih dahulu agar foto masuk ke timeline yang tepat.</div>}
      </div>

      {/* Kamera */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-ink shadow-sm">
        {cameraOn && !preview ? (
          <div className="relative">
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-4 bg-gradient-to-t from-black/60 to-transparent p-4">
              <button onClick={capture} className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-white/20 text-white active:scale-90">
                <Camera className="h-6 w-6" />
              </button>
            </div>
            <button onClick={stopCamera} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-800 to-slate-900 px-6 text-center">
            {preview ? (
              <img src={preview.src} alt="Preview" className="max-h-56 rounded-xl object-contain shadow-lg" />
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white/60">
                  <ImagePlus className="h-7 w-7" />
                </div>
                <p className="text-sm text-slate-300">Arahkan kamera ke lahan demonstrasi plot</p>
              </>
            )}
          </div>
        )}

        <div className="flex divide-x divide-slate-700 border-t border-slate-700 bg-slate-900">
          <button
            onClick={preview ? () => { setPreview(null); setRawDataUrl(null); setCompressed(null); } : startCamera}
            className="flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {preview ? <RefreshCcw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            {preview ? "Arti Ulang" : "Buka Kamera"}
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white hover:bg-slate-800">
            <ImagePlus className="h-4 w-4" /> Dari Galeri
          </button>
        </div>
        {camError && <div className="border-t border-slate-700 bg-slate-900 px-4 py-2 text-xs text-warning">{camError}</div>}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPickFile} className="hidden" />

      {/* Kompresi */}
      {rawDataUrl && !compressed && !compressing && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">Mengompres foto</span>
            <span className="font-bold text-corporate">{rawSizeKb.toLocaleString("id-ID")} KB → ?</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-full bg-corporate progress-animated" style={{ animationDuration: "1.4s" }} />
          </div>
          <Button className="mt-3 w-full" onClick={doCompress}>
            <Wrench className="h-4 w-4" /> Kompres Foto
          </Button>
        </div>
      )}

      {compressing && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">Mengompres foto</span>
            <span className="font-bold text-corporate">{rawSizeKb.toLocaleString("id-ID")} KB → …</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-full rounded-full bg-agro progress-animated" style={{ animationDuration: "1.2s" }} />
          </div>
        </div>
      )}

      {/* Hasil + simpan */}
      {compressed && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <img src={compressed.dataUrl} alt="Hasil kompresi" className="h-28 w-28 rounded-xl object-cover" />
            <div className="flex-1">
              <div className="text-sm font-bold text-ink">Siap diunggah</div>
              <div className="mt-1 text-2xl font-extrabold text-agro">{compressed.sizeKb} <span className="text-sm font-semibold text-slate-400">KB</span></div>
              <div className="text-xs text-slate-400">dari {rawSizeKb.toLocaleString("id-ID")} KB · hemat {Math.max(0, 100 - Math.round((compressed.sizeKb / Math.max(rawSizeKb, 1)) * 100))}%</div>
              <Chip tone={compressed.sizeKb <= MAX_KB ? "green" : "red"} className="mt-1">
                {compressed.sizeKb <= MAX_KB ? "≤ 500KB ✓" : "> 500KB"}
              </Chip>
            </div>
          </div>

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Catatan demplot (varietas, kondisi lahan…)…"
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
          {geo && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
              <MapPin className="h-3 w-3" /> Lokasi terekam {geo.latitude.toFixed(5)}, {geo.longitude.toFixed(5)}
            </div>
          )}

          {error && <div className="mt-2 rounded-xl bg-danger-mist px-4 py-3 text-xs text-danger">{error}</div>}
          {done && <div className="mt-2 rounded-xl bg-agro-mist px-4 py-3 text-xs font-semibold text-agro">✓ Foto tersimpan di timeline deal.</div>}

          <Button size="lg" className="mt-3 w-full" onClick={save} disabled={saving || !dealId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Simpan ke Timeline Deal
          </Button>
          {!dealId && <div className="mt-2 text-center text-xs text-slate-400">Pilih deal terlebih dahulu.</div>}
        </div>
      )}
    </div>
  );
}