"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/ProfileProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isGoogleUser: boolean;
  createdAt: string;
}

// ─── Avatar color palette ─────────────────────────────────────────────────────

const AVATAR_COLORS = [
  // Blues
  "#1E40AF", "#2563EB", "#3B82F6", "#0EA5E9", "#06B6D4", "#0891B2",
  // Purples / pinks
  "#7C3AED", "#9333EA", "#A21CAF", "#C026D3", "#DB2777", "#E11D48",
  // Reds / oranges
  "#DC2626", "#EA580C", "#F97316", "#D97706", "#CA8A04",
  // Greens / teals
  "#16A34A", "#15803D", "#059669", "#0D9488",
  // Dark / neutral
  "#0F172A", "#1E293B", "#334155", "#475569", "#64748B", "#94A3B8",
  // Vibrant accents
  "#BE185D", "#4F46E5", "#7C2D12", "#064E3B",
];

const AVATAR_EMOJIS = [
  // none → initials
  "",
  // Faces
  "😊", "😎", "🤩", "🥳", "😏", "🧐", "🤓", "😈",
  // Animals
  "🦁", "🦊", "🐼", "🐯", "🦅", "🐬", "🦋", "🦄", "🐺", "🦖",
  // Space / energy
  "🚀", "⚡", "🌟", "🔥", "💥", "🌈", "☄️", "🛸",
  // Objects / achievements
  "🎯", "💎", "🏆", "👑", "🎮", "🎸", "🎨", "🔮",
  // Nature
  "🌊", "🌙", "🌺", "❄️",
  // Food / fun
  "🍕", "🌮", "🍣", "🧃",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ name, color, emoji, avatarUrl, size = 80 }: {
  name: string; color: string; emoji: string | null; avatarUrl?: string | null; size?: number;
}) {
  if (avatarUrl) {
    return (
      <div className="rounded-full shrink-0 overflow-hidden" style={{ width: size, height: size, minWidth: size, minHeight: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt={name} style={{ width: size, height: size, objectFit: "cover", display: "block" }} />
      </div>
    );
  }
  const fontSize = size * 0.38;
  return (
    <div
      className="rounded-full flex items-center justify-center font-black text-white shrink-0 select-none"
      style={{ width: size, height: size, background: color, fontSize }}
      aria-hidden="true"
    >
      {emoji || getInitials(name)}
    </div>
  );
}

function Section({ title, description, children, collapsible = false, defaultOpen = true }: {
  title: string; description?: string; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-[#E8EDF3] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`w-full px-6 py-4 flex items-center justify-between gap-3 text-left ${collapsible ? "hover:bg-[#F8FAFC] transition-colors" : "cursor-default"}`}
      >
        <div>
          <h2 className="text-[15px] font-bold text-[#0F172A]">{title}</h2>
          {description && <p className="text-[13px] text-[#64748B] mt-0.5">{description}</p>}
        </div>
        {collapsible && (
          <svg
            className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {(!collapsible || open) && (
        <div className="border-t border-[#F1F5F9] px-6 py-5">{children}</div>
      )}
    </div>
  );
}

function Field({ label, children, hint }: {
  label: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-semibold text-[#0F172A]">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[#94A3B8]">{hint}</p>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, maxLength, disabled, type = "text", autoComplete,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  maxLength?: number; disabled?: boolean; type?: string; autoComplete?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      autoComplete={autoComplete}
      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[14px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-[#F8FAFC] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
    />
  );
}

function SaveBtn({ loading, label = "Guardar cambios", onClick, disabled }: {
  loading: boolean; label?: string; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)" }}
      className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {loading ? "Guardando…" : label}
    </button>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-[13px] font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200 ${
        type === "success" ? "bg-[#16A34A] text-white" : "bg-[#DC2626] text-white"
      }`}
    >
      {type === "success" ? (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
        </svg>
      )}
      {message}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E2E8F0] rounded-xl ${className ?? ""}`} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileClient() {
  const router = useRouter();
  const { updateProfile: updateGlobalProfile } = useProfile();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarColor, setAvatarColor] = useState("#2563EB");
  const [avatarEmoji, setAvatarEmoji] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Photo upload
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dirty tracking
  const [identityDirty, setIdentityDirty] = useState(false);
  const [identitySaving, setIdentitySaving] = useState(false);

  // Password
  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Delete account
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, type: "success" | "error") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        if (res.status === 401) router.replace("/login");
        return;
      }
      const data: ProfileData = await res.json();
      setProfile(data);
      setName(data.name);
      setBio(data.bio ?? "");
      setAvatarColor(data.avatarColor);
      setAvatarEmoji(data.avatarEmoji ?? "");
      setAvatarUrl(data.avatarUrl ?? null);
    } catch {
      // network error — page will stay in skeleton, user can refresh
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Track identity dirty state
  useEffect(() => {
    if (!profile) return;
    const dirty =
      name !== profile.name ||
      bio !== (profile.bio ?? "") ||
      avatarColor !== profile.avatarColor ||
      avatarEmoji !== (profile.avatarEmoji ?? "");
    setIdentityDirty(dirty);
  }, [name, bio, avatarColor, avatarEmoji, profile]);

  // ── Photo upload ────────────────────────────────────────────────────────────

  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 256;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function previewPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      showToast("Solo se admiten imágenes", "error");
      return;
    }
    if (file.size > 8_000_000) {
      showToast("La imagen no puede superar 8 MB", "error");
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      setPendingPhotoUrl(dataUrl);
    } catch {
      showToast("Error al procesar la imagen", "error");
    }
  }

  async function savePhoto() {
    if (!pendingPhotoUrl) return;
    setPhotoUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: pendingPhotoUrl }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Error al subir la foto", "error"); return; }
      setAvatarUrl(pendingPhotoUrl);
      setPendingPhotoUrl(null);
      setProfile((prev) => prev ? { ...prev, avatarUrl: pendingPhotoUrl } : prev);
      updateGlobalProfile({ avatarUrl: pendingPhotoUrl });
      showToast("Foto actualizada", "success");
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function removePhoto() {
    setPhotoUploading(true);
    try {
      await fetch("/api/profile/avatar", { method: "DELETE" });
      setAvatarUrl(null);
      setProfile((prev) => prev ? { ...prev, avatarUrl: null } : prev);
      updateGlobalProfile({ avatarUrl: null });
      showToast("Foto eliminada", "success");
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setPhotoUploading(false);
    }
  }

  // ── Save identity ───────────────────────────────────────────────────────────
  async function saveIdentity() {
    if (!identityDirty) return;
    if (name.trim().length < 2) { showToast("El nombre debe tener al menos 2 caracteres", "error"); return; }
    setIdentitySaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), bio: bio || null, avatarColor, avatarEmoji: avatarEmoji || null }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Error al guardar", "error"); return; }
      setProfile((prev) => prev ? { ...prev, ...data.user } : prev);
      setIdentityDirty(false);
      updateGlobalProfile({
        avatarColor: data.user.avatarColor,
        avatarEmoji: data.user.avatarEmoji ?? null,
        name: data.user.name,
        avatarUrl: avatarUrl,
      });
      showToast("Perfil actualizado", "success");
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setIdentitySaving(false);
    }
  }

  // ── Change password ─────────────────────────────────────────────────────────
  async function changePassword() {
    if (newPwd.length < 8) { showToast("La nueva contraseña debe tener al menos 8 caracteres", "error"); return; }
    if (newPwd !== confirmPwd) { showToast("Las contraseñas no coinciden", "error"); return; }
    setPwdSaving(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Error al cambiar contraseña", "error"); return; }
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      showToast("Contraseña actualizada", "success");
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setPwdSaving(false);
    }
  }

  // ── Delete account ──────────────────────────────────────────────────────────
  async function deleteAccount() {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/profile/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword || undefined, confirmation: deleteConfirmText }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Error al eliminar cuenta", "error"); setDeleteLoading(false); return; }
      router.push("/");
    } catch {
      showToast("Error de conexión", "error");
      setDeleteLoading(false);
    }
  }

  // ── Password strength ───────────────────────────────────────────────────────
  const pwdStrength = newPwd.length === 0 ? 0
    : newPwd.length < 8 ? 1
    : newPwd.length < 12 && /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) ? 2
    : newPwd.length >= 12 && /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) && /[^A-Za-z0-9]/.test(newPwd) ? 4
    : 3;

  const pwdStrengthLabel = ["", "Débil", "Media", "Buena", "Fuerte"][pwdStrength];
  const pwdStrengthColor = ["", "#EF4444", "#F97316", "#22C55E", "#16A34A"][pwdStrength];

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC]">
        {/* Skeleton header */}
        <div className="w-full animate-pulse bg-[#1E293B]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-white/10 shrink-0" />
            <div className="flex flex-col gap-2">
              <div className="h-5 w-36 rounded-lg bg-white/10" />
              <div className="h-3 w-48 rounded-lg bg-white/10" />
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-7 space-y-5">
          {[120, 220, 240, 120].map((h, i) => <Sk key={i} className={`h-${h}`} style={{ height: h }} />)}
        </div>
      </main>
    );
  }

  if (!profile) return null;

  const joinedDate = new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date(profile.createdAt));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#F8FAFC]">

      {/* Profile header — avatar + name inside the banner */}
      <div className="w-full" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #2563EB 100%)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex items-center gap-5">
          <div className="rounded-full shrink-0" style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.25), 0 4px 20px rgba(0,0,0,0.4)" }}>
            <Avatar name={profile.name} color={profile.avatarColor} emoji={profile.avatarEmoji} avatarUrl={avatarUrl} size={80} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold text-white leading-tight truncate">{profile.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[12px] text-blue-200">Miembro desde {joinedDate}</span>
              <span className="w-1 h-1 rounded-full bg-blue-400/50" />
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white">
                {profile.isGoogleUser ? "🔗 Google" : "✉ Email"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* ── 1. FOTO & APARIENCIA ──────────────────────────────────────────── */}
        <Section title="Apariencia" description="Tu foto, emoji y color de avatar">

          {/* Photo upload — full-width card at top */}
          <div className="flex items-center gap-5 p-4 rounded-2xl mb-6" style={{ background: "linear-gradient(135deg, #F8FAFC, #F1F5F9)", border: "1px solid #E2E8F0" }}>
            <div
              className={`relative group cursor-pointer rounded-full shrink-0 transition-transform ${photoDragOver ? "scale-105 ring-4 ring-[#2563EB] ring-offset-2" : "hover:scale-105"}`}
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
              onDragOver={(e) => { e.preventDefault(); setPhotoDragOver(true); }}
              onDragLeave={() => setPhotoDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setPhotoDragOver(false); const file = e.dataTransfer.files[0]; if (file) previewPhoto(file); }}
              onClick={() => fileInputRef.current?.click()}
              role="button" tabIndex={0} aria-label="Subir foto de perfil"
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            >
              <Avatar name={name || profile.name} color={avatarColor} emoji={avatarEmoji || null} avatarUrl={pendingPhotoUrl ?? avatarUrl} size={72} />
              <div className={`absolute inset-0 rounded-full flex flex-col items-center justify-center gap-0.5 bg-black/55 transition-opacity ${photoUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                {photoUploading ? (
                  <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/></svg>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                    <span className="text-[9px] text-white font-bold tracking-wide">FOTO</span>
                  </>
                )}
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) previewPhoto(f); e.target.value = ""; }} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#0F172A]">Foto de perfil</p>
              <p className="text-[12px] text-[#64748B] mt-0.5">JPG, PNG o WebP · máx. 8 MB</p>
              <div className="flex items-center gap-2 mt-2.5">
                {pendingPhotoUrl ? (
                  <>
                    <button type="button" onClick={savePhoto} disabled={photoUploading}
                      className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)" }}>
                      {photoUploading ? "Guardando…" : "Guardar foto"}
                    </button>
                    <button type="button" onClick={() => setPendingPhotoUrl(null)} disabled={photoUploading}
                      className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-[#475569] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-50 transition-all">
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-[#2563EB] bg-white border border-[#BFDBFE] hover:bg-[#EFF6FF] transition-all">
                      Subir foto
                    </button>
                    {avatarUrl && (
                      <button type="button" onClick={removePhoto} disabled={photoUploading}
                        className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-[#DC2626] bg-white border border-[#FECACA] hover:bg-[#FEF2F2] disabled:opacity-40 transition-all">
                        Eliminar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {/* Emoji picker */}
            <Field label="Emoji del avatar" hint="Deja vacío para usar tus iniciales">
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_EMOJIS.map((e) => (
                  <button key={e || "none"} type="button" onClick={() => setAvatarEmoji(e)}
                    aria-label={e ? `Emoji ${e}` : "Sin emoji"} aria-pressed={avatarEmoji === e}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all focus-visible:outline-2 focus-visible:outline-[#2563EB] ${
                      avatarEmoji === e ? "ring-2 ring-[#2563EB] bg-[#EFF6FF] scale-110" : "bg-[#F8FAFC] hover:bg-[#F1F5F9] hover:scale-110"
                    }`}>
                    {e || <span className="text-[10px] font-bold text-[#94A3B8]">Aa</span>}
                  </button>
                ))}
              </div>
            </Field>

            {/* Color picker */}
            <Field label="Color del avatar">
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setAvatarColor(c)}
                    aria-label={`Color ${c}`} aria-pressed={avatarColor === c}
                    className={`w-7 h-7 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${
                      avatarColor === c ? "ring-2 ring-offset-2 ring-[#2563EB] scale-125" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </Field>
          </div>
        </Section>

        {/* ── 2. DATOS PERSONALES ───────────────────────────────────────────── */}
        <Section title="Datos personales" description="Tu nombre, email y bio">
          <div className="space-y-4">

            <Field label="Nombre" hint="Entre 2 y 50 caracteres">
              <Input value={name} onChange={setName} placeholder="Tu nombre" maxLength={50} autoComplete="name" />
            </Field>

            <Field label="Email">
              <Input value={profile.email} onChange={() => {}} disabled type="email" />
              <p className="text-[11px] text-[#94A3B8] mt-1">
                {profile.isGoogleUser ? "Email vinculado a tu cuenta de Google. No se puede cambiar aquí." : "El cambio de email requiere verificación y estará disponible próximamente."}
              </p>
            </Field>

            <Field label="Bio" hint={`${bio.length}/160 caracteres`}>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder="Cuéntanos algo sobre ti…"
                maxLength={160}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[14px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none transition-all"
              />
            </Field>

            <div className="flex items-center justify-between pt-1">
              {identityDirty && (
                <p className="text-[12px] text-[#F97316] font-medium">Cambios sin guardar</p>
              )}
              <div className="ml-auto">
                <SaveBtn loading={identitySaving} onClick={saveIdentity} disabled={!identityDirty} />
              </div>
            </div>
          </div>
        </Section>

        {/* ── 2. CONTRASEÑA ───────────────────────────────────────────────── */}
        <Section
          collapsible
          defaultOpen={false}
          title="Cambiar contraseña"
          description={
            profile.isGoogleUser && !profile.avatarColor
              ? "Establece una contraseña para poder iniciar sesión con email también"
              : "Actualiza tu contraseña de acceso"
          }
        >
          <div className="space-y-4">

            {/* Current password — only if not a fresh Google-only user */}
            <Field label="Contraseña actual">
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPwd}
                  onChange={setCurrentPwd}
                  placeholder={profile.isGoogleUser ? "Deja vacío si es tu primera contraseña" : "Tu contraseña actual"}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((s) => !s)}
                  aria-label={showCurrent ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                >
                  {showCurrent ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </Field>

            <Field label="Nueva contraseña" hint="Mínimo 8 caracteres">
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={setNewPwd}
                  placeholder="Nueva contraseña"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  aria-label={showNew ? "Ocultar" : "Mostrar"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                >
                  {showNew ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Strength bar */}
              {newPwd.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div
                        key={lvl}
                        className="h-1.5 flex-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: lvl <= pwdStrength ? pwdStrengthColor : "#E2E8F0" }}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-semibold" style={{ color: pwdStrengthColor }}>
                    {pwdStrengthLabel}
                  </p>
                </div>
              )}
            </Field>

            <Field label="Confirmar nueva contraseña">
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPwd}
                  onChange={setConfirmPwd}
                  placeholder="Repite la nueva contraseña"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? "Ocultar" : "Mostrar"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                >
                  {showConfirm ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {confirmPwd && newPwd !== confirmPwd && (
                <p className="text-[11px] text-[#EF4444] mt-1">Las contraseñas no coinciden</p>
              )}
              {confirmPwd && newPwd === confirmPwd && newPwd.length >= 8 && (
                <p className="text-[11px] text-[#16A34A] mt-1">✓ Las contraseñas coinciden</p>
              )}
            </Field>

            <div className="flex justify-end pt-1">
              <SaveBtn
                loading={pwdSaving}
                label="Cambiar contraseña"
                onClick={changePassword}
                disabled={!newPwd || newPwd !== confirmPwd || newPwd.length < 8}
              />
            </div>
          </div>
        </Section>

        {/* ── 3. STATS ─────────────────────────────────────────────────────── */}
        <Section title="Tu actividad">
          <div className="flex flex-col sm:flex-row gap-4">
            {[
              { label: "Miembro desde", value: joinedDate, icon: "📅" },
              { label: "Email", value: profile.email, icon: "✉️" },
              { label: "Tipo de cuenta", value: profile.isGoogleUser ? "Google" : "Email", icon: profile.isGoogleUser ? "🔗" : "🔒" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 flex-1 bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#F1F5F9]">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">{s.label}</p>
                  <p className="text-[13px] font-semibold text-[#0F172A]">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 4. DANGER ZONE ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#FCA5A5] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#FEE2E2] bg-[#FFF5F5]">
            <h2 className="text-[15px] font-bold text-[#991B1B]">Zona de peligro</h2>
            <p className="text-[13px] text-[#B91C1C] mt-0.5">
              Estas acciones son irreversibles. Procede con cuidado.
            </p>
          </div>
          <div className="px-6 py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-[#0F172A]">Eliminar mi cuenta</p>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Se eliminarán permanentemente tu cuenta, productos guardados y alertas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors focus-visible:outline-2 focus-visible:outline-[#DC2626] focus-visible:outline-offset-2"
              >
                Eliminar cuenta
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── DELETE MODAL ──────────────────────────────────────────────────── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => { if (!deleteLoading) setShowDeleteModal(false); }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center text-2xl mx-auto mb-3">
                ⚠️
              </div>
              <h3 className="text-[16px] font-bold text-[#0F172A] text-center">¿Eliminar tu cuenta?</h3>
              <p className="text-[13px] text-[#64748B] text-center mt-1">
                Esta acción no se puede deshacer. Se eliminarán todos tus datos permanentemente.
              </p>
            </div>

            <div className="space-y-3">
              {/* Password confirmation — only if has password */}
              <Field label='Tu contraseña (si la tienes)' hint="Deja vacío si solo usas Google">
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={setDeletePassword}
                  placeholder="Contraseña actual"
                  autoComplete="current-password"
                />
              </Field>

              <Field label='Escribe "ELIMINAR" para confirmar'>
                <Input
                  value={deleteConfirmText}
                  onChange={setDeleteConfirmText}
                  placeholder="ELIMINAR"
                />
              </Field>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); setDeletePassword(""); }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleteConfirmText !== "ELIMINAR" || deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? "Eliminando…" : "Confirmar eliminación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </main>
  );
}
