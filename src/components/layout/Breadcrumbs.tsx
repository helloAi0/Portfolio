'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ArrowLeft, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
}

export function Breadcrumbs({ items, showBackButton = true }: BreadcrumbsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 mb-6 rounded-md bg-imperial-900/60 border border-gold-500/15 backdrop-blur-sm">
      <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400">
        <Link
          href="/"
          className="flex items-center space-x-1 text-neutral-400 hover:text-gold-300 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Citadel</span>
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              <ChevronRight className="w-3 h-3 text-neutral-600 flex-shrink-0" />
              {isLast || !item.href ? (
                <span className="text-gold-300 font-semibold truncate max-w-[200px] sm:max-w-xs">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-gold-300 transition-colors truncate max-w-[150px] sm:max-w-xs"
                >
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {showBackButton && (
        <button
          onClick={() => router.back()}
          className="inline-flex items-center space-x-1 text-xs font-mono text-neutral-400 hover:text-gold-400 hover:bg-imperial-800 px-2.5 py-1 rounded border border-transparent hover:border-gold-500/20 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous Chamber</span>
        </button>
      )}
    </div>
  );
}

