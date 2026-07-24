import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Booking } from "../types";
import { Ticket, Printer, CheckCircle, MapPin, Calendar, Clock, User, Phone, Mail, ShieldCheck } from "lucide-react";

interface FlightReceiptProps {
  booking: Booking;
  onPrint?: () => void;
  showPrintButton?: boolean;
}

export default function FlightReceipt({ booking, showPrintButton = true }: FlightReceiptProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const depositAmount = 50;
  const remainingCash = Math.max(0, booking.price - depositAmount);

  useEffect(() => {
    if (booking) {
      const qrPayload = JSON.stringify({
        v: "1.0",
        app: "DUNEAIRPARK",
        flightNo: booking.id,
        passenger: booking.name,
        date: booking.date,
        time: booking.timeSlot,
        depositPaid: "€50.00",
        remainingCash: `€${remainingCash}.00`,
        status: "CONFIRMED"
      });

      QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 200,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        ? QRCode.toDataURL(qrPayload, {
            margin: 1,
            width: 200,
            color: { dark: "#0f172a", light: "#ffffff" },
          })
            .then((url) => setQrDataUrl(url))
            .catch((err) => console.error("Errore generazione QR code:", err))
        : null;
    }
  }, [booking, remainingCash]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* On-screen Print Trigger */}
      {showPrintButton && (
        <div className="flex justify-end no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all border border-slate-700"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>Stampa Ricevuta Minimale</span>
          </button>
        </div>
      )}

      {/* Printable Minimal Receipt Container */}
      <div
        id="printable-receipt"
        className="bg-white rounded-2xl border-2 border-slate-300 p-6 shadow-sm text-slate-800 space-y-5"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-black tracking-wider uppercase text-slate-900 font-display">
                DUNEAIRPARK
              </h2>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">
              Ricevuta Pagamento Acconto & Carta d'Imbarco Volo
            </p>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">NUMERO DEL VOLO</span>
            <span className="font-mono text-sm font-black bg-slate-900 text-sky-400 px-3 py-1 rounded-lg inline-block mt-0.5 tracking-wider">
              {booking.id}
            </span>
          </div>
        </div>

        {/* Deposit Status Badge */}
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-black uppercase text-emerald-900 block">
                Acconto Ricevuto: €{depositAmount},00
              </span>
              <span className="text-[10px] text-emerald-700 font-medium block">
                Pagamento registrato via PayPal • Transazione confermata
              </span>
            </div>
          </div>
          <span className="bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md">
            PAGATO
          </span>
        </div>

        {/* Flight & Passenger Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-200 pb-4">
          <div className="space-y-2">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" /> PASSEGGERO
              </span>
              <span className="font-bold text-slate-900 text-sm block">{booking.name}</span>
              {booking.weight > 0 && (
                <span className="text-[10px] text-slate-500 font-medium block">Peso: {booking.weight} kg</span>
              )}
            </div>

            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400" /> CONTATTI
              </span>
              <span className="text-slate-700 font-medium block truncate">{booking.email}</span>
              {booking.phone && <span className="text-slate-600 font-mono block">{booking.phone}</span>}
            </div>
          </div>

          <div className="space-y-2 border-l border-slate-200 pl-4">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-600" /> DATA & ORA VOLO
              </span>
              <span className="font-bold text-slate-900 text-sm block">{booking.date}</span>
              <span className="font-bold text-sky-700 block text-xs">{booking.timeSlot}</span>
            </div>

            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-slate-400" /> ESPERIENZA, AEREOCLUB & ISTRUTTORE
              </span>
              <span className="font-bold text-slate-800 block">{booking.experienceName}</span>
              <span className="text-slate-600 text-[11px] block">{booking.instructor || "Francesco Guarini"}</span>
              <span className="text-sky-700 font-mono text-[10.5px] font-bold block mt-0.5">
                Velivolo: Tecnam P92 Echo Standard (Marche: I-6320)
              </span>
            </div>
          </div>
        </div>

        {/* Financial Breakdown & QR Code Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          {/* Prices */}
          <div className="space-y-2 text-xs w-full sm:w-auto flex-1">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Quota Totale Esperienza:</span>
                <span className="font-bold font-mono">€{booking.price},00</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Acconto Pagato Online:</span>
                <span className="font-bold font-mono text-emerald-600">- €{depositAmount},00</span>
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900 text-sm">
                <span>Saldo in Contanti al Campo:</span>
                <span className="font-mono text-emerald-700">€{remainingCash},00</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 leading-tight">
              * Saldo in contanti da consegnare all'istruttore prima del decollo.
            </p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center shrink-0">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code Volo ${booking.id}`}
                className="w-28 h-28 object-contain rounded"
              />
            ) : (
              <div className="w-28 h-28 bg-slate-200 animate-pulse rounded" />
            )}
            <span className="text-[8.5px] font-bold text-slate-500 mt-1 uppercase tracking-wider block">
              CODICE QR D'IMBARCO
            </span>
          </div>
        </div>

        {/* Airfield Location & Flight Info Footer */}
        <div className="border-t-2 border-slate-200 pt-3 text-[10px] text-slate-600 space-y-1">
          <div className="flex items-center gap-1 font-bold text-slate-800">
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Ritrovo: Campo di Volo Duneairpark • Torre Canne - Ostuni (BR)</span>
          </div>
          <p className="text-slate-500 leading-normal">
            Si raccomanda di presentarsi 15 minuti prima dell'orario stabilito. In caso di condizioni meteorologiche avverse, l'istruttore ti contatterà al numero indicato.
          </p>
          <div className="flex justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100 font-mono">
            <span>Duneairpark S.r.l. • soc.agr.flyfoodsrl@gmail.com</span>
            <span>Data Emissione: {new Date().toLocaleDateString("it-IT")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
