import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Sparkles, AlertCircle, CheckCircle2, ChevronRight, ShoppingBag, ArrowLeft, Upload } from 'lucide-react';
import { analyzeItemVersatility } from '../services/geminiService';
import { cn } from '../lib/utils';
import { auth, db, storage } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export default function Evaluator() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error(err);
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/jpeg');
    stopCamera();
    setPhoto(data);
    handleAnalyze(data);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      stopCamera();
      setPhoto(data);
      handleAnalyze(data);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async (imageData: string) => {
    setAnalyzing(true);
    try {
      // Get current wardrobe descriptions for context
      const existing = ['Dark Navy Blazer', 'Black Pencil Skirt', 'Camel Coat', 'Tan Suede Heels'];
      const data = await analyzeItemVersatility(imageData, existing);
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setResult(null);
    startCamera();
  };

  const handleCommit = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId || !photo || !result) return;
    
    setCommitting(true);
    try {
      let finalImageUrl = photo;
      if (finalImageUrl.startsWith('data:image')) {
        const timestamp = Date.now();
        const safeCategory = result.category ? result.category.replace(/\s+/g, '_') : 'evaluator';
        const imageRef = ref(storage, `users/${userId}/wardrobe/${safeCategory}_${timestamp}.jpg`);
        await uploadString(imageRef, finalImageUrl, 'data_url');
        finalImageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, 'users', userId, 'wardrobe'), {
        userId,
        imageUrl: finalImageUrl,
        category: result.category || 'Uncategorized',
        color: result.color || 'Unknown',
        vibe: result.vibe || 'Neutral',
        tags: [result.category, result.color, result.vibe].filter(Boolean),
        isApproved: true,
        isArchived: false,
        isAvailable: true,
        versatilityScore: result.versatilityScore || 5,
        createdAt: Date.now()
      });

      reset();
    } catch (error) {
      console.error("Error committing to closet:", error);
      alert("Failed to add to closet: " + (error as Error).message);
    } finally {
      setCommitting(false);
    }
  };

  React.useEffect(() => {
    if (!photo) startCamera();
  }, [photo]);

  return (
    <div className="pt-4 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-4xl serif mb-1">Evaluator</h1>
        <p className="text-gray-500 font-light tracking-wide">Sync a new item with your current capsule.</p>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full flex flex-col">
        <AnimatePresence mode="wait">
          {!photo ? (
            <motion.div 
              key="camera" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex-1 bg-black rounded-[2rem] overflow-hidden relative border-2 border-white/5"
            >
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
                <div className="w-full h-full border border-white/20 rounded-xl" />
              </div>
              
              <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-4 px-6">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/10 backdrop-blur-md text-white p-6 rounded-full shadow-2xl border border-white/20 hover:bg-white/20 active:scale-95 transition-all"
                >
                  <Upload className="w-8 h-8" />
                </button>
                <button 
                  onClick={capture}
                  className="bg-white text-black p-6 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  <Camera className="w-8 h-8" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="result" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
                <img src={photo} className="w-full h-full object-cover" />
                {analyzing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full mb-4"
                    />
                    <p className="text-gold uppercase tracking-[0.3em] text-xs font-bold">Reasoning with Gemini...</p>
                  </div>
                )}
              </div>

              {result && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Versatility Score</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl serif text-white">{result.versatilityScore}</span>
                        <span className="text-gray-500 font-light text-xl">/ 10</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold mb-1">{result.vibe || 'CHIC'}</p>
                      <p className="text-sm font-medium italic serif">{result.color} {result.category}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="p-2 bg-blue-500/10 rounded-xl h-fit">
                        <AlertCircle className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider mb-1">Redundancy Check</h4>
                        <p className="text-sm text-gray-400 leading-relaxed">{result.redundancyCheck}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Suggested Pairings</h4>
                      {result.pairings.map((p: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                          <div className="w-2 h-2 rounded-full bg-gold" />
                          <span className="text-sm text-gray-300">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={reset} className="flex-1 bg-white/5 py-4 rounded-full border border-white/10 font-bold text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all">
                      Discard
                    </button>
                    <button 
                      onClick={handleCommit}
                      disabled={committing}
                      className={cn(
                        "flex-1 py-4 rounded-full font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center",
                        committing ? "bg-white text-black opacity-50 cursor-not-allowed" : "bg-gold text-white hover:bg-white hover:text-black"
                      )}
                    >
                      {committing ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Add to Closet'}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
