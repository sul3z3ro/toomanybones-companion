// pages/tmb.tsx
import { useEffect, useState, Fragment, MouseEvent } from 'react';
import yaml from 'js-yaml';
import { useRouter } from 'next/router';
import { Dialog, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, UserCircleIcon, Squares2X2Icon, UserGroupIcon, GiftIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "framer-motion";

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

export default function TMB() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('encounter');
  const [visibleMenus, setVisibleMenus] = useState<MenuGroup[]>([]);
  const [fadeIn, setFadeIn] = useState(false);

  const router = useRouter();
  const activeMenu = "unbreakable"; // เปลี่ยนเป็น "undertow" หรือ "unbreakable" ในไฟล์แต่ละอัน

  // Fade-in effect
  useEffect(() => {
    setFadeIn(false);
    const timer = setTimeout(() => setFadeIn(true), 40);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const email = typeof window !== 'undefined' ? sessionStorage.getItem('tmbc_user') : null;
    if (!email) {
      setVisibleMenus([]);
      return;
    }
    fetch('/api/get-access-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((res) => res.json())
      .then((data) => setVisibleMenus(data.menus || []));
  }, []);

  useEffect(() => {
    let file = '';
    if (currentTab === 'encounter') file = 'tmbub-encounters.yaml';
    else if (currentTab === 'solo') file = 'tmbub-encounters-solo.yaml';
    else if (currentTab === 'tyrants') file = 'tmbub-tyrants.yaml';
    else if (currentTab === 'loots') file = 'tmbub-loots.yaml';
    else file = 'tmbub-encounters.yaml';
    fetch(`/data/Unbreakable/${file}`) // เปลี่ยน /Core/ เป็น /Undertow/ หรือ /Unbreakable/ ในแต่ละไฟล์
      .then(res => res.text())
      .then(text => setData(yaml.load(text) as Record<string, unknown>[]));
  }, [currentTab]);

  // ใช้ router.push ในการ redirect
  const handleRedirect = (href: string) => {
    router.push(href);
  };

  // ปิด modal ด้วยการคลิก bg
  const handleModalOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setSelected(null);
  };

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
          {[
            { code: "base", label: "Too Many Bones", href: "/tmb" },
            { code: "undertow", label: "Too Many Bones: Undertow", href: "/tmbut" },
            { code: "unbreakable", label: "Too Many Bones: Unbreakable", href: "/tmbub" },
          ].map(menu => (
            <button
              key={menu.code}
              className={
                "text-left px-3 py-2 rounded mb-2 w-full " +
                (activeMenu === menu.code
                  ? "bg-blue-600 text-white font-bold shadow"
                  : "bg-gray-800 text-white hover:bg-blue-700")
              }
              onClick={() => handleRedirect(menu.href)}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ y: 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30, duration: 0.35 }}
            className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 bg-black"
          >
            {data.map(card => (
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
              <motion.div
                key="modal-content"
                initial={{ opacity: 0, scale: 0.92, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 340, damping: 24 } }}
                exit={{ opacity: 0, scale: 0.97, x: 240, transition: { duration: 0.29, ease: [0.61, 1, 0.88, 1] } }}
                className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative"
                style={{ cursor: "auto" }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  className="absolute top-2 right-3 text-black text-xl"
                  onClick={() => setSelected(null)}
                >×</button>
                {/* Title */}
                <div className="text-lg font-bold mb-2">{getString(selected.name) || getString(selected.id)}</div>
                {/* Description */}
                {typeof selected.Description === 'string' && (
                  <div className="mb-4 text-black whitespace-pre-line">
                    <ReactMarkdown>{getString(selected.Description)}</ReactMarkdown>
                  </div>
                )}
                {/* Encounter Choices (01-Encounter) */}
                {[1, 2, 3].map((n) =>
                  typeof selected[`Choice${n} Header`] === 'string' && getString(selected[`Choice${n} Header`]) ? (
                    <div className="mb-2" key={n}>
                      <div className="font-bold">{getString(selected[`Choice${n} Header`])}</div>
                      <div className="whitespace-pre-line text-sm">
                        <ReactMarkdown>
                          {getString(selected[`Choice${n} Description`]) || ''}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : null
                )}
                {/* Tyrant Special Fields */}
                {typeof selected["Required Monster"] === 'string' && (
                  <div className="mb-2">
                    <span className="font-bold">ประเภทของวายร้ายที่ใช้: </span>
                    <span className="whitespace-pre-line">{getString(selected["Required Monster"])}</span>
                  </div>
                )}
                {typeof selected.Time === 'string' && (
                  <div className="mb-8">
                    <span className="font-bold">ระยะเวลาที่ใช้: </span>
                    <span className="whitespace-pre-line">{getString(selected.Time)}</span>
                  </div>
                )}
                {typeof selected.Instruction === 'string' && (
                  <div className="mb-4 text-black whitespace-pre-line">
                    <ReactMarkdown>{getString(selected.Instruction)}</ReactMarkdown>
                  </div>
                )}
                {typeof selected.Skill === 'string' && (
                  <div className="mb-4 text-black whitespace-pre-line">
                    <h1 className="font-bold">Skill:</h1>
                    <ReactMarkdown>{getString(selected.Skill)}</ReactMarkdown>
                  </div>
                )}
                {typeof selected.Die === 'string' && (
                  <div className="mb-4 text-black whitespace-pre-line">
                    <h1 className="font-bold">Tyrant&apos;s Die:</h1>
                    <ReactMarkdown>{getString(selected.Die)}</ReactMarkdown>
                  </div>
                )}
                {typeof selected.Flavor === 'string' && (
                  <div className="text-gray-700 whitespace-pre-line">
                    <ReactMarkdown>{getString(selected.Flavor)}</ReactMarkdown>
                  </div>
                )}
                {typeof selected["number of uses"] === "string" && selected["number of uses"] && (
                  <div
                    className="absolute bottom-4 right-6 px-3 py-1 rounded-full bg-yellow-300 text-gray-900 font-bold shadow-lg text-xs"
                    style={{ pointerEvents: "none" }}
                  >
                    ใช้ได้ {getString(selected["number of uses"])} ครั้ง
                  </div>
                )}
              </motion.div>
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
