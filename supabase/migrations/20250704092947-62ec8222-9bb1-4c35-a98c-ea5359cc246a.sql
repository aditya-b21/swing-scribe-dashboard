
-- Add a column to track if user can see community password
ALTER TABLE public.payment_submissions 
ADD COLUMN can_see_password boolean DEFAULT false;

-- Update existing verified payments to allow password viewing
UPDATE public.payment_submissions 
SET can_see_password = true 
WHERE status = 'verified';

-- Create a trigger to automatically set can_see_password when payment is verified
CREATE OR REPLACE FUNCTION public.update_password_visibility()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- When payment status changes to verified, allow password viewing
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    NEW.can_see_password = true;
  END IF;
  
  -- When payment status changes from verified to something else, revoke password access
  IF OLD.status = 'verified' AND NEW.status != 'verified' THEN
    NEW.can_see_password = false;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically update password visibility
CREATE TRIGGER update_password_visibility_trigger
  BEFORE UPDATE ON public.payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_password_visibility();
