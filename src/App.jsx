import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import BoulderDesigner from './pages/BoulderDesigner';
import Analytics from './pages/Analytics';
import WallPreview from './pages/WallPreview';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full-viewport, no chrome */}
        <Route path="/wall" element={<WallPreview />} />

        {/* All other routes wrapped in the sidebar layout */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/designer" element={<BoulderDesigner />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}
