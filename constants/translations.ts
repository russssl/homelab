export type Language = 'it' | 'en';

export interface Translations {
    loading: string;
    error: string;
    cancel: string;
    save: string;
    confirm: string;
    delete: string;
    back: string;
    close: string;
    copy: string;
    yes: string;
    no: string;
    noData: string;
    retry: string;

    tabHome: string;
    tabSettings: string;

    launcherTitle: string;
    launcherSubtitle: string;
    launcherConnected: string;
    launcherNotConfigured: string;
    launcherTapToConnect: string;
    launcherServices: string;

    statusUnreachable: string;
    statusVerifying: string;
    actionReconnect: string;

    greetingMorning: string;
    greetingAfternoon: string;
    greetingEvening: string;
    summaryTitle: string;
    summaryQueryTotal: string;
    summarySystemsOnline: string;

    servicePortainer: string;
    servicePihole: string;
    serviceBeszel: string;
    serviceGitea: string;
    servicePortainerDesc: string;
    servicePiholeDesc: string;
    serviceBeszelDesc: string;
    serviceGiteaDesc: string;

    loginTitle: string;
    loginSubtitle: string;
    loginUrl: string;
    loginUrlPlaceholder: string;
    loginUsername: string;
    loginEmail: string;
    loginPassword: string;
    loginConnect: string;
    loginConnecting: string;
    loginErrorUrl: string;
    loginErrorCredentials: string;
    loginErrorFailed: string;
    loginHintPihole: string;
    loginHintGitea2FA: string;

    portainerDashboard: string;
    portainerEndpoints: string;
    portainerActive: string;
    portainerContainers: string;
    portainerResources: string;
    portainerTotal: string;
    portainerRunning: string;
    portainerStopped: string;
    portainerImages: string;
    portainerVolumes: string;
    portainerCpus: string;
    portainerMemory: string;
    portainerViewAll: string;
    portainerSelectEndpoint: string;
    portainerServerInfo: string;
    portainerOnline: string;
    portainerOffline: string;
    portainerStacks: string;
    portainerHealthy: string;
    portainerUnhealthy: string;

    containersSearch: string;
    containersAll: string;
    containersRunning: string;
    containersStopped: string;
    containersEmpty: string;
    containersNoEndpoint: string;

    actionStart: string;
    actionStop: string;
    actionRestart: string;
    actionPause: string;
    actionResume: string;
    actionRemove: string;
    actionKill: string;
    actionConfirm: string;
    actionConfirmMessage: string;
    actionRemoveConfirm: string;
    actionRemoveMessage: string;

    detailInfo: string;
    detailStats: string;
    detailLogs: string;
    detailEnv: string;
    detailCompose: string;
    detailContainer: string;
    detailCreated: string;
    detailHostname: string;
    detailWorkDir: string;
    detailCommand: string;
    detailNetwork: string;
    detailMode: string;
    detailMounts: string;
    detailRestartPolicy: string;
    detailPolicy: string;
    detailMaxRetries: string;
    detailUptime: string;
    detailNotRunning: string;
    detailNoLogs: string;
    detailEnvVars: string;
    detailCpu: string;
    detailMemory: string;
    detailNetworkIO: string;
    detailUsed: string;
    detailContainerLogs: string;
    detailNotFound: string;
    detailComposeFile: string;
    detailComposeNotAvailable: string;
    detailComposeSave: string;
    detailComposeSaved: string;
    detailComposeSaveError: string;
    detailComposeLoading: string;

    piholeBlocking: string;
    piholeEnabled: string;
    piholeDisabled: string;
    piholeTotalQueries: string;
    piholeBlockedQueries: string;
    piholePercentBlocked: string;
    piholeTopBlocked: string;
    piholeTopDomains: string;
    piholeClients: string;
    piholeDomains: string;
    piholeGravity: string;
    piholeToggle: string;
    piholeQueries: string;
    piholeCached: string;
    piholeForwarded: string;
    piholeUniqueDomains: string;
    piholeBlockingWarningTitle: string;
    piholeBlockingWarningEnable: string;
    piholeBlockingWarningDisable: string;
    piholeBlockingDesc: string;
    piholeDisableDesc: string;
    piholeGravityUpdated: string;
    piholeOverview: string;
    piholeQueryActivity: string;

    beszelSystems: string;
    beszelUp: string;
    beszelDown: string;
    beszelCpu: string;
    beszelMemory: string;
    beszelDisk: string;
    beszelNetwork: string;
    beszelUptime: string;
    beszelNoSystems: string;
    beszelSystemDetail: string;
    beszelOs: string;
    beszelKernel: string;
    beszelHostname: string;
    beszelCpuModel: string;
    beszelTotalMemory: string;
    beszelUsedMemory: string;
    beszelTotalDisk: string;
    beszelUsedDisk: string;
    beszelNetworkSent: string;
    beszelNetworkReceived: string;
    beszelRefreshRate: string;
    beszelCores: string;
    beszelSystemInfo: string;
    beszelResources: string;
    beszelNetworkTraffic: string;

    giteaRepos: string;
    giteaOrgs: string;
    giteaStars: string;
    giteaForks: string;
    giteaIssues: string;
    giteaPrivate: string;
    giteaPublic: string;
    giteaNoRepos: string;
    giteaLanguage: string;
    gitea2FAHint: string;
    gitea2FAHintMessage: string;
    giteaFiles: string;
    giteaCommits: string;
    giteaBranches: string;
    giteaNoFiles: string;
    giteaNoCommits: string;
    giteaNoIssues: string;
    giteaOpenIssues: string;
    giteaClosedIssues: string;
    giteaDefaultBranch: string;
    giteaSize: string;
    giteaLastUpdate: string;
    giteaReadme: string;
    giteaOk: string;
    giteaContributions: string;
    giteaFileContent: string;
    giteaLessActive: string;
    giteaMoreActive: string;

    beszelContainers: string;
    beszelNoContainers: string;

    piholeQueriesOverTime: string;

    settingsPreferences: string;
    settingsLanguage: string;
    settingsTheme: string;
    settingsThemeLight: string;
    settingsThemeDark: string;
    settingsItalian: string;
    settingsEnglish: string;
    settingsServices: string;
    settingsDisconnect: string;
    settingsDisconnectConfirm: string;
    settingsDisconnectMessage: string;
    settingsAbout: string;
    settingsVersion: string;
    settingsConnected: string;
    settingsNotConnected: string;
}

const it: Translations = {
    loading: 'Caricamento...',
    error: 'Errore',
    cancel: 'Annulla',
    save: 'Salva',
    confirm: 'Conferma',
    delete: 'Elimina',
    back: 'Indietro',
    close: 'Chiudi',
    copy: 'Copia',
    yes: 'Sì',
    no: 'No',
    noData: 'Nessun dato',
    retry: 'Riprova',

    tabHome: 'Home',
    tabSettings: 'Impostazioni',

    launcherTitle: 'HomeLab',
    launcherSubtitle: 'Il tuo pannello di controllo',
    launcherConnected: 'Connesso',
    launcherNotConfigured: 'Non configurato',
    launcherTapToConnect: 'Tocca per connettere',
    launcherServices: 'Servizi',

    statusUnreachable: 'Non raggiungibile',
    statusVerifying: 'Verifica...',
    actionReconnect: 'Riconnetti',

    greetingMorning: 'Buongiorno',
    greetingAfternoon: 'Buon pomeriggio',
    greetingEvening: 'Buonasera',
    summaryTitle: 'Riepilogo',
    summaryQueryTotal: 'Query Totali',
    summarySystemsOnline: 'Sistemi Online',

    servicePortainer: 'Portainer',
    servicePihole: 'Pi-hole',
    serviceBeszel: 'Beszel',
    serviceGitea: 'Gitea',
    servicePortainerDesc: 'Gestione container Docker',
    servicePiholeDesc: 'Blocco pubblicità di rete',
    serviceBeszelDesc: 'Monitoraggio server',
    serviceGiteaDesc: 'Hosting Git self-hosted',

    loginTitle: 'Connetti',
    loginSubtitle: 'Inserisci le credenziali del servizio',
    loginUrl: 'URL Server',
    loginUrlPlaceholder: 'https://servizio.esempio.com',
    loginUsername: 'Nome utente',
    loginEmail: 'Email',
    loginPassword: 'Password',
    loginConnect: 'Connetti',
    loginConnecting: 'Connessione...',
    loginErrorUrl: 'Inserisci l\'URL del server',
    loginErrorCredentials: 'Inserisci le credenziali',
    loginErrorFailed: 'Connessione fallita',
    loginHintPihole: 'Usa la password configurata nelle impostazioni di Pi-hole (Impostazioni → API / Web Interface → Password API)',
    loginHintGitea2FA: 'Se hai l\'autenticazione a due fattori attiva, genera una password app da Impostazioni → Applicazioni nel tuo Gitea.',

    portainerDashboard: 'Portainer',
    portainerEndpoints: 'Endpoint',
    portainerActive: 'Attivo',
    portainerContainers: 'Container',
    portainerResources: 'Risorse',
    portainerTotal: 'Totali',
    portainerRunning: 'Attivi',
    portainerStopped: 'Fermati',
    portainerImages: 'Immagini',
    portainerVolumes: 'Volumi',
    portainerCpus: 'CPU',
    portainerMemory: 'Memoria',
    portainerViewAll: 'Tutti i container',
    portainerSelectEndpoint: 'Seleziona un endpoint',
    portainerServerInfo: 'Info Server',
    portainerOnline: 'Online',
    portainerOffline: 'Offline',
    portainerStacks: 'Stack',
    portainerHealthy: 'Healthy',
    portainerUnhealthy: 'Unhealthy',

    containersSearch: 'Cerca container...',
    containersAll: 'Tutti',
    containersRunning: 'Attivi',
    containersStopped: 'Fermati',
    containersEmpty: 'Nessun container trovato',
    containersNoEndpoint: 'Seleziona prima un endpoint',

    actionStart: 'Avvia',
    actionStop: 'Ferma',
    actionRestart: 'Riavvia',
    actionPause: 'Pausa',
    actionResume: 'Riprendi',
    actionRemove: 'Rimuovi',
    actionKill: 'Termina',
    actionConfirm: 'Conferma Azione',
    actionConfirmMessage: 'Sei sicuro di voler eseguire questa azione?',
    actionRemoveConfirm: 'Rimuovi Container',
    actionRemoveMessage: 'Questa azione è irreversibile. Continuare?',

    detailInfo: 'Info',
    detailStats: 'Stats',
    detailLogs: 'Log',
    detailEnv: 'Env',
    detailCompose: 'Compose',
    detailContainer: 'Container',
    detailCreated: 'Creato',
    detailHostname: 'Hostname',
    detailWorkDir: 'Dir Lavoro',
    detailCommand: 'Comando',
    detailNetwork: 'Rete',
    detailMode: 'Modalità',
    detailMounts: 'Volumi',
    detailRestartPolicy: 'Policy Riavvio',
    detailPolicy: 'Policy',
    detailMaxRetries: 'Max Tentativi',
    detailUptime: 'Uptime',
    detailNotRunning: 'Il container non è in esecuzione',
    detailNoLogs: 'Nessun log disponibile',
    detailEnvVars: 'Variabili d\'Ambiente',
    detailCpu: 'CPU',
    detailMemory: 'Memoria',
    detailNetworkIO: 'I/O Rete',
    detailUsed: 'utilizzato',
    detailContainerLogs: 'Log Container',
    detailNotFound: 'Container non trovato',
    detailComposeFile: 'File Docker Compose',
    detailComposeNotAvailable: 'Docker Compose non disponibile per questo container',
    detailComposeSave: 'Salva Modifiche',
    detailComposeSaved: 'Compose salvato con successo',
    detailComposeSaveError: 'Errore nel salvataggio del compose',
    detailComposeLoading: 'Caricamento compose...',

    piholeBlocking: 'Blocco Annunci',
    piholeEnabled: 'Attivo',
    piholeDisabled: 'Disattivo',
    piholeTotalQueries: 'Query Totali',
    piholeBlockedQueries: 'Query Bloccate',
    piholePercentBlocked: '% Bloccata',
    piholeTopBlocked: 'Più Bloccati',
    piholeTopDomains: 'Domini Principali',
    piholeClients: 'Client Principali',
    piholeDomains: 'Domini',
    piholeGravity: 'Domini in Gravity',
    piholeToggle: 'Attiva/Disattiva Blocco',
    piholeQueries: 'Statistiche Query',
    piholeCached: 'In Cache',
    piholeForwarded: 'Inoltrate',
    piholeUniqueDomains: 'Domini Unici',
    piholeBlockingWarningTitle: 'Blocco Annunci',
    piholeBlockingWarningEnable: 'Vuoi riattivare il blocco degli annunci? Tutte le query DNS verranno nuovamente filtrate attraverso le liste di blocco.',
    piholeBlockingWarningDisable: 'Vuoi disattivare il blocco degli annunci? Tutti gli annunci e i tracker saranno temporaneamente consentiti. Le query DNS non verranno più filtrate.',
    piholeBlockingDesc: 'Il blocco DNS è attivo. Annunci, tracker e domini malevoli vengono filtrati automaticamente.',
    piholeDisableDesc: 'Il blocco DNS è disattivato. Tutto il traffico passa senza filtri.',
    piholeGravityUpdated: 'Ultimo aggiornamento Gravity',
    piholeOverview: 'Panoramica',
    piholeQueryActivity: 'Attività Query',

    beszelSystems: 'Sistemi',
    beszelUp: 'Online',
    beszelDown: 'Offline',
    beszelCpu: 'CPU',
    beszelMemory: 'Memoria',
    beszelDisk: 'Disco',
    beszelNetwork: 'Rete',
    beszelUptime: 'Uptime',
    beszelNoSystems: 'Nessun sistema trovato',
    beszelSystemDetail: 'Dettagli Sistema',
    beszelOs: 'Sistema Operativo',
    beszelKernel: 'Kernel',
    beszelHostname: 'Hostname',
    beszelCpuModel: 'Modello CPU',
    beszelTotalMemory: 'Memoria Totale',
    beszelUsedMemory: 'Memoria Usata',
    beszelTotalDisk: 'Disco Totale',
    beszelUsedDisk: 'Disco Usato',
    beszelNetworkSent: 'Inviati',
    beszelNetworkReceived: 'Ricevuti',
    beszelRefreshRate: 'Aggiornamento ogni 15s',
    beszelCores: 'Core',
    beszelSystemInfo: 'Informazioni Sistema',
    beszelResources: 'Risorse',
    beszelNetworkTraffic: 'Traffico di Rete',

    giteaRepos: 'Repository',
    giteaOrgs: 'Organizzazioni',
    giteaStars: 'Stelle',
    giteaForks: 'Fork',
    giteaIssues: 'Issue',
    giteaPrivate: 'Privato',
    giteaPublic: 'Pubblico',
    giteaNoRepos: 'Nessun repository trovato',
    giteaLanguage: 'Linguaggio',
    gitea2FAHint: 'Autenticazione a Due Fattori',
    gitea2FAHintMessage: 'Se hai l\'autenticazione a due fattori (2FA) attiva su Gitea, dovrai generare una password applicazione. Vai su Impostazioni → Applicazioni nel tuo Gitea per crearla, poi usa quella come password qui.',
    giteaFiles: 'File',
    giteaCommits: 'Commit',
    giteaBranches: 'Branch',
    giteaNoFiles: 'Nessun file',
    giteaNoCommits: 'Nessun commit',
    giteaNoIssues: 'Nessuna issue',
    giteaOpenIssues: 'Aperte',
    giteaClosedIssues: 'Chiuse',
    giteaDefaultBranch: 'Branch Predefinito',
    giteaSize: 'Dimensione',
    giteaLastUpdate: 'Ultimo Aggiornamento',
    giteaReadme: 'README',
    giteaOk: 'Ho capito',
    giteaContributions: 'Contribuzioni',
    giteaFileContent: 'Contenuto File',
    giteaLessActive: 'Meno',
    giteaMoreActive: 'Più',

    beszelContainers: 'Container',
    beszelNoContainers: 'Nessun container',

    piholeQueriesOverTime: 'Query nel Tempo',

    settingsPreferences: 'Preferenze',
    settingsLanguage: 'Lingua',
    settingsTheme: 'Tema',
    settingsThemeLight: 'Chiaro',
    settingsThemeDark: 'Scuro',
    settingsItalian: 'Italiano',
    settingsEnglish: 'English',
    settingsServices: 'Servizi Configurati',
    settingsDisconnect: 'Disconnetti',
    settingsDisconnectConfirm: 'Disconnetti',
    settingsDisconnectMessage: 'Sei sicuro di volerti disconnettere da questo servizio?',
    settingsAbout: 'Info',
    settingsVersion: 'Versione',
    settingsConnected: 'Connesso',
    settingsNotConnected: 'Non connesso',
};

const en: Translations = {
    loading: 'Loading...',
    error: 'Error',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
    delete: 'Delete',
    back: 'Back',
    close: 'Close',
    copy: 'Copy',
    yes: 'Yes',
    no: 'No',
    noData: 'No data',
    retry: 'Retry',

    tabHome: 'Home',
    tabSettings: 'Settings',

    launcherTitle: 'HomeLab',
    launcherSubtitle: 'Your control panel',
    launcherConnected: 'Connected',
    launcherNotConfigured: 'Not configured',
    launcherTapToConnect: 'Tap to connect',
    launcherServices: 'Services',

    statusUnreachable: 'Unreachable',
    statusVerifying: 'Verifying...',
    actionReconnect: 'Reconnect',

    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    summaryTitle: 'Summary',
    summaryQueryTotal: 'Total Queries',
    summarySystemsOnline: 'Systems Online',

    servicePortainer: 'Portainer',
    servicePihole: 'Pi-hole',
    serviceBeszel: 'Beszel',
    serviceGitea: 'Gitea',
    servicePortainerDesc: 'Docker container management',
    servicePiholeDesc: 'Network-wide ad blocking',
    serviceBeszelDesc: 'Server monitoring',
    serviceGiteaDesc: 'Self-hosted Git hosting',

    loginTitle: 'Connect',
    loginSubtitle: 'Enter service credentials',
    loginUrl: 'Server URL',
    loginUrlPlaceholder: 'https://service.example.com',
    loginUsername: 'Username',
    loginEmail: 'Email',
    loginPassword: 'Password',
    loginConnect: 'Connect',
    loginConnecting: 'Connecting...',
    loginErrorUrl: 'Enter the server URL',
    loginErrorCredentials: 'Enter credentials',
    loginErrorFailed: 'Connection failed',
    loginHintPihole: 'Use the password configured in Pi-hole settings (Settings → API / Web Interface → API Password)',
    loginHintGitea2FA: 'If you have two-factor auth enabled, generate an app password from Settings → Applications in your Gitea.',

    portainerDashboard: 'Portainer',
    portainerEndpoints: 'Endpoints',
    portainerActive: 'Active',
    portainerContainers: 'Containers',
    portainerResources: 'Resources',
    portainerTotal: 'Total',
    portainerRunning: 'Running',
    portainerStopped: 'Stopped',
    portainerImages: 'Images',
    portainerVolumes: 'Volumes',
    portainerCpus: 'CPUs',
    portainerMemory: 'Memory',
    portainerViewAll: 'All containers',
    portainerSelectEndpoint: 'Select an endpoint',
    portainerServerInfo: 'Server Info',
    portainerOnline: 'Online',
    portainerOffline: 'Offline',
    portainerStacks: 'Stacks',
    portainerHealthy: 'Healthy',
    portainerUnhealthy: 'Unhealthy',

    containersSearch: 'Search containers...',
    containersAll: 'All',
    containersRunning: 'Running',
    containersStopped: 'Stopped',
    containersEmpty: 'No containers found',
    containersNoEndpoint: 'Select an endpoint first',

    actionStart: 'Start',
    actionStop: 'Stop',
    actionRestart: 'Restart',
    actionPause: 'Pause',
    actionResume: 'Resume',
    actionRemove: 'Remove',
    actionKill: 'Kill',
    actionConfirm: 'Confirm Action',
    actionConfirmMessage: 'Are you sure you want to perform this action?',
    actionRemoveConfirm: 'Remove Container',
    actionRemoveMessage: 'This action is irreversible. Continue?',

    detailInfo: 'Info',
    detailStats: 'Stats',
    detailLogs: 'Logs',
    detailEnv: 'Env',
    detailCompose: 'Compose',
    detailContainer: 'Container',
    detailCreated: 'Created',
    detailHostname: 'Hostname',
    detailWorkDir: 'WorkDir',
    detailCommand: 'Command',
    detailNetwork: 'Network',
    detailMode: 'Mode',
    detailMounts: 'Mounts',
    detailRestartPolicy: 'Restart Policy',
    detailPolicy: 'Policy',
    detailMaxRetries: 'Max Retries',
    detailUptime: 'Uptime',
    detailNotRunning: 'Container is not running',
    detailNoLogs: 'No logs available',
    detailEnvVars: 'Environment Variables',
    detailCpu: 'CPU',
    detailMemory: 'Memory',
    detailNetworkIO: 'Network I/O',
    detailUsed: 'used',
    detailContainerLogs: 'Container Logs',
    detailNotFound: 'Container not found',
    detailComposeFile: 'Docker Compose File',
    detailComposeNotAvailable: 'Docker Compose not available for this container',
    detailComposeSave: 'Save Changes',
    detailComposeSaved: 'Compose saved successfully',
    detailComposeSaveError: 'Error saving compose file',
    detailComposeLoading: 'Loading compose...',

    piholeBlocking: 'Ad Blocking',
    piholeEnabled: 'Enabled',
    piholeDisabled: 'Disabled',
    piholeTotalQueries: 'Total Queries',
    piholeBlockedQueries: 'Blocked Queries',
    piholePercentBlocked: '% Blocked',
    piholeTopBlocked: 'Top Blocked',
    piholeTopDomains: 'Top Domains',
    piholeClients: 'Top Clients',
    piholeDomains: 'Domains',
    piholeGravity: 'Gravity Domains',
    piholeToggle: 'Toggle Blocking',
    piholeQueries: 'Query Statistics',
    piholeCached: 'Cached',
    piholeForwarded: 'Forwarded',
    piholeUniqueDomains: 'Unique Domains',
    piholeBlockingWarningTitle: 'Ad Blocking',
    piholeBlockingWarningEnable: 'Do you want to re-enable ad blocking? All DNS queries will be filtered through blocklists again.',
    piholeBlockingWarningDisable: 'Do you want to disable ad blocking? All ads and trackers will be temporarily allowed. DNS queries will no longer be filtered.',
    piholeBlockingDesc: 'DNS blocking is active. Ads, trackers and malicious domains are automatically filtered.',
    piholeDisableDesc: 'DNS blocking is disabled. All traffic passes without filtering.',
    piholeGravityUpdated: 'Last Gravity update',
    piholeOverview: 'Overview',
    piholeQueryActivity: 'Query Activity',

    beszelSystems: 'Systems',
    beszelUp: 'Online',
    beszelDown: 'Offline',
    beszelCpu: 'CPU',
    beszelMemory: 'Memory',
    beszelDisk: 'Disk',
    beszelNetwork: 'Network',
    beszelUptime: 'Uptime',
    beszelNoSystems: 'No systems found',
    beszelSystemDetail: 'System Details',
    beszelOs: 'Operating System',
    beszelKernel: 'Kernel',
    beszelHostname: 'Hostname',
    beszelCpuModel: 'CPU Model',
    beszelTotalMemory: 'Total Memory',
    beszelUsedMemory: 'Used Memory',
    beszelTotalDisk: 'Total Disk',
    beszelUsedDisk: 'Used Disk',
    beszelNetworkSent: 'Sent',
    beszelNetworkReceived: 'Received',
    beszelRefreshRate: 'Refreshes every 15s',
    beszelCores: 'Cores',
    beszelSystemInfo: 'System Information',
    beszelResources: 'Resources',
    beszelNetworkTraffic: 'Network Traffic',

    giteaRepos: 'Repositories',
    giteaOrgs: 'Organizations',
    giteaStars: 'Stars',
    giteaForks: 'Forks',
    giteaIssues: 'Issues',
    giteaPrivate: 'Private',
    giteaPublic: 'Public',
    giteaNoRepos: 'No repositories found',
    giteaLanguage: 'Language',
    gitea2FAHint: 'Two-Factor Authentication',
    gitea2FAHintMessage: 'If you have two-factor authentication (2FA) enabled on Gitea, you\'ll need to generate an app password. Go to Settings → Applications in your Gitea to create one, then use it as the password here.',
    giteaFiles: 'Files',
    giteaCommits: 'Commits',
    giteaBranches: 'Branches',
    giteaNoFiles: 'No files',
    giteaNoCommits: 'No commits',
    giteaNoIssues: 'No issues',
    giteaOpenIssues: 'Open',
    giteaClosedIssues: 'Closed',
    giteaDefaultBranch: 'Default Branch',
    giteaSize: 'Size',
    giteaLastUpdate: 'Last Update',
    giteaReadme: 'README',
    giteaOk: 'Got it',
    giteaContributions: 'Contributions',
    giteaFileContent: 'File Content',
    giteaLessActive: 'Less',
    giteaMoreActive: 'More',

    beszelContainers: 'Containers',
    beszelNoContainers: 'No containers',

    piholeQueriesOverTime: 'Queries Over Time',

    settingsPreferences: 'Preferences',
    settingsLanguage: 'Language',
    settingsTheme: 'Theme',
    settingsThemeLight: 'Light',
    settingsThemeDark: 'Dark',
    settingsItalian: 'Italiano',
    settingsEnglish: 'English',
    settingsServices: 'Configured Services',
    settingsDisconnect: 'Disconnect',
    settingsDisconnectConfirm: 'Disconnect',
    settingsDisconnectMessage: 'Are you sure you want to disconnect from this service?',
    settingsAbout: 'About',
    settingsVersion: 'Version',
    settingsConnected: 'Connected',
    settingsNotConnected: 'Not connected',
};

export const translations: Record<Language, Translations> = { it, en };

