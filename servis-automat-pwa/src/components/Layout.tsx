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
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h1>
          </div>
        </header>
      )}
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}