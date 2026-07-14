'use client';

import Lottie from 'lottie-react';
import animationData from '../../public/HealConnect.json';

export default function HeroAnimation() {
  return (
    <Lottie
      animationData={animationData}
      loop
      className="w-full max-w-sm lg:max-w-lg"
    />
  );
}
