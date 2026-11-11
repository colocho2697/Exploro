import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Exploro — Descubrimiento Inteligente Basado en Evidencias (EE. UU.)',
  description:
    'Descubre lugares, comida, actividades y experiencias reales en Estados Unidos respaldadas por evidencias verificables.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

