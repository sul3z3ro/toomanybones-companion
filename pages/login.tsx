import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      sessionStorage.setItem('tmbc_user', email); // ตรงนี้
      router.push('/'); // redirect ไป home
    } else {
      // ใช้ alert หรือจะทำ custom popup ก็ได้
      window.alert('คุณไม่มีสิทธิ์ในการเข้าถึงข้อมูล');
      setEmail('');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <form className="bg-white p-8 rounded shadow-md w-full max-w-xs" onSubmit={handleLogin}>
        <h1 className="text-xl font-bold mb-4">Login</h1>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full mb-2 p-2 border rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
