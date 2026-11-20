import React from 'react';

/** Two rows of oversized outlined words moving in opposite directions (pure CSS). */
export function BigMarquee({ rows }: { rows: [string[], string[]] }) {
  return (
    <div className="big-marquee py-10 overflow-hidden select-none" aria-hidden="true">
      {rows.map((words, r) => (
        <div key={r} className={'flex w-max ' + (r === 0 ? 'bm-left' : 'bm-right')}>
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {words.map((w) => (
                <span key={w + k} className={'px-6 sm:px-10 font-serif font-black uppercase text-[clamp(3rem,9vw,8rem)] leading-[1.05] whitespace-nowrap ' + (r === 0 ? 'bm-outline' : 'text-gold-300/90')}>
                  {w}<span className="mx-6 sm:mx-10 text-gold-500/60">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
