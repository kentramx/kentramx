/**
 * Hook para detectar modo oscuro del sistema
 * KENTRA MAP STACK - OFICIAL
 */

import { useState, useEffect } from 'react';

export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    
    // Primero revisar si hay clase 'dark' en el HTML (Tailwind)
    if (document.documentElement.classList.contains('dark')) {
      return true;
    }
    
    // Fallback a preferencia del sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  useEffect(() => {
    // Observer para cambios en la clase del documento (Tailwind dark mode)
    const htmlElement = document.documentElement;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setIsDark(htmlElement.classList.contains('dark'));
        }
      });
    });
    
    observer.observe(htmlElement, { attributes: true });
    
    // También escuchar cambios en preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Solo actualizar si no hay clase dark explícita
      if (!htmlElement.classList.contains('dark') && !htmlElement.classList.contains('light')) {
        setIsDark(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  return isDark;
}
