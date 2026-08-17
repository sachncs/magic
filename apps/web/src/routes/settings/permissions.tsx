/**
 * @fileoverview Settings: permissions. Single-toggle for
 * read-only / workspace-write / danger-full-access.
 */

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Label} from '@/components/ui/label';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {useState} from 'react';

export function SettingsPermissions() {
  const [preset, setPreset] = useState('workspace-write');
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Permissions</h1>
      <Card>
        <CardHeader>
          <CardTitle>Permission preset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            One switch fans out to sandbox mode + approval policy + writable roots.
          </p>
          <Tabs value={preset} onValueChange={setPreset}>
            <TabsList>
              <TabsTrigger value="read-only">Read-only</TabsTrigger>
              <TabsTrigger value="workspace-write">Workspace write</TabsTrigger>
              <TabsTrigger value="danger-full-access">Danger full access</TabsTrigger>
            </TabsList>
            <TabsContent value="read-only" className="text-sm">
              Bash refused outside repo. File edits blocked.
            </TabsContent>
            <TabsContent value="workspace-write" className="text-sm">
              Bash + edits allowed inside the repo. Destructive commands denied.
            </TabsContent>
            <TabsContent value="danger-full-access" className="text-sm text-destructive">
              Bash allowed everywhere. No denylist. Use with care.
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
