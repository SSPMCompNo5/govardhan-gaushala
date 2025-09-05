'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  PlusCircle, 
  Activity, 
  Users, 
  Settings, 
  BarChart3,
  Home,
  Shield,
  Calendar,
  FileText,
  Package,
  Truck,
  Clock,
  Zap,
  Database,
  TrendingUp,
  PieChart
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const hoverTimeout = useRef(null);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMouseEnter = () => {
    if (isCollapsed) {
      hoverTimeout.current = setTimeout(() => {
        setIsHovered(true);
      }, 100); // Reduced delay for more responsive hover
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    if (isHovered) {
      setIsHovered(false);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
      }
    };
  }, []);

  // Optimized navigation generation with memoized config
  const navigationItems = useMemo(() => {
    const role = session?.user?.role;

    const computeActive = (href, mode = 'starts') => {
      if (mode === 'exact') return pathname === href;
      return pathname.startsWith(href);
    };

    const BASE = [{ title: 'Dashboard', href: '/dashboard', icon: Home, active: pathname === '/dashboard' }];

    const MAP = {
      'Owner/Admin': [
        { title: 'Admin Panel', href: '/dashboard/admin', icon: Settings, mode: 'starts' },
        { title: 'User Management', href: '/dashboard/admin/users', icon: Users },
        { title: 'System Settings', href: '/dashboard/admin/settings', icon: Settings },
        { title: 'Advanced Reports', href: '/dashboard/admin/reports', icon: BarChart3 },
        { title: 'Performance Analytics', href: '/dashboard/admin/performance', icon: TrendingUp },
        { title: 'Backup Management', href: '/dashboard/admin/backup', icon: Database },
        { title: 'Disaster Recovery', href: '/dashboard/admin/disaster-recovery', icon: Shield },
        { title: 'API Testing', href: '/dashboard/admin/api-testing', icon: Zap },
        { title: 'Data Management', href: '/dashboard/admin/data-management', icon: Database },
        { title: 'System Monitoring', href: '/dashboard/admin/system-monitoring', icon: Activity },
      ],
      'Watchman': [
        { title: 'New Entry', href: '/dashboard/watchman/entry', icon: PlusCircle, mode: 'exact' },
        { title: 'Record Exit', href: '/dashboard/watchman/exit', icon: Activity, mode: 'exact' },
        { title: 'Gate Activity', href: '/dashboard/watchman/activity', icon: FileText, mode: 'exact' },
        { title: 'Reports', href: '/dashboard/watchman/report', icon: BarChart3, mode: 'exact' },
        { title: 'Watchman Dashboard', href: '/dashboard/watchman', icon: Home, mode: 'exact' },
      ],
      'Food Manager': [
        { title: 'Food Manager Dashboard', href: '/dashboard/food-manager', icon: Home, mode: 'exact' },
        { title: 'Inventory', href: '/dashboard/food-manager/inventory', icon: Package },
        { title: 'Feedings', href: '/dashboard/food-manager/feedings', icon: Calendar },
        { title: 'Suppliers', href: '/dashboard/food-manager/suppliers', icon: Truck },
        { title: 'Schedule', href: '/dashboard/food-manager/schedule', icon: Clock },
      ],
      'Cow Manager': [
        { title: 'Cow Manager Dashboard', href: '/dashboard/cow-manager', icon: Home, mode: 'exact' },
        { title: 'Cows & Herd', href: '/dashboard/cow-manager/cows', icon: Users },
        { title: 'Health', href: '/dashboard/cow-manager/health', icon: Shield },
        { title: 'Breeding', href: '/dashboard/cow-manager/breeding', icon: Calendar },
        { title: 'Milk', href: '/dashboard/cow-manager/milk', icon: TrendingUp },
        { title: 'Pasture', href: '/dashboard/cow-manager/pasture', icon: Settings },
        { title: 'Tasks', href: '/dashboard/cow-manager/tasks', icon: Users },
        { title: 'Alerts', href: '/dashboard/cow-manager/alerts', icon: Activity },
        { title: 'Reports', href: '/dashboard/goshala-manager/reports', icon: FileText },
      ],
      'Goshala Manager': [
        { title: 'Goshala Manager Dashboard', href: '/dashboard/goshala-manager', icon: Home, mode: 'exact' },
        { title: 'Cows & Herd', href: '/dashboard/goshala-manager/cows', icon: Users },
        { title: 'Health & Vet', href: '/dashboard/goshala-manager/health', icon: Shield },
        { title: 'Food & Fodder', href: '/dashboard/goshala-manager/food', icon: Package },
        { title: 'Finance & Donations', href: '/dashboard/goshala-manager/finance', icon: BarChart3 },
        { title: 'Staff & Ops', href: '/dashboard/goshala-manager/staff', icon: Users },
        { title: 'Infrastructure', href: '/dashboard/goshala-manager/infrastructure', icon: Settings },
        { title: 'Reports', href: '/dashboard/goshala-manager/reports', icon: FileText },
        { title: 'Alerts', href: '/dashboard/goshala-manager/alerts', icon: Activity },
      ],
      'Doctor': [
        { title: 'Doctor Dashboard', href: '/dashboard/doctor', icon: Home, mode: 'exact' },
        { title: 'Patients (Cows)', href: '/dashboard/doctor/patients', icon: Users },
        { title: 'Treatments', href: '/dashboard/doctor/treatments', icon: Shield },
        { title: 'Vaccinations', href: '/dashboard/doctor/vaccinations', icon: Calendar },
        { title: 'Medicines', href: '/dashboard/doctor/medicines', icon: Package },
        { title: 'Appointments', href: '/dashboard/doctor/appointments', icon: Clock },
        { title: 'Reports & Analytics', href: '/dashboard/doctor/reports', icon: BarChart3 },
        { title: 'Alerts & Notifications', href: '/dashboard/doctor/alerts', icon: Activity },
      ],
    };

    const roleItems = MAP[role] || [];
    return [...BASE, ...roleItems].map(item => ({
      ...item,
      active: computeActive(item.href, item.mode || 'starts')
    }));
  }, [session?.user?.role, pathname]);

  return (
    <div 
      className={cn(
        'fixed left-0 top-16 bottom-0 z-40 transition-all duration-300 ease-in-out',
        isHovered ? 'w-64' : (isCollapsed ? 'w-16' : 'w-64')
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={isCollapsed && !isHovered ? toggleSidebar : undefined}
    >
      <aside
        className={cn(
          'h-full border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col transition-all duration-200',
          isCollapsed ? 'cursor-pointer hover:bg-accent/20' : ''
        )}
      >
        <div className="flex h-full flex-col justify-between">
          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-2 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={item.active ? "secondary" : "ghost"}
                    className={cn(
                      'w-full justify-start transition-colors',
                      item.active && 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    <Link 
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 w-full',
                        (isCollapsed && !isHovered) ? 'justify-center' : ''
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className={cn('whitespace-nowrap', (isCollapsed && !isHovered) ? 'hidden' : 'block')}>
                        {item.title}
                      </span>
                    </Link>
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* User Info & Actions */}
          <div className="border-t p-2 space-y-2">
            {/* User Info */}
            {(!isCollapsed || isHovered) && (
              <div className="px-2 py-1">
                <div className="text-xs font-medium text-muted-foreground">
                  {session?.user?.userId || 'User'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {session?.user?.role || 'Role'}
                </div>
              </div>
            )}

            {/* Collapse button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleSidebar();
              }}
              className="w-full justify-start"
              onMouseEnter={(e) => e.stopPropagation()}
            >
              {(isCollapsed && !isHovered) ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="mr-2 h-4 w-4" />
                  <span className={(isCollapsed && !isHovered) ? 'hidden' : 'block'}>Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;
