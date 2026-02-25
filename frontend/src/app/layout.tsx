import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pinion Signal Agent",
  description:
    "Autonomous AI crypto signal agent powered by PinionOS. " +
    "Real-time BUY/HOLD/SELL signals for ETH, WETH, CBETH.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}