import { AuthProvider } from '@/contexts/AuthContext';
import { InstitucionalProvider } from '@/contexts/InstitucionalContext';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${cormorant.variable}`}
    >
      <body>
        <AuthProvider>
          <InstitucionalProvider>{children}</InstitucionalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
