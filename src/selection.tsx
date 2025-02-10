import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import SelectionTranslator from './SelectionTranslator';

const ThemedSelectionTranslator = () => {
  const { isDarkMode } = useTheme();

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
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