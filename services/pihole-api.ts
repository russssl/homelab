import {
    PiholeStats,
    PiholeBlockingStatus,
    PiholeTopDomains,
    PiholeTopBlocked,
    PiholeTopClients,
    PiholeQueryHistory,
    PiholeUpstream,
} from '@/types/pihole';

const REQUEST_TIMEOUT = 8000;

class PiholeAPI {
    private baseUrl: string = '';
    private fallbackUrl: string = '';
    private sid: string = '';

    configure(url: string, sid: string, fallbackUrl?: string) {
        this.baseUrl = url.replace(/\/+$/, '');
        this.fallbackUrl = fallbackUrl?.replace(/\/+$/, '') ?? '';
        this.sid = sid;
        console.log('[PiholeAPI] Configured with URL:', this.baseUrl, fallbackUrl ? `fallback: ${this.fallbackUrl}` : '');
    }

    setFallbackUrl(fallbackUrl: string) {
        this.fallbackUrl = fallbackUrl.replace(/\/+$/, '');
        console.log('[PiholeAPI] Fallback URL set:', this.fallbackUrl);
    }

    getFallbackUrl(): string {
        return this.fallbackUrl;
    }

    private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            return response;
        } finally {
            clearTimeout(timeout);
        }
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const headers = {
            'Content-Type': 'application/json',
            'X-FTL-SID': this.sid,
            ...options.headers,
        };
        const fetchOpts = { ...options, headers };

        const primaryUrl = `${this.baseUrl}/api${path}`;
        console.log('[PiholeAPI] Request:', options.method || 'GET', primaryUrl);

        try {
            const response = await this.fetchWithTimeout(primaryUrl, fetchOpts);
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Pi-hole API error: ${response.status}`);
            }
            return response.json() as Promise<T>;
        } catch (primaryError) {
            if (this.fallbackUrl) {
                const fallbackFullUrl = `${this.fallbackUrl}/api${path}`;
                console.log('[PiholeAPI] Primary failed, trying fallback:', fallbackFullUrl);
                try {
                    const response = await this.fetchWithTimeout(fallbackFullUrl, fetchOpts);
                    if (!response.ok) {
                        throw new Error(`Pi-hole API error: ${response.status}`);
                    }
                    return response.json() as Promise<T>;
                } catch (fallbackError) {
                    console.log('[PiholeAPI] Fallback also failed:', (fallbackError as Error).message);
                    throw new Error(`Connessione fallita su entrambi gli URL. Verifica la rete.`);
                }
            }
            throw primaryError;
        }
    }

    async authenticate(url: string, password: string): Promise<string> {
        const cleanUrl = url.replace(/\/+$/, '');
        console.log('[PiholeAPI] Authenticating with:', cleanUrl);

        const response = await fetch(`${cleanUrl}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        if (!response.ok) {
            console.log('[PiholeAPI] Auth error:', response.status);
            throw new Error('Authentication failed. Check your password and URL.');
        }

        const data = await response.json();
        console.log('[PiholeAPI] Auth successful');
        return data.session?.sid ?? '';
    }

    async getStats(): Promise<PiholeStats> {
        return this.request<PiholeStats>('/stats/summary');
    }

    async getBlockingStatus(): Promise<PiholeBlockingStatus> {
        return this.request<PiholeBlockingStatus>('/dns/blocking');
    }

    async setBlocking(enabled: boolean, timer?: number): Promise<void> {
        await this.request('/dns/blocking', {
            method: 'POST',
            body: JSON.stringify({
                blocking: enabled,
                ...(timer ? { timer } : {}),
            }),
        });
        console.log('[PiholeAPI] Blocking set to:', enabled);
    }

    private parseTopItems(data: any, rootKeys: string[], itemKeys: string[]): any[] {
        let items: any[] = [];
        if (Array.isArray(data)) return data;

        for (const rootKey of rootKeys) {
            if (data[rootKey]) {
                if (Array.isArray(data[rootKey])) {
                    items = data[rootKey];
                } else {
                    items = Object.entries(data[rootKey]).map(([key, value]) => ({
                        [itemKeys[0]]: key,
                        [itemKeys[1]]: value
                    }));
                }
                break;
            }
        }
        return items;
    }

    async getTopDomains(count: number = 10): Promise<PiholeTopDomains> {
        let raw;
        try {
            raw = await this.request<any>(`/stats/top_domains?count=${count}`);
        } catch (e) {
            raw = await this.request<any>(`/stats/top_queries?count=${count}`);
        }
        let parsed = this.parseTopItems(raw, ['top_domains', 'top_queries', 'domains', 'queries'], ['domain', 'count']);

        parsed = parsed.map(item => ({
            domain: item.domain || item.query || item.name || item.ip || Object.values(item)[0] || 'Unknown',
            count: item.count !== undefined ? item.count : (item.hits || item.total || Object.values(item)[1] || 0)
        }));

        return { top_domains: parsed };
    }

    async getTopBlocked(count: number = 10): Promise<PiholeTopBlocked> {
        let raw;
        try {
            raw = await this.request<any>(`/stats/top_blocked?count=${count}`);
        } catch (e) {
            raw = await this.request<any>(`/stats/top_ads?count=${count}`);
        }
        let parsed = this.parseTopItems(raw, ['top_blocked', 'top_ads', 'blocked', 'ads'], ['domain', 'count']);

        parsed = parsed.map(item => ({
            domain: item.domain || item.query || item.name || item.ip || Object.values(item)[0] || 'Unknown',
            count: item.count !== undefined ? item.count : (item.hits || item.total || Object.values(item)[1] || 0)
        }));

        return { top_blocked: parsed };
    }

    async getTopClients(count: number = 10): Promise<PiholeTopClients> {
        let raw;
        try {
            raw = await this.request<any>(`/stats/top_clients?count=${count}`);
        } catch (e) {
            raw = await this.request<any>(`/stats/top_sources?count=${count}`);
        }
        let parsed = this.parseTopItems(raw, ['top_clients', 'top_sources', 'clients', 'sources'], ['ip', 'count']);

        parsed = parsed.map((item: any) => {
            const ipStr = item.ip || item.name || item.domain || Object.values(item)[0] || '';
            let finalName = '';
            let finalIp = '';

            if (ipStr && typeof ipStr === 'string' && ipStr.includes('|')) {
                const parts = ipStr.split('|');
                finalName = parts[0];
                finalIp = parts[1] || parts[0];
            } else {
                finalName = item.name || ipStr;
                finalIp = ipStr;
            }

            return {
                name: String(finalName),
                ip: String(finalIp),
                count: item.count !== undefined ? item.count : (item.hits || item.total || Object.values(item)[1] || 0)
            };
        });

        return { top_clients: parsed };
    }

    async getQueryHistory(): Promise<PiholeQueryHistory> {
        return this.request<PiholeQueryHistory>('/history');
    }

    async getUpstreams(): Promise<PiholeUpstream> {
        return this.request<PiholeUpstream>('/stats/upstreams');
    }

    /** Quick reachability check. 3s timeout, tries fallback. Never throws. */
    async ping(): Promise<boolean> {
        if (!this.baseUrl) return false;
        const tryUrl = async (base: string): Promise<boolean> => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            try {
                // Include auth header — Pi-hole v6 may return 401 for unauthenticated requests.
                // ANY HTTP response (200, 401, 403...) = server is reachable.
                // Only a network error (timeout, ECONNREFUSED) = truly offline.
                const response = await fetch(`${base}/api/info/version`, {
                    headers: { 'X-FTL-SID': this.sid },
                    signal: controller.signal,
                });
                return response.status < 600; // any valid HTTP response = reachable
            } catch {
                return false;
            } finally {
                clearTimeout(timeout);
            }
        };
        if (await tryUrl(this.baseUrl)) return true;
        if (this.fallbackUrl) return tryUrl(this.fallbackUrl);
        return false;
    }
}

export const piholeApi = new PiholeAPI();

