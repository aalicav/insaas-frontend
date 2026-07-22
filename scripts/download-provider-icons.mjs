#!/usr/bin/env node
/**
 * Downloads provider brand SVGs into public/assets/providers/{key}.svg
 * Sources (in order): local simple-icons, Iconify API, generated monogram.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'assets', 'providers');
const SIMPLE_ICONS_DIR = join(ROOT, 'node_modules', 'simple-icons', 'icons');
const PROVIDERS_JSON = resolve(
  ROOT,
  '../saas/prisma/data/providers.json',
);

/** @type {Record<string, { iconify?: string[]; simpleIcons?: string[]; monogram?: { letter: string; bg: string; fg?: string } }>} */
const PROVIDER_MAP = {
  google_workspace: {
    iconify: ['logos:google-workspace', 'logos:google-icon'],
    simpleIcons: ['google'],
  },
  google: {
    iconify: ['logos:google-icon', 'logos:google-workspace'],
    simpleIcons: ['google'],
  },
  microsoft_365: {
    iconify: ['logos:microsoft-icon', 'logos:microsoft-office'],
    simpleIcons: ['microsoft'],
    monogram: { letter: 'M', bg: '#00a4ef' },
  },
  microsoft365: {
    iconify: ['logos:microsoft-icon'],
    simpleIcons: ['microsoft'],
    monogram: { letter: 'M', bg: '#00a4ef' },
  },
  microsoft: {
    iconify: ['logos:microsoft-icon'],
    simpleIcons: ['microsoft'],
    monogram: { letter: 'M', bg: '#00a4ef' },
  },
  azure: {
    iconify: ['logos:microsoft-azure', 'logos:microsoft-icon'],
    simpleIcons: ['microsoftazure', 'microsoft'],
    monogram: { letter: 'A', bg: '#0078d4' },
  },
  azure_ad: {
    iconify: ['logos:microsoft-azure', 'logos:microsoft-icon'],
    simpleIcons: ['microsoftazure', 'microsoft'],
    monogram: { letter: 'A', bg: '#0078d4' },
  },
  okta: {
    iconify: ['logos:okta'],
    simpleIcons: ['okta'],
  },
  onelogin: {
    iconify: ['simple-icons:onelogin'],
    simpleIcons: ['onelogin'],
    monogram: { letter: '1', bg: '#00b2a9' },
  },
  jumpcloud: {
    iconify: ['simple-icons:jumpcloud'],
    simpleIcons: ['jumpcloud'],
    monogram: { letter: 'J', bg: '#19a4d2' },
  },
  slack: {
    iconify: ['logos:slack-icon', 'logos:slack'],
    simpleIcons: ['slack'],
  },
  github: {
    iconify: ['logos:github-icon', 'logos:github-octocat'],
    simpleIcons: ['github'],
  },
  salesforce: {
    iconify: ['logos:salesforce'],
    simpleIcons: ['salesforce'],
  },
  zendesk: {
    iconify: ['logos:zendesk'],
    simpleIcons: ['zendesk'],
  },
  notion: {
    iconify: ['logos:notion-icon', 'logos:notion'],
    simpleIcons: ['notion'],
  },
  datadog: {
    iconify: ['logos:datadog'],
    simpleIcons: ['datadog'],
  },
  asana: {
    iconify: ['logos:asana'],
    simpleIcons: ['asana'],
  },
  hubspot: {
    iconify: ['logos:hubspot'],
    simpleIcons: ['hubspot'],
  },
  jira: {
    iconify: ['logos:jira'],
    simpleIcons: ['jira'],
  },
  atlassian: {
    iconify: ['logos:atlassian'],
    simpleIcons: ['atlassian'],
  },
  dropbox: {
    iconify: ['logos:dropbox'],
    simpleIcons: ['dropbox'],
  },
  box: {
    iconify: ['logos:box'],
    simpleIcons: ['box'],
  },
  zoom: {
    iconify: ['logos:zoom-icon', 'logos:zoom'],
    simpleIcons: ['zoom'],
  },
  twilio: {
    iconify: ['logos:twilio-icon', 'logos:twilio'],
    simpleIcons: ['twilio'],
  },
  intercom: {
    iconify: ['logos:intercom'],
    simpleIcons: ['intercom'],
  },
  freshdesk: {
    iconify: ['simple-icons:fresh', 'logos:freshdesk'],
    simpleIcons: ['fresh'],
  },
  servicenow: {
    iconify: ['simple-icons:servicenow'],
    simpleIcons: ['servicenow'],
    monogram: { letter: 'S', bg: '#81b5a1' },
  },
  onepassword: {
    iconify: ['simple-icons:1password', 'logos:1password'],
    simpleIcons: ['1password'],
  },
  adobe: {
    iconify: ['logos:adobe'],
    simpleIcons: ['adobe'],
  },
  aircall: {
    iconify: ['simple-icons:aircall'],
    simpleIcons: ['aircall'],
  },
  aws: {
    iconify: ['logos:aws'],
    simpleIcons: ['amazonwebservices', 'amazonaws', 'amazon'],
    monogram: { letter: 'A', bg: '#FF9900', fg: '#232f3e' },
  },
  bitwarden: {
    iconify: ['simple-icons:bitwarden', 'logos:bitwarden'],
    simpleIcons: ['bitwarden'],
  },
  calendly: {
    iconify: ['simple-icons:calendly'],
    simpleIcons: ['calendly'],
  },
  clickup: {
    iconify: ['simple-icons:clickup', 'logos:clickup-icon'],
    simpleIcons: ['clickup'],
  },
  confluence: {
    iconify: ['logos:confluence'],
    simpleIcons: ['confluence'],
  },
  convenia: {
    monogram: { letter: 'C', bg: '#6c5ce7' },
  },
  degreed: {
    monogram: { letter: 'D', bg: '#0066ff' },
  },
  demandbase: {
    monogram: { letter: 'D', bg: '#e31c79' },
  },
  docusign: {
    iconify: ['logos:docusign', 'simple-icons:docusign'],
    simpleIcons: ['docusign'],
    monogram: { letter: 'D', bg: '#FFCC22', fg: '#1a1a1a' },
  },
  dynatrace: {
    iconify: ['logos:dynatrace'],
    simpleIcons: ['dynatrace'],
  },
  freshchat: {
    iconify: ['simple-icons:fresh'],
    simpleIcons: ['fresh'],
  },
  freshservice: {
    iconify: ['simple-icons:fresh'],
    simpleIcons: ['fresh'],
  },
  gitlab: {
    iconify: ['logos:gitlab'],
    simpleIcons: ['gitlab'],
  },
  gong: {
    monogram: { letter: 'G', bg: '#eb4960' },
  },
  google_analytics: {
    iconify: ['logos:google-analytics'],
    simpleIcons: ['googleanalytics'],
  },
  google_cloud_platform: {
    iconify: ['logos:google-cloud'],
    simpleIcons: ['googlecloud'],
  },
  google_firebase: {
    iconify: ['logos:firebase'],
    simpleIcons: ['firebase'],
  },
  google_sheets: {
    iconify: ['simple-icons:googlesheets', 'logos:google-sheets'],
    simpleIcons: ['googlesheets'],
  },
  grafana: {
    iconify: ['logos:grafana'],
    simpleIcons: ['grafana'],
  },
  helpscout: {
    iconify: ['simple-icons:helpscout'],
    simpleIcons: ['helpscout'],
  },
  knowbe4: {
    monogram: { letter: 'K', bg: '#1a73e8' },
  },
  lastpass: {
    iconify: ['simple-icons:lastpass', 'logos:lastpass'],
    simpleIcons: ['lastpass'],
  },
  metabase: {
    iconify: ['logos:metabase'],
    simpleIcons: ['metabase'],
  },
  miro: {
    iconify: ['logos:miro'],
    simpleIcons: ['miro'],
  },
  monday: {
    iconify: ['logos:monday-icon', 'logos:monday'],
    simpleIcons: ['mondaydotcom', 'monday'],
    monogram: { letter: 'M', bg: '#ff3d57' },
  },
  newrelic: {
    iconify: ['logos:new-relic'],
    simpleIcons: ['newrelic'],
  },
  octopus: {
    iconify: ['logos:octopus-deploy'],
    simpleIcons: ['octopusdeploy'],
  },
  pipedrive: {
    iconify: ['logos:pipedrive'],
    simpleIcons: ['pipedrive'],
    monogram: { letter: 'P', bg: '#017737' },
  },
  pipefy: {
    iconify: ['logos:pipefy'],
    simpleIcons: ['pipefy'],
    monogram: { letter: 'P', bg: '#3b5bdb' },
  },
  salesloft: {
    monogram: { letter: 'S', bg: '#0d7377' },
  },
  sentry: {
    iconify: ['logos:sentry'],
    simpleIcons: ['sentry'],
  },
  smartrips: {
    monogram: { letter: 'S', bg: '#ff6b35' },
  },
  stitchdata: {
    iconify: ['logos:stitch'],
    simpleIcons: ['stitch'],
    monogram: { letter: 'S', bg: '#FF7A59' },
  },
  tableau: {
    iconify: ['logos:tableau'],
    simpleIcons: ['tableau'],
  },
  trello: {
    iconify: ['logos:trello'],
    simpleIcons: ['trello'],
  },
  workplace: {
    iconify: ['logos:workplace'],
    simpleIcons: ['workplace'],
  },
  gmaps: {
    iconify: ['logos:google-maps'],
    simpleIcons: ['googlemaps'],
  },
  coda: {
    iconify: ['logos:coda'],
    simpleIcons: ['coda'],
  },
  greenhouse: {
    iconify: ['simple-icons:greenhouse'],
    simpleIcons: ['greenhouse'],
  },
  mongodb_atlas: {
    iconify: ['logos:mongodb-icon', 'logos:mongodb'],
    simpleIcons: ['mongodb'],
  },
  power_bi: {
    iconify: ['logos:microsoft-power-bi'],
    simpleIcons: ['powerbi'],
    monogram: { letter: 'P', bg: '#f2c811', fg: '#1a1a1a' },
  },
  qulture_rocks: {
    monogram: { letter: 'Q', bg: '#5b4b8a' },
  },
  lg: {
    iconify: ['simple-icons:lg'],
    simpleIcons: ['lg'],
  },
  totvs_rm: {
    iconify: ['simple-icons:totvs'],
    simpleIcons: ['totvs'],
  },
  databricks: {
    iconify: ['simple-icons:databricks', 'logos:databricks'],
    simpleIcons: ['databricks'],
  },
  oracle_ebs: {
    iconify: ['logos:oracle'],
    simpleIcons: ['oracle'],
  },
};

/** Alias keys → canonical file key (copy after download). */
const ALIASES = {
  google: 'google_workspace',
  microsoft: 'microsoft_365',
  microsoft365: 'microsoft_365',
  azure_ad: 'azure',
};

function loadProviderKeys() {
  const keys = new Set(Object.keys(PROVIDER_MAP));
  if (existsSync(PROVIDERS_JSON)) {
    const rows = JSON.parse(readFileSync(PROVIDERS_JSON, 'utf8'));
    for (const row of rows) {
      if (row?.key) keys.add(String(row.key).toLowerCase());
    }
  }
  for (const alias of Object.keys(ALIASES)) keys.add(alias);
  return [...keys].sort();
}

function monogramSvg(letter, bg, fg = '#ffffff') {
  const safe = (letter || '?').slice(0, 1).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${safe}">
  <rect width="64" height="64" rx="12" fill="${bg}"/>
  <text x="32" y="42" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="32" font-weight="700" fill="${fg}">${safe}</text>
</svg>
`;
}

function defaultMonogram(key) {
  const letter = key.replace(/[^a-z0-9]/gi, '').charAt(0) || '?';
  // Deterministic hue from key
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  const bg = `hsl(${hue} 55% 42%)`;
  return monogramSvg(letter.toUpperCase(), bg);
}

async function fetchIconify(iconId) {
  const url = `https://api.iconify.design/${iconId}.svg`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  if (!text.includes('<svg') || text.length < 40) return null;
  return text;
}

function trySimpleIcons(names) {
  if (!names?.length || !existsSync(SIMPLE_ICONS_DIR)) return null;
  for (const name of names) {
    const path = join(SIMPLE_ICONS_DIR, `${name}.svg`);
    if (existsSync(path)) return readFileSync(path, 'utf8');
  }
  return null;
}

async function resolveSvg(key, entry) {
  for (const iconId of entry.iconify || []) {
    try {
      const svg = await fetchIconify(iconId);
      if (svg) return { svg, source: `iconify:${iconId}` };
    } catch {
      // try next
    }
  }

  const local = trySimpleIcons(entry.simpleIcons);
  if (local) return { svg: local, source: 'simple-icons' };

  if (entry.monogram) {
    const { letter, bg, fg } = entry.monogram;
    return { svg: monogramSvg(letter, bg, fg), source: 'monogram' };
  }

  return { svg: defaultMonogram(key), source: 'monogram-default' };
}

async function writeSvg(path, svg) {
  writeFileSync(path, svg.endsWith('\n') ? svg : `${svg}\n`, 'utf8');
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const keys = loadProviderKeys();
  const results = { iconify: [], 'simple-icons': [], monogram: [], 'monogram-default': [] };

  console.log(`Downloading ${keys.length} provider icons → ${OUT_DIR}`);

  for (const key of keys) {
    if (ALIASES[key]) continue; // handled after canonicals

    const entry = PROVIDER_MAP[key] || { monogram: undefined };
    const outPath = join(OUT_DIR, `${key}.svg`);
    const { svg, source } = await resolveSvg(key, entry);
    await writeSvg(outPath, svg);

    const bucket = source.startsWith('iconify')
      ? 'iconify'
      : source.startsWith('simple-icons')
        ? 'simple-icons'
        : source === 'monogram'
          ? 'monogram'
          : 'monogram-default';
    results[bucket].push(key);
    console.log(`  ${key.padEnd(28)} ${source}`);
  }

  for (const [alias, canonical] of Object.entries(ALIASES)) {
    const src = join(OUT_DIR, `${canonical}.svg`);
    const dest = join(OUT_DIR, `${alias}.svg`);
    if (existsSync(src)) {
      copyFileSync(src, dest);
      console.log(`  ${alias.padEnd(28)} alias→${canonical}`);
    }
  }

  console.log('\nSummary:');
  console.log(`  simple-icons: ${results['simple-icons'].length}`);
  console.log(`  iconify:      ${results.iconify.length}`);
  console.log(`  monogram:     ${results.monogram.length + results['monogram-default'].length}`);
  if (results.monogram.length || results['monogram-default'].length) {
    console.log(
      `  monogram keys: ${[...results.monogram, ...results['monogram-default']].join(', ')}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
