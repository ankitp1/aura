import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Library, Plus, ChevronRight, Wand2, Lightbulb, Share2 } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { generateStylingAdvice } from '../services/geminiService';
import html2canvas from 'html2canvas';
import { fetchWeather, WeatherData, getWeatherIcon } from '../services/weatherService';
import { cn } from '../lib/utils';
import { WardrobeItem } from '../types';

export default function Inspire() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [closet, setCloset] = useState<WardrobeItem[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [result, setResult] = useState<{
    outfits: { name: string, items: string[], itemIds: string[], explanation: string }[],
    missingPieceSuggestion: string
  } | null>(null);
  const [savedOutfits, setSavedOutfits] = useState<Set<number>>(new Set());
  const [sharingIdx, setSharingIdx] = useState<number | null>(null);

  const handleQuickAdd = (text: string) => {
    setGoal(prev => prev ? `${prev}, ${text}` : text);
  };

  const handleSaveOutfit = async (outfit: any, index: number) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    try {
      await addDoc(collection(db, 'users', userId, 'lookbooks'), {
        ...outfit,
        createdAt: Date.now()
      });
      setSavedOutfits(prev => new Set(prev).add(index));
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  const handleShareOutfit = async (outfit: any, idx: number) => {
    setSharingIdx(idx);
    try {
      const element = document.getElementById(`outfit-card-${idx}`);
      let file: File | null = null;
      
      if (element) {
        // Capture the card visually
        const canvas = await html2canvas(element, { useCORS: true, backgroundColor: '#050505', scale: 2 });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          file = new File([blob], `aura_outfit_${idx}.png`, { type: 'image/png' });
        }
      }

      let text = `Aura styled me for: "${goal}"\n\n👗 ${outfit.name}\n`;
      
      if (outfit.itemIds && outfit.itemIds.length > 0) {
         outfit.itemIds.forEach((id: string) => {
           const closetItem = closet.find(c => c.id === id);
           if (closetItem) {
             text += `- ${closetItem.color} ${closetItem.category}\n`;
           }
         });
      } else {
         outfit.items.forEach((item: string) => { text += `- ${item}\n`; });
      }
      
      text += `\n✨ " ${outfit.explanation} "\n\nWhat do you think?`;
      
      // Share payload
      if (navigator.share) {
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `My Aura Outfit: ${outfit.name}`,
            text: text,
            files: [file]
          });
        } else {
          // Fallback to text only if device doesn't support file sharing
          await navigator.share({
            title: `My Aura Outfit: ${outfit.name}`,
            text: text
          });
        }
      } else {
        await navigator.clipboard.writeText(text);
        alert("Outfit copied to clipboard! (Browser does not support native sharing)");
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error("Error sharing", err);
      }
    } finally {
      setSharingIdx(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      // Fetch Closet
      const q = query(collection(db, 'users', userId, 'wardrobe'));
      const snap = await getDocs(q);
      setCloset(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WardrobeItem)));

      // Fetch Weather
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const data = await fetchWeather(position.coords.latitude, position.coords.longitude);
          setWeather(data);
          setWeatherLoading(false);
        }, (err) => {
          console.warn("Geolocation error:", err);
          setWeatherLoading(false);
        });
      } else {
        setWeatherLoading(false);
      }
    };
    init();
  }, []);

  const handleInspire = async () => {
    if (!goal.trim() || closet.length === 0) return;
    setLoading(true);
    
    let weatherString = "";
    if (weather) {
      weatherString = weather.temperature.map((t, i) => 
        `${new Date(weather.time[i]).getHours()}:00 - ${t}°C, ${getWeatherIcon(weather.weatherCode[i])}`
      ).join('; ');
    }

    try {
      // Filter out unavailable/archived items
      const activeCloset = closet.filter(item => item.isAvailable !== false && !item.isArchived);
      
      const data = await generateStylingAdvice(activeCloset, goal, weatherString);
      setResult(data);
      setSavedOutfits(new Set());
    } catch (error) {
      console.error("Inspire error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 pb-32">
      <header className="mb-12 text-center">
        <h2 className="text-5xl serif italic mb-4">Style Me</h2>
        <p className="text-white/40 uppercase tracking-[0.3em] text-[10px] font-bold">Gemini-Powered Outfit Curation</p>
      </header>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-12 shadow-2xl relative overflow-hidden">
        {weather && (
          <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between overflow-x-auto gap-8 no-scrollbar">
            <div className="flex flex-col shrink-0">
              <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold mb-1">Local Forecast</span>
              <span className="text-xs font-semibold text-gold">Next 6 Hours</span>
            </div>
            <div className="flex gap-6">
              {weather.time.map((t, i) => (
                <div key={i} className="flex flex-col items-center shrink-0">
                  <span className="text-[9px] text-white/40 mb-1">{new Date(t).getHours()}:00</span>
                  <span className="text-lg">{getWeatherIcon(weather.weatherCode[i])}</span>
                  <span className="text-[10px] font-medium">{Math.round(weather.temperature[i])}°</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!weather && !weatherLoading && (
          <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold mb-1">Local Forecast</span>
              <span className="text-xs font-semibold text-gray-500">Weather unavailable. Styling will proceed with base capsule context.</span>
            </div>
          </div>
        )}

        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wand2 className="w-24 h-24" />
        </div>
        
        <div className="relative z-10">
          <h3 className="text-xl serif italic mb-6">What is the occasion?</h3>
          <div className="flex gap-4">
            <input 
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. A rainy gallery opening in Soho..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-sm focus:outline-none focus:border-gold transition-all"
            />
            <button 
              onClick={handleInspire}
              disabled={loading || !goal.trim()}
              className="bg-gold text-black px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-white hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              {loading ? <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" /> : <Send className="w-4 h-4" />}
              Generate
            </button>
          </div>
          
          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3 font-bold">Vibe Constructor</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="text-[9px] uppercase tracking-widest text-white/30 mr-2 py-2">Formality:</span>
                {['Casual', 'Smart Casual', 'Business', 'Formal', 'Avant-Garde'].map(s => (
                  <button key={s} onClick={() => handleQuickAdd(s)} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[9px] uppercase tracking-wider hover:bg-white/20 transition-colors">{s}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-[9px] uppercase tracking-widest text-white/30 mr-2 py-2">Time/Setting:</span>
                {['Morning Coffee', 'Office', 'Dinner Date', 'Late Night', 'Weekend Getaway'].map(s => (
                  <button key={s} onClick={() => handleQuickAdd(s)} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[9px] uppercase tracking-wider hover:bg-white/20 transition-colors">{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="flex gap-3">
              {[0, 1, 2].map(i => (
                <motion.div 
                  key={i}
                  animate={{ y: [0, -10, 0], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                  className="w-2 h-2 bg-gold rounded-full"
                />
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-bold ml-2">Consulting Your Aura</p>
          </motion.div>
        )}

        {result && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {result.outfits.map((outfit, idx) => (
                <div id={`outfit-card-${idx}`} key={idx} className="bg-[#050505] border border-white/10 rounded-2xl p-6 flex flex-col group hover:border-gold/50 transition-all shadow-2xl relative">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center mb-4 group-hover:bg-gold transition-colors" data-html2canvas-ignore>
                    <Sparkles className="w-5 h-5 text-gold group-hover:text-black" />
                  </div>
                  <h4 className="text-lg font-bold mb-4 uppercase tracking-tight">{outfit.name}</h4>
                  
                  {/* Visual Flatlay of Wardrobe Items */}
                  {outfit.itemIds && outfit.itemIds.length > 0 && (
                    <div className="flex -space-x-4 mb-6 pl-2">
                      {outfit.itemIds.map((id, i) => {
                        const closetItem = closet.find(c => c.id === id);
                        if (!closetItem) return null;
                        const tag = closetItem.category?.charAt(0).toUpperCase() || '?';
                        return (
                          <div 
                            key={i} 
                            className="relative z-10 w-16 h-24 rounded-md overflow-hidden border-2 border-[#1a1a1a] shadow-2xl hover:-translate-y-2 hover:z-50 hover:scale-110 transition-all cursor-pointer group/item"
                            title={`${closetItem.color} ${closetItem.category}`}
                          >
                            <img 
                              src={`/api/proxy-image?url=${encodeURIComponent(closetItem.imageUrl)}`} 
                              crossOrigin="anonymous" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                // Fallback to raw URL if proxy fails (sharing might still fail, but images will show)
                                e.currentTarget.src = closetItem.imageUrl;
                                e.currentTarget.removeAttribute('crossorigin');
                              }}
                            />
                            <div className="absolute top-1 left-1 w-4 h-4 bg-black/80 backdrop-blur-md border border-white/20 rounded-[3px] flex items-center justify-center shadow-lg">
                              <span className="text-[8px] font-black text-gold">{tag}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mb-6">
                    {outfit.itemIds && outfit.itemIds.length > 0 ? (
                      outfit.itemIds.map((id, i) => {
                        const closetItem = closet.find(c => c.id === id);
                        if (!closetItem) return null;
                        const tag = closetItem.category?.charAt(0).toUpperCase() || '?';
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-[3px] bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <span className="text-[8px] font-black text-gold/80">{tag}</span>
                            </div>
                            <span className="text-xs text-white/80 font-medium">{closetItem.color} {closetItem.category}</span>
                          </div>
                        );
                      })
                    ) : (
                      outfit.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
                          <span className="text-xs text-white/80">{item}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed italic mt-auto mb-4">
                    {outfit.explanation}
                  </p>
                  <div className="flex gap-2" data-html2canvas-ignore>
                    <button 
                      onClick={() => handleSaveOutfit(outfit, idx)}
                      disabled={savedOutfits.has(idx)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-[9px] uppercase tracking-widest font-bold transition-all",
                        savedOutfits.has(idx) 
                          ? "bg-white/10 text-white/40 cursor-not-allowed border border-white/5" 
                          : "bg-gold text-black hover:bg-white"
                      )}
                    >
                      {savedOutfits.has(idx) ? 'Saved' : 'Save'}
                    </button>
                    <button 
                      onClick={() => handleShareOutfit(outfit, idx)}
                      disabled={sharingIdx === idx}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center justify-center border border-white/10 group/share"
                      title="Share Outfit Image"
                    >
                      {sharingIdx === idx ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4 text-white/60 group-hover/share:text-white" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gold/10 border border-gold/30 rounded-2xl p-8 flex items-start gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                <Lightbulb className="w-20 h-20 text-gold" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center shrink-0 border border-gold/30">
                <Lightbulb className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gold mb-2">The Missing Piece</h4>
                <p className="text-sm italic leading-relaxed text-gold/90">{result.missingPieceSuggestion}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
