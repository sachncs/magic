/**
 * @fileoverview Renders a single chat message in the stream.
 */

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {cn} from '@/lib/utils';
import type {MessageEvent} from '@magic/shared/events';

interface MessageCardProps {
  event: MessageEvent;
}

/**
 * Renders a chat message with role-based styling.
 */
export function MessageCard({event}: MessageCardProps) {
  return (
    <Card className={cn(
      event.role === 'user' && 'border-primary/40',
      event.role === 'assistant' && 'border-accent/40',
    )}>
      <CardHeader className="py-2">
        <CardTitle className="text-xs text-muted-foreground">{event.role}</CardTitle>
      </CardHeader>
      <CardContent className="whitespace-pre-wrap text-sm">{event.content}</CardContent>
    </Card>
  );
}
