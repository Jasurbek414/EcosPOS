import { useState, useEffect, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PageSkeletonLoader from '../ui/PageSkeletonLoader';
import { preloadAllMainRoutes } from '../../utils/routePreloader';

const COLLAPSE_KEY = 'savdo_sidebar_collapsed';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      preloadAllMainRoutes();
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // localStorage yo'q bo'lsa ham ilova ishlashda davom etsin — shunchaki eslab qolinmaydi.
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-main)' }}>
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <main className={`flex-1 min-h-screen px-8 py-7 transition-[margin] duration-200 ${collapsed ? 'ml-[4.75rem]' : 'ml-64'}`}>
        <div className="w-full">
          <Suspense fallback={<PageSkeletonLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
