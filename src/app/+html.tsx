/**
 * +html.tsx — gabarit de la page web (uniquement pour la version web / PWA).
 *
 * Reprend les balises d'en-tête de la version en ligne : manifeste d'installation,
 * couleur du thème, icône Apple, et enregistrement du service worker (requis pour
 * que le navigateur propose « Installer l'application »).
 */
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Racine({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="theme-color" content="#00CC66" />
        {/* Remet à zéro le défilement du navigateur pour laisser React Native gérer les écrans. */}
        <ScrollViewStyleReset />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); }); }",
          }}
        />
      </body>
    </html>
  );
}
