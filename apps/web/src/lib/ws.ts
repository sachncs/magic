/**
 * @fileoverview WebSocket hook. Connects to `/ws/sessions/:id?token=...`,
 * re-emits parsed events into the TanStack Query cache so components
 * subscribed via `useQuery` re-render automatically.
 */

import {useEffect, useRef} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import type {WsEvent} from '@magic/shared/events';

export interface UseWebSocketOptions {
  /** Called for every received event after cache dispatch. */
  onEvent?: (event: WsEvent) => void;
  /** Reconnect on close. Default true. */
  reconnect?: boolean;
}

/**
 * Connects to the session WebSocket and dispatches events to the
 * TanStack Query cache. Keyed by `['session', id, 'events']`.
 */
export function useWebSocket(
  sessionId: string,
  wsToken: string | undefined,
  opts: UseWebSocketOptions = {},
): void {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | undefined>(undefined);
  const lastEventIdRef = useRef<number>(0);

  useEffect(() => {
    if (wsToken === undefined || sessionId === '') {
      return;
    }
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/sessions/${sessionId}?token=${wsToken}`;
    const connect = (): void => {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const event = JSON.parse(ev.data) as WsEvent;
          // WsEvent union members don't all expose `id`; advance the
          // cursor by frame count when the field is absent so the
          // ref still serves as a dedupe signal for resumable clients.
          const frameId = lastEventIdRef.current + 1;
          lastEventIdRef.current = frameId;
          qc.setQueryData<WsEvent[]>(['session', sessionId, 'events'], (prev) => [
            ...(prev ?? []),
            event,
          ]);
          opts.onEvent?.(event);
        } catch {
          // Ignore malformed frames.
        }
      };
      ws.onclose = () => {
        if (opts.reconnect !== false) {
          setTimeout(connect, 1000);
        }
      };
    };
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [sessionId, wsToken, qc, opts]);
}
