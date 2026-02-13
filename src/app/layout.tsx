import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEP ERD Visualizer",
  description: "Visualize Adobe Experience Platform entity relationships",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}
