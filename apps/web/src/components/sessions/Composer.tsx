/**
 * @fileoverview Chat composer. Sends user messages to the graph; on
 * `/` opens the commands palette.
 */

import {useState, type KeyboardEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useUiStore} from '@/stores/ui';
import {post} from '@/lib/api';

interface ComposerProps {
  sessionId: string;
}

/**
 * Composer. Pressing `/` opens the commands palette; pressing Enter
 * sends; Shift+Enter inserts a newline.
 */
export function Composer({sessionId}: ComposerProps) {
  const [text, setText] = useState('');
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  const send = async (): Promise<void> => {
    if (text.trim().length === 0) {
      return;
    }
    await post(`/api/sessions/${sessionId}/invoke`, {message: text});
    setText('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === '/' && text === '') {
      e.preventDefault();
      setPaletteOpen(true);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
        onKeyDown={onKey}
        placeholder="Message the agent (type / for commands)…"
      />
      <Button onClick={() => {
        void send();
      }}>Send</Button>
    </div>
  );
}
