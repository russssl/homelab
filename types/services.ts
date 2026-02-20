export type ServiceType = 'portainer' | 'pihole' | 'beszel' | 'gitea';

export interface ServiceConnection {
    type: ServiceType;
    url: string;
    token: string;
    username?: string;
    apiKey?: string;
    fallbackUrl?: string;
}

export const SERVICE_COLORS: Record<ServiceType, { primary: string; dark: string; bg: string }> = {
    portainer: { primary: '#13B5EA', dark: '#0D8ECF', bg: '#13B5EA18' },
    pihole: { primary: '#CD2326', dark: '#9B1B1E', bg: '#CD232618' },
    beszel: { primary: '#0EA5E9', dark: '#0284C7', bg: '#0EA5E918' },
    gitea: { primary: '#609926', dark: '#4A7A1E', bg: '#60992618' },
};

