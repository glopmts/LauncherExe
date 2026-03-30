import React from 'react'
import './assets/main.css'

import ReactDOM from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import App from './app'

import ConfigPage from './pages/config/config-page'
import Details from './pages/details/[id]'
import Home from './pages/home/home-page'
import LogsPage from './pages/logs/logs-page'
import NotFound from './pages/not-found/not-found'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<App />}>
          {/* All / default view */}
          <Route path="/" element={<Home />} />
          <Route path="/pinned" element={<Home />} />
          <Route path="/recent" element={<Home />} />
          <Route path="/games" element={<Home />} />
          <Route path="/apps" element={<Home />} />
          <Route path="/tools" element={<Home />} />
          <Route path="/other" element={<Home />} />
          <Route path="/details/:id" element={<Details />} />
          <Route path="/logs" element={<LogsPage />} />
          {/* Settings */}
          <Route path="/config" element={<ConfigPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
)
