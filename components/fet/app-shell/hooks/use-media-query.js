"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query, defaultValue = false) {
  const [matches, setMatches] = useState(defaultValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);

    handleChange();
    setReady(true);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [query]);

  return ready ? matches : defaultValue;
}
