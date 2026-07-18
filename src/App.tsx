import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FlightPackage, Booking } from "./types";
import InteractiveMap from "./components/InteractiveMap";
import BookingForm from "./components/BookingForm";
import PilotChat from "./components/PilotChat";
import PhotoGallery from "./components/PhotoGallery";
import { EmailAdminPanel } from "./components/EmailAdminPanel";
import {
  Plane,
  MapPin,
  Compass,
  Phone,
  Mail,
  Award,
  CheckCircle,
  Search,
  Info,
  Shield,
  Sun,
  Users,
  Instagram,
  ChevronDown,
  Navigation,
  FileText,
  Video,
  RefreshCw,
  Send
} from "lucide-react";

// Use direct path string to prevent strict TypeScript JPG compilation errors
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
      longDesc: "Il Battesimo dell'Aria è l'esperienza ideale per chi non ha mai volato in ultraleggero. Accompagnato dall'Istruttore Guarini, decollerai dalla pista in erba di Duneairpark. Sorvoleremo la costa adriatica di Savelletri e l'affascinante Parco Archeologico di Egnazia, ammirando le antiche rovine romane lambite dal mare cristallino.",
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
      longDesc: "L'esperienza di volo suprema. Un'ora intera nel cielo pugliese sorvolando l'intera ricchezza della zona: scavi romani, fari marittimi, Ostuni, Cisternino, Locorotondo, Alberobello e Fasano. Avrai anche l'opportunità di pilotare attivamente il velivolo sotto la supervisione e la guida esperta del Pilota Guarini.",
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
        const textMsg = await res.text();
        throw new Error(textMsg.substring(0, 100) || "Risposta server non valida");
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
        const textMsg = await res.text();
        throw new Error(textMsg.substring(0, 100) || "Risposta server non valida");
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* 1. Header Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 h-20 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex justify-between items-center h-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md shadow-sky-600/10 shrink-0">
              D
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-display font-bold text-sky-900 tracking-tight leading-none mb-1">
                DuneAirPark
              </h1>
              <span className="text-[9px] uppercase tracking-[0.2em] text-slate-450 font-semibold leading-none">
                Fasano • Ostuni
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-500 uppercase tracking-widest h-full">
            <a href="#esperienze" className="hover:text-slate-800 transition-colors py-7 border-b-2 border-transparent hover:border-sky-600">
              Esperienze Volo
            </a>
            <a href="#mappa" className="hover:text-slate-800 transition-colors py-7 border-b-2 border-transparent hover:border-sky-600">
              Mappa Rotte
            </a>
            <a href="#galleria" className="hover:text-slate-800 transition-colors py-7 border-b-2 border-transparent hover:border-sky-600">
              Galleria Foto
            </a>
            <a href="#prenota" className="text-sky-600 border-b-2 border-sky-600 py-7 transition-colors">
              Prenota Ora
            </a>
            <a href="#cerca" className="hover:text-slate-800 transition-colors py-7 border-b-2 border-transparent hover:border-sky-600">
              Cerca Volo
            </a>
            <a href="#email-admin" className="hover:text-slate-800 transition-colors py-7 border-b-2 border-transparent hover:border-sky-600">
              Configurazione Email
            </a>
            <a href="#pilota" className="hover:text-slate-800 transition-colors py-7 border-b-2 border-transparent hover:border-sky-600">
              Chiedi al Pilota AI
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Duneairpark Libero</span>
            </div>
            <a
              href="#prenota"
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition-all shadow-lg shadow-sky-600/10"
            >
              Vola Subito
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative bg-slate-900 text-white overflow-hidden py-16 md:py-24">
        {/* Absolute Background image with modern text-friendly darkening mask */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Volo Ultraleggero Puglia"
            className="w-full h-full object-cover object-center opacity-40 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950/40" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10.5px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              <Compass className="w-3.5 h-3.5 animate-spin-slow" /> Promo Volo Stagionale 2026
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-[1.1]">
              Voli in <span className="text-sky-400">Ultraleggero</span>
            </h1>
            <div className="h-1 w-20 bg-sky-450 my-5"></div>

            <p className="text-sm md:text-base text-sky-100/80 leading-relaxed max-w-xl">
              Spicca il volo dal <strong>Campo di Volo Duneairpark</strong>, nella suggestiva piana costiera tra Fasano ed Ostuni. Vivi la maestosità della costa adriatica, i trulli di Alberobello e l'incanto di Ostuni dall'alto in totale sicurezza.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a
                href="#esperienze"
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-6 py-4 rounded-2xl shadow-xl shadow-sky-600/20 flex items-center justify-center gap-2 group transition-all"
              >
                Scopri le Rotte Promozionali
                <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
              </a>
              <a
                href="#prenota"
                className="bg-white/10 hover:bg-white/15 text-white border border-white/10 font-bold text-xs px-6 py-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
              >
                Prenota Ora il tuo Volo
              </a>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/5 max-w-md">
              <div>
                <span className="text-xl md:text-2xl font-black text-sky-400 font-mono block">100%</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Sicurezza Certificata</span>
              </div>
              <div>
                <span className="text-xl md:text-2xl font-black text-sky-400 font-mono block">10k+</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Ore di Volo Istruttore</span>
              </div>
              <div>
                <span className="text-xl md:text-2xl font-black text-sky-400 font-mono block">0€</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Cancellazione Meteo</span>
              </div>
            </div>
          </div>

          {/* Quick Floating booking-ad card (lg:col-span-5) */}
          <div className="lg:col-span-5 hidden lg:block">
            <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6 space-y-4">
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Sun className="text-amber-400 w-5 h-5" /> Decollo da Duneairpark
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Situato sulla fascia costiera tra Savelletri e Torre Canne, il campo offre una pista in erba pianeggiante baciata dal mare, ideale per decolli dolci e panorami mozzafiato immediati.
              </p>
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Pilota Comandante:</span>
                  <span className="font-bold text-sky-300">Istruttore Guarini</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Notifiche e Conferme:</span>
                  <span className="font-bold text-emerald-400">Immediate post-pagamento</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Email di riferimento:</span>
                  <span className="font-bold text-slate-300 font-mono text-[10px]">guarinivolo1964@gmail.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Promotional Packages Cards Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center" id="esperienze">
        <span className="text-[10px] font-bold tracking-widest text-sky-600 bg-sky-50 px-3 py-1.5 rounded-full uppercase">
          Le Nostre Esperienze di Volo
        </span>
        <h2 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-slate-900 mt-4">
          Scegli la Tua Rotta Promozionale
        </h2>
        <div className="h-1 w-12 bg-sky-600 mx-auto my-4"></div>
        <p className="text-slate-500 text-xs md:text-sm max-w-lg mx-auto">
          Tutti i voli partono dal campo di Duneairpark e sono operati da piloti professionisti abilitati ai sensi delle normative vigenti.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {flightPackages.map((pkg) => {
            const isSelected = selectedPackage.id === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => {
                  setSelectedPackage(pkg);
                  // Scroll slightly to the map view for interactive context
                  const mapElem = document.getElementById("mappa-sezione");
                  if (mapElem) mapElem.scrollIntoView({ behavior: "smooth" });
                }}
                className={`bg-white rounded-2xl border-2 p-6 text-left flex flex-col justify-between transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "border-sky-600 ring-4 ring-sky-600/10 shadow-xl shadow-sky-600/5 -translate-y-1.5"
                    : "border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      {pkg.difficulty}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {pkg.duration} Min
                    </span>
                  </div>

                  <h3 className="text-lg font-display font-bold text-slate-900 mt-3 leading-tight">
                    {pkg.name}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {pkg.shortDesc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Tariffa Promo</span>
                    <span className="text-base font-black text-emerald-600 font-mono">€{pkg.price}</span>
                  </div>
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                      isSelected ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    ➔
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Interactive Maps & Route Visualizer */}
      <section className="py-12 bg-slate-50 border-t border-b border-slate-150" id="mappa">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="mappa-sezione">
          <div className="text-center md:text-left mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-3">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-sky-600 bg-sky-50 px-3 py-1 rounded-full uppercase">
                Visualizzazione Tracciati
              </span>
              <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-slate-900 mt-2">
                Esplora le Attrazioni di Volo
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-sm md:text-right">
              Clicca sui pacchetti o passa il mouse sulle icone dei punti d'interesse per pianificare l'itinerario con l'Istruttore Guarini.
            </p>
          </div>

          <InteractiveMap
            packages={flightPackages}
            selectedPackage={selectedPackage}
            onSelectPackage={setSelectedPackage}
          />
        </div>
      </section>

      {/* Photo Gallery Section */}
      <PhotoGallery />

      {/* 5. Booking Step-by-Step and Checkout Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="prenota">
        <div className="text-center mb-10">
          <span className="text-[10px] font-bold tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">
            Sistema di Prenotazione Online
          </span>
          <h2 className="text-3xl font-display font-black tracking-tight text-slate-900 mt-2">
            Invia la Tua Richiesta di Volo
          </h2>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            Completa la prenotazione promozionale. Riceverai la conferma immediata su schermo e via email a <strong>guarinivolo1964@gmail.com</strong>.
          </p>
        </div>

        <BookingForm
          packages={flightPackages}
          selectedPackage={selectedPackage}
          onSelectPackage={setSelectedPackage}
          onBookingComplete={handleBookingComplete}
        />
      </section>

      {/* 6. Search Booking Widget (Retrieve Tickets) */}
      <section className="py-12 bg-slate-100 border-t border-slate-200" id="cerca">
        <div className="max-w-xl mx-auto px-4 text-center space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-display font-extrabold text-slate-800">Cerca la Tua Prenotazione</h3>
            <p className="text-xs text-slate-500">
              Hai già prenotato? Inserisci la tua email o il codice di prenotazione per scaricare la ricevuta.
            </p>
          </div>

          <form onSubmit={handleSearch} className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-left">
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1.5 tracking-widest">
                  Indirizzo Email
                </label>
                <input
                  type="email"
                  placeholder="nome@esempio.it"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl p-4 focus:border-sky-500 outline-none transition-colors bg-white font-semibold text-slate-700 text-xs"
                />
              </div>
              <div className="text-left">
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1.5 tracking-widest">
                  Codice Prenotazione
                </label>
                <input
                  type="text"
                  placeholder="E.g. DUNE-ABCD"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl p-4 focus:border-sky-500 outline-none transition-colors bg-white font-semibold text-slate-700 text-xs font-mono uppercase"
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

          {/* Search Result Visual feedback */}
          <AnimatePresence>
            {searchAttempted && searchResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-slate-200 rounded-2xl p-5 text-left space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-black uppercase text-slate-400">Risultati della Ricerca</h4>
                  <span className="text-[10px] text-slate-400 font-bold">{searchResult.length} Voli Trovati</span>
                </div>

                {searchResult.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    Nessun volo trovato per i dati inseriti. Verifica l'ortografia o scrivi a <strong className="text-sky-600">guarinivolo1964@gmail.com</strong>.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {searchResult.map((b) => (
                      <div key={b.id} className="bg-slate-50 p-4 rounded-xl border border-slate-150 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-bl-lg">
                          Confermato
                        </div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] text-slate-400 font-mono block">ID: {b.id}</span>
                            <strong className="text-sm text-slate-800 font-display block mt-0.5">{b.experienceName}</strong>
                            <span className="text-xs text-slate-500 block mt-1">
                              📅 {b.date} • 🕒 {b.timeSlot}
                            </span>
                          </div>
                          <div className="text-right pt-4 sm:pt-0">
                            <span className="text-xs font-black text-slate-700 block font-mono">€{b.price}</span>
                            <span className="text-[9.5px] text-slate-400 block font-medium">Peso inserito: {b.weight} kg</span>
                          </div>
                        </div>

                        <div className="mt-3.5 pt-3.5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <span className="text-[10px] text-slate-400 leading-relaxed max-w-xs">
                            Notifiche email automatiche già trasmesse. Contatto Pilota: <strong>guarinivolo1964@gmail.com</strong>.
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={resendingId === b.id}
                              onClick={() => handleResendEmail(b.id)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                                resendStatus[b.id]
                                  ? resendStatus[b.id].includes("Errore")
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse"
                                  : "bg-sky-50 border border-sky-100 text-sky-700 hover:bg-sky-100 cursor-pointer"
                              }`}
                            >
                              {resendingId === b.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              {resendStatus[b.id] || "Rinvia Email"}
                            </button>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
                            >
                              <FileText className="w-3 h-3" /> Stampa Biglietto
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
      </section>

      {/* 6.5 Email Configuration and Management Panel */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <EmailAdminPanel />
      </section>

      {/* 7. Detailed Section about Campo di Volo & Pilot Info */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Visual description column (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-sky-50 rounded-3xl p-6 border border-sky-100 space-y-4">
            <h3 className="text-xl font-display font-extrabold text-slate-800 flex items-center gap-2">
              <Compass className="w-5 h-5 text-sky-500" /> Il Campo di Volo Duneairpark
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Il nostro hangar e la pista di volo in erba sono posizionati sulla costa tra <strong>Savelletri di Fasano</strong> e <strong>Torre Canne</strong>. Questa collocazione geografica permette il decollo diretto sul mare, evitando ostacoli montuosi e offrendo da subito una visuale spettacolare.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <span className="text-lg bg-white w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center shadow-sm">📍</span>
                <div className="text-[11px] text-slate-500">
                  <strong className="text-slate-700 block">Indirizzo e coordinate</strong>
                  Zona costiera tra Fasano ed Ostuni, Savelletri, Puglia.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg bg-white w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center shadow-sm">✈️</span>
                <div className="text-[11px] text-slate-500">
                  <strong className="text-slate-700 block">La flotta ultraleggeri</strong>
                  Velivoli moderni, regolarmente revisionati e dotati di doppi comandi per l'istruzione costiera.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-sky-400" /> Volo Sicuro & Regolamento
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✔</span>
                <span>Tutti i passeggeri sono coperti da assicurazione aeronautica obbligatoria RCA.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✔</span>
                <span>Forniamo auricolari e cuffie con riduzione attiva del rumore per comunicare con il pilota.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✔</span>
                <span>Limite peso passeggero: 100 kg. Limite di età: minimo 16 anni con firma dei genitori.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Gemini AI Pilot Assistant column (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4" id="pilota">
          <div className="text-left space-y-2 mb-6">
            <span className="text-[10px] font-bold tracking-widest text-sky-600 bg-sky-50 px-3 py-1 rounded-full uppercase">
              AI Flight Briefing
            </span>
            <h3 className="text-2xl md:text-3xl font-display font-black tracking-tight text-slate-900">
              Parla con l'Istruttore Virtuale
            </h3>
            <p className="text-xs text-slate-500">
              Hai dubbi sulle correnti di vento pugliesi, sul mal d'aria o sul volo a doppi comandi? Digita qui sotto per ricevere risposte intelligenti simulate e consigli di volo!
            </p>
          </div>

          <PilotChat />
        </div>
      </section>

      {/* 8. Footer Section */}
      <footer className="bg-slate-950 text-white border-t border-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-black text-xs">
                DP
              </span>
              <strong className="text-lg font-display font-black tracking-tight">Duneairpark</strong>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Associazione Sportiva Dilettantistica di Volo Ultraleggero nella splendida area di Fasano-Ostuni, Puglia. Promuoviamo la cultura aeronautica e la valorizzazione del territorio dal cielo.
            </p>
          </div>

          <div className="space-y-4 text-left">
            <h4 className="text-xs font-bold uppercase tracking-widest text-sky-400">Contatti & Prenotazioni</h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-slate-500" />
                <a href="mailto:guarinivolo1964@gmail.com" className="hover:text-white transition-colors">
                  guarinivolo1964@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-500" />
                <span>+39 345 678910 (Segreteria Campo)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>Savelletri-Torre Canne (Costa di Fasano, BR)</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-left">
            <h4 className="text-xs font-bold uppercase tracking-widest text-sky-400">Garanzia Meteo</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tutte le prenotazioni sono coperte da polizza meteo. Se il Pilota Guarini giudica il vento o la visibilità non idonei prima del decollo, il volo viene riprogrammato in assoluto accordo con il passeggero.
            </p>
            <div className="pt-2 flex gap-3">
              <a href="#" className="p-2 bg-slate-900 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-900 flex flex-col sm:flex-row justify-between text-[11px] text-slate-500">
          <p>© 2026 Campo di Volo Duneairpark. Tutti i diritti riservati.</p>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <a href="#" className="hover:text-slate-400">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400">Termini di Servizio</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
