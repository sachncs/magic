/**
 * @fileoverview Stub shadcn UI components. In a real install, these
 * are generated via `npx shadcn@latest add <name>`. We ship minimal
 * implementations so the build succeeds before the CLI is run.
 *
 * To regenerate with the real components:
 *
 *   npx shadcn@latest init
 *   npx shadcn@latest add button card input label select switch tabs
 *                        textarea tooltip scroll-area separator badge
 *                        dialog sheet dropdown-menu
 */

import {forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type HTMLAttributes} from 'react';
import {cn} from '@/lib/utils';

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'; size?: 'default' | 'sm' | 'lg' | 'icon'}>(
  ({className, variant = 'default', size = 'default', ...props}, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        variant === 'outline' && 'border border-input bg-background hover:bg-accent',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'ghost' && 'hover:bg-accent',
        size === 'default' && 'h-9 px-4 py-2',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'lg' && 'h-10 px-6',
        size === 'icon' && 'h-9 w-9',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({className, ...props}, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({className, ...props}, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[60px] w-full rounded border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({className, ...props}, ref) => (
    <div ref={ref} className={cn('rounded border border-border bg-card text-card-foreground shadow-sm', className)} {...props} />
  ),
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({className, ...props}, ref) => <div ref={ref} className={cn('flex flex-col space-y-1 p-4', className)} {...props} />
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({className, ...props}, ref) => <h3 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
);
CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({className, ...props}, ref) => <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />
);
CardContent.displayName = 'CardContent';

export const Badge = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement> & {variant?: 'default' | 'secondary' | 'destructive' | 'outline'}>(
  ({className, variant = 'default', ...props}, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary text-primary-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground',
        variant === 'outline' && 'border border-input',
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';

export const Label = forwardRef<HTMLLabelElement, HTMLAttributes<HTMLLabelElement> & {htmlFor?: string}>(
  ({className, ...props}, ref) => (
    <label ref={ref} className={cn('text-sm font-medium leading-none', className)} {...props} />
  ),
);
Label.displayName = 'Label';

export const Switch = forwardRef<HTMLButtonElement, {checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (v: boolean) => void; className?: string; id?: string}>(
  ({className, checked, defaultChecked, onCheckedChange, ...props}, ref) => {
    const isControlled = checked !== undefined;
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isControlled ? checked : defaultChecked ?? false}
        onClick={() => {
          if (!isControlled) {
            onCheckedChange?.(!defaultChecked);
          } else {
            onCheckedChange?.(!checked);
          }
        }}
        className={cn(
          'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
          (isControlled ? checked : defaultChecked) ? 'bg-primary' : 'bg-muted',
          className,
        )}
        {...props}
      />
    );
  },
);
Switch.displayName = 'Switch';

export const ScrollArea = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({className, ...props}, ref) => <div ref={ref} className={cn('overflow-y-auto', className)} {...props} />
);
ScrollArea.displayName = 'ScrollArea';

// Tabs (very minimal; shadcn uses Radix which is heavier)
export const Tabs = ({children, value, onValueChange, className}: {children: React.ReactNode; value: string; onValueChange: (v: string) => void; className?: string}) => (
  <div className={className} data-value={value} onChange={(e) => onValueChange((e.target as HTMLInputElement).value)}>
    {children}
  </div>
);
export const TabsList = ({children, className}: {children: React.ReactNode; className?: string}) => (
  <div className={cn('inline-flex rounded bg-muted p-1', className)} role="tablist">{children}</div>
);
export const TabsTrigger = ({children, value, className}: {children: React.ReactNode; value: string; className?: string}) => (
  <button
    type="button"
    role="tab"
    data-value={value}
    className={cn('rounded px-3 py-1 text-sm data-[active=true]:bg-background', className)}
  >
    {children}
  </button>
);
export const TabsContent = ({children, value, className}: {children: React.ReactNode; value: string; className?: string}) => (
  <div role="tabpanel" data-value={value} className={cn('pt-3', className)}>
    {children}
  </div>
);

// Select (very minimal; shadcn uses Radix Select)
export const Select = ({children, value, onValueChange, defaultValue}: {children: React.ReactNode; value?: string; onValueChange?: (v: string) => void; defaultValue?: string}) => (
  <div>{children}</div>
);
export const SelectTrigger = ({children, id}: {children: React.ReactNode; id?: string}) => (
  <div id={id}>{children}</div>
);
export const SelectValue = () => null;
export const SelectContent = ({children}: {children: React.ReactNode}) => <div>{children}</div>;
export const SelectItem = ({children, value}: {children: React.ReactNode; value: string}) => (
  <button type="button" data-value={value} onClick={() => undefined}>{children}</button>
);

// Tooltip provider placeholder (real impl wraps Radix)
export const TooltipProvider = ({children}: {children: React.ReactNode; delayDuration?: number}) => (
  <>{children}</>
);
