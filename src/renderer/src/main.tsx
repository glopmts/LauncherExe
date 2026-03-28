import React from 'react'
import './assets/main.css'

import ReactDOM from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import App from './app'

import ConfigPage from './pages/config/config-page'
import Home from './pages/home/home-page'
import NotFound from './pages/not-found/not-found'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<App />}>
          {/* All / default view */}
          <Route path="/" element={<Home />} />
          {/* Filtered views — same Home component receives category via URL */}
          <Route path="/pinned" element={<Home />} />
          <Route path="/recent" element={<Home />} />
          <Route path="/games" element={<Home />} />
          <Route path="/apps" element={<Home />} />
          <Route path="/tools" element={<Home />} />
          <Route path="/other" element={<Home />} />
          {/* Settings */}
          <Route path="/config" element={<ConfigPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
)
