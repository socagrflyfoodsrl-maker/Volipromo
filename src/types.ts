export interface FlightPackage {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number; // in euros
  shortDesc: string;
  longDesc: string;
  highlights: string[];
  routeColor: string;
  difficulty: "Facile" | "Adrenalinico" | "Panoramico";
}

export interface Booking {
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface GalleryItem {
  id: string | number;
  src: string;
  category: "campo" | "territorio" | "voli";
  title: string;
  description: string;
  tag: string;
  createdAt?: string;
}

