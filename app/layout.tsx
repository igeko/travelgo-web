import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TravelGo — Plan your next trip",
  description: "TravelGo helps you organize, discover and live unforgettable trips.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white">{children}</body>
    </html>
  );
}
