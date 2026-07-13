"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface Flake {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

const COLORS = ['#4f46e5', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function Confetti({ active }: { active: boolean }) {
  const [flakes, setFlakes] = useState<Flake[]>([]);

  useEffect(() => {
    if (!active) {
      setFlakes([]);
      return;
    }

    const items: Flake[] = Array.from({ length: 80 }).map((_, id) => ({
      id,
      x: Math.random() * 100, // percentage
      y: -10 - Math.random() * 20, // initial height offset
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 6,
      rotation: Math.random() * 360,
      delay: Math.random() * 1.5
    }));
    setFlakes(items);
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {flakes.map((flake) => (
        <motion.div
          key={flake.id}
          initial={{
            x: `${flake.x}vw`,
            y: `${flake.y}vh`,
            rotate: flake.rotation,
            opacity: 1
          }}
          animate={{
            y: '110vh',
            rotate: flake.rotation + 720,
            x: `${flake.x + (Math.random() * 20 - 10)}vw`,
            opacity: 0.2
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            delay: flake.delay,
            ease: 'linear'
          }}
          className="absolute rounded-sm"
          style={{
            width: flake.size,
            height: flake.size,
            backgroundColor: flake.color,
          }}
        />
      ))}
    </div>
  );
}
