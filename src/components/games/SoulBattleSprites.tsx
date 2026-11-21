import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { BossId } from './soulBattleData';

interface PixelPalette {
  [key: string]: string;
}

const buildSpriteRects = (rows: string[], palette: PixelPalette) => {
  const rects: { x: number; y: number; w: number; h: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const fill = palette[ch];
      if (!fill || ch === '.') {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      rects.push({ x, y, w, h: 1, fill });
      x += w;
    }
  });
  return rects;
};

const SPRITES: Record<BossId, { rows: string[]; palette: PixelPalette }> = {
  sans: {
    palette: {
      W: '#F8FAFC',
      G: '#CBD5E1',
      B: '#090D16',
      J: '#2563EB',
      D: '#1D4ED8',
      E: '#38BDF8',
      P: '#F472B6',
    },
    rows: [
      '......WWWWWW......',
      '....WWWWWWWWWW....',
      '...WWWWWWWWWWWW...',
      '..WWWWWWWWWWWWWW..',
      '..WWBBBBWWBBBBWW..',
      '..WWBBEWWWWBWBWW..',
      '..WWWWWWBBWWWWWW..',
      '...WWWBBBBBBWWW...',
      '....WWBBBBBBWW....',
      '..GGGGWWWWWWGGGG..',
      '.JJJGGWWWWWWGGJJJ.',
      '.JJJJJWWWWWWJJJJJ.',
      '.JJJJJWWGGWWJJJJJ.',
      '.DDDDJWWWWWWJDDDD.',
      '..JJ..BBBBBB..JJ..',
      '......BB..BB......',
      '......WW..WW......',
      '.....PPP..PPP.....',
    ],
  },
  papyrus: {
    palette: {
      W: '#F8FAFC',
      B: '#090D16',
      R: '#EF4444',
      O: '#F97316',
      Y: '#FACC15',
      L: '#1E293B',
    },
    rows: [
      '.....WWWWWWWW.....',
      '....WWWWWWWWWW....',
      '...WWWWWWWWWWWW...',
      '...WWBBBWWBBBWW...',
      '...WWBWBWWBWBWW...',
      '...WWWWWWBWWWWW...',
      '....WWBBBBBBWW....',
      '....WWBWBWBWWW....',
      '..RRRRRRRRRRRR....',
      '.RRRRROOOORRRRR...',
      '.RR.WWWWWWWW.RR...',
      '....WWYYYYWW......',
      '....BBBBBBBB......',
      '.....WW..WW.......',
      '.....WW..WW.......',
      '.....RR..RR.......',
      '....RRRRRRRR......',
      '....RRRR..RR......',
    ],
  },
  undyne: {
    palette: {
      R: '#DC2626',
      B: '#2563EB',
      S: '#38BDF8',
      K: '#090D16',
      Y: '#FACC15',
      W: '#F8FAFC',
      G: '#475569',
      C: '#22D3EE',
    },
    rows: [
      '..RRR.............',
      '.RRRRR..BBBBBB....',
      '..RRR..BBBBBBBB..C',
      '......BBBBBBBBBB.C',
      '.....BKKKBBBBYBB.C',
      '.....BKKKBBBBBWB.S',
      '......BBWWWWWWBB.S',
      '.......BBBBBBBB..S',
      '....GGGGGGGGGG...S',
      '...GGKKKKKKKKGG..S',
      '...G.KKKKKKKK.G..S',
      '..C..KKKKKKKK....S',
      '..C..KKKKKKKK....S',
      '..C..GGGGGGGG....S',
      '.....KK....KK....S',
      '.....KK....KK.....',
      '.....RR....RR.....',
      '....RRR....RRR....',
    ],
  },
  toriel: {
    palette: {
      W: '#F5F3FF',
      S: '#DDD6FE',
      B: '#1E1B4B',
      P: '#7C3AED',
      D: '#5B21B6',
      Y: '#FACC15',
      K: '#090D16',
    },
    rows: [
      '....SS......SS....',
      '...SSSSWWWWSSSS...',
      '...SSWWWWWWWWSS...',
      '..SSWWKKWWKKWWSS..',
      '..SSWWWWWWWWWWSS..',
      '..SSWWWKKKKWWWSS..',
      '...SSWWWWWWWWSS...',
      '....PPPPPPPPPP....',
      '...PPPPWWWWPPPP...',
      '..PPPPWWYYWWPPPP..',
      '..PPPPWWWWWWPPPP..',
      '.PPPPDDDDDDDDPPPP.',
      '.WWW.DDDDDDDD.WWW.',
      '.....DDDDDDDD.....',
      '....DDDDDDDDDD....',
      '....PPPPPPPPPP....',
      '....WW......WW....',
      '..................',
    ],
  },
  mettaton: {
    palette: {
      K: '#0F172A',
      W: '#F8FAFC',
      P: '#EC4899',
      L: '#F472B6',
      G: '#94A3B8',
      D: '#334155',
    },
    rows: [
      '....KKKKKKKKKK....',
      '...KKKKKKKKKKKK...',
      '...KKKKKKKWWKKK...',
      '...KKKKKKWWKKKK...',
      '...KKKKKKWWWWKK...',
      '....KKKWWWWWWKK...',
      '..PPGGGWWWWGGPP...',
      '.PPPGGGGGGGGPPP...',
      '.PP.GGGPPGGG.PP...',
      '....GGPPPPGG......',
      '....GGGGGGGG......',
      '.....KKKKKK.......',
      '.....KK..KK.......',
      '.....KK..KK.......',
      '....PP....PP......',
      '....PP....PP......',
      '...PPP....PPP.....',
      '..................',
    ],
  },
  asgore: {
    palette: {
      Y: '#FACC15',
      W: '#FEF3C7',
      O: '#F59E0B',
      P: '#6D28D9',
      D: '#4C1D95',
      R: '#EF4444',
      K: '#090D16',
    },
    rows: [
      '..WW..YYYYYY..WW..',
      '.WW..YYYYYYYY..WW.',
      '....OOOOOOOOOO....',
      '...OOWWWKKWWWO....',
      '...OOWWWWWWWWO....',
      '..OOOWWWWWWWWOOO..',
      '..OOOOWWWWWWOOR...',
      '.YYYYPPPPPPPPYYR..',
      '.YYPPDDDDDDDDPP.R.',
      '.PP.DDDDDDDDDD..R.',
      '....DDDDDDDDDD..R.',
      '....DDYYYYYYDD..R.',
      '....PPPPPPPPPP..R.',
      '....PPPPPPPPPP..R.',
      '....PP......PP..R.',
      '...KKK......KKK...',
      '..................',
      '..................',
    ],
  },
  muffet: {
    palette: {
      P: '#C084FC',
      L: '#E9D5FF',
      K: '#090D16',
      R: '#FB7185',
      D: '#4C1D95',
      W: '#F8FAFC',
    },
    rows: [
      '..RR..........RR..',
      '.KKKK........KKKK.',
      '.KKKK..PPPP..KKKK.',
      '....PPPPPPPPPP....',
      '...PPKPPKKPPKPP...',
      '...PPPKPPPPKPPP...',
      '....PPPPKKPPPP....',
      '.K...PPPPPPPP...K.',
      '.KK..RRRRRRRR..KK.',
      '..KK.KKKKKKKK.KK..',
      '...K.RRRRRRRR.K...',
      '..KK.DDDDDDDD.KK..',
      '.KK..DDDDDDDD..KK.',
      '.....PP....PP.....',
      '.....PP....PP.....',
      '.....KK....KK.....',
      '..................',
      '..................',
    ],
  },
};

export const BossPixelSprite: React.FC<{
  bossId: BossId;
  hurt?: boolean;
  dodging?: boolean;
  activeAttack?: boolean;
  spareable?: boolean;
}> = ({ bossId, hurt, dodging, activeAttack, spareable }) => {
  const rects = useMemo(() => {
    const def = SPRITES[bossId];
    return buildSpriteRects(def.rows, def.palette);
  }, [bossId]);

  const width = SPRITES[bossId].rows[0].length;
  const height = SPRITES[bossId].rows.length;

  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={{
        x: dodging ? [-2, -38, 0] : hurt ? [-7, 7, -5, 5, -2, 0] : 0,
        y: spareable ? [0, -2, 0] : [0, -3, 0],
        scale: activeAttack ? [1, 1.04, 1] : 1,
        filter: hurt ? 'brightness(2.2)' : 'brightness(1)',
      }}
      transition={
        dodging
          ? { duration: 0.55, times: [0, 0.4, 1] }
          : hurt
            ? { duration: 0.32 }
            : { duration: 1.7, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-20 w-20 sm:h-24 sm:w-24 drop-shadow-[0_0_8px_rgba(255,255,255,0.12)]"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {rects.map((r, idx) => (
          <rect key={idx} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
        ))}
      </svg>
    </motion.div>
  );
};
