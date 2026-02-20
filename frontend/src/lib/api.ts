const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface DownloadTask {
    id: string;
    url: string;
    status: "pending" | "downloading" | "processing" | "completed" | "failed";
    title: string;
    uploader: string;
    filename: string;
    error_message: string;
    progress: number;
    created_at: string;
    completed_at: string | null;
}

export interface EditSegment {
    task_id: string;
    start: number;
    end: number;
}

export interface EditResult {
    id: string;
    filename: string;
    name: string;
    segments_count: number;
    file_size: number;
    download_url: string;
    stream_url: string;
}

export async function submitDownload(urls: string[]): Promise<DownloadTask[]> {
    const res = await fetch(`${API_BASE}/download/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.urls?.[0] || "Failed to submit download");
    }

    return res.json();
}

export async function getTaskStatus(taskId: string): Promise<DownloadTask> {
    const res = await fetch(`${API_BASE}/download/${taskId}/`);
    if (!res.ok) throw new Error("Failed to fetch task status");
    return res.json();
}

export function getDownloadUrl(taskId: string): string {
    return `${API_BASE}/download/${taskId}/file/`;
}

export function getStreamUrl(taskId: string): string {
    return `${API_BASE}/download/${taskId}/file/?stream=1`;
}

export async function submitEdit(segments: EditSegment[], name?: string): Promise<EditResult> {
    const res = await fetch(`${API_BASE}/edit/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments, name: name || "edited_mix" }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to process edit");
    }

    return res.json();
}

export function getEditDownloadUrl(editId: string): string {
    return `${API_BASE}/edit/${editId}/file/`;
}

export function getEditStreamUrl(editId: string): string {
    return `${API_BASE}/edit/${editId}/file/?stream=1`;
}
