export default function manifest() {
  return {
    name: 'Kid Genius Lab',
    short_name: 'Genius Lab',
    description:
      'A parent-supervised AI learning playground with tutor chats, adaptive quizzes, hands-on missions, and bedtime stories.',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#070812',
    theme_color: '#070812',
    categories: ['education', 'kids'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
