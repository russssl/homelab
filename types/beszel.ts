export interface BeszelSystem {
    id: string;
    collectionId: string;
    collectionName: string;
    name: string;
    host: string;
    port: number;
    status: string;
    info: BeszelSystemInfo;
    created: string;
    updated: string;
}

export interface BeszelSystemInfo {
    cpu: number;
    mp: number;
    m: number;
    mt: number;
    dp: number;
    d: number;
    dt: number;
    ns: number;
    nr: number;
    u: number;
    cm?: string;
    os?: string;
    k?: string;
    h?: string;
    t?: number;
    c?: number;
}

export interface BeszelSystemsResponse {
    items: BeszelSystem[];
    totalItems: number;
    page: number;
    perPage: number;
}

export interface BeszelSystemRecord {
    id: string;
    system: string;
    stats: BeszelRecordStats;
    created: string;
    updated: string;
}

export interface BeszelRecordStats {
    cpu: number;
    mp: number;
    m: number;
    mt: number;
    dp: number;
    d: number;
    dt: number;
    ns: number;
    nr: number;
    t?: number[];
    dc?: BeszelContainer[];
}

export interface BeszelContainer {
    n: string;
    cpu: number;
    m: number;
}

export interface BeszelRecordsResponse {
    items: BeszelSystemRecord[];
    totalItems: number;
    page: number;
    perPage: number;
}
