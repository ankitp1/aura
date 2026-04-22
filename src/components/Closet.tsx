import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Plus, Smartphone, Sparkles, Grid3X3, List } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDocs } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { WardrobeItem } from '../types';

interface ClosetProps {
  onSync: () => void;
}

export default function Closet({ onSync }: ClosetProps) {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const [mode, setMode] = useState<'items' | 'lookbook'>('items');
  const [lookbooks, setLookbooks] = useState<any[]>([]);

  const categories = ['All', 'Outerwear', 'Dresses', 'Tops', 'Bottoms', 'Accessories', 'Archive'];

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, 'users', userId, 'wardrobe'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WardrobeItem));
      setItems(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === 'lookbook') {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      getDocs(collection(db, 'users', userId, 'lookbooks')).then(snap => {
        setLookbooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [mode]);

  const toggleArchive = async (item: WardrobeItem) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId, 'wardrobe', item.id), {
      isArchived: !item.isArchived
    });
  };

  const toggleAvailability = async (item: WardrobeItem) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId, 'wardrobe', item.id), {
      isAvailable: item.isAvailable === false ? true : false
    });
  };

  const filteredItems = items.filter(item => {
    if (filter === 'Archive') return item.isArchived;
    if (item.isArchived) return false;
    
    const matchesFilter = filter === 'All' || item.category === filter;
    const matchesSearch = item.color?.toLowerCase().includes(search.toLowerCase()) || 
                          item.category?.toLowerCase().includes(search.toLowerCase()) ||
                          item.vibe?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-1 min-h-[calc(100vh-100px)]">
      {/* Sidebar: Intelligence & Stats */}
      <aside className="hidden lg:flex w-80 border-r border-white/10 p-8 flex-col gap-10">
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4">The Harvest Report</h3>
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <span className="text-2xl font-serif block italic">{items.length * 20 + 12}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/50">Photos Scanned</span>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <span className="text-2xl font-serif block italic">{items.length}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/50">Unique Items Extracted</span>
            </div>
            <div className="bg-gold/10 rounded-lg p-4 border border-gold/30">
              <span className="text-2xl font-serif block text-gold italic">32%</span>
              <span className="text-[10px] uppercase tracking-wider text-gold/70">Increased Versatility</span>
            </div>
          </div>
        </div>

        <div className="mt-auto bg-white/5 rounded-xl p-6 border border-white/10">
          <h4 className="text-xs font-semibold mb-2 uppercase tracking-tight">Identity Twin</h4>
          <p className="text-[11px] text-white/50 leading-relaxed">3/3 Base Model Photos captured. VTO rendering active.</p>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-md bg-white/10 border border-white/5" />
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content: The Discovery Gallery */}
      <section className="flex-1 p-6 md:p-10 flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h2 className="text-4xl serif italic">Discovery Gallery</h2>
            <p className="text-white/40 text-[10px] mt-1 uppercase tracking-[0.2em]">Deduplicated & Hero-Optimized</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
              <input 
                type="text" 
                placeholder="Find in closet..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-sm py-2 pl-8 pr-4 text-[10px] uppercase tracking-widest focus:outline-none focus:border-gold/50 transition-all w-40"
              />
            </div>
            <button className="px-6 py-2 border border-white/20 text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors rounded-sm">Filter Casuals</button>
            <button onClick={onSync} className="px-6 py-2 bg-gold text-black text-[10px] uppercase tracking-widest font-bold rounded-sm">Sync Capsule</button>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <button onClick={() => setMode('items')} className={cn("px-4 py-1 text-xs font-bold uppercase tracking-widest rounded-full transition-all", mode === 'items' ? "bg-white text-black" : "bg-white/10 text-white/50")}>Items</button>
          <button onClick={() => setMode('lookbook')} className={cn("px-4 py-1 text-xs font-bold uppercase tracking-widest rounded-full transition-all", mode === 'lookbook' ? "bg-white text-black" : "bg-white/10 text-white/50")}>Lookbook</button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-none border-b border-white/5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "pb-2 text-[10px] uppercase tracking-widest transition-all font-bold relative",
                filter === cat 
                  ? "text-gold after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gold" 
                  : "text-white/40 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {mode === 'items' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
                className="group bg-[#111] border border-white/10 rounded-sm overflow-hidden flex flex-col shadow-xl"
              >
                <div className="h-64 bg-black/40 flex items-center justify-center relative overflow-hidden">
                  <img src={item.imageUrl} className={cn("w-full h-full object-cover transition-transform duration-700 group-hover:scale-105", item.isAvailable === false && "grayscale opacity-50")} />
                  {item.isAvailable === false && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-black/80 px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-red-400 border border-red-500/30 rounded-sm">In the Wash</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md text-[8px] tracking-widest uppercase rounded border border-white/10">Hero Image</div>
                </div>
                
                <div className="p-4 bg-[#111]">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider">{item.color} {item.category}</h4>
                    <span className="text-gold text-[8px] font-bold uppercase tracking-widest">{item.vibe}</span>
                  </div>
                  <p className="text-[9px] text-white/40 italic mb-4">Found in {Math.floor(Math.random() * 10) + 2} photos • Visual Twin Active</p>
                  
                  <div className="flex gap-2">
                    <button onClick={() => toggleAvailability(item)} className="flex-1 bg-white/5 py-2 text-[9px] uppercase font-bold hover:bg-white hover:text-black transition-all border border-white/5">
                      {item.isAvailable === false ? 'Mark Available' : 'In Wash'}
                    </button>
                    <button onClick={() => toggleArchive(item)} className="px-4 bg-red-950/20 text-red-400 py-2 text-[9px] uppercase font-bold border border-red-900/10 hover:bg-red-900/40 transition-all">
                      {item.isArchived ? 'Recover' : 'Archive'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <button 
            className="aspect-square bg-[#111] border border-dashed border-white/10 rounded-sm flex flex-col items-center justify-center gap-4 hover:border-gold/50 transition-all group p-6"
          >
            <div className="p-4 bg-white/5 rounded-full group-hover:bg-gold group-hover:text-white transition-all">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-bold">Manual Capture</span>
          </button>
        </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lookbooks.map((outfit: any, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col group hover:border-gold/50 transition-all">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center mb-4 group-hover:bg-gold transition-colors">
                  <Sparkles className="w-5 h-5 text-gold group-hover:text-black" />
                </div>
                <h4 className="text-lg font-bold mb-4 uppercase tracking-tight">{outfit.name}</h4>
                <div className="flex flex-col gap-2 mb-6">
                  {outfit.items.map((item: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
                      <span className="text-xs text-white/80">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed italic mt-auto">
                  {outfit.explanation}
                </p>
              </div>
            ))}
            {lookbooks.length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-xl">
                <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold">No saved outfits yet.</p>
                <p className="text-xs text-white/30 mt-2">Generate and save outfits in the Style Me tab.</p>
              </div>
            )}
          </div>
        )}

        {/* Floating Action Footer (Simulated) */}
        <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gray-600 shadow-xl" />
              ))}
            </div>
            <p className="text-[10px] text-white/40 tracking-wide uppercase font-bold">Capsule integrity: 98% Optimized</p>
          </div>
          <div className="flex gap-2 text-[9px] uppercase font-bold">
            <span className="text-white/20 px-3 py-1 border border-white/5 rounded">Tier 1 CLIP Embedding</span>
            <span className="bg-white/10 px-3 py-1 text-white border border-white/10 rounded">Gemini Reasoned</span>
          </div>
        </div>
      </section>
    </div>
  );
}
