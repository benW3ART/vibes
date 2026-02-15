// ActiveContext - Shows active skills and MCPs at the top of the chat panel
import { useWorkflowStore } from '@/stores';
import './ActiveContext.css';

interface MCPServer {
  id: string;
  name: string;
  status: string;
}

export function ActiveContext() {
  const { activeSkills } = useWorkflowStore();

  // For now, we don't have a global MCP store, so we'll use an empty array
  // This can be connected to an MCP store later
  const connectedServers: MCPServer[] = [];

  // Don't render if nothing to show
  if (activeSkills.length === 0 && connectedServers.length === 0) {
    return null;
  }

  return (
    <div className="active-context">
      {activeSkills.length > 0 && (
        <div className="active-skills">
          <span className="context-label">Skills:</span>
          {activeSkills.map(skill => (
            <span key={skill} className="skill-badge">{skill}</span>
          ))}
        </div>
      )}
      {connectedServers.length > 0 && (
        <div className="active-mcps">
          <span className="context-label">MCPs:</span>
          {connectedServers.map(mcp => (
            <span key={mcp.id} className="mcp-badge">{mcp.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}
