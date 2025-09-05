import { ReactNode } from 'react';

export default function MobileDashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 shadow-lg min-h-screen">
        {children}
      </div>
    </div>
  );
}
