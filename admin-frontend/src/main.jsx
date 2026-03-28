import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css' // DÒNG NÀY CỰC KỲ QUAN TRỌNG! NẾU THIẾU THÌ THÊM VÀO NGAY NHÉ.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)