'use client';

import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';

export default function AstrologyAnimation() {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/astrology-book.json')
        .then((res) => res.json())
        .then(setAnimationData);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (!animationData) return null;

  return (
    <Lottie
      animationData={animationData}
      loop
      className="w-full h-full"
    />
  );
}
