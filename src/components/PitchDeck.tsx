import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Sparkles, Smartphone, CloudSun, Target, ArrowRight } from 'lucide-react';

interface SlideProps {
  title: string;
  subtitle?: string;
  content: string[];
  image: string;
  icon: any;
}

const slides: SlideProps[] = [
  {
    title: "Aura",
    subtitle: "The Digitial Twin of Your Wardrobe",
    content: ["Capturing the intangible vibe of your personality", "Distilling history into style", "Zero-entry digitization"],
    image: "/src/assets/images/aura_pitch_hero_1776865532334.png",
    icon: Sparkles
  },
  {
    title: "The Harvest Protocol",
    subtitle: "Effortless Digitization",
    content: ["Zero-manual entry", "Computer vision clusters your photo library", "Automated hero-image selection for every garment"],
    image: "/src/assets/images/aura_pitch_harvest_1776865551239.png",
    icon: Smartphone
  },
  {
    title: "Style Me",
    subtitle: "Weather-Aware AI Stylist",
    content: ["Gemini-powered outfit curation", "Localized 6-hour forecast integration", "The 'Missing Piece' product discovery engine"],
    image: "/src/assets/images/aura_pitch_stylist_1776865568941.png",
    icon: CloudSun
  },
  {
    title: "The Future of Aura",
    subtitle: "Roadmap to Intelligent Fashion",
    content: ["Social Style Discovery & Aesthetic Matchmaking", "Circular Economy marketplace for the 'Missing Piece'", "Sustainability index for every garment"],
    image: "/src/assets/images/aura_pitch_future_1776865586541.png",
    icon: Target
  }
];

export default function PitchDeck({ onClose }: { onClose: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const next = () => {
    if (currentSlide === slides.length - 1) {
      onClose();
    } else {
      setCurrentSlide(s => s + 1);
    }
  };
  const prev = () => {
    if (currentSlide > 0) setCurrentSlide(s => s - 1);
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipe = Math.abs(offset.x) * velocity.x;
    if (swipe < -100) {
      next();
    } else if (swipe > 100) {
      prev();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col font-sans select-none h-[100dvh]"
    >
      <header className="p-4 md:p-8 flex justify-between items-center z-30 bg-black/50 backdrop-blur-md md:bg-transparent absolute top-0 left-0 right-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <span className="serif text-lg md:text-xl italic tracking-tighter text-white">Aura Pitch</span>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors text-white"
        >
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </header>

      {/* Persistent Navigation Arrows */}
      {currentSlide > 0 && (
        <div className="absolute top-1/2 left-4 md:left-8 -translate-y-1/2 z-40 pointer-events-none">
          <button 
            onClick={prev}
            className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-black/20 hover:bg-gold hover:text-black backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all pointer-events-auto group"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 transition-transform group-active:scale-95" />
          </button>
        </div>
      )}
      <div className="absolute top-1/2 right-4 md:right-8 -translate-y-1/2 z-40 pointer-events-none">
        <button 
          onClick={next}
          className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-black/20 hover:bg-gold hover:text-black backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all pointer-events-auto group"
        >
          <ChevronRight className="w-6 h-6 md:w-8 md:h-8 transition-transform group-active:scale-95" />
        </button>
      </div>

      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden pt-20 md:pt-0">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col md:flex-row h-full min-h-0 absolute inset-0 w-full"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            dragDirectionLock
            onDragEnd={handleDragEnd}
          >
            {/* Content Side */}
            <div className="flex-1 flex flex-col justify-start md:justify-center p-6 md:p-24 z-10 overflow-y-auto no-scrollbar pb-40 md:pb-24">
              <div className="md:hidden h-12 shrink-0" /> {/* Spacer for mobile header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-2xl mx-auto md:mx-0 w-full"
              >
                <div className="p-3 md:p-4 bg-gold/10 w-fit rounded-2xl mb-4 md:mb-8">
                  {React.createElement(slides[currentSlide].icon, { className: "w-6 h-6 md:w-8 md:h-8 text-gold" })}
                </div>
                <h2 className="text-4xl md:text-8xl serif italic mb-3 md:mb-4 leading-tight">{slides[currentSlide].title}</h2>
                <p className="text-gold uppercase tracking-[0.4em] text-[10px] md:text-xs font-bold mb-6 md:mb-12">{slides[currentSlide].subtitle}</p>
                
                <ul className="space-y-4 md:space-y-6">
                  {slides[currentSlide].content.map((item, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (i * 0.1) }}
                      className="flex items-center gap-4 text-white/60 text-base md:text-lg group"
                    >
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gold/50 group-hover:bg-gold transition-colors shrink-0" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <div className="mt-8 md:mt-16 flex flex-col sm:flex-row items-center gap-4 md:gap-8 w-full sm:w-auto">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <button 
                    onClick={next}
                    className="flex-1 sm:flex-none px-8 md:px-10 h-14 rounded-full bg-white text-black font-bold uppercase text-[9px] md:text-[10px] tracking-widest flex items-center justify-center gap-4 hover:bg-gold hover:scale-105 transition-all group whitespace-nowrap"
                  >
                    {currentSlide === slides.length - 1 ? 'Explore Aura' : 'Next Insight'}
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Side */}
            <div className="flex-none md:flex-1 relative order-first md:order-last h-[35vh] md:h-full overflow-hidden">
              <motion.div
                key={`img-${currentSlide}`}
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2 }}
                className="absolute inset-0"
              >
                <img 
                  src={slides[currentSlide].image} 
                  className="w-full h-full object-cover" 
                  alt={slides[currentSlide].title}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,black_0%,transparent_50%)] hidden md:block" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,black_0%,transparent_40%)] md:hidden" />
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress Tracker */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-12 bg-gold' : 'w-4 bg-white/20'}`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
