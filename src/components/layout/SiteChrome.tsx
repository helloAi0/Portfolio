'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

/** The front gate ("/") is a full-screen scene: no header, footer or chat widget around it. */
export function SiteChrome({ header, footer, widget, children }: { header: React.ReactNode; footer: React.ReactNode; widget: React.ReactNode; children: React.ReactNode }) {
  const gate = usePathname() === '/';
  if (gate) return <>{children}</>;
  return (
    <>
      {header}
      <main id="main-content" className="flex-1 w-full pt-16" tabIndex={-1}>
        {children}
      </main>
      {footer}
      {widget}
    </>
  );
}
