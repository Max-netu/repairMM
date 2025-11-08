import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {title && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-screen-lg mx-auto px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          </div>
        </header>
      )}
      <main className="max-w-screen-lg mx-auto px-4 py-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}