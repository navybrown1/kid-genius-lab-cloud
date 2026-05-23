import './globals.css';

export const metadata = {
  title: 'Kid Genius Lab',
  description: 'Parent-led learning missions for curious kids',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kid Genius Lab',
  },
};

export const viewport = {
  themeColor: '#8b5cf6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
