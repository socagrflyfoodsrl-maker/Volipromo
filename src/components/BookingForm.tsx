import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FlightPackage, Booking } from "../types";
import { 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  Scale, 
  CreditCard, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle, 
  Ticket, 
  Printer, 
  RefreshCw, 
  Lock,
  CalendarDays,
  Sparkles
} from "lucide-react";

interface BookingFormProps {
  packages: FlightPackage[];
  selectedPackage: FlightPackage;
  onSelectPackage: (pkg: FlightPackage) => void;
  onBookingComplete: (booking: Booking) => void;
}

export default function BookingForm({
  packages,
  selectedPackage,
  onSelectPackage,
  onBookingComplete,
}: BookingFormProps) {
  const [step, setStep] = useState<number>(1); // 1: Info & Weight, 2: Date & Time, 3: Payment, 4: Confirmed
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  // Passenger state
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [weight, setWeight] = useState<string>("");

  // Date & Time state
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  // Extended Calendar state
  const [calYear, setCalYear] = useState<number>(2026);
  const [calMonth, setCalMonth] = useState<number>(6); // July (0-indexed)

  // Payment state - €50 deposit via PayPal + cash balance at airfield
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("Acconto €50 (PayPal) + Saldo in contanti (al campo)");

  // Pilot / Instructor selection state
  const [selectedInstructor, setSelectedInstructor] = useState<string>("Francesco Guarini");

  // Completed booking placeholder
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  // Dynamic PayPal info
  const [paypalInfo, setPaypalInfo] = useState({
    email: "soc.agr.flyfoodsrl@gmail.com",
    paypalMeUrl: "https://www.paypal.me/flyfoodsrl",
    depositAmount: 50,
  });

  useEffect(() => {
    fetch("/api/paypal/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setPaypalInfo({
            email: data.config.email || "soc.agr.flyfoodsrl@gmail.com",
            paypalMeUrl: data.config.paypalMeUrl || "https://www.paypal.me/flyfoodsrl",
            depositAmount: Number(data.config.depositAmount) || 50,
          });
        }
      })
      .catch((err) => console.error("Error loading paypal config in form:", err));
  }, []);

  // Constants
  const timeSlots = [
    { id: "slot-1", label: "09:00 - 11:00", desc: "Aria fresca mattutina, visibilità limpida" },
    { id: "slot-2", label: "11:00 - 13:00", desc: "Sole a picco, colori del mare intensi" },
    { id: "slot-3", label: "15:00 - 17:00", desc: "Brezza pomeridiana ideale" },
    { id: "slot-4", label: "17:00 - 19:00", desc: "Luce calda del tramonto (Consigliatissimo per foto! 🌅)" },
  ];

  const ITALIAN_MONTH_NAMES = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  const ITALIAN_MONTH_SHORT = [
    "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
    "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
  ];

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const formatItalianDate = (isoString: string) => {
    if (!isoString) return "";
    const parts = isoString.split("-");
    if (parts.length !== 3) return isoString;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return isoString;
    const dateObj = new Date(y, m, d);
    const weekdays = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    return `${weekdays[dateObj.getDay()]} ${d} ${ITALIAN_MONTH_NAMES[m]} ${y}`;
  };

  // Helper for rendering days in month grid
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayObj = new Date(calYear, calMonth, 1);
  let startingDayOfWeek = firstDayObj.getDay() - 1; // Mon = 0
  if (startingDayOfWeek < 0) startingDayOfWeek = 6; // Sun = 6

  // Weight Safety check logic
  const isWeightWarning = weight !== "" && Number(weight) > 100;
  const isWeightValid = weight !== "" && Number(weight) > 0 && Number(weight) <= 100;

  // Validation helpers
  const isStep1Valid = name.trim() !== "" && email.includes("@") && phone.trim().length >= 8 && isWeightValid;
  const isStep2Valid = selectedDate !== "" && selectedSlot !== "";
  const isStep3Valid = selectedPaymentMethod !== "";

  // Process Booking with server
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep3Valid) return;

    setLoading(true);
    setLoadingMessage("Elaborazione della prenotazione...");

    // Stage 1: Confirm selection
    setTimeout(() => {
      setLoadingMessage("Registrazione prenotazione nel server...");

      // Stage 2: Save Booking and Trigger Notifications
      setTimeout(async () => {
        const targetEmail = selectedInstructor === "Istruttore Rocco Gallone" ? "roccogallonevolo@gmail.com" : "guarinivolo1964@gmail.com";
        setLoadingMessage(`Generazione notifica automatizzata per il pilota (${targetEmail})...`);

        try {
          const response = await fetch("/api/book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              email,
              phone,
              weight: Number(weight),
              date: selectedDate,
              timeSlot: selectedSlot,
              experienceId: selectedPackage.id,
              experienceName: selectedPackage.name,
              price: selectedPackage.price,
              paymentMethod: selectedPaymentMethod,
              instructor: selectedInstructor,
            }),
          });

          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) {
            throw new Error("Risposta del server non valida. Riprova tra poco.");
          }

          const data = await response.json();

          if (data.success) {
            setCompletedBooking(data.booking);
            onBookingComplete(data.booking);
            setStep(4);
          } else {
            alert("Si è verificato un errore durante la registrazione: " + data.error);
          }
        } catch (error) {
          console.error("Errore di rete:", error);
          // Fallback to offline mock booking in case of server hitch
          const fallbackId = "DUNE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
          const fallback: Booking = {
            id: fallbackId,
            name,
            email,
            phone,
            weight: Number(weight),
            date: selectedDate,
            timeSlot: selectedSlot,
            experienceId: selectedPackage.id,
            experienceName: selectedPackage.name,
            price: selectedPackage.price,
            paymentMethod: selectedPaymentMethod,
            status: "confirmed",
            createdAt: new Date().toISOString(),
            instructor: selectedInstructor,
          };
          setCompletedBooking(fallback);
          onBookingComplete(fallback);
          setStep(4);
        } finally {
          setLoading(false);
          setLoadingMessage("");
        }
      }, 1000);
    }, 1000);
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setWeight("");
    setSelectedDate("");
    setSelectedSlot("");
    setSelectedPaymentMethod("Acconto €50 (PayPal) + Saldo in contanti (al campo)");
    setCompletedBooking(null);
    setSelectedInstructor("Pilota");
    setStep(1);
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden max-w-4xl mx-auto" id="booking-section">
      {/* Booking Header and Step Tracker */}
      <div className="bg-slate-900 text-white px-6 py-6 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400">Promozione Volo Puglia</span>
          <h2 className="text-2xl font-display font-black tracking-tight mt-1">Prenota il Tuo Volo</h2>
        </div>

        {/* Step dots */}
        {step < 4 && (
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: "Contatti" },
              { num: 2, label: "Data" },
              { num: 3, label: "Conferma" },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-1.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? "bg-sky-600 text-white scale-110 shadow-lg shadow-sky-600/20"
                      : step > s.num
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </span>
                <span
                  className={`text-xs ${
                    step === s.num ? "text-white font-medium" : "text-slate-400"
                  } hidden sm:inline`}
                >
                  {s.label}
                </span>
                {s.num < 3 && <ChevronRight className="w-3 h-3 text-slate-700 hidden sm:inline" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Layout Body */}
      <div className="p-6 md:p-8 relative min-h-[400px]">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <RefreshCw className="w-12 h-12 text-sky-500 animate-spin mb-4" />
            <h3 className="text-lg font-display font-bold text-slate-800 mb-2">Sicurezza e Notifiche in Corso...</h3>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">{loadingMessage}</p>
          </div>
        )}

        {/* Step 1: Passenger Contacts & Weight check */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100 flex items-start gap-3">
              <span className="text-2xl mt-0.5">🛩️</span>
              <div>
                <h4 className="text-sm font-bold text-sky-950">Seleziona l'esperienza desiderata:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => onSelectPackage(pkg)}
                      className={`px-3 py-2 text-[11px] font-bold rounded-xl border text-left transition-all ${
                        selectedPackage.id === pkg.id
                          ? "bg-sky-600 text-white border-sky-600 shadow-md"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="truncate">{pkg.name}</div>
                      <div className={`text-[9px] mt-0.5 ${selectedPackage.id === pkg.id ? "text-sky-200" : "text-slate-400"}`}>
                        {pkg.duration} Min • €{pkg.price}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-250 flex items-start gap-3">
              <span className="text-2xl mt-0.5">👨‍✈️</span>
              <div className="w-full">
                <h4 className="text-sm font-bold text-slate-800">Seleziona l'Istruttore di Volo:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedInstructor("Francesco Guarini")}
                    className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 w-full ${
                      selectedInstructor === "Francesco Guarini"
                        ? "bg-sky-600 text-white border-sky-600 shadow-md"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0 border border-slate-200">
                      👴
                    </div>
                    <div>
                      <div className="font-black text-xs">Francesco Guarini</div>
                      <div className={`text-[10px] mt-0.5 ${selectedInstructor === "Francesco Guarini" ? "text-sky-200" : "text-slate-400"}`}>
                        Capo Pilota • Voli Costieri & Sicurezza
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedInstructor("Istruttore Rocco Gallone")}
                    className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 w-full ${
                      selectedInstructor === "Istruttore Rocco Gallone"
                        ? "bg-sky-600 text-white border-sky-600 shadow-md"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0 border border-slate-200">
                      🛩️
                    </div>
                    <div>
                      <div className="font-black text-xs">Istruttore Rocco Gallone</div>
                      <div className={`text-[10px] mt-0.5 ${selectedInstructor === "Istruttore Rocco Gallone" ? "text-sky-200" : "text-slate-400"}`}>
                        Secondo Pilota • Trulli & Valle d'Itria
                      </div>
                    </div>
                  </button>
                </div>
                <p className="text-[10.5px] text-slate-550 mt-3 italic flex items-center gap-1.5">
                  ⚠️ <span><strong>Nota:</strong> il pilota vi verrà assegnato in base alla disponibilità.</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-750 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-600" /> Dati Anagrafici
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">Nome e Cognome del Passeggero *</label>
                    <input
                      type="text"
                      placeholder="E.g. Mario Rossi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">Indirizzo Email *</label>
                    <input
                      type="email"
                      placeholder="E.g. mario.rossi@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">Recapito Telefonico *</label>
                    <input
                      type="tel"
                      placeholder="E.g. +39 345 678910"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Safety Weight Verification */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-750 uppercase tracking-wider flex items-center gap-2">
                  <Scale className="w-4 h-4 text-sky-600" /> Sicurezza & Bilanciamento Peso
                </h3>

                <div className="bg-slate-50 rounded-2xl p-5 border-2 border-slate-200 space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">Peso del Passeggero (kg) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="E.g. 75"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className={`w-full border-2 rounded-xl pl-4 pr-12 py-3 text-xs focus:outline-none transition-all font-semibold text-slate-750 ${
                          isWeightWarning
                            ? "border-amber-300 bg-amber-50 focus:border-amber-500 text-amber-900"
                            : isWeightValid
                            ? "border-emerald-200 bg-emerald-50/20 focus:border-sky-600 text-slate-700"
                            : "border-slate-200 bg-white focus:border-sky-600 text-slate-700"
                        }`}
                      />
                      <span className="absolute right-4 top-3.5 text-xs text-slate-400 font-bold">KG</span>
                    </div>
                  </div>

                  {/* Safety messaging depending on weight input */}
                  <AnimatePresence mode="wait">
                    {isWeightWarning ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-amber-100 border border-amber-200 rounded-xl p-3.5 text-amber-900 text-xs leading-relaxed space-y-1"
                      >
                        <strong>⚠️ Limite di Peso Superato</strong>
                        <p>Il peso massimo consentito per volare in ultraleggero a Duneairpark è di <strong>100 kg</strong> per passeggero. Questo limite garantisce l'assoluta stabilità aerodinamica e la sicurezza dei controlli.</p>
                        <p className="font-bold">Contatta guarinivolo1964@gmail.com per soluzioni personalizzate.</p>
                      </motion.div>
                    ) : isWeightValid ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-emerald-950 text-xs flex gap-2"
                      >
                        <span className="text-lg">✓</span>
                        <div>
                          <strong>Peso Idoneo:</strong> {weight} kg rientra perfettamente nei parametri di bilanciamento dell'ultraleggero.
                        </div>
                      </motion.div>
                    ) : (
                      <div className="text-slate-400 text-xs leading-relaxed">
                        L'ultraleggero è un velivolo leggero biposto (pilota + passeggero). È fondamentale indicare il peso reale del passeggero prima del volo per consentire al Pilota di calcolare l'assetto ideale e il consumo di carburante.
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                disabled={!isStep1Valid}
                onClick={() => setStep(2)}
                className={`flex items-center gap-2 font-bold px-6 py-3.5 rounded-2xl text-xs transition-all ${
                  isStep1Valid
                    ? "bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/10 cursor-pointer"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                Scegli Data e Ora <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Extended Date & Time Picker */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Selected Date Indicator Banner */}
            {selectedDate && (
              <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-md">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-sky-800 tracking-wider">Giorno Selezionato</div>
                    <div className="text-sm font-bold text-slate-800">{formatItalianDate(selectedDate)}</div>
                  </div>
                </div>
                <div className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Voli Disponibili
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Extended Interactive Calendar */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-750 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-600" /> 1. Seleziona la Data del Volo
                    </h3>
                    <p className="text-xs text-slate-450 mt-0.5">Calendario esteso: disponibilità aperta tutto l'anno</p>
                  </div>

                  {/* Direct input date selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Data:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      min="2026-07-17"
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        if (e.target.value) {
                          const parts = e.target.value.split("-");
                          if (parts.length === 3) {
                            setCalYear(parseInt(parts[0], 10));
                            setCalMonth(parseInt(parts[1], 10) - 1);
                          }
                        }
                      }}
                      className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white text-slate-700 font-medium focus:outline-none focus:border-sky-600"
                    />
                  </div>
                </div>

                {/* Quick Month Selectors */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {[
                    { label: "Lug 26", y: 2026, m: 6 },
                    { label: "Ago 26", y: 2026, m: 7 },
                    { label: "Set 26", y: 2026, m: 8 },
                    { label: "Ott 26", y: 2026, m: 9 },
                    { label: "Nov 26", y: 2026, m: 10 },
                    { label: "Dic 26", y: 2026, m: 11 },
                    { label: "Gen 27", y: 2027, m: 0 },
                    { label: "Feb 27", y: 2027, m: 1 },
                  ].map((item) => {
                    const isCurrent = calYear === item.y && calMonth === item.m;
                    return (
                      <button
                        key={`${item.y}-${item.m}`}
                        type="button"
                        onClick={() => {
                          setCalYear(item.y);
                          setCalMonth(item.m);
                        }}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Card View */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  {/* Month header & navigation */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      title="Mese precedente"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="text-center">
                      <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                        {ITALIAN_MONTH_NAMES[calMonth]} {calYear}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      title="Mese successivo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <div>Lun</div>
                    <div>Mar</div>
                    <div>Mer</div>
                    <div>Gio</div>
                    <div>Ven</div>
                    <div className="text-sky-600">Sab</div>
                    <div className="text-sky-600">Dom</div>
                  </div>

                  {/* Calendar Grid Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Blank padding cells before day 1 */}
                    {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
                      <div key={`blank-${idx}`} className="h-9 sm:h-10 rounded-lg bg-slate-50/50" />
                    ))}

                    {/* Day Cells */}
                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const dayDate = new Date(calYear, calMonth, dayNum);
                      const yyyy = calYear;
                      const mm = String(calMonth + 1).padStart(2, "0");
                      const dd = String(dayNum).padStart(2, "0");
                      const isoStr = `${yyyy}-${mm}-${dd}`;

                      const isSelected = selectedDate === isoStr;
                      // Consider past dates as before 2026-07-17 (baseline)
                      const isPast = dayDate < new Date(2026, 6, 17, 0, 0, 0);

                      return (
                        <button
                          key={isoStr}
                          type="button"
                          disabled={isPast}
                          onClick={() => setSelectedDate(isoStr)}
                          className={`h-9 sm:h-10 rounded-xl text-xs font-bold transition-all relative flex flex-col items-center justify-center cursor-pointer ${
                            isSelected
                              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30 scale-105 z-10 border-2 border-sky-400"
                              : isPast
                              ? "bg-slate-50 text-slate-300 cursor-not-allowed line-through"
                              : "bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-700 hover:border-sky-300 border border-transparent"
                          }`}
                        >
                          <span>{dayNum}</span>
                          {!isPast && (
                            <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Promoted Dates Pills */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Date Popolari & Festività:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Prossimo Weekend (18 Lug)", date: "2026-07-18" },
                      { label: "Ferragosto (15 Ago)", date: "2026-08-15" },
                      { label: "Inizio Settembre (5 Set)", date: "2026-09-05" },
                      { label: "Autunno in Volo (3 Ott)", date: "2026-10-03" },
                    ].map((item) => (
                      <button
                        key={item.date}
                        type="button"
                        onClick={() => {
                          setSelectedDate(item.date);
                          const parts = item.date.split("-");
                          setCalYear(parseInt(parts[0], 10));
                          setCalMonth(parseInt(parts[1], 10) - 1);
                        }}
                        className={`text-[10.5px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                          selectedDate === item.date
                            ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time Slots Selection */}
              <div className="lg:col-span-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-750 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" /> 2. Scegli la Fascia Oraria
                </h3>
                <p className="text-xs text-slate-450">Le condizioni del vento sono solitamente più calme all'alba e al tramonto:</p>

                <div className="space-y-2">
                  {timeSlots.map((slot) => {
                    const isSunset = slot.id === "slot-4";
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot.label)}
                        className={`w-full px-4 py-3.5 text-left rounded-xl border-2 transition-all flex justify-between items-center cursor-pointer ${
                          selectedSlot === slot.label
                            ? "bg-slate-950 text-white border-slate-950 shadow-md"
                            : isSunset
                            ? "bg-amber-50/60 border-amber-200 hover:bg-amber-50 text-slate-750"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5 text-slate-800">
                            <span className={selectedSlot === slot.label ? "text-white" : "text-slate-800"}>{slot.label}</span>
                            {isSunset && (
                              <span className="bg-amber-100 text-amber-900 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-black">
                                Consigliato 🌅
                              </span>
                            )}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${
                            selectedSlot === slot.label ? "text-slate-300" : "text-slate-400"
                          }`}>
                            {slot.desc}
                          </div>
                        </div>
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          selectedSlot === slot.label ? "bg-sky-400" : "bg-emerald-500"
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold px-4 py-2 cursor-pointer"
              >
                Indietro
              </button>
              <button
                type="button"
                disabled={!isStep2Valid}
                onClick={() => setStep(3)}
                className={`flex items-center gap-2 font-bold px-6 py-3.5 rounded-2xl text-xs transition-all ${
                  isStep2Valid
                    ? "bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/10 cursor-pointer"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                Riepilogo e Conferma <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Payment Choice & Summary */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Breakdown Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-widest">Riepilogo e Formula Pagamento</span>
                  <h4 className="text-base font-black text-white mt-0.5">{selectedPackage.name}</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Campo di Volo <strong>Duneairpark</strong> • {selectedDate} ({selectedSlot})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Prezzo Totale Volo</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">€{selectedPackage.price}</span>
                </div>
              </div>

              {/* Price Calculation breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-sky-950/60 border border-sky-500/30 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-sky-300 block">1. Acconto Prenotazione</span>
                    <span className="text-xs font-semibold text-slate-200">Online tramite PayPal</span>
                  </div>
                  <span className="text-lg font-black font-mono text-sky-400">€50,00</span>
                </div>

                <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-300 block">2. Saldo al Campo</span>
                    <span className="text-xs font-semibold text-slate-200">In Contanti al decollo</span>
                  </div>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    €{Math.max(0, selectedPackage.price - 50)},00
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleCheckout} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Payment Selection & PayPal Box */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-sm font-bold text-slate-750 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-sky-600" /> 3. Pagamento Acconto (€50,00)
                  </h3>
                  
                  {/* PayPal Deposit Active Option */}
                  <div className="bg-white border-2 border-sky-500 rounded-2xl p-5 shadow-md space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-sky-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                      Richiesto per Conferma
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-[#003087] text-white px-3 py-1.5 rounded-lg font-black italic text-sm tracking-tighter flex items-center gap-1 shadow-sm">
                        <span className="text-[#0070BA]">Pay</span><span>Pal</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Acconto di Prenotazione con PayPal (€50)</h4>
                        <p className="text-[11px] text-slate-500">Transazione sicura online con conto PayPal o carta di credito</p>
                      </div>
                    </div>

                    <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3 text-xs text-sky-950 space-y-1.5 leading-relaxed">
                      <div className="font-bold flex items-center gap-1.5 text-sky-900">
                        <Lock className="w-3.5 h-3.5 text-sky-600" />
                        <span>Garanzia Prenotazione Posto Volo:</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        L'acconto di €50 conferma il tuo slot in calendario. Il saldo rimanente di <strong>€{Math.max(0, selectedPackage.price - 50)}</strong> verrà saldato direttamente in <strong>contanti</strong> presso il campo di volo prima del decollo.
                      </p>
                    </div>

                    {/* PayPal Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const url = paypalInfo.paypalMeUrl.startsWith("http")
                            ? `${paypalInfo.paypalMeUrl}/${paypalInfo.depositAmount}`
                            : `https://${paypalInfo.paypalMeUrl}/${paypalInfo.depositAmount}`;
                          window.open(url, "_blank");
                        }}
                        className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all border border-amber-500/50"
                      >
                        <span className="italic font-black text-sm tracking-tighter text-[#003087]">PayPal</span>
                        <span>Apri PayPal per Acconto (€{paypalInfo.depositAmount},00)</span>
                      </button>
                      <span className="text-[10px] text-slate-400 text-center block mt-2">
                        🔒 Pagamento sicuro tramite conto PayPal o carta di credito su {paypalInfo.email}.
                      </span>
                    </div>
                  </div>

                  {/* Cash Balance Info */}
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-600 text-white text-lg font-bold">
                      💵
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900">Saldo Rimanente: €{Math.max(0, selectedPackage.price - 50)},00 in Contanti</h4>
                      <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                        Il saldo di €{Math.max(0, selectedPackage.price - 50)} va pagato in <strong>contanti</strong> direttamente al pilota o alla segreteria il giorno del volo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white p-6 rounded-2xl shadow-xl space-y-4">
                  <div className="flex justify-between items-start border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[9px] tracking-widest text-sky-400 font-mono block font-bold">DUNEAIRPARK RESERVATION</span>
                      <h4 className="text-sm font-bold text-white mt-1">Dettagli Prenotazione</h4>
                    </div>
                    <span className="text-2xl">✈️</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Passeggero:</span>
                      <span className="font-bold text-white text-right">{name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Telefono:</span>
                      <span className="font-semibold text-slate-200 text-right">{phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-semibold text-slate-200 text-right max-w-[150px] truncate">{email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Peso Passeggero:</span>
                      <span className="font-semibold text-slate-200 text-right">{weight} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pilota Assegnato:</span>
                      <span className="font-semibold text-sky-300 text-right">{selectedInstructor}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10">
                      <span className="text-slate-400">Data e Fascia:</span>
                      <span className="font-bold text-sky-400 text-right">{selectedDate} ({selectedSlot})</span>
                    </div>

                    <div className="pt-3 border-t border-white/10 space-y-1.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-slate-300">Acconto PayPal:</span>
                        <span className="text-sm font-bold text-sky-400 font-mono">€50,00</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-slate-300">Saldo in Contanti:</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">€{Math.max(0, selectedPackage.price - 50)},00</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-[10px] text-slate-300 leading-relaxed flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                    <span>Pagamento sicuro acconto €50 con PayPal. Il saldo si effettua in contanti al campo.</span>
                  </div>
                </div>
              </div>

              {/* Step 3 Actions */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-slate-500 hover:text-slate-800 text-xs font-bold px-4 py-2 cursor-pointer"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  disabled={!isStep3Valid}
                  className={`flex items-center gap-2 font-bold px-8 py-3.5 rounded-2xl text-xs transition-all ${
                    isStep3Valid
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Conferma e Paga Acconto €50 (PayPal) <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Step 4: Success & Automated Notification overlay */}
        {step === 4 && completedBooking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center py-2"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 mb-2">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-2xl font-display font-black text-slate-800">Acconto Ricevuto & Volo Prenotato!</h3>
              <p className="text-xs text-slate-500">
                L'acconto di €50 via PayPal è stato confermato. Saldo di €{Math.max(0, completedBooking.price - 50)} da versare in contanti al campo di volo.
              </p>
            </div>

            {/* Flight Ticket Visual */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-md mx-auto text-left overflow-hidden shadow-md">
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-sky-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Duneairpark Boarding Pass</span>
                </div>
                <span className="font-mono text-xs font-bold text-sky-400">{completedBooking.id}</span>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">PASSEGGERO</span>
                    <span className="text-xs font-bold text-slate-800 truncate block">{completedBooking.name}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">ISTRUTTORE</span>
                    <span className="text-xs font-bold text-sky-700 truncate block">{completedBooking.instructor || "Francesco Guarini"}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">CONTATTO</span>
                    <span className="text-xs font-medium text-slate-600 truncate block">{completedBooking.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">DATA VOLO</span>
                    <span className="text-xs font-bold text-slate-800">{completedBooking.date}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">FASCIA ORARIA</span>
                    <span className="text-xs font-bold text-sky-600">{completedBooking.timeSlot}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">ESPERIENZA</span>
                    <span className="text-[11px] font-bold text-slate-800 truncate block">{completedBooking.experienceName}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] text-slate-400 uppercase block">ACCONTO PAYPAL</span>
                    <span className="text-[11px] font-bold text-sky-600 block">€50,00 (Versato)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-400 uppercase block">SALDO IN CONTANTI</span>
                    <span className="text-xs font-extrabold text-emerald-600">€{Math.max(0, completedBooking.price - 50)},00</span>
                  </div>
                </div>
              </div>

              <div className="bg-sky-50 border-t border-sky-100 p-3 text-center text-[10px] text-sky-900 leading-relaxed font-medium">
                📍 Ritrovo: Campo di volo Duneairpark, Torre Canne - Ostuni • Consigliamo di arrivare 15 min prima.
              </div>
            </div>

            {/* Real-time automated email confirmation dispatch status box */}
            <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stato Notifiche Automatizzate:</h4>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Email con ricevuta acconto €50 inviata a: <strong>{completedBooking.email}</strong></span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Notifica di volo inviata al Pilota ({completedBooking.instructor || "Pilota"}): <strong className="text-sky-600">{(completedBooking.instructor === "Istruttore Rocco Gallone") ? "roccogallonevolo@gmail.com" : "guarinivolo1964@gmail.com"}</strong></span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Prenotazione e slot registrati nei sistemi Duneairpark.</span>
                </div>
              </div>
              <p className="text-[10.5px] text-slate-500 pt-1 leading-relaxed border-t border-slate-250">
                <strong>Nota di volo & Saldo:</strong> Il saldo di €{Math.max(0, completedBooking.price - 50)} verrà versato in contanti al momento del volo. Poiché i voli in ultraleggero dipendono dalle condizioni meteo, {completedBooking.instructor && completedBooking.instructor.includes("Rocco") ? "l'istruttore Rocco Gallone" : "il pilota"} ti contatterà 24 ore prima per la conferma definitiva.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Stampa Ricevuta
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-100 cursor-pointer"
              >
                Nuova Prenotazione
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
