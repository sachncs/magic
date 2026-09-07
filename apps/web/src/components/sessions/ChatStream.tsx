/**
 * @fileoverview Chat stream. Subscribes to the session's WS event
 * log and renders the events in order. Each event is dispatched to
 * a card component based on its kind.
 */

import {useQuery} from '@tanstack/react-query';
import {get} from '@/lib/api';
import {useWebSocket} from '@/lib/ws';
import type {WsEvent} from '@magic/shared/events';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {ScrollArea} from '@/components/ui';
import {ToolCardView} from '@/components/cards/ToolCardView';
import {CheckPointCard} from '@/components/cards/CheckPointCard';
import {MessageCard} from '@/components/cards/MessageCard';
import {CostBadge} from '@/components/sessions/CostBadge';

interface ChatStreamProps {
  sessionId: string;
}

/**
 * Renders the session's event log in a scrollable column. Uses WS for
 * live updates and a TanStack Query as the read cache.
 */
export function ChatStream({sessionId}: ChatStreamProps) {
  // Initial fetch (REST); WS pushes deltas into the same query key.
  const initial = useQuery({
    queryKey: ['session', sessionId, 'events'],
    queryFn: () => get<WsEvent[]>(`/api/sessions/${sessionId}/events`),
    refetchOnMount: false,
  });

  useWebSocket(sessionId, '__placeholder_token__');

  const events = initial.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-medium text-muted-foreground">
          {events.length} event(s)
        </h1>
        <CostBadge sessionId={sessionId} />
      </div>
      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-2">
          {events.map((e, i) => (
            <EventRow key={`${e.type}-${i}-${e.ts}`} event={e} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function EventRow({event}: {event: WsEvent}) {
  switch (event.type) {
    case 'message':
      return <MessageCard event={event} />;
    case 'toolUse':
      return <ToolCardView event={event} />;
    case 'checkpoint':
      return <CheckPointCard event={event} />;
    case 'nodeStart':
      return (
        <Card className="bg-muted/30">
          <CardHeader className="py-2">
            <CardTitle className="text-xs">▶ {event.nodeId}</CardTitle>
          </CardHeader>
        </Card>
      );
    case 'nodeEnd':
      return (
        <Card className="bg-muted/30">
          <CardContent className="py-1 text-xs text-muted-foreground">
            ◼ {event.nodeId} ({event.status}, {event.durationMs}ms)
          </CardContent>
        </Card>
      );
    case 'done':
      return (
        <Card>
          <CardContent className="py-2 text-sm">
            Done ({event.stopReason}).
          </CardContent>
        </Card>
      );
    case 'error':
      return (
        <Card className="border-destructive">
          <CardContent className="py-2 text-sm text-destructive">
            {event.message}
          </CardContent>
        </Card>
      );
    case 'costUpdate':
      return (
        <Card>
          <CardContent className="py-1 text-xs text-muted-foreground">
            cost: ${event.sessionCostUsd.toFixed(4)} / ${event.capUsd.toFixed(2)}
          </CardContent>
        </Card>
      );
    default:
      return (
        <Card>
          <CardContent className="py-1 text-xs text-muted-foreground">
            {event.type}
          </CardContent>
        </Card>
      );
  }
}
