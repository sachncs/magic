/**
 * @fileoverview Settings: credentials. Redacted views; write-only
 * update path.
 */

import {Card, CardContent, CardHeader, CardTitle, Badge, Input, Label, Button} from '@/components/ui';

const CREDENTIAL_NAMES = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
  'MINIMAX_API_KEY',
  'AWS_BEARER_TOKEN_BEDROCK',
  'MAGIC_API_TOKEN',
];

export function SettingsCredentials() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Credentials</h1>
      <Card>
        <CardHeader>
          <CardTitle>Stored credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Values are encrypted at rest. The UI never displays the stored value — only whether one is set.
          </p>
          {CREDENTIAL_NAMES.map((name) => (
            <div key={name} className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">{name}</Badge>
              <Badge variant="secondary">encrypted</Badge>
              <Input type="password" placeholder="Set new value" className="flex-1" />
              <Button size="sm" variant="outline">Save</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
