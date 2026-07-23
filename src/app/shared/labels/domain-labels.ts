const STATUS_LABELS: Record<string, string> = {
  connected: 'Conectado',
  disconnected: 'Desconectado',
  pending: 'Pendente',
  error: 'Erro',
  failed: 'Falhou',
  success: 'Concluído',
  ok: 'Ok',
  active: 'Ativo',
  inactive: 'Inativo',
  suspended: 'Suspenso',
  invited: 'Convidado',
  queued: 'Na fila',
  running: 'Em execução',
  unknown: 'Desconhecido',
};

const AUTH_TYPE_LABELS: Record<string, string> = {
  oauth: 'OAuth',
  oauth2: 'OAuth 2.0',
  oauth2_authorization_code: 'OAuth (autorização)',
  oauth2authorizationcode: 'OAuth (autorização)',
  oauth2_client_credentials: 'Credenciais de aplicativo',
  oauth2clientcredentials: 'Credenciais de aplicativo',
  client_credentials: 'Credenciais de aplicativo',
  clientcredentials: 'Credenciais de aplicativo',
  api_key: 'Chave de API / token',
  apikey: 'Chave de API / token',
  basic: 'Usuário e senha',
  service_account: 'Conta de serviço',
  serviceaccount: 'Conta de serviço',
};

const AUTH_TYPE_DESCRIPTIONS: Record<string, string> = {
  oauth2_authorization_code:
    'Você será redirecionado ao provedor para autorizar o acesso.',
  oauth2authorizationcode:
    'Você será redirecionado ao provedor para autorizar o acesso.',
  oauth2_client_credentials:
    'Informe Tenant ID, Client ID e Client Secret do app registrado.',
  oauth2clientcredentials:
    'Informe Tenant ID, Client ID e Client Secret do app registrado.',
  client_credentials:
    'Informe Tenant ID, Client ID e Client Secret do app registrado.',
  api_key: 'Cole tokens, subdomínio ou chaves geradas no painel do provedor.',
  apikey: 'Cole tokens, subdomínio ou chaves geradas no painel do provedor.',
  service_account:
    'Use e-mail e chave privada de uma service account (ex.: Google).',
  serviceaccount:
    'Use e-mail e chave privada de uma service account (ex.: Google).',
};

const PROVIDER_BLURBS: Record<string, string> = {
  google: 'Sincronize usuários e licenças do Google Workspace. Times são atribuídos automaticamente.',
  google_workspace:
    'Sincronize usuários e licenças do Google Workspace. Times são atribuídos automaticamente.',
  microsoft:
    'Sincronize identidades e licenças do Microsoft 365. Times são atribuídos automaticamente.',
  microsoft365:
    'Sincronize identidades e licenças do Microsoft 365. Times são atribuídos automaticamente.',
  microsoft_365:
    'Sincronize identidades e licenças do Microsoft 365. Times são atribuídos automaticamente.',
  azure: 'Conecte o Azure AD / Entra ID. Pessoas e times são preenchidos no sync.',
  azure_ad: 'Conecte o Azure AD / Entra ID. Pessoas e times são preenchidos no sync.',
  okta: 'Sincronize usuários do Okta. Times são atribuídos automaticamente a partir do departamento.',
  onelogin:
    'Sincronize usuários do OneLogin. Times são atribuídos automaticamente a partir do departamento.',
  jumpcloud:
    'Sincronize usuários do JumpCloud. Times são atribuídos automaticamente a partir do departamento.',
  oracle_ebs:
    'Importe centros de custo e funcionários do Oracle EBS. O sync atribui centro de custo automaticamente.',
  senior:
    'Importe a folha Senior (HCM). Admissão, demissão e matrícula passam a ser a fonte autoritativa do vínculo.',
  totvs_rm:
    'Importe a folha TOTVS RM. Admissão, demissão e matrícula passam a ser a fonte autoritativa do vínculo.',
};

const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google Workspace',
  google_workspace: 'Google Workspace',
  microsoft: 'Microsoft 365',
  microsoft365: 'Microsoft 365',
  microsoft_365: 'Microsoft 365',
  azure: 'Microsoft Entra ID',
  azure_ad: 'Microsoft Entra ID',
  okta: 'Okta',
  onelogin: 'OneLogin',
  jumpcloud: 'JumpCloud',
  oracle_ebs: 'Oracle EBS',
  senior: 'Senior Folha / HCM',
  totvs_rm: 'TOTVS RM Folha',
};

export interface ProviderVisual {
  initial: string;
  color: string;
  bg: string;
  /** Local SVG path under /assets/providers — component falls back if missing. */
  iconUrl?: string;
}

const PROVIDER_VISUALS: Record<string, ProviderVisual> = {
  google: { initial: 'G', color: '#34a853', bg: 'color-mix(in srgb, #34a853 18%, transparent)' },
  google_workspace: {
    initial: 'G',
    color: '#34a853',
    bg: 'color-mix(in srgb, #34a853 18%, transparent)',
  },
  microsoft: {
    initial: 'M',
    color: '#00a4ef',
    bg: 'color-mix(in srgb, #00a4ef 18%, transparent)',
  },
  microsoft365: {
    initial: 'M',
    color: '#00a4ef',
    bg: 'color-mix(in srgb, #00a4ef 18%, transparent)',
  },
  microsoft_365: {
    initial: 'M',
    color: '#00a4ef',
    bg: 'color-mix(in srgb, #00a4ef 18%, transparent)',
  },
  azure: {
    initial: 'A',
    color: '#0078d4',
    bg: 'color-mix(in srgb, #0078d4 18%, transparent)',
  },
  azure_ad: {
    initial: 'A',
    color: '#0078d4',
    bg: 'color-mix(in srgb, #0078d4 18%, transparent)',
  },
  okta: {
    initial: 'O',
    color: '#7c8ba0',
    bg: 'color-mix(in srgb, #7c8ba0 22%, transparent)',
  },
  onelogin: {
    initial: '1',
    color: '#00b2a9',
    bg: 'color-mix(in srgb, #00b2a9 18%, transparent)',
  },
  jumpcloud: {
    initial: 'J',
    color: '#19a4d2',
    bg: 'color-mix(in srgb, #19a4d2 18%, transparent)',
  },
  oracle_ebs: {
    initial: 'E',
    color: '#c74634',
    bg: 'color-mix(in srgb, #c74634 18%, transparent)',
  },
};

const DEFAULT_PROVIDER_VISUAL: ProviderVisual = {
  initial: '?',
  color: 'var(--ih-primary-light)',
  bg: 'color-mix(in srgb, var(--ih-primary) 18%, transparent)',
};

const STAT_LABELS: Record<string, string> = {
  created: 'Criadas',
  updated: 'Atualizadas',
  deleted: 'Removidas',
  failed: 'Falhas',
  errors: 'Erros',
  skipped: 'Ignoradas',
  total: 'Total',
  identities: 'Identidades',
  users: 'Usuários',
  licenses: 'Licenças',
  people: 'Pessoas',
  groups: 'Grupos',
  apps: 'Aplicativos',
  orgunits: 'Unidades org.',
  org_units: 'Unidades org.',
};

const ABSENCE_REASON_LABELS: Record<string, string> = {
  vacation: 'Férias',
  absence: 'Afastamento',
  sick: 'Atestado',
  recess: 'Recesso',
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  const key = status.toLowerCase();
  return STATUS_LABELS[key] ?? status;
}

export function absenceReasonLabel(reason: string | null | undefined): string {
  if (!reason) return '—';
  const key = reason.toLowerCase();
  return ABSENCE_REASON_LABELS[key] ?? reason;
}

export function authTypeLabel(authType: string | null | undefined): string {
  if (!authType) return 'Padrão do provider';
  const key = authType.toLowerCase().replace(/[\s-]/g, '_');
  return AUTH_TYPE_LABELS[key] ?? authType;
}

export function authTypeDescription(authType: string | null | undefined): string {
  if (!authType) {
    return 'Usa o modo recomendado pelo provedor.';
  }
  const key = authType.toLowerCase().replace(/[\s-]/g, '_');
  return (
    AUTH_TYPE_DESCRIPTIONS[key] ??
    'Siga as instruções do provedor para este modo de autenticação.'
  );
}

export function providerLabel(key: string | null | undefined): string {
  if (!key) return '—';
  const normalized = key.toLowerCase().replace(/[\s-]/g, '_');
  if (PROVIDER_NAMES[normalized]) return PROVIDER_NAMES[normalized];
  // Fallback: "my_provider" vira "My Provider" em vez de expor a key crua.
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function providerBlurb(key: string, displayName?: string | null): string {
  const normalized = key.toLowerCase().replace(/[\s-]/g, '_');
  return (
    PROVIDER_BLURBS[normalized] ??
    PROVIDER_BLURBS[key.toLowerCase()] ??
    `Conecte ${displayName || key} para sincronizar identidades. Time e centro de custo são preenchidos automaticamente quando a fonte envia esses dados.`
  );
}

function normalizeProviderKey(key: string): string {
  return key.toLowerCase().replace(/[\s-]/g, '_');
}

export function providerIconUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const normalized = normalizeProviderKey(key);
  return `/assets/providers/${normalized}.svg`;
}

export function providerVisual(key: string | null | undefined): ProviderVisual {
  if (!key) return DEFAULT_PROVIDER_VISUAL;
  const normalized = normalizeProviderKey(key);
  const iconUrl = `/assets/providers/${normalized}.svg`;
  if (PROVIDER_VISUALS[normalized]) {
    return { ...PROVIDER_VISUALS[normalized], iconUrl };
  }
  const label = providerLabel(key);
  return {
    ...DEFAULT_PROVIDER_VISUAL,
    initial: (label.charAt(0) || '?').toUpperCase(),
    iconUrl,
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  identity: 'Identidade',
  productivity: 'Produtividade',
  crm: 'CRM',
  support: 'Suporte',
  devtools: 'DevTools',
  analytics: 'Analytics',
  security: 'Segurança',
  cloud: 'Cloud',
  other: 'Outros',
};

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return 'Outros';
  const key = category.toLowerCase();
  return CATEGORY_LABELS[key] ?? category.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statLabel(key: string): string {
  const normalized = key.toLowerCase();
  return STAT_LABELS[normalized] ?? key.replace(/_/g, ' ');
}

export function knownStatEntries(
  stats: Record<string, number> | null | undefined,
): Array<{ key: string; label: string; value: number }> {
  if (!stats) return [];
  return Object.entries(stats).map(([key, value]) => ({
    key,
    label: statLabel(key),
    value: Number(value) || 0,
  }));
}
