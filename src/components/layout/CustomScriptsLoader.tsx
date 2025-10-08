
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for script content
const scriptCache = {
  content: null as string | null,
  timestamp: 0,
  expiresAt: 0
};

// Cache expiry time (1 minute)
const CACHE_EXPIRY = 60 * 1000;

const CustomScriptsLoader = () => {
  const [scriptContent, setScriptContent] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        // Check if we have a valid cache
        const now = Date.now();
        if (scriptCache.content && now < scriptCache.expiresAt) {
          console.log('Using cached custom scripts');
          setScriptContent(scriptCache.content);
          return;
        }

        console.log('Fetching fresh custom scripts via edge function');
        
        // Call the edge function to get active script (bypasses RLS)
        const { data, error } = await supabase.functions.invoke('get-active-script');
        
        if (error) {
          console.error('Error fetching custom scripts:', error);
        } else if (data && data.script_content) {
          setScriptContent(data.script_content);
          
          // Update cache
          scriptCache.content = data.script_content;
          scriptCache.timestamp = now;
          scriptCache.expiresAt = now + CACHE_EXPIRY;
        }
      } catch (err) {
        console.error('Unexpected error loading scripts:', err);
      }
    };

    fetchScripts();
    
    // Only set up the interval after the first fetch
    if (isInitialMount.current) {
      isInitialMount.current = false;
      
      // Check for updates less frequently (every minute)
      const interval = setInterval(fetchScripts, CACHE_EXPIRY);
      return () => clearInterval(interval);
    }
    
  }, []);

  // If no script content is available, render nothing
  if (!scriptContent) return null;

  // Use dangerouslySetInnerHTML to inject the custom scripts
  return <div dangerouslySetInnerHTML={{ __html: scriptContent }} />;
};

export default CustomScriptsLoader;
