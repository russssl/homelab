export interface PortainerAuth {
    url: string;
    jwt: string;
    username: string;
}

export interface PortainerEndpoint {
    Id: number;
    Name: string;
    Type: number;
    URL: string;
    Status: number;
    Snapshots?: EndpointSnapshot[];
    PublicURL?: string;
    GroupId?: number;
    TagIds?: number[];
}

export interface EndpointSnapshot {
    DockerVersion: string;
    TotalCPU: number;
    TotalMemory: number;
    RunningContainerCount: number;
    StoppedContainerCount: number;
    HealthyContainerCount: number;
    UnhealthyContainerCount: number;
    VolumeCount: number;
    ImageCount: number;
    ServiceCount: number;
    StackCount: number;
    NodeCount?: number;
    Time: number;
    DockerSnapshotRaw?: {
        Containers?: number;
        ContainersRunning?: number;
        ContainersPaused?: number;
        ContainersStopped?: number;
        Images?: number;
        NCPU?: number;
        MemTotal?: number;
        OperatingSystem?: string;
        Architecture?: string;
        KernelVersion?: string;
        ServerVersion?: string;
        Name?: string;
    };
}

export interface Container {
    Id: string;
    Names: string[];
    Image: string;
    ImageID: string;
    Command: string;
    Created: number;
    State: string;
    Status: string;
    Ports: ContainerPort[];
    Labels: Record<string, string>;
    SizeRw?: number;
    SizeRootFs?: number;
    HostConfig: {
        NetworkMode: string;
        RestartPolicy?: {
            Name: string;
            MaximumRetryCount: number;
        };
    };
    NetworkSettings: {
        Networks: Record<string, ContainerNetwork>;
    };
    Mounts: ContainerMount[];
}

export interface ContainerPort {
    IP?: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
}

export interface ContainerNetwork {
    IPAddress: string;
    Gateway: string;
    MacAddress: string;
    NetworkID: string;
}

export interface ContainerMount {
    Type: string;
    Name?: string;
    Source: string;
    Destination: string;
    Mode: string;
    RW: boolean;
}

export interface ContainerDetail {
    Id: string;
    Name: string;
    Created: string;
    State: {
        Status: string;
        Running: boolean;
        Paused: boolean;
        Restarting: boolean;
        OOMKilled: boolean;
        Dead: boolean;
        Pid: number;
        ExitCode: number;
        Error: string;
        StartedAt: string;
        FinishedAt: string;
    };
    Image: string;
    Config: {
        Hostname: string;
        Env: string[];
        Image: string;
        Labels: Record<string, string>;
        ExposedPorts?: Record<string, object>;
        Cmd?: string[];
        Entrypoint?: string[] | null;
        WorkingDir?: string;
    };
    HostConfig: {
        NetworkMode: string;
        RestartPolicy: {
            Name: string;
            MaximumRetryCount: number;
        };
        Memory: number;
        NanoCpus: number;
        CpuShares: number;
        Binds?: string[];
        PortBindings?: Record<string, Array<{ HostIp: string; HostPort: string }>>;
    };
    NetworkSettings: {
        Networks: Record<string, ContainerNetwork>;
        Ports?: Record<string, Array<{ HostIp: string; HostPort: string }> | null>;
    };
    Mounts: ContainerMount[];
}

export interface ContainerStats {
    cpu_stats: {
        cpu_usage: {
            total_usage: number;
            percpu_usage?: number[];
        };
        system_cpu_usage: number;
        online_cpus: number;
    };
    precpu_stats: {
        cpu_usage: {
            total_usage: number;
        };
        system_cpu_usage: number;
        online_cpus: number;
    };
    memory_stats: {
        usage: number;
        limit: number;
        stats?: {
            cache?: number;
        };
    };
    networks?: Record<string, {
        rx_bytes: number;
        tx_bytes: number;
    }>;
    blkio_stats?: {
        io_service_bytes_recursive?: Array<{
            op: string;
            value: number;
        }>;
    };
}

export type ContainerAction = 'start' | 'stop' | 'restart' | 'kill' | 'pause' | 'unpause';

