/**
 * @fileoverview Tool definition helper. The callback's `input` is
 * inferred from the Zod schema's output type, so consumers get
 * fully-typed tool calls without manual casts.
 */

import {z, type ZodType, type ZodTypeAny} from 'zod';

/**
 * The result of a tool invocation. Either ok with content blocks, or
 * an error.
 */
export type ToolResult = {
  readonly status: 'success' | 'error';
  readonly content: ReadonlyArray<{type: 'text'; text: string}>;
  readonly error?: string;
};

/**
 * A tool definition: metadata + a callable whose input is the
 * zod-inferred type of `inputSchema`.
 */
export interface ToolDefinition<TSchema extends ZodTypeAny = ZodTypeAny> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: TSchema;
  readonly callback: (input: z.infer<TSchema>) => Promise<ToolResult>;
}

/**
 * Creates a tool definition. Pass a real zod schema; the callback's
 * `input` parameter is typed as the inferred shape.
 *
 * @example
 *   tool({
 *     name: 'repo_index',
 *     description: '...',
 *     inputSchema: z.object({path: z.string()}),
 *     callback: async (input) => {
 *       // input is { path: string }
 *     },
 *   })
 */
export function tool<TSchema extends ZodTypeAny>(
  def: ToolDefinition<TSchema>,
): ToolDefinition<TSchema> {
  return def;
}

/**
 * Convenience: build a success result.
 */
export function ok(text: string): ToolResult {
  return {status: 'success', content: [{type: 'text', text}]};
}

/**
 * Convenience: build an error result.
 */
export function err(error: string): ToolResult {
  return {status: 'error', content: [{type: 'text', text: error}], error};
}

/**
 * Convenience: define a tool with an object schema inferred from a
 * type. Useful when you have a TypeScript type but no runtime zod
 * schema at hand. The returned callback's input is `unknown`; this
 * is a typing escape hatch — prefer real zod schemas.
 */
export function looseTool(def: {
  readonly name: string;
  readonly description: string;
  readonly callback: (input: unknown) => Promise<ToolResult>;
}): ToolDefinition<ZodType<unknown>> {
  const passthrough = z.unknown();
  return {
    name: def.name,
    description: def.description,
    inputSchema: passthrough,
    callback: def.callback,
  };
}
