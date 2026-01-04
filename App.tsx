
import React, { useState } from 'react';
import { Login } from './Login';
import { ProjectSelection } from './ProjectSelection';
import { GestaoInteligente } from './GestaoInteligente';
import { MarineHomeClear } from './MarineHomeClear';

const App: React.FC = () => {
  const [loggedUser, setLoggedUser] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<'GESTO' | 'MARINE' | null>(null);

  const handleLogin = (user: string) => {
    setLoggedUser(user);
    if (user === 'mariane') {
      setCurrentProject('MARINE');
    }
  };

  const handleLogout = () => {
    setLoggedUser(null);
    setCurrentProject(null);
  };

  if (!loggedUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (!currentProject) {
    return <ProjectSelection onSelect={(project) => setCurrentProject(project)} />;
  }

  if (currentProject === 'GESTO') {
    return <GestaoInteligente onBack={() => setCurrentProject(null)} />;
  }

  if (currentProject === 'MARINE') {
    return <MarineHomeClear onBack={loggedUser === 'mariane' ? handleLogout : () => setCurrentProject(null)} />;
  }

  return null;
};

export default App;
