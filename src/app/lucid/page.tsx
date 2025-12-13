'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StarfieldScene from '@/components/lucid-interface/StarfieldScene';
import HUDOverlay from '@/components/lucid-interface/HUDOverlay';
import SentientCursor from '@/components/lucid-interface/SentientCursor';
import { useSmoothScroll } from '@/hooks/use-smooth-scroll';

export default function LucidLandingPage() {
  const router = useRouter();
  const scrollProgress = useSmoothScroll();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEnter = () => {
    // Navigate to main app
    router.push('/');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-cyan-400 font-mono text-sm animate-pulse">
          LOADING DREAMSCAPE...
        </div>
      </div>
    );
  }

  return (
    <main className="relative bg-[#050505] text-[#E0E0E0] overflow-x-hidden">
      {/* Custom cursor */}
      <SentientCursor />

      {/* 3D Background scene */}
      <StarfieldScene scrollProgress={scrollProgress} />

      {/* HUD Overlay */}
      <HUDOverlay onEnter={handleEnter} />

      {/* Scrollable content area (creates scroll height) */}
      <div className="relative z-0 pointer-events-none">
        {/* Hero section */}
        <div className="h-screen" />

        {/* Additional depth sections */}
        <section className="h-screen flex items-center justify-center">
          <div className="text-center pointer-events-auto max-w-2xl px-6">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">
              Navigate Your Dreams
            </h2>
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
              Journey through the layers of your subconscious.
              DREAMONEIR uses advanced AI to decode the symbolic language of your dreams,
              revealing patterns and insights hidden in the depths of your mind.
            </p>
          </div>
        </section>

        <section className="h-screen flex items-center justify-center">
          <div className="text-center pointer-events-auto max-w-2xl px-6">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Multi-Perspective Analysis
            </h2>
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
              Experience dream interpretation from Jungian, Freudian, and Cognitive perspectives.
              Each layer reveals new dimensions of meaning, creating a comprehensive understanding
              of your inner world.
            </p>
          </div>
        </section>

        <section className="h-screen flex items-center justify-center">
          <div className="text-center pointer-events-auto max-w-2xl px-6">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-400 to-cyan-500 bg-clip-text text-transparent">
              Track Your Journey
            </h2>
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-8">
              Monitor patterns across your dreams, correlate with life events and moods,
              and watch your self-understanding deepen with each entry.
            </p>

            <button
              onClick={handleEnter}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500
                       text-white font-mono tracking-wider transition-all duration-300
                       shadow-[0_0_30px_rgba(0,240,255,0.3)] hover:shadow-[0_0_50px_rgba(0,240,255,0.5)]
                       border border-cyan-400/50 hover:border-cyan-300"
            >
              BEGIN YOUR JOURNEY
            </button>
          </div>
        </section>

        {/* Final section with extra space */}
        <div className="h-screen" />
      </div>

      {/* Depth indicator */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="flex flex-col items-center gap-2">
          <div className="font-mono text-xs text-cyan-400/60 writing-mode-vertical rotate-180 tracking-[0.3em]">
            DEPTH
          </div>
          <div className="h-32 w-px bg-gradient-to-b from-cyan-400/20 via-cyan-400/60 to-purple-600/20 relative">
            <div
              className="absolute w-2 h-2 bg-cyan-400 rounded-full -left-[3px] shadow-[0_0_10px_rgba(0,240,255,0.8)]"
              style={{
                top: `${scrollProgress * 100}%`,
                transition: 'top 0.1s ease-out',
              }}
            />
          </div>
          <div className="font-mono text-xs text-cyan-400/60">
            {Math.floor(scrollProgress * 100)}%
          </div>
        </div>
      </div>
    </main>
  );
}
