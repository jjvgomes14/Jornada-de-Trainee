import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/style.css'

const savedTheme = localStorage.getItem("uiTheme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
document.body.setAttribute("data-bs-theme", savedTheme);


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
