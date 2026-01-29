import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="background-color" content="#0a0a0a" />
        <meta name="msapplication-TileColor" content="#FF00FF" />

        {/* Apple PWA Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Mobile Unit" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Web App Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* SEO Meta Tags */}
        <meta name="description" content="Mobile Unit - Αγορά και πώληση κινητών, tablets, laptops στην Ελλάδα. Buy and sell mobile devices in Greece." />
        <meta name="keywords" content="mobile, phones, tablets, laptops, buy, sell, Greece, Ελλάδα, κινητά, used devices" />
        <meta name="author" content="Mobile Unit" />

        {/* Open Graph / Social Media */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Mobile Unit - Marketplace συσκευών στην Ελλάδα" />
        <meta property="og:description" content="Αγορά και πώληση πιστοποιημένων κινητών, tablets και laptops. Safe local meetups with iRepair verification." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:site_name" content="Mobile Unit" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mobile Unit" />
        <meta name="twitter:description" content="Marketplace συσκευών στην Ελλάδα με πιστοποίηση iRepair" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Disable body scrolling on web for native-like feel */}
        <ScrollViewStyleReset />

        {/* Global styles for PWA */}
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalStyles = `
/* Dark theme background - prevents flash */
body {
  background-color: #0a0a0a;
  color: #ffffff;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}

/* Light mode override if needed */
@media (prefers-color-scheme: light) {
  body {
    background-color: #0a0a0a;
    color: #ffffff;
  }
}

/* Safe area insets for notched devices */
:root {
  --sat: env(safe-area-inset-top);
  --sar: env(safe-area-inset-right);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
}

/* Hide scrollbars but keep functionality */
::-webkit-scrollbar {
  display: none;
}

* {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Prevent text selection on interactive elements */
button, [role="button"] {
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Focus styles for accessibility */
:focus-visible {
  outline: 2px solid #FF00FF;
  outline-offset: 2px;
}

/* PWA standalone mode adjustments */
@media all and (display-mode: standalone) {
  body {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* Prevent pull-to-refresh on mobile browsers */
html, body {
  overscroll-behavior: none;
}
`;
