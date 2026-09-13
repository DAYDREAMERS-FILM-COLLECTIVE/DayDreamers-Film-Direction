import React from 'react';
import { DoorScanner } from '@/components/admin/DoorScanner';

export const metadata = {
  title: 'FPS // Door Check-in Scanner HUD',
  description: 'Cryptographic QR pass verification and admission logging terminal.',
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-void relative">
      <DoorScanner />
    </main>
  );
}
