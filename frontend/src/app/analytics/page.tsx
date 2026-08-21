"use client";

import React, { useEffect, useState } from "react";
import { Search, Filter, ArrowUpDown, AlertCircle, AlertTriangle, CheckCircle, Loader2, Users, FileSpreadsheet, ShieldAlert } from "lucide-react";

interface MemberAnalytics {
  socio_id: number;
  nome: string;
  email: string;
  ruolo: string | null;
  area_lavoro: string | null;
  total_events_held: number;
  total_attendances: number;
  total_absences: number;
  global_attendance_pct: number;
  assembly_events_held: number;
  assembly_attendances: number;
  assembly_absences: number;
  missed_assembly_names: string[];
  assembly_consecutive_streak: number;
  warning_level: "NORMAL" | "PRE_ALERT" | "CRITICAL";
}

type SortField = "nome" | "global_attendance_pct" | "assembly_absences";
type SortOrder = "asc" | "desc";

export default function MemberAnalyticsPage() {
  const [analytics, setAnalytics] = useState<MemberAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarningLevel, setSelectedWarningLevel] = useState<string>("ALL");
  const [selectedArea, setSelectedArea] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("nome");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // CSV Import State
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    added: number;
    updated: number;
    active: number;
    alumni: number;
  } | null>(null);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/members/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Errore durante l'importazione del CSV");
      }

      setImportResult(data.summary);
      // Refresh the analytics table
      fetchAnalytics();
      
      // Auto clear result banner after 12 seconds
      setTimeout(() => {
        setImportResult(null);
      }, 12000);
    } catch (err: any) {
      setError(err.message || "Impossibile importare il file CSV");
    } finally {
      setImporting(false);
      // Reset file input value to allow uploading the same file again
      e.target.value = "";
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("http://localhost:8000/api/members/analytics");
      if (!res.ok) throw new Error("Errore durante il recupero dei dati analitici");
      const data = await res.json();
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || "Impossibile caricare le statistiche dei soci");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc"); // Default to desc for stats, asc for name
    }
  };

  // Get unique areas for filter
  const uniqueAreas = Array.from(
    new Set(analytics.map((a) => a.area_lavoro).filter(Boolean))
  ) as string[];

  // Filter & Sort
  const processedAnalytics = analytics
    .filter((member) => {
      const matchesSearch =
        member.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWarning =
        selectedWarningLevel === "ALL" || member.warning_level === selectedWarningLevel;
      const matchesArea =
        selectedArea === "ALL" || member.area_lavoro === selectedArea;
      return matchesSearch && matchesWarning && matchesArea;
    })
    .sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "nome") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // Calculate high-level KPIs
  const totalCount = analytics.length;
  const criticalCount = analytics.filter((a) => a.warning_level === "CRITICAL").length;
  const preAlertCount = analytics.filter((a) => a.warning_level === "PRE_ALERT").length;
  const normalCount = analytics.filter((a) => a.warning_level === "NORMAL").length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Analisi Membri
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Monitora il tasso di partecipazione dei soci, le assenze consecutive e le soglie di alert statutarie
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              id="csv-upload-input"
              className="hidden"
              onChange={handleCsvUpload}
              disabled={importing}
            />
            <label
              htmlFor="csv-upload-input"
              className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-805 rounded text-sm font-semibold shadow-xs transition-colors ${
                importing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 text-blue-505" />
              )}
              {importing ? "Importazione..." : "Importa Soci da CSV"}
            </label>
          </div>
        </div>

        {/* Success / Alert Banner */}
        {importResult && (
          <div className="p-4 bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900 rounded-lg flex items-start gap-3 shadow-xs">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-green-800 dark:text-green-300">
                Importazione completata con successo!
              </h3>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                Aggiunti: <span className="font-bold">{importResult.added}</span> nuovi soci | Aggiornati:{" "}
                <span className="font-bold">{importResult.updated}</span> esistenti (Soci Attivi:{" "}
                <span className="font-bold">{importResult.active}</span>, Alumni:{" "}
                <span className="font-bold">{importResult.alumni}</span>)
              </p>
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-xs font-bold uppercase"
            >
              Chiudi
            </button>
          </div>
        )}

        {/* Dashboard KPIs */}
        {!loading && !error && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-lg flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-full">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Soci Attivi</p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{totalCount}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-lg flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-green-50 dark:bg-green-950/40 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Regolare</p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{normalCount}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-lg flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/45 rounded-full">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-450" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Alert</p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{preAlertCount}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-lg flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-full">
                <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">Critica</p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{criticalCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filter controls */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Cerca socio per nome o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Warning:</span>
              <select
                value={selectedWarningLevel}
                onChange={(e) => setSelectedWarningLevel(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">Tutti</option>
                <option value="NORMAL">Regolare</option>
                <option value="PRE_ALERT">Alert</option>
                <option value="CRITICAL">Critica</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Area:</span>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">Tutte</option>
                {uniqueAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Analytics Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="text-sm font-semibold text-gray-500 dark:text-zinc-400">Analisi dati in corso...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-100 border border-red-200 dark:bg-red-950/20 dark:border-red-900 text-red-700 dark:text-red-300 rounded text-sm font-medium">
            {error}
          </div>
        ) : processedAnalytics.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-300 dark:border-zinc-800 rounded-lg">
            <Users className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Nessun socio corrisponde ai filtri selezionati.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                <thead className="bg-gray-50 dark:bg-zinc-850">
                  <tr>
                    <th
                      scope="col"
                      onClick={() => handleSort("nome")}
                      className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-1">
                        Socio <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      Ruolo / Area
                    </th>

                    <th
                      scope="col"
                      onClick={() => handleSort("assembly_absences")}
                      className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-1">
                        Assenze Assemblea <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      Stato di Alert
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800 text-sm">
                  {processedAnalytics.map((member) => (
                    <tr
                      key={member.socio_id}
                      className={`hover:bg-gray-50 dark:hover:bg-zinc-800/20 ${
                        member.warning_level === "CRITICAL"
                          ? "bg-red-500/5 hover:bg-red-500/10"
                          : member.warning_level === "PRE_ALERT"
                          ? "bg-yellow-500/5 hover:bg-yellow-500/10"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 dark:text-white">{member.nome}</span>
                          <span className="text-xs text-gray-500 dark:text-zinc-400">{member.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 dark:text-zinc-200 text-xs">
                            {member.ruolo || "Socio"}
                          </span>
                          <span className="text-xs text-gray-400">{member.area_lavoro || "-"}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center sm:text-left">
                        <div className="flex flex-col items-center sm:items-start gap-1">
                          <div>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              member.assembly_absences >= 2
                                ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                                : member.assembly_absences === 1
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300"
                                : "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                            }`}>
                              {member.assembly_absences} assenze
                            </span>
                            <span className="text-xs text-gray-400 ml-1.5 font-mono">
                              (su {member.assembly_events_held})
                            </span>
                          </div>
                          {member.missed_assembly_names && member.missed_assembly_names.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.missed_assembly_names.map((name, idx) => (
                                <span key={idx} className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 px-1.5 py-0.5 rounded-sm">
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.warning_level === "CRITICAL" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/50">
                            <AlertCircle className="h-3 w-3" /> Critica
                          </span>
                        ) : member.warning_level === "PRE_ALERT" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-305 border border-yellow-200 dark:border-yellow-800/50">
                            <AlertTriangle className="h-3 w-3" /> Alert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800/50">
                            <CheckCircle className="h-3 w-3" /> Regolare
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
