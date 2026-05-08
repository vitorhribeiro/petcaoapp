import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const CURVES = [
  "M -100 100 Q 250 50 500 200 T 1100 150 T 1600 250",
  "M -100 350 Q 400 550 800 350 T 1400 450 T 1900 350",
  "M -100 650 Q 250 450 600 650 T 1100 550 T 1700 750",
  "M -100 850 Q 500 1050 950 800 T 1500 950 T 2100 800",
  "M -100 250 C 200 100 450 500 750 250 S 1150 0 1500 250",
  "M -100 550 C 300 850 650 350 950 600 S 1350 850 1700 600",
  "M 1600 100 Q 1300 300 1000 100 T 400 200 T -200 100", // Reverse directions
  "M 1600 700 Q 1200 500 800 700 T 200 600 T -300 800"
];

export function CyberBackground({ className }: { className?: string }) {
  return (
    <div className={cn("fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-background", className)}>
      <svg 
        className="absolute inset-0 w-full h-full opacity-[0.2] dark:opacity-[0.4]" 
        viewBox="0 0 1440 900" 
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        
        {CURVES.map((path, i) => (
          <motion.path
            key={i}
            d={path}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth={i % 2 === 0 ? "1.5" : "1"}
            strokeLinecap="round"
            style={{ color: 'var(--primary)' }}
            initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0.1, 0.2, 0.1], // Moving segment
              pathOffset: [0, 1.1],        // Travel the whole path
              opacity: [0, 0.6, 0.6, 0]     // Fade in/out
            }}
            transition={{
              duration: 10 + i * 4,
              repeat: Infinity,
              ease: "linear",
              delay: i * 2,
            }}
          />
        ))}
      </svg>

      {/* Subtle Glow Overlays for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary),0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(var(--primary),0.04),transparent_40%)]" />
    </div>
  );
}
