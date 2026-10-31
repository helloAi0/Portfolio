'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Search, Filter, ArrowRight, Github, ExternalLink, Cpu, Layers } from 'lucide-react';

interface ProjectExplorerProps {
  initialProjects: any[];
  categories: any[];
}

export function ProjectExplorer({ initialProjects, categories }: ProjectExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const difficulties = ['ALL', 'Foundational', 'Intermediate', 'Advanced', 'Imperial'];

  const filteredProjects = useMemo(() => {
    return initialProjects.filter((p) => {
      // Category filter
      if (selectedCategory !== 'ALL' && p.category?.slug !== selectedCategory) {
        return false;
      }
      // Difficulty filter
      if (selectedDifficulty !== 'ALL' && p.difficulty !== selectedDifficulty) {
        return false;
      }
      // Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesSubcat = p.subcategory.toLowerCase().includes(q);
        const matchesSkill = p.skills?.some((s: any) =>
          s.skill?.name.toLowerCase().includes(q)
        );
        return matchesTitle || matchesDesc || matchesSubcat || matchesSkill;
      }
      return true;
    });
  }, [initialProjects, selectedCategory, selectedDifficulty, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Search & Filter Toolbar */}
      <div className="marble-card p-6 rounded-md space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gold-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by engineering keyword, technology, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded bg-imperial-900 border border-gold-500/20 text-white placeholder-neutral-500 text-xs font-mono focus:outline-none focus:border-gold-400 transition-colors"
            />
          </div>

          {/* Difficulty Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-neutral-400 uppercase">Difficulty:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-xs font-mono text-gold-300 focus:outline-none focus:border-gold-400"
            >
              {difficulties.map((diff) => (
                <option key={diff} value={diff} className="bg-imperial-950 text-white">
                  {diff}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 10 Engineering Category Pills */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-gold-400 uppercase tracking-widest block">
            Engineering Disciplines ({categories.length})
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-gold-500 text-imperial-950 font-bold shadow-sm'
                  : 'bg-imperial-900/90 text-neutral-400 hover:text-white border border-gold-500/15'
              }`}
            >
              All Disciplines ({initialProjects.length})
            </button>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-gold-500 text-imperial-950 font-bold shadow-sm'
                      : 'bg-imperial-900/90 text-neutral-300 hover:text-gold-300 border border-gold-500/15'
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat._count?.projects > 0 && (
                    <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-imperial-950/20' : 'bg-imperial-800 text-gold-400'}`}>
                      {cat._count.projects}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Telemetry */}
      <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-1">
        <span>Displaying {filteredProjects.length} Architectural Blueprint(s)</span>
        {(selectedCategory !== 'ALL' || selectedDifficulty !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setSelectedDifficulty('ALL');
              setSearchQuery('');
            }}
            className="text-gold-400 hover:underline"
          >
            Clear Active Filters
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 marble-card rounded-md">
          <p className="font-serif text-lg text-neutral-300 mb-2">No matching engineering blueprints located.</p>
          <p className="text-xs text-neutral-500 font-mono">
            Try adjusting search terms or resetting discipline filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredProjects.map((p) => (
            <Card
              key={p.id}
              variant="marble"
              className="flex flex-col justify-between group hover:border-gold-500/50 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant="gold" size="xs">
                    {p.category?.name}
                  </Badge>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Tier: <strong className="text-gold-300">{p.difficulty}</strong>
                  </span>
                </div>

                <h3 className="text-xl font-serif font-bold text-white group-hover:text-gold-300 transition-colors mb-2">
                  <Link href={`/projects/${p.slug}`}>
                    {p.title}
                  </Link>
                </h3>
                <p className="text-xs text-gold-400 font-mono mb-3">
                  {p.tagline}
                </p>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans mb-6">
                  {p.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {p.skills?.map((ps: any) => (
                    <span
                      key={ps.skillId}
                      className="px-2 py-0.5 rounded bg-imperial-800 border border-gold-500/20 text-[10px] font-mono text-neutral-300"
                    >
                      {ps.skill?.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <Link
                  href={`/projects/${p.slug}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-gold-400 hover:text-gold-200 transition-colors"
                >
                  <span>Comprehensive Blueprint</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="flex items-center space-x-2">
                  {p.githubRepo && (
                    <a
                      href={p.githubRepo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-imperial-800 transition-colors"
                      title="GitHub Source"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {p.liveDeployment && (
                    <a
                      href={p.liveDeployment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded text-neutral-400 hover:text-gold-300 hover:bg-imperial-800 transition-colors"
                      title="Live Deployment"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
