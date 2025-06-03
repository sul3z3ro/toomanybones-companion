import { useEffect, useState, Fragment } from 'react';
import yaml from 'js-yaml';
import { useRouter } from 'next/router';
import { Dialog, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, UserCircleIcon, Squares2X2Icon, UserGroupIcon, GiftIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from "framer-motion";
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import React from 'react';

// ===== 1. PREPROCESS ICON TAG =====
function preprocessWithIcons(text: string) {
  if (!text) return "";
  // icon-tx
  text = text.replace(/\[icon-tx:([a-zA-Z0-9-]+)\]/g, '![](/images/$1-tx.png)');
  // icon ปกติ
  text = text.replace(/\[icon:([a-zA-Z0-9-]+)\]/g, '![](/images/$1.png)');
  return text;
}

// ===== 2. PREPROCESS COLOR TAG ([green]...[/green]) ให้เป็น HTML =====
const colorMap: Record<string, string> = {
  red: '#d32f2f',
  green: '#26a641',
  blue: '#1976d2',
  yellow: '#fbc02d',
};

function replaceColorTags(text: string): string {
  if (!text) return "";
  return text.replace(/\[([a-zA-Z]+)\]([\s\S]*?)\[\/\1\]/g, (_m, color, content) => {
    const cssColor = colorMap[color.toLowerCase()] || color;
    return `<span style="color:${cssColor}">${content}</span>`;
  });
}

// ===== 3. PREPROCESS NOBREAK TAG ([nb]...[/nb]) ให้เป็น HTML =====
function replaceNoBreakTags(text: string): string {
  if (!text) return "";
  return text.replace(/<nb>([\s\S]*?)<\/nb>/g, (_m, content) => {
    return `<span style="white-space:nowrap">${content}</span>`;
  });
}

// ===== 4. รวมทุก preprocess =====
function preprocessAll(text: string): string {
  return replaceNoBreakTags(
    replaceColorTags(
      preprocessWithIcons(text)
    )
  );
}

type MenuGroup = {
  code: string;
  label: string;
};

const navTabs = [
  { key: 'encounter', label: 'Encounter', icon: Squares2X2Icon },
  { key: 'solo', label: 'Solo Encounter', icon: UserCircleIcon },
  { key: 'tyrants', label: 'Tyrants', icon: UserGroupIcon },
  { key: 'loots', label: 'Loots & Trove Loots', icon: GiftIcon },
];

function getString(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

// ===== Helper ปลอดภัยสำหรับ Next/Image ใน markdown =====
function safeImage(src?: string | Blob, alt?: string) {
  if (typeof src !== "string" || src.trim() === "") return null;
  const imgSrc = src.startsWith('/') ? src : '/' + src;
  let w = 30, h = 30;
  let verticalAlign = 'middle';
  if (imgSrc.includes('-tx.png')) {
    w = 20;
    h = 20;
    verticalAlign = '-3px';
  } else if (imgSrc.includes('-ty.png')) {
    w = 40;
    h = 40;
    verticalAlign = '0px';
  }
  return (
    <Image
      src={imgSrc as string}
      alt={alt || ""}
      width={w}
      height={h}
      style={{
        display: 'inline-block',
        width: w,
        height: h,
        margin: '0 2px',
        verticalAlign: verticalAlign,
      }}
      unoptimized
    />
  );
}

export default function TMB() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('encounter');
  const [visibleMenus, setVisibleMenus] = useState<MenuGroup[]>([]);
  const [fadeIn, setFadeIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const activeMenu = "undertow";

  const handleRedirect = (href: string) => {
    router.push(href);
  };

  const handleModalOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setSelected(null);
  };

  function splitCompleteReward(reward: string) {
    if (!reward) return { left: [], right: [] };
    const leftIcons = ['[icon:progress]', '[icon:progress1]', '[icon:progress2]'];
    const items = reward.split(/,\s*/).filter(Boolean);
    const left = items.filter(i => leftIcons.some(icon => i.includes(icon)));
    const right = items.filter(i => !leftIcons.some(icon => i.includes(icon)));
    return { left, right };
  }

  const validChoices: number[] = selected
    ? [1, 2, 3].filter(
        (n: number) =>
          typeof selected[`Choice${n} Header`] === 'string' &&
          getString(selected[`Choice${n} Header`])
      )
    : [];

  // 1. Fade-in effect
  useEffect(() => {
    setFadeIn(false);
    const timer = setTimeout(() => setFadeIn(true), 40);
    return () => clearTimeout(timer);
  }, []);

  // 2. ตรวจสอบสิทธิ์เมนู (และ whitelist)
  useEffect(() => {
    const email = typeof window !== 'undefined' ? sessionStorage.getItem('tmbc_user') : null;
    if (!email) {
      setVisibleMenus([]);
      setAuthorized(false);
      setLoading(false);
      return;
    }
    fetch('/api/get-access-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((res) => res.json())
      .then((data) => {
        setVisibleMenus(data.menus || []);
        // --- ตรวจสอบสิทธิ์เข้า tmb ---
        if ((data.menus || []).some((m: { code: string }) => m.code === 'tmbut')) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
        setLoading(false);
      });
  }, [router]);

  // 3. Fetch ข้อมูล YAML
  useEffect(() => {
    let file = '';
    if (currentTab === 'encounter') file = 'tmbut-encounters.yaml';
    else if (currentTab === 'solo') file = 'tmbut-encounters-solo.yaml';
    else if (currentTab === 'tyrants') file = 'tmbut-tyrants.yaml';
    else if (currentTab === 'loots') file = 'tmbut-loots.yaml';
    else file = 'tmbut-encounters.yaml';
    fetch(`/data/Undertow/${file}`)
      .then(res => res.text())
      .then(text => setData(yaml.load(text) as Record<string, unknown>[]));
  }, [currentTab]);

  // 4. Block Click ขวา
  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

    useEffect(() => {
      if (!loading && !authorized) {
        setRedirecting(true);
        setCountdown(5); // รีเซ็ตทุกครั้งที่ redirecting

        const interval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              if (typeof window !== 'undefined') {
                router.replace('/');
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(interval);
      }
    }, [loading, authorized, router]);

    // --- จากนี้ค่อย return ---
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen text-white text-xl">
          Loading...
        </div>
      );
    }

    if (redirecting) {
      return (
        <div className="flex items-center justify-center min-h-screen text-white text-xl">
          <div className="text-center">
            <div>ไม่มีสิทธิ์เข้าใช้งานหน้านี้ หากนี่คือข้อผิดพลาดกรุณาติดต่อ Admin</div>
            <div className="mt-4 text-lg text-gray-300">
              กลับหน้า Home ในอีก <span className="font-bold text-yellow-300">{countdown}</span> วินาที
            </div>
          </div>
        </div>
      );
    }


  return (
    <div className={`min-h-screen bg-black flex flex-col md:flex-row relative transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* Burger menu button */}
      <button
        className="absolute top-4 left-4 z-30 md:hidden p-2 rounded text-white bg-gray-900 bg-opacity-80 hover:bg-gray-700"
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
      >
        <Bars3Icon className="w-7 h-7" />
      </button>

      {/* Burger Drawer (mobile only) */}
      <Transition.Root show={menuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 md:hidden" onClose={setMenuOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>
          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-200"
              enterFrom="-translate-x-full" enterTo="translate-x-0"
              leave="transform transition ease-in-out duration-200"
              leaveFrom="translate-x-0" leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-64 flex-col bg-gray-900 p-6 h-full">
                <button
                  className="absolute top-2 right-2 text-gray-300 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <XMarkIcon className="w-7 h-7" />
                </button>
                <div className="mt-8">
                  <div className="text-white text-lg mb-4 font-bold">เมนู</div>
                  <ul>
                    {visibleMenus.map(menu => (
                      <li key={menu.code} className="mb-2">
                        <button
                          className="w-full text-left px-3 py-2 rounded bg-gray-800 text-white hover:bg-blue-700"
                          onClick={() => {
                            setMenuOpen(false);
                            handleRedirect(`/${menu.code}`);
                          }}
                        >
                          {menu.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Sidebar (desktop only) */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 h-screen sticky top-0">
        <div className="flex flex-col gap-2 px-6 py-8">
          <div className="text-white text-lg font-bold mb-6">เมนู</div>
          {visibleMenus.map(menu => (
            <button
              key={menu.code}
              className={
                "text-left px-3 py-2 rounded mb-2 w-full " +
                (activeMenu === menu.code
                  ? "bg-blue-600 text-white font-bold shadow"
                  : "bg-gray-800 text-white hover:bg-blue-700")
              }
              onClick={() => handleRedirect(`/${menu.code}`)}
            >
              {menu.label}
            </button>
          ))}
        </div>
        <nav className="flex-1 flex flex-col px-3">
          <div className="text-gray-400 text-sm mb-2 mt-4">Navigation</div>
          {navTabs.map(tab => (
            <button
              key={tab.key}
              className={`flex items-center px-4 py-2 mb-1 rounded ${currentTab === tab.key ? "bg-blue-800 text-white" : "text-gray-200 hover:bg-gray-800"}`}
              onClick={() => setCurrentTab(tab.key)}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col items-center pt-16 pb-24 md:py-12 px-2 md:px-8">
        <h1 className="text-white text-2xl mb-6 font-bold">{navTabs.find(t => t.key === currentTab)?.label}</h1>
        <div className="w-full max-w-2xl mb-4">
          <input
            type="text"
            className="w-full rounded px-3 py-2 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
            placeholder="ค้นหาการ์ด..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ y: 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30, duration: 0.35 }}
            className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 bg-black"
          >
            {data
              .filter(card => {
                const text =
                  getString(card.name).toLowerCase() +
                  ' ' +
                  getString(card.Description).toLowerCase();
                return text.includes(searchTerm.toLowerCase());
              })
              .map(card => (
                <button
                  key={getString(card.id)}
                  className="bg-gray-900 text-white rounded p-4 shadow hover:bg-gray-700 text-left"
                  onClick={() => setSelected(card)}
                >
                  <div className="font-bold">{getString(card.name)}</div>
                  <div className="text-xs opacity-70">{getString(card.type)}</div>
                </button>
              ))}
          </motion.div>
        </AnimatePresence>

{/* ----------- MODAL ----------- */}
<AnimatePresence>
  {selected && (
    <motion.div
      key="modal-bg"
      className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={handleModalOverlayClick}
      style={{ cursor: "pointer" }}
    >
      {currentTab === 'loots' ? (
        // ----- MODAL เฉพาะ Loot (มีแต่รูป) -----
        <motion.div
          key="modal-loot"
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: "spring", stiffness: 340, damping: 24 }
          }}
          exit={{
            opacity: 0,
            scale: 0.97,
            x: 240,
            transition: { duration: 0.29, ease: [0.61, 1, 0.88, 1] }
          }}
          className="bg-transparent shadow-none p-0 m-0 flex flex-col items-center justify-center relative"
          style={{ boxShadow: "none", background: "transparent", maxHeight: "90vh", cursor: "auto" }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="absolute top-2 left-3 text-white text-2xl z-10"
            style={{ textShadow: "0 1px 8px #000" }}
            onClick={() => setSelected(null)}
          >×</button>
          {typeof selected.Img === 'string' && (
            <div
              style={{
                position: 'relative',
                display: 'inline-block'
              }}
              onContextMenu={e => e.preventDefault()}
              onTouchStart={e => e.preventDefault()}
            >
              <Image
                src={`/images/tmb-loot/${selected.Img}`}
                alt={getString(selected.name)}
                width={340}
                height={340}
                style={{
                  objectFit: "contain",
                  borderRadius: "24px",
                  background: "rgba(0,0,0,0.1)",
                  maxWidth: "90vw",
                  maxHeight: "80vh",
                  boxShadow: "0 2px 24px rgba(0,0,0,0.7)",
                  pointerEvents: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                unoptimized
                draggable={false}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0, top: 0, right: 0, bottom: 0,
                  zIndex: 10,
                  background: 'rgba(0,0,0,0)', // โปร่งใส
                  pointerEvents: 'auto',
                  touchAction: 'none',
                }}
                onContextMenu={e => e.preventDefault()}
                onTouchStart={e => e.preventDefault()}
              />
            </div>
          )}
        </motion.div>
      ) : (
        // ----- MODAL ปกติ (Encounter/Solo/Tyrant) -----
        <motion.div
          key="modal-content"
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: "spring", stiffness: 340, damping: 24 }
          }}
          exit={{
            opacity: 0,
            scale: 0.97,
            x: 240,
            transition: { duration: 0.29, ease: [0.61, 1, 0.88, 1] }
          }}
          className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 pb-10 relative flex flex-col items-center"
          style={{ maxHeight: "80vh", cursor: "auto" }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="absolute top-2 right-3 text-black text-xl"
            onClick={() => setSelected(null)}
          >×</button>

                {/* ------- scrollable modal content ------ */}
                <div className="overflow-y-auto pr-1" style={{ maxHeight: 'calc(80vh - 64px)' }}>
                  {/* Title */}
                  <div className="text-lg font-bold mb-2">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      skipHtml={false}
                      components={{
                        strong: ({children}) => <strong className="font-bold text-black">{children}</strong>,
                        em: ({children}) => <em className="italic text-gray-600">{children}</em>,
                        img: ({src, alt}) => safeImage(src, alt),
                        span: (props) => <span style={props.style as React.CSSProperties}>{props.children}</span>,
                        ul: ({children}) => <ul className="list-disc pl-5 my-0">{children}</ul>,
                        li: ({children}) => <li className="mb-0">{children}</li>,
                      }}
                    >
                      {preprocessAll(getString(selected.name) || getString(selected.id))}
                    </ReactMarkdown>
                  </div>
                  {/* Description */}
                  {typeof selected.Description === 'string' && (
                    <div className="mb-4 text-black whitespace-pre-line">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        skipHtml={false}
                        components={{
                          strong: ({children}) => <strong className="font-bold text-black">{children}</strong>,
                          em: ({children}) => <em className="italic text-gray-600">{children}</em>,
                          img: ({src, alt}) => safeImage(src, alt),
                          a: ({children, href}) => <a href={href} className="text-blue-600 underline">{children}</a>,
                          ul: ({children}) => <ul className="list-disc pl-5 my-0">{children}</ul>,
                          li: ({children}) => <li className="mb-0">{children}</li>,
                          span: (props) => <span style={props.style as React.CSSProperties}>{props.children}</span>,
                        }}
                      >
                        {preprocessAll(getString(selected.Description))}
                      </ReactMarkdown>
                    </div>
                  )}
                  {/* Encounter Choices */}
                  {validChoices.length > 0 && (
                    <>
                      <hr className="mb-3 border-t border-gray-400" />
                      {validChoices.map((n, idx) => (
                        <Fragment key={n}>
                          {idx > 0 && (
                            <hr className="my-3 border-t border-gray-400" />
                          )}
                          <div className="mb-2 whitespace-pre-line">
                            <div className="flex items-center justify-between">
                              <span className="font-bold">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeRaw]}
                                  skipHtml={false}
                                  components={{
                                    strong: ({children}) => <strong className="font-bold text-black">{children}</strong>,
                                    em: ({children}) => <em className="italic text-gray-600">{children}</em>,
                                    img: ({src, alt}) => safeImage(src, alt),
                                    span: (props) => <span style={props.style as React.CSSProperties}>{props.children}</span>,
                                    ul: ({children}) => <ul className="list-disc pl-5 my-0">{children}</ul>,
                                    li: ({children}) => <li className="mb-0">{children}</li>,
                                  }}
                                >
                                  {preprocessAll(getString(selected[`Choice${n} Header`]))}
                                </ReactMarkdown>
                              </span>
                              {getString(selected[`Choice${n} Reward`]) && (
                                <span className="ml-2 text-xs font-semibold flex items-center">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                    skipHtml={false}
                                    components={{
                                      img: ({src, alt}) => safeImage(src, alt)
                                    }}
                                  >
                                    {preprocessAll(getString(selected[`Choice${n} Reward`]))}
                                  </ReactMarkdown>
                                </span>
                              )}
                            </div>
                            <div className="whitespace-pre-line text-sm">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                skipHtml={false}
                                components={{
                                  strong: ({children}) => <strong className="font-bold text-black">{children}</strong>,
                                  em: ({children}) => <em className="italic text-gray-600">{children}</em>,
                                  img: ({src, alt}) => safeImage(src, alt),
                                  a: ({children, href}) => <a href={href} className="text-blue-600 underline">{children}</a>,
                                  ul: ({children}) => <ul className="list-disc pl-5 my-0">{children}</ul>,
                                  li: ({children}) => <li className="mb-0">{children}</li>,
                                  span: (props) => <span style={props.style as React.CSSProperties}>{props.children}</span>,
                                }}
                              >
                                {preprocessAll(getString(selected[`Choice${n} Description`]) || '')}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </Fragment>
                      ))}
                      <hr className="mt-3 mb-2 border-t border-gray-400" />
                    </>
                  )}
                  {/* Tyrant Special Fields */}
                    {typeof selected["Required Monster"] === 'string' && (
                      <div className="mb-2">
                        <span className="font-bold">ประเภทของวายร้ายที่ใช้: </span>
                        <span className="whitespace-pre-line">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            skipHtml={false}
                            components={{
                              img: ({src, alt}) => safeImage(src, alt),
                              span: (props) => <span style={props.style as React.CSSProperties}>{props.children}</span>,
                            }}
                          >
                            {preprocessAll(getString(selected["Required Monster"]))}
                          </ReactMarkdown>
                        </span>
                      </div>
                    )}
                    {typeof selected.Time === 'string' && (
                      <div className="mb-8">
                        <span className="font-bold">ระยะเวลาที่ใช้: </span>
                        <span className="whitespace-pre-line">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            skipHtml={false}
                            components={{
                              img: ({src, alt}) => safeImage(src, alt),
                              span: (props) => <span style={props.style as React.CSSProperties}>{props.children}</span>,
                            }}
                          >
                            {preprocessAll(getString(selected.Time))}
                          </ReactMarkdown>
                        </span>
                      </div>
                    )}
                    {typeof selected.Instruction === 'string' && (
                      <div className="mb-4 text-black whitespace-pre-line">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          skipHtml={false}
                          components={{
                            strong: ({children}) => <strong className="font-bold text-black">{children}</strong>,
                            em: ({children}) => <em className="italic text-gray-600">{children}</em>,
                            img: ({src, alt}) => safeImage(src, alt),
                            a: ({children, href}) => <a href={href} className="text-blue-600 underline">{children}</a>,
                            ul: ({children}) => <ul className="list-disc pl-5 my-0">{children}</ul>,
                            li: ({children}) => <li className="mb-0">{children}</li>,
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            span: ({node, ...props}) => <span style={props.style as React.CSSProperties}>{props.children}</span>,
                          }}
                        >
                          {preprocessAll(getString(selected.Instruction))}
                        </ReactMarkdown>
                      </div>
                    )}
                  {typeof selected.Skill === 'string' && (
                    <div className="mb-4 text-black whitespace-pre-line">
                      <h1 className="font-bold">Tyrant Skills:</h1>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        skipHtml={false}
                        components={{
                          img: ({src, alt}) => safeImage(src, alt)
                        }}
                      >
                        {preprocessAll(getString(selected.Skill))}
                      </ReactMarkdown>
                    </div>
                  )}
                  {typeof selected.Die === 'string' && (
                    <div className="mb-4 text-black">
                      <h1 className="font-bold">Tyrant Die:</h1>
                      {getString(selected.Die).split('\n').map((line, index) => {
                        const match = line.match(/^\[icon:([a-zA-Z0-9_-]+)\]\s?(.*)$/);
                        if (match) {
                          const iconName = match[1];
                          const content = match[2];
                          return (
                            <div key={index} className="flex items-start gap-2 mb-4">
                              {safeImage(`/images/${iconName}.png`, iconName)}
                              <div className="flex flex-col gap-1 text-sm">
                                {content.split('\n').map((subLine, subIdx) => (
                                  <ReactMarkdown
                                    key={subIdx}
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                    skipHtml={false}
                                    components={{
                                      strong: ({children}) => <strong className="font-bold text-black">{children}</strong>,
                                      em: ({children}) => <em className="italic text-gray-600">{children}</em>,
                                      img: ({src, alt}) => (
                                        <span style={{ display: 'inline-block', verticalAlign: '-1px' }}>
                                          {safeImage(src, alt)}
                                        </span>
                                      ),
                                    }}
                                  >
                                    {preprocessAll(subLine)}
                                  </ReactMarkdown>
                                ))}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div key={index} className="text-sm whitespace-pre-line ml-8 mb-1">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                skipHtml={false}
                              >
                                {preprocessAll(line)}
                              </ReactMarkdown>
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}

                  {typeof selected.Flavor === 'string' && (
                    <div className="text-gray-700 whitespace-pre-line">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        skipHtml={false}
                        components={{
                          em: ({children}) => <em className="italic text-gray-600">{children}</em>,
                          span: (props) => <span style={props.style as React.CSSProperties}>{props.children}</span>,
                        }}
                      >
                        {preprocessAll(getString(selected.Flavor))}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {/* --- Absolute-reward + badge, always on bottom --- */}
                {typeof selected["Complete Reward"] === "string" && selected["Complete Reward"] && (() => {
                  const { left, right } = splitCompleteReward(getString(selected["Complete Reward"]));
                  return (
                    <>
                      {left.length > 0 && (
                        <div className="absolute left-4 bottom-4 flex gap-2">
                          {left.map((item, idx) => (
                            <span key={idx} className="flex items-center">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                skipHtml={false}
                                components={{
                                  img: ({src, alt}) => safeImage(src, alt),
                                  span: (props) => <span style={props.style as React.CSSProperties}>{props.children}</span>
                                }}
                              >
                                {preprocessAll(item.trim())}
                              </ReactMarkdown>
                            </span>
                          ))}
                        </div>
                      )}
                      {right.length > 0 && (
                        <div className="absolute right-4 bottom-4 flex gap-2">
                          {right.map((item, idx) => (
                            <span key={idx} className="flex items-center">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                skipHtml={false}
                                components={{
                                  img: ({src, alt}) => safeImage(src, alt),
                                  span: (props) => <span style={props.style as React.CSSProperties}>{props.children}</span>
                                }}
                              >
                                {preprocessAll(item.trim())}
                              </ReactMarkdown>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}

                {typeof selected["number of uses"] === "string" && selected["number of uses"] && (
                  <div
                    className="absolute bottom-4 right-6 px-3 py-1 rounded-full bg-yellow-300 text-gray-900 font-bold shadow-lg text-xs"
                    style={{ pointerEvents: "none" }}
                  >
                    {getString(selected["number of uses"]) === "0"
                      ? "ถาวร"
                      : `ใช้ได้ ${getString(selected["number of uses"])} ครั้ง`
                    }
                </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
        {/* ----------- END MODAL ----------- */}
      </main>

      {/* Bottom navigation (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 flex md:hidden justify-around bg-gray-900 border-t border-gray-700 z-20">
        {navTabs.map(tab => (
          <button
            key={tab.key}
            className={`flex flex-col items-center px-3 pt-1 pb-2 flex-1 ${currentTab === tab.key ? "text-blue-400" : "text-gray-200"}`}
            onClick={() => setCurrentTab(tab.key)}
          >
            <tab.icon className="w-6 h-6 mb-0.5" />
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
