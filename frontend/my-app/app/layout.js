import { Inter, Tajawal } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../lib/LanguageContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata = {
  title: "Budget Office",
  description: "Personal expense tracking from bank SMS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${tajawal.variable} antialiased`}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
