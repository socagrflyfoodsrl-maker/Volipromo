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
  Send,
  Camera,
  Upload,
  Plus,
  Image as ImageIcon,
  X
} from "lucide-react";

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"bookings" | "email" | "stats" | "settings" | "gallery">("bookings");

  // State for Gallery Management
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [gallerySuccess, setGallerySuccess] = useState("");
  
  // New Photo fields
  const [photoSrc, setPhotoSrc] = useState("");
  const [photoCategory, setPhotoCategory] = useState<"campo" | "territorio" | "voli">("voli");
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoDescription, setPhotoDescription] = useState("");
  const [photoTag, setPhotoTag] = useState("In Volo");
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  
  // State for password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Search and filter inside bookings list
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending_weather">("all");

  // State for Flight Suspension Modal
  const [suspendModalBooking, setSuspendModalBooking] = useState<Booking | null>(null);
  const [suspendReasonType, setSuspendReasonType] = useState<"meteo" | "altro">("meteo");
  const [suspendCustomReason, setSuspendCustomReason] = useState("");
  const [suspendCustomNote, setSuspendCustomNote] = useState("");
  const [suspendSendEmail, setSuspendSendEmail] = useState(true);
  const [suspendingLoading, setSuspendingLoading] = useState(false);
  const [suspendSuccessMsg, setSuspendSuccessMsg] = useState("");

  const openSuspendModal = (b: Booking) => {
    setSuspendModalBooking(b);
    setSuspendReasonType("meteo");
    setSuspendCustomReason("");
    setSuspendCustomNote("");
    setSuspendSendEmail(true);
    setSuspendSuccessMsg("");
  };

  const handleConfirmSuspension = async () => {
    if (!suspendModalBooking) return;
    setSuspendingLoading(true);
    setSuspendSuccessMsg("");

    try {
      const response = await fetch("/api/admin/bookings/suspend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": password
        },
        body: JSON.stringify({
          bookingId: suspendModalBooking.id,
          reason: suspendReasonType,
          customReason: suspendCustomReason,
          customNote: suspendCustomNote,
          sendEmail: suspendSendEmail
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setBookings(prev =>
          prev.map(b => b.id === suspendModalBooking.id ? { ...b, status: "pending_weather" } : b)
        );
        setSuspendSuccessMsg(data.message || "Sospensione registrata ed email inviata con successo!");
        setTimeout(() => {
          setSuspendModalBooking(null);
          setSuspendSuccessMsg("");
        }, 1800);
      } else {
        alert(data.error || "Errore durante la sospensione del volo.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Errore di connessione durante la sospensione del volo.");
    } finally {
      setSuspendingLoading(false);
    }
  };

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

  const handleResetPasswordToDefault = async () => {
    if (!window.confirm("Sei sicuro di voler ripristinare la password predefinita 'dune2026'?")) return;
    setPasswordError("");
    setPasswordSuccess("");
    setUpdatingPassword(true);

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPasswordSuccess("Password ripristinata con successo a 'dune2026'!");
        sessionStorage.setItem("dune_admin_password", "dune2026");
        setPassword("dune2026");
        setNewPassword("");
        setConfirmNewPassword("");
        setError("");
        setIsAuthorized(true);
      } else {
        setPasswordError(data.error || "Errore durante il ripristino della password.");
      }
    } catch (err) {
      setPasswordError("Impossibile connettersi al server per ripristinare la password.");
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

  const fetchGalleryImages = async () => {
    setGalleryLoading(true);
    setGalleryError("");
    try {
      const response = await fetch("/api/gallery");
      if (response.ok) {
        const data = await response.json();
        setGalleryImages(data.images || []);
      } else {
        setGalleryError("Impossibile caricare le foto della galleria.");
      }
    } catch (err) {
      setGalleryError("Errore di connessione durante il caricamento della galleria.");
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalleryError("");
    setGallerySuccess("");
    
    if (!photoSrc.trim()) {
      setGalleryError("Specificare un'immagine (tramite file o URL).");
      return;
    }
    if (!photoTitle.trim()) {
      setGalleryError("Inserire un titolo per l'immagine.");
      return;
    }
    if (!photoDescription.trim()) {
      setGalleryError("Inserire una breve descrizione per l'immagine.");
      return;
    }
    if (!photoTag.trim()) {
      setGalleryError("Inserire una targhetta per l'immagine (es. 'In Volo').");
      return;
    }

    setSubmittingPhoto(true);
    try {
      const response = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": password
        },
        body: JSON.stringify({
          src: photoSrc,
          category: photoCategory,
          title: photoTitle,
          description: photoDescription,
          tag: photoTag
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setGallerySuccess("Foto inserita con successo nella galleria!");
        setPhotoSrc("");
        setPhotoTitle("");
        setPhotoDescription("");
        setPhotoTag("In Volo");
        fetchGalleryImages();
        
        // Dispatch event to reload public gallery if active on page
        window.dispatchEvent(new Event("reload-gallery"));
      } else {
        setGalleryError(data.error || "Errore nel salvataggio dell'immagine.");
      }
    } catch (err) {
      setGalleryError("Errore di connessione al server.");
      console.error(err);
    } finally {
      setSubmittingPhoto(false);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!window.confirm("Sei sicuro di voler rimuovere questa foto dalla galleria?")) return;

    setGalleryLoading(true);
    try {
      const response = await fetch(`/api/admin/gallery/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": password
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setGalleryImages(prev => prev.filter(img => img.id !== id));
        window.dispatchEvent(new Event("reload-gallery"));
      } else {
        alert(data.error || "Impossibile rimuovere la foto.");
      }
    } catch (err) {
      console.error(err);
      alert("Errore di connessione.");
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setGalleryError("Il file immagine è troppo grande (max 5MB).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setPhotoSrc(reader.result);
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        const formattedTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        if (!photoTitle) setPhotoTitle(formattedTitle);
      }
    };
    reader.onerror = () => {
      setGalleryError("Errore durante la lettura del file.");
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isAuthorized && activeTab === "gallery") {
      fetchGalleryImages();
    }
  }, [isAuthorized, activeTab]);

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
          <div className="mt-3 inline-block bg-sky-950/80 border border-sky-500/30 text-sky-300 px-3 py-1 rounded-full text-[11px] font-mono font-medium">
            🔑 Password predefinita: <strong className="text-white font-bold">dune2026</strong>
          </div>
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

          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={handleResetPasswordToDefault}
              disabled={updatingPassword}
              className="text-[11px] text-slate-500 hover:text-sky-700 font-medium underline transition-colors cursor-pointer"
            >
              Problemi di accesso? Ripristina password predefinita (dune2026)
            </button>
          </div>
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
            <span className="text-[9px] uppercase font-bold tracking-widest text-sky-400">Pannello Pilota</span>
            <h2 className="text-xl font-display font-black tracking-tight leading-none mt-1">DuneAirPark Admin</h2>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Tabs switch */}
          <div className="flex flex-wrap gap-1 bg-slate-850 p-1 rounded-xl border border-slate-800">
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
              onClick={() => setActiveTab("gallery")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === "gallery" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Galleria Foto
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
                            <span className="flex items-center gap-1 text-sky-700 font-medium">👨‍✈️ {b.instructor || "Francesco Guarini"}</span>
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
                          <div className="flex gap-1.5 justify-end flex-wrap">
                            {/* Suspend or Confirm status action */}
                            {b.status === "confirmed" ? (
                              <button
                                onClick={() => openSuspendModal(b)}
                                className="p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 cursor-pointer"
                                title="Sospendi volo per meteo o altro e invia notifica"
                              >
                                <CloudRain className="w-3.5 h-3.5 text-amber-600" />
                                <span>Sospendi</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(b.id, b.status)}
                                  className="p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                                  title="Ripristina volo confermato"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Conferma</span>
                                </button>
                                <button
                                  onClick={() => openSuspendModal(b)}
                                  className="p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 cursor-pointer"
                                  title="Reinvia/Modifica email di notifica sospensione"
                                >
                                  <Send className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Email Sospensione</span>
                                </button>
                              </>
                            )}

                            {/* Resend regular confirmation email */}
                            <button
                              disabled={resendingId === b.id}
                              onClick={() => handleResendEmail(b.id)}
                              className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-0.5 cursor-pointer ${
                                resendStatus[b.id]
                                  ? "bg-slate-50 text-slate-800 border-slate-350"
                                  : "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"
                              }`}
                              title="Reinvia email di conferma regolare"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">{resendStatus[b.id] || "Email Conferma"}</span>
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteBooking(b.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all cursor-pointer"
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
                Durante la pianificazione estiva del DuneAirPark, il pilota istruttore verifica che il peso medio di decollo non superi i limiti della cellula del velivolo ultraleggero. Il peso medio registrato per questa stagione è attualmente pari a <strong>{stats.avgWeight} kg</strong> per passeggero. Ciò consente una riserva di carburante ottimale per tratte a medio raggio come Alberobello e la costa adriatica.
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

        {/* TAB: GALLERY MANAGEMENT */}
        {activeTab === "gallery" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-lg font-display font-bold text-slate-800">Gestione Galleria Fotografica</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                La "Galleria" pubblica del DuneAirPark si aggiornerà in tempo reale. Carica nuovi scatti o rimuovi le foto esistenti.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form to Add Photo */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-5 h-fit">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200 uppercase tracking-wider">
                  <Plus className="w-4 h-4 text-sky-600" />
                  Inserisci Nuova Foto
                </h4>

                {galleryError && (
                  <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{galleryError}</span>
                  </div>
                )}

                {gallerySuccess && (
                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-3 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{gallerySuccess}</span>
                  </div>
                )}

                <form onSubmit={handleAddPhoto} className="space-y-4">
                  {/* File Upload Zone */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">
                      Seleziona File Immagine (oppure inserisci URL)
                    </label>
                    
                    <div className="flex flex-col gap-3">
                      {photoSrc ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-300 aspect-video bg-slate-100 group">
                          <img src={photoSrc} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPhotoSrc("")}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full text-xs shadow-md hover:bg-red-500"
                            title="Rimuovi immagine"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label 
                          htmlFor="file-uploader" 
                          className="border-2 border-dashed border-slate-300 hover:border-sky-500 bg-white rounded-xl p-6 text-center cursor-pointer hover:bg-sky-50/10 transition-all flex flex-col items-center justify-center gap-2 animate-pulse"
                        >
                          <Upload className="w-8 h-8 text-slate-400 group-hover:text-sky-600" />
                          <span className="text-xs font-bold text-slate-700">Carica file dal dispositivo</span>
                          <span className="text-[10px] text-slate-450">PNG, JPG, WEBP fino a 5MB</span>
                        </label>
                      )}
                      <input 
                        type="file" 
                        id="file-uploader" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileChange} 
                      />

                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          placeholder="Oppure incolla l'URL di un'immagine web..."
                          value={photoSrc.startsWith("data:") ? "" : photoSrc}
                          onChange={(e) => setPhotoSrc(e.target.value)}
                          className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-sky-600 bg-white font-medium text-slate-700 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pre-filled samples helper */}
                  {!photoSrc && (
                    <div className="text-left bg-sky-50/50 p-2.5 rounded-xl border border-sky-100">
                      <span className="text-[9px] font-black uppercase text-sky-700 tracking-wider block mb-1">
                        💡 Test rapido senza foto?
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: "Cabina Pilotaggio", src: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=800&q=80", tag: "Pilota", title: "Quadro Strumenti", desc: "La sofisticata plancia digitale del nostro ultraleggero di ultima generazione." },
                          { label: "Tramonto in Volo", src: "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=800&q=80", tag: "Cielo", title: "Atmosfera d'Alta Quota", desc: "I caldi colori dorati del tramonto che avvolgono l'ala in volo sopra il mare." },
                          { label: "Pista Decollo", src: "https://images.unsplash.com/photo-1473862170180-84427c485ade?auto=format&fit=crop&w=800&q=80", tag: "Pista", title: "La Nostra Via di Volo", desc: "La suggestiva prospettiva della nostra pista verde rivolta verso la piana monumentale." }
                        ].map((sample, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setPhotoSrc(sample.src);
                              setPhotoTag(sample.tag);
                              setPhotoTitle(sample.title);
                              setPhotoDescription(sample.desc);
                            }}
                            className="bg-white hover:bg-sky-100 border border-sky-200 text-[10px] font-semibold px-2 py-1 rounded-lg text-sky-800 transition-colors"
                          >
                            {sample.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Title & Tag */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">
                        Titolo Foto
                      </label>
                      <input
                        type="text"
                        placeholder="Es. Sguardo sul Faro"
                        value={photoTitle}
                        onChange={(e) => setPhotoTitle(e.target.value)}
                        className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">
                        Etichetta / Tag
                      </label>
                      <input
                        type="text"
                        placeholder="Es. In Volo, Novità"
                        value={photoTag}
                        onChange={(e) => setPhotoTag(e.target.value)}
                        className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-all"
                      />
                    </div>
                  </div>

                  {/* Category & Description */}
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">
                      Categoria di visualizzazione
                    </label>
                    <select
                      value={photoCategory}
                      onChange={(e: any) => setPhotoCategory(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-all"
                    >
                      <option value="voli">I Voli in Azione (voli)</option>
                      <option value="campo">Il Campo di Volo (campo)</option>
                      <option value="territorio">Il Territorio (territorio)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">
                      Descrizione Immagine
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Una descrizione suggestiva che racconta lo scatto..."
                      value={photoDescription}
                      onChange={(e) => setPhotoDescription(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-all leading-relaxed resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPhoto}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55"
                  >
                    {submittingPhoto ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Aggiungi alla Galleria
                  </button>
                </form>
              </div>

              {/* Photos List Grid */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Foto Attive ({galleryImages.length})
                  </h4>
                  <button
                    onClick={fetchGalleryImages}
                    disabled={galleryLoading}
                    className="p-1 text-slate-450 hover:text-sky-600 transition-colors disabled:opacity-55"
                    title="Aggiorna galleria"
                  >
                    <RefreshCw className={`w-4 h-4 ${galleryLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {galleryLoading && galleryImages.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-150">
                    <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-500">Scaricamento catalogo immagini in corso...</p>
                  </div>
                ) : galleryImages.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-150">
                    <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-xs text-slate-500 font-bold">Nessuna foto presente</p>
                    <p className="text-[10px] text-slate-450 mt-1">Carica una foto per iniziare.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
                    {galleryImages.map((img) => {
                      const isDefault = String(img.id).startsWith("default-");
                      return (
                        <div 
                          key={img.id}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between group hover:border-sky-300 transition-all"
                        >
                          <div className="relative aspect-video bg-slate-100">
                            <img src={img.src} alt={img.title} className="w-full h-full object-cover" />
                            <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                              {img.tag}
                            </span>
                            <span className="absolute top-2 right-2 bg-sky-500 text-white text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                              {img.category}
                            </span>
                          </div>
                          
                          <div className="p-4 flex-grow flex flex-col justify-between">
                            <div className="space-y-1">
                              <h5 className="text-xs font-black text-slate-800 line-clamp-1">{img.title}</h5>
                              <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{img.description}</p>
                            </div>

                            <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 font-mono">
                                ID: {img.id}
                              </span>
                              
                              <div className="flex items-center gap-2">
                                {isDefault && (
                                  <span className="text-[9px] text-slate-450 font-bold bg-slate-100 px-2 py-0.5 rounded">
                                    Predefinita
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeletePhoto(img.id)}
                                  className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Elimina foto"
                                >
                                  <Trash2 className="w-3 h-3" /> Elimina
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
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

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {updatingPassword ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  Aggiorna Password
                </button>

                <button
                  type="button"
                  onClick={handleResetPasswordToDefault}
                  disabled={updatingPassword}
                  className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Ripristina la password predefinita dune2026"
                >
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                  Ripristina Default (dune2026)
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* MODAL SOSPENSIONE VOLO & NOTIFICA EMAIL */}
      {suspendModalBooking && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 border border-amber-200">
                  <CloudRain className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-slate-900">Sospensione Volo & Notifica</h3>
                  <p className="text-xs text-slate-500">
                    Prenotazione: <strong className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{suspendModalBooking.id}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSuspendModalBooking(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {suspendSuccessMsg ? (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5">
                <Check className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>{suspendSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Booking Details Card */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs space-y-1.5 text-slate-700">
                  <p><strong>Passeggero:</strong> {suspendModalBooking.name} ({suspendModalBooking.phone})</p>
                  <p><strong>Email:</strong> {suspendModalBooking.email}</p>
                  <p><strong>Data & Orario:</strong> {suspendModalBooking.date} alle ore {suspendModalBooking.timeSlot}</p>
                  <p><strong>Esperienza:</strong> {suspendModalBooking.experienceName}</p>
                  <p><strong>Pilota Referente:</strong> {suspendModalBooking.instructor || "Francesco Guarini"}</p>
                </div>

                {/* Reason Selection */}
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-wider">
                    Motivo della Sospensione
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSuspendReasonType("meteo")}
                      className={`p-3 rounded-2xl border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                        suspendReasonType === "meteo"
                          ? "bg-amber-50 border-amber-300 text-amber-900 shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <CloudRain className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Condizioni Meteo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuspendReasonType("altro")}
                      className={`p-3 rounded-2xl border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                        suspendReasonType === "altro"
                          ? "bg-amber-50 border-amber-300 text-amber-900 shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Altro Motivo</span>
                    </button>
                  </div>
                </div>

                {/* Custom Detail Input */}
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-450 block mb-1 tracking-wider">
                    {suspendReasonType === "meteo" ? "Dettaglio Condizioni Meteo (Opzionale)" : "Specificare la motivazione (Obbligatorio)"}
                  </label>
                  <input
                    type="text"
                    placeholder={suspendReasonType === "meteo" ? "es. Vento forte e raffiche / Pioggia e scarsa visibilità" : "es. Manutenzione ordinaria del velivolo / Imprevisto tecnico"}
                    value={suspendCustomReason}
                    onChange={(e) => setSuspendCustomReason(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500 bg-white font-medium text-slate-800"
                  />
                </div>

                {/* Note for Customer */}
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-450 block mb-1 tracking-wider">
                    Nota Aggiuntiva per il Passeggero (Opzionale)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="es. Ti consigliamo di ricontattarci per la giornata di sabato."
                    value={suspendCustomNote}
                    onChange={(e) => setSuspendCustomNote(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500 bg-white font-medium text-slate-800"
                  />
                </div>

                {/* Email Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer pt-1 bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={suspendSendEmail}
                    onChange={(e) => setSuspendSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Invia subito email di notifica al passeggero ({suspendModalBooking.email})
                  </span>
                </label>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSuspendModalBooking(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    disabled={suspendingLoading}
                    onClick={handleConfirmSuspension}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {suspendingLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Conferma Sospensione & Invia Email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
