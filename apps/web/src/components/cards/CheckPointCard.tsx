/**
 * @fileworkspace Checkpoint approval card. Shown on `checkpoint` WS
 * events; user clicks Approve or Reject to send a WS message back.
 */

import {useState} from 'react';
import {Button} from '@/components/ui';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {post} from '@/lib/api';
import type {CheckpointEvent as CheckPointEvent} from '@magic/shared/events';

interface CheckPointCardProps {
  event: CheckPointEvent;
}

/**
 * Renders a plan/diff/destructive checkpoint and waits for the user
 * to approve or reject. On resolve, POSTs back to the server which
 * unblocks the graph.
 */
export function CheckPointCard({event}: CheckPointCardProps) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const submit = async (approved: boolean): Promise<void> => {
    await post(`/api/sessions/${event.checkpointId}/resolve`, {approved, reason});
    setSubmitted(true);
  };
  if (submitted) {
    return (
      <Card>
        <CardContent className="py-2 text-xs text-muted-foreground">
          {event.kind} checkpoint resolved
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-primary">
      <CardHeader className="py-2">
        <CardTitle className="text-xs">{event.kind} checkpoint</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {event.message !== undefined ? (
          <p className="text-sm">{event.message}</p>
        ) : null}
        <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
        <textarea
          className="w-full rounded border border-input bg-background p-2 text-xs"
          placeholder="Optional reason (used on reject)"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
          }}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => {
            void submit(true);
          }}>Approve</Button>
          <Button size="sm" variant="destructive" onClick={() => {
            void submit(false);
          }}>Reject</Button>
        </div>
      </CardContent>
    </Card>
  );
}
