import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-main)' }}>
      <Sidebar />
      <main className="flex-1 min-h-screen ml-64 px-8 py-7">
        <div className="animate-fade-in w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
