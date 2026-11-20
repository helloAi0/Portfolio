'use client';
import { useEffect, useState } from 'react';

/** True only when the visitor is the signed-in owner. Fails closed (false) on any error. */
export function useIsOwner(): boolean {
  const [owner, setOwner] = useState(false);
  useEffect(() => {
    let live = true;
    fetch('/api/admin/auth', { cache: 'no-store' }).then((r) => r.json()).then((d) => { if (live) setOwner(d?.admin === true); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  return owner;
}
