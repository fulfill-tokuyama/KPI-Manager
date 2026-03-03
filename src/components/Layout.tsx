import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PenTool, ClipboardList, Target, Handshake } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/', label: 'ダッシュボード', shortLabel: 'ホーム', icon: LayoutDashboard },
  { href: '/diagnosis', label: 'AI診断', shortLabel: 'AI診断', icon: ClipboardList },
  { href: '/events', label: '交流会', shortLabel: '交流会', icon: Handshake },
  { href: '/input', label: 'KPI実績値入力', shortLabel: '実績入力', icon: PenTool },
  { href: '/targets', label: '目標設定', shortLabel: '目標', icon: Target },
];

function isNavActive(href: string, pathname: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 sm:pb-0">
      {/* Desktop top nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <span className="text-lg sm:text-xl font-bold text-indigo-600 tracking-tight">KPI Manager</span>
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(item.href, location.pathname);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={clsx(
                        active
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200'
                      )}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-20">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.href, location.pathname);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={clsx(
                  'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                  active ? 'text-indigo-600' : 'text-gray-400'
                )}
              >
                <Icon className={clsx('w-5 h-5', active && 'text-indigo-600')} />
                {item.shortLabel}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
