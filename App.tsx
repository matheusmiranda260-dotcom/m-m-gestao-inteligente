
import React, { useState } from 'react';
import { Login } from './Login';
import { ProjectSelection } from './ProjectSelection';
import { GestaoInteligente } from './GestaoInteligente';
import { MarineHomeClear } from './MarineHomeClear';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentProject, setCurrentProject] = useState<'GESTO' | 'MARINE' | null>(null);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  if (!currentProject) {
    return <ProjectSelection onSelect={(project) => setCurrentProject(project)} />;
  }

  if (currentProject === 'GESTO') {
    return <GestaoInteligente onBack={() => setCurrentProject(null)} />;
  }

  if (currentProject === 'MARINE') {
    return <MarineHomeClear onBack={() => setCurrentProject(null)} />;
  }

  return null;
};

export default App;
