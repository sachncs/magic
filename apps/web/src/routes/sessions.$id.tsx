/**
 * @fileoverview Sessions route. Lists past sessions in a sidebar; the
 * main panel renders the chat composer + message stream.
 */

import {useState} from 'react';
import {Button} from '@/components/ui';
import {Input} from '@/components/ui';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {ChatStream} from '@/components/sessions/ChatStream';
import {Composer} from '@/components/sessions/Composer';
import {useCreateSession} from '@/hooks/useCreateSession';

interface SessionsPageProps {
  sessionId: string;
}

/**
 * Sessions page. When `sessionId === '__new__'`, shows the new-session
 * form; otherwise renders the chat for the given session.
 */
export function SessionsPage({sessionId}: SessionsPageProps) {
  if (sessionId === '__new__') {
    return <NewSessionForm />;
  }
  return <ChatView sessionId={sessionId} />;
}

function NewSessionForm() {
  const [repo, setRepo] = useState('');
  const [task, setTask] = useState('');
  const create = useCreateSession();

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">New session</h1>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>What should magic do?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Repository (URL or local path)"
            value={repo}
            onChange={(e) => {
              setRepo(e.target.value);
            }}
          />
          <Input
            placeholder="Task (e.g. 'add a /health endpoint')"
            value={task}
            onChange={(e) => {
              setTask(e.target.value);
            }}
          />
          <Button
            disabled={repo.length === 0 || task.length === 0 || create.isPending}
            onClick={() => {
              create.mutate({repo, task});
            }}
          >
            {create.isPending ? 'Creating…' : 'Start'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ChatView({sessionId}: {sessionId: string}) {
  return (
    <div className="grid h-full grid-cols-[1fr_320px]">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          <ChatStream sessionId={sessionId} />
        </div>
        <div className="border-t border-border p-2">
          <Composer sessionId={sessionId} />
        </div>
      </div>
      <aside className="border-l border-border bg-card/50 p-4">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Session</h2>
        <p className="font-mono text-xs">{sessionId}</p>
      </aside>
    </div>
  );
}
