import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ShieldCheck, Library, ChevronRight, History } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface LandingProps {
  onStart: () => void;
}

export default function Landing({ onStart }: LandingProps) {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/photoslibrary.readonly');
    
    try {
      const result = await signInWithPopup(auth, provider);
      // Get Google Access Token for Photos API
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_photos_token', credential.accessToken);
      }
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.05)_0%,transparent_50%)]"
        />
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 px-6 text-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <span className="text-gold uppercase tracking-[0.6em] text-[10px] font-bold mb-4 block">Capturing Your Style Essence</span>
          <h1 className="text-7xl md:text-9xl serif mb-6 tracking-tighter italic">Aura</h1>
          <p className="max-w-md text-white/40 text-sm font-light leading-relaxed mb-12 uppercase tracking-[0.2em] mx-auto">
            The intangible vibe of your wardrobe, distilled from your history.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="w-full max-w-sm space-y-4"
        >
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white text-black py-4 rounded-sm font-bold text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-2 group transition-all hover:bg-gold hover:text-white"
          >
            Connect Identity
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] flex items-center justify-center gap-2 font-bold">
            <ShieldCheck className="w-3 h-3" /> Secure Harvest Protocol
          </p>
        </motion.div>
      </div>

      {/* Features Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-12 bg-black/40 backdrop-blur-xl border-t border-white/5 z-10">
        <FeatureItem 
          icon={<Library className="text-gold" />}
          title="Zero Entry"
          desc="Library-first digitization extracts your unique items automatically."
        />
        <FeatureItem 
          icon={<Sparkles className="text-gold" />}
          title="AI Stylist"
          desc="Gemini-powered insights on versatility and outfit pairing."
        />
        <FeatureItem 
          icon={<History className="text-gold" />}
          title="Archive Sync"
          desc="Your wardrobe stays permanent, even if source photos are deleted."
        />
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
      <div className="p-3 bg-white/5 rounded-2xl mb-2">{icon}</div>
      <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
      <p className="text-gray-500 text-sm font-light">{desc}</p>
    </div>
  );
}
