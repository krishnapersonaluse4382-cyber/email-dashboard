import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EmailOS — Campaign Command Center',
  description: 'Real-time email campaign reporting powered by Supabase',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
