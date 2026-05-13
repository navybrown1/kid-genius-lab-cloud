import './globals.css';

export const metadata = {
  title: 'Kid Genius Lab',
  description: 'Parent-led learning missions for curious kids'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
