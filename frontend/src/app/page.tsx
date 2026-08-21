"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Filter, Calendar, FileText, ChevronDown, ChevronUp, Loader2, Users, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge/StatusBadge";
import { MinutesExportModal } from "@/components/organisms/MinutesExportModal/MinutesExportModal";

interface Evento {
  id: number;
  titolo: string;
  tipo: string;
  data_ora: string;
  modalita: string;
  soglia_consecutiva: number;
  is_attivo: boolean;
}

interface RosterMember {
  socio_id: number;
  nome: string;
  email: string;
  ruolo: string | null;
  area_lavoro: string | null;
  status: string;
  delega_a: string | null;
  durata_minuti: number;
  registrato_il: string | null;
  consecutive_absences: number;
  is_critical_alert: boolean;
}

interface EventRosterResponse {
  event_id: number;
  titolo: string;
  tipo: string;
  modalita: string;
  roster: RosterMember[];
}

export default function EventArchive() {
  const [events, setEvents] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  
  // Expanded event state
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  const [rosterData, setRosterData] = useState<EventRosterResponse | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  
  // Export Modal state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportEventId, setExportEventId] = useState<number | null>(null);
  const [exportEventTitle, setExportEventTitle] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("http://localhost:8000/api/events");
      if (!res.ok) throw new Error("Errore nel caricamento degli eventi");
      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || "Impossibile caricare gli eventi");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = async (eventId: number, eventTitle: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
      setRosterData(null);
      return;
    }

    setExpandedEventId(eventId);
    setRosterData(null);
    setLoadingRoster(true);

    try {
      const res = await fetch(`http://localhost:8000/api/events/${eventId}/roster`);
      if (!res.ok) throw new Error("Errore nel caricamento del roster dell'evento");
      const data = await res.json();
      setRosterData(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Errore nel caricamento dei dati di dettaglio");
    } finally {
      setLoadingRoster(false);
    }
  };

  const triggerExport = (eventId: number, eventTitle: string) => {
    setExportEventId(eventId);
    setExportEventTitle(eventTitle);
    setIsExportOpen(true);
  };

  // Filter events
  const filteredEvents = events.filter((evt) => {
    const matchesSearch = evt.titolo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "ALL" || evt.tipo === selectedType;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to get stats from roster
  const getRosterStats = (members: RosterMember[]) => {
    const total = members.length;
    const present = members.filter((m) => m.status === "IN_PRESENZA" || m.status === "ONLINE").length;
    const excused = members.filter((m) => m.status === "GIUSTIFICATO" || m.status === "ASSENTE_GIUSTIFICATO").length;
    const absent = total - present - excused;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, excused, absent, rate };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Archivio Eventi
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Consulta la cronologia degli eventi passati, monitora le presenze e scarica i verbali ufficiali delle assemblee
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Cerca evento per titolo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <span className="hidden sm:inline-flex items-center text-sm text-gray-500 dark:text-zinc-400 gap-1.5 font-medium">
              <Filter className="h-4 w-4" /> Filtra:
            </span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Tutti i tipi</option>
              <option value="ASSEMBLEA">Assemblee</option>
              <option value="FORMAZIONE">Formazione</option>
              <option value="TEAM_BUILDING">Team Building</option>
              <option value="CONSIGLIO">Consigli di Amministrazione</option>
            </select>
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="text-sm font-semibold text-gray-500 dark:text-zinc-400">Caricamento eventi in corso...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-100 border border-red-200 dark:bg-red-950/20 dark:border-red-900 text-red-700 dark:text-red-300 rounded text-sm font-medium">
            {error}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-300 dark:border-zinc-800 rounded-lg">
            <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Nessun evento corrisponde ai criteri impostati.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((evt) => {
              const isExpanded = expandedEventId === evt.id;
              return (
                <div
                  key={evt.id}
                  className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden transition-all shadow-sm"
                >
                  {/* Collapsed Header */}
                  <div
                    onClick={() => handleToggleExpand(evt.id, evt.titolo)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-850 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {evt.titolo}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                          <span className="font-semibold">{formatDate(evt.data_ora)}</span>
                          <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                          <span>Modalità: {evt.modalita}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                        evt.tipo === "ASSEMBLEA"
                          ? "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50"
                          : evt.tipo === "FORMAZIONE"
                          ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50"
                          : "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                      }`}>
                        {evt.tipo}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-zinc-800 p-6 bg-gray-50/50 dark:bg-zinc-900/20 space-y-6">
                      {loadingRoster ? (
                        <div className="flex items-center justify-center py-8 gap-2">
                          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                          <span className="text-sm font-semibold text-gray-500 dark:text-zinc-400">
                            Caricamento dati di dettaglio...
                          </span>
                        </div>
                      ) : rosterData ? (
                        <>
                          {/* Roster Stats Cards */}
                          {(() => {
                            const stats = getRosterStats(rosterData.roster);
                            return (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-lg">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Tasso Presenze</p>
                                    <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{stats.rate}%</p>
                                  </div>
                                  <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-lg">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Presenti</p>
                                    <p className="text-xl font-extrabold text-green-600 dark:text-green-400 mt-1">{stats.present} / {stats.total}</p>
                                  </div>
                                  <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-lg">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Giustificati</p>
                                    <p className="text-xl font-extrabold text-yellow-600 dark:text-yellow-400 mt-1">{stats.excused}</p>
                                  </div>
                                  <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-lg">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Assenti</p>
                                    <p className="text-xl font-extrabold text-red-600 dark:text-red-400 mt-1">{stats.absent}</p>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center justify-between bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-lg gap-4">
                                  <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300 font-semibold">
                                    <LayoutDashboard className="h-4 w-4 text-blue-500" />
                                    <span>Visualizza i dettagli delle presenze e gestisci l'evento dal vivo.</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Link href={`/dashboard?event_id=${evt.id}`}>
                                      <Button
                                        variant="primary"
                                        className="gap-2 text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                                      >
                                        <LayoutDashboard className="h-4 w-4" /> Apri Registro Live
                                      </Button>
                                    </Link>
                                    {evt.tipo === "ASSEMBLEA" && (
                                      <Button
                                        variant="success"
                                        onClick={() => triggerExport(evt.id, evt.titolo)}
                                        className="gap-2 text-xs py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white font-medium"
                                      >
                                        <FileText className="h-4 w-4" /> Esporta Verbale
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Roster detail divided by status */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Presenti Column */}
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg flex flex-col">
                              <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-850/50 rounded-t-lg">
                                <h4 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex justify-between items-center">
                                  Presenti
                                  <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 py-0.5 px-2 rounded-full text-[10px]">
                                    {rosterData.roster.filter(m => m.status === "IN_PRESENZA" || m.status === "ONLINE").length}
                                  </span>
                                </h4>
                              </div>
                              <div className="p-4 flex-1 flex flex-col gap-3">
                                {rosterData.roster.filter(m => m.status === "IN_PRESENZA" || m.status === "ONLINE").length === 0 ? (
                                  <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-4 italic">Nessun presente</p>
                                ) : (
                                  rosterData.roster.filter(m => m.status === "IN_PRESENZA" || m.status === "ONLINE").map(m => (
                                    <div key={m.socio_id} className="p-3 border border-gray-100 dark:border-zinc-800 rounded-lg hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <p className="font-bold text-sm text-gray-900 dark:text-white">{m.nome}</p>
                                          <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{m.email}</p>
                                        </div>
                                        <StatusBadge status={m.status as any} />
                                      </div>
                                      <div className="flex justify-between items-end mt-3 text-xs">
                                        <span className="text-gray-500 dark:text-zinc-400 font-mono">Presente ({m.durata_minuti} min)</span>
                                        <span className="text-gray-400 dark:text-zinc-500 font-semibold">{m.registrato_il ? formatDate(m.registrato_il) : "-"}</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Giustificati Column */}
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg flex flex-col">
                              <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-850/50 rounded-t-lg">
                                <h4 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex justify-between items-center">
                                  Giustificati
                                  <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 py-0.5 px-2 rounded-full text-[10px]">
                                    {rosterData.roster.filter(m => m.status === "GIUSTIFICATO" || m.status === "ASSENTE_GIUSTIFICATO").length}
                                  </span>
                                </h4>
                              </div>
                              <div className="p-4 flex-1 flex flex-col gap-3">
                                {rosterData.roster.filter(m => m.status === "GIUSTIFICATO" || m.status === "ASSENTE_GIUSTIFICATO").length === 0 ? (
                                  <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-4 italic">Nessun giustificato</p>
                                ) : (
                                  rosterData.roster.filter(m => m.status === "GIUSTIFICATO" || m.status === "ASSENTE_GIUSTIFICATO").map(m => (
                                    <div key={m.socio_id} className="p-3 border border-gray-100 dark:border-zinc-800 rounded-lg hover:border-yellow-200 dark:hover:border-yellow-900/30 transition-colors">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <p className="font-bold text-sm text-gray-900 dark:text-white">{m.nome}</p>
                                          <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{m.email}</p>
                                        </div>
                                        <StatusBadge status={m.status as any} />
                                      </div>
                                      <div className="flex justify-between items-end mt-3 text-xs">
                                        <div className="text-gray-500 dark:text-zinc-400 font-mono">
                                          {m.delega_a ? (
                                            <span className="text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 px-1.5 py-0.5 rounded font-medium">
                                              Delega a: {m.delega_a}
                                            </span>
                                          ) : (
                                            <span>Senza delega</span>
                                          )}
                                        </div>
                                        <span className="text-gray-400 dark:text-zinc-500 font-semibold">{m.registrato_il ? formatDate(m.registrato_il) : "-"}</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Assenti Column */}
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg flex flex-col">
                              <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-850/50 rounded-t-lg">
                                <h4 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex justify-between items-center">
                                  Assenti
                                  <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 py-0.5 px-2 rounded-full text-[10px]">
                                    {rosterData.roster.filter(m => m.status !== "IN_PRESENZA" && m.status !== "ONLINE" && m.status !== "GIUSTIFICATO" && m.status !== "ASSENTE_GIUSTIFICATO").length}
                                  </span>
                                </h4>
                              </div>
                              <div className="p-4 flex-1 flex flex-col gap-3">
                                {rosterData.roster.filter(m => m.status !== "IN_PRESENZA" && m.status !== "ONLINE" && m.status !== "GIUSTIFICATO" && m.status !== "ASSENTE_GIUSTIFICATO").length === 0 ? (
                                  <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-4 italic">Nessun assente</p>
                                ) : (
                                  rosterData.roster.filter(m => m.status !== "IN_PRESENZA" && m.status !== "ONLINE" && m.status !== "GIUSTIFICATO" && m.status !== "ASSENTE_GIUSTIFICATO").map(m => (
                                    <div key={m.socio_id} className="p-3 border border-gray-100 dark:border-zinc-800 rounded-lg hover:border-red-200 dark:hover:border-red-900/30 transition-colors">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <p className="font-bold text-sm text-gray-900 dark:text-white">{m.nome}</p>
                                          <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{m.email}</p>
                                        </div>
                                        <StatusBadge status={m.status as any} />
                                      </div>
                                      <div className="flex justify-between items-end mt-3 text-xs">
                                        <span className="text-red-600 dark:text-red-400 font-medium">Assente ingiustificato</span>
                                        <span className="text-gray-400 dark:text-zinc-500 font-semibold">{m.registrato_il ? formatDate(m.registrato_il) : "-"}</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-center text-gray-550">Errore nel caricamento del roster.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Minutes Export Modal */}
      {exportEventId && (
        <MinutesExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          eventId={exportEventId}
          eventTitle={exportEventTitle}
        />
      )}
    </div>
  );
}
