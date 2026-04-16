import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enxoval Inteligente",
  description: "Portal de ferramentas para o enxoval do seu bebê"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white">
        {children}
      </body>
    </html>
  );
}
