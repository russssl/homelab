import { BeszelSystem, BeszelSystemsResponse, BeszelRecordsResponse } from '@/types/beszel';

const REQUEST_TIMEOUT = 8000;

class BeszelAPI {
    private baseUrl: string = '';
    private fallbackUrl: string = '';
    private token: string = '';

    configure(url: string, token: string, fallbackUrl?: string) {
        this.baseUrl = url.replace(/\/+$/, '');
        this.fallbackUrl = fallbackUrl?.replace(/\/+$/, '') ?? '';
        this.token = token;
        console.log('[BeszelAPI] Configured with URL:', this.baseUrl, fallbackUrl ? `fallback: ${this.fallbackUrl}` : '');
    }

    setFallbackUrl(fallbackUrl: string) {
        this.fallbackUrl = fallbackUrl.replace(/\/+$/, '');
        console.log('[BeszelAPI] Fallback URL set:', this.fallbackUrl);
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
            'Authorization': this.token,
            ...options.headers,
        };
        const fetchOpts = { ...options, headers };

        const primaryUrl = `${this.baseUrl}/api${path}`;
        console.log('[BeszelAPI] Request:', options.method || 'GET', primaryUrl);

        try {
            const response = await this.fetchWithTimeout(primaryUrl, fetchOpts);
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Beszel API error: ${response.status}`);
            }
            return response.json() as Promise<T>;
        } catch (primaryError) {
            if (this.fallbackUrl) {
                const fallbackFullUrl = `${this.fallbackUrl}/api${path}`;
                console.log('[BeszelAPI] Primary failed, trying fallback:', fallbackFullUrl);
                try {
                    const response = await this.fetchWithTimeout(fallbackFullUrl, fetchOpts);
                    if (!response.ok) {
                        throw new Error(`Beszel API error: ${response.status}`);
                    }
                    return response.json() as Promise<T>;
                } catch (fallbackError) {
                    console.log('[BeszelAPI] Fallback also failed:', (fallbackError as Error).message);
                    throw new Error(`Connessione fallita su entrambi gli URL. Verifica la rete.`);
                }
            }
            throw primaryError;
        }
    }

    async authenticate(url: string, email: string, password: string): Promise<string> {
        const cleanUrl = url.replace(/\/+$/, '');
        console.log('[BeszelAPI] Authenticating with:', cleanUrl);

        const response = await fetch(`${cleanUrl}/api/collections/users/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: email, password }),
        });

        if (!response.ok) {
            console.log('[BeszelAPI] Auth error:', response.status);
            throw new Error('Authentication failed. Check your credentials and URL.');
        }

        const data = await response.json();
        console.log('[BeszelAPI] Auth successful');
        return data.token;
    }

    async getSystems(): Promise<BeszelSystemsResponse> {
        return this.request<BeszelSystemsResponse>(
            '/collections/systems/records?sort=-updated&perPage=50'
        );
    }

    async getSystem(id: string): Promise<BeszelSystem> {
        return this.request<BeszelSystem>(`/collections/systems/records/${id}`);
    }

    async getSystemRecords(systemId: string, limit: number = 60): Promise<BeszelRecordsResponse> {
        return this.request<BeszelRecordsResponse>(
            `/collections/system_stats/records?filter=(system='${systemId}')&sort=-created&perPage=${limit}`
        );
    }

    /** Quick reachability check. 3s timeout, tries fallback. Never throws. */
    async ping(): Promise<boolean> {
        if (!this.baseUrl) return false;
        const tryUrl = async (base: string): Promise<boolean> => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            try {
                const response = await fetch(`${base}/api/health`, {
                    headers: { 'Authorization': this.token },
                    signal: controller.signal,
                });
                return response.ok || response.status === 401; // 401 = reachable, just auth
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

export const beszelApi = new BeszelAPI();

