import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { OrganizationRole } from '@/types/organizations';

interface RoleInfoTooltipProps {
  role: OrganizationRole;
}

const roleDescriptions: Record<OrganizationRole, {
  title: string;
  permissions: string[];
}> = {
  admin: {
    title: 'Administrator',
    permissions: [
      'Full access to all features',
      'Manage team members and roles',
      'Create and delete surveys',
      'View all survey responses',
      'Manage organisation settings'
    ]
  },
  editor: {
    title: 'Editor',
    permissions: [
      'Create and edit surveys',
      'View survey responses',
      'Manage action plans',
      'Cannot manage team members',
      'Cannot delete organisation'
    ]
  },
  viewer: {
    title: 'Viewer',
    permissions: [
      'View surveys and responses',
      'View action plans',
      'Cannot create or edit content',
      'Cannot manage team members',
      'Read-only access'
    ]
  }
};

const RoleInfoTooltip: React.FC<RoleInfoTooltipProps> = ({ role }) => {
  const info = roleDescriptions[role];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help inline-block ml-1" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">{info.title}</p>
            <ul className="text-sm space-y-1">
              {info.permissions.map((permission, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{permission}</span>
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default RoleInfoTooltip;
