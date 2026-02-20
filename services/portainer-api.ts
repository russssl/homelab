import {
    PortainerEndpoint,
    Container,
    ContainerDetail,
    ContainerStats,
    ContainerAction,
} from '@/types/portainer';

const REQUEST_TIMEOUT = 8000;

class PortainerAPI {
    private baseUrl: string = '';
    private fallbackUrl: string = '';
    private jwt: string = '';
    private apiKey: string = '';
    private useApiKey: boolean = false;

    configure(url: string, jwt: string, fallbackUrl?: string) {
        this.baseUrl = url.replace(/\/+$/, '');
        this.fallbackUrl = fallbackUrl?.replace(/\/+$/, '') ?? '';
        this.jwt = jwt;
        this.apiKey = '';
        this.useApiKey = false;
        console.log('[PortainerAPI] Configured with JWT, URL:', this.baseUrl, fallbackUrl ? `fallback: ${this.fallbackUrl}` : '');
    }

    configureWithApiKey(url: string, apiKey: string, fallbackUrl?: string) {
        this.baseUrl = url.replace(/\/+$/, '');
        this.fallbackUrl = fallbackUrl?.replace(/\/+$/, '') ?? '';
        this.apiKey = apiKey;
        this.jwt = '';
        this.useApiKey = true;
        console.log('[PortainerAPI] Configured with API Key, URL:', this.baseUrl, fallbackUrl ? `fallback: ${this.fallbackUrl}` : '');
    }

    setFallbackUrl(fallbackUrl: string) {
        this.fallbackUrl = fallbackUrl.replace(/\/+$/, '');
        console.log('[PortainerAPI] Fallback URL set:', this.fallbackUrl);
    }

    getFallbackUrl(): string {
        return this.fallbackUrl;
    }

    isUsingApiKey(): boolean {
        return this.useApiKey;
    }

    getApiKey(): string {
        return this.apiKey;
    }

    private buildHeaders(extra?: Record<string, string>): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(extra || {}),
        };
        if (this.useApiKey) {
            headers['X-API-Key'] = this.apiKey;
        } else {
            headers['Authorization'] = `Bearer ${this.jwt}`;
        }
        return headers;
    }

    private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        try {
            const response = await fetch(url, { ...options, credentials: 'omit', signal: controller.signal });
            return response;
        } finally {
            clearTimeout(timeout);
        }
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const method = options.method || 'GET';
        const headers = this.buildHeaders(options.headers as Record<string, string>);
        const fetchOpts = { ...options, headers };

        const primaryUrl = `${this.baseUrl}/api${path}`;
        console.log('[PortainerAPI] Request:', method, primaryUrl);

        try {
            const response = await this.fetchWithTimeout(primaryUrl, fetchOpts);
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Portainer API error: ${response.status} - ${errorText}`);
            }
            return this.parseResponse<T>(response);
        } catch (primaryError) {
            if (this.fallbackUrl) {
                const fallbackFullUrl = `${this.fallbackUrl}/api${path}`;
                console.log('[PortainerAPI] Primary failed, trying fallback:', fallbackFullUrl, (primaryError as Error).message);
                try {
                    const response = await this.fetchWithTimeout(fallbackFullUrl, fetchOpts);
                    if (!response.ok) {
                        const errorText = await response.text().catch(() => 'Unknown error');
                        throw new Error(`Portainer API error: ${response.status} - ${errorText}`);
                    }
                    return this.parseResponse<T>(response);
                } catch (fallbackError) {
                    console.log('[PortainerAPI] Fallback also failed:', (fallbackError as Error).message);
                    throw new Error(`Connessione fallita su entrambi gli URL. Verifica la rete.`);
                }
            }
            throw primaryError;
        }
    }

    private async parseResponse<T>(response: Response): Promise<T> {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            return response.json() as Promise<T>;
        }
        return response.text() as unknown as T;
    }

    /** Quick reachability check. 3s timeout, tries fallback. Never throws. */
    async ping(): Promise<boolean> {
        if (!this.baseUrl) return false;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        try {
            const headers = this.buildHeaders();
            const response = await fetch(`${this.baseUrl}/api/status`, {
                headers,
                credentials: 'omit',
                signal: controller.signal,
            });
            if (response.ok) return true;
        } catch {
            // primary failed — try fallback
        } finally {
            clearTimeout(timeout);
        }
        if (this.fallbackUrl) {
            const controller2 = new AbortController();
            const timeout2 = setTimeout(() => controller2.abort(), 3000);
            try {
                const headers = this.buildHeaders();
                const response = await fetch(`${this.fallbackUrl}/api/status`, {
                    headers,
                    credentials: 'omit',
                    signal: controller2.signal,
                });
                return response.ok;
            } catch {
                return false;
            } finally {
                clearTimeout(timeout2);
            }
        }
        return false;
    }

    async authenticate(url: string, username: string, password: string): Promise<string> {
        const cleanUrl = url.replace(/\/+$/, '');
        console.log('[PortainerAPI] Authenticating with:', cleanUrl);

        let response: Response;
        try {
            response = await fetch(`${cleanUrl}/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'omit',
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                console.log('[PortainerAPI] Lowercase auth failed, trying uppercase...');
                response = await fetch(`${cleanUrl}/api/auth`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'omit',
                    body: JSON.stringify({ Username: username, Password: password }),
                });
            }
        } catch (networkError) {
            console.log('[PortainerAPI] Network error:', networkError);
            throw new Error('Network error. Verify the URL is correct and the server is reachable.');
        }

        if (!response.ok) {
            const status = response.status;
            let errorDetail = '';
            try {
                const errorBody = await response.json();
                errorDetail = errorBody.message || errorBody.details || '';
            } catch {
                errorDetail = await response.text().catch(() => '');
            }
            console.log('[PortainerAPI] Auth error:', status, errorDetail);

            if (status === 422 || status === 401 || status === 403) {
                throw new Error('Invalid credentials. Check your username and password.');
            }
            throw new Error(`Authentication failed (${status}). ${errorDetail || 'Check the URL and credentials.'}`);
        }

        const data = await response.json();
        console.log('[PortainerAPI] Auth successful');
        return data.jwt;
    }

    async authenticateWithApiKey(url: string, apiKey: string): Promise<void> {
        const cleanUrl = url.replace(/\/+$/, '');
        console.log('[PortainerAPI] Validating API key with:', cleanUrl);

        const response = await fetch(`${cleanUrl}/api/endpoints`, {
            headers: {
                'X-API-Key': apiKey,
            },
        });

        if (!response.ok) {
            const status = response.status;
            console.log('[PortainerAPI] API Key validation error:', status);
            if (status === 401 || status === 403) {
                throw new Error('API Key non valida. Controlla la chiave e riprova.');
            }
            throw new Error(`Validazione API Key fallita (${status}). Controlla URL e chiave.`);
        }

        console.log('[PortainerAPI] API Key validation successful');
    }

    async getEndpoints(): Promise<PortainerEndpoint[]> {
        return this.request<PortainerEndpoint[]>('/endpoints');
    }

    async getContainers(endpointId: number, all: boolean = true): Promise<Container[]> {
        return this.request<Container[]>(
            `/endpoints/${endpointId}/docker/containers/json?all=${all}`
        );
    }

    async getContainerDetail(endpointId: number, containerId: string): Promise<ContainerDetail> {
        return this.request<ContainerDetail>(
            `/endpoints/${endpointId}/docker/containers/${containerId}/json`
        );
    }

    async getContainerStats(endpointId: number, containerId: string): Promise<ContainerStats> {
        return this.request<ContainerStats>(
            `/endpoints/${endpointId}/docker/containers/${containerId}/stats?stream=false`
        );
    }

    async getContainerLogs(
        endpointId: number,
        containerId: string,
        tail: number = 100
    ): Promise<string> {
        return this.request<string>(
            `/endpoints/${endpointId}/docker/containers/${containerId}/logs?stdout=true&stderr=true&tail=${tail}&timestamps=true`
        );
    }

    async containerAction(
        endpointId: number,
        containerId: string,
        action: ContainerAction
    ): Promise<void> {
        await this.request(`/endpoints/${endpointId}/docker/containers/${containerId}/${action}`, {
            method: 'POST',
        });
        console.log('[PortainerAPI] Container action:', action, 'on', containerId);
    }

    async removeContainer(
        endpointId: number,
        containerId: string,
        force: boolean = false
    ): Promise<void> {
        await this.request(
            `/endpoints/${endpointId}/docker/containers/${containerId}?force=${force}`,
            { method: 'DELETE' }
        );
        console.log('[PortainerAPI] Container removed:', containerId);
    }

    async renameContainer(
        endpointId: number,
        containerId: string,
        newName: string
    ): Promise<void> {
        await this.request(
            `/endpoints/${endpointId}/docker/containers/${containerId}/rename?name=${encodeURIComponent(newName)}`,
            { method: 'POST' }
        );
    }

    async getStacks(endpointId: number): Promise<PortainerStack[]> {
        return this.request<PortainerStack[]>(`/stacks?filters={"EndpointID":${endpointId}}`);
    }

    async getStackFile(stackId: number): Promise<{ StackFileContent: string }> {
        return this.request<{ StackFileContent: string }>(`/stacks/${stackId}/file`);
    }

    async updateStackFile(
        stackId: number,
        endpointId: number,
        stackFileContent: string,
        env?: Array<{ name: string; value: string }>
    ): Promise<void> {
        await this.request(`/stacks/${stackId}?endpointId=${endpointId}`, {
            method: 'PUT',
            body: JSON.stringify({
                stackFileContent,
                env: env ?? [],
                prune: false,
            }),
        });
        console.log('[PortainerAPI] Stack file updated:', stackId);
    }
}

export interface PortainerStack {
    Id: number;
    Name: string;
    Type: number;
    EndpointId: number;
    Status: number;
    Env?: Array<{ name: string; value: string }>;
}

export const portainerApi = new PortainerAPI();

