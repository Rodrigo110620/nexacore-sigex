import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="hidden lg:block"><Header /></div>
      <main className="flex-1 overflow-y-auto lg:overflow-hidden">
        {children}
      </main>
      <div className="hidden lg:block"><Footer /></div>
    </div>
  );
}
