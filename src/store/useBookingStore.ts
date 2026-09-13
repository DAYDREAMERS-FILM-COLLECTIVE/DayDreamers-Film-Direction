import { create } from 'zustand';
import { TicketPassPayload } from '@/types';

interface BookingState {
  selectedSeats: string[];
  holdExpiresAt: string | null;
  holdRemainingSeconds: number;
  isHolding: boolean;
  confirmedTickets: TicketPassPayload[] | null;

  toggleSeat: (seatId: string) => void;
  clearSelection: () => void;
  setHoldSuccess: (seatIds: string[], expiresAt: string) => void;
  tickHoldTimer: () => void;
  resetHold: () => void;
  setConfirmedTickets: (tickets: TicketPassPayload[] | null) => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  selectedSeats: [],
  holdExpiresAt: null,
  holdRemainingSeconds: 0,
  isHolding: false,
  confirmedTickets: null,

  toggleSeat: (seatId: string) => {
    const current = get().selectedSeats;
    if (current.includes(seatId)) {
      set({ selectedSeats: current.filter((id) => id !== seatId) });
    } else {
      // Max 4 seats per booking
      if (current.length >= 4) return;
      set({ selectedSeats: [...current, seatId] });
    }
  },

  clearSelection: () => set({ selectedSeats: [], isHolding: false, holdExpiresAt: null, holdRemainingSeconds: 0 }),

  setHoldSuccess: (seatIds, expiresAt) => {
    const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    set({
      selectedSeats: seatIds,
      holdExpiresAt: expiresAt,
      holdRemainingSeconds: remaining,
      isHolding: true,
    });
  },

  tickHoldTimer: () => {
    const { holdExpiresAt, isHolding } = get();
    if (!isHolding || !holdExpiresAt) return;
    const remaining = Math.max(0, Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000));
    if (remaining <= 0) {
      set({ isHolding: false, holdExpiresAt: null, holdRemainingSeconds: 0, selectedSeats: [] });
    } else {
      set({ holdRemainingSeconds: remaining });
    }
  },

  resetHold: () => set({ selectedSeats: [], isHolding: false, holdExpiresAt: null, holdRemainingSeconds: 0 }),
  setConfirmedTickets: (tickets) => set({ confirmedTickets: tickets }),
}));
