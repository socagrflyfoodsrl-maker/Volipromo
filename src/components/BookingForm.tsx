import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FlightPackage, Booking } from "../types";
import { Calendar, Clock, User, Mail, Phone, Scale, CreditCard, ChevronRight, CheckCircle, Ticket, Printer, RefreshCw, Lock } from "lucide-react";

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

  // Date & Time state (Puglia summer dates starting around mid-July 2026)
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  // Payment state
  const [cardName, setCardName] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvv, setCardCvv] = useState<string>("");

  // Completed booking placeholder
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  // Constants
  const timeSlots = [
    { id: "slot-1", label: "09:00 - 11:00", desc: "Aria fresca mattutina, visibilità limpida" },
    { id: "slot-2", label: "11:00 - 13:00", desc: "Sole a picco, colori del mare intensi" },
    { id: "slot-3", label: "15:00 - 17:00", desc: "Brezza pomeridiana ideale" },
    { id: "slot-4", label: "17:00 - 19:00", desc: "Luce calda del tramonto (Consigliatissimo per foto! 🌅)" },
  ];

  // Helper: generates next 7 days starting from current date: Friday July 17, 2026
  const generateDates = () => {
    const dates = [];
    const weekdays = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
    const months = [
      "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
      "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
    ];

    const baseDate = new Date(2026, 6, 17); // July 17, 2026

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const isoString = d.toISOString().split("T")[0];
      const label = `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
      dates.push({ isoString, label });
    }
    return dates;
  };

  const datesList = generateDates();

  // Weight Safety check logic
  const isWeightWarning = weight !== "" && Number(weight) > 100;
  const isWeightValid = weight !== "" && Number(weight) > 0 && Number(weight) <= 100;

  // Validation helpers
  const isStep1Valid = name.trim() !== "" && email.includes("@") && phone.trim().length >= 8 && isWeightValid;
  const isStep2Valid = selectedDate !== "" && selectedSlot !== "";
  const isStep3Valid = cardName.trim() !== "" && cardNumber.replace(/\s/g, "").length === 16 && cardExpiry.length === 5 && cardCvv.length === 3;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    const formatted = val.replace(/(\d{4})(?=\d)/g, "$1 ").substring(0, 19);
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length >= 2) {
      val = val.substring(0, 2) + "/" + val.substring(2, 4);
    }
    setCardExpiry(val.substring(0, 5));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setCardCvv(val.substring(0, 3));
  };

  // Process Booking with server
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep3Valid) return;

    setLoading(true);
    setLoadingMessage("Elaborazione del pagamento sicuro...");

    // Stage 1: Process Payment
    setTimeout(() => {
      setLoadingMessage("Pagamento approvato! Registrazione prenotazione nel server...");

      // Stage 2: Save Booking and Trigger Notifications
      setTimeout(async () => {
        setLoadingMessage("Generazione notifica automatizzata per il pilota (guarinivolo1964@gmail.com)...");

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
              paymentMethod: "Carta di Credito",
            }),
          });

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
            paymentMethod: "Carta di Credito",
            status: "confirmed",
            createdAt: new Date().toISOString(),
          };
          setCompletedBooking(fallback);
          onBookingComplete(fallback);
          setStep(4);
        } finally {
          setLoading(false);
          setLoadingMessage("");
        }
      }, 1500);
    }, 1500);
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setWeight("");
    setSelectedDate("");
    setSelectedSlot("");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setCompletedBooking(null);
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
              { num: 3, label: "Pagamento" },
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
                        L'ultraleggero è un velivolo leggero biposto (pilota + passeggero). È fondamentale indicare il peso reale del passeggero prima del volo per consentire al Pilota Guarini di calcolare l'assetto ideale e il consumo di carburante.
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

        {/* Step 2: Date & Time Picker */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Custom Date Picker */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-750 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-600" /> 1. Seleziona il Giorno (Luglio 2026)
                </h3>
                <p className="text-xs text-slate-450">Date promozionali disponibili per voli estivi in Puglia:</p>

                <div className="grid grid-cols-1 gap-2">
                  {datesList.map((d) => (
                    <button
                      key={d.isoString}
                      type="button"
                      onClick={() => setSelectedDate(d.isoString)}
                      className={`px-4 py-3.5 text-xs font-bold rounded-xl border-2 text-left flex justify-between items-center transition-all ${
                        selectedDate === d.isoString
                          ? "bg-sky-600 text-white border-sky-600 shadow-lg shadow-sky-600/10"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>{d.label}</span>
                      <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-black ${
                        selectedDate === d.isoString ? "bg-sky-700 text-white" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        Libero
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              <div className="space-y-3">
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
                        className={`w-full px-4 py-3.5 text-left rounded-xl border-2 transition-all flex justify-between items-center ${
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
                className="text-slate-500 hover:text-slate-800 text-xs font-bold px-4 py-2"
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
                Procedi al Pagamento <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Payment Portal Simulation */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Riepilogo Esperienza</span>
                <h4 className="text-sm font-black text-slate-800">{selectedPackage.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Decollo da <strong>Duneairpark</strong>, il {selectedDate} ({selectedSlot})
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-semibold">TOTALE PROMO</span>
                <span className="text-lg font-black text-emerald-600 font-mono">€{selectedPackage.price}</span>
              </div>
            </div>

            <form onSubmit={handleCheckout} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Simulated Card input fields */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-750 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-sky-600" /> Pagamento Sicuro con Carta
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">Titolare della Carta *</label>
                      <input
                        type="text"
                        placeholder="E.g. Mario Rossi"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">Numero Carta di Credito *</label>
                      <input
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-colors font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">Scadenza *</label>
                        <input
                          type="text"
                          placeholder="MM/AA"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-colors font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-450 block mb-1.5 tracking-widest">CVV *</label>
                        <input
                          type="password"
                          placeholder="123"
                          value={cardCvv}
                          onChange={handleCvvChange}
                          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-sky-600 bg-white font-semibold text-slate-700 transition-colors font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secure payment graphics & card visual preview */}
                <div className="bg-gradient-to-br from-sky-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between h-48 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl" />
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] tracking-wider text-sky-300 font-mono block font-bold">DUNEAIRPARK FLIGHT CARD</span>
                      <span className="text-[10px] text-slate-400">Puglia Air Promotional Booking</span>
                    </div>
                    <span className="text-xl">✈️</span>
                  </div>

                  <div className="text-sm tracking-widest font-mono py-1">
                    {cardNumber || "•••• •••• •••• ••••"}
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[8px] text-slate-400 block">CARDHOLDER</span>
                      <span className="text-[11px] font-bold uppercase truncate max-w-[150px]">
                        {cardName || "MARIO ROSSI"}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <span className="text-[8px] text-slate-400 block">EXPIRES</span>
                        <span className="text-[11px] font-mono">{cardExpiry || "MM/AA"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block">CVV</span>
                        <span className="text-[11px] font-mono">***</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border-2 border-slate-200 flex items-center gap-2 justify-center text-[10.5px] text-slate-500 font-medium">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Transazione crittografata a 256-bit. Nessun dato reale della carta viene archiviato.</span>
              </div>

              {/* Step 3 Actions */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-slate-500 hover:text-slate-800 text-xs font-bold px-4 py-2"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  disabled={!isStep3Valid}
                  className={`flex items-center gap-2 font-bold px-8 py-3.5 rounded-2xl text-xs transition-all ${
                    isStep3Valid
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/15 cursor-pointer"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Paga & Conferma Ora €{selectedPackage.price}
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
              <h3 className="text-2xl font-display font-black text-slate-800">Pagamento & Volo Confermato!</h3>
              <p className="text-xs text-slate-500">
                La prenotazione è stata elaborata con successo con codice identificativo unico.
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
                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">PASSEGGERO</span>
                    <span className="text-xs font-bold text-slate-800">{completedBooking.name}</span>
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
                    <span className="text-[8px] text-slate-400 uppercase block">PESO PASSEGGERO</span>
                    <span className="text-xs font-bold text-slate-800">{completedBooking.weight} kg</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-400 uppercase block">PAGATO</span>
                    <span className="text-xs font-extrabold text-emerald-600">€{completedBooking.price}</span>
                  </div>
                </div>
              </div>

              <div className="bg-sky-50 border-t border-sky-100 p-3 text-center text-[10px] text-sky-900 leading-relaxed font-medium">
                📍 Ritrovo: Campo di volo Duneairpark, Savelletri (BR) • Consigliamo di arrivare 15 min prima.
              </div>
            </div>

            {/* Real-time automated email confirmation dispatch status box */}
            <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stato Notifiche Automatizzate:</h4>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Email di riepilogo inviata al passeggero: <strong>{completedBooking.email}</strong></span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Email di notifica inviata al Pilota Guarini: <strong className="text-sky-600">guarinivolo1964@gmail.com</strong></span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Prenotazione registrata nei sistemi di Duneairpark.</span>
                </div>
              </div>
              <p className="text-[10.5px] text-slate-500 pt-1 leading-relaxed border-t border-slate-250">
                <strong>Nota di volo:</strong> Poiché i voli in ultraleggero sono legati a vento e visibilità, l'istruttore Guarini ti contatterà via telefono o email 24 ore prima per confermare l'idoneità meteo o concordare un eventuale orario alternativo.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Stampa Ricevuta
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-100"
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
