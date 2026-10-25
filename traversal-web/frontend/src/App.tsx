import { Route, Routes } from 'react-router'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import TutorialPage from './pages/TutorialPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game/:id" element={<GamePage />} />
      <Route path="/tutoriel" element={<TutorialPage />} />
      <Route path="/tutoriel/:lesson" element={<TutorialPage />} />
    </Routes>
  )
}
