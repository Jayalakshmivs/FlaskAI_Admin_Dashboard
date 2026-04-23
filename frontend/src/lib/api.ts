import axios from 'axios';

export interface ProcessingStep {
  id: number;
  file_id: string;
  file_name: string;
  user_email?: string;
  user_name?: string;
  file_type: string;
  step_name: string;
  status: 'success' | 'failed' | 'in progress';
  raw_status?: string;
  duration_ms?: number;
  error_message?: string;
  error_context?: Record<string, any>;
  output_summary?: Record<string, any>;
  input_payload?: Record<string, any>;
  output_payload?: Record<string, any>;
  timing_breakdown?: Record<string, any>;
  created_at: string;
  updated_at?: string;
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
  failures_by_type: Record<string, number>;
  failures_by_step: Record<string, number>;
  pipeline_performance: Record<string, { success: number; failed: number; 'in progress': number }>;
}

export interface FileItem {
  file_id: string;
  file_name: string;
  user_email: string;
  user_name?: string;
  file_type: string;
  status: string;
  latest_step: string;
  failed_step?: string;
  created_at: string;
  updated_at: string;
  id: number;
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
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  is_deleted: boolean;
  file_id: string | null;
}

export interface StepMetricItem {
  id: string;
  job_id: string;
  file_id?: string;
  user_id?: string;
  step_name: string;
  status: string;
  raw_status?: string;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

export const getStats = async (): Promise<FileStats> => {
  const { data } = await api.get<FileStats>('/stats');
  return data;
};

export const getFiles = async (
  skip = 0, 
  limit = 50,
  status?: string,
  search?: string,
  email?: string,
  file_id?: string,
  start_date?: string,
  end_date?: string
): Promise<PaginatedResponse<FileItem>> => {
  const params = { skip, limit, status, search, email, file_id, start_date, end_date };
  const { data } = await api.get<PaginatedResponse<FileItem>>('/files', { params });
  return data;
};

export const getFileDetails = async (id: string): Promise<ProcessingStep[]> => {
  const { data } = await api.get<ProcessingStep[]>(`/files/${id}`);
  return data;
};

export interface UserItem {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_deleted: boolean;
  quota: any;
  metadata: any;
  file_count: number;
}

export const getUsers = async (): Promise<UserItem[]> => {
  const { data } = await api.get<UserItem[]>('/users');
  return data;
};

export const getJobs = async (skip = 0, limit = 50, job_id?: string): Promise<PaginatedResponse<JobItem>> => {
  const { data } = await api.get<PaginatedResponse<JobItem>>('/jobs', { params: { skip, limit, job_id } });
  return data;
};

export const getStepMetrics = async (skip = 0, limit = 50): Promise<PaginatedResponse<StepMetricItem>> => {
  const { data } = await api.get<PaginatedResponse<StepMetricItem>>('/step_metrics', { params: { skip, limit } });
  return data;
};

export const getMetricsByFile = async (fileId: string): Promise<StepMetricItem[]> => {
  const { data } = await api.get<StepMetricItem[]>(`/metrics/${fileId}`);
  return data;
};

export interface StepMetricsByType {
  [stepName: string]: {
    success: number;
    failed: number;
    in_progress: number;
  };
}

export const getStepMetricsByType = async (): Promise<StepMetricsByType> => {
  const { data } = await api.get<StepMetricsByType>('/stats/step-metrics-by-type');
  return data;
};
