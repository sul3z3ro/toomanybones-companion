// next.config.mjs
import nextPwa from 'next-pwa';

const withPWA = nextPwa({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false
});

export default withPWA({
  // ตั้งค่า next.js อื่นๆ ตรงนี้
});
