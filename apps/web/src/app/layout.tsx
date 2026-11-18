import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../i18n';

export const metadata: Metadata = {
  title: 'Exploro — Descubrimiento Inteligente Basado en Evidencias',
  description:
    'Descubre lugares, comida, actividades y experiencias reales en cualquier lugar del mundo respaldadas por evidencias verificables.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="es">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}

