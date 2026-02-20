export function formatBytes(bytes: number, decimals: number = 1): string {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1) return `${parseFloat(bytes.toFixed(decimals))} B`;
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatUptime(startedAt: string): string {
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const diff = now - start;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

export function formatDate(dateString: string | number): string {
    const date = typeof dateString === 'number'
        ? new Date(dateString * 1000)
        : new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function getContainerName(names: string[]): string {
    if (!names || names.length === 0) return 'Unknown';
    return names[0].replace(/^\//, '');
}

export function calculateCpuPercent(
    cpuDelta: number,
    systemDelta: number,
    cpuCount: number
): number {
    if (systemDelta === 0 || cpuCount === 0) return 0;
    return (cpuDelta / systemDelta) * cpuCount * 100;
}
