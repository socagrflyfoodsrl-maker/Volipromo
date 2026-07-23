import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FlightPackage, Booking } from "./types";
import InteractiveMap from "./components/InteractiveMap";
import BookingForm from "./components/BookingForm";
import PilotChat from "./components/PilotChat";
import PhotoGallery from "./components/PhotoGallery";
import AdminPanel from "./components/AdminPanel";
import {
  Compass,
  Map,
  Ticket,
  Image,
  MessageSquare,
  Lock,
  Unlock,
  Plane,
  Clock,
  Search,
  RefreshCw,
  Send,
  FileText,
  AlertCircle
} from "lucide-react";

// Directly reference the hero asset
const heroImage = "/src/assets/images/puglia_ultralight_flight_1784312533388.jpg";

export default function App() {
  // Flight packages data in Italian
  const flightPackages: FlightPackage[] = [
    {
      id: "battesimo",
      name: "Battesimo del Volo",
      duration: 15,
      price: 80,
      shortDesc: "Il primo approccio al cielo. Un volo costiero perfetto per vincere l'emozione e innamorarsi del volo.",
      longDesc: "Il Battesimo dell'Aria è l'esperienza ideale per chi non ha mai volato in ultraleggero. Accompagnato da un pilota istruttore qualificato, decollerai dalla pista in erba di Duneairpark. Sorvoleremo la costa adriatica di Savelletri e l'affascinante Parco Archeologico di Egnazia, ammirando le antiche rovine romane lambite dal mare cristallino.",
      highlights: [
        "Decollo fronte mare da Duneairpark",
        "Sorvolo ravvicinato degli scavi di Egnazia",
        "Spiegazione di base dei comandi di volo",
        "Perfetto per principianti e battesimi dell'aria",
      ],
      routeColor: "#f59e0b", // Amber
      difficulty: "Facile",
    },
    {
      id: "trulli",
      name: "Volo dei Trulli",
      duration: 30,
      price: 140,
      shortDesc: "Dai mari alle colline. Sorvola la splendida selva e scorgi i coni magici di Alberobello dall'alto.",
      longDesc: "Un percorso affascinante che unisce il litorale e l'entroterra collinare. Dopo il decollo da Duneairpark, punteremo verso l'interno sorvolando i secolari oliveti di Fasano. Saliremo poi di quota per scorgere la capitale dei Trulli, Alberobello, con i suoi caratteristici coni in pietra bianca, prima di rientrare planando sulla costa adriatica.",
      highlights: [
        "Vista aerea unica dei Trulli di Alberobello",
        "Sorvolo della piana degli ulivi monumentali",
        "Crociera di volo mista collina-mare",
        "Fotografie spettacolari ad alto contrasto",
      ],
      routeColor: "#0ea5e9", // Sky Blue
      difficulty: "Panoramico",
    },
    {
      id: "cittabianche",
      name: "Rotta delle Città Bianche",
      duration: 45,
      price: 190,
      shortDesc: "Ostuni arroccata sul colle vista dal cielo. Un'emozione cromatica unica tra calce, ulivi e blu mare.",
      longDesc: "La rotta d'oro per chi ama la fotografia paesaggistica. Voleremo verso sud seguendo la costa e lambendo le dune sabbiose di Torre Canne, per poi virare verso l'interno in direzione di Ostuni. Vedere la 'Città Bianca' arroccata sui colli, interamente dipinta di calce candida, è un'esperienza volante maestosa. Rientro sopra la Valle d'Itria.",
      highlights: [
        "Sorvolo ravvicinato di Ostuni medievale",
        "Vista mozzafiato del faro e dune di Torre Canne",
        "Volo panoramico a medio raggio",
        "Certificato di Volo autografato dal Pilota",
      ],
      routeColor: "#6366f1", // Indigo
      difficulty: "Panoramico",
    },
    {
      id: "grandtour",
      name: "L'Emozione di Puglia",
      duration: 60,
      price: 240,
      shortDesc: "Il tour definitivo della Valle d'Itria. Un'ora di pura magia tra i borghi più belli d'Italia e il litorale.",
      longDesc: "L'esperienza di volo suprema. Un'ora intera nel cielo pugliese sorvolando l'intera ricchezza della zona: scavi romani, fari marittimi, Ostuni, Cisternino, Locorotondo, Alberobello e Fasano. Avrai anche l'opportunità di pilotare attivamente il velivolo sotto la supervisione e la guida esperta del pilota.",
      highlights: [
        "Grand Tour completo sopra 5 borghi storici",
        "Sessione estesa di pilotaggio assistito ai doppi comandi",
        "Volo acrobatico leggero (opzionale su richiesta)",
        "Video HD integrale dell'esperienza incluso in omaggio",
      ],
      routeColor: "#10b981", // Emerald
      difficulty: "Adrenalinico",
    },
  ];

  // Active state selections
  const [selectedPackage, setSelectedPackage] = useState<FlightPackage>(flightPackages[0]);
  const [lastBookings, setLastBookings] = useState<Booking[]>([]);

  // Navigation states
  const [viewMode, setViewMode] = useState<"user" | "admin">("user");
  const [userTab, setUserTab] = useState<"book" | "map" | "gallery" | "ticket" | "pilot">("book");

  // Search booking state
  const [searchEmail, setSearchEmail] = useState<string>("");
  const [searchCode, setSearchCode] = useState<string>("");
  const [searchResult, setSearchResult] = useState<Booking[] | null>(null);
  const [searchAttempted, setSearchAttempted] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // Resend email notification state
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
      
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Risposta del server non valida.");
      }
      
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
      console.error(e);
      setResendStatus(prev => ({ ...prev, [bookingId]: e.message || "Errore connessione" }));
      setTimeout(() => {
        setResendStatus(prev => ({ ...prev, [bookingId]: "" }));
      }, 4000);
    } finally {
      setResendingId(null);
    }
  };

  // Load bookings from localStorage on mount (for persistent feedback in client)
  useEffect(() => {
    const saved = localStorage.getItem("duneairpark_bookings");
    if (saved) {
      try {
        setLastBookings(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleBookingComplete = (newBooking: Booking) => {
    const updated = [newBooking, ...lastBookings];
    setLastBookings(updated);
    localStorage.setItem("duneairpark_bookings", JSON.stringify(updated));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail && !searchCode) return;

    setSearchLoading(true);
    setSearchAttempted(true);

    try {
      const query = new URLSearchParams();
      if (searchEmail) query.append("email", searchEmail.trim());
      if (searchCode) query.append("code", searchCode.trim());

      const res = await fetch(`/api/bookings?${query.toString()}`);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Risposta del server non valida.");
      }
      const data = await res.json();
      setSearchResult(data.bookings || []);
    } catch (error) {
      console.error("Errore ricerca:", error);
      // Fallback local lookup if server is unreachable
      const localFiltered = lastBookings.filter((b) => {
        if (searchCode && b.id.toLowerCase() === searchCode.toLowerCase().trim()) return true;
        if (searchEmail && b.email.toLowerCase() === searchEmail.toLowerCase().trim()) return true;
        return false;
      });
      setSearchResult(localFiltered);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchEmail("");
    setSearchCode("");
    setSearchResult(null);
    setSearchAttempted(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Navbar di DuneAirPark */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 h-20 flex items-center shrink-0">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex justify-between items-center h-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-md shadow-sky-600/10 shrink-0">
              D
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-display font-black text-sky-900 tracking-tight leading-none mb-1">
                DuneAirPark
              </h1>
              <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold leading-none">
                Dashboard Utente
              </span>
            </div>
          </div>

          {/* User Mode Tabs Header Navigation */}
          {viewMode === "user" && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setUserTab("book")}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  userTab === "book" ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Compass className="w-4 h-4" /> Prenota
              </button>
              <button
                onClick={() => setUserTab("map")}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  userTab === "map" ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Map className="w-4 h-4" /> Rotte
              </button>
              <button
                onClick={() => setUserTab("ticket")}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  userTab === "ticket" ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Ticket className="w-4 h-4" /> I Miei Voli
              </button>
              <button
                onClick={() => setUserTab("gallery")}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  userTab === "gallery" ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Image className="w-4 h-4" /> Foto
              </button>
              <button
                onClick={() => setUserTab("pilot")}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  userTab === "pilot" ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <MessageSquare className="w-4 h-4" /> Chiedi al Pilota
              </button>
            </nav>
          )}

          {/* Right Mode Switch */}
          <div className="flex items-center gap-3">
            {viewMode === "user" ? (
              <button
                onClick={() => setViewMode("admin")}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Area Pilota</span>
              </button>
            ) : (
              <button
                onClick={() => setViewMode("user")}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Torna al Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Tab row */}
      {viewMode === "user" && (
        <div className="md:hidden bg-white border-b border-slate-200 p-2 flex overflow-x-auto gap-2 scrollbar-none shrink-0">
          <button
            onClick={() => setUserTab("book")}
            className={`px-3 py-2 rounded-lg text-[10.5px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
              userTab === "book" ? "bg-sky-50 text-sky-700 border border-sky-100" : "text-slate-500"
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Prenota
          </button>
          <button
            onClick={() => setUserTab("map")}
            className={`px-3 py-2 rounded-lg text-[10.5px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
              userTab === "map" ? "bg-sky-50 text-sky-700 border border-sky-100" : "text-slate-500"
            }`}
          >
            <Map className="w-3.5 h-3.5" /> Rotte
          </button>
          <button
            onClick={() => setUserTab("ticket")}
            className={`px-3 py-2 rounded-lg text-[10.5px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
              userTab === "ticket" ? "bg-sky-50 text-sky-700 border border-sky-100" : "text-slate-500"
            }`}
          >
            <Ticket className="w-3.5 h-3.5" /> I Miei Voli
          </button>
          <button
            onClick={() => setUserTab("gallery")}
            className={`px-3 py-2 rounded-lg text-[10.5px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
              userTab === "gallery" ? "bg-sky-50 text-sky-700 border border-sky-100" : "text-slate-500"
            }`}
          >
            <Image className="w-3.5 h-3.5" /> Foto
          </button>
          <button
            onClick={() => setUserTab("pilot")}
            className={`px-3 py-2 rounded-lg text-[10.5px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
              userTab === "pilot" ? "bg-sky-50 text-sky-700 border border-sky-100" : "text-slate-500"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Pilota AI
          </button>
        </div>
      )}

      {/* Main Content Pane */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {viewMode === "admin" ? (
            <motion.div
              key="admin-pane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <AdminPanel />
            </motion.div>
          ) : (
            <motion.div
              key="user-pane"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* TAB CONTENT SWITCHER */}
              <AnimatePresence mode="wait">
                {/* 1. BOOKING DASHBOARD TAB */}
                {userTab === "book" && (
                  <motion.div
                    key="tab-book"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                  >
                    {/* Left Packages Quick Picker (lg:col-span-4) */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm">
                        <span className="text-[10px] font-bold tracking-widest text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full uppercase">
                          Esperienze Disponibili
                        </span>
                        <h3 className="text-xl font-display font-black text-slate-900 mt-3">Scegli la Rotta</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Tutti i voli decollano dal campo privato di <strong>Duneairpark</strong>, situato sulla costa adriatica tra Torre Canne e Ostuni.
                        </p>

                        <div className="space-y-3 mt-5">
                          {flightPackages.map((pkg) => {
                            const isSelected = selectedPackage.id === pkg.id;
                            return (
                              <div
                                key={pkg.id}
                                onClick={() => setSelectedPackage(pkg)}
                                className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-sky-600 bg-sky-50/20 ring-2 ring-sky-600/5 shadow-sm"
                                    : "border-slate-200 hover:border-slate-350 bg-white"
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <strong className="text-sm font-bold text-slate-900 leading-tight">{pkg.name}</strong>
                                  <span className="text-[10.5px] font-bold text-emerald-600 font-mono">€{pkg.price}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed truncate">
                                  {pkg.shortDesc}
                                </p>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100/60 font-medium">
                                  <span>{pkg.difficulty}</span>
                                  <span>🕒 {pkg.duration} Minuti</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Info static card */}
                      <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
                          🛡️ Volo Sicuro & Regolamento
                        </h4>
                        <ul className="space-y-2 text-[11px] text-slate-300">
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-400">✔</span>
                            <span>Copertura assicurativa aeronautica RCA inclusa per tutti.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-400">✔</span>
                            <span>Cuffie attive per comunicare costantemente con il Pilota.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-400">✔</span>
                            <span>Peso massimo passeggero: 100 kg. Età minima: 16 anni.</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Right core Booking form (lg:col-span-8) */}
                    <div className="lg:col-span-8">
                      <BookingForm
                        packages={flightPackages}
                        selectedPackage={selectedPackage}
                        onSelectPackage={setSelectedPackage}
                        onBookingComplete={handleBookingComplete}
                        onGoToMyBookings={() => setUserTab("ticket")}
                      />
                    </div>
                  </motion.div>
                )}

                {/* 2. ROUTES MAP TAB */}
                {userTab === "map" && (
                  <motion.div
                    key="tab-map"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
                        <div>
                          <span className="text-[10px] font-bold tracking-widest text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full uppercase">
                            Mappe Interattive
                          </span>
                          <h3 className="text-xl font-display font-black text-slate-900 mt-3">Tracciati di Volo</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Esplora l'itinerario aereo sopra Alberobello, Ostuni, Fasano e le rovine romane di Egnazia.
                          </p>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                          {flightPackages.map((pkg) => (
                            <button
                              key={pkg.id}
                              onClick={() => setSelectedPackage(pkg)}
                              className={`px-3 py-1.5 rounded-lg text-[10.5px] font-black uppercase transition-all ${
                                selectedPackage.id === pkg.id ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"
                              }`}
                            >
                              {pkg.name.split(" ").slice(-1)[0]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <InteractiveMap
                        packages={flightPackages}
                        selectedPackage={selectedPackage}
                        onSelectPackage={setSelectedPackage}
                      />
                    </div>
                  </motion.div>
                )}

                {/* 3. TICKET SEARCH TAB */}
                {userTab === "ticket" && (
                  <motion.div
                    key="tab-ticket"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 max-w-2xl mx-auto"
                  >
                    <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                      <div className="text-center space-y-1.5">
                        <span className="text-[10px] font-bold tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">
                          Verifica Prenotazione
                        </span>
                        <h3 className="text-xl font-display font-black text-slate-900 mt-3">Scarica il Biglietto di Volo</h3>
                        <p className="text-xs text-slate-500">
                          Inserisci la tua email o il codice unico di prenotazione (es: DUNE-ABCD) per ripescare il tuo pass.
                        </p>
                      </div>

                      <form onSubmit={handleSearch} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">
                              Indirizzo Email
                            </label>
                            <input
                              type="email"
                              placeholder="nome@esempio.it"
                              value={searchEmail}
                              onChange={(e) => setSearchEmail(e.target.value)}
                              className="w-full border-2 border-slate-200 rounded-xl p-3.5 focus:border-sky-500 outline-none transition-colors bg-white font-semibold text-slate-700 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">
                              Codice Prenotazione
                            </label>
                            <input
                              type="text"
                              placeholder="E.g. DUNE-ABCD"
                              value={searchCode}
                              onChange={(e) => setSearchCode(e.target.value)}
                              className="w-full border-2 border-slate-200 rounded-xl p-3.5 focus:border-sky-500 outline-none transition-colors bg-white font-semibold text-slate-700 text-xs font-mono uppercase"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          {searchAttempted && (
                            <button
                              type="button"
                              onClick={clearSearch}
                              className="text-slate-500 hover:text-slate-800 text-xs font-bold px-4 py-2"
                            >
                              Annulla
                            </button>
                          )}
                          <button
                            type="submit"
                            disabled={!searchEmail && !searchCode}
                            className={`px-6 py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              searchEmail || searchCode
                                ? "bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-lg shadow-sky-600/10"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            {searchLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Search className="w-3.5 h-3.5" />
                            )}
                            Cerca Biglietto
                          </button>
                        </div>
                      </form>

                      {/* Display results */}
                      <AnimatePresence>
                        {searchAttempted && searchResult && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-left"
                          >
                            <div className="flex justify-between items-center pb-2 border-b border-slate-250">
                              <h4 className="text-[10px] font-black uppercase text-slate-450">Esito Ricerca</h4>
                              <span className="text-[10px] text-slate-500 font-bold">{searchResult.length} Voli Trovati</span>
                            </div>

                            {searchResult.length === 0 ? (
                              <p className="text-xs text-slate-500 text-center py-4">
                                Nessun volo trovato. Verifica i dettagli inseriti o contatta <strong>guarinivolo1964@gmail.com</strong>.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {searchResult.map((b) => (
                                  <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 relative overflow-hidden shadow-sm">
                                    <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-bl-lg">
                                      Confermato
                                    </div>
                                    
                                    <span className="text-[9px] text-slate-400 font-mono block">ID: {b.id}</span>
                                    <strong className="text-sm text-slate-800 font-display block mt-0.5">{b.experienceName}</strong>
                                    <span className="text-xs text-slate-500 block mt-1">
                                      📅 {b.date} • 🕒 {b.timeSlot}
                                    </span>
                                    <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-slate-100">
                                      <span className="text-[10.5px] text-slate-400 font-medium">Peso: {b.weight} kg</span>
                                      <span className="text-xs font-black text-slate-700 font-mono">€{b.price}</span>
                                    </div>

                                    <div className="mt-4 pt-3.5 border-t border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                      <span className="text-[9.5px] text-slate-400 leading-normal max-w-xs">
                                        Notifiche automatiche già trasmesse. Contatto: <strong>guarinivolo1964@gmail.com</strong>.
                                      </span>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          disabled={resendingId === b.id}
                                          onClick={() => handleResendEmail(b.id)}
                                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                                            resendStatus[b.id]
                                              ? "bg-slate-50 text-slate-700 border border-slate-350"
                                              : "bg-sky-50 border border-sky-100 text-sky-700 hover:bg-sky-100 cursor-pointer"
                                          }`}
                                        >
                                          <Send className="w-3 h-3" />
                                          {resendStatus[b.id] || "Rinvia Email"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => window.print()}
                                          className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
                                        >
                                          <FileText className="w-3 h-3" /> Stampa
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* 4. GALLERY TAB */}
                {userTab === "gallery" && (
                  <motion.div
                    key="tab-gallery"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm">
                      <div className="mb-6">
                        <span className="text-[10px] font-bold tracking-widest text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full uppercase">
                          Galleria Fotografica
                        </span>
                        <h3 className="text-xl font-display font-black text-slate-900 mt-3">DuneAirPark dal Cielo</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Scatti reali realizzati dai nostri passeggeri durante i voli promozionali sopra la Valle d'Itria e il litorale adriatico.
                        </p>
                      </div>

                      <PhotoGallery />
                    </div>
                  </motion.div>
                )}

                {/* 5. ASK THE PILOT AI TAB */}
                {userTab === "pilot" && (
                  <motion.div
                    key="tab-pilot"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 max-w-3xl mx-auto"
                  >
                    <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm space-y-4">
                      <div className="text-center">
                        <span className="text-[10px] font-bold tracking-widest text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full uppercase">
                          AI Flight Assistant
                        </span>
                        <h3 className="text-xl font-display font-black text-slate-900 mt-3">Parla con l'Istruttore Virtuale</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Hai dubbi sulle rotte, correnti, sicurezza o bilanciamento peso dell'ultraleggero? Fai qui le tue domande!
                        </p>
                      </div>

                      <PilotChat />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer minimalista di DuneAirPark */}
      <footer className="bg-slate-900 text-white border-t border-slate-800 py-8 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-sky-600 flex items-center justify-center text-white font-black text-[11px]">
              DP
            </span>
            <strong className="font-display font-black tracking-tight text-sm">Duneairpark</strong>
          </div>
          <p className="text-slate-400 text-[11px]">
            Campo di Volo ASD Ultraleggeri Puglia • Contatto Pilota: <strong>guarinivolo1964@gmail.com</strong>
          </p>
          <div className="flex gap-4">
            <a href="#privacy" className="hover:text-slate-350 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-350 transition-colors">Termini di Servizio</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
