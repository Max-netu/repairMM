import { Link, useLocation } from 'react-router-dom';
import { Home, Ticket, FileText, BarChart3, User, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', icon: Home, label: 'Početna' },
    { path: '/tickets', icon: Ticket, label: 'Prijave' },
    ...(user?.role === 'hall' ? [{ path: '/tickets/new', icon: FileText, label: 'Nova' }] : []),
    ...(user?.role === 'admin' ? [{ path: '/admin/users', icon: UsersIcon, label: 'Korisnici' }] : []),
    { path: '/profile', icon: User, label: 'Profil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-screen-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className={`text-xs mt-1 ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}