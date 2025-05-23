
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../ui/sidebar';
import { 
  CreditCard, 
  Users, 
  MessageSquarePlus, 
  Gift, 
  Package, 
  FlaskConical, 
  Code, 
  Database,
  Award
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AppSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onTabChange }) => {
  const businessManagementItems = [
    {
      title: "Purchase Management",
      value: "purchases",
      icon: CreditCard,
    },
    {
      title: "Plan Management", 
      value: "plans",
      icon: Package,
    },
    {
      title: "Redemption Codes",
      value: "redemption",
      icon: Gift,
    },
    {
      title: "Accreditation Reviews",
      value: "accreditation",
      icon: Award,
    },
  ];

  const userManagementItems = [
    {
      title: "User Management",
      value: "users", 
      icon: Users,
    },
    {
      title: "Feedback Analytics",
      value: "feedback",
      icon: MessageSquarePlus,
    },
  ];

  const systemConfigItems = [
    {
      title: "Testing Mode",
      value: "testing",
      icon: FlaskConical,
    },
    {
      title: "Custom Scripts",
      value: "scripts",
      icon: Code,
    },
    {
      title: "Hubspot Integration",
      value: "hubspot",
      icon: Database,
    },
  ];

  return (
    <Sidebar style={{ top: '5rem' }} className="h-[calc(100vh-5rem)]">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Business Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessManagementItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton 
                    isActive={activeTab === item.value}
                    onClick={() => onTabChange(item.value)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>User Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userManagementItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton 
                    isActive={activeTab === item.value}
                    onClick={() => onTabChange(item.value)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemConfigItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton 
                    isActive={activeTab === item.value}
                    onClick={() => onTabChange(item.value)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
