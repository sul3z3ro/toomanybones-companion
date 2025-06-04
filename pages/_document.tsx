import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="th">
      <Head>
        {/* ลิงก์ manifest เพื่อบอก browser ว่านี่คือ PWA */}
        <link rel="manifest" href="/manifest.json" />
        {/* ปรับสี Status bar บนมือถือ */}
        <meta name="theme-color" content="#1976d2" />
        {/* (เพิ่ม favicon ถ้ามี) */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
