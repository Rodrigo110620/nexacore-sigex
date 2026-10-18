import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice';

interface AuthLayoutProps {
  children: ReactNode;
  onIniciarSesion?: () => void;
}

export default function AuthLayout({ children, onIniciarSesion }: AuthLayoutProps) {
  const isMobile = useIsMobileDevice();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {!isMobile && <Header onIniciarSesion={onIniciarSesion} />}
      <main className="flex flex-1 items-stretch overflow-y-auto">
        {children}
      </main>
      {!isMobile && <Footer />}
    </div>
  );
}
