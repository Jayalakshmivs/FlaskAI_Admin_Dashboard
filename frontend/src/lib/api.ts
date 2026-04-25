import axios from 'axios';

// ---------------- BASE CONFIG ----------------

// ✅ No env dependency → stable in Docker + Coolify
const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "http://backend:8000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// ---------------- HELPERS ----------------

export const normalizeStatus = (s: string) => {
  if (!s) return 'in_progress';
  return s.toLowerCase().replace(/\s+/g, '_');
};

const extract = (data: any) => {
  return data?.items || data?.data || data?.results || data || [];
};

// ---------------- TYPES ----------------

export interface ProcessingStep {
  id: number;
  file_id: string;
  file_name: string;
  user_email?: string;
  file_type: string;
  step_name: string;
  status: string;
  duration_ms?: number;
  error_message?: string;
  created_at: string;
}

export interface FileStats {
  total_files: number;
  total_jobs: number;
  active_users: number;
  total_success: number;
  total_failures: number;
  total_in_progress: number;
  success_rate: number;
  processing_rate: number;
  files_by_type: Record<string, number>;
  pipeline_performance: Record<string, any>;
}

export interface FileItem {
  file_id: string;
  file_name: string;
  user_email: string;
  file_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  job_id?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface JobItem {
  id: string;
  jobType: string;
  job_status: string;
  created_at: string;
  file_id: string | null;
}

export interface StepMetricItem {
  id: string;
  job_id: string;
  file_id?: string;
  step_name: string;
  status: string;
  duration_ms: number | null;
  created_at: string;
}

export interface UserItem {
  id: string;
  email: string;
  created_at: string;
  last_login_at: string | null;
  is_deleted: boolean;
  quota: any;
  metadata: any;
  file_count: number;
}

// ---------------- API CALLS ----------------

export const getStats = async (): Promise<FileStats> => {
  try {
    const { data } = await api.get('/stats');
    return data;
  } catch (e) {
    console.error('Stats API error:', e);
    return {} as FileStats;
  }
};

export const getFiles = async (
  skip = 0,
  limit = 50,
  status?: string,
  search?: string,
  email?: string,
  file_id?: string
): Promise<PaginatedResponse<FileItem>> => {

  const params: any = { skip, limit };

  if (status && status !== 'All') params.status = normalizeStatus(status);
  if (search) params.search = search;
  if (email) params.email = email;
  if (file_id) params.file_id = file_id;

  const { data } = await api.get('/files', { params });

  const items = extract(data).map((f: any) => ({
    ...f,
    status: normalizeStatus(f.status),
  }));

  return {
    items,
    total: data?.total || items.length,
  };
};

export const getFileDetails = async (id: string): Promise<ProcessingStep[]> => {
  const { data } = await api.get(`/files/${id}`);
  return extract(data).map((d: any) => ({
    ...d,
    status: normalizeStatus(d.status),
  }));
};

export const getUsers = async (): Promise<UserItem[]> => {
  const { data } = await api.get('/users');
  return extract(data);
};

export const getJobs = async (skip = 0, limit = 50): Promise<PaginatedResponse<JobItem>> => {
  const { data } = await api.get('/jobs', { params: { skip, limit } });

  return {
    items: extract(data),
    total: data?.total || 0,
  };
};

export const getStepMetrics = async (
  skip = 0,
  limit = 100
): Promise<PaginatedResponse<StepMetricItem>> => {

  const { data } = await api.get('/step_metrics', {
    params: { skip, limit },
  });

  const items = extract(data).map((m: any) => ({
    ...m,
    status: normalizeStatus(m.status),
  }));

  return {
    items,
    total: data?.total || items.length,
  };
};

export const getMetricsByFile = async (fileId: string): Promise<StepMetricItem[]> => {
  const { data } = await api.get(`/metrics/${fileId}`);
  return extract(data);
};