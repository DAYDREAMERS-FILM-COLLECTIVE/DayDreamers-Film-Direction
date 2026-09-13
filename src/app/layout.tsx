import type { Metadata } from 'next';
import './globals.css';
import { CanvasWrapper } from '@/components/canvas/CanvasWrapper';
import { DogstudioTransitionWipe } from '@/components/dom/DogstudioTransitionWipe';
import { Navbar } from '@/components/dom/Navbar';
import { ViewfinderCursor } from '@/components/dom/ViewfinderCursor';

export const metadata: Metadata = {
  title: 'FPS // Cinematic Direction & Film Archive',
  description:
    'An editorial, synchronized WebGL film showcase and cinema seat reservation platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#060814] text-[#E8E3D9] min-h-screen relative antialiased selection:bg-[#C92A42] selection:text-[#E8E3D9]">
        {/* 1. Persistent 3D WebGL Canvas Across All Routes */}
        <CanvasWrapper />

        {/* 2. Dogstudio Editorial Curtain Transition Wipe */}
        <DogstudioTransitionWipe />

        {/* 3. Global Minimal Navigation & Cursor */}
        <Navbar />
        <ViewfinderCursor />

        {/* 4. Route Content */}
        <div className="relative z-10 w-full min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
