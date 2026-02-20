export interface PiholeStats {
    queries: {
        total: number;
        blocked: number;
        percent_blocked: number;
        unique_domains: number;
        forwarded: number;
        cached: number;
        types?: Record<string, number>;
    };
    gravity: {
        domains_being_blocked: number;
        last_update: number;
    };
}

export interface PiholeTopItem {
    domain: string;
    count: number;
}

export interface PiholeTopDomains {
    top_domains: PiholeTopItem[];
}

export interface PiholeTopBlocked {
    top_blocked: PiholeTopItem[];
}

export interface PiholeTopClients {
    top_clients: Array<{ name: string; ip: string; count: number }>;
}

export interface PiholeBlockingStatus {
    blocking: string;
}

export interface PiholeQueryHistory {
    history: Array<{
        timestamp: number;
        total: number;
        blocked: number;
    }>;
}

export interface PiholeUpstream {
    upstreams: Record<string, { count: number; ip: string; name: string; port: number }>;
    total_queries: number;
    forwarded_queries: number;
}

