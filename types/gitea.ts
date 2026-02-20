export interface GiteaUser {
    id: number;
    login: string;
    full_name: string;
    email: string;
    avatar_url: string;
    created: string;
}

export interface GiteaRepo {
    id: number;
    name: string;
    full_name: string;
    description: string;
    owner: { login: string; avatar_url: string };
    private: boolean;
    fork: boolean;
    stars_count: number;
    forks_count: number;
    open_issues_count: number;
    open_pr_counter: number;
    language: string;
    size: number;
    updated_at: string;
    created_at: string;
    html_url: string;
    default_branch: string;
}

export interface GiteaOrg {
    id: number;
    username: string;
    full_name: string;
    avatar_url: string;
    description: string;
}

export interface GiteaNotification {
    id: number;
    subject: { title: string; type: string; url: string };
    repository: { full_name: string };
    unread: boolean;
    updated_at: string;
}

export interface GiteaFileContent {
    name: string;
    path: string;
    sha: string;
    type: 'file' | 'dir' | 'symlink' | 'submodule';
    size: number;
    content?: string;
    encoding?: string;
    url: string;
    html_url: string;
    download_url?: string;
}

export interface GiteaCommit {
    sha: string;
    url: string;
    html_url: string;
    commit: {
        message: string;
        author: { name: string; email: string; date: string };
        committer: { name: string; email: string; date: string };
    };
    author?: { login: string; avatar_url: string } | null;
}

export interface GiteaIssue {
    id: number;
    number: number;
    title: string;
    body: string;
    state: 'open' | 'closed';
    user: { login: string; avatar_url: string };
    labels: Array<{ id: number; name: string; color: string }>;
    comments: number;
    created_at: string;
    updated_at: string;
    closed_at?: string;
    pull_request?: object | null;
}

export interface GiteaBranch {
    name: string;
    commit: { id: string; message: string };
    protected: boolean;
}

export interface GiteaHeatmapItem {
    timestamp: number;
    contributions: number;
}

