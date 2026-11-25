import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/noto-sans-khmer/400.css';
import '@fontsource/noto-sans-khmer/500.css';
import '@fontsource/noto-sans-khmer/600.css';
import '@fontsource/noto-sans-khmer/700.css';
import '@fontsource/kantumruy-pro/600.css';
import '@fontsource/kantumruy-pro/700.css';
import { migrateLegacyStorage } from './lib/storageMigration';
import { BRAND_PAGE_TITLE } from './lib/brand';
import App from './App';
import './index.css';

migrateLegacyStorage();
if (typeof document !== 'undefined') {
  document.title = BRAND_PAGE_TITLE;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
