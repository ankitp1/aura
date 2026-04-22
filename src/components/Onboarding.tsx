import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, ChevronRight, Check, Image as ImageIcon, Calendar, Sparkles } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { UserData } from '../types';
import { cn } from '../lib/utils';

interface OnboardingProps {
  userData: UserData;
  onComplete: () => void;
}

export default function Onboarding({ userData, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please ensure permissions are granted.");
    }
  };

  const takeSelfie = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/jpeg');
    setSelfie(data);
    
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
  };

  const handleNext = async () => {
    setError(null);
    if (step === 1) {
      setStep(2);
      startCamera();
    } else if (step === 2 && selfie) {
      setStep(3);
    } else if (step === 3) {
      setLoading(true);
      setError(null);
      
      const userId = userData.uid;
      const userRef = doc(db, 'users', userId);

      // 1. Optimistic Update of Config (Instant with persistence)
      updateDoc(userRef, {
        onboardingComplete: false,
        harvestConfig: { months }
      }).catch(err => console.error("Config background update failed:", err));

      // 2. Handle Selfie (Background)
      if (selfie) {
        (async () => {
          try {
            const selfieRef = ref(storage, `users/${userId}/identity_reference.jpg`);
            await uploadString(selfieRef, selfie, 'data_url');
            const selfieUrl = await getDownloadURL(selfieRef);
            await updateDoc(userRef, { referenceSelfieUrl: selfieUrl });
          } catch (storageErr) {
            console.warn("Background selfie upload failed:", storageErr);
          }
        })();
      }

      // 3. Immediate Transition
      onComplete();
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-12 pb-24">
      <div className="flex gap-2 mb-8 justify-center">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={cn(
              "h-1 w-12 rounded-full transition-colors",
              step >= i ? "bg-gold" : "bg-white/10"
            )} 
          />
        ))}
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-8 text-sm"
        >
          {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <h2 className="text-4xl serif mb-4 italic">The vision of Aura</h2>
            <p className="text-white/40 mb-12 uppercase tracking-widest text-xs font-bold">Capturing the intangible vibe of your personal style.</p>
            <div className="bg-white/5 rounded-3xl mb-8 p-10 border border-white/10 text-left">
              <div className="flex gap-6 mb-8 italic serif">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                  <Sparkles className="text-gold w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl mb-1 mt-2">Personal Essence</h3>
                  <p className="text-sm text-gray-500 font-sans italic-none">Your style isn't just clothes—it's an atmosphere. Aura uses AI to distill the "essence" of your wardrobe from every photo you've ever taken.</p>
                </div>
              </div>
              <div className="flex gap-6 italic serif">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <ImageIcon className="text-white/40 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl mb-1 mt-2">Zero Effort</h3>
                  <p className="text-sm text-gray-500 font-sans italic-none">Forget manual entry. By harvesting your existing library, we build a perfect digital twin of your capsule wardrobe in seconds.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <h2 className="text-4xl serif mb-4 italic">Identity Reference</h2>
            <p className="text-gray-400 mb-8 max-w-sm mx-auto">Take a clear selfie. This helps our vision engine cluster your wardrobe items with precision.</p>
            
            <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
              <div className="aspect-[3/4] w-full max-w-xs mx-auto bg-black rounded-3xl overflow-hidden border-2 border-white/10 relative shadow-2xl">
                {selfie ? (
                  <img src={selfie} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    {/* Silhouette Guide */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
                      <svg viewBox="0 0 100 133" className="w-[80%] h-[80%] text-white fill-none stroke-gold stroke-[0.5]">
                        <path d="M50,15 c-10,0 -18,8 -18,18 c0,10 8,18 18,18 s18,-8 18,-18 c0,-10 -8,-18 -18,-18 Z M25,120 c0,-30 10,-45 25,-45 s25,15 25,45" />
                        <ellipse cx="50" cy="33" rx="15" ry="20" />
                        <path d="M20,60 Q50,45 80,60" />
                      </svg>
                    </div>
                  </>
                )}
                
                {!selfie && (
                  <button 
                    onClick={takeSelfie}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-black p-4 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all z-10"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Tips Section */}
              <div className="w-full max-w-sm space-y-6 text-left">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <h4 className="text-[10px] uppercase tracking-widest text-gold font-bold mb-4">Selfie Protocol</h4>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-green-500" />
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium">Neutral background, bright natural lighting.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                        <div className="w-2 h-[1px] bg-red-500 rotate-45 absolute" />
                        <div className="w-2 h-[1px] bg-red-500 -rotate-45 absolute" />
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium ml-5 relative">
                         <span className="absolute -left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 font-bold block">×</span>
                        Avoid wearing hats, glasses, or heavy shadows.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3 h-3 text-gold" />
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium">Keep your face centered in the guide.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="aspect-square rounded-xl bg-white/5 border border-green-500/30 overflow-hidden relative">
                      <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300&h=300" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute bottom-2 left-2 bg-green-500 text-black text-[8px] font-black px-2 py-0.5 rounded">IDEAL</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="aspect-square rounded-xl bg-white/5 border border-red-500/30 overflow-hidden relative grayscale blur-[1px] opacity-60">
                      <img src="https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=300&h=300" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute bottom-2 left-2 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">OUT OF FOCUS</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selfie && (
              <button 
                onClick={() => { setSelfie(null); startCamera(); }}
                className="mt-6 text-gray-500 text-[10px] uppercase tracking-widest font-bold hover:text-white transition-colors"
              >
                Retake Reference Photo
              </button>
            )}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <h2 className="text-4xl serif mb-4">Harvest Window</h2>
            <p className="text-gray-400 mb-12">How far back should we search for unique items in your library?</p>
            
            <div className="grid grid-cols-2 gap-4 mb-12">
              {[6, 12, 18, 24].map(m => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={cn(
                    "p-6 rounded-2xl border transition-all text-left",
                    months === m 
                      ? "border-gold bg-gold/5" 
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                >
                  <Calendar className={cn("w-6 h-6 mb-2", months === m ? "text-gold" : "text-gray-500")} />
                  <div className="font-semibold">{m} Months</div>
                  <div className="text-xs text-gray-500">Recommended for {m === 12 ? 'most people' : 'completeness'}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-12 left-0 right-0 px-6 max-w-2xl mx-auto">
        <button
          onClick={handleNext}
          disabled={loading || (step === 2 && !selfie)}
          className={cn(
            "w-full bg-white text-black py-4 rounded-full font-medium flex items-center justify-center gap-2 group transition-all",
            (loading || (step === 2 && !selfie)) ? "opacity-50 cursor-not-allowed" : "hover:bg-gold hover:text-white"
          )}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
          ) : (
            <>
              {step === 3 ? (loading ? 'Initializing Protocol...' : "Begin Harvest") : "Continue"}
              {!loading && <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
