-- 1. Convert text column to uuid
ALTER TABLE public.jobs
ALTER COLUMN workflow_id TYPE uuid USING workflow_id::uuid;
-- 2. NOW add the foreign key constraint
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_workflow_id_fkey
FOREIGN KEY (workflow_id)
REFERENCES public.workflows (id)
ON DELETE CASCADE;