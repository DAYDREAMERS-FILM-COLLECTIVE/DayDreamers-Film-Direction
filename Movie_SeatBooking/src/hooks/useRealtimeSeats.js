import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, fetchSeats } from '../lib/supabase.js';

/**
 * useRealtimeSeats
 * Real-time concurrency & deferred WebSocket hook for 50-seat screening room:
 * 1. DEFERRED WEBSOCKET: Connects channel strictly when active; calls supabase.removeChannel() on unmount.
 * 2. GRANULAR UPDATE: Listens to postgres_changes on table 'seats' filtered by showtime_id and updates 3D mesh states in real-time.
 * 3. CLIENT-SIDE LAZY EXPIRATION: Runs a 1-second interval checking if seats held by others have expired (locked_until < Date.now()).
 */
export function useRealtimeSeats(showtimeId, sessionId) {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  // Initial fetch
  const loadSeats = useCallback(async (quiet = false) => {
    if (!showtimeId) return;
    if (!quiet) setLoading(true);
    else setIsSyncing(true);

    try {
      const res = await fetchSeats(showtimeId, sessionId);
      if (res.data) {
        setSeats(res.data);
      }
    } catch (err) {
      console.error('[useRealtimeSeats] Fetch error:', err);
      setError('Unable to fetch live seat grid.');
    } finally {
      if (!quiet) setLoading(false);
      else setIsSyncing(false);
    }
  }, [showtimeId, sessionId]);

  useEffect(() => {
    loadSeats();

    if (!showtimeId) return;

    // 1. DEFERRED WEBSOCKET: Subscribed only while this hook is mounted
    const channelName = `seats-room-${showtimeId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seats',
          filter: `showtime_id=eq.${showtimeId}`,
        },
        (payload) => {
          const updatedRow = payload.new;
          if (!updatedRow || !updatedRow.id) {
            loadSeats(true);
            return;
          }

          // Granular atomic update to avoid re-rendering entire tree
          setSeats((prevSeats) => {
            const now = Date.now();
            return prevSeats.map((seat) => {
              if (seat.id !== updatedRow.id) return seat;

              const isLocked = updatedRow.status === 'locked';
              const lockExpiry = updatedRow.locked_until ? new Date(updatedRow.locked_until).getTime() : 0;
              const isLockActive = isLocked && lockExpiry > now;
              const isMine = isLockActive && updatedRow.locked_by_session === sessionId;
              const isOther = isLockActive && updatedRow.locked_by_session !== sessionId;

              let effectiveStatus = 'available';
              if (updatedRow.status === 'booked') {
                effectiveStatus = 'booked';
              } else if (isMine) {
                effectiveStatus = 'selected_by_me';
              } else if (isOther) {
                effectiveStatus = 'locked_by_other';
              }

              return {
                ...seat,
                ...updatedRow,
                effective_status: effectiveStatus,
                is_my_lock: isMine,
                lock_seconds_remaining: isLockActive ? Math.max(0, Math.floor((lockExpiry - now) / 1000)) : 0,
              };
            });
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Sync fresh state upon successful connection
          loadSeats(true);
        }
      });

    // 2. Client-Side Lazy Expiration Check (1-second tick)
    const lazyExpiryInterval = setInterval(() => {
      const now = Date.now();
      setSeats((prevSeats) => {
        let changed = false;
        const nextSeats = prevSeats.map((seat) => {
          if (seat.effective_status === 'locked_by_other' && seat.locked_until) {
            const expiry = new Date(seat.locked_until).getTime();
            if (expiry <= now) {
              changed = true;
              return {
                ...seat,
                effective_status: 'available',
                locked_by_session: null,
                locked_until: null,
              };
            }
          }
          return seat;
        });
        return changed ? nextSeats : prevSeats;
      });
    }, 1000);

    // 3. Fallback background poll every 8 seconds
    const backgroundPoll = setInterval(() => {
      loadSeats(true);
    }, 8000);

    // CLEANUP: Immediately remove channel to prevent connection pool exhaustion on Supabase Free Tier
    return () => {
      clearInterval(lazyExpiryInterval);
      clearInterval(backgroundPoll);
      supabase.removeChannel(channel);
    };
  }, [showtimeId, sessionId, loadSeats]);

  return {
    seats,
    setSeats,
    loading,
    isSyncing,
    error,
    refreshSeats: loadSeats,
  };
}
