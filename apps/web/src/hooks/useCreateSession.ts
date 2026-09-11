/**
 * @fileoverview Hook to create a new session. POSTs to
 * /api/sessions and navigates to the new session's chat. Also stashes
 * the returned wsToken (and apiToken if the server is auth-enabled)
 * into the session-token store so WS connections authenticate.
 */

import {useMutation} from '@tanstack/react-query';
import {useNavigate} from '@tanstack/react-router';
import {post} from '@/lib/api';
import {useSessionTokenStore} from '@/stores/session';

interface CreateSessionInput {
  repo: string;
  task: string;
}

interface CreateSessionResponse {
  sessionId: string;
  workspaceId?: string;
  wsToken: string;
  apiToken?: string;
}

/**
 * Returns a mutation that creates a session and navigates to it.
 */
export function useCreateSession() {
  const navigate = useNavigate();
  const setSession = useSessionTokenStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: CreateSessionInput) =>
      post<CreateSessionResponse>('/api/sessions', input),
    onSuccess: (data) => {
      setSession(data.sessionId, data.wsToken, data.apiToken);
      void navigate({to: '/sessions/$id', params: {id: data.sessionId}});
    },
  });
}
