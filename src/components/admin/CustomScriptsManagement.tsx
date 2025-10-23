import React from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, ShieldAlert } from 'lucide-react';

/**
 * CustomScriptsManagement - DEPRECATED for security reasons
 * 
 * This feature has been disabled to prevent stored XSS vulnerabilities.
 * Dynamic script injection using dangerouslySetInnerHTML posed a security risk.
 */
const CustomScriptsManagement = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
          <h2 className="text-xl font-semibold">Custom Scripts - Feature Disabled</h2>
        </div>
        
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            <p className="font-medium mb-2">This feature has been disabled for security reasons.</p>
            <p className="text-sm">
              Dynamic script injection posed a stored XSS vulnerability risk. To maintain the security 
              of your application and user data, this functionality has been removed.
            </p>
          </AlertDescription>
        </Alert>

        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Alternative Solutions</h3>
          <p className="text-gray-700 mb-3">
            For third-party integrations such as analytics, chat widgets, or tracking pixels, please use these secure alternatives:
          </p>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-brandPurple-600 font-bold">•</span>
              <span><strong>Environment Variables:</strong> Configure integration keys via environment variables</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brandPurple-600 font-bold">•</span>
              <span><strong>Static Scripts:</strong> Add script tags directly to your index.html file</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brandPurple-600 font-bold">•</span>
              <span><strong>React Libraries:</strong> Use official React integration libraries when available (e.g., react-ga4, @segment/analytics-next)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brandPurple-600 font-bold">•</span>
              <span><strong>Server-Side Integration:</strong> Implement integrations via edge functions for enhanced security</span>
            </li>
          </ul>
        </div>

        <div className="mt-4 bg-blue-50 p-4 rounded-md border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-sm text-blue-700">
            If you need assistance implementing a specific third-party integration securely, 
            please contact support for guidance on the best approach for your use case.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomScriptsManagement;
