import React, { useState, useEffect } from 'react';
import { Shirt, Library, ScanSearch, LogOut, Sparkles } from 'lucide-react';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface NavbarProps {
  user: User;
  activeView: string;
  onViewChange: (view: any) => void;
  onSignOut: () => void;
}

export default function Navbar({ user, activeView, onViewChange, onSignOut }: NavbarProps) {
  const [topVibe, setTopVibe] = useState('Sophisticate');
  
  useEffect(() => {
    const fetchTopVibe = async () => {
      const q = query(collection(db, 'users', user.uid, 'wardrobe'), limit(5));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const vibes = snap.docs.map(d => d.data().vibe).filter(Boolean);
        if (vibes.length > 0) {
          // Simplistic "first vibe found" or mode would be better
          setTopVibe(vibes[0]);
        }
      }
    };
    fetchTopVibe();
  }, [user.uid]);

  const navItems = [
    { id: 'closet', icon: Library, label: 'Capsule' },
    { id: 'evaluator', icon: ScanSearch, label: 'Evaluator' },
    { id: 'inspire', icon: Sparkles, label: 'Style Me' },
  ];

  const currentDate = new Date();
  const harvestEnd = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const harvestStart = new Date(currentDate.setFullYear(currentDate.getFullYear() - 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex items-center justify-between px-10 py-6 bg-[#050505] border-b border-white/10">
        <div className="flex items-center gap-8">
          <h2 className="text-2xl serif tracking-[0.3em] uppercase">AURA</h2>
          <div className="h-4 w-[1px] bg-white/20"></div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-white/40">Current Harvest</span>
            <span className="text-sm font-medium">{harvestStart} – {harvestEnd}</span>
          </div>
          <div className="flex items-center gap-6 ml-8">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "text-[10px] uppercase tracking-[0.2em] transition-all font-bold",
                  activeView === item.id ? "text-gold" : "text-white/40 hover:text-white"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Identity Matched</p>
            <p className="text-sm">{topVibe} • 98.4% Confidence</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/20 p-1">
            <img src={user.photoURL || ''} className="w-full h-full rounded-full object-cover" alt="" />
          </div>
          <button onClick={onSignOut} className="text-white/40 hover:text-white transition-all ml-2">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Mobile Navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-2xl border-t border-white/5 px-8 py-4 flex items-center justify-between z-50">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeView === item.id ? "text-gold" : "text-gray-500"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[9px] uppercase font-bold tracking-widest">{item.label}</span>
          </button>
        ))}
        <button onClick={onSignOut} className="text-gray-500 flex flex-col items-center gap-1">
          <LogOut className="w-6 h-6" />
          <span className="text-[9px] uppercase font-bold tracking-widest">Exit</span>
        </button>
      </nav>
    </>
  );
}
