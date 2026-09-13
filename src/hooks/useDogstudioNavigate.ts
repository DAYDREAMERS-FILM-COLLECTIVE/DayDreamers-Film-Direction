'use client';

import { useRouter } from 'next/navigation';
import anime from 'animejs';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { sound } from '@/lib/audio';

export function useDogstudioNavigate() {
  const router = useRouter();
  const setIsPageTransitioning = useShowcaseStore((s) => s.setIsPageTransitioning);

  const navigateTo = (href: string) => {
    sound.playShutterClick();
    setIsPageTransitioning(true);

    const curtain = document.getElementById('dogstudio-curtain');

    if (curtain) {
      anime({
        targets: curtain,
        translateY: ['100%', '0%'],
        duration: 850,
        easing: 'cubicBezier(0.77, 0, 0.175, 1)',
        complete: () => {
          router.push(href);
        },
      });
    } else {
      router.push(href);
    }
  };

  return { navigateTo };
}
