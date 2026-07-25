// src/layouts/MainLayout.tsx
import type { ReactNode } from "react";
import Navbar from "../components/Navbar";
import PublicFooter from "../components/PublicFooter";

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

      <PublicFooter />
    </div>
  );
}