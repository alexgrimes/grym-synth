import React, { useState } from 'react';
import { InterfaceMode } from './ModeSwitcher';
import './MinimizedHeader.css';

interface SessionInfo {
  id: string;
  startTime: Date;
  parameters: Record<string, any>;
  memory: {
    used: number;
    total: number;
  };
}

interface Project {
  id: string;
  name: string;
  lastModified: Date;
}

interface MinimizedHeaderProps {
  sessionInfo: SessionInfo;
  mode: InterfaceMode;
  onProjectSelect: (projectId: string) => void;
}

export const MinimizedHeader: React.FC<MinimizedHeaderProps> = ({
  sessionInfo,
  mode,
  onProjectSelect
}) => {
  const [projects] = useState<Project[]>([
    { id: 'p1', name: 'Project 1', lastModified: new Date() },
    { id: 'p2', name: 'Project 2', lastModified: new Date() },
    { id: 'p3', name: 'Project 3', lastModified: new Date() }
  ]);

  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(projects[0]);

  const formatMemory = (bytes: number) => {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatSessionTime = (startTime: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    return diffHours > 0
      ? `${diffHours}h ${mins}m`
      : `${mins}m`;
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setIsProjectMenuOpen(false);
    onProjectSelect(project.id);
  };

  return (
    <header className="minimized-header">
      <div className="header-left">
        <div className="project-selector">
          <button
            className="project-button"
            onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
          >
            {selectedProject.name} <span className="dropdown-arrow">▼</span>
          </button>

          {isProjectMenuOpen && (
            <div className="project-dropdown">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="project-item"
                  onClick={() => handleProjectSelect(project)}
                >
                  {project.name}
                </div>
              ))}
              <div className="project-item new-project">
                + New Project
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="header-center">
        <span className="session-id">Session: {sessionInfo.id}</span>
      </div>

      <div className="header-right">
        <div className="session-info">
          <span className="session-time">
            {formatSessionTime(sessionInfo.startTime)}
          </span>
          <span className="memory-usage">
            Memory: {formatMemory(sessionInfo.memory.used)}/{formatMemory(sessionInfo.memory.total)}
          </span>
          <span className="parameter-count">
            Parameters: {Object.keys(sessionInfo.parameters).length}
          </span>
          <span className={`mode-indicator ${mode.toLowerCase()}`}>
            Mode: {mode}
          </span>
        </div>
      </div>
    </header>
  );
};
