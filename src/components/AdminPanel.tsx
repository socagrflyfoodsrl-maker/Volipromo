import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Booking } from "../types";
import { EmailAdminPanel } from "./EmailAdminPanel";
import { 
  Lock, 
  Unlock, 
  Calendar, 
  Users, 
  Euro, 
  Trash2, 
  RefreshCw, 
  Check, 
  CloudRain, 
  Settings, 
  Mail, 
  Database, 
  Scale, 
  LogOut, 
  BarChart3, 
  FileText, 
  Phone, 
  AlertCircle,
  Clock,
  Send
} from "lucide-react";

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"bookings" | "email" | "stats" | "settings">("bookings");
  
  // State for password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Search and filter inside bookings list
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending_weather">("all");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword.trim()) {
      setPasswordError("Inserisci la nuova password.");
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError("La nuova password deve contenere almeno 4 caratteri.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Le password inserite non coincidono.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": password
        },
        body: JSON.stringify({ newPassword: newPassword.trim() })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setPasswordSuccess("Password dell'area pilota aggiornata con successo!");
        sessionStorage.setItem("dune_admin_password", newPassword.trim());
        setPassword(newPassword.trim());
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setPasswordError(data.error || "Errore durante l'aggiornamento della password.");
      }
    } catch (err) {
      setPasswordError("Impossibile connettersi al server per modificare la password.");
      console.error(err);
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Load password from sessionStorage to prevent re-login on refresh
  useEffect(() => {
    const savedPass = sessionStorage.getItem("dune_admin_password");
    if (savedPass) {
      verifyPassword(savedPass);
    }
  }, []);

  const verifyPassword = async (passToVerify: string) => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passToVerify })
      });

      if (response.ok) {
        setIsAuthorized(true);
        sessionStorage.setItem("dune_admin_password", passToVerify);
        setPassword(passToVerify);
        fetchBookings(passToVerify);
      } else {
        let errMsg = "Password errata.";
        try {
          const data = await response.json();
          errMsg = data.error || errMsg;
        } catch (jsonErr) {
          console.error("Errore di parsing JSON nel login di errore:", jsonErr);
        }
        setError(errMsg);
        setIsAuthorized(false);
        sessionStorage.removeItem("dune_admin_password");
      }
    } catch (err: any) {
      setError(`Errore di connessione al server: ${err.message || "Impossibile contattare le API"}`);
      console.error("Errore di connessione al server nell'Area Pilota:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Inserisci la password.");
      return;
    }
    verifyPassword(password);
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    setPassword("");
    setBookings([]);
    sessionStorage.removeItem("dune_admin_password");
  };

  const fetchBookings = async (authPass: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/bookings", {
        headers: {
          "Authorization": authPass
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      } else {
        console.error("Non autorizzato a scaricare le prenotazioni.");
      }
    } catch (err) {
      console.error("Errore nel recupero delle prenotazioni:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, currentStatus: "confirmed" | "pending_weather") => {
    const nextStatus = currentStatus === "confirmed" ? "pending_weather" : "confirmed";
    try {
      const response = await fetch("/api/admin/bookings/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": password
        },
        body: JSON.stringify({ bookingId, status: nextStatus })
      });

      if (response.ok) {
        setBookings(prev => 
          prev.map(b => b.id === bookingId ? { ...b, status: nextStatus } : b)
        );
      } else {
        alert("Errore nell'aggiornamento dello stato.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm(`Sei sicuro di voler eliminare la prenotazione ${bookingId}?`)) return;

    try {
      const response = await fetch("/api/admin/bookings/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": password
        },
        body: JSON.stringify({ bookingId })
      });

      if (response.ok) {
        setBookings(prev => prev.filter(b => b.id !== bookingId));
      } else {
        alert("Errore nell'eliminazione.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Resend email notification
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{[key: string]: string}>({});

  const handleResendEmail = async (bookingId: string) => {
    setResendingId(bookingId);
    try {
      const res = await fetch("/api/email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setResendStatus(prev => ({ ...prev, [bookingId]: "Inviata!" }));
        setTimeout(() => {
          setResendStatus(prev => ({ ...prev, [bookingId]: "" }));
        }, 3000);
      } else {
        setResendStatus(prev => ({ ...prev, [bookingId]: data.error || "Errore" }));
        setTimeout(() => {
          setResendStatus(prev => ({ ...prev, [bookingId]: "" }));
        }, 4000);
      }
    } catch (e: any) {
      setResendStatus(prev => ({ ...prev, [bookingId]: "Errore" }));
      setTimeout(() => {
        setResendStatus(prev => ({ ...prev, [bookingId]: "" }));
      }, 4000);
    } finally {
      setResendingId(null);
    }
  };

  // Filter bookings based on search and status
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.phone.includes(searchTerm) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.experienceName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = (() => {
    const total = bookings.length;
    const revenue = bookings.reduce((sum, b) => sum + b.price, 0);
    const weights = bookings.map(b => b.weight).filter(w => w > 0);
    const avgWeight = weights.length > 0 ? Math.round(weights.reduce((sum, w) => sum + w, 0) / weights.length) : 0;
    
    const experiencesCount: { [key: string]: number } = {};
    bookings.forEach(b => {
      experiencesCount[b.experienceName] = (experiencesCount[b.experienceName] || 0) + 1;
    });
    
    let popularExp = "Nessuno";
    let maxCount = 0;
    Object.entries(experiencesCount).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        popularExp = name;
      }
    });

    return { total, revenue, avgWeight, popularExp };
  })();

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-900 text-white p-6 text-center border-b border-slate-800">
          <div className="w-12 h-12 bg-sky-600/10 rounded-2xl flex items-center justify-center text-sky-400 mx-auto mb-3 border border-sky-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-display font-bold">Accesso Amministratore</h3>
          <p className="text-xs text-slate-400 mt-1">
            Immetti la password amministratore di DuneAirPark
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">
              Password Amministratore
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-all font-mono"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
            Sblocca Pannello
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden max-w-7xl mx-auto">
      {/* Header Admin */}
      <div className="bg-slate-900 text-white px-6 py-6 md:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-sky-600/10">
            A
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-widest text-sky-400">Pannello Pilota Guarini</span>
            <h2 className="text-xl font-display font-black tracking-tight leading-none mt-1">DuneAirPark Admin</h2>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Tabs switch */}
          <div className="flex bg-slate-850 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === "bookings" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Database className="w-3.5 h-3.5" /> Prenotazioni
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === "stats" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Statistiche
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === "email" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Email SMTP
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === "settings" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Password
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-all ml-auto sm:ml-0"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin Body */}
      <div className="p-6 md:p-8">
        {/* TAB 1: BOOKINGS LIST */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            {/* Header Control row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-display font-bold text-slate-800">Tutti i Voli Prenotati</h3>
                <p className="text-xs text-slate-500 mt-0.5">Gestisci l'idoneità meteo, rinvia le conferme o cancella le prenotazioni.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Cerca per nome, email, codice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-sky-600 bg-white font-medium text-slate-700 min-w-[240px] transition-colors"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-colors"
                >
                  <option value="all">Tutti gli stati</option>
                  <option value="confirmed">Confermati</option>
                  <option value="pending_weather">Meteo Sospeso 🌦️</option>
                </select>

                <button
                  onClick={() => fetchBookings(password)}
                  className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl border border-slate-200 text-slate-600 transition-all flex items-center justify-center gap-1"
                  title="Aggiorna lista"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Bookings Table / List */}
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                <AlertCircle className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">Nessuna prenotazione trovata</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Nessun volo registrato corrisponde ai criteri di ricerca impostati.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-4 px-5">ID / Data Creazione</th>
                      <th className="py-4 px-5">Passeggero</th>
                      <th className="py-4 px-5">Esperienza Volo</th>
                      <th className="py-4 px-5">Orario Decollo</th>
                      <th className="py-4 px-5">Prezzo / Peso</th>
                      <th className="py-4 px-5">Stato Meteo</th>
                      <th className="py-4 px-5 text-right">Azioni Amministratore</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-5 font-mono">
                          <span className="font-bold text-slate-900 block">{b.id}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {new Date(b.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <strong className="text-slate-900 font-bold block">{b.name}</strong>
                          <div className="text-[11px] text-slate-500 flex flex-col gap-0.5 mt-0.5">
                            <span className="flex items-center gap-1">✉️ {b.email}</span>
                            <span className="flex items-center gap-1">📞 {b.phone}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5 font-medium text-slate-800">
                          {b.experienceName}
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <strong className="text-slate-800">{b.date}</strong>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 mt-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{b.timeSlot}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-sm font-black text-emerald-600 font-mono block">€{b.price}</span>
                          <span className="text-[10px] text-slate-550 flex items-center gap-1 mt-0.5">
                            <Scale className="w-3 h-3 text-slate-450" /> {b.weight} kg
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          {b.status === "confirmed" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Confermato
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-100 animate-pulse">
                              <CloudRain className="w-3 h-3 text-amber-500" />
                              Meteo Sospeso
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex gap-1.5 justify-end">
                            {/* Toggle safety status */}
                            <button
                              onClick={() => handleUpdateStatus(b.id, b.status)}
                              className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-0.5 ${
                                b.status === "confirmed"
                                  ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                              }`}
                              title={b.status === "confirmed" ? "Sospendi per Meteo" : "Conferma Volo"}
                            >
                              {b.status === "confirmed" ? <CloudRain className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                              <span className="hidden lg:inline">{b.status === "confirmed" ? "Sospendi" : "Conferma"}</span>
                            </button>

                            {/* Resend email */}
                            <button
                              disabled={resendingId === b.id}
                              onClick={() => handleResendEmail(b.id)}
                              className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-0.5 ${
                                resendStatus[b.id]
                                  ? "bg-slate-50 text-slate-800 border-slate-350"
                                  : "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"
                              }`}
                              title="Reinvia email di riepilogo"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">{resendStatus[b.id] || "Email"}</span>
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteBooking(b.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all"
                              title="Elimina prenotazione"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STATS SUMMARY */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <h3 className="text-lg font-display font-bold text-slate-800">Statistiche Aeroporto</h3>
            <p className="text-xs text-slate-500">Analisi del volume di volo, delle entrate di DuneAirPark e del bilanciamento del peso.</p>

            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-sky-50 border border-sky-150 p-6 rounded-2xl flex items-center justify-between">
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-sky-700 font-bold uppercase tracking-wider block">Voli Totali</span>
                  <span className="text-3xl font-black text-sky-950 font-mono block">{stats.total}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 border border-sky-200/20">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-150 p-6 rounded-2xl flex items-center justify-between">
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Entrate Stimate</span>
                  <span className="text-3xl font-black text-emerald-950 font-mono block">€{stats.revenue}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-200/20">
                  <Euro className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-150 p-6 rounded-2xl flex items-center justify-between">
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">Peso Medio Passeggero</span>
                  <span className="text-3xl font-black text-purple-950 font-mono block">{stats.avgWeight} kg</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 border border-purple-200/20">
                  <Scale className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-150 p-6 rounded-2xl flex items-center justify-between">
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">Rotta più Richiesta</span>
                  <span className="text-sm font-black text-amber-950 block truncate max-w-[160px]" title={stats.popularExp}>
                    {stats.popularExp}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-200/20">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* In-depth details */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Informativa Bilanciamento Carichi</h4>
              <p className="text-xs text-slate-650 leading-relaxed">
                Durante la pianificazione estiva del DuneAirPark, l'istruttore Guarini verifica che il peso medio di decollo non superi i limiti della cellula del velivolo ultraleggero. Il peso medio registrato per questa stagione è attualmente pari a <strong>{stats.avgWeight} kg</strong> per passeggero. Ciò consente una riserva di carburante ottimale per tratte a medio raggio come Alberobello e la costa adriatica.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: SMTP CONFIGURATION (EMBEDDED PANEL) */}
        {activeTab === "email" && (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-display font-bold text-slate-800">Infrastruttura di Notifica Email</h3>
              <p className="text-xs text-slate-500 mt-0.5">Configura il server SMTP reale per trasmettere i dettagli dei biglietti.</p>
            </div>
            
            <EmailAdminPanel />
          </div>
        )}

        {/* TAB 4: PASSWORD CHANGE */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h3 className="text-lg font-display font-bold text-slate-800">Modifica Password Area Pilota</h3>
              <p className="text-xs text-slate-500 mt-0.5">Aggiorna la chiave d'accesso per l'amministrazione e la gestione dei voli.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
              {passwordError && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-3 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">
                  Nuova Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-all font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">
                  Conferma Nuova Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {updatingPassword ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Aggiorna Password
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
