import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import SelectionTranslator from './SelectionTranslator';

const Router: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/selection" element={<SelectionTranslator />} />
      </Routes>
    </HashRouter>
  );
};

export default Router; 