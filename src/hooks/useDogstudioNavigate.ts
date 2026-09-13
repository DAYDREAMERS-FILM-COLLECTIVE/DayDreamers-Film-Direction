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

    const overlay = document.querySelector('.fixed.inset-0.z-50.bg-\\[\\#060814\\]') || document.querySelector('[style*="transform-origin"]');

    if (overlay) {
      anime({
        targets: overlay,
        scaleY: [0, 1],
        transformOrigin: ['50% 100%', '50% 100%'],
        duration: 750,
        easing: 'easeInOutCubic',
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
