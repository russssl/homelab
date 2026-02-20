import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { ServiceType, ServiceConnection } from '@/types/services';
import { portainerApi } from '@/services/portainer-api';
import { piholeApi } from '@/services/pihole-api';
import { beszelApi } from '@/services/beszel-api';
import { giteaApi } from '@/services/gitea-api';

const SERVICES_KEY = 'homelab_services';

const SERVICE_APIS: Record<ServiceType, { ping: () => Promise<boolean> }> = {
    portainer: portainerApi,
    pihole: piholeApi,
    beszel: beszelApi,
    gitea: giteaApi,
};

export const [ServicesProvider, useServices] = createContextHook(() => {
    const [connections, setConnections] = useState<Partial<Record<ServiceType, ServiceConnection>>>({});
    const [isReady, setIsReady] = useState<boolean>(false);
    const queryClient = useQueryClient();

    /**
     * Reachability: true = OK, false = offline, null = not yet checked / checking
     * Only populated for configured services.
     */
    const [reachability, setReachability] = useState<Partial<Record<ServiceType, boolean | null>>>({});
    const [pinging, setPinging] = useState<Partial<Record<ServiceType, boolean>>>({});

    const storedQuery = useQuery({
        queryKey: ['stored-services'],
        queryFn: async () => {
            const stored = await AsyncStorage.getItem(SERVICES_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Partial<Record<ServiceType, ServiceConnection>>;
                console.log('[Services] Restored:', Object.keys(parsed));
                return parsed;
            }
            return {};
        },
        staleTime: Infinity,
    });

    useEffect(() => {
        if (storedQuery.data !== undefined) {
            if (storedQuery.data) {
                const data = storedQuery.data;
                setConnections(data);
                if (data.portainer) {
                    if (data.portainer.apiKey) {
                        portainerApi.configureWithApiKey(data.portainer.url, data.portainer.apiKey, data.portainer.fallbackUrl);
                    } else {
                        portainerApi.configure(data.portainer.url, data.portainer.token, data.portainer.fallbackUrl);
                    }
                }
                if (data.pihole) piholeApi.configure(data.pihole.url, data.pihole.token, data.pihole.fallbackUrl);
                if (data.beszel) beszelApi.configure(data.beszel.url, data.beszel.token, data.beszel.fallbackUrl);
                if (data.gitea) giteaApi.configure(data.gitea.url, data.gitea.token, data.gitea.fallbackUrl);

                // Mark all configured services as "checking" before the ping
                const initialReachability: Partial<Record<ServiceType, null>> = {};
                (Object.keys(data) as ServiceType[]).forEach((t) => { initialReachability[t] = null; });
                setReachability(initialReachability);
            }
            setIsReady(true);
        }
        if (storedQuery.isError) {
            setIsReady(true);
        }
    }, [storedQuery.data, storedQuery.isError]);

    // ── Health-check: ping all services once on startup ───────────────────────
    const checkReachability = useCallback(async (type: ServiceType) => {
        setPinging(prev => ({ ...prev, [type]: true }));
        setReachability(prev => ({ ...prev, [type]: null }));
        console.log('[Services] Pinging', type);
        try {
            const ok = await SERVICE_APIS[type].ping();
            console.log('[Services] Ping result:', type, ok);
            setReachability(prev => ({ ...prev, [type]: ok }));
            if (ok) {
                // Re-enable queries for this service
                queryClient.invalidateQueries({ queryKey: [type] });
            }
        } catch {
            setReachability(prev => ({ ...prev, [type]: false }));
        } finally {
            setPinging(prev => ({ ...prev, [type]: false }));
        }
    }, [queryClient]);

    const checkAllReachability = useCallback(async (conns: Partial<Record<ServiceType, ServiceConnection>>) => {
        const types = Object.keys(conns) as ServiceType[];
        if (types.length === 0) return;
        console.log('[Services] Checking reachability for:', types);
        await Promise.all(types.map(t => checkReachability(t)));
    }, [checkReachability]);

    // Run health checks once the services are ready
    useEffect(() => {
        if (isReady && storedQuery.data && Object.keys(storedQuery.data).length > 0) {
            checkAllReachability(storedQuery.data);
        }
        // Only run once after isReady flips to true
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady]);

    // ── Persist ───────────────────────────────────────────────────────────────
    const persist = useCallback(async (updated: Partial<Record<ServiceType, ServiceConnection>>) => {
        await AsyncStorage.setItem(SERVICES_KEY, JSON.stringify(updated));
        console.log('[Services] Persisted:', Object.keys(updated));
    }, []);

    // ── Connect / Disconnect ──────────────────────────────────────────────────
    const connectService = useCallback(async (connection: ServiceConnection) => {
        const updated = { ...connections, [connection.type]: connection };
        setConnections(updated);
        await persist(updated);

        switch (connection.type) {
            case 'portainer':
                if (connection.apiKey) {
                    portainerApi.configureWithApiKey(connection.url, connection.apiKey, connection.fallbackUrl);
                } else {
                    portainerApi.configure(connection.url, connection.token, connection.fallbackUrl);
                }
                break;
            case 'pihole': piholeApi.configure(connection.url, connection.token, connection.fallbackUrl); break;
            case 'beszel': beszelApi.configure(connection.url, connection.token, connection.fallbackUrl); break;
            case 'gitea': giteaApi.configure(connection.url, connection.token, connection.fallbackUrl); break;
        }
        console.log('[Services] Connected:', connection.type);

        // Immediately ping the newly connected service
        setReachability(prev => ({ ...prev, [connection.type]: null }));
        checkReachability(connection.type);
    }, [connections, persist, checkReachability]);

    const disconnectService = useCallback(async (type: ServiceType) => {
        const updated = { ...connections };
        delete updated[type];
        setConnections(updated);
        setReachability(prev => { const n = { ...prev }; delete n[type]; return n; });
        await persist(updated);
        queryClient.removeQueries();
        console.log('[Services] Disconnected:', type);
    }, [connections, persist, queryClient]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getConnection = useCallback((type: ServiceType): ServiceConnection | null => {
        return connections[type] ?? null;
    }, [connections]);

    const isConnected = useCallback((type: ServiceType): boolean => {
        return !!connections[type];
    }, [connections]);

    /**
     * true  = configured + reachable
     * false = configured + unreachable
     * null  = configured + still pinging (or not yet checked)
     * undefined = not configured
     */
    const isReachable = useCallback((type: ServiceType): boolean | null | undefined => {
        if (!connections[type]) return undefined;
        return reachability[type] ?? null;
    }, [connections, reachability]);

    const isPinging = useCallback((type: ServiceType): boolean => {
        return !!pinging[type];
    }, [pinging]);

    const connectedCount = Object.keys(connections).length;

    const updateServiceFallbackUrl = useCallback(async (type: ServiceType, fallbackUrl: string) => {
        const conn = connections[type];
        if (!conn) return;
        const updated = { ...connections, [type]: { ...conn, fallbackUrl: fallbackUrl || undefined } };
        setConnections(updated);
        await persist(updated);

        switch (type) {
            case 'portainer': portainerApi.setFallbackUrl(fallbackUrl); break;
            case 'pihole': piholeApi.setFallbackUrl(fallbackUrl); break;
            case 'beszel': beszelApi.setFallbackUrl(fallbackUrl); break;
            case 'gitea': giteaApi.setFallbackUrl(fallbackUrl); break;
        }
        console.log('[Services] Fallback URL updated for', type, ':', fallbackUrl);
    }, [connections, persist]);

    return {
        connections,
        isReady,
        connectService,
        disconnectService,
        getConnection,
        isConnected,
        connectedCount,
        updateServiceFallbackUrl,
        // ── Reachability ──
        reachability,
        isReachable,
        isPinging,
        checkReachability,
    };
});
