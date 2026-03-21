import crypto from "crypto";

// Realistic mock endpoint data with geo-coordinates
export const MOCK_ENDPOINTS = [
  // North America
  { id: "ep-001", hostname: "nyc-ws-001", ip: "10.0.1.10", externalIp: "203.0.113.10", os: "Windows 11", osVersion: "22H2", status: "healthy", country: "United States", countryCode: "US", city: "New York", coords: { lat: 40.7128, lng: -74.0060 }, agentVersion: "23.4.1", lastSeen: new Date(Date.now() - 120000).toISOString(), groupName: "Workstations-NYC", domain: "corp.example.com", cpuUsage: 34, memUsage: 62, source: "s1" },
  { id: "ep-002", hostname: "lax-srv-001", ip: "10.1.0.5", externalIp: "203.0.113.25", os: "Ubuntu Server", osVersion: "22.04 LTS", status: "threat", country: "United States", countryCode: "US", city: "Los Angeles", coords: { lat: 34.0522, lng: -118.2437 }, agentVersion: "23.4.1", lastSeen: new Date(Date.now() - 30000).toISOString(), groupName: "Servers-LAX", domain: "corp.example.com", cpuUsage: 98, memUsage: 91, threatName: "Cobalt Strike Beacon", threatSeverity: "critical", source: "s1" },
  { id: "ep-003", hostname: "chi-ws-042", ip: "10.0.2.42", externalIp: null, os: "Windows 10", osVersion: "21H2", status: "warning", country: "United States", countryCode: "US", city: "Chicago", coords: { lat: 41.8781, lng: -87.6298 }, agentVersion: "23.3.8", lastSeen: new Date(Date.now() - 300000).toISOString(), groupName: "Workstations-CHI", domain: "corp.example.com", cpuUsage: 78, memUsage: 85, source: "s1" },
  { id: "ep-004", hostname: "tor-srv-003", ip: "10.2.0.3", externalIp: "203.0.113.40", os: "Windows Server 2022", osVersion: "21H2", status: "healthy", country: "Canada", countryCode: "CA", city: "Toronto", coords: { lat: 43.6532, lng: -79.3832 }, agentVersion: "23.4.1", lastSeen: new Date(Date.now() - 60000).toISOString(), groupName: "Servers-TOR", domain: "corp.example.com", cpuUsage: 45, memUsage: 71, source: "s1" },
  { id: "ep-005", hostname: "sfo-ws-018", ip: "10.0.3.18", externalIp: null, os: "macOS", osVersion: "13.5 Ventura", status: "healthy", country: "United States", countryCode: "US", city: "San Francisco", coords: { lat: 37.7749, lng: -122.4194 }, agentVersion: "23.4.0", lastSeen: new Date(Date.now() - 90000).toISOString(), groupName: "Workstations-SFO", domain: "corp.example.com", cpuUsage: 22, memUsage: 54, source: "s1" },
  // Europe
  { id: "ep-006", hostname: "lon-srv-002", ip: "10.3.0.2", externalIp: "203.0.113.60", os: "Ubuntu Server", osVersion: "20.04 LTS", status: "threat", country: "United Kingdom", countryCode: "GB", city: "London", coords: { lat: 51.5074, lng: -0.1278 }, agentVersion: "23.4.1", lastSeen: new Date(Date.now() - 45000).toISOString(), groupName: "Servers-LON", domain: "corp.example.com", cpuUsage: 94, memUsage: 88, threatName: "Mimikatz", threatSeverity: "high", source: "s1" },
  { id: "ep-007", hostname: "ams-ws-007", ip: "10.3.1.7", externalIp: null, os: "Windows 11", osVersion: "22H2", status: "healthy", country: "Netherlands", countryCode: "NL", city: "Amsterdam", coords: { lat: 52.3676, lng: 4.9041 }, agentVersion: "23.4.1", lastSeen: new Date(Date.now() - 150000).toISOString(), groupName: "Workstations-AMS", domain: "corp.example.com", cpuUsage: 28, memUsage: 44, source: "s1" },
  { id: "ep-008", hostname: "fra-srv-005", ip: "10.3.2.5", externalIp: "203.0.113.75", os: "RHEL", osVersion: "9.1", status: "warning", country: "Germany", countryCode: "DE", city: "Frankfurt", coords: { lat: 50.1109, lng: 8.6821 }, agentVersion: "23.4.0", lastSeen: new Date(Date.now() - 600000).toISOString(), groupName: "Servers-FRA", domain: "corp.example.com", cpuUsage: 82, memUsage: 79, source: "s1" },
  { id: "ep-009", hostname: "par-ws-003", ip: "10.3.3.3", externalIp: null, os: "Windows 10", osVersion: "21H2", status: "offline", country: "France", countryCode: "FR", city: "Paris", coords: { lat: 48.8566, lng: 2.3522 }, agentVersion: "23.3.5", lastSeen: new Date(Date.now() - 3600000).toISOString(), groupName: "Workstations-PAR", domain: "corp.example.com", cpuUsage: null, memUsage: null, source: "s1" },
  { id: "ep-010", hostname: "mad-ws-011", ip: "10.3.4.11", externalIp: null, os: "Windows 11", osVersion: "22H2", status: "healthy", country: "Spain", countryCode: "ES", city: "Madrid", coords: { lat: 40.4168, lng: -3.7038 }, agentVersion: "23.4.1", lastSeen: new Date(Date.now() - 240000).toISOString(), groupName: "Workstations-MAD", domain: "corp.example.com", cpuUsage: 19, memUsage: 38, source: "s1" },
  // Asia Pacific
  { id: "ep-011", hostname: "tok-srv-001", ip: "10.4.0.1", externalIp: "203.0.113.90", os: "Ubuntu Server", osVersion: "22.04 LTS", status: "healthy", country: "Japan", countryCode: "JP", city: "Tokyo", coords: { lat: 35.6762, lng: 139.6503 }, agentVersion: "23.4.1", lastSeen: new Date(Date.now() - 80000).toISOString(), groupName: "Servers-TOK", domain: "corp.example.com", cpuUsage: 41, memUsage: 66, source: "s1" },
  { id: "ep-012", hostname: "sin-srv-002", ip: "10.4.1.2", externalIp: "203.0.113.105", os: "Windows Server 2019", osVersion: "1809", status: "threat", country: "Singapore", countryCode: "SG", city: "Singapore", coords: { lat: 1.3521, lng: 103.8198 }, agentVersion: "23.4.1", lastSeen: new Date(Date.now() - 20000).toISOString(), groupName: "Servers-SIN", domain: "corp.example.com", cpuUsage: 99, memUsage: 95, threatName: "WannaCry Variant", threatSeverity: "critical", source: "s1" },
  { id: "ep-013", hostname: "syd-ws-005", ip: "10.4.2.5", externalIp: null, os: "macOS", osVersion: "14.1 Sonoma", status: "healthy", country: "Australia", countryCode: "AU", city: "Sydney", coords: { lat: -33.8688, lng: 151.2093 }, agentVersion: "23.4.1", lastSeen: new Date(Date.now() - 200000).toISOString(), groupName: "Workstations-SYD", domain: "corp.example.com", cpuUsage: 15, memUsage: 42, source: "s1" },
  { id: "ep-014", hostname: "bom-ws-009", ip: "10.4.3.9", externalIp: null, os: "Windows 10", osVersion: "21H2", status: "warning", country: "India", countryCode: "IN", city: "Mumbai", coords: { lat: 19.0760, lng: 72.8777 }, agentVersion: "23.3.9", lastSeen: new Date(Date.now() - 450000).toISOString(), groupName: "Workstations-BOM", domain: "corp.example.com", cpuUsage: 71, memUsage: 83, source: "s1" },
  { id: "ep-015", hostname: "hkg-srv-004", ip: "10.4.4.4", externalIp: "203.0.113.120", os: "RHEL", osVersion: "8.7", status: "offline", country: "Hong Kong", countryCode: "HK", city: "Hong Kong", coords: { lat: 22.3193, lng: 114.1694 }, agentVersion: "23.3.7", lastSeen: new Date(Date.now() - 7200000).toISOString(), groupName: "Servers-HKG", domain: "corp.example.com", cpuUsage: null, memUsage: null, source: "s1" },
  // More
  { id: "ep-016", hostname: "sao-ws-003", ip: "10.5.0.3", externalIp: null, os: "Windows 11", osVersion: "22H2", status: "healthy", country: "Brazil", countryCode: "BR", city: "São Paulo", coords: { lat: -23.5505, lng: -46.6333 }, agentVersion: "23.4.0", lastSeen: new Date(Date.now() - 360000).toISOString(), groupName: "Workstations-SAO", domain: "corp.example.com", cpuUsage: 33, memUsage: 55, source: "s1" },
  { id: "ep-017", hostname: "jnb-srv-001", ip: "10.5.1.1", externalIp: "203.0.113.135", os: "Ubuntu Server", osVersion: "20.04 LTS", status: "warning", country: "South Africa", countryCode: "ZA", city: "Johannesburg", coords: { lat: -26.2041, lng: 28.0473 }, agentVersion: "23.4.0", lastSeen: new Date(Date.now() - 900000).toISOString(), groupName: "Servers-JNB", domain: "corp.example.com", cpuUsage: 76, memUsage: 82, source: "s1" },
  { id: "ep-018", hostname: "dxb-ws-006", ip: "10.5.2.6", externalIp: null, os: "Windows 11", osVersion: "22H2", status: "healthy", country: "UAE", countryCode: "AE", city: "Dubai", coords: { lat: 25.2048, lng: 55.2708 }, agentVersion: "23.4.1", lastSeen: new Date(Date.now() - 180000).toISOString(), groupName: "Workstations-DXB", domain: "corp.example.com", cpuUsage: 26, memUsage: 48, source: "s1" },
  { id: "ep-019", hostname: "mex-ws-014", ip: "10.0.4.14", externalIp: null, os: "Windows 10", osVersion: "21H2", status: "healthy", country: "Mexico", countryCode: "MX", city: "Mexico City", coords: { lat: 19.4326, lng: -99.1332 }, agentVersion: "23.4.0", lastSeen: new Date(Date.now() - 420000).toISOString(), groupName: "Workstations-MEX", domain: "corp.example.com", cpuUsage: 38, memUsage: 60, source: "s1" },
  { id: "ep-020", hostname: "sea-srv-007", ip: "10.6.0.7", externalIp: "203.0.113.150", os: "Windows Server 2022", osVersion: "21H2", status: "threat", country: "United States", countryCode: "US", city: "Seattle", coords: { lat: 47.6062, lng: -122.3321 }, agentVersion: "23.4.1", lastSeen: new Date(Date.now() - 15000).toISOString(), groupName: "Servers-SEA", domain: "corp.example.com", cpuUsage: 97, memUsage: 93, threatName: "Ransomware:Win32/Lockbit", threatSeverity: "critical", source: "s1" },
];

export const MOCK_THREATS = [
  { id: "thr-001", name: "Cobalt Strike Beacon", severity: "critical", classification: "Malware", agentComputerName: "lax-srv-001", agentIp: "10.1.0.5", filePath: "C:\\Windows\\Temp\\csbeacon.exe", createdAt: new Date(Date.now() - 1800000).toISOString(), updatedAt: new Date(Date.now() - 30000).toISOString(), resolved: false, mitigationStatus: "pending", endpointId: "ep-002" },
  { id: "thr-002", name: "Mimikatz", severity: "high", classification: "Hack Tool", agentComputerName: "lon-srv-002", agentIp: "10.3.0.2", filePath: "C:\\Users\\Admin\\Downloads\\mimi.exe", createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date(Date.now() - 45000).toISOString(), resolved: false, mitigationStatus: "mitigated", endpointId: "ep-006" },
  { id: "thr-003", name: "WannaCry Variant", severity: "critical", classification: "Ransomware", agentComputerName: "sin-srv-002", agentIp: "10.4.1.2", filePath: "C:\\ProgramData\\wncry.exe", createdAt: new Date(Date.now() - 900000).toISOString(), updatedAt: new Date(Date.now() - 20000).toISOString(), resolved: false, mitigationStatus: "pending", endpointId: "ep-012" },
  { id: "thr-004", name: "Ransomware:Win32/Lockbit", severity: "critical", classification: "Ransomware", agentComputerName: "sea-srv-007", agentIp: "10.6.0.7", filePath: "C:\\Windows\\System32\\svchost32.exe", createdAt: new Date(Date.now() - 600000).toISOString(), updatedAt: new Date(Date.now() - 15000).toISOString(), resolved: false, mitigationStatus: "pending", endpointId: "ep-020" },
  { id: "thr-005", name: "PUP.Optional.BundleInstaller", severity: "low", classification: "PUP", agentComputerName: "chi-ws-042", agentIp: "10.0.2.42", filePath: "C:\\Users\\user\\AppData\\Local\\Temp\\installer.exe", createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: new Date(Date.now() - 300000).toISOString(), resolved: true, mitigationStatus: "resolved" },
  { id: "thr-006", name: "Trojan.GenericKD.47383829", severity: "medium", classification: "Trojan", agentComputerName: "bom-ws-009", agentIp: "10.4.3.9", filePath: "/tmp/.systemd-private-001", createdAt: new Date(Date.now() - 5400000).toISOString(), updatedAt: new Date(Date.now() - 450000).toISOString(), resolved: false, mitigationStatus: "mitigating", endpointId: "ep-014" },
];

export const MOCK_ALERTS = [
  { id: "alt-001", name: "Suspicious PowerShell Execution", severity: "high", source: "s1", timestamp: new Date(Date.now() - 120000).toISOString(), endpointId: "ep-002", endpointName: "lax-srv-001", description: "PowerShell executed with encoded command bypassing execution policy", status: "active", category: "Execution" },
  { id: "alt-002", name: "LSASS Memory Access Detected", severity: "critical", source: "s1", timestamp: new Date(Date.now() - 45000).toISOString(), endpointId: "ep-006", endpointName: "lon-srv-002", description: "Mimikatz-like LSASS process memory dump detected", status: "active", category: "Credential Access" },
  { id: "alt-003", name: "Lateral Movement - SMB Share Access", severity: "high", source: "s1", timestamp: new Date(Date.now() - 900000).toISOString(), endpointId: "ep-012", endpointName: "sin-srv-002", description: "Unusual administrative share enumeration from external source", status: "active", category: "Lateral Movement" },
  { id: "alt-004", name: "Ransomware File Encryption Started", severity: "critical", source: "s1", timestamp: new Date(Date.now() - 600000).toISOString(), endpointId: "ep-020", endpointName: "sea-srv-007", description: "Mass file encryption activity detected matching LockBit behavior", status: "active", category: "Impact" },
  { id: "alt-005", name: "Suspicious Network Connection", severity: "medium", source: "s1", timestamp: new Date(Date.now() - 3600000).toISOString(), endpointId: "ep-003", endpointName: "chi-ws-042", description: "Connection to known C2 infrastructure (Tor exit node)", status: "acknowledged", category: "Command and Control" },
  { id: "alt-006", name: "Registry Persistence Key Created", severity: "high", source: "lr", timestamp: new Date(Date.now() - 1800000).toISOString(), endpointId: "ep-003", endpointName: "chi-ws-042", description: "New registry run key added for persistence", status: "acknowledged", category: "Persistence" },
  { id: "alt-007", name: "Brute Force Authentication", severity: "medium", source: "lr", timestamp: new Date(Date.now() - 5400000).toISOString(), endpointId: "ep-007", endpointName: "ams-ws-007", description: "500+ failed login attempts in 10 minutes", status: "resolved", category: "Credential Access" },
  { id: "alt-008", name: "Data Exfiltration Suspected", severity: "high", source: "lr", timestamp: new Date(Date.now() - 7200000).toISOString(), endpointId: "ep-011", endpointName: "tok-srv-001", description: "Unusually large outbound transfer to unrecognized destination", status: "active", category: "Exfiltration" },
  { id: "alt-009", name: "Malicious URL Accessed", severity: "low", source: "s1", timestamp: new Date(Date.now() - 10800000).toISOString(), endpointId: "ep-019", endpointName: "mex-ws-014", description: "User accessed known phishing URL", status: "resolved", category: "Initial Access" },
  { id: "alt-010", name: "DLL Side-Loading Attack", severity: "high", source: "s1", timestamp: new Date(Date.now() - 2700000).toISOString(), endpointId: "ep-014", endpointName: "bom-ws-009", description: "Legitimate application loaded malicious DLL from same directory", status: "active", category: "Defense Evasion" },
];

export const MOCK_IOCS = [
  { id: "ioc-001", type: "ip", value: "185.220.101.33", source: "ThreatFox", severity: "critical", description: "Tor exit node used for C2 communication", createdAt: new Date(Date.now() - 86400000).toISOString(), expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(), hits: 3 },
  { id: "ioc-002", type: "domain", value: "malware-c2.example.net", source: "URLhaus", severity: "critical", description: "LockBit ransomware C2 domain", createdAt: new Date(Date.now() - 172800000).toISOString(), hits: 7 },
  { id: "ioc-003", type: "hash", value: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd", source: "SentinelOne", severity: "high", description: "Cobalt Strike stager payload", createdAt: new Date(Date.now() - 3600000).toISOString(), hits: 2 },
  { id: "ioc-004", type: "url", value: "http://45.89.127.238/payload/drop.ps1", source: "ThreatFox", severity: "high", description: "PowerShell payload dropper URL", createdAt: new Date(Date.now() - 43200000).toISOString(), hits: 5 },
  { id: "ioc-005", type: "ip", value: "91.108.4.0", source: "AbuseIPDB", severity: "medium", description: "Known scanner/botnet IP", createdAt: new Date(Date.now() - 259200000).toISOString(), hits: 12 },
  { id: "ioc-006", type: "hash", value: "deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678", source: "MalwareBazaar", severity: "critical", description: "WannaCry ransomware variant hash", createdAt: new Date(Date.now() - 86400000).toISOString(), hits: 1 },
  { id: "ioc-007", type: "domain", value: "phishing-bank.ru", source: "URLhaus", severity: "high", description: "Banking phishing site", createdAt: new Date(Date.now() - 604800000).toISOString(), hits: 2 },
  { id: "ioc-008", type: "email", value: "attacker@evil-domain.net", source: "Internal", severity: "medium", description: "Spear phishing campaign sender", createdAt: new Date(Date.now() - 432000000).toISOString(), hits: 4 },
];

export const MOCK_LR_ALARMS = [
  { alarmId: 1001, alarmName: "Failed Login Threshold Exceeded", alarmStatus: "OpenAlarm", severity: 7, alarmDate: new Date(Date.now() - 1800000).toISOString(), entityName: "Primary Site", alarmRuleOwner: "SOC Team", associatedCases: ["case-002"] },
  { alarmId: 1002, alarmName: "New Outbound Connection to Untrusted Country", alarmStatus: "OpenAlarm", severity: 8, alarmDate: new Date(Date.now() - 3600000).toISOString(), entityName: "APAC Site", alarmRuleOwner: "SOC Team", associatedCases: [] },
  { alarmId: 1003, alarmName: "Malware Detected - Endpoint Security Alert", alarmStatus: "Resolved", severity: 9, alarmDate: new Date(Date.now() - 86400000).toISOString(), entityName: "EMEA Site", alarmRuleOwner: "IR Team", associatedCases: ["case-001"] },
  { alarmId: 1004, alarmName: "Privilege Escalation Detected", alarmStatus: "OpenAlarm", severity: 9, alarmDate: new Date(Date.now() - 900000).toISOString(), entityName: "Primary Site", alarmRuleOwner: "SOC Team", associatedCases: [] },
  { alarmId: 1005, alarmName: "Unusual Data Volume Transfer", alarmStatus: "Acknowledged", severity: 6, alarmDate: new Date(Date.now() - 7200000).toISOString(), entityName: "APAC Site", alarmRuleOwner: "SOC Team", associatedCases: ["case-003"] },
  { alarmId: 1006, alarmName: "DNS Tunneling Activity Detected", alarmStatus: "OpenAlarm", severity: 8, alarmDate: new Date(Date.now() - 2700000).toISOString(), entityName: "Primary Site", alarmRuleOwner: "SOC Team", associatedCases: [] },
  { alarmId: 1007, alarmName: "Process Injection Detected", alarmStatus: "OpenAlarm", severity: 9, alarmDate: new Date(Date.now() - 600000).toISOString(), entityName: "EMEA Site", alarmRuleOwner: "IR Team", associatedCases: ["case-004"] },
];

export const MOCK_LR_CASES = [
  { id: "case-001", name: "EMEA Malware Incident - London Server", status: { name: "Completed" }, priority: 1, owner: { name: "Alice Johnson" }, dueDate: new Date(Date.now() - 86400000).toISOString(), dateCreated: new Date(Date.now() - 172800000).toISOString(), collaborators: [{ name: "Bob Smith" }], alarmsCount: 3 },
  { id: "case-002", name: "Brute Force Campaign Investigation", status: { name: "InProgress" }, priority: 2, owner: { name: "Bob Smith" }, dueDate: new Date(Date.now() + 86400000).toISOString(), dateCreated: new Date(Date.now() - 86400000).toISOString(), collaborators: [{ name: "Alice Johnson" }, { name: "Charlie Brown" }], alarmsCount: 7 },
  { id: "case-003", name: "Suspicious APAC Data Exfiltration", status: { name: "Created" }, priority: 1, owner: { name: "Charlie Brown" }, dueDate: new Date(Date.now() + 172800000).toISOString(), dateCreated: new Date(Date.now() - 43200000).toISOString(), collaborators: [], alarmsCount: 2 },
  { id: "case-004", name: "EMEA Privilege Escalation Incident", status: { name: "InProgress" }, priority: 1, owner: { name: "Alice Johnson" }, dueDate: new Date(Date.now() + 43200000).toISOString(), dateCreated: new Date(Date.now() - 3600000).toISOString(), collaborators: [{ name: "Dave Wilson" }], alarmsCount: 4 },
];

export const MOCK_LR_LOG_SOURCES = [
  { id: 1, name: "Windows DC Primary", host: { name: "dc-01.corp.example.com" }, status: "Active", logSourceType: { name: "Windows Event Log" }, lastIngested: new Date(Date.now() - 5000).toISOString(), recordCount: 1482309 },
  { id: 2, name: "Palo Alto Firewall - Edge", host: { name: "fw-edge-01" }, status: "Active", logSourceType: { name: "Palo Alto Networks Firewall" }, lastIngested: new Date(Date.now() - 3000).toISOString(), recordCount: 8934521 },
  { id: 3, name: "Linux Syslog - App Servers", host: { name: "app-cluster-01" }, status: "Active", logSourceType: { name: "Syslog" }, lastIngested: new Date(Date.now() - 8000).toISOString(), recordCount: 3421876 },
  { id: 4, name: "IDS/IPS - Snort", host: { name: "ids-01" }, status: "Warning", logSourceType: { name: "Snort" }, lastIngested: new Date(Date.now() - 300000).toISOString(), recordCount: 567432 },
  { id: 5, name: "Active Directory - LDAP", host: { name: "ad-01.corp.example.com" }, status: "Active", logSourceType: { name: "LDAP" }, lastIngested: new Date(Date.now() - 10000).toISOString(), recordCount: 234521 },
  { id: 6, name: "Email Security Gateway", host: { name: "mail-gw-01" }, status: "Inactive", logSourceType: { name: "SMTP" }, lastIngested: new Date(Date.now() - 3600000).toISOString(), recordCount: 98231 },
  { id: 7, name: "VPN Concentrator", host: { name: "vpn-01" }, status: "Active", logSourceType: { name: "Cisco ASA" }, lastIngested: new Date(Date.now() - 12000).toISOString(), recordCount: 1234567 },
];

export const MOCK_LR_HOSTS = [
  { id: 1, name: "dc-01.corp.example.com", status: "Active", hostZone: "Internal", os: { type: "Windows" }, riskLevel: "High", location: "Primary Data Center" },
  { id: 2, name: "app-srv-01.corp.example.com", status: "Active", hostZone: "DMZ", os: { type: "Linux" }, riskLevel: "Medium", location: "Primary Data Center" },
  { id: 3, name: "fw-edge-01", status: "Active", hostZone: "External", os: { type: "PAN-OS" }, riskLevel: "High", location: "Edge" },
  { id: 4, name: "workstation-101", status: "Active", hostZone: "Internal", os: { type: "Windows" }, riskLevel: "Low", location: "HQ Office" },
  { id: 5, name: "mail-gw-01", status: "Retired", hostZone: "DMZ", os: { type: "Linux" }, riskLevel: "Medium", location: "Primary Data Center" },
];

export const MOCK_LR_NETWORKS = [
  { id: 1, name: "Primary Office Network", bip: "10.0.0.0", eip: "10.0.255.255", entityName: "Primary Site", hostCount: 245 },
  { id: 2, name: "APAC Network", bip: "10.4.0.0", eip: "10.4.255.255", entityName: "APAC Site", hostCount: 89 },
  { id: 3, name: "EMEA Network", bip: "10.3.0.0", eip: "10.3.255.255", entityName: "EMEA Site", hostCount: 134 },
  { id: 4, name: "DMZ", bip: "172.16.0.0", eip: "172.16.255.255", entityName: "Primary Site", hostCount: 12 },
  { id: 5, name: "Guest Network", bip: "192.168.100.0", eip: "192.168.100.255", entityName: "Primary Site", hostCount: 0 },
];

export const MOCK_LR_ENTITIES = [
  { id: 1, name: "Primary Site", fullName: "Primary Site", parentEntityId: null, safeListAllowed: true },
  { id: 2, name: "APAC Site", fullName: "Primary Site > APAC Site", parentEntityId: 1, safeListAllowed: true },
  { id: 3, name: "EMEA Site", fullName: "Primary Site > EMEA Site", parentEntityId: 1, safeListAllowed: true },
  { id: 4, name: "AMER Site", fullName: "Primary Site > AMER Site", parentEntityId: 1, safeListAllowed: true },
];

export const MOCK_LR_AGENTS = [
  { id: "lr-agent-001", name: "System Monitor Agent - DC01", status: "active", version: "7.4.10.8208", host: "dc-01.corp.example.com" },
  { id: "lr-agent-002", name: "System Monitor Agent - APP01", status: "active", version: "7.4.10.8208", host: "app-srv-01.corp.example.com" },
  { id: "lr-agent-003", name: "System Monitor Agent - WS101", status: "active", version: "7.4.9.7812", host: "workstation-101" },
  { id: "lr-agent-004", name: "System Monitor Agent - MAIL01", status: "inactive", version: "7.4.8.7234", host: "mail-gw-01" },
];

export const MOCK_LR_LISTS = [
  { id: 1, name: "Known Good IPs", listType: { name: "IP" }, status: "Active", entryCount: 234 },
  { id: 2, name: "Threat IP Blocklist", listType: { name: "IP" }, status: "Active", entryCount: 1893 },
  { id: 3, name: "Approved Domains", listType: { name: "Domain" }, status: "Active", entryCount: 567 },
  { id: 4, name: "Admin Usernames", listType: { name: "Identity" }, status: "Active", entryCount: 42 },
  { id: 5, name: "IOC Hash Library", listType: { name: "Hash" }, status: "Active", entryCount: 8921 },
];
