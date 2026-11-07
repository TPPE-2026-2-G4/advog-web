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
      suppressHydrationWarning
    >
      <head>
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var cached = localStorage.getItem('institucional_data');
                  if (cached) {
                    var d = JSON.parse(cached);
                    if (d) {
                      function getContrast(hex, dark, light) {
                        dark = dark || '#172133';
                        light = light || '#ffffff';
                        if (!hex || typeof hex !== 'string') return dark;
                        var c = hex.replace('#', '').trim();
                        if (c.length === 3) c = c.split('').map(function(x) { return x + x; }).join('');
                        if (c.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(c)) return dark;
                        var r = parseInt(c.slice(0, 2), 16);
                        var g = parseInt(c.slice(2, 4), 16);
                        var b = parseInt(c.slice(4, 6), 16);
                        var yiq = (r * 299 + g * 587 + b * 114) / 1000;
                        return yiq >= 150 ? dark : light;
                      }
                      if (d.corPrimaria) {
                        document.documentElement.style.setProperty('--cor-primaria', d.corPrimaria);
                        document.documentElement.style.setProperty('--cor-primaria-texto', getContrast(d.corPrimaria));
                      }
                      if (d.corSecundaria) {
                        document.documentElement.style.setProperty('--cor-secundaria', d.corSecundaria);
                        document.documentElement.style.setProperty('--cor-secundaria-texto', getContrast(d.corSecundaria));
                      }
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <InstitucionalProvider>{children}</InstitucionalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
