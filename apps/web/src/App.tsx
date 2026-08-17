import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {RouterProvider, createRouter, createRootRoute, createRoute, Outlet} from '@tanstack/react-router';
import {ThemeProvider} from 'next-themes';
import {Toaster} from 'sonner';
import {TooltipProvider} from '@/components/ui';
import {Shell} from '@/components/shell/Shell';
import {SessionsPage} from '@/routes/sessions.$id';
import {SettingsGeneral} from '@/routes/settings/general';
import {SettingsModels} from '@/routes/settings/models';
import {SettingsPermissions} from '@/routes/settings/permissions';
import {SettingsCredentials} from '@/routes/settings/credentials';

const queryClient = new QueryClient({
  defaultOptions: {queries: {staleTime: 30_000, refetchOnWindowFocus: false}},
});

const rootRoute = createRootRoute({
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <SessionsPage sessionId="__new__" />,
});

const sessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions/$id',
  component: () => {
    const {id} = sessionRoute.useParams();
    return <SessionsPage sessionId={id} />;
  },
});

const settingsGeneralRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/general',
  component: SettingsGeneral,
});

const settingsModelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/models',
  component: SettingsModels,
});

const settingsPermissionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/permissions',
  component: SettingsPermissions,
});

const settingsCredentialsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/credentials',
  component: SettingsCredentials,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  sessionRoute,
  settingsGeneralRoute,
  settingsModelsRoute,
  settingsPermissionsRoute,
  settingsCredentialsRoute,
]);

const router = createRouter({routeTree});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

/**
 * Root app component. Wires the global providers:
 *   - QueryClient: server-state cache + WS event dispatch
 *   - ThemeProvider: light/dark via next-themes
 *   - TooltipProvider: Radix tooltip singleton
 *   - Toaster: sonner notifications
 *   - RouterProvider: TanStack Router
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system">
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
