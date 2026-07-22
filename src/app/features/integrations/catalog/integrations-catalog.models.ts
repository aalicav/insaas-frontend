import { Connection, IntegrationProvider } from '../../../core/models/connection.models';

export type CatalogItemState = 'connected' | 'attention' | 'available' | 'coming_soon';

export interface CatalogItem {
  provider: IntegrationProvider;
  connections: Connection[];
  state: CatalogItemState;
  primaryConnection: Connection | null;
}

export function isProviderConnectable(provider: IntegrationProvider): boolean {
  if (!provider.connectable) return false;
  if (provider.hasRuntimeAdapter === false) return false;
  return true;
}

export function resolveCatalogState(
  provider: IntegrationProvider,
  connections: Connection[],
): CatalogItemState {
  if (connections.length) {
    const hasAttention = connections.some(
      (c) =>
        c.status === 'error' ||
        c.status === 'pending' ||
        (c.status === 'connected' && !c.lastSyncedAt),
    );
    return hasAttention ? 'attention' : 'connected';
  }
  return isProviderConnectable(provider) ? 'available' : 'coming_soon';
}

function ownedRank(item: CatalogItem): number {
  if (!item.connections.length) return 100;
  if (item.state === 'attention') return 0;
  if (item.connections.some((c) => c.status === 'connected')) return 1;
  return 2;
}

function sectionRank(state: CatalogItemState): number {
  switch (state) {
    case 'connected':
    case 'attention':
      return 0;
    case 'available':
      return 1;
    case 'coming_soon':
      return 2;
  }
}

/** Merge catalog providers with org connections. Owned providers first. */
export function buildCatalog(
  providers: IntegrationProvider[],
  connections: Connection[],
): CatalogItem[] {
  const byProvider = new Map<string, Connection[]>();
  for (const conn of connections) {
    const key = conn.provider;
    const list = byProvider.get(key) ?? [];
    list.push(conn);
    byProvider.set(key, list);
  }

  const items: CatalogItem[] = providers.map((provider) => {
    const conns = byProvider.get(provider.key) ?? [];
    return {
      provider,
      connections: conns,
      state: resolveCatalogState(provider, conns),
      primaryConnection: conns[0] ?? null,
    };
  });

  // Include orphan connections whose provider key is missing from catalog.
  for (const [key, conns] of byProvider) {
    if (providers.some((p) => p.key === key)) continue;
    const synthetic: IntegrationProvider = {
      key,
      displayName: key,
      enabled: true,
      connectable: false,
      hasRuntimeAdapter: false,
      sortOrder: 9999,
    };
    items.push({
      provider: synthetic,
      connections: conns,
      state: resolveCatalogState(synthetic, conns),
      primaryConnection: conns[0] ?? null,
    });
  }

  return items.sort((a, b) => {
    const section = sectionRank(a.state) - sectionRank(b.state);
    if (section !== 0) return section;
    const owned = ownedRank(a) - ownedRank(b);
    if (owned !== 0) return owned;
    const order = (a.provider.sortOrder ?? 999) - (b.provider.sortOrder ?? 999);
    if (order !== 0) return order;
    return (a.provider.displayName || a.provider.key).localeCompare(
      b.provider.displayName || b.provider.key,
      'pt-BR',
    );
  });
}

export function filterCatalog(
  items: CatalogItem[],
  opts: { q?: string; category?: string; connectableOnly?: boolean },
): CatalogItem[] {
  const q = opts.q?.trim().toLowerCase() ?? '';
  return items.filter((item) => {
    if (opts.connectableOnly && item.state === 'coming_soon' && !item.connections.length) {
      return false;
    }
    if (opts.category && (item.provider.category || 'other') !== opts.category) {
      return false;
    }
    if (!q) return true;
    const hay = [
      item.provider.key,
      item.provider.displayName,
      item.provider.category,
      ...item.connections.map((c) => c.displayName || ''),
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export function partitionCatalog(items: CatalogItem[]): {
  owned: CatalogItem[];
  available: CatalogItem[];
  comingSoon: CatalogItem[];
} {
  const owned: CatalogItem[] = [];
  const available: CatalogItem[] = [];
  const comingSoon: CatalogItem[] = [];
  for (const item of items) {
    if (item.connections.length) owned.push(item);
    else if (item.state === 'available') available.push(item);
    else comingSoon.push(item);
  }
  return { owned, available, comingSoon };
}
