/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InputPage from './pages/Input';
import DiagnosisList from './pages/DiagnosisList';
import DiagnosisForm from './pages/DiagnosisForm';
import Targets from './pages/Targets';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/input" element={<InputPage />} />
          <Route path="/diagnosis" element={<DiagnosisList />} />
          <Route path="/diagnosis/:id" element={<DiagnosisForm />} />
          <Route path="/targets" element={<Targets />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
