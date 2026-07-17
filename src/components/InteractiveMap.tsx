import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FlightPackage } from "../types";
import { MapPin, Navigation, Info, Compass } from "lucide-react";

interface InteractiveMapProps {
  packages: FlightPackage[];
  selectedPackage: FlightPackage;
  onSelectPackage: (pkg: FlightPackage) => void;
}

interface Landmark {
  id: string;
  name: string;
  x: number;
  y: number;
  desc: string;
}

export default function InteractiveMap({
  packages,
  selectedPackage,
  onSelectPackage,
}: InteractiveMapProps) {
  const [hoveredLandmark, setHoveredLandmark] = useState<Landmark | null>(null);

  // Landmark coordinates aligned with our custom SVG Puglia map dimensions (800 x 500)
  const landmarks: Landmark[] = [
    {
      id: "duneairpark",
      name: "Campo di Volo Duneairpark 🛫",
      x: 320,
      y: 120,
      desc: "La base di decollo fronte mare con pista in erba. Punto di partenza di tutti i voli.",
    },
    {
      id: "egnazia",
      name: "Rovine di Egnazia 🏛️",
      x: 280,
      y: 70,
      desc: "Antico sito archeologico romano situato proprio sulla costa adriatica.",
    },
    {
      id: "fasano",
      name: "Fasano 🌳",
      x: 200,
      y: 160,
      desc: "Immersa tra uliveti secolari e famosa per la Selva e lo Zoo Safari.",
    },
    {
      id: "alberobello",
      name: "Alberobello 🛖",
      x: 80,
      y: 220,
      desc: "La capitale dei Trulli, patrimonio mondiale dell'UNESCO.",
    },
    {
      id: "locorotondo",
      name: "Locorotondo 🍷",
      x: 160,
      y: 280,
      desc: "Uno dei borghi più belli d'Italia, caratterizzato da case bianche a cummerse.",
    },
    {
      id: "cisternino",
      name: "Cisternino 🥩",
      x: 260,
      y: 330,
      desc: "Celebre borgo della Valle d'Itria famoso per le sue bombette e i vicoli bianchi.",
    },
    {
      id: "ostuni",
      name: "Ostuni (La Città Bianca) 🏰",
      x: 480,
      y: 380,
      desc: "Spettacolare città medievale arroccata sui colli, interamente dipinta di calce bianca.",
    },
    {
      id: "torre_canne",
      name: "Torre Canne 🏖️",
      x: 420,
      y: 200,
      desc: "Località marina con spiagge di sabbia finissima, dune costiere e un faro monumentale.",
    },
  ];

  // Flight paths defined as SVG coordinate curves matching the landmarks
  // Each index corresponds to experiences 'battesimo', 'trulli', 'cittabianche', 'grandtour'
  const getFlightPath = (pkgId: string) => {
    switch (pkgId) {
      case "battesimo":
        // Duneairpark (320,120) -> Egnazia (280,70) -> Savelletri Coast (380,80) -> Duneairpark (320,120)
        return "M 320 120 Q 280 70 300 60 T 360 80 Z";
      case "trulli":
        // Duneairpark (320,120) -> Fasano (200,160) -> Alberobello (80,220) -> Savelletri (350,90) -> Duneairpark
        return "M 320 120 C 240 130, 220 150, 200 160 C 130 180, 100 200, 80 220 C 150 170, 280 120, 320 120 Z";
      case "cittabianche":
        // Duneairpark (320,120) -> Fasano (200,160) -> Ostuni (480,380) -> Torre Canne (420,200) -> Duneairpark
        return "M 320 120 C 230 140, 220 220, 320 280 C 420 340, 460 360, 480 380 C 440 280, 430 220, 320 120 Z";
      case "grandtour":
        // Full circular loop encompassing all points
        return "M 320 120 C 180 140, 120 180, 80 220 C 120 260, 140 280, 160 280 C 210 300, 240 310, 260 330 C 370 360, 430 370, 480 380 C 450 250, 410 180, 320 120 Z";
      default:
        return "M 320 120 Q 280 70 300 60 T 360 80 Z";
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
      {/* Map visualization area (lg: col-span-8) */}
      <div className="p-6 lg:col-span-8 bg-slate-50 relative flex flex-col justify-between min-h-[400px]">
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
          <Compass className="w-5 h-5 text-sky-500 animate-spin-slow" />
          <span className="text-sm font-semibold text-slate-800">Rotta di Volo Interattiva</span>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-100 shadow-sm space-y-1.5 text-xs hidden sm:block">
          <p className="font-bold text-slate-700 mb-1">Colori delle Rotte:</p>
          <div className="flex flex-col gap-1">
            {packages.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 cursor-pointer transition-all ${
                  selectedPackage.id === p.id ? "font-bold text-slate-900 scale-105" : "text-slate-500"
                }`}
                onClick={() => onSelectPackage(p)}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.routeColor }} />
                <span>{p.name} ({p.duration} min)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main SVG Map Canvas */}
        <div className="w-full h-full flex items-center justify-center py-4">
          <svg
            viewBox="0 0 600 450"
            className="w-full max-w-[600px] h-auto drop-shadow-lg"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Coastline visual effect */}
            <path
              d="M 220 0 C 350 40, 480 180, 600 320 L 600 0 Z"
              fill="#e0f2fe"
              className="opacity-70"
            />
            
            {/* Adriatic Sea Text */}
            <text
              x="500"
              y="100"
              fill="#0284c7"
              className="text-xs font-semibold uppercase tracking-widest select-none opacity-40 font-display"
            >
              Mare Adriatico
            </text>

            {/* Ancient Olive Plains background detail */}
            <path
              d="M 0 0 L 220 0 C 350 40, 480 180, 600 320 L 600 450 L 0 450 Z"
              fill="#f8fafc"
            />

            {/* Stylized olive orchards pattern / green fields represent Puglia landscape */}
            <ellipse cx="210" cy="110" rx="40" ry="15" fill="#f1f5f9" className="opacity-80" />
            <ellipse cx="380" cy="270" rx="60" ry="25" fill="#f1f5f9" className="opacity-80" />
            <ellipse cx="140" cy="350" rx="50" ry="20" fill="#f1f5f9" className="opacity-80" />

            {/* Connecting Roads / Guide lines in light grey */}
            <path
              d="M 200 160 Q 260 110 320 120 T 420 200 T 480 380"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="3"
            />
            <path
              d="M 80 220 Q 160 280 260 330 T 480 380"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="2"
            />

            {/* Inactive Paths (Drawn in subtle grey dashed lines) */}
            {packages.map((p) => {
              if (p.id === selectedPackage.id) return null;
              return (
                <path
                  key={`inactive-${p.id}`}
                  d={getFlightPath(p.id)}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                  strokeDasharray="4 6"
                  className="opacity-60 transition-all duration-300"
                />
              );
            })}

            {/* ACTIVE SELECTION FLIGHT PATH (Glowing animated line) */}
            <AnimatePresence mode="wait">
              <motion.path
                key={`active-path-${selectedPackage.id}`}
                d={getFlightPath(selectedPackage.id)}
                fill="none"
                stroke={selectedPackage.routeColor}
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 1000" }}
                animate={{
                  strokeDasharray: "15 10",
                  strokeDashoffset: [-100, 0],
                }}
                transition={{
                  strokeDasharray: { duration: 0.5 },
                  strokeDashoffset: { repeat: Infinity, duration: 4, ease: "linear" },
                }}
                className="drop-shadow-[0_2px_8px_rgba(14,165,233,0.4)]"
              />
            </AnimatePresence>

            {/* Glowing active aircraft icon following the path */}
            <g transform="translate(-10, -10)">
              {/* Takeoff point marker */}
              <circle cx="320" cy="120" r="12" fill="#bae6fd" className="animate-ping opacity-75" />
              <circle cx="320" cy="120" r="6" fill="#0284c7" />
            </g>

            {/* Rendering Landmarks */}
            {landmarks.map((l) => {
              const isTakeoff = l.id === "duneairpark";
              const isSelectedRouteNode = (() => {
                if (selectedPackage.id === "battesimo" && ["duneairpark", "egnazia"].includes(l.id)) return true;
                if (selectedPackage.id === "trulli" && ["duneairpark", "fasano", "alberobello"].includes(l.id)) return true;
                if (selectedPackage.id === "cittabianche" && ["duneairpark", "fasano", "ostuni", "torre_canne"].includes(l.id)) return true;
                if (selectedPackage.id === "grandtour") return true; // Encompasses all
                return false;
              })();

              return (
                <g
                  key={l.id}
                  transform={`translate(${l.x}, ${l.y})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredLandmark(l)}
                  onMouseLeave={() => setHoveredLandmark(null)}
                >
                  {/* Landmark Node glow */}
                  <circle
                    r={isTakeoff ? 10 : 6}
                    fill={isTakeoff ? "#0ea5e9" : isSelectedRouteNode ? selectedPackage.routeColor : "#94a3b8"}
                    className={`transition-all duration-300 ${
                      isTakeoff ? "ring-4 ring-sky-100" : "hover:scale-125"
                    }`}
                  />
                  {isSelectedRouteNode && !isTakeoff && (
                    <circle
                      r="12"
                      fill="none"
                      stroke={selectedPackage.routeColor}
                      strokeWidth="1.5"
                      className="animate-pulse"
                    />
                  )}

                  {/* Label background for legibility */}
                  <rect
                    x="-40"
                    y={isTakeoff ? "14" : "-24"}
                    width="80"
                    height="16"
                    rx="4"
                    fill="white"
                    fillOpacity="0.85"
                    stroke="#e2e8f0"
                    strokeWidth="0.5"
                    className="pointer-events-none"
                  />

                  {/* Label Text */}
                  <text
                    y={isTakeoff ? "25" : "-13"}
                    textAnchor="middle"
                    fill="#1e293b"
                    className="text-[9px] font-bold select-none font-sans pointer-events-none"
                  >
                    {l.id === "duneairpark" ? "Duneairpark" : l.name.replace(/[^a-zA-Z\s]/g, "").trim()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dynamic Landmark Tooltip info */}
        <div className="h-14 mt-2">
          <AnimatePresence mode="wait">
            {hoveredLandmark ? (
              <motion.div
                key={hoveredLandmark.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-sky-50 border border-sky-100 p-2.5 rounded-xl text-xs text-sky-900 flex items-start gap-2 max-w-lg mx-auto"
              >
                <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sky-950">{hoveredLandmark.name}</strong>
                  <span className="text-[11px] text-sky-800">{hoveredLandmark.desc}</span>
                </div>
              </motion.div>
            ) : (
              <div className="text-center text-xs text-slate-400 py-3 flex items-center justify-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 animate-bounce-slow text-slate-300" />
                <span>Passa il mouse sui punti della mappa per esplorare le attrazioni della Puglia</span>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Package Description Panel (lg: col-span-4) */}
      <div className="p-6 lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full uppercase">
            Rotta Attiva
          </span>
          <h3 className="text-2xl font-display font-extrabold text-slate-800 mt-2">
            {selectedPackage.name}
          </h3>
          <div className="flex items-center gap-3 mt-3">
            <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block uppercase">DURATA</span>
              <span className="text-sm font-extrabold text-slate-700">{selectedPackage.duration} Minuti</span>
            </div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block uppercase">TARIFFA PROMO</span>
              <span className="text-sm font-extrabold text-emerald-600">€{selectedPackage.price}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            {selectedPackage.longDesc}
          </p>

          <div className="mt-5 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">In Evidenza:</h4>
            <ul className="space-y-1.5">
              {selectedPackage.highlights.map((h, index) => (
                <li key={index} className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: selectedPackage.routeColor }} />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 mt-6 space-y-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
            <span className="text-lg">🌤️</span>
            <div className="text-[10.5px] text-amber-900 leading-relaxed">
              <strong>Info Volo:</strong> Decollando da <strong>Duneairpark</strong>, la rotta costeggia il mare. In caso di vento forte, la rotta viene adattata per comfort e sicurezza.
            </div>
          </div>
          <button
            onClick={() => {
              const element = document.getElementById("booking-section");
              if (element) element.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-sky-100 transition-all text-xs flex items-center justify-center gap-2 group"
          >
            Seleziona & Prenota
            <Navigation className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
