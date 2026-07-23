import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import fs from "fs";
import pg from "pg";

dotenv.config({ override: true });

let usePostgres = !!process.env.POSTGRES_URL;
let pool: pg.Pool | null = null;

if (usePostgres) {
  try {
    pool = new pg.Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.POSTGRES_URL?.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 4000, // Timeout after 4 seconds to prevent long hangs
    });
    
    pool.on("error", (err) => {
      usePostgres = false;
    });
  } catch (err: any) {
    usePostgres = false;
  }
}

// Polyfill the Vercel sql tagged template function using standard pg Pool
async function sql(strings: TemplateStringsArray, ...values: any[]) {
  if (!usePostgres || !pool) {
    throw new Error("PostgreSQL is disabled or not initialized.");
  }
  let queryText = "";
  for (let i = 0; i < strings.length; i++) {
    queryText += strings[i];
    if (i < values.length) {
      queryText += `$${i + 1}`;
    }
  }
  try {
    return await pool.query(queryText, values);
  } catch (err: any) {
    const isConnError = 
      err.code === "ENOTFOUND" || 
      err.code === "EAI_AGAIN" || 
      err.code === "ECONNREFUSED" || 
      err.message?.includes("connection") || 
      err.message?.includes("getaddrinfo") ||
      err.message?.includes("invalid_connection_string");
      
    if (isConnError) {
      usePostgres = false;
    }
    throw err;
  }
}

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
  instructor?: string;
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
const PAYPAL_CONFIG_FILE = path.join(process.cwd(), "paypal_config.json");

interface PayPalConfig {
  email: string;
  clientId: string;
  paypalMeUrl: string;
  depositAmount: number;
  currency: string;
  environment: "live" | "sandbox";
  instructions: string;
}

const defaultPayPalConfig: PayPalConfig = {
  email: "soc.agr.flyfoodsrl@gmail.com",
  clientId: "",
  paypalMeUrl: "https://www.paypal.me/flyfoodsrl",
  depositAmount: 50,
  currency: "EUR",
  environment: "live",
  instructions: "Acconto prenotazione volo promozionale in ultraleggero. Il saldo verrà versato in contanti al campo di volo."
};

function loadPayPalConfig(): PayPalConfig {
  try {
    if (fs.existsSync(PAYPAL_CONFIG_FILE)) {
      const data = fs.readFileSync(PAYPAL_CONFIG_FILE, "utf-8");
      return { ...defaultPayPalConfig, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Errore nel caricamento della configurazione PayPal:", err);
  }
  return { ...defaultPayPalConfig };
}

let paypalConfig: PayPalConfig = loadPayPalConfig();

function savePayPalConfig() {
  try {
    fs.writeFileSync(PAYPAL_CONFIG_FILE, JSON.stringify(paypalConfig, null, 2), "utf-8");
  } catch (err) {
    console.error("Errore nel salvataggio della configurazione PayPal:", err);
  }
}

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
  if (!usePostgres) return;

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
    // Add instructor column if it doesn't exist
    await sql`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS instructor VARCHAR(100) DEFAULT 'Pilota';
    `;
    // Create gallery_images table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_images (
        id VARCHAR(50) PRIMARY KEY,
        src TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        tag VARCHAR(100) NOT NULL,
        created_at VARCHAR(100) NOT NULL
      );
    `;
    tablesCreated = true;
    console.log("Postgres tables checked/created successfully.");
  } catch (err: any) {
    usePostgres = false;
  }
}

let cachedAdminPassword = "";

async function getAdminPasswordAsync(): Promise<string> {
  if (cachedAdminPassword) {
    return cachedAdminPassword;
  }

  if (usePostgres) {
    try {
      await ensureTablesExist();
      if (usePostgres) {
        const { rows } = await sql`SELECT value FROM admin_config WHERE key = 'password' LIMIT 1;`;
        if (rows && rows.length > 0) {
          cachedAdminPassword = rows[0].value;
          return cachedAdminPassword;
        }
      }
    } catch (err: any) {
      // Quietly fall back
    }
  }

  if (adminConfig.password) {
    cachedAdminPassword = adminConfig.password;
    return cachedAdminPassword;
  }
  return cleanEnvVal(process.env.ADMIN_PASSWORD) || "dune2026";
}

async function getBookingsAsync(): Promise<Booking[]> {
  if (usePostgres) {
    try {
      await ensureTablesExist();
      if (usePostgres) {
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
          instructor: row.instructor || "Francesco Guarini",
        }));
      }
    } catch (err: any) {
      // Quietly fall back
    }
  }
  return bookings;
}

async function saveBookingAsync(booking: Booking): Promise<boolean> {
  // Always update in-memory cache and local file
  const index = bookings.findIndex(b => String(b.id).toLowerCase() === String(booking.id).toLowerCase());
  if (index !== -1) {
    bookings[index] = booking;
  } else {
    bookings.push(booking);
  }
  saveBookings();

  if (usePostgres) {
    try {
      await ensureTablesExist();
      if (usePostgres) {
        await sql`
          INSERT INTO bookings (
            id, name, email, phone, weight, date, time_slot, experience_id, experience_name, price, payment_method, status, created_at, instructor
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
            ${booking.createdAt},
            ${booking.instructor || "Francesco Guarini"}
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
            created_at = EXCLUDED.created_at,
            instructor = EXCLUDED.instructor;
        `;
        return true;
      }
    } catch (err: any) {
      return true; // Local save succeeded
    }
  }
  return true;
}

async function updateBookingStatusAsync(bookingId: string, status: "confirmed" | "pending_weather"): Promise<boolean> {
  let localUpdated = false;
  const localBooking = bookings.find(b => String(b.id).toLowerCase() === String(bookingId).toLowerCase());
  if (localBooking) {
    localBooking.status = status;
    saveBookings();
    localUpdated = true;
  }

  if (usePostgres) {
    try {
      await ensureTablesExist();
      if (usePostgres) {
        await sql`
          UPDATE bookings
          SET status = ${status}
          WHERE LOWER(id) = ${String(bookingId).toLowerCase()};
        `;
        return true;
      }
    } catch (err: any) {
      return localUpdated;
    }
  }
  return localUpdated;
}

async function deleteBookingAsync(bookingId: string): Promise<boolean> {
  let localDeleted = false;
  const index = bookings.findIndex(b => String(b.id).toLowerCase() === String(bookingId).toLowerCase());
  if (index !== -1) {
    bookings.splice(index, 1);
    saveBookings();
    localDeleted = true;
  }

  if (usePostgres) {
    try {
      await ensureTablesExist();
      if (usePostgres) {
        await sql`
          DELETE FROM bookings
          WHERE LOWER(id) = ${String(bookingId).toLowerCase()};
        `;
        return true;
      }
    } catch (err: any) {
      return localDeleted;
    }
  }
  return localDeleted;
}

const GALLERY_FILE = path.join(process.cwd(), "gallery_images.json");
const DELETED_DEFAULTS_FILE = path.join(process.cwd(), "deleted_defaults.json");

function loadDeletedDefaults(): string[] {
  try {
    if (fs.existsSync(DELETED_DEFAULTS_FILE)) {
      const data = fs.readFileSync(DELETED_DEFAULTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err: any) {
    // quiet fallback
  }
  return [];
}

const deletedDefaults: string[] = loadDeletedDefaults();

function saveDeletedDefaults() {
  try {
    fs.writeFileSync(DELETED_DEFAULTS_FILE, JSON.stringify(deletedDefaults, null, 2), "utf-8");
  } catch (err: any) {
    // quiet fallback
  }
}

async function getDeletedDefaultsAsync(): Promise<string[]> {
  if (usePostgres) {
    try {
      await ensureTablesExist();
      const { rows } = await sql`SELECT value FROM admin_config WHERE key = 'deleted_default_images';`;
      if (rows.length > 0) {
        return JSON.parse(rows[0].value);
      }
    } catch (err: any) {
      // fallback
    }
  }
  return deletedDefaults;
}

async function saveDeletedDefaultsAsync(ids: string[]): Promise<boolean> {
  deletedDefaults.length = 0;
  deletedDefaults.push(...ids);
  saveDeletedDefaults();

  if (usePostgres) {
    try {
      await ensureTablesExist();
      const valueStr = JSON.stringify(ids);
      await sql`
        INSERT INTO admin_config (key, value)
        VALUES ('deleted_default_images', ${valueStr})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `;
      return true;
    } catch (err: any) {
      return false;
    }
  }
  return true;
}

interface GalleryItem {
  id: string;
  src: string;
  category: "campo" | "territorio" | "voli";
  title: string;
  description: string;
  tag: string;
  createdAt: string;
}

function loadGalleryImages(): GalleryItem[] {
  try {
    if (fs.existsSync(GALLERY_FILE)) {
      const data = fs.readFileSync(GALLERY_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err: any) {
    console.warn("Informazioni: Caricamento immagini galleria locale:", err.message);
  }
  return [];
}

const customGalleryImages: GalleryItem[] = loadGalleryImages();

function saveGalleryImages() {
  try {
    fs.writeFileSync(GALLERY_FILE, JSON.stringify(customGalleryImages, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("Informazioni: Salvataggio immagini galleria locale fallito:", err.message);
  }
}

async function getCustomGalleryImagesAsync(): Promise<GalleryItem[]> {
  if (usePostgres) {
    try {
      await ensureTablesExist();
      if (usePostgres) {
        const { rows } = await sql`SELECT * FROM gallery_images ORDER BY created_at DESC;`;
        return rows.map((row) => ({
          id: row.id,
          src: row.src,
          category: row.category as "campo" | "territorio" | "voli",
          title: row.title,
          description: row.description,
          tag: row.tag,
          createdAt: row.created_at,
        }));
      }
    } catch (err: any) {
      // Quietly fall back
    }
  }
  return [...customGalleryImages].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function saveGalleryImageAsync(item: GalleryItem): Promise<boolean> {
  const index = customGalleryImages.findIndex(img => img.id === item.id);
  if (index !== -1) {
    customGalleryImages[index] = item;
  } else {
    customGalleryImages.push(item);
  }
  saveGalleryImages();

  if (usePostgres) {
    try {
      await ensureTablesExist();
      if (usePostgres) {
        await sql`
          INSERT INTO gallery_images (
            id, src, category, title, description, tag, created_at
          ) VALUES (
            ${item.id},
            ${item.src},
            ${item.category},
            ${item.title},
            ${item.description},
            ${item.tag},
            ${item.createdAt}
          ) ON CONFLICT (id) DO UPDATE SET
            src = EXCLUDED.src,
            category = EXCLUDED.category,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            tag = EXCLUDED.tag,
            created_at = EXCLUDED.created_at;
        `;
        return true;
      }
    } catch (err: any) {
      return false;
    }
  }
  return true;
}

async function deleteGalleryImageAsync(id: string): Promise<boolean> {
  if (id.startsWith("default-")) {
    try {
      const deletedList = await getDeletedDefaultsAsync();
      if (!deletedList.includes(id)) {
        deletedList.push(id);
        await saveDeletedDefaultsAsync(deletedList);
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  const index = customGalleryImages.findIndex(img => img.id === id);
  if (index !== -1) {
    customGalleryImages.splice(index, 1);
    saveGalleryImages();
  }

  if (usePostgres) {
    try {
      await ensureTablesExist();
      if (usePostgres) {
        await sql`DELETE FROM gallery_images WHERE id = ${id};`;
        return true;
      }
    } catch (err: any) {
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
      let errorMessage = err.message || "Unknown SMTP Error";
      if (
        errorMessage.includes("534") ||
        errorMessage.includes("5.7.9") ||
        errorMessage.includes("Application-specific password required") ||
        errorMessage.includes("Invalid login")
      ) {
        errorMessage = "Errore Gmail SMTP (534-5.7.9): Gmail richiede una Password per le App a 16 caratteri. Generala su https://myaccount.google.com/apppasswords ed inseriscila nella variabile SMTP_PASS.";
      }

      emailLogs.unshift({
        id: logId,
        to,
        subject,
        body: text,
        timestamp,
        simulated: false,
        success: false,
        error: errorMessage,
      });
      return { success: false, simulated: false, error: errorMessage, logId };
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

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use("/src/assets", express.static(path.join(process.cwd(), "src/assets")));

// Define all routes synchronously to prevent race conditions or 404s on serverless platforms (like Vercel)

  // API Route: Create Booking & Simulate Payment + Email Notifications
  app.post("/api/book", async (req, res) => {
    try {
      const { name, email, phone, weight, date, timeSlot, experienceId, experienceName, price, paymentMethod, instructor } = req.body;

      if (!name || !email || !phone || !weight || !date || !timeSlot || !experienceId) {
        return res.status(400).json({ error: "Tutti i campi obbligatori devono essere compilati." });
      }

      const selectedInstructor = instructor || "Francesco Guarini";
      const isRocco = selectedInstructor.includes("Rocco") || selectedInstructor.includes("Gallone");
      const pilotEmail = isRocco ? "roccogallonevolo@gmail.com" : (process.env.SMTP_TO_PILOT || "guarinivolo1964@gmail.com");
      const pilotName = isRocco ? "Istruttore Rocco Gallone" : "Francesco Guarini";

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
        paymentMethod: paymentMethod || "PayPal (Acconto €50) + Contanti al campo",
        status: "confirmed",
        createdAt: new Date().toISOString(),
        instructor: selectedInstructor,
      };

      await saveBookingAsync(newBooking);

      const remainingBalance = Math.max(0, Number(price) - 50);

      const emailTextToPilot = `Ciao ${pilotName},
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
- Totale Volo: €${price}
- Acconto Ricevuto (PayPal): €50
- Saldo da riscuotere in contanti al campo: €${remainingBalance}
- Istruttore designato: ${selectedInstructor}

La prenotazione è stata CONFERMATA. L'acconto di €50 è stato versato via PayPal. Il saldo rimanente (€${remainingBalance}) verrà riscosso in contanti direttamente al campo di volo.
Si prega di monitorare il meteo per il giorno selezionato.`;

      const emailTextToCustomer = `Gentile ${name},
Ti confermiamo la prenotazione del tuo volo promozionale in ultraleggero!
Abbiamo registrato l'acconto di €50 versato tramite PayPal. Il saldo rimanente di €${remainingBalance} avverrà direttamente in contanti al campo di volo il giorno dell'esperienza.

Ecco il tuo riepilogo:
- Codice Prenotazione: ${bookingId}
- Esperienza: ${experienceName}
- Decollo da: Campo di Volo Duneairpark (zona Fasano-Ostuni)
- Data: ${date}
- Fascia Oraria: ${timeSlot}
- Peso inserito: ${weight} kg
- Prezzo Totale: €${price}
- Acconto Versato (PayPal): €50
- Saldo da versare al campo: €${remainingBalance} (in contanti)

Pilota di riferimento: ${selectedInstructor} (${pilotEmail})

NOTIFICA DI SICUREZZA & METEO:
I voli in ultraleggero sono strettamente legati alle condizioni meteo (vento e visibilità). 
In caso di meteo non idoneo, verrai contattato direttamente per riprogrammare il volo senza alcun costo aggiuntivo.

Grazie per aver scelto Duneairpark! Ti aspettiamo per spiccare il volo.`;

      const pilotMailResult = await sendEmail({
        to: pilotEmail,
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
          pilot: { address: pilotEmail, ...pilotMailResult },
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

  // API Route: Public PayPal Configuration
  app.get("/api/paypal/config", (req, res) => {
    return res.json({
      success: true,
      config: paypalConfig
    });
  });

  // API Route: Admin Update PayPal Configuration
  app.post("/api/admin/paypal-config", checkAdminAuth, (req, res) => {
    try {
      const { email, clientId, paypalMeUrl, depositAmount, currency, environment, instructions } = req.body || {};

      paypalConfig = {
        email: email ? String(email).trim() : paypalConfig.email,
        clientId: clientId !== undefined ? String(clientId).trim() : paypalConfig.clientId,
        paypalMeUrl: paypalMeUrl ? String(paypalMeUrl).trim() : paypalConfig.paypalMeUrl,
        depositAmount: Number(depositAmount) > 0 ? Number(depositAmount) : paypalConfig.depositAmount,
        currency: currency ? String(currency).trim() : paypalConfig.currency,
        environment: environment === "sandbox" ? "sandbox" : "live",
        instructions: instructions ? String(instructions).trim() : paypalConfig.instructions
      };

      savePayPalConfig();

      return res.json({
        success: true,
        message: "Configurazione PayPal aggiornata con successo!",
        config: paypalConfig
      });
    } catch (err: any) {
      console.error("Errore aggiornamento PayPal config:", err);
      return res.status(500).json({ error: "Impossibile salvare la configurazione PayPal." });
    }
  });

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
    try {
      const { newPassword } = req.body || {};
      if (!newPassword || String(newPassword).trim().length < 4) {
        return res.status(400).json({ error: "La password deve contenere almeno 4 caratteri." });
      }
      const passwordToSave = String(newPassword).trim();

      cachedAdminPassword = passwordToSave;
      adminConfig.password = passwordToSave;
      saveAdminConfig();

      if (usePostgres) {
        try {
          await ensureTablesExist();
          if (usePostgres) {
            await sql`
              INSERT INTO admin_config (key, value)
              VALUES ('password', ${passwordToSave})
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
            `;
          }
        } catch (err) {
          console.warn("Avviso: Salvataggio password su Postgres fallito, mantenuto nel file di configurazione locale:", err);
        }
      }

      return res.json({ success: true, message: "Password aggiornata con successo!" });
    } catch (err: any) {
      console.error("Errore modifica password:", err);
      return res.status(500).json({ error: "Errore durante il salvataggio della nuova password." });
    }
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

  // API Route: Suspend Booking with reason & send email notification
  app.post("/api/admin/bookings/suspend", checkAdminAuth, async (req, res) => {
    try {
      const { bookingId, reason, customReason, customNote, sendEmail: shouldSendEmail = true } = req.body || {};
      if (!bookingId) {
        return res.status(400).json({ error: "ID prenotazione mancante." });
      }

      const strBookingId = String(bookingId);
      const allBookings = await getBookingsAsync();
      const booking = allBookings.find(b => String(b.id).toLowerCase() === strBookingId.toLowerCase());
      if (!booking) {
        return res.status(404).json({ error: "Prenotazione non trovata." });
      }

      await updateBookingStatusAsync(strBookingId, "pending_weather");
      booking.status = "pending_weather";

      let customerMailResult: any = null;
      let pilotMailResult: any = null;
      let emailErrorMsg = "";

      if (shouldSendEmail) {
        const selectedInstructor = booking.instructor || "Francesco Guarini";
        const isRocco = selectedInstructor.includes("Rocco") || selectedInstructor.includes("Gallone");
        const pilotEmail = isRocco ? "roccogallonevolo@gmail.com" : (process.env.SMTP_TO_PILOT || "guarinivolo1964@gmail.com");

        let reasonLabel = "Condizioni Meteo Avverse (Vento / Pioggia / Scarsa Visibilità)";
        const strReason = String(reason || "");
        const strCustomReason = String(customReason || "").trim();
        const strCustomNote = String(customNote || "").trim();

        if (strReason === "altro") {
          reasonLabel = strCustomReason ? strCustomReason : "Motivi Operativi / Sicurezza di Volo";
        } else if (strCustomReason) {
          reasonLabel = `${reasonLabel} - ${strCustomReason}`;
        }

        const noteText = strCustomNote ? `\n\nNOTA DEL PILOTA:\n"${strCustomNote}"` : "";

        const emailTextToCustomer = `Gentile ${booking.name},

Ti informiamo che il tuo volo promozionale in ultraleggero in programma per il ${booking.date} alle ore ${booking.timeSlot} è stato MOMENTANEAMENTE SOSPESO.

MOTIVAZIONE DELLA SOSPENSIONE:
• ${reasonLabel}${noteText}

COSA SUCCEDE ADESSO?
La tua prenotazione (Codice: ${booking.id}) rimane REGOLARMENTE ATTIVA nel nostro sistema ed è inserita in lista prioritaria.
I voli in ultraleggero dipendono dalle condizioni atmosferiche per garantire la massima sicurezza.

Il tuo pilota di riferimento (${selectedInstructor}) ti contatterà al più presto al numero ${booking.phone} o via email per concordare una nuova data e orario di decollo, senza alcun costo aggiuntivo.

Riepilogo Prenotazione:
- Codice Prenotazione: ${booking.id}
- Esperienza: ${booking.experienceName}
- Data/Ora Sospesa: ${booking.date} alle ore ${booking.timeSlot}
- Campo di Volo: DuneAirPark (zona Fasano - Ostuni)
- Pilota Referente: ${selectedInstructor} (${pilotEmail})

Grazie per la comprensione e la collaborazione.
Staff DuneAirPark - Campo di Volo Ultraleggeri`;

        const emailTextToPilot = `Ciao ${selectedInstructor},
Hai SOSPESO la prenotazione ${booking.id} (${booking.name}).

Motivazione indicata: ${reasonLabel}
Email inviata al cliente: ${booking.email}
Telefono cliente: ${booking.phone}
Data/Ora originaria: ${booking.date} - ${booking.timeSlot}

Ricordati di contattare il passeggero per riprogrammare il volo!`;

        try {
          customerMailResult = await sendEmail({
            to: booking.email,
            subject: `[Duneairpark] ⚠️ SOSPENSIONE VOLO - Codice ${booking.id}`,
            text: emailTextToCustomer
          });
          if (customerMailResult && !customerMailResult.success && customerMailResult.error) {
            emailErrorMsg = customerMailResult.error;
          }
        } catch (mErr: any) {
          console.error("Errore invio email cliente:", mErr);
          emailErrorMsg = mErr.message || "Impossibile inviare email";
        }

        try {
          pilotMailResult = await sendEmail({
            to: pilotEmail,
            subject: `[Duneairpark] NOTIFICA SOSPENSIONE - ${booking.id} (${booking.name})`,
            text: emailTextToPilot
          });
        } catch (mErr: any) {
          console.error("Errore invio email pilota:", mErr);
        }
      }

      let responseMsg = "Volo sospeso con successo.";
      if (shouldSendEmail) {
        if (customerMailResult?.success) {
          responseMsg = customerMailResult.simulated 
            ? "Volo sospeso. Email di notifica simulata (SMTP non configurato)."
            : "Volo sospeso ed email di notifica inviata con successo al passeggero!";
        } else if (emailErrorMsg) {
          responseMsg = `Volo sospeso. Attenzione: invio email fallito (${emailErrorMsg}).`;
        } else {
          responseMsg = "Volo sospeso correttamente.";
        }
      }

      return res.json({
        success: true,
        message: responseMsg,
        booking,
        mailSent: customerMailResult
      });
    } catch (err: any) {
      console.error("Errore nella sospensione del volo:", err);
      return res.status(500).json({ error: "Errore durante la sospensione: " + (err.message || String(err)) });
    }
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

  // API Route: Get ALL Gallery Images (Public)
  app.get("/api/gallery", async (req, res) => {
    try {
      const customImages = await getCustomGalleryImagesAsync();
      const defaultGalleryImages = [
        {
          id: "default-1",
          src: "/src/assets/images/puglia_ultralight_flight_1784312533388.jpg",
          category: "voli",
          title: "Volo in Ultraleggero",
          description: "Un'indimenticabile crociera ad alta quota nei cieli azzurri della Puglia costiera.",
          tag: "In Volo"
        },
        {
          id: "default-2",
          src: "/src/assets/images/puglia_coastline_view_1784313223375.jpg",
          category: "territorio",
          title: "Costa Fasano - Ostuni",
          description: "La suggestiva piana degli ulivi secolari monumentali incontra l'azzurro intenso del Mare Adriatico.",
          tag: "Panorama"
        },
        {
          id: "default-3",
          src: "/src/assets/images/duneairpark_hangar_airfield_1784313238206.jpg",
          category: "campo",
          title: "Campo di Volo DuneAirPark",
          description: "La nostra pista in erba fronte mare e l'hangar che ospita la flotta di ultraleggeri moderni.",
          tag: "La Nostra Base"
        },
        {
          id: "default-4",
          src: "/src/assets/images/ultralight_plane_puglia_1784313251640.jpg",
          category: "voli",
          title: "Ostuni dall'Alto",
          description: "La splendida Città Bianca arroccata sui colli di Puglia che risplende di calce candida.",
          tag: "Azione"
        },
        {
          id: "default-5",
          src: "/src/assets/images/valle_ditria_aerial_1784313263824.jpg",
          category: "territorio",
          title: "La Valle d'Itria",
          description: "Una splendida vista aerea dei leggendari coni dei Trulli circondati da muretti a secco e vigneti.",
          tag: "Territorio"
        }
      ];
      const deletedList = await getDeletedDefaultsAsync();
      const filteredDefaults = defaultGalleryImages.filter(img => !deletedList.includes(img.id));
      // Dynamic photos first, then default photos
      return res.json({ images: [...customImages, ...filteredDefaults] });
    } catch (err) {
      console.error("Errore nel caricamento della galleria:", err);
      return res.status(500).json({ error: "Errore interno del server durante il caricamento della galleria." });
    }
  });

  // API Route: Add Gallery Image (Admin only)
  app.post("/api/admin/gallery", checkAdminAuth, async (req, res) => {
    try {
      const { src, category, title, description, tag } = req.body;
      if (!src || !category || !title || !description || !tag) {
        return res.status(400).json({ error: "Tutti i campi (src, category, title, description, tag) sono obbligatori." });
      }
      const id = "IMG-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const newItem: GalleryItem = {
        id,
        src,
        category,
        title,
        description,
        tag,
        createdAt: new Date().toISOString()
      };
      const success = await saveGalleryImageAsync(newItem);
      if (!success) {
        return res.status(500).json({ error: "Impossibile salvare l'immagine nel database." });
      }
      return res.status(201).json({ success: true, item: newItem });
    } catch (err: any) {
      console.error("Errore nell'inserimento dell'immagine:", err);
      return res.status(500).json({ error: "Errore interno del server durante il salvataggio." });
    }
  });

  // API Route: Delete Gallery Image (Admin only)
  app.delete("/api/admin/gallery/:id", checkAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "ID dell'immagine mancante." });
      }
      const success = await deleteGalleryImageAsync(id);
      if (!success) {
        return res.status(500).json({ error: "Errore durante l'eliminazione dell'immagine nel database." });
      }
      return res.json({ success: true, message: "Immagine eliminata con successo!" });
    } catch (err: any) {
      console.error("Errore nell'eliminazione dell'immagine:", err);
      return res.status(500).json({ error: "Errore interno del server durante l'eliminazione." });
    }
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

      const selectedInstructor = booking.instructor || "Francesco Guarini";
      const isRocco = selectedInstructor.includes("Rocco") || selectedInstructor.includes("Gallone");
      const pilotEmail = isRocco ? "roccogallonevolo@gmail.com" : (process.env.SMTP_TO_PILOT || "guarinivolo1964@gmail.com");
      const pilotName = isRocco ? "Istruttore Rocco Gallone" : "Francesco Guarini";

      const emailTextToPilot = `Ciao ${pilotName},
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
- Istruttore designato: ${selectedInstructor}

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

Pilota di riferimento: ${selectedInstructor} (${pilotEmail})

Grazie per aver scelto Duneairpark! Ti aspettiamo per spiccare il volo.`;

      const pilotResult = await sendEmail({
        to: pilotEmail,
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
      // System instructions guide the persona of the Virtual Pilot
      const systemInstruction = `
Sei il "Pilota Virtuale", assistente AI del Campo di Volo Duneairpark, situato nella splendida zona costiera tra Fasano e Ostuni, in Puglia (vicino Savelletri).
Il tuo indirizzo email di contatto principale è guarinivolo1964@gmail.com.

Il tuo stile di comunicazione è estremamente accogliente, cordiale, caloroso e professionale. Parli in italiano con un pizzico di entusiasmo pugliese per il volo, il mare azzurro, gli ulivi secolari e le città bianche come Ostuni viste dall'alto. Metti sempre al primo posto la sicurezza del volo!

Informazioni Chiave per rispondere:
1. CAMPO DI VOLO DUNEAIRPARK: Si trova sulla costa tra Fasano e Ostuni. Offre una pista in erba ben curata, ideale per decolli e atterraggi panoramici a due passi dal mare Adriatico e dai resti archeologici di Egnazia.
2. I NOSTRI PILOTI ISTRUTTORI:
   - Francesco Guarini: Pilota Capo ed esperto istruttore certificato con migliaia di ore di volo, fondatore di Duneairpark. Specializzato in voli panoramici costieri e sicurezza operativa. Email: guarinivolo1964@gmail.com
   - Istruttore Rocco Gallone: Secondo pilota istruttore certificato di grande esperienza, esperto in ultraleggeri e volo sportivo. Appassionato di navigazione aerea sopra la Valle d'Itria e i Trulli. Email: roccogallonevolo@gmail.com
3. VOLI PROMOZIONALI DISPONIBILI:
   - "Battesimo del Volo" (15 min, €80): Volo introduttivo lungo la splendida costa di Savelletri e sulle rovine dell'antica città romana di Egnazia.
   - "Volo dei Trulli" (30 min, €140): Sorvolo dei secolari oliveti di Fasano fino a scorgere la magia dei trulli di Alberobello, rientro costiero.
   - "Rotta delle Città Bianche" (45 min, €190): Volo indimenticabile sopra Ostuni (la Città Bianca) arroccata sui colli, Fasano e le spiagge incontaminate.
   - "L'Emozione di Puglia" (60 min, €240): Il grand tour! Sorvolo di Ostuni, Fasano, Cisternino, Locorotondo, la Valle d'Itria e tutta la magnifica costa adriatica.
4. SICUREZZA & LIMITI:
   - Peso massimo consentito per il passeggero: 100 kg (per bilanciamento dell'ultraleggero).
   - Età minima: 16 anni (con consenso dei genitori).
   - Meteo: Il volo in ultraleggero è subordinato alle condizioni meteorologiche. Se il pilota valuta che il vento o la visibilità non sono idonei, il volo viene rimandato e riprogrammato in accordo con il passeggero (senza costi).
   - Prenotazioni: Si effettuano online sul sito con un acconto di €50 versato tramite PayPal. Il saldo rimanente verrà corrisposto direttamente in contanti al campo di volo il giorno dell'esperienza. L'utente può scegliere il proprio istruttore preferito (Francesco Guarini o Rocco Gallone). Una volta confermata la prenotazione, viene inviata un'email automatica di conferma all'istruttore designato e al passeggero.

Rispondi sempre in italiano in modo chiaro ed esaustivo, incoraggiando l'utente a prenotare questa magnifica esperienza o a fare domande sulla sicurezza, la durata e le rotte. Non inventare dati non indicati.
`;

      // Map simple message history to Gemini contents format
      const formattedContents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      // Generate content with Gemini 2.5 Flash
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
