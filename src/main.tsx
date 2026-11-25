import React from 'react';
import ReactDOM from 'react-dom/client';
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
