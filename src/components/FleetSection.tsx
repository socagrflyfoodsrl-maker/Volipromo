import React from "react";
import { 
  Plane, 
  ShieldCheck, 
  Gauge, 
  Wind, 
  Compass, 
  Users, 
  Radio, 
  Zap, 
  CheckCircle2, 
  ChevronRight,
  Info,
  Award
} from "lucide-react";
import aircraftImg from "../assets/images/tecnam_p92_echo_1784875556006.jpg";

interface FleetSectionProps {
  onBookFlight?: () => void;
}

export default function FleetSection({ onBookFlight }: FleetSectionProps) {
  const specs = [
    {
      icon: Gauge,
      label: "Motore",
      value: "Rotax 912 ULS (100 CV)",
      detail: "4 cilindri boxer a 4 tempi raffreddato a liquido/aria, punto di riferimento per affidabilità"
    },
    {
      icon: Wind,
      label: "Velocità di Crociera",
      value: "180 km/h",
      detail: "Crociera fluida e stabile per ammirare al meglio il litorale e la valle d'Itria"
    },
    {
      icon: Compass,
      label: "Autonomia & Raggio",
      value: "5.0 Ore (~700 km)",
      detail: "Ampio raggio d'azione con serbatoi alari ad alta capacità"
    },
    {
      icon: Users,
      label: "Configurazione Cabina",
      value: "2 Posti Affiancati (P-92 Echo)",
      detail: "Posti affiancati con doppi comandi completi, ideale per voli promozionali e scuola"
    },
    {
      icon: ShieldCheck,
      label: "Sicurezza Balistica",
      value: "Paracadute Balistico BRS®",
      detail: "Sistema di salvataggio balistico ad estrazione pirotecnica rapida"
    },
    {
      icon: Radio,
      label: "Avionica & Strumenti",
      value: "Interfono ANR & Radio 8.33 kHz",
      detail: "Cuffie aeronautiche ad abbattimento rumore attivo e navigatore GPS aeronautico"
    }
  ];

  const safetyFeatures = [
    "Struttura cellula in lega d'alluminio e traliccio d'acciaio al cromo-molibdeno",
    "Configurazione ad Ala Alta che garantisce visibilità fotografica panoramica a 360° verso il basso",
    "Doppio comando di volo affiancato per la massima sicurezza e controllo",
    "Paracadute balistico d'emergenza BRS® integrato",
    "Cuffie aeronautiche ANR con isolamento acustico di livello professionale",
    "Ispezioni e manutenzione tecnica periodica certificata prima di ogni giornata di volo"
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-sky-50 border border-sky-100 text-sky-800 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              <Plane className="w-3.5 h-3.5 text-sky-600" />
              <span>La Nostra Flotta Ufficiale</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-slate-900 mt-2">
              Tecnam P92 Echo Standard
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Il velivolo simbolo dell'Aviazione Leggera Italiana. L'ultraleggero monoplano ad ala alta <strong>Tecnam P92 Echo Standard</strong> è rinomato per le sue straordinarie doti di stabilità, facilità di pilotaggio ed un'impareggiabile visuale panoramica sulla costa pugliese.
            </p>
          </div>

          {onBookFlight && (
            <button
              type="button"
              onClick={onBookFlight}
              className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Prenota Volo su P92 Echo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Aircraft Showcase Card */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12">
        {/* Photo Column */}
        <div className="lg:col-span-7 relative bg-slate-900 group min-h-[300px] sm:min-h-[400px]">
          <img
            src={aircraftImg}
            alt="Tecnam P92 Echo Standard Duneairpark"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex flex-col justify-end p-6 text-white">
            <span className="text-[10px] font-mono font-bold text-amber-300 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-700/80 w-fit uppercase mb-1">
              TECNAM P92 ECHO STANDARD • I-DUNE
            </span>
            <h3 className="text-xl font-display font-black">Sorvola Torre Canne e la Costa dei Trulli</h3>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Grazie alla configurazione ad ala alta, le ali non ostacolano la vista: goditi lo spettacolo del mare e dei paesaggi pugliesi.
            </p>
          </div>
        </div>

        {/* Quick Summary Info Column */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 text-amber-600 text-xs font-extrabold uppercase tracking-wider mb-2">
              <Award className="w-4 h-4" />
              <span>Icona Tecnam Costruzioni Aeronautiche</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-display">
              Perché il P92 Echo Standard?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Il Tecnam P92 Echo è una vera icona nei cieli europei e mondiali. Costruito con alluminio aeronautico e traliccio d'acciaio, offre caratteristiche di volo prive di criticità, estrema morbidezza nei comandi e massima docilità nelle manovre a bassa velocità.
            </p>
          </div>

          {/* Quick Specs Pills */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white border border-slate-200 p-3 rounded-2xl">
              <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Velocità Max</span>
              <span className="text-sm font-black text-slate-900 font-mono">210 km/h</span>
            </div>
            <div className="bg-white border border-slate-200 p-3 rounded-2xl">
              <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Decollo</span>
              <span className="text-sm font-black text-slate-900 font-mono">~120 metri</span>
            </div>
            <div className="bg-white border border-slate-200 p-3 rounded-2xl">
              <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Configurazione</span>
              <span className="text-sm font-black text-slate-900 font-mono">Ala Alta Biposto</span>
            </div>
            <div className="bg-white border border-slate-200 p-3 rounded-2xl">
              <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Vista Panoramica</span>
              <span className="text-sm font-black text-sky-700">Incomparabile</span>
            </div>
          </div>

          {/* Pilot Guarantee */}
          <div className="bg-sky-50 border border-sky-100 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-sky-950">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-snug">
              Il P92 Echo è ispezionato scrupolosamente prima di ogni volo dagli istruttori qualificati <strong>Francesco Guarini</strong> e <strong>Rocco Gallone</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Technical Specifications Grid */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-display font-black text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Scheda Tecnica & Caratteristiche del P92 Echo</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Dettagli costruttivi dell'aereo da turismo biposto ad ala alta in dotazione a Duneairpark.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {specs.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-1.5 hover:border-sky-300 transition-colors"
              >
                <div className="flex items-center gap-2 text-sky-700">
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {item.label}
                  </span>
                </div>
                <div className="text-sm font-black text-slate-900 font-display">
                  {item.value}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety & Comfort Equipment */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
        <div>
          <span className="text-[10px] font-extrabold tracking-widest text-sky-400 uppercase bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            Sicurezza & Affidabilità
          </span>
          <h3 className="text-xl font-display font-black mt-3">
            Dotazioni Tecniche & Standard VDS a Bordo del Tecnam P92
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Garantiamo il massimo livello di comfort e protezione per tutti i nostri passeggeri.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {safetyFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex items-start gap-3"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-200 font-medium leading-relaxed">
                {feat}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

