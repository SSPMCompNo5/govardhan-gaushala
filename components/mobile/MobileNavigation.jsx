'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Activity, 
  Shield, 
  Stethoscope, 
  Utensils,
  Settings,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Watchman', href: '/dashboard/watchman', icon: Shield },
  { name: 'Food Manager', href: '/dashboard/food-manager', icon: Utensils },
  { name: 'Goshala Manager', href: '/dashboard/goshala-manager', icon: Users },
  { name: 'Doctor', href: '/dashboard/doctor', icon: Stethoscope },
  { name: 'Admin', href: '/dashboard/admin', icon: Settings },
];

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMenu}
          className="bg-white/90 backdrop-blur-sm shadow-lg"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={toggleMenu}
        />
      )}

      {/* Mobile Menu */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 z-40 h-full w-80 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Navigation</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={toggleMenu}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                    isActive 
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                  {item.name === 'Watchman' && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Live
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Bell className="h-4 w-4" />
              <span>Notifications enabled</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function MobileBottomNavigation() {
  const pathname = usePathname();

  const bottomNavItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Gate', href: '/dashboard/watchman', icon: Shield },
    { name: 'Food', href: '/dashboard/food-manager', icon: Utensils },
    { name: 'Health', href: '/dashboard/doctor', icon: Stethoscope },
    { name: 'Admin', href: '/dashboard/admin', icon: Settings },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-around py-2">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
