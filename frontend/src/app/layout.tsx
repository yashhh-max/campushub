import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "CampusHub | Modern College Community & Campus Discovery Platform",
    template: "%s | CampusHub",
  },
  description:
    "Discover campus hackathons and events, explore verified student clubs, and stay informed with real-time academic announcements on CampusHub.",
  keywords: [
    "CampusHub",
    "college community",
    "campus events",
    "student clubs",
    "university portal",
    "student organization",
    "real-time attendance",
    "QR tickets",
  ],
  authors: [{ name: "CampusHub Engineering Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://campushub.edu",
    title: "CampusHub — Modern College Community & Campus Discovery",
    description:
      "Your campus. Your community. All in one hub. Events, clubs, real-time discussions, and QR check-in.",
    siteName: "CampusHub",
  },
  twitter: {
    card: "summary_large_image",
    title: "CampusHub — Modern College Community & Campus Discovery",
    description:
      "Your campus. Your community. All in one hub. Events, clubs, real-time discussions, and QR check-in.",
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
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
