import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app.css'

import ImageConverter from './ImageConverter.jsx'

import {
  BrowserRouter, Routes, Route
} from "react-router";

window.location.href = "https://apps.zoarvalleysoftware.com/"; // redirect to new site.

const BASE = process.env.NODE_ENV === 'production' ? '/image-optimizer' : '/';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <main id="main-content">
      <BrowserRouter basename={ BASE }>
        <Routes>
          <Route path="/" element={<ImageConverter/>} />
        </Routes>
      </BrowserRouter>
    </main>
    <footer className="footer py-12 text-gray-400">
      <p className="mb-4">View on <a href="https://github.com/timbatt/image-optimizer" target="_blank">Github</a></p>
      <p>DISCLAIMER: We are not responsible for any potential data loss or data corruption that may result from the use of this tool.</p>
    </footer>
  </StrictMode>
)
