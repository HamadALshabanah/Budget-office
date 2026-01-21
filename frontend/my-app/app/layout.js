import { Geist, Geist_Mono } from "next/font/google";
import { Tajawal, VT323 } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../lib/LanguageContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata = {
  title: "Budget Office Terminal",
  description: "Financial Expense Tracking System v2.0",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${tajawal.variable} ${vt323.variable} antialiased`}
      >
        <LanguageProvider>
            {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
