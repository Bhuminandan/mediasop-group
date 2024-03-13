import './App.css'
import { Route, Routes } from 'react-router-dom'
import Home from './Home/Home.jsx'
import Dashboard from './Dashboard.jsx'

function App() {

  return (
    <Routes>
      <Route path='/' element={<Dashboard />} />
      <Route path="/join-video/:id" element={<Home />} />
    </Routes>
  )
}

export default App
