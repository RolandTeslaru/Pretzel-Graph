ALTER TABLE public.jobs 
DROP CONSTRAINT jobs_user_id_fkey,
ADD CONSTRAINT jobs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id);