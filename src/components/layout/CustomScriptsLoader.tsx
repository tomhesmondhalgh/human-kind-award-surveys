import React from 'react';

/**
 * CustomScriptsLoader - DEPRECATED for security reasons
 * 
 * This component previously allowed dynamic script injection via dangerouslySetInnerHTML,
 * which posed a stored XSS vulnerability risk if admin accounts were compromised.
 * 
 * The feature has been removed to improve application security.
 * 
 * For third-party integrations (analytics, chat widgets, etc.), please use:
 * - Environment variables for configuration
 * - Static script tags in index.html
 * - React-based integration libraries when available
 */
const CustomScriptsLoader = () => {
  // Component disabled for security - renders nothing
  return null;
};

export default CustomScriptsLoader;
