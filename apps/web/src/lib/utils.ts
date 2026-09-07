import {type ClassValue, clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';

/**
 * Conditionally joins class names. Tailwind-aware via `tailwind-merge`
 * so conflicting utilities resolve correctly.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
