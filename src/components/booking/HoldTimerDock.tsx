'use client';

import React, { useEffect } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { Timer, AlertTriangle } from 'lucide-react';

export const HoldTimerDock: React.FC<{ onExpire: () => void }> = ({ onExpire }) => {
  const isHolding = useBookingStore((s) => s.isHolding);
  const remaining = useBookingStore((s) => s.holdRemainingSeconds);
  const tickHoldTimer = useBookingStore((s) => s.tickHoldTimer);

  useEffect(() => {
    if (!isHolding) return;
    const interval = setInterval(() => {
      tickHoldTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [isHolding, tickHoldTimer]);

  useEffect(() => {
    if (isHolding && remaining <= 0) {
      onExpire();
    }
  }, [isHolding, remaining, onExpire]);

  if (!isHolding) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isLow = remaining < 60;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full border shadow-2xl backdrop-blur-xl flex items-center gap-4 text-xs font-mono transition-all ${
        isLow
          ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
          : 'bg-surface/90 border-amber-500/60 text-amber-300'
      }`}
    >
      {isLow ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Timer className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />}
      <div>
        <span className="font-bold tracking-wider">SEAT HOLD RESERVED:</span>{' '}
        <span className="font-mono text-sm font-extrabold">{timeStr}</span>
      </div>
      <div className="text-[10px] text-zinc-400 hidden sm:inline">
        Complete checkout before hold expires
      </div>
    </div>
  );
};
