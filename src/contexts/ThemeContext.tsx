import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 从 localStorage 读取主题设置，默认为 false（亮色模式）
    const savedTheme = localStorage.getItem('isDarkMode');
    return savedTheme ? JSON.parse(savedTheme) : false;
  });

  useEffect(() => {
    // 保存主题设置到 localStorage
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev: boolean) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}; 