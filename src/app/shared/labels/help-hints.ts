/** Textos curtos de ajuda para tooltips — PT, 1–2 frases. */
export const HelpHints = {
  connectableOnly:
    'Mostra só providers com adapter ativo neste ambiente — os demais aparecem como “em breve”.',
  comingSoon:
    'Provider cadastrado no catálogo, mas ainda sem adapter de runtime para conectar de fato.',
  sync:
    'Busca identidades (e centros de custo no ERP) no provider. Atualiza o catálogo; time e centro de custo são preenchidos automaticamente no sync quando a fonte envia department / costCenterCode.',
  identity:
    'Conta de usuário no SaaS externo (ex.: usuário Google Workspace), sincronizada via conexão.',
  catalogApp:
    'Aplicativo detectado no provider (ex.: app OAuth no Microsoft). Diferente do inventário gerenciado.',
  managedApp:
    'App que a organização acompanha de propósito: criticidade, dono e status (autorizado, não gerenciado ou ignorado).',
  promoteApp:
    'Transforma um app sincronizado do catálogo em app gerenciado no inventário.',
  criticality:
    'Impacto se o app falhar ou for mal usado: baixa a crítica. Ajuda a priorizar governança.',
  sanctioned:
    'Autorizado: uso aprovado pela organização. Não gerenciado: ainda sem decisão formal. Ignorado: revisado e descartado da fila Shadow IT.',
  shadowIt:
    'Apps OAuth descobertos no IdP (Entra / Google) que ainda não foram autorizados. Ignore o que for esperado ou autorize no inventário.',
  reconcile:
    'Cruza identidades sincronizadas com o cadastro de pessoas, cria vínculos e atribui time/centro de custo automaticamente quando a fonte envia esses dados.',
  inactiveDays:
    'Pessoas sem login ou atividade recente há pelo menos N dias (evidência do IdP). Quem está de férias ou afastado no período não entra nesta lista.',
  onLeave:
    'Pessoas com ausência vigente (férias, atestado, etc.). Durante o período, inatividade de licença é dispensada.',
  personAbsence:
    'Registre o período de férias ou afastamento. Enquanto vigente, a pessoa não é considerada inativa por falta de uso.',
  unassignedTeam:
    'Pessoas ainda sem time (unidade organizacional) atribuído.',
  costCenter:
    'Unidade para alocar custo de licenças e contratos — separada do time hierárquico. Preenchida automaticamente no sync (ex.: Oracle EBS).',
  orgUnitOwner:
    'Pessoa responsável pela unidade; recebe relatórios e alertas de risco quando habilitado.',
  mappingSuggestions:
    'Sugere times a partir do departamento vindo do IdP. Na via feliz o sync já cria e atribui times sozinho; use isto para revisão/correção.',
  bulkMap:
    'Aplica mapeamentos em lote (exceção). O sync IdP/Oracle já atribui time e centro de custo automaticamente.',
  dryRun:
    'Simula o mapeamento sem gravar. Desmarque para aplicar de verdade.',
  contractCommitment:
    'Gera lançamentos de gasto previstos a partir das linhas do contrato (compromissos periódicos).',
  competenceOn:
    'Mês/competência contábil do gasto — quando o custo “pertence”, não necessariamente a data do pagamento.',
  spendKind:
    'Nota fiscal, cartão ou ajuste manual. Compromissos de contrato são gerados pelo contrato, não por aqui.',
  waste:
    'Estimativa de custo em licenças pouco usadas ou ociosas, com base em assentos e atividade.',
  workflowTrigger:
    'Evento que inicia o fluxo (ex.: pessoa.offboard). Workflows habilitados com esse gatilho são candidatos.',
  workflowRun:
    'Uma execução concreta de um workflow para uma pessoa — com passos (suspender, aprovar, etc.).',
  lifecycleApproval:
    'Passo que espera alguém autorizar antes de continuar (ex.: suspender conta no IdP).',
  providerKey:
    'Identificador técnico do provider (ex.: google_workspace). Usado nas APIs e filtros.',
  connectionId:
    'UUID da conexão da organização com um provider. Uma org pode ter várias do mesmo provider.',
  sortOrder:
    'Ordem de exibição no catálogo de integrações. Menor número aparece primeiro.',
  hasRuntimeAdapter:
    'Indica se este ambiente tem código para autenticar e sincronizar esse provider de verdade.',
} as const;

export type HelpHintKey = keyof typeof HelpHints;
