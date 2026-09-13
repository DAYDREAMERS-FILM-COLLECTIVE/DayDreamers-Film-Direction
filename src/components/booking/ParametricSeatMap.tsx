'use client';

import React from 'react';
import { AUDITORIUM_CONFIG } from '@/config/seating.schema';
import { SeatItem } from '@/types';
import { useBookingStore } from '@/store/useBookingStore';
import { sound } from '@/lib/audio';

interface ParametricSeatMapProps {
  seats: SeatItem[];
  clientSessionId: string;
}

export const ParametricSeatMap: React.FC<ParametricSeatMapProps> = ({ seats, clientSessionId }) => {
  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const toggleSeat = useBookingStore((s) => s.toggleSeat);

  // Map seat by id for instant lookup
  const seatMap = new Map<string, SeatItem>();
  seats.forEach((s) => seatMap.set(s.id, s));

  const handleSeatClick = (seatId: string, isAvailable: boolean) => {
    if (!isAvailable) return;
    sound.playSeatSelect();
    toggleSeat(seatId);
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-2">
      {/* 1. Curved Anamorphic Cinema Screen Arc */}
      <div className="w-full max-w-xl flex flex-col items-center mb-8 relative">
        <svg viewBox="0 0 600 50" className="w-full h-12 overflow-visible">
          <defs>
            <linearGradient id="screenGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#00f0ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M 40 40 Q 300 0 560 40"
            fill="none"
            stroke="url(#screenGlow)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[10px] font-mono text-zinc-400 tracking-[0.25em] uppercase -mt-3">
          ANAMORPHIC PROJECTION SCREEN // 2.39:1 CURVE
        </span>
      </div>

      {/* 2. Parametric SVG Seating Grid */}
      <div className="relative w-full max-w-2xl flex justify-center overflow-x-auto pb-4">
        <svg viewBox="0 0 720 340" className="w-full min-w-[620px] max-w-[700px] h-auto overflow-visible">
          {AUDITORIUM_CONFIG.tiers.map((tier, tierIdx) => {
            return tier.rows.map((rowChar, rowLocalIdx) => {
              const globalRowIndex = tierIdx * 2 + rowLocalIdx;
              const radius = tier.curveRadius + rowLocalIdx * 42;
              const totalCols = tier.seatsPerRow;
              const angularSpan = 0.82; // arc angle in radians
              const cx = 360;
              const cy = -70;

              return (
                <g key={rowChar}>
                  {/* Row Label (Left) */}
                  <text
                    x={cx + radius * Math.sin(-angularSpan / 2 - 0.05)}
                    y={cy + radius * Math.cos(-angularSpan / 2 - 0.05) - tier.curveRadius + 120}
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {rowChar}
                  </text>

                  {/* Seat Nodes */}
                  {Array.from({ length: totalCols }).map((_, colIdx) => {
                    const seatNumber = colIdx + 1;
                    const seatId = `${rowChar}-${String(seatNumber).padStart(2, '0')}`;
                    const seatData = seatMap.get(seatId);

                    // Angular position with center aisle offset
                    const aisleOffset = seatNumber > 5 ? 0.04 : -0.04;
                    const normalizedCol = (colIdx - (totalCols - 1) / 2) / totalCols;
                    const angle = normalizedCol * angularSpan + aisleOffset;

                    const x = cx + radius * Math.sin(angle);
                    const y = cy + radius * Math.cos(angle) - tier.curveRadius + 120;
                    const deg = (angle * 180) / Math.PI;

                    // Compute Status
                    const isSelected = selectedSeats.includes(seatId);
                    const status = seatData?.status || 'AVAILABLE';
                    const isHeldByMe = status === 'HELD' && seatData?.held_by_session === clientSessionId;
                    const isHeldByOther = status === 'HELD' && seatData?.held_by_session !== clientSessionId;
                    const isBooked = status === 'BOOKED';
                    const isAvailable = status === 'AVAILABLE' || isHeldByMe;

                    let fill = '#121620';
                    let stroke = 'rgba(255, 255, 255, 0.2)';
                    let cursor = 'pointer';

                    if (isBooked) {
                      fill = '#1a1c23';
                      stroke = 'rgba(255, 255, 255, 0.05)';
                      cursor = 'not-allowed';
                    } else if (isHeldByOther) {
                      fill = '#3b200b';
                      stroke = '#ff7a00';
                      cursor = 'not-allowed';
                    } else if (isSelected) {
                      fill = '#00f0ff';
                      stroke = '#ffffff';
                    } else if (tier.id === 'tier-director') {
                      stroke = '#e5b869';
                    }

                    return (
                      <g
                        key={seatId}
                        transform={`translate(${x}, ${y}) rotate(${-deg})`}
                        onClick={() => handleSeatClick(seatId, isAvailable && !isHeldByOther)}
                        style={{ cursor }}
                        className="group"
                      >
                        {/* Seat Base */}
                        <rect
                          x="-11"
                          y="-11"
                          width="22"
                          height="22"
                          rx="4"
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={isSelected ? '2' : '1.2'}
                          className="transition-all duration-200 group-hover:stroke-neon-cyan"
                        />
                        {/* Headrest Pill */}
                        <rect
                          x="-8"
                          y="-14"
                          width="16"
                          height="4"
                          rx="2"
                          fill={stroke}
                          opacity={isBooked ? '0.2' : '0.6'}
                        />
                        {/* Number */}
                        <text
                          x="0"
                          y="1"
                          fill={isSelected ? '#000000' : isBooked ? '#475569' : '#cbd5e1'}
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {seatNumber}
                        </text>
                      </g>
                    );
                  })}

                  {/* Row Label (Right) */}
                  <text
                    x={cx + radius * Math.sin(angularSpan / 2 + 0.05)}
                    y={cy + radius * Math.cos(angularSpan / 2 + 0.05) - tier.curveRadius + 120}
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
                    textAnchor="start"
                    dominantBaseline="middle"
                  >
                    {rowChar}
                  </text>
                </g>
              );
            });
          })}
        </svg>
      </div>

      {/* 3. Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs font-mono text-zinc-400 border-t border-white/10 w-full max-w-xl">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-white/30 bg-surface" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-white bg-neon-cyan" />
          <span className="text-white">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-lens-gold bg-surface" />
          <span className="text-lens-gold">VIP Box</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-amber-500 bg-amber-950/60" />
          <span className="text-amber-400">Held (Locked)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-white/5 bg-zinc-900 opacity-60" />
          <span className="text-zinc-500">Booked</span>
        </div>
      </div>
    </div>
  );
};
