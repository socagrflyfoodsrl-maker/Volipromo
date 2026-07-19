import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import fs from "fs";
import { sql } from "@vercel/postgres";

dotenv.config({ override: true });

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

const BOOKINGS_FILE = path.join(process.cwd(), "bookings.json");
const ADMIN_CONFIG_FILE = path.join(process.cwd(), "admin_config.json");

interface AdminConfig {
  password?: string;
}

function loadAdminConfig(): AdminConfig {
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const data = fs.readFileSync(ADMIN_CONFIG_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Errore nel caricamento della configurazione admin:", err);
  }
  return {};
}

const adminConfig: AdminConfig = loadAdminConfig();

function saveAdminConfig() {
  try {
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(adminConfig, null, 2), "utf-8");
  } catch (err) {
    console.error("Errore nel salvataggio della configurazione admin:", err);
  }
}

function getAdminPassword(): string {
  if (adminConfig.password) {
    return adminConfig.password;
  }
  return cleanEnvVal(process.env.ADMIN_PASSWORD) || "dune2026";
}

function loadBookings(): Booking[] {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      const data = fs.readFileSync(BOOKINGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Errore nel caricamento delle prenotazioni:", err);
  }
  return [];
}

const bookings: Booking[] = loadBookings();

function saveBookings() {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), "utf-8");
  } catch (err) {
    console.error("Errore nel salvataggio delle prenotazioni:", err);
  }
}

// --- Vercel Postgres Database Helper functions ---
let tablesCreated = false;

async function ensureTablesExist() {
  if (tablesCreated) return;
  if (!process.env.POSTGRES_URL) return;

  try {
    // We check and create the tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS admin_config (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(100) NOT NULL,
        weight NUMERIC NOT NULL,
        date VARCHAR(100) NOT NULL,
        time_slot VARCHAR(100) NOT NULL,
        experience_id VARCHAR(100) NOT NULL,
        experience_name VARCHAR(255) NOT NULL,
        price NUMERIC NOT NULL,
        payment_method VARCHAR(100) NOT NULL,
        status VARCHAR(100) NOT NULL,
        created_at VARCHAR(100) NOT NULL
      );
    `;
    tablesCreated = true;
    console.log("Postgres tables checked/created successfully.");
  } catch (err) {
    console.error("Errore nella creazione delle tabelle Postgres:", err);
  }
}

let cachedAdminPassword = "";

async function getAdminPasswordAsync(): Promise<string> {
  if (cachedAdminPassword) {
    return cachedAdminPassword;
  }

  if (process.env.POSTGRES_URL) {
    try {
      await ensureTablesExist();
      const { rows } = await sql`SELECT value FROM admin_config WHERE key = 'password' LIMIT 1;`;
      if (rows && rows.length > 0) {
        cachedAdminPassword = rows[0].value;
        return cachedAdminPassword;
      }
    } catch (err) {
      console.error("Errore nel recupero della password da Postgres:", err);
    }
  }

  if (adminConfig.password) {
    cachedAdminPassword = adminConfig.password;
    return cachedAdminPassword;
  }
  return cleanEnvVal(process.env.ADMIN_PASSWORD) || "dune2026";
}

async function getBookingsAsync(): Promise<Booking[]> {
  if (process.env.POSTGRES_URL) {
    try {
      await ensureTablesExist();
      const { rows } = await sql`SELECT * FROM bookings ORDER BY created_at DESC;`;
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        weight: Number(row.weight),
        date: row.date,
        timeSlot: row.time_slot,
        experienceId: row.experience_id,
        experienceName: row.experience_name,
        price: Number(row.price),
        paymentMethod: row.payment_method,
        status: row.status as "confirmed" | "pending_weather",
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error("Errore nel caricamento delle prenotazioni da Postgres:", err);
    }
  }
  return bookings;
}

async function saveBookingAsync(booking: Booking): Promise<boolean> {
  // Always update in-memory cache and local file
  const index = bookings.findIndex(b => b.id.toLowerCase() === booking.id.toLowerCase());
  if (index !== -1) {
    bookings[index] = booking;
  } else {
    bookings.push(booking);
  }
  saveBookings();

  if (process.env.POSTGRES_URL) {
    try {
      await ensureTablesExist();
      await sql`
        INSERT INTO bookings (
          id, name, email, phone, weight, date, time_slot, experience_id, experience_name, price, payment_method, status, created_at
        ) VALUES (
          ${booking.id},
          ${booking.name},
          ${booking.email},
          ${booking.phone},
          ${booking.weight},
          ${booking.date},
          ${booking.timeSlot},
          ${booking.experienceId},
          ${booking.experienceName},
          ${booking.price},
          ${booking.paymentMethod},
          ${booking.status},
          ${booking.createdAt}
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          weight = EXCLUDED.weight,
          date = EXCLUDED.date,
          time_slot = EXCLUDED.time_slot,
          experience_id = EXCLUDED.experience_id,
          experience_name = EXCLUDED.experience_name,
          price = EXCLUDED.price,
          payment_method = EXCLUDED.payment_method,
          status = EXCLUDED.status,
          created_at = EXCLUDED.created_at;
      `;
      return true;
    } catch (err) {
      console.error("Errore nel salvataggio della prenotazione su Postgres:", err);
      return false;
    }
  }
  return true;
}

async function updateBookingStatusAsync(bookingId: string, status: "confirmed" | "pending_weather"): Promise<boolean> {
  const localBooking = bookings.find(b => b.id.toLowerCase() === bookingId.toLowerCase());
  if (localBooking) {
    localBooking.status = status;
    saveBookings();
  }

  if (process.env.POSTGRES_URL) {
    try {
      await ensureTablesExist();
      await sql`
        UPDATE bookings
        SET status = ${status}
        WHERE LOWER(id) = ${bookingId.toLowerCase()};
      `;
      return true;
    } catch (err) {
      console.error("Errore nell'aggiornamento dello stato su Postgres:", err);
      return false;
    }
  }
  return true;
}

async function deleteBookingAsync(bookingId: string): Promise<boolean> {
  const index = bookings.findIndex(b => b.id.toLowerCase() === bookingId.toLowerCase());
  if (index !== -1) {
    bookings.splice(index, 1);
    saveBookings();
  }

  if (process.env.POSTGRES_URL) {
    try {
      await ensureTablesExist();
      await sql`
        DELETE FROM bookings
        WHERE LOWER(id) = ${bookingId.toLowerCase()};
      `;
      return true;
    } catch (err) {
      console.error("Errore nell'eliminazione della prenotazione da Postgres:", err);
      return false;
    }
  }
  return true;
}

const emailLogs: EmailLog[] = [];

// Clean environment values safely
function cleanEnvVal(val: string | undefined): string {
  if (!val) return "";
  return val.trim().replace(/^['"]|['"]$/g, "").trim();
}

// Helper to check and retrieve SMTP configurations
function getSmtpConfig() {
  let host = cleanEnvVal(process.env.SMTP_HOST);
  if (host) {
    host = host.replace(/_/g, ".");
    if (host.toLowerCase().includes("gmail") && !host.toLowerCase().includes("smtp.gmail.com")) {
      host = "smtp.gmail.com";
    }
  }
  return {
    host,
    port: process.env.SMTP_PORT ? Number(cleanEnvVal(process.env.SMTP_PORT)) : 587,
    user: cleanEnvVal(process.env.SMTP_USER),
    pass: process.env.SMTP_PASS ? "••••••••" : "", // masked for privacy
    from: cleanEnvVal(process.env.SMTP_FROM_EMAIL) || "no-reply@duneairpark.it",
    toPilot: cleanEnvVal(process.env.SMTP_TO_PILOT) || "guarinivolo1964@gmail.com",
    configured: !!(cleanEnvVal(process.env.SMTP_HOST) && cleanEnvVal(process.env.SMTP_USER) && cleanEnvVal(process.env.SMTP_PASS))
  };
}

// Helper to send real or simulated emails
async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  let host = cleanEnvVal(process.env.SMTP_HOST);
  if (host) {
    host = host.replace(/_/g, ".");
    if (host.toLowerCase().includes("gmail") && !host.toLowerCase().includes("smtp.gmail.com")) {
      host = "smtp.gmail.com";
    }
  }
  const port = process.env.SMTP_PORT ? Number(cleanEnvVal(process.env.SMTP_PORT)) : 587;
  const user = cleanEnvVal(process.env.SMTP_USER);
  const pass = cleanEnvVal(process.env.SMTP_PASS);
  const from = cleanEnvVal(process.env.SMTP_FROM_EMAIL) || "no-reply@duneairpark.it";

  // Auto-clean space-separated Gmail App Passwords
  let cleanedPass = pass;
  if (host && host.toLowerCase().includes("gmail") && cleanedPass.includes(" ")) {
    const noSpaces = cleanedPass.replace(/\s+/g, "");
    if (noSpaces.length === 16) {
      cleanedPass = noSpaces;
    }
  }

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
          pass: cleanedPass,
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

const app = express();
const PORT = 3000;

app.use(express.json());

// Define all routes synchronously to prevent race conditions or 404s on serverless platforms (like Vercel)

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

      await saveBookingAsync(newBooking);


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
  app.get("/api/bookings", async (req, res) => {
    const { email, code } = req.query;
    if (!email && !code) {
      return res.status(400).json({ error: "Fornire l'email o il codice di prenotazione." });
    }

    const allBookings = await getBookingsAsync();
    const filtered = allBookings.filter((b) => {
      if (code && b.id.toLowerCase() === (code as string).toLowerCase()) return true;
      if (email && b.email.toLowerCase() === (email as string).toLowerCase()) return true;
      return false;
    });

    return res.json({ bookings: filtered });
  });

  // Middleware to authenticate admin requests
  const checkAdminAuth = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      const adminPass = await getAdminPasswordAsync();
      if (authHeader === adminPass) {
        return next();
      }
      return res.status(401).json({ error: "Accesso non autorizzato. Password amministratore non valida." });
    } catch (err) {
      console.error("Errore nell'autenticazione admin:", err);
      return res.status(500).json({ error: "Errore durante la verifica delle credenziali." });
    }
  };

  // API Route: Admin login
  app.post("/api/admin/login", async (req, res) => {
    const { password } = req.body;
    const adminPass = await getAdminPasswordAsync();
    if (password === adminPass) {
      return res.json({ success: true });
    }
    return res.status(401).json({ success: false, error: "Password errata." });
  });

  // API Route: Change Admin Password (Admin only)
  app.post("/api/admin/change-password", checkAdminAuth, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ error: "La password deve contenere almeno 4 caratteri." });
    }
    const passwordToSave = newPassword.trim();

    cachedAdminPassword = passwordToSave;
    adminConfig.password = passwordToSave;
    saveAdminConfig();

    if (process.env.POSTGRES_URL) {
      try {
        await ensureTablesExist();
        await sql`
          INSERT INTO admin_config (key, value)
          VALUES ('password', ${passwordToSave})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
        `;
      } catch (err) {
        console.error("Errore nel salvataggio della password su Postgres:", err);
        return res.status(500).json({ error: "Errore nel salvataggio della password nel database." });
      }
    }

    return res.json({ success: true, message: "Password aggiornata con successo!" });
  });

  // API Route: Get ALL bookings (Admin only)
  app.get("/api/admin/bookings", checkAdminAuth, async (req, res) => {
    const allBookings = await getBookingsAsync();
    return res.json({ bookings: allBookings });
  });

  // API Route: Update Booking Status (Admin only)
  app.post("/api/admin/bookings/update-status", checkAdminAuth, async (req, res) => {
    const { bookingId, status } = req.body;
    const allBookings = await getBookingsAsync();
    const booking = allBookings.find(b => b.id.toLowerCase() === bookingId.toLowerCase());
    if (!booking) {
      return res.status(404).json({ error: "Prenotazione non trovata." });
    }
    if (status === "confirmed" || status === "pending_weather") {
      const success = await updateBookingStatusAsync(bookingId, status);
      if (!success) {
        return res.status(500).json({ error: "Errore durante l'aggiornamento dello stato nel database." });
      }
      booking.status = status;
      return res.json({ success: true, booking });
    }
    return res.status(400).json({ error: "Stato non valido." });
  });

  // API Route: Delete Booking (Admin only)
  app.post("/api/admin/bookings/delete", checkAdminAuth, async (req, res) => {
    const { bookingId } = req.body;
    const allBookings = await getBookingsAsync();
    const index = allBookings.findIndex(b => b.id.toLowerCase() === bookingId.toLowerCase());
    if (index === -1) {
      return res.status(404).json({ error: "Prenotazione non trovata." });
    }
    const success = await deleteBookingAsync(bookingId);
    if (!success) {
      return res.status(500).json({ error: "Errore durante l'eliminazione della prenotazione dal database." });
    }
    return res.json({ success: true, message: "Prenotazione eliminata correttamente." });
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
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error, result });
      }
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

      const allBookings = await getBookingsAsync();
      const booking = allBookings.find(b => b.id.toLowerCase() === bookingId.toLowerCase());
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

  // Vite integration middleware & Server listener for local environments
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      import("vite").then(({ createServer: createViteServer }) => {
        createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        }).then((vite) => {
          app.use(vite.middlewares);
          app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on http://0.0.0.0:${PORT} (Vite Dev Mode)`);
          });
        }).catch((err) => {
          console.error("Errore durante l'avvio del server Vite:", err);
        });
      }).catch((err) => {
        console.error("Impossibile importare Vite:", err);
      });
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT} (Production Mode)`);
      });
    }
  }

export default app;
