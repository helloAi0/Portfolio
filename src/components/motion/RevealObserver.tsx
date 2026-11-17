'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Scroll-reveal for every element with the `.reveal` class (Cards and section headings opt in
 * automatically). One IntersectionObserver for the whole site; a MutationObserver picks up content
 * that appears later (client navigation, filtered lists). Without JS or with reduced motion the CSS
 * keeps everything visible.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
        if (!seen.has(el)) { seen.add(el); io.observe(el); }
      });
    };
    scan();
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; scan(); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);

  return null;
}
