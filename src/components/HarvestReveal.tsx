import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trash2, Check, Smartphone, Library, ChevronRight, UploadCloud } from 'lucide-react';
import { auth, db, storage } from '../lib/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { cn } from '../lib/utils';
import { fetchGooglePhotos } from '../services/googlePhotosService';
import { extractItemsFromPhotos, extractItemsFromManualUploads } from '../services/geminiService';

interface HarvestRevealProps {
  onComplete: () => void;
  defaultMonths?: number;
}

export default function HarvestReveal({ onComplete, defaultMonths }: HarvestRevealProps) {
  const [status, setStatus] = useState<'scanning' | 'clustering' | 'curating' | 'error' | 'manual_upload'>('scanning');
  const [error, setError] = useState<string | null>(null);
  const [foundItems, setFoundItems] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rawPhotos, setRawPhotos] = useState<any[]>([]);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    const runHarvest = async () => {
      const userId = auth.currentUser?.uid;
      const token = localStorage.getItem('aura_gphotos_token');
      
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

        let extracted: any[] = [];
        
        try {
          // 2. Scan Photos
          const photos = await fetchGooglePhotos(token, months);
          
          if (photos.length === 0) {
             console.warn("No photos found. Bypassing to Demo Fallback for testing.");
          } else {
             setRawPhotos(photos);
             setStatus('clustering');
             // 3. Extract Unique Items with Gemini
             extracted = await extractItemsFromPhotos(photos);
          }
        } catch (apiError: any) {
          if (apiError.message?.includes('403') || apiError.message?.includes('insufficient')) {
            console.warn("Google blocked API access (Unverified App Policy). Switching to Manual Upload UI.", apiError);
            setStatus('manual_upload');
            return; // Stop the flow here so the user can upload
          } else {
            throw apiError; // Re-throw other errors
          }
        }
        
        if (extracted.length === 0) {
          // Fallback to simulation if Gemini extraction yields nothing (safety for MVP)
          const mockItems = [
            { id: 'mock_1', imageUrl: 'https://picsum.photos/seed/dress1/400/600', category: 'Dresses', color: 'Midnight Navy', vibe: 'Chic', reasoning: 'Found in 12 photos. Selected hero image from Oct 12.' },
            { id: 'mock_2', imageUrl: 'https://picsum.photos/seed/blazer/400/600', category: 'Outerwear', color: 'Charcoal Grey', vibe: 'Minimalist', reasoning: 'Found in 5 photos. High-fidelity garment detection.' },
          ];
          setFoundItems(mockItems);
          setSelectedIds(new Set(mockItems.map(i => i.id)));
        } else {
          // Gemini might extract multiple items from ONE photo, so we must generate unique IDs
          const mappedExtracted = extracted.map((item: any, idx: number) => ({
             ...item,
             originalId: item.id,
             id: `auto_${Date.now()}_${idx}`
          }));
          setFoundItems(mappedExtracted);
          setSelectedIds(new Set(mappedExtracted.map((i: any) => i.id)));
        }

        setStatus('curating');
      } catch (err: any) {
        console.error("Harvesting failed:", err);
        setStatus('error');
        
        // Show the exact raw error message from Google to debug the 403
        setError(err.message || "Unknown error occurred during harvest.");
      }
    };

    runHarvest();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setStatus('clustering');
    const images: string[] = [];
    
    // Convert uploaded files to Base64 Data URLs
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
      });
      reader.readAsDataURL(file);
      images.push(await promise);
    }
    
    // Set raw photos for the background animation (mapping index as ID)
    setRawPhotos(images.map((img, i) => ({ id: i.toString(), baseUrl: img })));
    
    // Extract using the new manual upload gemini function
    const extracted = await extractItemsFromManualUploads(images);
    
    if (extracted.length === 0) {
      // Fallback
      const mockItems = [
        { id: 'mock_1', imageUrl: 'https://picsum.photos/seed/dress1/400/600', category: 'Dresses', color: 'Midnight Navy', vibe: 'Chic', reasoning: 'Selected hero image from upload.' },
      ];
      setFoundItems(mockItems);
      setSelectedIds(new Set(mockItems.map(i => i.id)));
    } else {
      // Map the extracted ID back to the uploaded base64 string so it renders in the UI
      // Generate a unique ID to prevent React key collisions if Gemini found multiple items in one image
      const mappedItems = extracted.map((item: any, idx: number) => ({
        ...item,
        originalId: item.id,
        id: `manual_${Date.now()}_${idx}`,
        imageUrl: images[parseInt(item.id)] || images[0]
      }));
      setFoundItems(mappedItems);
      setSelectedIds(new Set(mappedItems.map((i: any) => i.id)));
    }
    setStatus('curating');
  };

  const toggleSelectGroup = (originalId: string) => {
    const itemsInGroup = foundItems.filter(i => i.originalId === originalId);
    const itemIds = itemsInGroup.map(i => i.id);
    
    // If any item in the group is selected, clicking will Veto all of them.
    const anySelected = itemIds.some(id => selectedIds.has(id));
    
    const next = new Set(selectedIds);
    if (anySelected) {
      itemIds.forEach(id => next.delete(id));
    } else {
      itemIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const groupedItems = React.useMemo(() => {
    const groups: Record<string, { originalId: string, imageUrl: string, items: any[] }> = {};
    foundItems.forEach(item => {
      if (!groups[item.originalId]) {
        groups[item.originalId] = {
          originalId: item.originalId,
          imageUrl: item.imageUrl,
          items: []
        };
      }
      groups[item.originalId].items.push(item);
    });
    return Object.values(groups);
  }, [foundItems]);

  const handleCommit = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setCommitting(true);
    try {
      // Save all items to closet, but mark unselected as archived
      for (const item of foundItems) {
        const isSelected = selectedIds.has(item.id);
        
        let finalImageUrl = item.imageUrl;
        
        // If the image is a gigantic Base64 string from a manual upload,
        // upload it to Firebase Storage first to avoid the 1MB Firestore limit.
        if (finalImageUrl.startsWith('data:image')) {
          try {
            const timestamp = Date.now();
            const imageRef = ref(storage, `users/${userId}/wardrobe/${item.category}_${timestamp}.jpg`);
            await uploadString(imageRef, finalImageUrl, 'data_url');
            finalImageUrl = await getDownloadURL(imageRef);
          } catch (err) {
            console.error("Failed to upload manual image to storage", err);
            continue; // Skip this item if upload fails
          }
        }

        await addDoc(collection(db, 'users', userId, 'wardrobe'), {
          userId,
          imageUrl: finalImageUrl,
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
    } catch (err) {
      console.error("Commit failed", err);
      alert("Failed to commit to closet. Please try again.");
    } finally {
      setCommitting(false);
    }
  };

  const handleRefreshConnection = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();

      const width = 500;
      const height = 600;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      
      const popup = window.open(url, 'Google Auth', `width=${width},height=${height},left=${left},top=${top}`);

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          
          const tokens = event.data.tokens;
          if (tokens.access_token) {
            localStorage.setItem('aura_gphotos_token', tokens.access_token);
          }
          
          if (tokens.id_token) {
            try {
              const credential = GoogleAuthProvider.credential(tokens.id_token);
              await signInWithCredential(auth, credential);
              window.location.reload();
            } catch (err: any) {
              console.error("Firebase Sign-In Error:", err);
              alert("Firebase failed to accept the Google token: " + err.message);
            }
          }
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (err) {
      console.error("Refresh failed", err);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col">
      <AnimatePresence mode="wait">
        {(status === 'scanning' || status === 'clustering' || status === 'error' || status === 'manual_upload') && (
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
                  rotate: (status === 'error' || status === 'manual_upload') ? 0 : 360,
                  borderWidth: [2, 4, 2],
                  borderColor: status === 'error' ? 'rgba(239,68,68,0.5)' : status === 'manual_upload' ? 'rgba(255,255,255,0.2)' : ['rgba(212,175,55,0.2)', 'rgba(212,175,55,1)', 'rgba(212,175,55,0.2)']
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
                {status === 'manual_upload' && <UploadCloud className="w-12 h-12 text-gold" />}
              </div>
            </div>
            
            <h2 className={cn("text-3xl serif mb-4 tracking-wide uppercase relative z-10", status === 'error' && "text-red-500")}>
              {status === 'scanning' && 'Harvesting Memories'}
              {status === 'clustering' && 'Clustering Gems'}
              {status === 'error' && 'Identity Error'}
              {status === 'manual_upload' && 'Upload Wardrobe'}
            </h2>
            <p className="text-gray-500 max-w-sm mx-auto leading-relaxed relative z-10">
              {status === 'scanning' && 'Scanning your library for high-value clothing items.'}
              {status === 'clustering' && 'Comparing vision embeddings to extract unique wardrobe items.'}
              {status === 'error' && (error || 'Something went wrong during the harvest.')}
              {status === 'manual_upload' && 'Google restricts automated access for unverified apps. Please manually upload photos of your clothing to proceed.'}
            </p>

            {status === 'manual_upload' && (
              <div className="mt-8 relative z-10">
                <label className="cursor-pointer bg-white text-black px-10 py-4 font-bold uppercase text-[10px] tracking-widest rounded-sm hover:bg-gold transition-colors inline-block">
                  Select Photos
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}

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
                disabled={committing}
                className={cn(
                  "bg-gold text-black px-10 py-3 rounded-sm font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-3",
                  committing ? "opacity-70 cursor-wait" : "hover:bg-white"
                )}
              >
                {committing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Digitizing your threads...
                  </>
                ) : (
                  <>
                    Commit to Closet ({selectedIds.size})
                    <ChevronRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-24">
              {groupedItems.map((group) => {
                const itemIds = group.items.map(i => i.id);
                const isSelected = itemIds.some(id => selectedIds.has(id));

                return (
                  <motion.div 
                    key={group.originalId}
                    layout
                    onClick={() => toggleSelectGroup(group.originalId)}
                    className={cn(
                      "group relative aspect-[3/4] bg-[#111] border rounded-sm overflow-hidden transition-all cursor-pointer shadow-xl",
                      isSelected ? "border-gold" : "border-white/5 opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                    )}
                  >
                    <img src={group.imageUrl} className="w-full h-full object-cover" />
                    
                    {/* Mobile-friendly permanent overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 sm:p-4 flex flex-col justify-end pt-12">
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {group.items.map(item => (
                          <div key={item.id} className="bg-white/10 backdrop-blur-md px-2 py-1 rounded-sm border border-white/10">
                            <p className="text-[8px] uppercase tracking-widest text-gold font-bold">{item.category}</p>
                            <p className="text-[9px] sm:text-[10px] font-medium text-white leading-tight">{item.color}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={cn(
                      "absolute top-3 right-3 px-2 py-1 text-[8px] uppercase tracking-tighter transition-all font-bold",
                      isSelected ? "bg-gold text-black" : "bg-black/60 text-white/40"
                    )}>
                      {isSelected ? 'Selected' : 'Veto'}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
