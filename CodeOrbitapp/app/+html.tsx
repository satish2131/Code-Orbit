import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for Expo Router web builds.
 * It optimizes initial page loading by eliminating render-blocking CSS/JS and injecting critical styles.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Resource Hints: Preconnect to font CDNs to eliminate DNS/TLS latency */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />

        {/*
          ScrollViewStyleReset ensures flexbox scrolling works uniformly on web.
        */}
        <ScrollViewStyleReset />

        {/* 
          CRITICAL INLINE CSS:
          Inlining critical styles in <head> prevents white flash during HTML parsing & bundle evaluation.
          Drastically improves First Contentful Paint (FCP) by painting the theme background immediately.
        */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* Prevent layout flash & set dark theme background instantly */
          html, body, #root {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #17181A !important;
            color: #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            overflow: hidden;
            -webkit-tap-highlight-color: transparent;
          }

          /* 
            Font Display Swap:
            Forces web fonts & vector icon glyphs to use swap behavior so text/icons display fallback shapes
            immediately without blocking First Contentful Paint (FCP) or Largest Contentful Paint (LCP).
          */
          @font-face {
            font-family: 'Ionicons';
            font-display: swap;
          }

          /* Optimize rendering performance & eliminate paint delays */
          body {
            text-rendering: optimizeSpeed;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
