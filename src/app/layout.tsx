import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZUP Delivery",
  description: "Gerenciamento de entregas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="relative flex min-h-screen w-full flex-col bg-background">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
