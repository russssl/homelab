import { GiteaUser, GiteaRepo, GiteaOrg, GiteaNotification, GiteaFileContent, GiteaCommit, GiteaIssue, GiteaBranch, GiteaHeatmapItem } from '@/types/gitea';

const REQUEST_TIMEOUT = 8000;

class GiteaAPI {
    private baseUrl: string = '';
    private fallbackUrl: string = '';
    private token: string = '';

    configure(url: string, token: string, fallbackUrl?: string) {
        this.baseUrl = url.replace(/\/+$/, '');
        this.fallbackUrl = fallbackUrl?.replace(/\/+$/, '') ?? '';
        this.token = token;
        console.log('[GiteaAPI] Configured with URL:', this.baseUrl, fallbackUrl ? `fallback: ${this.fallbackUrl}` : '');
    }

    setFallbackUrl(fallbackUrl: string) {
        this.fallbackUrl = fallbackUrl.replace(/\/+$/, '');
        console.log('[GiteaAPI] Fallback URL set:', this.fallbackUrl);
    }

    getFallbackUrl(): string {
        return this.fallbackUrl;
    }

    private getAuthHeader(): string {
        if (this.token.startsWith('basic:')) {
            return `Basic ${this.token.slice(6)}`;
        }
        return `token ${this.token}`;
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
            'Authorization': this.getAuthHeader(),
            ...options.headers,
        };
        const fetchOpts = { ...options, headers };

        const primaryUrl = `${this.baseUrl}/api/v1${path}`;
        console.log('[GiteaAPI] Request:', options.method || 'GET', primaryUrl);

        try {
            const response = await this.fetchWithTimeout(primaryUrl, fetchOpts);
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Gitea API error: ${response.status}`);
            }
            return response.json() as Promise<T>;
        } catch (primaryError) {
            if (this.fallbackUrl) {
                const fallbackFullUrl = `${this.fallbackUrl}/api/v1${path}`;
                console.log('[GiteaAPI] Primary failed, trying fallback:', fallbackFullUrl);
                try {
                    const response = await this.fetchWithTimeout(fallbackFullUrl, fetchOpts);
                    if (!response.ok) {
                        throw new Error(`Gitea API error: ${response.status}`);
                    }
                    return response.json() as Promise<T>;
                } catch (fallbackError) {
                    console.log('[GiteaAPI] Fallback also failed:', (fallbackError as Error).message);
                    throw new Error(`Connessione fallita su entrambi gli URL. Verifica la rete.`);
                }
            }
            throw primaryError;
        }
    }

    async authenticate(url: string, username: string, password: string): Promise<{ token: string; username: string }> {
        const cleanUrl = url.replace(/\/+$/, '');
        console.log('[GiteaAPI] Authenticating with:', cleanUrl);

        const basicAuth = 'Basic ' + btoa(`${username}:${password}`);

        const userResponse = await fetch(`${cleanUrl}/api/v1/user`, {
            headers: { 'Authorization': basicAuth },
        });

        if (!userResponse.ok) {
            console.log('[GiteaAPI] Auth error:', userResponse.status);
            throw new Error('Authentication failed. Check your credentials and URL.');
        }

        try {
            const tokenResponse = await fetch(`${cleanUrl}/api/v1/users/${username}/tokens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': basicAuth,
                },
                body: JSON.stringify({ name: `homelab-${Date.now()}` }),
            });

            if (tokenResponse.ok) {
                const data = await tokenResponse.json();
                console.log('[GiteaAPI] Token created successfully');
                return { token: data.sha1, username };
            }
        } catch (e) {
            console.log('[GiteaAPI] Token creation failed, using basic auth');
        }

        return { token: `basic:${btoa(`${username}:${password}`)}`, username };
    }

    async getCurrentUser(): Promise<GiteaUser> {
        return this.request<GiteaUser>('/user');
    }

    async getUserRepos(page: number = 1, limit: number = 20): Promise<GiteaRepo[]> {
        return this.request<GiteaRepo[]>(`/user/repos?page=${page}&limit=${limit}&sort=updated`);
    }

    async getOrgs(): Promise<GiteaOrg[]> {
        return this.request<GiteaOrg[]>('/user/orgs');
    }

    async getNotifications(): Promise<GiteaNotification[]> {
        return this.request<GiteaNotification[]>('/notifications?limit=20');
    }

    async getVersion(): Promise<{ version: string }> {
        return this.request<{ version: string }>('/version');
    }

    async getRepoContents(owner: string, repo: string, path: string = ''): Promise<GiteaFileContent[]> {
        const encodedPath = path ? `/${encodeURIComponent(path)}` : '';
        return this.request<GiteaFileContent[]>(`/repos/${owner}/${repo}/contents${encodedPath}`);
    }

    async getFileContent(owner: string, repo: string, path: string): Promise<GiteaFileContent> {
        return this.request<GiteaFileContent>(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`);
    }

    async getRepoCommits(owner: string, repo: string, page: number = 1, limit: number = 20): Promise<GiteaCommit[]> {
        return this.request<GiteaCommit[]>(`/repos/${owner}/${repo}/commits?page=${page}&limit=${limit}`);
    }

    async getRepoIssues(owner: string, repo: string, state: string = 'open', page: number = 1, limit: number = 20): Promise<GiteaIssue[]> {
        return this.request<GiteaIssue[]>(`/repos/${owner}/${repo}/issues?state=${state}&type=issues&page=${page}&limit=${limit}`);
    }

    async getRepoBranches(owner: string, repo: string): Promise<GiteaBranch[]> {
        return this.request<GiteaBranch[]>(`/repos/${owner}/${repo}/branches`);
    }

    async getRepoReadme(owner: string, repo: string): Promise<GiteaFileContent> {
        return this.request<GiteaFileContent>(`/repos/${owner}/${repo}/contents/README.md`);
    }

    async getRepo(owner: string, repo: string): Promise<GiteaRepo> {
        return this.request<GiteaRepo>(`/repos/${owner}/${repo}`);
    }

    async getUserHeatmap(username: string): Promise<GiteaHeatmapItem[]> {
        return this.request<GiteaHeatmapItem[]>(`/users/${username}/heatmap`);
    }

    /** Quick reachability check. 3s timeout, tries fallback. Never throws. */
    async ping(): Promise<boolean> {
        if (!this.baseUrl) return false;
        const tryUrl = async (base: string): Promise<boolean> => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            try {
                // /api/v1/version is public — no auth required, smallest payload
                const response = await fetch(`${base}/api/v1/version`, {
                    signal: controller.signal,
                });
                return response.ok;
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

export const giteaApi = new GiteaAPI();

