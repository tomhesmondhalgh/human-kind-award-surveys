-- The custom-scripts feature let platform admins inject arbitrary JavaScript
-- into every page. It was disabled in the frontend and is now removed
-- entirely, along with the get-active-script edge function that served it.
DROP TABLE IF EXISTS public.custom_scripts;
