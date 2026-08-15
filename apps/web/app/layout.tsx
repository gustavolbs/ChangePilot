import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Inter, Nunito_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const nunitoSansHeading = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "ChangePilot — Review changes with confidence",
  description:
    "AI-powered change reviews that help your team ship with confidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "dark font-sans",
        inter.variable,
        nunitoSansHeading.variable,
      )}
    >
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
