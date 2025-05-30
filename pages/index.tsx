import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type Menu = { sheet: string; code: string; label: string; };

export default function Home() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const email = sessionStorage.getItem('tmbc_user');
    if (!email) return; // หรือ redirect ไป login ก็ได้

    setLoading(true);
    fetch('/api/get-access-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((res) => res.json())
      .then((data) => setMenus(data.menus || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-cover bg-center"
  style={{
    backgroundImage: "url('/images/bg-home.jpeg')",
  }}
>
  {/* overlay ดำ */}
  <div className="absolute inset-0 bg-black/80 pointer-events-none"></div>
  
  {/* เนื้อหาจริง วางใน div ที่ relative หรือ z-10 */}
  <div className="relative z-10 flex flex-col items-center">
    <h1 className="text-3xl text-white mb-2 font-bold text-center">
      ยินดีต้อนรับสู่ Too Many Bones Companion!
    </h1>
    <h1 className="text-2xl text-white mb-4 font-bold text-center">
      กรุณาเลือกภาคที่เล่น
    </h1>
      <div className="flex flex-wrap justify-center gap-6">
        {loading ? (
          <div className="text-white">Loading...</div>
        ) : menus.length === 0 ? (
          <div className="text-white">คุณไม่มีสิทธิ์เข้าถึงเมนูใด ๆ</div>
        ) : (
          menus.map((menu) => (
            <button
              key={menu.code}
              onClick={() => router.push(`/${menu.code}`)}
              className="bg-gray-900 hover:bg-blue-700 text-white font-bold py-6 px-8 rounded-lg shadow-xl transition duration-150 text-xl"
            >
              {menu.label}
            </button>
          ))
        )}
      </div>
    </div>
    </div>
  );
}
