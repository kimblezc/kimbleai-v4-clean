'use client';

import { useState, useEffect } from 'react';

interface ProjectView {
  project: string;
  conversations: Array<{
    id: string;
    title: string;
    messages: number;
    lastUpdated: string;
    tags: string[];
  }>;
  totalMessages: number;
  activeTags: string[];
}

export default function ProjectSidebar({ 
  conversations, 
  currentUser,
  onConversationSelect,
  onNewConversation 
}: any) {
  const [projectViews, setProjectViews] = useState<ProjectView[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('All Projects');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['All Projects']));

  useEffect(() => {
    // Group conversations by project
    const projectMap = new Map<string, ProjectView>();
    
    // Add "All Projects" view
    projectMap.set('All Projects', {
      project: 'All Projects',
      conversations: [],
      totalMessages: 0,
      activeTags: []
    });

    // Group conversations
    conversations
      .filter((c: any) => c.userId === currentUser)
      .forEach((conv: any) => {
        const projectName = conv.project || 'Uncategorized';
        
        if (!projectMap.has(projectName)) {
          projectMap.set(projectName, {
            project: projectName,
            conversations: [],
            totalMessages: 0,
            activeTags: []
          });
        }
        
        const project = projectMap.get(projectName)!;
        project.conversations.push({
          id: conv.id,
          title: conv.title,
          messages: conv.messages?.length || 0,
          lastUpdated: conv.updatedAt,
          tags: conv.tags || []
        });
        
        project.totalMessages += conv.messages?.length || 0;
        
        // Collect unique tags
        conv.tags?.forEach((tag: string) => {
          if (!project.activeTags.includes(tag)) {
            project.activeTags.push(tag);
          }
        });
        
        // Also add to "All Projects"
        const allProjects = projectMap.get('All Projects')!;
        allProjects.conversations.push({
          id: conv.id,
          title: conv.title,
          messages: conv.messages?.length || 0,
          lastUpdated: conv.updatedAt,
          tags: conv.tags || []
        });
        allProjects.totalMessages += conv.messages?.length || 0;
    });
    
    // Sort conversations within each project by last updated
    projectMap.forEach(project => {
      project.conversations.sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
    });
    
    setProjectViews(Array.from(projectMap.values()));
  }, [conversations, currentUser]);

  const toggleProject = (projectName: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectName)) {
      newExpanded.delete(projectName);
    } else {
      newExpanded.add(projectName);
    }
    setExpandedProjects(newExpanded);
  };

  return (
    <div style={{
      width: '320px',
      backgroundColor: '#202123',
      borderRight: '1px solid #2d2d30',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #2d2d30'
      }}>
        <button
          onClick={onNewConversation}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#10a37f',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '18px' }}>+</span>
          New Conversation
        </button>
      </div>

      {/* Project List */}
      <div style={{
        flex: 1,
        overflowY: 'auto'
      }}>
        {projectViews.map(project => (
          <div key={project.project} style={{ marginBottom: '4px' }}>
            {/* Project Header */}
            <div
              onClick={() => toggleProject(project.project)}
              style={{
                padding: '12px 16px',
                backgroundColor: selectedProject === project.project ? '#343541' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderLeft: selectedProject === project.project ? '3px solid #10a37f' : '3px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (selectedProject !== project.project) {
                  e.currentTarget.style.backgroundColor = '#2c2c2c';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedProject !== project.project) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  color: '#8e8ea0',
                  fontSize: '12px',
                  transform: expandedProjects.has(project.project) ? 'rotate(90deg)' : 'rotate(0)',
                  transition: 'transform 0.2s'
                }}>
                  ▶
                </span>
                <span style={{
                  color: '#ececf1',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {project.project === 'All Projects' ? '📊 ' : '📁 '}
                  {project.project}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  backgroundColor: '#444654',
                  color: '#c5c5d2',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px'
                }}>
                  {project.conversations.length}
                </span>
              </div>
            </div>

            {/* Conversations List */}
            {expandedProjects.has(project.project) && (
              <div style={{ paddingLeft: '24px' }}>
                {/* Tags Summary */}
                {project.activeTags.length > 0 && (
                  <div style={{
                    padding: '8px 16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px'
                  }}>
                    {project.activeTags.slice(0, 5).map(tag => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '10px',
                          backgroundColor: '#2d2d30',
                          color: '#8e8ea0',
                          padding: '2px 6px',
                          borderRadius: '3px'
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                    {project.activeTags.length > 5 && (
                      <span style={{
                        fontSize: '10px',
                        color: '#8e8ea0'
                      }}>
                        +{project.activeTags.length - 5} more
                      </span>
                    )}
                  </div>
                )}

                {/* Conversations */}
                {project.conversations.slice(0, 10).map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => onConversationSelect(conv.id)}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      borderLeft: '2px solid transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2c2c2c';
                      e.currentTarget.style.borderLeftColor = '#10a37f';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderLeftColor = 'transparent';
                    }}
                  >
                    <div style={{
                      color: '#ececf1',
                      fontSize: '13px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {conv.title}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      color: '#8e8ea0'
                    }}>
                      <span>{conv.messages} messages</span>
                      <span>•</span>
                      <span>{new Date(conv.lastUpdated).toLocaleDateString()}</span>
                    </div>
                    {conv.tags.length > 0 && (
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap'
                      }}>
                        {conv.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '10px',
                              backgroundColor: '#2d2d30',
                              color: '#8e8ea0',
                              padding: '1px 4px',
                              borderRadius: '2px'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {project.conversations.length > 10 && (
                  <div style={{
                    padding: '8px 16px',
                    color: '#8e8ea0',
                    fontSize: '12px',
                    fontStyle: 'italic'
                  }}>
                    +{project.conversations.length - 10} more conversations
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Statistics */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #2d2d30',
        backgroundColor: '#2c2c2c'
      }}>
        <div style={{
          fontSize: '11px',
          color: '#8e8ea0',
          marginBottom: '8px'
        }}>
          STATISTICS
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          <div>
            <div style={{ fontSize: '18px', color: '#10a37f', fontWeight: 'bold' }}>
              {projectViews.reduce((sum, p) => sum + p.conversations.length, 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#8e8ea0' }}>Total Chats</div>
          </div>
          <div>
            <div style={{ fontSize: '18px', color: '#3b82f6', fontWeight: 'bold' }}>
              {projectViews.filter(p => p.project !== 'All Projects' && p.project !== 'Uncategorized').length}
            </div>
            <div style={{ fontSize: '11px', color: '#8e8ea0' }}>Projects</div>
          </div>
        </div>
      </div>
    </div>
  );
}