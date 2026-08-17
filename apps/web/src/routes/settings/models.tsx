/**
 * @fileoverview Settings: models. One card per provider with presence
 * indicator, write-only API key input, test-connection probe.
 */

import {Card, CardContent, CardHeader, CardTitle, Input, Button, Label, Badge} from '@/components/ui';
import {post} from '@/lib/api';
import {useState} from 'react';

interface ProviderCard {
  id: string;
  title: string;
  envKey: string;
  description: string;
}

const PROVIDERS: ProviderCard[] = [
  {id: 'bedrock', title: 'Amazon Bedrock', envKey: 'AWS_BEARER_TOKEN_BEDROCK', description: 'Set AWS creds or bearer token.'},
  {id: 'anthropic', title: 'Anthropic', envKey: 'ANTHROPIC_API_KEY', description: 'Direct Anthropic API.'},
  {id: 'openai', title: 'OpenAI', envKey: 'OPENAI_API_KEY', description: 'OpenAI or OpenAI-compatible.'},
  {id: 'google', title: 'Google', envKey: 'GOOGLE_API_KEY', description: 'Gemini models.'},
  {id: 'minimax', title: 'MiniMax', envKey: 'MINIMAX_API_KEY', description: 'MiniMax (OpenAI-compatible).'},
  {id: 'local', title: 'Local (Ollama / llama.cpp)', envKey: 'MAGIC_MODEL_API_KEY', description: 'Local model server.'},
];

export function SettingsModels() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Models</h1>
      {PROVIDERS.map((p) => (
        <ProviderCardItem key={p.id} card={p} />
      ))}
    </div>
  );
}

function ProviderCardItem({card}: {card: ProviderCard}) {
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState<{ok: boolean; message: string} | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {card.title}
          {probe !== null ? (
            <Badge variant={probe.ok ? 'default' : 'destructive'}>{probe.ok ? 'OK' : 'FAIL'}</Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{card.description}</p>
        <div className="space-y-2">
          <Label htmlFor={card.id}>{card.envKey}</Label>
          <Input id={card.id} type="password" placeholder="••••••••" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={probing}
            onClick={() => {
              setProbing(true);
              post<{ok: boolean; message: string}>('/api/settings/test-connection', {provider: card.id})
                .then((r) => {
                  setProbe(r);
                })
                .catch((e: Error) => {
                  setProbe({ok: false, message: e.message});
                })
                .finally(() => {
                  setProbing(false);
                });
            }}
          >
            {probing ? 'Testing…' : 'Test connection'}
          </Button>
          {probe !== null ? <span className="text-xs text-muted-foreground">{probe.message}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
