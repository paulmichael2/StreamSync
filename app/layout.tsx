import type { Metadata } from 'next';
import './globals.css';
import InstallBanner from '@/components/InstallBanner';

export const metadata: Metadata = {
  title: 'HeartSync — Watch Together',
  description: 'A synchronized streaming platform. Watch movies together in real-time with friends.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HeartSync',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="bg-black text-white antialiased">
        {children}
        <InstallBanner />
      </body>
    </html>
  );
}
