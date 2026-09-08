import type { Metadata } from "next";
import { Inter } from "next/font/google";
import TosGate from "@/components/tos/TosGate";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CrushBoard",
  description: "Professional partner acquisition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <TosGate>{children}</TosGate>
      </body>
    </html>
  );
}
