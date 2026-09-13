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
    <div className="w-full flex flex-col items-center select-none py-4">
      {/* 1. Minimal Editorial Screen Arc */}
      <div className="w-full max-w-3xl flex flex-col items-center mb-12 relative">
        <svg viewBox="0 0 800 60" className="w-full h-14 overflow-visible">
          <defs>
            <linearGradient id="minimalScreenGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E8E3D9" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#E8E3D9" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#E8E3D9" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M 60 50 Q 400 0 740 50"
            fill="none"
            stroke="url(#minimalScreenGlow)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[11px] font-sans tracking-[0.4em] uppercase text-[#E8E3D9]/40 -mt-4 font-light">
          SCREEN
        </span>
      </div>

      {/* 2. Prominently Scaled SVG Curved Seating Matrix (65-75% Viewport Width) */}
      <div className="relative w-full max-w-4xl flex justify-center overflow-x-auto pb-6">
        <svg
          viewBox="0 0 940 440"
          className="w-full min-w-[760px] max-w-[920px] h-auto overflow-visible"
        >
          {AUDITORIUM_CONFIG.tiers.map((tier, tierIdx) => {
            return tier.rows.map((rowChar, rowLocalIdx) => {
              const radius = tier.curveRadius * 1.08 + rowLocalIdx * 52;
              const totalCols = tier.seatsPerRow;
              const angularSpan = 0.84;
              const cx = 470;
              const cy = -90;

              return (
                <g key={rowChar}>
                  {/* Row Letter (Left) */}
                  <text
                    x={cx + radius * Math.sin(-angularSpan / 2 - 0.045)}
                    y={cy + radius * Math.cos(-angularSpan / 2 - 0.045) - tier.curveRadius * 1.08 + 140}
                    fill="#85817a"
                    fontSize="13"
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

                    const aisleOffset = seatNumber > 5 ? 0.038 : -0.038;
                    const normalizedCol = (colIdx - (totalCols - 1) / 2) / totalCols;
                    const angle = normalizedCol * angularSpan + aisleOffset;

                    const x = cx + radius * Math.sin(angle);
                    const y = cy + radius * Math.cos(angle) - tier.curveRadius * 1.08 + 140;
                    const deg = (angle * 180) / Math.PI;

                    const isSelected = selectedSeats.includes(seatId);
                    const status = seatData?.status || 'AVAILABLE';
                    const isHeldByMe = status === 'HELD' && seatData?.held_by_session === clientSessionId;
                    const isHeldByOther = status === 'HELD' && seatData?.held_by_session !== clientSessionId;
                    const isBooked = status === 'BOOKED';
                    const isAvailable = status === 'AVAILABLE' || isHeldByMe;

                    let fill = '#0d111d';
                    let stroke = 'rgba(232, 227, 217, 0.28)';
                    let cursor = 'pointer';

                    if (isBooked) {
                      fill = '#141118';
                      stroke = 'rgba(232, 227, 217, 0.05)';
                      cursor = 'not-allowed';
                    } else if (isHeldByOther) {
                      fill = '#2c1e14';
                      stroke = '#D4AF37';
                      cursor = 'not-allowed';
                    } else if (isSelected) {
                      fill = '#C92A42'; // Velvet Crimson
                      stroke = '#E8E3D9';
                    } else if (tier.id === 'tier-director') {
                      stroke = '#D4AF37'; // Muted Gold VIP
                    }

                    return (
                      <g
                        key={seatId}
                        transform={`translate(${x}, ${y}) rotate(${-deg})`}
                        onClick={() => handleSeatClick(seatId, isAvailable && !isHeldByOther)}
                        style={{ cursor }}
                        className="group"
                      >
                        {/* Seat Base - Scaled Up for Prominence */}
                        <rect
                          x="-14"
                          y="-14"
                          width="28"
                          height="28"
                          rx="6"
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={isSelected ? '2.2' : '1.4'}
                          className="transition-all duration-200 group-hover:stroke-[#E8E3D9]"
                        />

                        {/* Minimal Headrest Bar */}
                        <rect
                          x="-10"
                          y="-18"
                          width="20"
                          height="4"
                          rx="2"
                          fill={stroke}
                          opacity={isBooked ? '0.15' : '0.5'}
                        />

                        {/* Seat Number */}
                        <text
                          x="0"
                          y="1"
                          fill={isSelected ? '#E8E3D9' : isBooked ? '#44413c' : '#E8E3D9'}
                          fontSize="9"
                          fontFamily="sans-serif"
                          fontWeight={isSelected ? '600' : '400'}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {seatNumber}
                        </text>
                      </g>
                    );
                  })}

                  {/* Row Letter (Right) */}
                  <text
                    x={cx + radius * Math.sin(angularSpan / 2 + 0.045)}
                    y={cy + radius * Math.cos(angularSpan / 2 + 0.045) - tier.curveRadius * 1.08 + 140}
                    fill="#85817a"
                    fontSize="13"
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

      {/* 3. Refined Editorial Legend */}
      <div className="flex flex-wrap items-center justify-center gap-8 pt-4 text-xs font-sans tracking-wider text-[#E8E3D9]/60 border-t border-white/[0.08] w-full max-w-2xl">
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded border border-white/30 bg-[#0d111d]" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded border border-[#E8E3D9] bg-[#C92A42]" />
          <span className="text-[#E8E3D9]">Selected</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded border border-[#D4AF37] bg-[#0d111d]" />
          <span className="text-[#D4AF37]">VIP Box</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded border border-[#D4AF37] bg-[#2c1e14]" />
          <span className="text-[#D4AF37]/80">Held</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded border border-white/5 bg-[#141118] opacity-50" />
          <span className="text-zinc-600">Reserved</span>
        </div>
      </div>
    </div>
  );
};
