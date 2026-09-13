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

  const seatMap = new Map<string, SeatItem>();
  seats.forEach((s) => seatMap.set(s.id, s));

  const handleSeatClick = (seatId: string, isAvailable: boolean) => {
    if (!isAvailable) return;
    sound.playSeatSelect();
    toggleSeat(seatId);
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-2">
      {/* 1. Curved Cinema Screen Arc */}
      <div className="w-full max-w-xl flex flex-col items-center mb-8 relative">
        <svg viewBox="0 0 600 50" className="w-full h-12 overflow-visible">
          <defs>
            <linearGradient id="editorialScreenGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C92A42" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#E8E3D9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#C92A42" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M 40 40 Q 300 0 560 40"
            fill="none"
            stroke="url(#editorialScreenGlow)"
            strokeWidth="3.0"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[10px] font-mono text-[#E8E3D9]/60 tracking-[0.3em] uppercase -mt-3">
          ANAMORPHIC ACOUSTIC PROJECTION SCREEN // 2.39:1
        </span>
      </div>

      {/* 2. Parametric Curved SVG Seating Grid */}
      <div className="relative w-full max-w-2xl flex justify-center overflow-x-auto pb-4">
        <svg viewBox="0 0 720 340" className="w-full min-w-[620px] max-w-[700px] h-auto overflow-visible">
          {AUDITORIUM_CONFIG.tiers.map((tier, tierIdx) => {
            return tier.rows.map((rowChar, rowLocalIdx) => {
              const radius = tier.curveRadius + rowLocalIdx * 42;
              const totalCols = tier.seatsPerRow;
              const angularSpan = 0.82;
              const cx = 360;
              const cy = -70;

              return (
                <g key={rowChar}>
                  {/* Row Label (Left) */}
                  <text
                    x={cx + radius * Math.sin(-angularSpan / 2 - 0.05)}
                    y={cy + radius * Math.cos(-angularSpan / 2 - 0.05) - tier.curveRadius + 120}
                    fill="#85817a"
                    fontSize="11"
                    fontFamily="serif"
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

                    const aisleOffset = seatNumber > 5 ? 0.04 : -0.04;
                    const normalizedCol = (colIdx - (totalCols - 1) / 2) / totalCols;
                    const angle = normalizedCol * angularSpan + aisleOffset;

                    const x = cx + radius * Math.sin(angle);
                    const y = cy + radius * Math.cos(angle) - tier.curveRadius + 120;
                    const deg = (angle * 180) / Math.PI;

                    const isSelected = selectedSeats.includes(seatId);
                    const status = seatData?.status || 'AVAILABLE';
                    const isHeldByMe = status === 'HELD' && seatData?.held_by_session === clientSessionId;
                    const isHeldByOther = status === 'HELD' && seatData?.held_by_session !== clientSessionId;
                    const isBooked = status === 'BOOKED';
                    const isAvailable = status === 'AVAILABLE' || isHeldByMe;

                    let fill = '#0f1424';
                    let stroke = 'rgba(232, 227, 217, 0.2)';
                    let cursor = 'pointer';

                    if (isBooked) {
                      fill = '#120E15';
                      stroke = 'rgba(232, 227, 217, 0.06)';
                      cursor = 'not-allowed';
                    } else if (isHeldByOther) {
                      fill = '#38160d';
                      stroke = '#C92A42';
                      cursor = 'not-allowed';
                    } else if (isSelected) {
                      fill = '#C92A42'; // Dogstudio Crimson
                      stroke = '#E8E3D9';
                    } else if (tier.id === 'tier-director') {
                      stroke = '#D4AF37'; // Muted Gold
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
                          className="transition-all duration-200 group-hover:stroke-[#E8E3D9]"
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
                          fill={isSelected ? '#E8E3D9' : isBooked ? '#55524d' : '#cbd5e1'}
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
                    fill="#85817a"
                    fontSize="11"
                    fontFamily="serif"
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
          <span className="w-3.5 h-3.5 rounded border border-white/30 bg-[#0f1424]" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-[#E8E3D9] bg-[#C92A42]" />
          <span className="text-[#E8E3D9]">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-[#D4AF37] bg-[#0f1424]" />
          <span className="text-[#D4AF37]">VIP Box</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-[#C92A42] bg-[#38160d]" />
          <span className="text-[#C92A42]">Locked (Held)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-white/5 bg-[#120E15] opacity-60" />
          <span className="text-zinc-600">Booked</span>
        </div>
      </div>
    </div>
  );
};
