import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SeatItem } from '@/types';
import { getClientSessionId } from '@/lib/session';
import { useBookingStore } from '@/store/useBookingStore';

export function useRealtimeSeats(showtimeId: string) {
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = typeof window !== 'undefined' ? getClientSessionId() : '';
  const setHoldSuccess = useBookingStore((s) => s.setHoldSuccess);
  const resetHold = useBookingStore((s) => s.resetHold);

  // Fetch current seats
  const fetchSeats = useCallback(async () => {
    if (!showtimeId) return;
    try {
      setLoading(true);
      // Read from safe view or table
      const { data, error: fetchErr } = await supabase
        .from('seats')
        .select('id, showtime_id, row_label, seat_number, tier_id, status, held_by_session, expires_at')
        .eq('showtime_id', showtimeId)
        .order('row_label', { ascending: true })
        .order('seat_number', { ascending: true });

      if (fetchErr) {
        throw fetchErr;
      }

      const now = new Date().getTime();
      const sanitized: SeatItem[] = (data || []).map((s) => {
        // If seat was HELD but expired, treat locally as AVAILABLE
        let effectiveStatus = s.status as SeatItem['status'];
        if (effectiveStatus === 'HELD' && s.expires_at && new Date(s.expires_at).getTime() < now) {
          effectiveStatus = 'AVAILABLE';
        }
        return {
          id: s.id,
          showtime_id: s.showtime_id,
          row_label: s.row_label,
          seat_number: s.seat_number,
          tier_id: s.tier_id,
          status: effectiveStatus,
          held_by_session: s.held_by_session,
          expires_at: s.expires_at,
        };
      });

      setSeats(sanitized);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load seats:', err);
      setError(err instanceof Error ? err.message : 'Error fetching seating layout');
    } finally {
      setLoading(false);
    }
  }, [showtimeId]);

  // Subscribe to Supabase Realtime changes
  useEffect(() => {
    if (!showtimeId) return;
    fetchSeats();

    const channel = supabase
      .channel(`realtime_seats_${showtimeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seats',
          filter: `showtime_id=eq.${showtimeId}`,
        },
        (payload) => {
          const updatedRow = payload.new as Partial<SeatItem>;
          if (!updatedRow.id) {
            fetchSeats();
            return;
          }

          setSeats((prev) =>
            prev.map((seat) => {
              if (seat.id === updatedRow.id) {
                const now = Date.now();
                let effectiveStatus = updatedRow.status || seat.status;
                if (effectiveStatus === 'HELD' && updatedRow.expires_at && new Date(updatedRow.expires_at).getTime() < now) {
                  effectiveStatus = 'AVAILABLE';
                }
                return {
                  ...seat,
                  ...updatedRow,
                  status: effectiveStatus,
                };
              }
              return seat;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showtimeId, fetchSeats]);

  // Atomic Hold action via RPC
  const lockSeats = async (seatIds: string[]): Promise<{ success: boolean; error?: string }> => {
    if (!seatIds.length) return { success: false, error: 'No seats selected' };
    try {
      const { data, error: rpcError } = await supabase.rpc('hold_seats_atomic', {
        p_seat_ids: seatIds,
        p_showtime_id: showtimeId,
        p_session_id: sessionId,
        p_ttl_seconds: 300, // 5 minutes
      });

      if (rpcError) {
        return { success: false, error: rpcError.message };
      }

      if (data && data.success) {
        setHoldSuccess(seatIds, data.expires_at);
        return { success: true };
      } else {
        return { success: false, error: data?.error || 'Could not acquire lock on seats' };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error during lock' };
    }
  };

  // Atomic Release action via RPC
  const releaseSeats = async (seatIds: string[]) => {
    if (!seatIds.length) return;
    try {
      await supabase.rpc('release_seats_atomic', {
        p_seat_ids: seatIds,
        p_showtime_id: showtimeId,
        p_session_id: sessionId,
      });
      resetHold();
    } catch (err) {
      console.error('Failed to release seats:', err);
    }
  };

  return {
    seats,
    loading,
    error,
    refreshSeats: fetchSeats,
    lockSeats,
    releaseSeats,
    clientSessionId: sessionId,
  };
}
