/**
 * @fileoverview Shell layout. Top bar (logo, sessions dropdown,
 * settings cog) + sidebar + main panel + drawer slots. Self-sufficient:
 * never throws on child failure.
 */

import type {ReactNode} from 'react';
import {Component, type ErrorInfo} from 'react';
import {Link, useRouterState} from '@tanstack/react-router';
import {Settings, ListTodo} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

interface ShellProps {
  readonly children: ReactNode;
}

/**
 * Error boundary that renders a fallback instead of crashing the
 * whole shell. Critical for the "self-sufficient shell" property.
 */
class ShellErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  override state: {error: Error | null} = {error: null};
  static getDerivedStateFromError(error: Error): {error: Error} {
    return {error};
  }
  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[shell] child crashed:', error, info);
  }
  override render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div className="p-4 text-sm text-destructive">
          A route failed to render. See the console for details.
        </div>
      );
    }
    return this.props.children;
  }
}

export function Shell({children}: ShellProps) {
  const path = useRouterState({select: (s) => s.location.pathname});
  return (
    <div className="grid h-full grid-rows-[auto_1fr]">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-semibold tracking-tight">
            magic
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/"
              className={cn(
                'rounded px-2 py-1 hover:bg-muted',
                path === '/' && 'bg-muted',
              )}
            >
              <ListTodo className="mr-1 inline h-4 w-4" />
              Sessions
            </Link>
            <Link
              to="/settings/general"
              className={cn(
                'rounded px-2 py-1 hover:bg-muted',
                path.startsWith('/settings') && 'bg-muted',
              )}
            >
              <Settings className="mr-1 inline h-4 w-4" />
              Settings
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => {
            window.dispatchEvent(new CustomEvent('magic:toggle-palette'));
          }}>
            ⌘K
          </Button>
        </div>
      </header>
      <main className="overflow-hidden">
        <ShellErrorBoundary>{children}</ShellErrorBoundary>
      </main>
    </div>
  );
}
