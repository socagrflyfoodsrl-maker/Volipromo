import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, X, ChevronLeft, ChevronRight, ZoomIn, Compass } from "lucide-react";

interface GalleryItem {
  id: number;
  src: string;
  category: "campo" | "territorio" | "voli";
  title: string;
  description: string;
  tag: string;
}

const GALLERY_IMAGES: GalleryItem[] = [
  {
    id: 1,
    src: "/src/assets/images/puglia_ultralight_flight_1784312533388.jpg",
    category: "voli",
    title: "Volo in Ultraleggero",
    description: "Un'indimenticabile crociera ad alta quota nei cieli azzurri della Puglia costiera.",
    tag: "In Volo"
  },
  {
    id: 2,
    src: "/src/assets/images/puglia_coastline_view_1784313223375.jpg",
    category: "territorio",
    title: "Costa Fasano - Ostuni",
    description: "La suggestiva piana degli ulivi secolari monumentali incontra l'azzurro intenso del Mare Adriatico.",
    tag: "Panorama"
  },
  {
    id: 3,
    src: "/src/assets/images/duneairpark_hangar_airfield_1784313238206.jpg",
    category: "campo",
    title: "Campo di Volo DuneAirPark",
    description: "La nostra pista in erba fronte mare e l'hangar che ospita la flotta di ultraleggeri moderni.",
    tag: "La Nostra Base"
  },
  {
    id: 4,
    src: "/src/assets/images/ultralight_plane_puglia_1784313251640.jpg",
    category: "voli",
    title: "Ostuni dall'Alto",
    description: "La splendida Città Bianca arroccata sui colli di Puglia che risplende di calce candida.",
    tag: "Azione"
  },
  {
    id: 5,
    src: "/src/assets/images/valle_ditria_aerial_1784313263824.jpg",
    category: "territorio",
    title: "La Valle d'Itria",
    description: "Una splendida vista aerea dei leggendari coni dei Trulli circondati da muretti a secco e vigneti.",
    tag: "Territorio"
  }
];

export default function PhotoGallery() {
  const [activeFilter, setActiveFilter] = useState<"all" | "campo" | "territorio" | "voli">("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredItems = activeFilter === "all" 
    ? GALLERY_IMAGES 
    : GALLERY_IMAGES.filter(item => item.category === activeFilter);

  // Handle keyboard events for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex]);

  const handlePrev = () => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev === 0 ? GALLERY_IMAGES.length - 1 : prev - 1;
    });
  };

  const handleNext = () => {
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev === GALLERY_IMAGES.length - 1 ? 0 : prev + 1;
    });
  };

  const scrollToBooking = () => {
    setLightboxIndex(null);
    const bookingSection = document.getElementById("prenota");
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-16 bg-slate-50 border-t border-b border-slate-200" id="galleria">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Gallery Header */}
        <div className="text-center mb-12">
          <span className="text-[10px] font-bold tracking-widest text-sky-600 bg-sky-50 px-3 py-1.5 rounded-full uppercase">
            Galleria Fotografica
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-slate-900 mt-4">
            La Puglia vista dall'Alto
          </h2>
          <div className="h-1 w-12 bg-sky-600 mx-auto my-4"></div>
          <p className="text-slate-500 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
            Sfoglia gli scatti reali del nostro campo di volo DuneAirPark, degli ultraleggeri in azione e dei panorami mozzafiato tra la costa di Fasano e i colli di Ostuni.
          </p>
        </div>

        {/* Filters Tabs */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-10" id="gallery-filters">
          {[
            { id: "all", label: "Tutte le Foto" },
            { id: "campo", label: "Il Campo di Volo" },
            { id: "territorio", label: "Il Territorio" },
            { id: "voli", label: "I Voli in Azione" }
          ].map((tab) => (
            <button
              key={tab.id}
              id={`filter-btn-${tab.id}`}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-250 ${
                activeFilter === tab.id
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/10 scale-102"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          id="gallery-grid"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => {
              // Get original index in global list for lightbox mapping
              const globalIndex = GALLERY_IMAGES.findIndex(img => img.id === item.id);
              
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.3 }}
                  key={item.id}
                  id={`gallery-item-${item.id}`}
                  onClick={() => setLightboxIndex(globalIndex)}
                  className="group relative bg-white rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-500 transition-all duration-300 cursor-pointer flex flex-col h-full"
                >
                  {/* Image Container */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={item.src}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full text-sky-600 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <ZoomIn className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Tag Badge */}
                    <span className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg">
                      {item.tag}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="p-5 flex-grow flex flex-col justify-between border-t border-slate-100">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-display font-extrabold text-slate-800 group-hover:text-sky-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-1 text-[10px] text-sky-600 font-bold uppercase tracking-wider">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Ingrandisci Foto</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Lightbox / Modal Overlay */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            id="gallery-lightbox"
            className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col justify-between p-4 md:p-6"
          >
            {/* Lightbox Header */}
            <div className="flex justify-between items-center w-full max-w-7xl mx-auto text-white">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-sky-400 animate-spin-slow" />
                <span className="text-xs font-mono font-bold tracking-wider text-slate-400">
                  FOTO {lightboxIndex + 1} DI {GALLERY_IMAGES.length}
                </span>
              </div>
              
              <button
                id="lightbox-close-btn"
                onClick={() => setLightboxIndex(null)}
                className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-colors cursor-pointer"
                title="Chiudi galleria"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Image Slider Area */}
            <div className="relative flex-grow flex items-center justify-center my-4 max-w-5xl mx-auto w-full h-full">
              
              {/* Previous Button */}
              <button
                id="lightbox-prev-btn"
                onClick={handlePrev}
                className="absolute left-0 md:-left-12 z-10 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                title="Foto Precedente"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Main Lightbox Image Container */}
              <motion.div
                key={lightboxIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="relative max-h-[70vh] w-full flex items-center justify-center"
              >
                <img
                  src={GALLERY_IMAGES[lightboxIndex].src}
                  alt={GALLERY_IMAGES[lightboxIndex].title}
                  referrerPolicy="no-referrer"
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
                />
              </motion.div>

              {/* Next Button */}
              <button
                id="lightbox-next-btn"
                onClick={handleNext}
                className="absolute right-0 md:-right-12 z-10 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                title="Foto Successiva"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Lightbox Footer Info Panel */}
            <div className="bg-slate-900/80 backdrop-blur-md text-white p-6 rounded-2xl border border-slate-800 max-w-3xl w-full mx-auto shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1 text-left">
                <span className="bg-sky-500/20 text-sky-300 text-[8px] uppercase font-black tracking-widest px-2 py-0.5 rounded">
                  {GALLERY_IMAGES[lightboxIndex].tag}
                </span>
                <h4 className="text-lg font-display font-extrabold text-white mt-1">
                  {GALLERY_IMAGES[lightboxIndex].title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {GALLERY_IMAGES[lightboxIndex].description}
                </p>
              </div>

              <button
                id="lightbox-cta-btn"
                onClick={scrollToBooking}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-lg shadow-sky-600/15 flex items-center gap-1.5 transition-all self-stretch md:self-auto justify-center whitespace-nowrap"
              >
                Vola Qui ✈️
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
