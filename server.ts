import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

dotenv.config();

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  weight: number;
  date: string;
  timeSlot: string;
  experienceId: string;
  experienceName: string;
  price: number;
  paymentMethod: string;
  status: "confirmed" | "pending_weather";
  createdAt: string;
}

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

// In-memory store for bookings and email logs in this container session
const bookings: Booking[] = [];
const emailLogs: EmailLog[] = [];

// Helper to check and retrieve SMTP configurations
function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST || "",
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS ? "••••••••" : "", // masked for privacy
    from: process.env.SMTP_FROM_EMAIL || "",
    toPilot: process.env.SMTP_TO_PILOT || "guarinivolo1964@gmail.com",
    configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  };
}

// Helper to send real or simulated emails
async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM_EMAIL || "no-reply@duneairpark.it";

  const logId = "MSG-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = new Date().toISOString();

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      // Simple HTML wrap to make emails look elegant
      const formattedHtml = html || `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px; background-color: #ffffff;">
          <div style="background-color: #0ea5e9; color: #ffffff; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Duneairpark Flight Center</h2>
          </div>
          <div style="padding: 20px; color: #334155; line-height: 1.6;">
            ${text.replace(/\n/g, "<br>")}
          </div>
          <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 20px;">
            Duneairpark • Fasano-Ostuni, Savelletri, Puglia • Volo Ultraleggero
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"Duneairpark" <${from}>`,
        to,
        subject,
        text,
        html: formattedHtml,
      });

      emailLogs.unshift({
        id: logId,
        to,
        subject,
        body: text,
        timestamp,
        simulated: false,
        success: true,
      });

      return { success: true, simulated: false, logId };
    } catch (err: any) {
      console.error("Nodemailer error:", err);
      emailLogs.unshift({
        id: logId,
        to,
        subject,
        body: text,
        timestamp,
        simulated: false,
        success: false,
        error: err.message || "Unknown SMTP Error",
      });
      return { success: false, simulated: false, error: err.message, logId };
    }
  } else {
    // Simulated dispatch (console only)
    console.log(`\n=== SIMULATED EMAIL TO ${to} ===\nSubject: ${subject}\n\n${text}\n=================================\n`);
    emailLogs.unshift({
      id: logId,
      to,
      subject,
      body: text,
      timestamp,
      simulated: true,
      success: true,
    });
    return { success: true, simulated: true, logId };
  }
}

// Initialize Gemini client on the server according to the gemini-api skill rules
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Create Booking & Simulate Payment + Email Notifications
  app.post("/api/book", async (req, res) => {
    try {
      const { name, email, phone, weight, date, timeSlot, experienceId, experienceName, price, paymentMethod } = req.body;

      if (!name || !email || !phone || !weight || !date || !timeSlot || !experienceId) {
        return res.status(400).json({ error: "Tutti i campi obbligatori devono essere compilati." });
      }

      const bookingId = "DUNE-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      const newBooking: Booking = {
        id: bookingId,
        name,
        email,
        phone,
        weight: Number(weight),
        date,
        timeSlot,
        experienceId,
        experienceName,
        price: Number(price),
        paymentMethod: paymentMethod || "Carta di Credito",
        status: "confirmed",
        createdAt: new Date().toISOString(),
      };

      bookings.push(newBooking);

      const emailTextToPilot = `Ciao Pilota Guarini,
Hai ricevuto una nuova prenotazione per un volo promozionale in ultraleggero!

Dettagli Passeggero:
- Nome: ${name}
- Email: ${email}
- Telefono: ${phone}
- Peso: ${weight} kg

Dettagli Volo:
- Esperienza: ${experienceName} (${experienceId})
- Data: ${date}
- Fascia Oraria: ${timeSlot}
- Importo da saldare in loco: €${price} (Metodo preferito: ${paymentMethod})

La prenotazione è stata CONFERMATA. Il pagamento avverrà direttamente al campo di volo (POS o contanti).
Si prega di monitorare il meteo per il giorno selezionato.`;

      const emailTextToCustomer = `Gentile ${name},
Ti confermiamo la prenotazione del tuo volo promozionale in ultraleggero!
Il pagamento dell'esperienza avverrà direttamente al campo di volo il giorno dell'esperienza (tramite POS/Carta o in contanti). Non è richiesto alcun pagamento anticipato online.

Ecco il tuo riepilogo:
- Codice Prenotazione: ${bookingId}
- Esperienza: ${experienceName}
- Decollo da: Campo di Volo Duneairpark (zona Fasano-Ostuni)
- Data: ${date}
- Fascia Oraria: ${timeSlot}
- Peso inserito: ${weight} kg
- Importo da saldare in loco: €${price} (Metodo preferito: ${paymentMethod})

Pilota di riferimento: Istruttore Guarini (guarinivolo1964@gmail.com)

NOTIFICA DI SICUREZZA & METEO:
I voli in ultraleggero sono strettamente legati alle condizioni meteo (vento e visibilità). 
In caso di meteo non idoneo, verrai contattato direttamente per riprogrammare il volo senza alcun costo aggiuntivo.

Grazie per aver scelto Duneairpark! Ti aspettiamo per spiccare il volo.`;

      const pilotMailResult = await sendEmail({
        to: process.env.SMTP_TO_PILOT || "guarinivolo1964@gmail.com",
        subject: `[Duneairpark] NUOVA PRENOTAZIONE CONFERMATA - ${bookingId}`,
        text: emailTextToPilot
      });

      const customerMailResult = await sendEmail({
        to: email,
        subject: `[Duneairpark] Conferma Prenotazione Volo Ultraleggero - ${bookingId}`,
        text: emailTextToCustomer
      });

      return res.status(201).json({
        success: true,
        message: "Prenotazione salvata e notifiche inviate con successo.",
        booking: newBooking,
        notificationSent: {
          pilot: { address: "guarinivolo1964@gmail.com", ...pilotMailResult },
          customer: { address: email, ...customerMailResult }
        }
      });
    } catch (error: any) {
      console.error("Errore nella prenotazione:", error);
      return res.status(500).json({ error: "Errore interno del server durante la prenotazione." });
    }
  });

  // API Route: Get bookings for search
  app.get("/api/bookings", (req, res) => {
    const { email, code } = req.query;
    if (!email && !code) {
      return res.status(400).json({ error: "Fornire l'email o il codice di prenotazione." });
    }

    const filtered = bookings.filter((b) => {
      if (code && b.id.toLowerCase() === (code as string).toLowerCase()) return true;
      if (email && b.email.toLowerCase() === (email as string).toLowerCase()) return true;
      return false;
    });

    return res.json({ bookings: filtered });
  });

  // API Route: Get Email Config status
  app.get("/api/email/config", (req, res) => {
    return res.json({ config: getSmtpConfig() });
  });

  // API Route: Get recent email logs
  app.get("/api/email/logs", (req, res) => {
    return res.json({ logs: emailLogs });
  });

  // API Route: Send a test email to verify SMTP
  app.post("/api/email/test", async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "I campi 'to', 'subject' e 'body' sono obbligatori." });
      }

      const result = await sendEmail({ to, subject, text: body });
      return res.json({ success: true, result });
    } catch (error: any) {
      console.error("Errore nell'invio dell'email di test:", error);
      return res.status(500).json({ error: error.message || "Errore sconosciuto." });
    }
  });

  // API Route: Resend booking confirmation email
  app.post("/api/email/resend", async (req, res) => {
    try {
      const { bookingId } = req.body;
      if (!bookingId) {
        return res.status(400).json({ error: "Il campo 'bookingId' è obbligatorio." });
      }

      const booking = bookings.find(b => b.id.toLowerCase() === bookingId.toLowerCase());
      if (!booking) {
        return res.status(404).json({ error: "Prenotazione non trovata." });
      }

      const emailTextToPilot = `Ciao Pilota Guarini,
Hai richiesto il rinvio dei dettagli per la prenotazione ${booking.id}!

Dettagli Passeggero:
- Nome: ${booking.name}
- Email: ${booking.email}
- Telefono: ${booking.phone}
- Peso: ${booking.weight} kg

Dettagli Volo:
- Esperienza: ${booking.experienceName} (${booking.experienceId})
- Data: ${booking.date}
- Fascia Oraria: ${booking.timeSlot}
- Importo da saldare in loco: €${booking.price} (Metodo preferito: ${booking.paymentMethod})

La prenotazione è stata CONFERMATA. Il pagamento avverrà direttamente al campo di volo (POS o contanti).`;

      const emailTextToCustomer = `Gentile ${booking.name},
Ti inviamo nuovamente la conferma di prenotazione del tuo volo promozionale in ultraleggero.
Il pagamento avverrà direttamente al campo di volo il giorno dell'esperienza (tramite POS/Carta o in contanti).

Ecco il tuo riepilogo:
- Codice Prenotazione: ${booking.id}
- Esperienza: ${booking.experienceName}
- Decollo da: Campo di Volo Duneairpark (zona Fasano-Ostuni)
- Data: ${booking.date}
- Fascia Oraria: ${booking.timeSlot}
- Peso inserito: ${booking.weight} kg
- Importo da saldare in loco: €${booking.price} (Metodo preferito: ${booking.paymentMethod})

Pilota di riferimento: Istruttore Guarini (guarinivolo1964@gmail.com)

Grazie per aver scelto Duneairpark! Ti aspettiamo per spiccare il volo.`;

      const pilotResult = await sendEmail({
        to: process.env.SMTP_TO_PILOT || "guarinivolo1964@gmail.com",
        subject: `[Duneairpark] RINVIO PRENOTAZIONE - ${booking.id}`,
        text: emailTextToPilot
      });

      const customerResult = await sendEmail({
        to: booking.email,
        subject: `[Duneairpark] Copia Conferma Prenotazione - ${booking.id}`,
        text: emailTextToCustomer
      });

      return res.json({
        success: true,
        message: "Email di conferma reinviate con successo.",
        pilot: pilotResult,
        customer: customerResult
      });
    } catch (error: any) {
      console.error("Errore nel rinvio dell'email:", error);
      return res.status(500).json({ error: "Impossibile reinviare le email." });
    }
  });

  // API Route: AI Virtual Pilot assistant using @google/genai SDK (Gemini 3.5 Flash)
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Formato dei messaggi non valido." });
      }

      // Convert input chat messages to the format expected by Gemini
      // System instructions guide the persona of Pilot Guarini
      const systemInstruction = `
Sei il "Pilota Virtuale Guarini", assistente AI del Campo di Volo Duneairpark, situato nella splendida zona costiera tra Fasano e Ostuni, in Puglia (vicino Savelletri).
Il tuo indirizzo email di contatto principale è guarinivolo1964@gmail.com.

Il tuo stile di comunicazione è estremamente accogliente, cordiale, caloroso e professionale. Parli in italiano con un pizzico di entusiasmo pugliese per il volo, il mare azzurro, gli ulivi secolari e le città bianche come Ostuni viste dall'alto. Metti sempre al primo posto la sicurezza del volo!

Informazioni Chiave per rispondere:
1. CAMPO DI VOLO DUNEAIRPARK: Si trova sulla costa tra Fasano e Ostuni. Offre una pista in erba ben curata, ideale per decolli e atterraggi panoramici a due passi dal mare Adriatico e dai resti archeologici di Egnazia.
2. PILOTA GUARINI: Pilota esperto e istruttore certificato con migliaia di ore di volo, ama condividere la passione per il volo in ultraleggero in totale sicurezza.
3. VOLI PROMOZIONALI DISPONIBILI:
   - "Battesimo del Volo" (15 min, €80): Volo introduttivo lungo la splendida costa di Savelletri e sulle rovine dell'antica città romana di Egnazia.
   - "Volo dei Trulli" (30 min, €140): Sorvolo dei secolari oliveti di Fasano fino a scorgere la magia dei trulli di Alberobello, rientro costiero.
   - "Rotta delle Città Bianche" (45 min, €190): Volo indimenticabile sopra Ostuni (la Città Bianca) arroccata sui colli, Fasano e le spiagge incontaminate.
   - "L'Emozione di Puglia" (60 min, €240): Il grand tour! Sorvolo di Ostuni, Fasano, Cisternino, Locorotondo, la Valle d'Itria e tutta la magnifica costa adriatica.
4. SICUREZZA & LIMITI:
   - Peso massimo consentito per il passeggero: 100 kg (per bilanciamento dell'ultraleggero).
   - Età minima: 16 anni (con consenso dei genitori).
   - Meteo: Il volo in ultraleggero è subordinato alle condizioni meteorologiche. Se il pilota valuta che il vento o la visibilità non sono idonei, il volo viene rimandato e riprogrammato in accordo con il passeggero (senza costi).
   - Prenotazioni: Si effettuano online sul sito senza pagamento anticipato. Una volta confermata la prenotazione, viene inviata un'email automatica di conferma a guarinivolo1964@gmail.com e al passeggero. Il pagamento avverrà direttamente al campo di volo tramite POS o contanti.

Rispondi sempre in italiano in modo chiaro ed esaustivo, incoraggiando l'utente a prenotare questa magnifica esperienza o a fare domande sulla sicurezza, la durata e le rotte. Non inventare dati non indicati.
`;

      // Map simple message history to Gemini contents format
      const formattedContents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      // Generate content with Gemini 3.5 Flash
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "Scusa, non sono riuscito a elaborare la risposta. Prova a chiedermi qualcos'altro sui voli!";

      return res.json({ reply: replyText });
    } catch (error: any) {
      console.error("Errore nell'assistente AI:", error);
      return res.status(500).json({ error: "L'assistente virtuale è temporaneamente offline. Riprova più tardi!" });
    }
  });

  // Vite integration middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
