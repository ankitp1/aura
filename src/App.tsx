import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Smartphone, 
  ShieldCheck, 
  Sparkles, 
  History, 
  Plus, 
  Trash2, 
  Check, 
  X,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Shirt,
  Library,
  ScanSearch
} from 'lucide-react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { cn } from './lib/utils';
import { UserData, WardrobeItem } from './types';

// Components
import Landing from './components/Landing';
import Onboarding from './components/Onboarding';
import HarvestReveal from './components/HarvestReveal';
import Closet from './components/Closet';
import Evaluator from './components/Evaluator';
import Inspire from './components/Inspire';
import Navbar from './components/Navbar';
import PitchDeck from './components/PitchDeck';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'landing' | 'pitch_public' | 'pitch' | 'onboarding' | 'harvest' | 'harvest_sync' | 'closet' | 'evaluator' | 'inspire'>(() => {
    return localStorage.getItem('hasSeenPublicPitch') === 'true' ? 'landing' : 'pitch_public';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data() as UserData;
            setUserData(data);
            if (!data.seenPitch) {
              setView('pitch');
            } else if (data.onboardingComplete) {
              setView('closet');
            } else {
              setView('onboarding');
            }
          } else {
            // New User
            const hasSeenLocal = localStorage.getItem('hasSeenPublicPitch') === 'true';
            const newData: UserData = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              onboardingComplete: false,
              seenPitch: hasSeenLocal,
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, newData);
            setUserData(newData);
            setView(hasSeenLocal ? 'onboarding' : 'pitch');
          }
        } catch (error) {
          console.error("Firestore user sync error:", error);
          alert("Failed to sync user data: " + (error as Error).message);
        }
      } else {
        setView(localStorage.getItem('hasSeenPublicPitch') === 'true' ? 'landing' : 'pitch_public');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = () => signOut(auth);

  const handlePitchClose = () => {
    setView(userData?.onboardingComplete ? 'closet' : 'onboarding');
    if (user) {
      updateDoc(doc(db, 'users', user.uid), { seenPitch: true })
        .catch(err => console.error("Failed to update seenPitch", err));
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white text-3xl serif tracking-[0.2em]"
        >
          AURA
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden selection:bg-gold/30">
      <AnimatePresence mode="wait">
        {view === 'pitch_public' && (
          <PitchDeck onClose={() => {
            localStorage.setItem('hasSeenPublicPitch', 'true');
            setView('landing');
          }} />
        )}
        {view === 'landing' && <Landing onStart={() => {}} />}
        
        {user && view !== 'landing' && view !== 'pitch_public' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen flex flex-col"
          >
            <Navbar 
              user={user} 
              activeView={view} 
              onViewChange={setView} 
              onSignOut={handleSignOut} 
            />
            
            <main className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {view === 'pitch' && <PitchDeck onClose={handlePitchClose} />}
                {view === 'onboarding' && <div className="max-w-2xl mx-auto px-4"><Onboarding userData={userData as UserData} onComplete={() => setView('harvest')} /></div>}
                {view === 'harvest' && <HarvestReveal onComplete={() => setView('closet')} />}
                {view === 'harvest_sync' && <HarvestReveal defaultMonths={1} onComplete={() => setView('closet')} />}
                {view === 'closet' && <Closet onSync={() => setView('harvest_sync')} />}
                {view === 'evaluator' && <div className="max-w-2xl mx-auto px-4"><Evaluator /></div>}
                {view === 'inspire' && <Inspire />}
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
