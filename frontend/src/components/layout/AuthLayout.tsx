import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
