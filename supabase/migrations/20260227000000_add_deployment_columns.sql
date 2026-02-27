-- Add deployment-related columns to projects table
-- Migration: 20260227000000_add_deployment_columns

-- Add deployed_url column to store the Vercel deployment URL
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS deployed_url TEXT;

-- Add custom_domain column to store user's custom domain
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_deployed_url 
ON public.projects(deployed_url) 
WHERE deployed_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_custom_domain 
ON public.projects(custom_domain) 
WHERE custom_domain IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.projects.deployed_url IS 'URL of the deployed project on Vercel (e.g., https://zyntrix-abc123.vercel.app)';
COMMENT ON COLUMN public.projects.custom_domain IS 'Custom domain connected to this project (e.g., www.example.com)';

-- Add deployment_status column to track deployment state
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS deployment_status TEXT DEFAULT 'draft';

-- Add constraint to ensure valid deployment statuses
ALTER TABLE public.projects 
ADD CONSTRAINT projects_deployment_status_check 
CHECK (deployment_status IN ('draft', 'deploying', 'deployed', 'failed', 'archived'));

COMMENT ON COLUMN public.projects.deployment_status IS 'Current deployment status: draft, deploying, deployed, failed, or archived';

-- Add deployed_at timestamp
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.projects.deployed_at IS 'Timestamp of the last successful deployment';

-- Create a deployment history table for tracking all deployments
CREATE TABLE IF NOT EXISTS public.project_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deployment_url TEXT NOT NULL,
  deployment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  deployed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT project_deployments_status_check 
  CHECK (status IN ('pending', 'building', 'ready', 'error', 'cancelled'))
);

-- Add indexes for deployment history
CREATE INDEX IF NOT EXISTS idx_project_deployments_project_id 
ON public.project_deployments(project_id);

CREATE INDEX IF NOT EXISTS idx_project_deployments_status 
ON public.project_deployments(status);

CREATE INDEX IF NOT EXISTS idx_project_deployments_created_at 
ON public.project_deployments(created_at DESC);

-- Add RLS policies for project_deployments
ALTER TABLE public.project_deployments ENABLE ROW LEVEL SECURITY;

-- Users can view deployments for their own projects
CREATE POLICY "Users can view their project deployments"
ON public.project_deployments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_deployments.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can create deployments for their own projects
CREATE POLICY "Users can create deployments for their projects"
ON public.project_deployments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_deployments.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can update their own project deployments
CREATE POLICY "Users can update their project deployments"
ON public.project_deployments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_deployments.project_id
    AND projects.user_id = auth.uid()
  )
);

COMMENT ON TABLE public.project_deployments IS 'History of all deployments for each project';
