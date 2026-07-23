import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mail, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Send, 
  RefreshCw, 
  Eye, 
  Clock, 
  Terminal, 
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  simulated: boolean;
  success: boolean;
  error?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  toPilot: string;
  configured: boolean;
}

export function EmailAdminPanel() {
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  
  // Test email form state
  const [testTo, setTestTo] = useState("");
  const [testSubject, setTestSubject] = useState("Duneairpark - Email di Test Connessione");
  const [testBody, setTestBody] = useState("Se stai leggendo questa email, la tua configurazione SMTP per Duneairpark è corretta e operativa!");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load configs and logs
  const loadData = async () => {
    setLoading(true);
    try {
      const [configRes, logsRes] = await Promise.all([
        fetch("/api/email/config"),
        fetch("/api/email/logs")
      ]);
      
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData.config);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs);
      }
    } catch (error) {
      console.error("Errore nel caricamento del pannello email:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh logs every 15 seconds to catch new bookings
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTo.trim()) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testTo,
          subject: testSubject,
          body: testBody
        })
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Risposta del server non valida.");
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.result?.simulated 
            ? "Simulazione completata con successo! L'email è stata registrata nel log qui sotto (Simulazione)."
            : "Email di test inviata realmente tramite SMTP con successo!"
        });
        // Reload logs to show test email
        loadData();
      } else {
        setTestResult({
          success: false,
          message: data.error || "Impossibile completare l'operazione."
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || "Errore di rete durante l'invio."
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden" id="email-admin">
      {/* Panel Header */}
      <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800">
        <div className="space-y-1 text-left">
          <span className="text-[9px] font-bold uppercase tracking-widest text-sky-400 bg-sky-950/80 px-2.5 py-1 rounded-md border border-sky-900/50">
            Console di Controllo
          </span>
          <h3 className="text-lg font-display font-black tracking-tight flex items-center gap-2 mt-1.5">
            <Settings className="w-5 h-5 text-sky-400" /> Pannello Gestione Notifiche ed Email
          </h3>
          <p className="text-[11px] text-slate-400 max-w-xl">
            Monitora i canali di comunicazione con i passeggeri e i piloti. Configura SMTP o ispeziona le ricevute digitali generate in tempo reale.
          </p>
        </div>
        
        <button
          onClick={loadData}
          disabled={loading}
          className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all self-stretch sm:self-auto justify-center cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 division-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        {/* Left Column: Config & Test (5 cols) */}
        <div className="lg:col-span-5 p-6 space-y-6 text-left">
          {/* Status block */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Stato Server di Posta
            </h4>
            
            {config ? (
              config.configured ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-extrabold text-emerald-800">SMTP Reale Attivo</span>
                  </div>
                  <div className="space-y-1 font-mono text-[10px] text-emerald-700">
                    <div>Host: {config.host}</div>
                    <div>Porta: {config.port}</div>
                    <div>User: {config.user}</div>
                    <div>Mittente: {config.from}</div>
                    <div>Email Pilota: {config.toPilot}</div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-extrabold text-amber-800 block">Simulazione Attiva</span>
                      <p className="text-[10.5px] text-amber-700 leading-normal mt-1">
                        Le email non vengono inviate realmente alla posta ma sono simulate in console e registrate in tempo reale nel log a fianco.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white/60 p-2.5 rounded-xl border border-amber-200/50 text-[9.5px] text-amber-800 leading-relaxed font-medium space-y-1.5">
                    <div>
                      💡 Per inviare email reali, configura queste variabili nel tuo file <code className="font-mono bg-amber-100 px-1 rounded text-red-700 font-bold">.env</code>:
                      <div className="font-mono mt-1 text-[9px] bg-slate-50 p-1.5 rounded text-slate-700">
                        SMTP_HOST=smtp.gmail.com<br />
                        SMTP_PORT=587<br />
                        SMTP_USER=soc.agr.flyfoodsrl@gmail.com<br />
                        SMTP_PASS=xxxx xxxx xxxx xxxx
                      </div>
                    </div>
                    <div className="bg-amber-100/70 p-2 rounded-lg text-[9px] text-amber-900 border border-amber-300/60 font-sans">
                      <strong>⚠️ Nota per Gmail:</strong> Non usare la password normale del tuo account Google. Genera una <strong>Password per le App</strong> da <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold text-sky-800">myaccount.google.com/apppasswords</a> ed incollala in <code className="font-mono font-bold text-amber-950">SMTP_PASS</code>.
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="animate-pulse bg-slate-100 h-24 rounded-2xl" />
            )}
          </div>

          {/* Test form */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-600" /> Test Invia Email
              </h4>
              <p className="text-[10.5px] text-slate-400">
                Invia una notifica di prova per validare immediatamente le credenziali.
              </p>
            </div>

            <form onSubmit={handleSendTest} className="space-y-3">
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Destinatario *</label>
                <input
                  type="email"
                  required
                  placeholder="E.g. pilota@esempio.it"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-sky-600 bg-white font-semibold text-slate-700 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Oggetto</label>
                <input
                  type="text"
                  required
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-sky-600 bg-white font-semibold text-slate-700 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Corpo Messaggio</label>
                <textarea
                  rows={3}
                  required
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-sky-600 bg-white font-semibold text-slate-700 outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sendingTest || !testTo}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  sendingTest || !testTo
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-md shadow-sky-600/10"
                }`}
              >
                {sendingTest ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Invia Test di Connessione
              </button>

              {testResult && (
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl border text-[10.5px] leading-relaxed flex items-start gap-2 ${
                    testResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}>
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="break-all">{testResult.message}</span>
                  </div>

                  {(!testResult.success && (
                    testResult.message.includes("535") || 
                    testResult.message.toLowerCase().includes("username and password not accepted") || 
                    testResult.message.toLowerCase().includes("invalid login") ||
                    testResult.message.toLowerCase().includes("credentials") ||
                    (config?.user && config.user.toLowerCase().includes("gmail.com"))
                  )) && (
                    <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 space-y-2">
                      <div className="font-extrabold flex items-center gap-1.5 text-sky-950">
                        <Settings className="w-4 h-4 text-sky-600 animate-spin-slow" />
                        <span>⚠️ GUIDA: Come risolvere l'errore Gmail (Codice 535)</span>
                      </div>
                      <p className="text-[11px] text-sky-850 leading-normal">
                        Se usi un indirizzo Gmail, Google richiede una <strong>Password dell'App</strong> specifica (un codice di 16 lettere) invece della tua password di accesso normale:
                      </p>
                      <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-sky-850 font-medium">
                        <li>
                          Accedi al tuo account Google su <a href="https://myaccount.google.com/" target="_blank" rel="noreferrer" className="underline font-bold text-sky-700 hover:text-sky-900">myaccount.google.com</a>
                        </li>
                        <li>
                          Vai su <strong>Sicurezza</strong> (nel menu di sinistra/alto)
                        </li>
                        <li>
                          Assicurati che la <strong>Verifica in 2 passaggi</strong> sia attiva per l'account
                        </li>
                        <li>
                          Nella barra di ricerca in alto, digita <strong>"Password dell'app"</strong> e seleziona il risultato
                        </li>
                        <li>
                          Scegli un nome a tua scelta (es: <code>Duneairpark</code>) e clicca su <strong>Crea</strong>
                        </li>
                        <li>
                          Verrà mostrato un codice giallo di <strong>16 lettere</strong>. Copialo!
                        </li>
                        <li>
                          Inserisci questo codice di 16 lettere (senza spazi) come valore della variabile <strong>SMTP_PASS</strong> nella sezione configurazione.
                        </li>
                      </ol>
                      <p className="text-[10px] text-sky-700 font-semibold italic">
                        Nota: L'app rimuoverà automaticamente gli spazi se inserisci il codice copiato direttamente con gli spazi.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Logs (7 cols) */}
        <div className="lg:col-span-7 p-6 space-y-4 flex flex-col h-[520px] text-left">
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-700" /> Registro Email Spedite
            </h4>
            <p className="text-[10.5px] text-slate-400">
              Ispeziona la coda delle email spedite o simulate dal server in questa sessione.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                <Mail className="w-8 h-8 text-slate-350 stroke-[1.5]" />
                <span className="text-xs font-medium">Nessuna email trasmessa ancora</span>
                <span className="text-[10px] text-slate-400">Invia una prenotazione di prova o fai un test di invio sopra!</span>
              </div>
            ) : (
              logs.map((log) => {
                const isOpen = selectedLogId === log.id;
                return (
                  <div 
                    key={log.id} 
                    className={`bg-white rounded-xl border transition-all overflow-hidden ${
                      isOpen ? "border-slate-400 shadow-sm" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Log Header Row */}
                    <button
                      onClick={() => setSelectedLogId(isOpen ? null : log.id)}
                      className="w-full p-3.5 text-left flex items-start justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[8px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black">
                            {log.id}
                          </span>
                          <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full ${
                            log.simulated 
                              ? "bg-amber-100 text-amber-800" 
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {log.simulated ? "Simulato" : "Real SMTP"}
                          </span>
                          
                          <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full ${
                            log.success 
                              ? "bg-sky-50 text-sky-700" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {log.success ? "Successo" : "Fallito"}
                          </span>
                        </div>
                        
                        <div className="text-xs font-bold text-slate-800 truncate">
                          A: {log.to}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 truncate">
                          {log.subject}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
                        <span className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-450" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-450" />
                        )}
                      </div>
                    </button>

                    {/* Log Body Details */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="border-t border-slate-100 bg-slate-50 overflow-hidden"
                        >
                          <div className="p-4 space-y-3 text-xs leading-relaxed">
                            {log.error && (
                              <div className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded-lg font-mono text-[9.5px] flex gap-1.5 items-start">
                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                <div>
                                  <strong className="block text-red-900">Errore SMTP:</strong>
                                  {log.error}
                                </div>
                              </div>
                            )}

                            <div>
                              <span className="text-[9px] uppercase font-black text-slate-400 block mb-1 tracking-wider">Oggetto Completo</span>
                              <div className="bg-white p-2 rounded-lg border border-slate-200 font-bold text-slate-800">
                                {log.subject}
                              </div>
                            </div>

                            <div>
                              <span className="text-[9px] uppercase font-black text-slate-400 block mb-1 tracking-wider">Corpo dell'Email Inviata</span>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[10.5px] whitespace-pre-wrap text-slate-700 leading-normal max-h-56 overflow-y-auto">
                                {log.body}
                              </div>
                            </div>

                            <div className="text-[9px] text-slate-400 font-mono text-right">
                              Inviato il: {new Date(log.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
