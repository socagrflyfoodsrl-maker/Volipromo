import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

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

// In-memory store for bookings in this container session
const bookings: Booking[] = [];

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
  app.post("/api/book", (req, res) => {
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

      // Simulation of email dispatch as requested by the user:
      // "le prenotazioni saranno inviate via emal e confermate tramite una notifica automatizzata subito dopo il pagamento. indirizzo email guarinivolo1964@gmail.com"
      const emailContentToPilot = `
============================================================
NURSERY/TAKEOFF LOG: EMAIL TO MAIN PILOT (guarinivolo1964@gmail.com)
Subject: [Duneairpark] NUOVA PRENOTAZIONE CONFERMATA - ${bookingId}
------------------------------------------------------------
Ciao Pilota Guarini,
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
- Importo Pagato: €${price} (Metodo: ${paymentMethod})

La prenotazione è stata CONFERMATA subito dopo il pagamento.
Si prega di monitorare il meteo per il giorno selezionato.
============================================================
`;

      const emailContentToCustomer = `
============================================================
CUSTOMER NOTIFICATION LOG: EMAIL TO CUSTOMER (${email})
Subject: [Duneairpark] Conferma Prenotazione Volo Ultraleggero - ${bookingId}
------------------------------------------------------------
Gentile ${name},
Il tuo pagamento è andato a buon fine! Ti confermiamo la prenotazione del tuo volo promozionale in ultraleggero.

Ecco il tuo riepilogo:
- Codice Prenotazione: ${bookingId}
- Esperienza: ${experienceName}
- Decollo da: Campo di Volo Duneairpark (zona Fasano-Ostuni)
- Data: ${date}
- Fascia Oraria: ${timeSlot}
- Peso inserito: ${weight} kg

Pilota di riferimento: Istruttore Guarini (guarinivolo1964@gmail.com)

NOTIFICA DI SICUREZZA & METEO:
I voli in ultraleggero sono strettamente legati alle condizioni meteo (vento e visibilità). 
In caso di meteo non idoneo, verrai contattato direttamente per riprogrammare il volo senza alcun costo aggiuntivo.

Grazie per aver scelto Duneairpark! Ti aspettiamo per spiccare il volo.
============================================================
`;

      console.log(emailContentToPilot);
      console.log(emailContentToCustomer);

      return res.status(201).json({
        success: true,
        message: "Prenotazione salvata e notifiche inviate con successo.",
        booking: newBooking,
        notificationSent: {
          pilot: "guarinivolo1964@gmail.com",
          customer: email,
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
   - Prenotazioni: Si effettuano online sul sito. Una volta effettuato il pagamento sicuro, viene inviata un'email automatica di conferma a guarinivolo1964@gmail.com e al passeggero, oltre a una notifica istantanea sullo schermo.

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
