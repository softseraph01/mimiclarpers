import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PresenceStatus = 'not-applicable' | 'connecting' | 'connected' | 'unavailable';
type RoomPresenceRow = Database['public']['Tables']['room_presence']['Row'];

const HEARTBEAT_MS = 15_000;
const REFRESH_CLOCK_MS = 5_000;
const ONLINE_WINDOW_MS = 45_000;

function createConnectionId(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('Secure browser randomness is required for room presence.');
  }
  return globalThis.crypto.randomUUID();
}

export function useRoomPresence(roomId: string, enabled: boolean) {
  const { user, session } = useAuth();
  const [rows, setRows] = useState<RoomPresenceRow[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [status, setStatus] = useState<PresenceStatus>('not-applicable');

  useEffect(() => {
    const client = supabase;
    if (!enabled || !user) {
      setRows([]);
      setStatus('not-applicable');
      return;
    }
    if (!client) {
      setRows([]);
      setStatus('unavailable');
      return;
    }

    let active = true;
    let heartbeatTimer: number | undefined;
    let connectionId: string;
    try {
      connectionId = createConnectionId();
    } catch {
      setRows([]);
      setStatus('unavailable');
      return;
    }
    setRows([]);
    setStatus('connecting');
    const clockTimer = window.setInterval(() => setNow(Date.now()), REFRESH_CLOCK_MS);

    if (session?.access_token) {
      void client.realtime.setAuth(session.access_token).catch(() => {
        if (active) setStatus('unavailable');
      });
    }

    const heartbeat = async () => {
      try {
        const { error: touchError } = await client.rpc('set_room_presence', {
          p_room_id: roomId,
          p_connection_id: connectionId,
        });
        if (touchError) throw touchError;
        const { data, error } = await client
          .from('room_presence')
          .select('room_id, user_id, connection_id, last_seen_at')
          .eq('room_id', roomId);
        if (error) throw error;
        if (active) setRows(data ?? []);
      } catch {
        if (active) setStatus('unavailable');
      }
    };

    const channel = client
      .channel(`room-presence:${roomId}`, { config: { private: true } })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_presence',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        if (!active) return;
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as Partial<RoomPresenceRow>;
          if (!oldRow.user_id || !oldRow.connection_id) return;
          setRows((current) => current.filter((row) => !(row.user_id === oldRow.user_id && row.connection_id === oldRow.connection_id)));
          return;
        }
        const row = payload.new as RoomPresenceRow;
        if (row.room_id !== roomId || !row.user_id || !row.connection_id) return;
        setRows((current) => [
          ...current.filter((item) => !(item.user_id === row.user_id && item.connection_id === row.connection_id)),
          row,
        ]);
      });

    channel.subscribe((channelStatus) => {
      if (!active) return;
      if (channelStatus === 'SUBSCRIBED') {
        setStatus('connected');
        void heartbeat();
        if (heartbeatTimer === undefined) heartbeatTimer = window.setInterval(() => void heartbeat(), HEARTBEAT_MS);
      } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT' || channelStatus === 'CLOSED') {
        setStatus('unavailable');
        if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
      }
    });

    return () => {
      active = false;
      window.clearInterval(clockTimer);
      if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
      void client.removeChannel(channel);
      void client.rpc('clear_room_presence', { p_room_id: roomId, p_connection_id: connectionId });
    };
  }, [roomId, enabled, user?.id, session?.access_token]);

  const onlineUserIds = new Set(
    rows
      .filter((row) => {
        const timestamp = Date.parse(row.last_seen_at);
        const age = now - timestamp;
        return Number.isFinite(timestamp) && age < ONLINE_WINDOW_MS && age > -30_000;
      })
      .map((row) => row.user_id),
  );

  return { onlineUserIds, status };
}
