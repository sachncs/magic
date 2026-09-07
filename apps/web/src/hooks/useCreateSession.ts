/**
 * @fileoverview Hook to create a new session. POSTs to
 * /api/sessions and navigates to the new session's chat.
 */

import {useMutation} from '@tanstack/react-query';
import {useNavigate} from '@tanstack/react-router';
import {post} from '@/lib/api';

interface CreateSessionInput {
  repo: string;
  task: string;
}

interface CreateSessionResponse {
  sessionId: string;
  wsToken: string;
}

/**
 * Returns a mutation that creates a session and navigates to it.
 */
export function useCreateSession() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (input: CreateSessionInput) =>
      post<CreateSessionResponse>('/api/sessions', input),
    onSuccess: (data) => {
      void navigate({to: '/sessions/$id', params: {id: data.sessionId}});
    },
  });
}
