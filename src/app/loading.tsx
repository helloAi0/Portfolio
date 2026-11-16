export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center" role="status" aria-live="polite">
      <div className="mx-auto h-8 w-8 rounded-full border-2 border-gold-500/30 border-t-gold-400 animate-spin" aria-hidden />
      <p className="mt-4 text-xs font-mono text-neutral-400">Loading...</p>
    </div>
  );
}
