import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import '../styles/globals.css';  // <<< ต้อง import ให้ถูก path

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && router.pathname !== '/login' && !sessionStorage.getItem('tmbc_user')) {
      router.replace('/login');
    }
  }, [router.pathname, isClient, router]);

  if (!isClient) return null;

  return <Component {...pageProps} />;
}

export default MyApp;
