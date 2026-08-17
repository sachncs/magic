/**
 * @fileoverview Tool card view. Dispatches to a kind-specific renderer
 * based on the `kind` field of the toolUse event.
 */

import type {ToolUseEvent} from '@magic/shared/events';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {Badge} from '@/components/ui';

interface ToolCardViewProps {
  event: ToolUseEvent;
}

/**
 * Stub card renderer. In v1, the `presentCall` payload travels on
 * the event; the kind-specific components (DiffCard, TerminalCard,
 * etc.) are slotted in here.
 */
export function ToolCardView({event}: ToolCardViewProps) {
  const call = event.presentCall as {kind?: string; preview?: string};
  const kind = call?.kind ?? 'generic';
  const preview = call?.preview ?? event.toolName;
  return (
    <Card>
      <CardHeader className="py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs">{event.toolName}</CardTitle>
          <Badge variant="secondary" className="text-[10px]">{kind}</Badge>
        </div>
      </CardHeader>
      <CardContent className="font-mono text-xs text-muted-foreground">{preview}</CardContent>
    </Card>
  );
}
