import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeType = 'light' | 'dark' | 'purple';

interface ThemeContextType {
  themeMode: ThemeType;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  isDarkMode: false,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeType>(() => {
    // 从 localStorage 读取主题设置，默认为 light
    const savedTheme = localStorage.getItem('themeMode');
    return (savedTheme as ThemeType) || 'light';
  });

  const isDarkMode = themeMode === 'dark' || themeMode === 'purple';

  useEffect(() => {
    // 保存主题设置到 localStorage
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'purple';
      return 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ themeMode, isDarkMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}; 