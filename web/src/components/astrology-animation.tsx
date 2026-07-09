'use client';

import Lottie from 'lottie-react';
import animationData from '../../public/astrology-book.json';

export default function AstrologyAnimation() {
  return (
    <Lottie
      animationData={animationData}
      loop
      className="w-full h-full"
    />
  );
}
