'use client';

import React from 'react';
import { MobileNavigation, MobileBottomNavigation } from './MobileNavigation';
import { cn } from '@/lib/utils';

export function MobileOptimizedButton({ children, className, ...props }) {
  return (
    <button 
      className={cn(
        "px-4 py-2 bg-blue-600 text-white rounded-lg font-medium",
        "active:bg-blue-700 active:scale-95 transition-all",
        "touch-manipulation select-none",
        "min-h-[44px] min-w-[44px]", // iOS touch target size
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function MobileDashboardLayout({ children, className }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Navigation */}
      <MobileNavigation />
      
      {/* Main Content */}
      <main className={cn(
        "lg:ml-0",
        // Add bottom padding for mobile bottom navigation
        "pb-20 lg:pb-0",
        // Add top padding for mobile menu button
        "pt-16 lg:pt-0",
        className
      )}>
        {children}
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation />
    </div>
  );
}

export function MobileOptimizedGrid({ children, className }) {
  return (
    <div className={cn(
      "grid gap-4",
      // Mobile-first responsive grid
      "grid-cols-1",
      "sm:grid-cols-2",
      "lg:grid-cols-3",
      "xl:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}

export function MobileOptimizedCard({ 
  children, 
  className, 
  title,
  subtitle,
  ...props 
}) {
  return (
    <div
      className={cn(
        // Mobile-optimized card styling
        "bg-white dark:bg-gray-800",
        "border border-gray-200 dark:border-gray-700",
        "rounded-lg",
        "shadow-sm",
        "p-4",
        // Better touch targets
        "min-h-[120px]",
        // Enhanced visual hierarchy
        "hover:shadow-md transition-shadow",
        className
      )}
      {...props}
    >
      {title && (
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function MobileOptimizedStats({ 
  value, 
  label, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  className 
}) {
  const getChangeColor = (type) => {
    switch (type) {
      case 'positive': return 'text-green-600 dark:text-green-400';
      case 'negative': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <MobileOptimizedCard className={cn("text-center", className)}>
      <div className="flex flex-col items-center space-y-2">
        {Icon && (
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        )}
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {value}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {label}
        </div>
        {change && (
          <div className={cn("text-xs font-medium", getChangeColor(changeType))}>
            {change}
          </div>
        )}
      </div>
    </MobileOptimizedCard>
  );
}
