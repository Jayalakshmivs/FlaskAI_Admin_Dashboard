-- Insert diverse step metrics with success, failed, and in_progress statuses
WITH job_list AS (
  SELECT DISTINCT job_id FROM files WHERE job_id IS NOT NULL LIMIT 70
),
step_names AS (
  VALUES 
    ('extract_pdf_pages'),
    ('search'),
    ('indexing'),
    ('validation'),
    ('storage')
)
INSERT INTO step_metrics (id, job_id, step, status, duration, input, output, created_at, updated_at)
SELECT 
    gen_random_uuid() as id,
    jl.job_id,
    sn.step_name,
    CASE abs((hashtext(jl.job_id::text || sn.step_name) * row_number() OVER ())) % 100
        WHEN 0 THEN 'failed'
        WHEN 1 THEN 'in_progress'
        WHEN 2 THEN 'failed'
        WHEN 3 THEN 'in_progress'
        ELSE 'success'
    END as status,
    (abs(hashtext(jl.job_id::text || sn.step_name)) % 3000 + 100)::int as duration,
    '{"file_id": "test"}'::jsonb as input,
    '{"result": "processed"}'::jsonb as output,
    NOW() - ((row_number() OVER (ORDER BY jl.job_id, sn.step_name) % 100) || ' days')::interval,
    NOW() - ((row_number() OVER (ORDER BY jl.job_id, sn.step_name) % 20) || ' hours')::interval
FROM job_list jl
CROSS JOIN step_names sn
ON CONFLICT DO NOTHING;
