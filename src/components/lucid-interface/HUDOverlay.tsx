'use client';

import { motion } from 'framer-motion';
import DecodingText, { GlitchText } from './DecodingText';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HUDOverlayProps {
  onEnter?: () => void;
}

export default function HUDOverlay({ onEnter }: HUDOverlayProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Top-left coordinates */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="absolute top-6 left-6 font-mono text-xs text-cyan-400/80 tracking-wider"
      >
        <div>SYS.STATUS: <span className="text-green-400">ONLINE</span></div>
        <div className="mt-1">
          VER: <GlitchText text="2.0.DREAMONEIR" intensity={0.05} className="inline" />
        </div>
      </motion.div>

      {/* Top-right system info */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="absolute top-6 right-6 font-mono text-xs text-indigo-400/80 tracking-wider text-right"
      >
        <div>NEURAL.LINK: <span className="text-green-400">ACTIVE</span></div>
        <div className="mt-1">CONSCIOUSNESS.DEPTH: <span className="text-cyan-300">∞</span></div>
      </motion.div>

      {/* Bottom-left tech readout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="absolute bottom-6 left-6 font-mono text-xs text-purple-400/60 tracking-wider"
      >
        <div>LAT: 0x7F.DREAMSCAPE</div>
        <div className="mt-1">LONG: 0xFF.SUBCONSCIOUS</div>
      </motion.div>

      {/* Bottom-right signature */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="absolute bottom-6 right-6 font-mono text-xs text-cyan-400/40 tracking-wider"
      >
        EST. 2024 // DREAMONEIR.SYSTEMS
      </motion.div>

      {/* Center hero content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-4xl px-6"
        >
          {/* Initializing text */}
          <DecodingText
            text="INITIALIZING DREAM SEQUENCE..."
            className="text-sm md:text-base font-mono text-cyan-400/80 tracking-[0.3em] mb-8 md:mb-12"
            delay={100}
            speed={40}
          />

          {/* Main logo */}
          <motion.h1
            className="relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            <DecodingText
              text="DREAMONEIR"
              className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-6 md:mb-8"
              delay={1500}
              speed={60}
            />

            {/* Glow effect */}
            <div className="absolute inset-0 text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight blur-2xl opacity-50 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent -z-10">
              DREAMONEIR
            </div>
          </motion.h1>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.8 }}
            className="text-base md:text-xl text-gray-400 mb-12 md:mb-16 font-light tracking-wide"
          >
            Navigate the depths of your subconscious
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3, duration: 0.8 }}
          >
            <button
              onClick={onEnter}
              className="group relative px-8 md:px-12 py-4 md:py-5 font-mono text-sm md:text-base tracking-wider overflow-hidden"
            >
              {/* Glassmorphic background */}
              <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-none border border-cyan-400/30 transition-all duration-300 group-hover:bg-white/10 group-hover:border-cyan-400/60" />

              {/* Glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/20 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

              {/* Chromatic aberration effect on hover */}
              <motion.div
                className="absolute inset-0 border border-red-500/0 rounded-none group-hover:border-red-500/30 transition-all duration-300"
                animate={{
                  x: [0, -1, 1, 0],
                  y: [0, 1, -1, 0],
                }}
                transition={{
                  duration: 0.3,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              />

              {/* Button text */}
              <span className="relative flex items-center gap-3 text-cyan-300 group-hover:text-white transition-colors duration-300">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                ENTER THE DREAMSCAPE
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ delay: 4, duration: 2, repeat: Infinity }}
            className="mt-16 md:mt-24 font-mono text-xs text-cyan-400/60 tracking-[0.3em]"
          >
            SCROLL TO DESCEND
          </motion.div>
        </motion.div>
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent animate-[scan_8s_linear_infinite] opacity-20" />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-transparent to-black/50" />
    </div>
  );
}
