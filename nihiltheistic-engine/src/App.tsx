import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AxiomsPage from './pages/AxiomsPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import TrainingCorpusPage from './pages/TrainingCorpusPage'
import KnowledgeGraphPage from './pages/KnowledgeGraphPage'
import PhilosophyNotebookPage from './pages/PhilosophyNotebookPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-gray-100">
        {/* Navigation */}
        <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center space-x-8">
                <Link to="/" className="text-2xl font-bold text-white hover:text-gray-300 transition-colors">
                  NIHILTHEISTIC PHILOSOPHER-ENGINE
                </Link>
                <div className="flex space-x-4">
                  <Link 
                    to="/" 
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Process
                  </Link>
                  <Link 
                    to="/axioms" 
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Axioms
                  </Link>
                  <Link 
                    to="/knowledge-base" 
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Knowledge Base
                  </Link>
                  <Link 
                    to="/training-corpus" 
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Training Corpus
                  </Link>
                  <Link 
                    to="/knowledge-graph" 
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Knowledge Graph
                  </Link>
                  <Link 
                    to="/philosophy-notebook" 
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors border border-purple-500/50 rounded"
                  >
                    Philosophy Notebook
                  </Link>
                </div>
              </div>
              <div className="text-xs text-gray-500 font-mono">
                ENPAS v2.0 + PIS
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/axioms" element={<AxiomsPage />} />
          <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="/training-corpus" element={<TrainingCorpusPage />} />
          <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
          <Route path="/philosophy-notebook" element={<PhilosophyNotebookPage />} />
        </Routes>

        {/* Footer */}
        <footer className="border-t border-gray-800 mt-20">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              Enhanced Nihiltheistic Philosophical AI System | Professor Nihil, Sage of the Abyss
            </p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
