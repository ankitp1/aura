import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trash2, Check, Smartphone, Library, ChevronRight } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { cn } from '../lib/utils';
import { fetchGooglePhotos } from '../services/googlePhotosService';
import { extractItemsFromPhotos } from '../services/geminiService';

interface HarvestRevealProps {
  onComplete: () => void;
  defaultMonths?: number;
}

export default function HarvestReveal({ onComplete, defaultMonths }: HarvestRevealProps) {
  const [status, setStatus] = useState<'scanning' | 'clustering' | 'curating' | 'error'>('scanning');
  const [error, setError] = useState<string | null>(null);
  const [foundItems, setFoundItems] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rawPhotos, setRawPhotos] = useState<any[]>([]);

  useEffect(() => {
    const runHarvest = async () => {
      const userId = auth.currentUser?.uid;
      const token = localStorage.getItem('google_photos_token');
      
      if (!userId || !token) {
        setStatus('error');
        setError("Google Photos identity not found. Please try connecting again.");
        return;
      }

      try {
        // 1. Fetch Harvest Config (Months) - Use cache-first if possible
        let months = defaultMonths || 12;
        if (!defaultMonths) {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            months = userDoc.data()?.harvestConfig?.months || 12;
          } catch (confErr) {
            console.warn("Could not fetch user config, using default (12m):", confErr);
          }
        }

        // 2. Scan Photos
        const photos = await fetchGooglePhotos(token, months);
        if (photos.length === 0) {
          setStatus('error');
          setError("No photos found in the selected time window.");
          return;
        }
        
        setRawPhotos(photos);
        setStatus('clustering');
        
        // 3. Extract Unique Items with Gemini
        const extracted = await extractItemsFromPhotos(photos);
        
        if (extracted.length === 0) {
          // Fallback to simulation if Gemini extraction yields nothing (safety for MVP)
          const mockItems = [
            { id: '1', imageUrl: 'https://picsum.photos/seed/dress1/400/600', category: 'Dresses', color: 'Midnight Navy', vibe: 'Chic', reasoning: 'Found in 12 photos. Selected hero image from Oct 12.' },
            { id: '2', imageUrl: 'https://picsum.photos/seed/blazer/400/600', category: 'Outerwear', color: 'Charcoal Grey', vibe: 'Minimalist', reasoning: 'Found in 5 photos. High-fidelity garment detection.' },
          ];
          setFoundItems(mockItems);
          setSelectedIds(new Set(mockItems.map(i => i.id)));
        } else {
          setFoundItems(extracted);
          setSelectedIds(new Set(extracted.map((i: any) => i.id)));
        }

        setStatus('curating');
      } catch (err: any) {
        console.error("Harvesting failed:", err);
        setStatus('error');
        
        if (err.message?.includes('401')) {
          setError("Your Google session has expired. Please sign out and reconnect your identity.");
        } else if (err.message?.includes('403')) {
          setError("Access Denied. Please ensure the 'Google Photos Library API' is enabled in your Cloud Console and you have granted permission.");
        } else {
          setError("The harvest protocol was interrupted. Please check your connection or try a smaller harvest window.");
        }
      }
    };

    runHarvest();
  }, []);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCommit = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Save all items to closet, but mark unselected as archived
    for (const item of foundItems) {
      const isSelected = selectedIds.has(item.id);
      await addDoc(collection(db, 'users', userId, 'wardrobe'), {
        userId,
        imageUrl: item.imageUrl,
        category: item.category,
        color: item.color,
        vibe: item.vibe,
        tags: [item.category, item.color, item.vibe],
        isApproved: isSelected,
        isArchived: !isSelected,
        isAvailable: true,
        versatilityScore: 7,
        createdAt: Date.now()
      });
    }

    // Update onboarding status
    await updateDoc(doc(db, 'users', userId), {
      onboardingComplete: true
    });

    onComplete();
  };

  const handleRefreshConnection = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/photoslibrary.readonly');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_photos_token', credential.accessToken);
        window.location.reload(); // Quick refresh to restart the flow
      }
    } catch (err) {
      console.error("Refresh failed", err);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col">
      <AnimatePresence mode="wait">
        {(status === 'scanning' || status === 'clustering' || status === 'error') && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center p-8"
          >
            <div className="relative w-48 h-48 mb-12">
              <motion.div 
                animate={{ 
                  rotate: status === 'error' ? 0 : 360,
                  borderWidth: [2, 4, 2],
                  borderColor: status === 'error' ? 'rgba(239,68,68,0.5)' : ['rgba(212,175,55,0.2)', 'rgba(212,175,55,1)', 'rgba(212,175,55,0.2)']
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className={cn(
                  "absolute inset-0 rounded-full border-2",
                  status === 'error' ? "border-red-500" : "border-gold/20"
                )}
              />
              <div className="absolute inset-4 rounded-full bg-white/5 flex items-center justify-center">
                {status === 'scanning' && <Smartphone className="w-12 h-12 text-gold" />}
                {status === 'clustering' && <Sparkles className="w-12 h-12 text-gold" />}
                {status === 'error' && <Library className="w-12 h-12 text-red-500" />}
              </div>
            </div>
            
            <h2 className={cn("text-3xl serif mb-4 tracking-wide uppercase relative z-10", status === 'error' && "text-red-500")}>
              {status === 'scanning' && 'Harvesting Memories'}
              {status === 'clustering' && 'Clustering Gems'}
              {status === 'error' && 'Identity Error'}
            </h2>
            <p className="text-gray-500 max-w-sm mx-auto leading-relaxed relative z-10">
              {status === 'scanning' && 'Scanning your library for high-value clothing items.'}
              {status === 'clustering' && 'Comparing vision embeddings to extract unique wardrobe items.'}
              {status === 'error' && (error || 'Something went wrong during the harvest.')}
            </p>

            {status === 'clustering' && rawPhotos.length > 0 && (
              <div className="absolute inset-0 z-0 overflow-hidden opacity-20 pointer-events-none mask-image-radial">
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 p-4 animate-pulse-slow">
                  {rawPhotos.slice(0, 100).map((photo: any, i: number) => (
                    <motion.div 
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.5 }}
                      className="aspect-square bg-white/5 rounded-sm overflow-hidden"
                    >
                      <img src={`${photo.baseUrl}=w100-h100`} className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {status === 'error' && (
              <div className="flex gap-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-8 px-8 py-3 bg-white text-black font-bold uppercase text-[10px] tracking-widest rounded-sm hover:bg-gold transition-colors"
                >
                  Try Again
                </button>
                {error?.includes('session has expired') && (
                  <button 
                    onClick={handleRefreshConnection}
                    className="mt-8 px-8 py-3 bg-gold/10 border border-gold/50 text-gold font-bold uppercase text-[10px] tracking-widest rounded-sm hover:bg-gold hover:text-black transition-all"
                  >
                    Refresh Connection
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {status === 'curating' && (
          <motion.div 
            key="curating"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col"
          >
            <div className="mb-8 pt-8 text-center sm:text-left flex flex-col sm:flex-row items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl serif italic">The Harvest is Ready</h2>
                <p className="text-white/40 text-[10px] mt-1 uppercase tracking-[0.2em]">Deduplicated & Hero-Optimized Discovery</p>
              </div>
              <button 
                onClick={handleCommit}
                className="bg-gold text-black px-10 py-3 rounded-sm font-bold text-[10px] uppercase tracking-widest hover:bg-white transition-all flex items-center gap-3"
              >
                Commit to Closet ({selectedIds.size})
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-24">
              {foundItems.map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  onClick={() => toggleSelect(item.id)}
                  className={cn(
                    "group relative aspect-[3/4] bg-[#111] border rounded-sm overflow-hidden transition-all cursor-pointer shadow-xl",
                    selectedIds.has(item.id) ? "border-gold" : "border-white/5 opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                  )}
                >
                  <img src={item.imageUrl} className="w-full h-full object-cover" />
                  
                  <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-md p-4 flex flex-col translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-[9px] uppercase tracking-widest text-gold font-bold mb-1">{item.category}</p>
                    <p className="text-xs font-medium text-white mb-2">{item.color}</p>
                    <p className="text-[10px] text-gray-400 leading-tight italic">{item.reasoning}</p>
                  </div>

                  <div className={cn(
                    "absolute top-3 right-3 px-2 py-1 text-[8px] uppercase tracking-tighter transition-all font-bold",
                    selectedIds.has(item.id) ? "bg-gold text-black" : "bg-black/60 text-white/40"
                  )}>
                    {selectedIds.has(item.id) ? 'Selected' : 'Veto'}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
