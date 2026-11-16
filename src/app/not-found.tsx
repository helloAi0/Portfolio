import Link from 'next/link';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="text-xs font-mono text-gold-400 mb-2">404</p>
      <h1 className="text-2xl font-serif font-bold text-white mb-2">Page not found</h1>
      <p className="text-sm text-neutral-300 mb-6">That page does not exist. Try one of these instead.</p>
      <div className="flex flex-wrap justify-center gap-3 text-xs font-mono">
        <Link href="/" className="px-4 py-2 rounded border border-gold-500/40 text-gold-300 hover:bg-imperial-800">Home</Link>
        <Link href="/projects" className="px-4 py-2 rounded border border-white/10 text-neutral-300 hover:bg-imperial-800">Projects</Link>
        <Link href="/contact" className="px-4 py-2 rounded border border-white/10 text-neutral-300 hover:bg-imperial-800">Contact</Link>
      </div>
    </div>
  );
}
