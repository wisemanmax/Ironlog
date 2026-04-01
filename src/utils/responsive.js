import { useState, useEffect } from 'react';

const getLayout = (w) => ({
  isMobile: w < 768,
  isTablet: w >= 768 && w < 1200,
  isDesktop: w >= 1200,
  width: w,
});

export function useLayout() {
  const [layout, setLayout] = useState(() => getLayout(window.innerWidth));
  useEffect(() => {
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setLayout(getLayout(window.innerWidth)), 100);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, []);
  return layout;
}
