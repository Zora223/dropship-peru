import type { ReactNode } from "react";
import Navbar from "../components/Navbar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <Navbar />
        </div>
      </div>

      <main className="grow">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} Dropship Perú. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}