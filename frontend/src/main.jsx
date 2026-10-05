import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Chrome puts the page <title> in the print header (top-right of every page).
// Blank it for the duration of the print so the invoice shows no browser text,
// then restore it so the browser tab keeps its name.
let titleBeforePrint = ''
window.addEventListener('beforeprint', () => {
  titleBeforePrint = document.title
  document.title = ''
})
window.addEventListener('afterprint', () => {
  if (titleBeforePrint) document.title = titleBeforePrint
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
