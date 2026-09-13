import type { Metadata } from 'next';
import './globals.css';
import { SmoothScrollProvider } from '@/components/dom/SmoothScrollProvider';
import { Navbar } from '@/components/dom/Navbar';
import { ViewfinderCursor } from '@/components/dom/ViewfinderCursor';

export const metadata: Metadata = {
  title: 'FPS // Anamorphic Direction & Real-Time Ticketing Archive',
  description:
    'A synchronized WebGL film direction portfolio and real-time parametric cinema seat-booking engine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-void text-zinc-100 min-h-screen relative antialiased selection:bg-neon-cyan selection:text-black">
        <SmoothScrollProvider>
          <Navbar />
          <ViewfinderCursor />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
