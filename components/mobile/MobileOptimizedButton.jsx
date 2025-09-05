'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function MobileOptimizedButton({ 
  children, 
  className, 
  size = 'default',
  ...props 
}) {
  return (
    <Button
      className={cn(
        // Mobile-optimized touch targets (minimum 44px)
        'min-h-[44px] min-w-[44px]',
        // Better spacing for mobile
        'px-4 py-3',
        // Enhanced visual feedback
        'active:scale-95 transition-transform duration-150',
        // Better text sizing for mobile
        'text-base',
        // Improved focus states for accessibility
        'focus:ring-2 focus:ring-offset-2',
        className
      )}
      size={size}
      {...props}
    >
      {children}
    </Button>
  );
}

export function MobileOptimizedCard({ 
  children, 
  className, 
  ...props 
}) {
  return (
    <div
      className={cn(
        // Better touch targets and spacing
        'p-4',
        // Enhanced visual hierarchy
        'border border-gray-200 dark:border-gray-700',
        'rounded-lg',
        'bg-white dark:bg-gray-800',
        'shadow-sm',
        // Better mobile spacing
        'mb-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MobileOptimizedInput({ 
  className, 
  ...props 
}) {
  return (
    <input
      className={cn(
        // Mobile-optimized input sizing
        'min-h-[44px] px-4 py-3',
        // Better text sizing
        'text-base',
        // Enhanced focus states
        'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        // Better visual styling
        'border border-gray-300 dark:border-gray-600',
        'rounded-md',
        'bg-white dark:bg-gray-800',
        'text-gray-900 dark:text-gray-100',
        'placeholder:text-gray-500 dark:placeholder:text-gray-400',
        className
      )}
      {...props}
    />
  );
}
