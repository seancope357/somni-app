'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface DecodingTextProps {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
}

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';

export default function DecodingText({
  text,
  className = '',
  delay = 0,
  speed = 50,
}: DecodingTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);

  useEffect(() => {
    // Delay the start of decoding
    const delayTimer = setTimeout(() => {
      setIsDecoding(true);
    }, delay);

    return () => clearTimeout(delayTimer);
  }, [delay]);

  useEffect(() => {
    if (!isDecoding) return;

    let currentIndex = 0;
    let iterations = 0;
    const maxIterations = 8; // How many random characters to show per letter

    const interval = setInterval(() => {
      setDisplayText((prev) => {
        return text
          .split('')
          .map((char, index) => {
            // If we've already decoded this character
            if (index < currentIndex) {
              return text[index];
            }

            // Currently decoding this character
            if (index === currentIndex) {
              // Show random characters for a few iterations
              if (iterations < maxIterations) {
                // Preserve spaces
                if (char === ' ') return ' ';
                return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
              } else {
                // Lock in the correct character
                return char;
              }
            }

            // Future characters - show random
            if (char === ' ') return ' ';
            return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          })
          .join('');
      });

      iterations++;

      // Move to next character
      if (iterations > maxIterations) {
        currentIndex++;
        iterations = 0;
      }

      // Stop when all characters are decoded
      if (currentIndex >= text.length) {
        clearInterval(interval);
        setDisplayText(text);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isDecoding, text, speed]);

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {displayText}
    </motion.div>
  );
}

// Variant for continuous glitch effect
export function GlitchText({
  text,
  className = '',
  intensity = 0.1,
}: {
  text: string;
  className?: string;
  intensity?: number;
}) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((char) => {
            // Randomly glitch characters based on intensity
            if (Math.random() < intensity && char !== ' ') {
              return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
            }
            return char;
          })
          .join('')
      );
    }, 100);

    return () => clearInterval(interval);
  }, [text, intensity]);

  return <div className={className}>{displayText}</div>;
}
