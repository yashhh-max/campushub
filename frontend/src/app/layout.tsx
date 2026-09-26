import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { CursorTrail } from "@/components/ui/CursorTrail";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "KPRIT CampusHub | Kommuri Pratap Reddy Institute of Technology",
    template: "%s | KPRIT CampusHub",
  },
  description:
    "Official digital campus platform for Kommuri Pratap Reddy Institute of Technology (KPRIT), Hyderabad. Autonomous institution affiliated to JNTUH, approved by AICTE, accredited by NAAC 'A' Grade.",
  keywords: [
    "KPRIT",
    "Kommuri Pratap Reddy Institute of Technology",
    "KPRIT CampusHub",
    "KPRIT Hyderabad",
    "Ghatkesar Engineering College",
    "JNTUH Autonomous College",
    "KPRIT Placements",
    "TPO KPRIT",
    "Student Campus Portal",
  ],
  authors: [{ name: "KPRIT Campus Technology Division" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kpritech.ac.in",
    title: "KPRIT CampusHub — Digital Campus Platform",
    description:
      "Everything KPRIT Students Need, In One Place. Events, student chapters, announcements, and career opportunities.",
    siteName: "KPRIT CampusHub",
  },
  twitter: {
    card: "summary_large_image",
    title: "KPRIT CampusHub — Digital Campus Platform",
    description:
      "Everything KPRIT Students Need, In One Place. Events, student chapters, announcements, and career opportunities.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`} suppressHydrationWarning style={{ colorScheme: 'light' }}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  localStorage.removeItem('theme');
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white bg-slate-50 text-slate-900" style={{ colorScheme: 'light' }}>
        <CursorTrail />
        <div className="relative z-10 flex-1 flex flex-col min-h-screen">
          <AuthProvider>
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
