/**
 * @fileoverview Live cost badge. Subscribes to costUpdate WS events
 * and shows the current cost in the sidebar.
 */

import {useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {Badge} from '@/components/ui/badge';
import {useWebSocket} from '@/lib/ws';

interface CostBadgeProps {
  sessionId: string;
}

interface CostState {
  cost: number;
  cap: number;
}

/**
 * Shows the current session cost. Subscribes to WS for updates.
 */
export function CostBadge({sessionId}: CostBadgeProps) {
  const [state, setState] = useState<CostState>({cost: 0, cap: 0});
  const qc = useQueryClient();
  useWebSocket(sessionId, '__placeholder_token__', {
    onEvent: (event) => {
      if (event.type === 'costUpdate') {
        setState({cost: event.sessionCostUsd, cap: event.capUsd});
      } else if (event.type === 'titleUpdate') {
        qc.invalidateQueries({queryKey: ['session', sessionId]});
      }
    },
  });
  useEffect(() => {
    // no-op; placeholder
  }, []);
  return (
    <Badge variant="outline" className="font-mono text-xs">
      ${state.cost.toFixed(4)}
      {state.cap > 0 ? ` / $${state.cap.toFixed(2)}` : ''}
    </Badge>
  );
}
