import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { purple } from '@mui/material/colors';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import SelectionTranslator from './SelectionTranslator';

const ThemedSelectionTranslator = () => {
  const { isDarkMode, themeMode } = useTheme();

  const getPrimaryColor = () => {
    switch (themeMode) {
      case 'purple':
        return purple[500]; // 使用Material UI的紫色
      case 'dark':
        return '#1976d2'; // 深色模式下的蓝色
      default:
        return '#1976d2'; // 默认蓝色
    }
  };

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: getPrimaryColor(),
      },
      ...(themeMode === 'purple' && {
        background: {
          default: isDarkMode ? '#2d1f3d' : '#f5f0fa',
          paper: isDarkMode ? '#382952' : '#ffffff',
        },
        text: {
          primary: isDarkMode ? '#e1d9eb' : '#382952',
          secondary: isDarkMode ? '#b8a6d9' : '#6a4d93',
        },
      }),
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SelectionTranslator />
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CustomThemeProvider>
      <ThemedSelectionTranslator />
    </CustomThemeProvider>
  </React.StrictMode>
); 