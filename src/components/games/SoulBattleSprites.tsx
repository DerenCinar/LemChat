import React from 'react';
import { motion } from 'framer-motion';
import type { BossId } from './soulBattleData';

interface BossSpriteProps {
  bossId: BossId;
  hurt?: boolean;
  dodging?: boolean;
  activeAttack?: boolean;
  spareable?: boolean;
  tired?: boolean;
  glintColor?: 'cyan' | 'orange' | null;
}

const SansPortrait: React.FC<{ activeAttack?: boolean; tired?: boolean }> = ({
  activeAttack,
  tired,
}) => (
  <svg viewBox="0 0 120 110" className="h-28 w-32 sm:h-32 sm:w-36" aria-hidden="true">
    {/* Legs / Shorts / Pink Slippers */}
    <g>
      <rect x="40" y="79" width="38" height="14" rx="2" fill="#0F172A" stroke="#F8FAFC" strokeWidth="2.2" />
      <line x1="59" y1="80" x2="59" y2="93" stroke="#F8FAFC" strokeWidth="2" />
      <rect x="44" y="93" width="10" height="7" fill="#F8FAFC" />
      <rect x="64" y="93" width="10" height="7" fill="#F8FAFC" />
      <rect x="41" y="99" width="15" height="6" rx="2" fill="#F472B6" stroke="#F8FAFC" strokeWidth="1.5" />
      <rect x="62" y="99" width="15" height="6" rx="2" fill="#F472B6" stroke="#F8FAFC" strokeWidth="1.5" />
    </g>

    {/* Torso / Blue Hoodie with Pockets & Fur Collar */}
    <motion.g
      animate={{ y: activeAttack ? [0, -1.5, 0] : [0, -1, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Fur hood behind neck */}
      <ellipse cx="59" cy="48" rx="26" ry="9" fill="#CBD5E1" stroke="#F8FAFC" strokeWidth="2" />
      {/* Hoodie main */}
      <path
        d="M32 49 C28 56, 29 74, 34 80 L84 80 C89 74, 90 56, 86 49 Z"
        fill="#2563EB"
        stroke="#F8FAFC"
        strokeWidth="2.2"
      />
      {/* White turtleneck shirt center */}
      <path d="M51 48 L67 48 L64 78 L54 78 Z" fill="#F8FAFC" />
      <line x1="59" y1="50" x2="59" y2="78" stroke="#090D16" strokeWidth="1.6" />
      {/* Pocket outlines (hands tucked in pockets) */}
      <path d="M35 61 L47 64 L45 77 L34 75 Z" fill="#1D4ED8" stroke="#0F172A" strokeWidth="1.5" />
      <path d="M83 61 L71 64 L73 77 L84 75 Z" fill="#1D4ED8" stroke="#0F172A" strokeWidth="1.5" />
    </motion.g>

    {/* Floating Breathing Skull Head */}
    <motion.g
      animate={{ y: activeAttack ? [0, -2.5, 0] : [0, -2, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path
        d="M35 28 C35 12, 83 12, 83 28 C86 35, 84 44, 76 47 C71 52, 47 52, 42 47 C34 44, 32 35, 35 28 Z"
        fill="#F8FAFC"
        stroke="#090D16"
        strokeWidth="2.2"
      />
      {/* Left socket & Right socket */}
      <ellipse cx="48" cy="30" rx="6.2" ry="5.5" fill="#090D16" />
      <ellipse cx="70" cy="30" rx="6.2" ry="5.5" fill="#090D16" />
      {/* Right eye white pinprick */}
      <circle cx="48" cy="30" r="1.9" fill="#F8FAFC" />
      {/* Left Bad-Time Eye (glowing cyan/yellow when attacking, dim if chilling) */}
      {activeAttack ? (
        <motion.g
          animate={{ scale: [0.95, 1.22, 0.95], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 0.25, repeat: Infinity }}
          style={{ transformOrigin: '70px 30px' }}
        >
          <circle cx="70" cy="30" r="5" fill="#38BDF8" opacity="0.4" />
          <circle cx="70" cy="30" r="3" fill="#38BDF8" />
          <circle cx="70" cy="30" r="1.4" fill="#FACC15" />
        </motion.g>
      ) : (
        <circle cx="70" cy="30" r="1.9" fill="#F8FAFC" />
      )}
      {/* Nasal cavity */}
      <path d="M59 34 L56 39 L62 39 Z" fill="#090D16" />
      {/* Wide toothy grin */}
      <path d="M43 41 Q59 48 75 41 Q73 46 59 47 Q45 46 43 41 Z" fill="#090D16" />
      <line x1="48" y1="42" x2="48" y2="46" stroke="#F8FAFC" strokeWidth="1.2" />
      <line x1="53" y1="43" x2="53" y2="47" stroke="#F8FAFC" strokeWidth="1.2" />
      <line x1="59" y1="43" x2="59" y2="47" stroke="#F8FAFC" strokeWidth="1.2" />
      <line x1="65" y1="43" x2="65" y2="47" stroke="#F8FAFC" strokeWidth="1.2" />
      <line x1="70" y1="42" x2="70" y2="46" stroke="#F8FAFC" strokeWidth="1.2" />
      {/* Exhausted sweat beads */}
      {tired && (
        <motion.g animate={{ y: [0, 2, 0] }} transition={{ duration: 0.9, repeat: Infinity }}>
          <path d="M79 18 Q82 23 79 25 Q76 23 79 18 Z" fill="#38BDF8" />
          <path d="M39 20 Q41 24 39 26 Q37 24 39 20 Z" fill="#38BDF8" />
        </motion.g>
      )}
    </motion.g>
  </svg>
);

const PapyrusPortrait: React.FC<{ activeAttack?: boolean }> = ({ activeAttack }) => (
  <svg viewBox="0 0 120 110" className="h-28 w-32 sm:h-32 sm:w-36" aria-hidden="true">
    {/* Flowing Dramatic Scarf */}
    <motion.path
      d="M36 45 C18 46, 12 60, 18 76 C26 70, 32 76, 40 68 Z"
      fill="#EF4444"
      stroke="#F8FAFC"
      strokeWidth="2"
      animate={{ rotate: activeAttack ? [-4, 6, -4] : [-2, 3, -2] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '40px 50px' }}
    />
    {/* Pelvis & Boots */}
    <rect x="46" y="75" width="26" height="8" rx="3" fill="#2563EB" stroke="#F8FAFC" strokeWidth="1.8" />
    <rect x="48" y="83" width="7" height="12" fill="#090D16" stroke="#F8FAFC" strokeWidth="1.5" />
    <rect x="63" y="83" width="7" height="12" fill="#090D16" stroke="#F8FAFC" strokeWidth="1.5" />
    <path d="M44 92 L58 92 L58 103 L42 103 Z" fill="#EF4444" stroke="#F8FAFC" strokeWidth="1.8" />
    <path d="M60 92 L76 92 L78 103 L60 103 Z" fill="#EF4444" stroke="#F8FAFC" strokeWidth="1.8" />
    {/* Battle Body Torso & Shoulder Pauldrons */}
    <path d="M34 45 L84 45 L74 75 L44 75 Z" fill="#F8FAFC" stroke="#090D16" strokeWidth="2" />
    <circle cx="35" cy="49" r="7" fill="#F8FAFC" stroke="#F97316" strokeWidth="2" />
    <circle cx="83" cy="49" r="7" fill="#F8FAFC" stroke="#F97316" strokeWidth="2" />
    {/* Gold trim emblem */}
    <path d="M46 54 L72 54 L68 65 L50 65 Z" fill="#FACC15" stroke="#090D16" strokeWidth="1.5" />
    {/* Scarf Neck Knot */}
    <path d="M40 42 L78 42 L74 51 L44 51 Z" fill="#EF4444" stroke="#F8FAFC" strokeWidth="1.8" />
    {/* Hands on hips */}
    <path d="M34 54 L26 65 L44 70" fill="none" stroke="#090D16" strokeWidth="4" strokeLinecap="round" />
    <path d="M84 54 L92 65 L74 70" fill="none" stroke="#090D16" strokeWidth="4" strokeLinecap="round" />
    <circle cx="42" cy="70" r="4" fill="#EF4444" stroke="#F8FAFC" strokeWidth="1.5" />
    <circle cx="76" cy="70" r="4" fill="#EF4444" stroke="#F8FAFC" strokeWidth="1.5" />
    {/* Tall Jawbone Skull */}
    <motion.g
      animate={{ y: activeAttack ? [0, -3, 0] : [0, -2, 0] }}
      transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path
        d="M44 13 C44 5, 74 5, 74 13 L74 30 L70 43 L48 43 L44 30 Z"
        fill="#F8FAFC"
        stroke="#090D16"
        strokeWidth="2"
      />
      <ellipse cx="52" cy="21" rx="4.2" ry="5" fill="#090D16" />
      <ellipse cx="66" cy="21" rx="4.2" ry="5" fill="#090D16" />
      <circle cx="52" cy="20" r="1.6" fill="#F8FAFC" />
      <circle cx="66" cy="20" r="1.6" fill="#F8FAFC" />
      <path d="M59 26 L57 31 L61 31 Z" fill="#090D16" />
      <path d="M47 34 Q59 41 71 34" fill="none" stroke="#090D16" strokeWidth="2.5" />
      <line x1="52" y1="34" x2="52" y2="39" stroke="#090D16" strokeWidth="1.2" />
      <line x1="59" y1="35" x2="59" y2="40" stroke="#090D16" strokeWidth="1.2" />
      <line x1="66" y1="34" x2="66" y2="39" stroke="#090D16" strokeWidth="1.2" />
    </motion.g>
  </svg>
);

const UndynePortrait: React.FC<{ activeAttack?: boolean }> = ({ activeAttack }) => (
  <svg viewBox="0 0 120 110" className="h-28 w-32 sm:h-32 sm:w-36" aria-hidden="true">
    {/* Flowing Crimson Ponytail */}
    <motion.path
      d="M46 14 C30 6, 16 14, 14 34 C24 30, 32 34, 42 22 Z"
      fill="#DC2626"
      stroke="#F8FAFC"
      strokeWidth="1.8"
      animate={{ rotate: activeAttack ? [-6, 8, -6] : [-3, 4, -3] }}
      transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '46px 18px' }}
    />
    {/* Armor Legs */}
    <rect x="44" y="80" width="12" height="22" rx="2" fill="#1E293B" stroke="#F8FAFC" strokeWidth="1.8" />
    <rect x="64" y="80" width="12" height="22" rx="2" fill="#1E293B" stroke="#F8FAFC" strokeWidth="1.8" />
    {/* Dark Tank Top & Armor Waist */}
    <path d="M41 44 L79 44 L75 81 L45 81 Z" fill="#0F172A" stroke="#F8FAFC" strokeWidth="2" />
    <path d="M40 44 L52 44 L47 58 L38 56 Z" fill="#475569" stroke="#F8FAFC" strokeWidth="1.6" />
    <path d="M80 44 L68 44 L73 58 L82 56 Z" fill="#475569" stroke="#F8FAFC" strokeWidth="1.6" />
    {/* Head & Fin Ears */}
    <path d="M40 24 L31 19 L34 32 Z" fill="#38BDF8" stroke="#F8FAFC" strokeWidth="1.4" />
    <path d="M80 24 L89 19 L86 32 Z" fill="#38BDF8" stroke="#F8FAFC" strokeWidth="1.4" />
    <ellipse cx="60" cy="28" rx="18" ry="16" fill="#2563EB" stroke="#F8FAFC" strokeWidth="2" />
    {/* Crimson hair tuft */}
    <path d="M44 17 Q60 6 76 17 Q62 14 44 17 Z" fill="#DC2626" />
    {/* Eyepatch & Fierce Glowing Eye */}
    <line x1="42" y1="22" x2="77" y2="28" stroke="#090D16" strokeWidth="2" />
    <circle cx="51" cy="25" r="5" fill="#090D16" />
    <ellipse cx="68" cy="26" rx="5" ry="4" fill="#FACC15" stroke="#090D16" strokeWidth="1.4" />
    <circle cx="68" cy="26" r="1.6" fill="#090D16" />
    {/* Tooth grin */}
    <path d="M51 36 Q60 40 70 35" fill="none" stroke="#F8FAFC" strokeWidth="2" />
    {/* Energy Spear */}
    <motion.g
      animate={{ y: activeAttack ? [-4, 2, -4] : [0, -2, 0] }}
      transition={{ duration: 0.7, repeat: Infinity }}
    >
      <line x1="94" y1="10" x2="94" y2="100" stroke="#22D3EE" strokeWidth="3.5" strokeLinecap="round" />
      <polygon points="94,2 87,16 101,16" fill="#67E8F9" stroke="#F8FAFC" strokeWidth="1.4" />
      {activeAttack && <circle cx="94" cy="12" r="9" fill="#22D3EE" opacity="0.28" />}
    </motion.g>
  </svg>
);

const TorielPortrait: React.FC<{ activeAttack?: boolean }> = ({ activeAttack }) => (
  <svg viewBox="0 0 120 110" className="h-28 w-32 sm:h-32 sm:w-36" aria-hidden="true">
    {/* Floating Fire Orbs when attacking */}
    {activeAttack && (
      <>
        <motion.circle
          cx="20"
          cy="55"
          r="6"
          fill="#FB923C"
          animate={{ y: [-4, 4, -4], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 0.7, repeat: Infinity }}
        />
        <motion.circle
          cx="100"
          cy="55"
          r="6"
          fill="#FB923C"
          animate={{ y: [4, -4, 4], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 0.7, repeat: Infinity }}
        />
      </>
    )}
    {/* Regal Purple Robe */}
    <path d="M35 44 L85 44 L94 102 L26 102 Z" fill="#6D28D9" stroke="#F8FAFC" strokeWidth="2.2" />
    <path d="M47 44 L73 44 L70 102 L50 102 Z" fill="#F8FAFC" stroke="#090D16" strokeWidth="1.4" />
    {/* Golden Delta Rune */}
    <polygon points="60,55 52,67 68,67" fill="#FACC15" />
    <circle cx="60" cy="52" r="3" fill="#FACC15" />
    {/* Floppy Ears */}
    <path d="M41 20 C27 25, 25 46, 36 53 C41 48, 43 34, 44 25 Z" fill="#DDD6FE" stroke="#F8FAFC" strokeWidth="1.8" />
    <path d="M79 20 C93 25, 95 46, 84 53 C79 48, 77 34, 76 25 Z" fill="#DDD6FE" stroke="#F8FAFC" strokeWidth="1.8" />
    {/* Horns & Head */}
    <path d="M47 17 Q44 9 49 8 Q52 12 52 16 Z" fill="#F5F3FF" stroke="#090D16" strokeWidth="1.4" />
    <path d="M73 17 Q76 9 71 8 Q68 12 68 16 Z" fill="#F5F3FF" stroke="#090D16" strokeWidth="1.4" />
    <ellipse cx="60" cy="29" rx="18" ry="16" fill="#F8FAFC" stroke="#090D16" strokeWidth="2" />
    {/* Gentle eyes */}
    <ellipse cx="52" cy="27" rx="3" ry="3.6" fill="#1E1B4B" />
    <ellipse cx="68" cy="27" rx="3" ry="3.6" fill="#1E1B4B" />
    <circle cx="51" cy="26" r="1" fill="#FFFFFF" />
    <circle cx="67" cy="26" r="1" fill="#FFFFFF" />
    <path d="M55 37 Q60 40 65 37" fill="none" stroke="#1E1B4B" strokeWidth="1.8" strokeLinecap="round" />
    {/* Paws */}
    <ellipse cx="32" cy="70" rx="6" ry="5" fill="#F8FAFC" stroke="#090D16" strokeWidth="1.6" />
    <ellipse cx="88" cy="70" rx="6" ry="5" fill="#F8FAFC" stroke="#090D16" strokeWidth="1.6" />
  </svg>
);

const MettatonPortrait: React.FC<{ activeAttack?: boolean }> = ({ activeAttack }) => (
  <svg viewBox="0 0 120 110" className="h-28 w-32 sm:h-32 sm:w-36" aria-hidden="true">
    {/* Stage Spotlight Beams */}
    <motion.polygon
      points="10,0 32,0 62,105 38,105"
      fill="#EC4899"
      opacity="0.16"
      animate={{ opacity: activeAttack ? [0.1, 0.3, 0.1] : [0.08, 0.18, 0.08] }}
      transition={{ duration: 1.1, repeat: Infinity }}
    />
    <motion.polygon
      points="88,0 110,0 82,105 58,105"
      fill="#38BDF8"
      opacity="0.14"
      animate={{ opacity: activeAttack ? [0.1, 0.28, 0.1] : [0.08, 0.16, 0.08] }}
      transition={{ duration: 1.1, repeat: Infinity, delay: 0.4 }}
    />
    {/* Iconic High-Heeled Legs */}
    <line x1="51" y1="68" x2="46" y2="96" stroke="#0F172A" strokeWidth="5" />
    <line x1="69" y1="68" x2="74" y2="96" stroke="#0F172A" strokeWidth="5" />
    <path d="M40 94 L50 94 L50 103 L38 103 Z" fill="#EC4899" stroke="#F8FAFC" strokeWidth="1.6" />
    <path d="M70 94 L80 94 L82 103 L70 103 Z" fill="#EC4899" stroke="#F8FAFC" strokeWidth="1.6" />
    {/* Dramatic Arms */}
    <path d="M40 46 L21 36 L26 22" fill="none" stroke="#F8FAFC" strokeWidth="4" strokeLinecap="round" />
    <path d="M80 46 L97 58 L91 71" fill="none" stroke="#F8FAFC" strokeWidth="4" strokeLinecap="round" />
    {/* Shoulder Pauldrons & Torso Core */}
    <path d="M34 42 L50 48 L47 58 L31 50 Z" fill="#F472B6" stroke="#F8FAFC" strokeWidth="1.6" />
    <path d="M86 42 L70 48 L73 58 L89 50 Z" fill="#F472B6" stroke="#F8FAFC" strokeWidth="1.6" />
    <rect x="45" y="45" width="30" height="24" rx="4" fill="#1E293B" stroke="#F8FAFC" strokeWidth="2" />
    {/* Pulsing Pink Heart Core */}
    <motion.path
      d="M60 63 L53 56 C50 52, 56 48, 60 52 C64 48, 70 52, 67 56 Z"
      fill="#EC4899"
      stroke="#F8FAFC"
      strokeWidth="1.2"
      animate={{ scale: activeAttack ? [1, 1.25, 1] : [1, 1.12, 1] }}
      transition={{ duration: 0.7, repeat: Infinity }}
      style={{ transformOrigin: '60px 57px' }}
    />
    {/* Head & Glamorous Dark Hair */}
    <ellipse cx="60" cy="27" rx="15" ry="15" fill="#F8FAFC" stroke="#090D16" strokeWidth="2" />
    <path d="M43 27 C42 10, 77 10, 76 28 C70 20, 56 26, 48 35 C45 32, 43 29, 43 27 Z" fill="#0F172A" />
    <circle cx="67" cy="27" r="2.2" fill="#0F172A" />
    <path d="M58 34 Q63 36 68 33" fill="none" stroke="#0F172A" strokeWidth="1.8" />
  </svg>
);

const AsgorePortrait: React.FC<{ activeAttack?: boolean; glintColor?: 'cyan' | 'orange' | null }> = ({
  activeAttack,
  glintColor,
}) => (
  <svg viewBox="0 0 120 110" className="h-28 w-32 sm:h-32 sm:w-36" aria-hidden="true">
    {/* Royal Cape */}
    <path d="M24 46 L96 46 L104 103 L16 103 Z" fill="#4C1D95" stroke="#F8FAFC" strokeWidth="2" />
    {/* Armor Chest & Pauldrons */}
    <path d="M36 47 L84 47 L78 92 L42 92 Z" fill="#6D28D9" stroke="#FACC15" strokeWidth="2" />
    <ellipse cx="32" cy="52" rx="10" ry="7" fill="#FACC15" stroke="#F8FAFC" strokeWidth="1.8" />
    <ellipse cx="88" cy="52" rx="10" ry="7" fill="#FACC15" stroke="#F8FAFC" strokeWidth="1.8" />
    {/* Golden Mane & Horns */}
    <path d="M36 18 C25 10, 22 22, 34 28 Z" fill="#FEF3C7" stroke="#090D16" strokeWidth="1.6" />
    <path d="M84 18 C95 10, 98 22, 86 28 Z" fill="#FEF3C7" stroke="#090D16" strokeWidth="1.6" />
    <ellipse cx="60" cy="31" rx="22" ry="18" fill="#F59E0B" stroke="#090D16" strokeWidth="2" />
    <ellipse cx="60" cy="34" rx="15" ry="13" fill="#FEF3C7" />
    {/* Crown */}
    <polygon points="44,16 49,5 55,14 60,4 65,14 71,5 76,16" fill="#FACC15" stroke="#090D16" strokeWidth="1.5" />
    {/* Shadowed Eyes (or Cyan/Orange Eye Glint!) */}
    <rect x="46" y="25" width="28" height="7" rx="2" fill="#1E1B4B" opacity="0.88" />
    {glintColor ? (
      <motion.g animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 0.25, repeat: Infinity }}>
        <circle cx="53" cy="29" r="3" fill={glintColor === 'cyan' ? '#22D3EE' : '#FB923C'} />
        <circle cx="67" cy="29" r="3" fill={glintColor === 'cyan' ? '#22D3EE' : '#FB923C'} />
      </motion.g>
    ) : (
      <>
        <circle cx="53" cy="29" r="1.5" fill="#F8FAFC" opacity="0.65" />
        <circle cx="67" cy="29" r="1.5" fill="#F8FAFC" opacity="0.65" />
      </>
    )}
    {/* Giant Crimson Trident */}
    <motion.g
      animate={{ rotate: activeAttack ? [-4, 4, -4] : 0 }}
      transition={{ duration: 0.9, repeat: Infinity }}
      style={{ transformOrigin: '98px 75px' }}
    >
      <line x1="98" y1="20" x2="98" y2="103" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
      <path d="M88 22 L88 10 M98 22 L98 4 M108 22 L108 10 M88 22 L108 22" stroke="#EF4444" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </motion.g>
  </svg>
);

const MuffetPortrait: React.FC<{ activeAttack?: boolean }> = ({ activeAttack }) => (
  <svg viewBox="0 0 120 110" className="h-28 w-32 sm:h-32 sm:w-36" aria-hidden="true">
    {/* Web Corners */}
    <path d="M4 4 L28 18 M4 18 L24 4 M116 4 L92 18 M116 18 L96 4" stroke="#A855F7" strokeWidth="1.5" opacity="0.6" />
    {/* 6 Spider Arms holding Teacup/Teapot */}
    <path d="M43 52 L24 45 L19 56" fill="none" stroke="#C084FC" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M43 60 L22 62 L27 72" fill="none" stroke="#C084FC" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M77 52 L96 45 L101 56" fill="none" stroke="#C084FC" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M77 60 L98 62 L93 72" fill="none" stroke="#C084FC" strokeWidth="3.5" strokeLinecap="round" />
    {/* Teacup in left hand */}
    <rect x="13" y="54" width="12" height="9" rx="2" fill="#F8FAFC" stroke="#090D16" strokeWidth="1.4" />
    <rect x="95" y="54" width="12" height="9" rx="2" fill="#F8FAFC" stroke="#090D16" strokeWidth="1.4" />
    {/* Puffy Striped Dress */}
    <path d="M44 47 L76 47 L86 84 L34 84 Z" fill="#FB7185" stroke="#F8FAFC" strokeWidth="2" />
    <path d="M48 47 L72 47 L74 62 L46 62 Z" fill="#1E1B4B" />
    {/* Twin Hair Buns + Red Ribbons */}
    <circle cx="38" cy="18" r="8" fill="#0F172A" stroke="#F8FAFC" strokeWidth="1.6" />
    <circle cx="82" cy="18" r="8" fill="#0F172A" stroke="#F8FAFC" strokeWidth="1.6" />
    <polygon points="34,11 42,15 34,19" fill="#EF4444" />
    <polygon points="86,11 78,15 86,19" fill="#EF4444" />
    {/* Lavender Head & 5 Glossy Eyes */}
    <ellipse cx="60" cy="30" rx="17" ry="15" fill="#C084FC" stroke="#090D16" strokeWidth="2" />
    <motion.g
      animate={{ scale: activeAttack ? [1, 1.08, 1] : 1 }}
      transition={{ duration: 0.6, repeat: Infinity }}
      style={{ transformOrigin: '60px 28px' }}
    >
      <circle cx="51" cy="29" r="3" fill="#090D16" />
      <circle cx="69" cy="29" r="3" fill="#090D16" />
      <circle cx="56" cy="22" r="2.2" fill="#090D16" />
      <circle cx="64" cy="22" r="2.2" fill="#090D16" />
      <circle cx="60" cy="25" r="2" fill="#090D16" />
      <circle cx="50.5" cy="28" r="0.9" fill="#FFFFFF" />
      <circle cx="68.5" cy="28" r="0.9" fill="#FFFFFF" />
    </motion.g>
    <path d="M54 37 Q60 41 66 37" fill="none" stroke="#090D16" strokeWidth="1.8" />
    {/* Legs */}
    <rect x="49" y="84" width="6" height="17" fill="#C084FC" stroke="#090D16" strokeWidth="1.4" />
    <rect x="65" y="84" width="6" height="17" fill="#C084FC" stroke="#090D16" strokeWidth="1.4" />
  </svg>
);

export const BossPixelSprite: React.FC<BossSpriteProps> = ({
  bossId,
  hurt,
  dodging,
  activeAttack,
  spareable,
  tired,
  glintColor,
}) => {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={{
        x: dodging ? [-2, -46, 0] : hurt ? [-8, 8, -6, 6, -3, 0] : 0,
        y: spareable ? [0, -2, 0] : [0, -2, 0],
        filter: hurt ? 'brightness(2.4)' : 'brightness(1)',
      }}
      transition={
        dodging
          ? { duration: 0.56, times: [0, 0.38, 1], ease: 'easeOut' }
          : hurt
            ? { duration: 0.34 }
            : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      {bossId === 'sans' ? (
        <SansPortrait activeAttack={activeAttack} tired={tired} />
      ) : bossId === 'papyrus' ? (
        <PapyrusPortrait activeAttack={activeAttack} />
      ) : bossId === 'undyne' ? (
        <UndynePortrait activeAttack={activeAttack} />
      ) : bossId === 'toriel' ? (
        <TorielPortrait activeAttack={activeAttack} />
      ) : bossId === 'mettaton' ? (
        <MettatonPortrait activeAttack={activeAttack} />
      ) : bossId === 'asgore' ? (
        <AsgorePortrait activeAttack={activeAttack} glintColor={glintColor} />
      ) : (
        <MuffetPortrait activeAttack={activeAttack} />
      )}
    </motion.div>
  );
};
