import React, { useState, useEffect } from 'react';
import {
  useAdminGetSettings, useAdminSaveSettings,
} from '@workspace/api-client-react';
import {
  Settings, Link, Shield, Database, Globe, Bell, Mail, Ticket,
  Zap, Activity, Save, RefreshCw, Palette, Clock, HardDrive,
  CheckCircle, XCircle, Eye, EyeOff, ChevronDown, ChevronRight,
  Server, Search, AlertTriangle, Cpu
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettingsStore } from '@/lib/store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'password' | 'number' | 'url';
}

interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  fields: FieldDef[];
  docsUrl?: string;
}

interface IntegrationGroup {
  title: string;
  icon: React.ReactNode;
  integrations: IntegrationDef[];
}

// ─── Integration catalogue ────────────────────────────────────────────────────

const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    title: 'EDR — Endpoint Detection & Response',
    icon: <Shield className="w-4 h-4" />,
    integrations: [
      {
        id: 'sentinelone',
        name: 'SentinelOne',
        description: 'AI-powered endpoint detection, response and threat hunting.',
        icon: <Shield className="w-5 h-5" />,
        color: 'text-primary',
        fields: [
          { key: 's1BaseUrl', label: 'Console URL', placeholder: 'https://your-tenant.sentinelone.net', type: 'url' },
          { key: 's1ApiToken', label: 'API Token', placeholder: 'ApiToken xxxxxxxxxxxxxxxx', type: 'password' },
        ],
        docsUrl: 'https://usea1.sentinelone.net/api-doc/overview',
      },
      {
        id: 'crowdstrike',
        name: 'CrowdStrike Falcon',
        description: 'Cloud-native endpoint protection and threat intelligence.',
        icon: <Shield className="w-5 h-5" />,
        color: 'text-red-400',
        fields: [
          { key: 'csBaseUrl', label: 'API Base URL', placeholder: 'https://api.crowdstrike.com', type: 'url' },
          { key: 'csClientId', label: 'Client ID', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
          { key: 'csClientSecret', label: 'Client Secret', placeholder: 'Client secret value', type: 'password' },
        ],
        docsUrl: 'https://falcon.crowdstrike.com/documentation/page/a2a7fc0e/crowdstrike-oauth2-based-apis',
      },
      {
        id: 'msdefender',
        name: 'Microsoft Defender',
        description: 'Enterprise endpoint security integrated with Microsoft 365.',
        icon: <Shield className="w-5 h-5" />,
        color: 'text-blue-400',
        fields: [
          { key: 'mdefTenantId', label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
          { key: 'mdefClientId', label: 'App (Client) ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
          { key: 'mdefClientSecret', label: 'Client Secret', placeholder: 'Azure app registration secret', type: 'password' },
        ],
        docsUrl: 'https://learn.microsoft.com/en-us/microsoft-365/security/defender-endpoint/apis-intro',
      },
    ],
  },
  {
    title: 'XDR — Extended Detection & Response',
    icon: <Zap className="w-4 h-4" />,
    integrations: [
      {
        id: 'cortexXdr',
        name: 'Palo Alto Cortex XDR',
        description: 'Extended detection and response across endpoints, network, and cloud.',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-primary',
        fields: [
          { key: 'xdrBaseUrl', label: 'API Base URL', placeholder: 'https://api-your-tenant.xdr.us.paloaltonetworks.com', type: 'url' },
          { key: 'xdrApiKeyId', label: 'API Key ID', placeholder: 'Numeric key ID' },
          { key: 'xdrApiKey', label: 'API Key', placeholder: 'Cortex XDR API key', type: 'password' },
        ],
        docsUrl: 'https://docs-cortex.paloaltonetworks.com/r/Cortex-XDR/Cortex-XDR-API-Reference',
      },
      {
        id: 'sentinel',
        name: 'Microsoft Sentinel',
        description: 'Cloud-native SIEM and XDR from Microsoft Azure.',
        icon: <Globe className="w-5 h-5" />,
        color: 'text-blue-400',
        fields: [
          { key: 'msTenantId', label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
          { key: 'msClientId', label: 'Client ID (App ID)', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
          { key: 'msClientSecret', label: 'Client Secret', placeholder: 'App registration secret', type: 'password' },
          { key: 'msWorkspaceId', label: 'Workspace ID', placeholder: 'Log Analytics workspace ID' },
          { key: 'msSubscriptionId', label: 'Subscription ID', placeholder: 'Azure subscription UUID' },
        ],
        docsUrl: 'https://learn.microsoft.com/en-us/rest/api/securityinsights/',
      },
      {
        id: 'trendVisionOne',
        name: 'Trend Micro Vision One',
        description: 'XDR platform with threat intelligence and risk management.',
        icon: <Activity className="w-5 h-5" />,
        color: 'text-red-400',
        fields: [
          { key: 'tmBaseUrl', label: 'Regional API URL', placeholder: 'https://api.xdr.trendmicro.com', type: 'url' },
          { key: 'tmApiKey', label: 'API Key', placeholder: 'Vision One API key', type: 'password' },
        ],
        docsUrl: 'https://automation.trendmicro.com/xdr/api-v3',
      },
    ],
  },
  {
    title: 'SIEM — Security Information & Event Management',
    icon: <Database className="w-4 h-4" />,
    integrations: [
      {
        id: 'logrhythm',
        name: 'LogRhythm SIEM',
        description: 'Next-gen SIEM with AI-driven analytics and threat lifecycle management.',
        icon: <Database className="w-5 h-5" />,
        color: 'text-primary',
        fields: [
          { key: 'lrBaseUrl', label: 'API Base URL', placeholder: 'https://lr-server/lr-api/v1', type: 'url' },
          { key: 'lrApiToken', label: 'Bearer Token', placeholder: 'Bearer eyJhbGci...', type: 'password' },
        ],
        docsUrl: 'https://docs.logrhythm.com/docs/rest-api-development',
      },
      {
        id: 'splunk',
        name: 'Splunk Enterprise',
        description: 'Data platform for security operations and threat detection.',
        icon: <Database className="w-5 h-5" />,
        color: 'text-orange-400',
        fields: [
          { key: 'splunkBaseUrl', label: 'Splunk URL', placeholder: 'https://splunk.internal:8089', type: 'url' },
          { key: 'splunkToken', label: 'HEC / API Token', placeholder: 'Splunk auth token', type: 'password' },
          { key: 'splunkIndex', label: 'Default Index', placeholder: 'main' },
        ],
        docsUrl: 'https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTprolog',
      },
      {
        id: 'qradar',
        name: 'IBM QRadar',
        description: 'Enterprise SIEM with behavioral analytics and threat correlation.',
        icon: <Database className="w-5 h-5" />,
        color: 'text-blue-400',
        fields: [
          { key: 'qrBaseUrl', label: 'Console URL', placeholder: 'https://qradar.internal', type: 'url' },
          { key: 'qrApiToken', label: 'SEC Token', placeholder: 'QRadar API token', type: 'password' },
        ],
        docsUrl: 'https://www.ibm.com/docs/en/SS42VS_SHR/com.ibm.qradar.doc/c_rest_api_getting_started.html',
      },
    ],
  },
  {
    title: 'SOAR — Security Orchestration, Automation & Response',
    icon: <Cpu className="w-4 h-4" />,
    integrations: [
      {
        id: 'xsoar',
        name: 'Palo Alto XSOAR',
        description: 'Security orchestration, automation and incident response platform.',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-primary',
        fields: [
          { key: 'xsoarBaseUrl', label: 'XSOAR URL', placeholder: 'https://xsoar.internal/xsoar', type: 'url' },
          { key: 'xsoarApiKey', label: 'API Key', placeholder: 'XSOAR API key', type: 'password' },
        ],
        docsUrl: 'https://xsoar.pan.dev/docs/reference/api/demisto-class',
      },
      {
        id: 'splunksoar',
        name: 'Splunk SOAR',
        description: 'Automate security operations and enrich alerts with Splunk SOAR.',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-orange-400',
        fields: [
          { key: 'splunksoarBaseUrl', label: 'Splunk SOAR URL', placeholder: 'https://splunk-soar.internal', type: 'url' },
          { key: 'splunksoarToken', label: 'API Token', placeholder: 'Splunk SOAR auth token', type: 'password' },
        ],
        docsUrl: 'https://docs.splunk.com/Documentation/SOAR/current/DevelopApps/ApiQuickStart',
      },
      {
        id: 'ibmsoar',
        name: 'IBM SOAR',
        description: 'Incident response automation and orchestration by IBM.',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-blue-400',
        fields: [
          { key: 'ibmsoarBaseUrl', label: 'SOAR URL', placeholder: 'https://ibm-soar.internal', type: 'url' },
          { key: 'ibmsoarApiKey', label: 'API Key ID', placeholder: 'IBM SOAR API key ID' },
          { key: 'ibmsoarApiSecret', label: 'API Key Secret', placeholder: 'IBM SOAR API secret', type: 'password' },
        ],
        docsUrl: 'https://developer.ibm.com/apis/catalog/?search=resilient',
      },
    ],
  },
  {
    title: 'Threat Intelligence',
    icon: <Search className="w-4 h-4" />,
    integrations: [
      {
        id: 'virustotal',
        name: 'VirusTotal',
        description: 'File, URL, IP and hash reputation analysis via multi-AV scanning.',
        icon: <Activity className="w-5 h-5" />,
        color: 'text-blue-400',
        fields: [
          { key: 'vtApiKey', label: 'API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
        ],
        docsUrl: 'https://developers.virustotal.com/reference/overview',
      },
      {
        id: 'alienvault',
        name: 'AlienVault OTX',
        description: 'Open Threat Exchange indicators and pulses.',
        icon: <Globe className="w-5 h-5" />,
        color: 'text-orange-400',
        fields: [
          { key: 'otxApiKey', label: 'OTX API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
          { key: 'otxBaseUrl', label: 'Base URL (optional)', placeholder: 'https://otx.alienvault.com', type: 'url' },
        ],
        docsUrl: 'https://otx.alienvault.com/api',
      },
      {
        id: 'misp',
        name: 'MISP',
        description: 'Malware Information Sharing Platform for structured threat data.',
        icon: <AlertTriangle className="w-5 h-5" />,
        color: 'text-yellow-400',
        fields: [
          { key: 'mispBaseUrl', label: 'MISP URL', placeholder: 'https://misp.internal', type: 'url' },
          { key: 'mispApiKey', label: 'Auth Key', placeholder: 'MISP automation key', type: 'password' },
        ],
        docsUrl: 'https://www.misp-project.org/openapi/',
      },
      {
        id: 'shodan',
        name: 'Shodan',
        description: 'Internet-wide scanner for exposed devices and services.',
        icon: <Globe className="w-5 h-5" />,
        color: 'text-red-400',
        fields: [
          { key: 'shodanApiKey', label: 'API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
        ],
        docsUrl: 'https://developer.shodan.io/api',
      },
      {
        id: 'abuseipdb',
        name: 'AbuseIPDB',
        description: 'IP reputation and abuse reporting database.',
        icon: <Shield className="w-5 h-5" />,
        color: 'text-red-400',
        fields: [
          { key: 'abuseipdbApiKey', label: 'API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
        ],
        docsUrl: 'https://docs.abuseipdb.com/#introduction',
      },
      {
        id: 'recordedfuture',
        name: 'Recorded Future',
        description: 'Real-time threat intelligence and risk scoring.',
        icon: <Activity className="w-5 h-5" />,
        color: 'text-primary',
        fields: [
          { key: 'rfBaseUrl', label: 'Connect API URL', placeholder: 'https://api.recordedfuture.com', type: 'url' },
          { key: 'rfApiToken', label: 'API Token', placeholder: 'RF Connect token', type: 'password' },
        ],
        docsUrl: 'https://api.recordedfuture.com/v2/?q=help',
      },
    ],
  },
  {
    title: 'Communication & Alerting',
    icon: <Bell className="w-4 h-4" />,
    integrations: [
      {
        id: 'slack',
        name: 'Slack',
        description: 'Send SOC alerts and notifications to Slack channels.',
        icon: <Bell className="w-5 h-5" />,
        color: 'text-green-400',
        fields: [
          { key: 'slackWebhookUrl', label: 'Incoming Webhook URL', placeholder: 'https://hooks.slack.com/services/T.../B.../xxx', type: 'url' },
          { key: 'slackBotToken', label: 'Bot OAuth Token (optional)', placeholder: 'xoxb-xxxxxxxxxxxx', type: 'password' },
          { key: 'slackChannel', label: 'Default Channel', placeholder: '#soc-alerts' },
        ],
        docsUrl: 'https://api.slack.com/messaging/webhooks',
      },
      {
        id: 'teams',
        name: 'Microsoft Teams',
        description: 'Push incident alerts to a Teams channel via webhook.',
        icon: <Bell className="w-5 h-5" />,
        color: 'text-blue-400',
        fields: [
          { key: 'teamsWebhookUrl', label: 'Incoming Webhook URL', placeholder: 'https://xxxxx.webhook.office.com/webhookb2/...', type: 'url' },
        ],
        docsUrl: 'https://learn.microsoft.com/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook',
      },
      {
        id: 'pagerduty',
        name: 'PagerDuty',
        description: 'Incident escalation and on-call management platform.',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-green-400',
        fields: [
          { key: 'pdApiKey', label: 'REST API Key', placeholder: 'u+xxxxxxxxxxxxxxxxxxxx', type: 'password' },
          { key: 'pdIntegrationKey', label: 'Events API Integration Key', placeholder: 'Events v2 routing key', type: 'password' },
        ],
        docsUrl: 'https://developer.pagerduty.com/docs/get-started/getting-started/',
      },
      {
        id: 'smtp',
        name: 'SMTP Email',
        description: 'Send email notifications for critical alerts and reports.',
        icon: <Mail className="w-5 h-5" />,
        color: 'text-muted-foreground',
        fields: [
          { key: 'smtpHost', label: 'SMTP Host', placeholder: 'smtp.example.com' },
          { key: 'smtpPort', label: 'Port', placeholder: '587', type: 'number' },
          { key: 'smtpUser', label: 'Username / From Address', placeholder: 'soc-alerts@example.com' },
          { key: 'smtpPassword', label: 'Password', placeholder: 'SMTP password or app password', type: 'password' },
        ],
      },
    ],
  },
  {
    title: 'Ticketing / ITSM',
    icon: <Ticket className="w-4 h-4" />,
    integrations: [
      {
        id: 'servicenow',
        name: 'ServiceNow',
        description: 'Create and update incidents directly in ServiceNow ITSM.',
        icon: <Ticket className="w-5 h-5" />,
        color: 'text-primary',
        fields: [
          { key: 'snowBaseUrl', label: 'Instance URL', placeholder: 'https://your-instance.service-now.com', type: 'url' },
          { key: 'snowUsername', label: 'Username', placeholder: 'soc-integration' },
          { key: 'snowPassword', label: 'Password', placeholder: 'ServiceNow password', type: 'password' },
        ],
        docsUrl: 'https://developer.servicenow.com/dev.do#!/reference/api/latest/rest',
      },
      {
        id: 'jira',
        name: 'Jira',
        description: 'Log SOC incidents and track remediation tasks in Jira.',
        icon: <Ticket className="w-5 h-5" />,
        color: 'text-blue-400',
        fields: [
          { key: 'jiraBaseUrl', label: 'Jira Base URL', placeholder: 'https://your-org.atlassian.net', type: 'url' },
          { key: 'jiraEmail', label: 'Account Email', placeholder: 'soc@your-org.com' },
          { key: 'jiraApiToken', label: 'API Token', placeholder: 'Atlassian API token', type: 'password' },
          { key: 'jiraProject', label: 'Default Project Key', placeholder: 'SOC' },
        ],
        docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
      },
    ],
  },
  {
    title: 'Vulnerability Management',
    icon: <AlertTriangle className="w-4 h-4" />,
    integrations: [
      {
        id: 'tenable',
        name: 'Tenable.io',
        description: 'Continuous vulnerability assessment and risk management.',
        icon: <Shield className="w-5 h-5" />,
        color: 'text-blue-400',
        fields: [
          { key: 'tenableAccessKey', label: 'Access Key', placeholder: 'Tenable access key', type: 'password' },
          { key: 'tenableSecretKey', label: 'Secret Key', placeholder: 'Tenable secret key', type: 'password' },
        ],
        docsUrl: 'https://developer.tenable.com/reference',
      },
      {
        id: 'rapid7',
        name: 'Rapid7 InsightVM',
        description: 'Vulnerability risk management and remediation workflows.',
        icon: <Activity className="w-5 h-5" />,
        color: 'text-orange-400',
        fields: [
          { key: 'rapid7BaseUrl', label: 'Console URL', placeholder: 'https://your-rapid7-console:3780', type: 'url' },
          { key: 'rapid7Username', label: 'Username', placeholder: 'api-user' },
          { key: 'rapid7Password', label: 'Password', placeholder: 'API user password', type: 'password' },
        ],
        docsUrl: 'https://help.rapid7.com/insightvm/en-us/api/index.html',
      },
      {
        id: 'qualys',
        name: 'Qualys',
        description: 'Cloud-based vulnerability scanning and compliance.',
        icon: <Server className="w-5 h-5" />,
        color: 'text-red-400',
        fields: [
          { key: 'qualysPlatformUrl', label: 'Platform URL', placeholder: 'https://qualysapi.qualys.com', type: 'url' },
          { key: 'qualysUsername', label: 'Username', placeholder: 'qualys-api-user' },
          { key: 'qualysPassword', label: 'Password', placeholder: 'Qualys password', type: 'password' },
        ],
        docsUrl: 'https://www.qualys.com/docs/qualys-api-vmpc-user-guide.pdf',
      },
    ],
  },
  {
    title: 'Threat Intelligence APIs',
    icon: <Globe className="w-4 h-4" />,
    integrations: [
      {
        id: 'otx',
        name: 'OTX AlienVault',
        description: 'Community-driven threat intelligence — IOCs, pulses, and threat actors. Free tier available.',
        icon: <Globe className="w-5 h-5" />,
        color: 'text-purple-400',
        fields: [
          { key: 'otxApiKey', label: 'API Key', placeholder: 'OTX API key from otx.alienvault.com', type: 'password' },
        ],
        docsUrl: 'https://otx.alienvault.com/api',
      },
      {
        id: 'virustotal',
        name: 'VirusTotal',
        description: 'Multi-engine malware scanning and file/URL/IP reputation. Free public API key available.',
        icon: <Eye className="w-5 h-5" />,
        color: 'text-green-400',
        fields: [
          { key: 'vtApiKey', label: 'API Key', placeholder: 'VirusTotal API key from virustotal.com', type: 'password' },
        ],
        docsUrl: 'https://developers.virustotal.com/reference',
      },
      {
        id: 'shodan',
        name: 'Shodan',
        description: 'Internet-wide scanner for exposed services, banners, and vulnerabilities.',
        icon: <Search className="w-5 h-5" />,
        color: 'text-amber-400',
        fields: [
          { key: 'shodanApiKey', label: 'API Key', placeholder: 'Shodan API key from shodan.io', type: 'password' },
        ],
        docsUrl: 'https://developer.shodan.io/api',
      },
      {
        id: 'abuseipdb',
        name: 'AbuseIPDB',
        description: 'Crowdsourced IP address abuse reporting and reputation database. Free tier available.',
        icon: <Shield className="w-5 h-5" />,
        color: 'text-red-400',
        fields: [
          { key: 'abuseipdbApiKey', label: 'API Key', placeholder: 'AbuseIPDB API key from abuseipdb.com', type: 'password' },
        ],
        docsUrl: 'https://www.abuseipdb.com/api',
      },
      {
        id: 'greynoise',
        name: 'GreyNoise',
        description: 'Internet scanner noise classification — separate targeted attacks from mass scanning.',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-cyan-400',
        fields: [
          { key: 'greynoiseApiKey', label: 'API Key', placeholder: 'GreyNoise community or enterprise key', type: 'password' },
        ],
        docsUrl: 'https://developer.greynoise.io',
      },
      {
        id: 'censys',
        name: 'Censys',
        description: 'Attack surface management and internet-wide scanning. Free research tier available.',
        icon: <Database className="w-5 h-5" />,
        color: 'text-blue-400',
        fields: [
          { key: 'censysApiId', label: 'API ID', placeholder: 'Censys API ID from search.censys.io' },
          { key: 'censysApiSecret', label: 'API Secret', placeholder: 'Censys API secret', type: 'password' },
        ],
        docsUrl: 'https://search.censys.io/api',
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isConfigured(fields: FieldDef[], settings: Record<string, string>): boolean {
  return fields.some(f => !!settings[f.key]);
}

// ─── Center Settings Tab ──────────────────────────────────────────────────────

const REFRESH_OPTIONS = [
  { label: '15 seconds', value: '15' },
  { label: '30 seconds', value: '30' },
  { label: '1 minute', value: '60' },
  { label: '5 minutes', value: '300' },
  { label: '15 minutes', value: '900' },
  { label: 'Off', value: '0' },
];

const ACCENT_OPTIONS = [
  { label: 'Cyber Teal', value: 'teal', cls: 'bg-primary' },
  { label: 'Electric Blue', value: 'blue', cls: 'bg-blue-500' },
  { label: 'Violet', value: 'violet', cls: 'bg-violet-500' },
  { label: 'Emerald', value: 'emerald', cls: 'bg-emerald-500' },
  { label: 'Amber', value: 'amber', cls: 'bg-amber-500' },
];

const DENSITY_OPTIONS = [
  { label: 'Comfortable', value: 'comfortable', desc: 'More spacing, easier to scan' },
  { label: 'Compact', value: 'compact', desc: 'Tighter rows, more data on screen' },
];

const RETENTION_OPTIONS = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: '1 year', value: '365' },
];

const TICKER_OPTIONS = [
  { label: 'Slow (8 s)', value: '8000' },
  { label: 'Normal (4.5 s)', value: '4500' },
  { label: 'Fast (2 s)', value: '2000' },
];

function CenterSettingsTab() {
  const { toast } = useToast();
  const { refreshInterval, accentColor, uiDensity, tickerSpeed, dataRetention, save } = useSettingsStore();

  const refresh = String(refreshInterval);
  const accent = accentColor;
  const density = uiDensity;
  const ticker = String(tickerSpeed);
  const retention = String(dataRetention);

  // Each setter applies changes immediately through the store
  const setRefresh = (v: string) => save({ refreshInterval: parseInt(v, 10) });
  const setAccent = (v: string) => save({ accentColor: v });
  const setDensity = (v: 'comfortable' | 'compact') => save({ uiDensity: v });
  const setTicker = (v: string) => save({ tickerSpeed: parseInt(v, 10) });
  const setRetention = (v: string) => save({ dataRetention: parseInt(v, 10) });

  const handleSave = () => {
    toast({ title: 'Preferences saved', description: 'All settings are active and stored for future sessions.' });
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">

      {/* Auto Refresh */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-4 h-4 text-primary" />
          <h3 className="font-mono text-sm font-semibold text-foreground">Auto Refresh</h3>
          <span className="text-[10px] font-mono text-muted-foreground ml-auto">How often dashboard data refreshes from the API</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {REFRESH_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setRefresh(opt.value)}
              className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
                refresh === opt.value
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="font-mono text-sm font-semibold text-foreground">Theme Customization</h3>
        </div>

        <div className="mb-5">
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">Accent Color</label>
          <div className="flex gap-3 flex-wrap">
            {ACCENT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setAccent(opt.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                  accent === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${opt.cls}`} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">UI Density</label>
          <div className="grid grid-cols-2 gap-2">
            {DENSITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDensity(opt.value)}
                className={`text-left px-4 py-3 rounded-lg border transition-all ${
                  density === opt.value
                    ? 'bg-primary/10 border-primary'
                    : 'border-border hover:border-border/80'
                }`}
              >
                <div className={`text-sm font-mono font-medium ${density === opt.value ? 'text-primary' : 'text-foreground'}`}>{opt.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Ticker */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-mono text-sm font-semibold text-foreground">Alert Ticker Speed</h3>
          <span className="text-[10px] font-mono text-muted-foreground ml-auto">Rotation speed of the live alert ticker</span>
        </div>
        <div className="flex gap-2">
          {TICKER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTicker(opt.value)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
                ticker === opt.value
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Retention */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-4 h-4 text-primary" />
          <h3 className="font-mono text-sm font-semibold text-foreground">Data Retention</h3>
          <span className="text-[10px] font-mono text-muted-foreground ml-auto">Lookback window for alert history and audit log queries</span>
        </div>
        <div className="flex gap-2">
          {RETENTION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setRetention(opt.value)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
                retention === opt.value
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-3 leading-relaxed">
          This controls how far back queries fetch data. It does not delete stored records — your source system handles actual retention.
        </p>
      </div>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-2.5 bg-primary/20 border border-primary/40 text-primary font-mono text-sm rounded-lg hover:bg-primary/30 transition-colors"
      >
        <Save className="w-4 h-4" />
        Save Preferences
      </button>
    </div>
  );
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({
  integration,
  settings,
  onChange,
  onSave,
  saving,
}: {
  integration: IntegrationDef;
  settings: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const configured = isConfigured(integration.fields, settings);

  return (
    <div className={`border rounded-xl transition-all ${configured ? 'border-primary/30 bg-primary/3' : 'border-border'}`}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <span className={`shrink-0 ${integration.color}`}>{integration.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground">{integration.name}</span>
            {configured ? (
              <span className="flex items-center gap-1 text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                <CheckCircle className="w-2.5 h-2.5" /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-secondary/60 border border-border px-1.5 py-0.5 rounded">
                <XCircle className="w-2.5 h-2.5" /> Not configured
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{integration.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {integration.docsUrl && (
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[10px] font-mono text-muted-foreground hover:text-primary flex items-center gap-1 border border-border rounded px-2 py-1 transition-colors"
            >
              <Link className="w-2.5 h-2.5" /> Docs
            </a>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Fields */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="pt-4 space-y-3">
            {integration.fields.map(field => {
              const isSecret = field.type === 'password';
              const revealed = showSecrets[field.key];
              const inputType = isSecret && !revealed ? 'password' : field.type === 'number' ? 'number' : 'text';
              return (
                <div key={field.key}>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      type={inputType}
                      placeholder={field.placeholder}
                      value={settings[field.key] ?? ''}
                      onChange={e => onChange(field.key, e.target.value)}
                      className="w-full bg-background border border-border rounded-md h-9 px-3 pr-9 text-sm font-mono text-foreground focus:outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/40"
                    />
                    {isSecret && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets(s => ({ ...s, [field.key]: !s[field.key] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="pt-1 flex items-center gap-3">
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/40 text-primary font-mono text-xs rounded-md hover:bg-primary/30 transition-colors disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => integration.fields.forEach(f => onChange(f.key, ''))}
                className="text-xs font-mono text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Integration Settings Tab ─────────────────────────────────────────────────

function IntegrationsTab() {
  const { data, isLoading } = useAdminGetSettings();
  const saveSettings = useAdminSaveSettings();
  const { toast } = useToast();

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setForm(data as Record<string, string>);
  }, [data]);

  const handleChange = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSave = async (integration: IntegrationDef) => {
    const patch: Record<string, string> = {};
    integration.fields.forEach(f => { patch[f.key] = form[f.key] ?? ''; });
    saveSettings.mutate(patch as any, {
      onSuccess: () => toast({ title: `${integration.name} saved`, description: 'Credentials updated successfully.' }),
      onError: () => toast({ title: 'Save failed', description: 'Could not save settings.', variant: 'destructive' }),
    });
  };

  const configuredCount = INTEGRATION_GROUPS.flatMap(g => g.integrations).filter(
    i => isConfigured(i.fields, form)
  ).length;
  const totalCount = INTEGRATION_GROUPS.flatMap(g => g.integrations).length;

  if (isLoading) {
    return <div className="p-6 font-mono text-sm text-muted-foreground">Loading settings…</div>;
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-card/80 border border-border rounded-lg">
        <div className="flex-1">
          <div className="text-xs font-mono text-muted-foreground">Configured integrations</div>
          <div className="text-sm font-mono text-foreground mt-0.5">
            <span className="text-primary font-bold">{configuredCount}</span>
            <span className="text-muted-foreground"> / {totalCount}</span>
          </div>
        </div>
        <div className="w-40 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(configuredCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {INTEGRATION_GROUPS.map(group => (
          <div key={group.title}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-muted-foreground">{group.icon}</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest font-semibold">{group.title}</span>
            </div>
            <div className="space-y-2">
              {group.integrations.map(integration => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  settings={form}
                  onChange={handleChange}
                  onSave={() => handleSave(integration)}
                  saving={saveSettings.isPending}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

type Tab = 'center' | 'integrations';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'center', label: 'Center Settings', icon: <Settings className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integration Settings', icon: <Link className="w-4 h-4" /> },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('center');

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="border-b border-border bg-card/50 px-6 py-4 shrink-0">
        <h1 className="font-mono text-lg font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage SOC center preferences and external integrations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card/30 flex gap-0 shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 font-mono text-sm border-b-2 transition-all ${
              tab === t.id
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tab === 'center' && <CenterSettingsTab />}
        {tab === 'integrations' && <IntegrationsTab />}
      </div>
    </div>
  );
}
