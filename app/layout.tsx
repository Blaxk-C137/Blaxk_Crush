import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";

import TosGate from "@/components/tos/TosGate";
import { getAppUrl } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "CrushBoard — Professional partner acquisition",
    template: "%s · CrushBoard",
  },
  description:
    "Post a position, share your application portal, and review candidates on your own terms. Professional partner acquisition.",
  openGraph: {
    siteName: "CrushBoard",
    title: "CrushBoard — Professional partner acquisition",
    description:
      "Post a position, share your application portal, and review candidates on your own terms.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CrushBoard — Professional partner acquisition",
    description:
      "Post a position, share your application portal, and review candidates on your own terms.",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-screen bg-background font-sans">
        <TosGate>{children}</TosGate>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
