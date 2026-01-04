
import React, { useState } from 'react';
import { Login } from './Login';
import { ProjectSelection } from './ProjectSelection';
import { GestaoInteligente } from './GestaoInteligente';
import { MarineHomeClear } from './MarineHomeClear';

const App: React.FC = () => {
  const [loggedUser, setLoggedUser] = useState<string | null>(() => localStorage.getItem('mm_user'));
  const [currentProject, setCurrentProject] = useState<'GESTO' | 'MARINE' | null>(() => {
    const saved = localStorage.getItem('mm_project');
    return (saved === 'GESTO' || saved === 'MARINE') ? saved : null;
  });

  const handleLogin = (user: string) => {
    setLoggedUser(user);
    localStorage.setItem('mm_user', user);
    if (user === 'mariane') {
      setCurrentProject('MARINE');
      localStorage.setItem('mm_project', 'MARINE');
    }
  };

  const handleSelectProject = (project: 'GESTO' | 'MARINE' | null) => {
    setCurrentProject(project);
    if (project) localStorage.setItem('mm_project', project);
    else localStorage.removeItem('mm_project');
  };

  const handleLogout = () => {
    setLoggedUser(null);
    setCurrentProject(null);
    localStorage.removeItem('mm_user');
    localStorage.removeItem('mm_project');
  };

  if (!loggedUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (!currentProject) {
    return <ProjectSelection onSelect={handleSelectProject} />;
  }

  if (currentProject === 'GESTO') {
    return <GestaoInteligente onBack={() => handleSelectProject(null)} />;
  }

  if (currentProject === 'MARINE') {
    return <MarineHomeClear onBack={loggedUser === 'mariane' ? handleLogout : () => handleSelectProject(null)} />;
  }

  return null;
};

export default App;
