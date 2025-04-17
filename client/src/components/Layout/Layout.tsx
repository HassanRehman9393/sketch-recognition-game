import { ReactNode } from 'react';
import NavBar from '@/components/NavBar/NavBar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="py-6 border-t">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} QuickDoodle. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout;
