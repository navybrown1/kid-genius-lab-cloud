import './globals.css';

export const metadata = {
  title: 'Kid Genius Lab — A playground for big questions',
  description:
    'A parent-supervised AI learning playground with tutor chats, adaptive quizzes, hands-on missions, bedtime stories, and progress that celebrates every curious kid.',
  applicationName: 'Kid Genius Lab',
  keywords: ['kids learning', 'AI tutor', 'science for kids', 'homeschool', 'bedtime stories', 'learning games'],
  authors: [{ name: 'Kid Genius Lab' }],
  openGraph: {
    title: 'Kid Genius Lab — A playground for big questions',
    description:
      'Tutor chats, adaptive quizzes, hands-on missions, and bedtime stories — wrapped in a lab built for curious kids.',
    siteName: 'Kid Genius Lab',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kid Genius Lab',
    description: 'A playground for big questions.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kid Genius Lab',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport = {
  themeColor: '#070812',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-body">{children}</body>
    </html>
  );
}
