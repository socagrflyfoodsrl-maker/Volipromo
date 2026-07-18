import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage } from "../types";
import { MessageSquare, Send, Compass, User, RefreshCw, Sparkles, HelpCircle } from "lucide-react";

export default function PilotChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Ciao! Sono l'Istruttore Guarini, il tuo pilota virtuale qui a Duneairpark. 🛩️\n\nHai domande sul volo in ultraleggero tra Fasano e Ostuni? Chiedimi pure informazioni sul meteo, sulla sicurezza, sulle nostre rotte o su come prepararti per il decollo!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "Qual è il peso massimo?",
    "Che succede in caso di brutto tempo?",
    "Consigli per fare foto in volo?",
    "Quale aereo usiamo?",
  ];

  // Auto scroll to bottom when message history updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Map messages for backend context (limiting history to latest 8 messages to keep payload compact and responsive)
      const chatHistory = [...messages, userMsg]
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const textMsg = await response.text();
        throw new Error(textMsg.substring(0, 100) || "Risposta server non valida");
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: data.reply || "Scusa, ho avuto una breve interferenza radio! Prova a ripetere la domanda.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Errore chat:", error);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: "La radio di Duneairpark è temporaneamente disturbata! Puoi contattarmi direttamente scrivendo un'email a **guarinivolo1964@gmail.com**.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Eccomi di nuovo pronto! Di cosa vogliamo parlare? Chiedimi pure dettagli sulle rotte promozionali o sulle condizioni di volo.",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[520px]">
      {/* Chat Header */}
      <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center font-bold text-white text-base">
              G1
            </span>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold font-display text-white">Pilota AI Guarini</h3>
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <span className="text-[10px] text-slate-400">Assistente virtuale Duneairpark</span>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Ripristina Chat"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-900/40 select-text">
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const isAssistant = m.role === "assistant";
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 max-w-[85%] ${isAssistant ? "" : "ml-auto flex-row-reverse"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                    isAssistant ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {isAssistant ? "👨‍✈️" : "P"}
                </div>

                {/* Bubble */}
                <div className="space-y-1">
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                      isAssistant
                        ? "bg-slate-950 text-slate-300 border border-slate-850 rounded-tl-none"
                        : "bg-sky-500 text-white rounded-tr-none"
                    }`}
                  >
                    {m.content}
                  </div>
                  <div className={`text-[9px] text-slate-500 px-1 ${!isAssistant && "text-right"}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {loading && (
          <div className="flex gap-3 max-w-[80%]">
            <div className="w-7 h-7 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0 flex items-center justify-center text-xs animate-pulse">
              👨‍✈️
            </div>
            <div className="bg-slate-950 border border-slate-850 text-slate-400 p-3.5 rounded-2xl rounded-tl-none text-xs flex items-center gap-1.5 shadow">
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-850 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none shrink-0">
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(q)}
            className="px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-800 text-[10.5px] text-slate-300 transition-colors shrink-0 flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3 text-sky-400" /> {q}
          </button>
        ))}
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={handleFormSubmit}
        className="p-4 bg-slate-950 border-t border-slate-850 flex gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chiedi informazioni all'Istruttore Guarini..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className={`p-3 rounded-xl transition-all ${
            input.trim() && !loading
              ? "bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/15 cursor-pointer"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
