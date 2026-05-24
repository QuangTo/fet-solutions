"use client";

import { useEffect, useRef, useState } from "react";

export function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ height: 0, width: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        height: Math.floor(entry.contentRect.height),
        width: Math.floor(entry.contentRect.width),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
