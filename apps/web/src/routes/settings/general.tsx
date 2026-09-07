/**
 * @fileoverview Settings: general. Data dir, repo cache toggle,
 * persistence backend selector.
 */

import {Card, CardContent, CardHeader, CardTitle, Input, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label} from '@/components/ui';

export function SettingsGeneral() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataDir">Data directory</Label>
            <Input id="dataDir" defaultValue="./.magic" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Cache cloned repos</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, repos are cached under the data dir and reused.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="space-y-2">
            <Label htmlFor="persistence">Persistence backend</Label>
            <Select defaultValue="jsonl">
              <SelectTrigger id="persistence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jsonl">JSONL (simple, default)</SelectItem>
                <SelectItem value="sqlite">SQLite (FTS5 search, scales)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
