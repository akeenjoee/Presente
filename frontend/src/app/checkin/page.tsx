"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { getAuthHeaders } from "@/lib/msal";
import { Button } from "@/components/atoms/Button/Button";
import {
  UserCheck,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  UserCircle,
  QrCode,
  Wifi,
  MapPin,
  Loader2,
} from "lucide-react";

interface RegistryMember {
  socio_id: number;
  nome: string;
  email: string;
}

interface EventInfo {
  id: number;
  titolo: string;
  tipo: string;
  modalita: string;
  is_attivo: boolean;
}

function CheckInContent() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("event_id");

  const { data: session, status } = useSession();
  const [registry, setRegistry] = useState<RegistryMember[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [modality, setModality] = useState<"IN_PRESENZA" | "ONLINE">("IN_PRESENZA");
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [eventLoading, setEventLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const loadEvent = async () => {
      if (!eventIdParam) return;
      try {
        setEventLoading(true);
        const res = await fetch(`http://localhost:8000/api/events/${eventIdParam}`);
        if (res.ok) {
          const data = await res.json();
          setEventInfo(data);
          if (data.modalita === "ONLINE_ONLY") setModality("ONLINE");
          else setModality("IN_PRESENZA");
        }
      } catch {
        // non blocca il flusso, mostrerà solo "Evento #ID"
      } finally {
        setEventLoading(false);
      }
    };

    const loadRegistry = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/streaks");
        if (res.ok) {
          const data = await res.json();
          const list: RegistryMember[] = data.map((m: any) => ({
            socio_id: m.socio_id,
            nome: m.nome,
            email: m.email,
          }));
          list.sort((a, b) => a.nome.localeCompare(b.nome));
          setRegistry(list);
          if (list.length > 0) setSelectedEmail(list[0].email);
        }
      } catch {
        console.error("Failed to load member registry");
      }
    };

    loadEvent();
    loadRegistry();
  }, [eventIdParam]);

  const handleLogout = () => {
    signOut();
    setSuccess(false);
    setError("");
  };

  const handleConfirmPresence = async () => {
    if (!eventIdParam) {
      setError("Parametri non validi. Riscansiona il codice QR.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const tokenStr = searchParams?.get("token") || "";
      const token = (session as any)?.idToken;
      const res = await fetch("http://localhost:8000/api/checkin", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          event_id: Number(eventIdParam),
          modalita: modality,
          token: tokenStr
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Errore durante il check-in");
      }

      setSuccess(true);
      setSuccessMsg(
        `Presenza registrata alle ${new Date().toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        })}!`
      );
    } catch (err: any) {
      setError(err.message || "Impossibile registrare la presenza.");
    } finally {
      setLoading(false);
    }
  };

  // ── 1. No event_id in URL ─────────────────────────────────────────
  if (!eventIdParam) {
    return (
      <div className="max-w-md w-full mx-auto my-12 p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-sm text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-4">
          Link QR Non Valido
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Questo link non contiene le informazioni sull&apos;evento. Inquadra il
          codice QR proiettato dall&apos;amministratore.
        </p>
      </div>
    );
  }

  // ── 2. Not logged in — SSO ───────────────────────────────────
  if (!session) {
    return (
      <div className="max-w-md w-full mx-auto my-12 p-10 bg-white rounded-xl shadow-2xl text-center">
        <div className="flex justify-center mb-5">
           {/* Placeholder for Logo, using Lucide for now */}
           <div className="p-3 border border-[#2b397c] rounded-full">
             <QrCode className="h-8 w-8 text-[#2b397c]" />
           </div>
        </div>
        
        <h2 className="text-2xl font-bold text-[#1f295c] mb-1 tracking-tight">
          Presente!
        </h2>
        
        {!eventLoading && eventInfo ? (
          <p className="text-sm font-medium text-gray-500 mb-8">
            {eventInfo.titolo}
          </p>
        ) : (
          <p className="text-sm text-gray-500 mb-8">
            Check-in Assemblea
          </p>
        )}

        <div className="bg-gray-50 text-gray-700 text-[13px] font-medium py-3 px-4 rounded-lg mb-8 flex items-center justify-center gap-2 border border-gray-100 shadow-sm">
           <ShieldAlert className="h-4 w-4 text-[#1f295c]" />
           Utilizza il tuo account <strong>JEMORE</strong> per confermare la presenza.
        </div>

        <button 
          onClick={() => signIn("azure-ad")}
          className="w-full bg-[#2b397c] hover:bg-[#1f295c] text-white py-3 rounded-md font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
          </svg>
          Accedi con Microsoft
        </button>

        <p className="text-[11px] text-gray-400 mt-10">
          L'accesso è riservato ai soci JEMORE.
        </p>
      </div>
    );
  }

  // ── 3. Success ────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-md w-full mx-auto my-12 p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-sm text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto animate-bounce" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-4">
          Presenza Registrata!
        </h2>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
          {successMsg}
        </p>

        <div className="mt-6 border border-gray-100 dark:border-zinc-800 rounded-lg bg-gray-50 dark:bg-zinc-950 p-4 text-left text-sm space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Riepilogo
          </p>
          <p>
            <span className="text-xs text-gray-500 font-semibold">Socio: </span>
            <span className="font-bold text-gray-900 dark:text-white">{session.user?.name}</span>
          </p>
          {eventInfo && (
            <p>
              <span className="text-xs text-gray-500 font-semibold">Evento: </span>
              <span className="font-bold text-gray-900 dark:text-white">{eventInfo.titolo}</span>
            </p>
          )}
          <p>
            <span className="text-xs text-gray-500 font-semibold">Modalità: </span>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                modality === "IN_PRESENZA"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-purple-600 dark:text-purple-400"
              }`}
            >
              {modality === "IN_PRESENZA" ? (
                <><MapPin className="h-3 w-3" /> In Presenza</>
              ) : (
                <><Wifi className="h-3 w-3" /> Online</>
              )}
            </span>
          </p>
        </div>

        <button
          onClick={() => { setSuccess(false); setError(""); }}
          className="mt-5 text-xs text-blue-500 hover:underline font-medium"
        >
          Registra un&apos;altra presenza
        </button>
      </div>
    );
  }

  // ── 4. Conferma presenza ──────────────────────────────────────────
  const isOnlineOnly = eventInfo?.modalita === "ONLINE_ONLY";
  const isInPersonOnly = eventInfo?.modalita === "IN_PERSON_ONLY";

  return (
    <div className="max-w-md w-full mx-auto my-12 p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-sm">
      {/* User bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-4 mb-5">
        <div className="flex items-center gap-2 text-sm">
          <UserCircle className="h-5 w-5 text-gray-400" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{session.user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{session.user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} title="Cambia profilo" className="text-gray-400 hover:text-red-500">
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 mb-4 bg-red-100 border border-red-200 dark:bg-red-950/20 dark:border-red-900 text-red-700 dark:text-red-300 rounded text-xs font-semibold flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5">
        {/* Event card */}
        <div className="bg-gray-50 dark:bg-zinc-950 p-4 border border-gray-200 dark:border-zinc-800 rounded">
          <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">
            Evento
          </span>
          {eventLoading ? (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Caricamento...
            </div>
          ) : eventInfo ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {eventInfo.titolo}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold">
                  {eventInfo.tipo}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 font-semibold">
                  {eventInfo.modalita === "HYBRID"
                    ? "Ibrida"
                    : eventInfo.modalita === "IN_PERSON_ONLY"
                    ? "In Presenza"
                    : "Online"}
                </span>
              </div>
            </>
          ) : (
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              Evento #{eventIdParam}
            </h2>
          )}
        </div>

        {/* Modality selector — only for hybrid events */}
        {!isOnlineOnly && !isInPersonOnly && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
              Come partecipi?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setModality("IN_PRESENZA")}
                className={`py-3 px-4 border rounded font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                  modality === "IN_PRESENZA"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                    : "border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                <MapPin className="h-4 w-4" /> In Presenza
              </button>
              <button
                onClick={() => setModality("ONLINE")}
                className={`py-3 px-4 border rounded font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                  modality === "ONLINE"
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400"
                    : "border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                <Wifi className="h-4 w-4" /> Online
              </button>
            </div>
          </div>
        )}

        {/* Auto-mode badge */}
        {(isOnlineOnly || isInPersonOnly) && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
            {isOnlineOnly ? <Wifi className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            Evento {isOnlineOnly ? "Online" : "In Presenza"} — modalità impostata automaticamente.
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={handleConfirmPresence}
          variant="success"
          isLoading={loading}
          className="w-full py-3 text-sm font-bold gap-2"
        >
          <UserCheck className="h-4 w-4" /> Conferma Presenza
        </Button>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center min-h-screen p-6 bg-[#253264]">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-white text-sm">
            <Loader2 className="h-5 w-5 animate-spin" /> Caricamento...
          </div>
        }
      >
        <CheckInContent />
      </Suspense>
    </main>
  );
}
