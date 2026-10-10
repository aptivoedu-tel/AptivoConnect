'use client';

import { motion } from 'framer-motion';
import {
  Atom,
  FlaskConical,
  Microscope,
  Dna,
  Globe,
  BookText,
  Code,
  Binary,
  Telescope,
  Calculator
} from 'lucide-react';

export default function FloatingIcons() {
  return (
    <div className="absolute inset-0 max-w-[100rem] mx-auto px-4 pointer-events-none">
      {/* Top Left Cluster */}
      <motion.div animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-32 left-[5%] lg:left-[2%] opacity-20">
        <FlaskConical className="w-12 h-12 text-teal-600" />
      </motion.div>
      <motion.div animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="absolute top-[40%] left-[8%] lg:left-[4%] opacity-15">
        <Dna className="w-16 h-16 text-emerald-500" />
      </motion.div>
      
      {/* Bottom Left Cluster */}
      <motion.div animate={{ y: [0, -20, 0], x: [0, 10, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="absolute bottom-20 left-[15%] lg:left-[10%] opacity-15">
        <Code className="w-14 h-14 text-slate-400" />
      </motion.div>
      <motion.div animate={{ y: [0, 15, 0], rotate: [0, 15, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }} className="absolute bottom-40 left-[2%] opacity-[0.08]">
        <Binary className="w-24 h-24 text-teal-700" />
      </motion.div>

      {/* Center-ish / Behind Text */}
      <motion.div animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }} className="absolute bottom-32 left-[40%] lg:left-[45%] opacity-15">
        <Calculator className="w-16 h-16 text-teal-600" />
      </motion.div>
      <motion.div animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }} transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }} className="absolute top-48 left-[45%] lg:left-[50%] opacity-10">
        <BookText className="w-20 h-20 text-emerald-400" />
      </motion.div>

      {/* Top Right Cluster */}
      <motion.div animate={{ y: [0, -20, 0], rotate: [0, 180] }} transition={{ y: { duration: 5, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 25, repeat: Infinity, ease: 'linear' } }} className="absolute top-40 right-[10%] lg:right-[5%] opacity-20">
        <Atom className="w-20 h-20 text-emerald-500" />
      </motion.div>
      <motion.div animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }} transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }} className="absolute top-20 right-[25%] lg:right-[30%] opacity-[0.08]">
        <Globe className="w-32 h-32 text-teal-600" />
      </motion.div>

      {/* Bottom Right Cluster */}
      <motion.div animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }} className="absolute bottom-20 right-[35%] lg:right-[40%] opacity-15">
        <Microscope className="w-14 h-14 text-emerald-600" />
      </motion.div>
      <motion.div animate={{ y: [0, -25, 0], rotate: [0, 10, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }} className="absolute bottom-32 right-[5%] lg:right-[2%] opacity-10">
        <Telescope className="w-20 h-20 text-teal-500" />
      </motion.div>
    </div>
  );
}
