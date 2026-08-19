import type { Metadata } from "next";
import { Inter, Great_Vibes, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LangProvider } from "@/lib/lang-context";
import { FCMProvider } from "@/components/FCMProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ['latin'] });
const greatVibes = Great_Vibes({ weight: '400', subsets: ['latin'], variable: '--font-cursive' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: "HealConnect - Professional Wellness",
  description: "Connect with verified energy healers, Vastu experts, numerologists, and tarot readers instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${greatVibes.variable} ${playfair.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <LangProvider>
            <FCMProvider>
              {children}
            </FCMProvider>
          </LangProvider>
        </ThemeProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
