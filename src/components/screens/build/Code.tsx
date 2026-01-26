import { useState, useEffect, useCallback } from 'react';
import { SectionTitle, EmptyState, Button, Badge } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { useProjectStore, toast } from '@/stores';
import { logger } from '@/utils/logger';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  children?: FileNode[];
  isExpanded?: boolean;
}

export function Code() {
  const { currentProject } = useProjectStore();
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Load file tree from project directory
  const loadFileTree = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    if (!window.electron) return [];

    try {
      const result = await window.electron.file.list(dirPath);
      if (!result.success || !result.files) return [];

      // Filter out hidden files and common ignored directories
      const ignoredPatterns = [
        /^\./, // Hidden files
        /^node_modules$/,
        /^dist$/,
        /^build$/,
        /^\.git$/,
        /^\.next$/,
        /^\.vite$/,
        /^__pycache__$/,
        /^\.DS_Store$/,
      ];

      const filteredFiles = result.files.filter(
        f => !ignoredPatterns.some(pattern => pattern.test(f.name))
      );

      // Sort: directories first, then files, alphabetically
      const sorted = filteredFiles.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return sorted.map(f => ({
        name: f.name,
        path: f.path,
        isDirectory: f.isDirectory,
        isFile: f.isFile,
      }));
    } catch (err) {
      logger.error('[Code] Failed to load file tree:', err);
      return [];
    }
  }, []);

  // Load initial file tree
  useEffect(() => {
    const loadInitialTree = async () => {
      if (!currentProject?.path) {
        setFileTree([]);
        return;
      }

      setIsLoadingTree(true);
      const tree = await loadFileTree(currentProject.path);
      setFileTree(tree);
      setIsLoadingTree(false);
    };

    loadInitialTree();
    setSelectedFile(null);
    setFileContent('');
    setExpandedDirs(new Set());
  }, [currentProject?.path, loadFileTree]);

  // Toggle directory expansion
  const toggleDirectory = async (node: FileNode) => {
    const newExpanded = new Set(expandedDirs);

    if (newExpanded.has(node.path)) {
      newExpanded.delete(node.path);
      // Remove children from tree
      setFileTree(prev =>
        updateNodeChildren(prev, node.path, undefined)
      );
    } else {
      newExpanded.add(node.path);
      // Load children
      const children = await loadFileTree(node.path);
      setFileTree(prev =>
        updateNodeChildren(prev, node.path, children)
      );
    }

    setExpandedDirs(newExpanded);
  };

  // Update children of a node in the tree
  const updateNodeChildren = (
    nodes: FileNode[],
    targetPath: string,
    children: FileNode[] | undefined
  ): FileNode[] => {
    return nodes.map(node => {
      if (node.path === targetPath) {
        return { ...node, children, isExpanded: children !== undefined };
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeChildren(node.children, targetPath, children),
        };
      }
      return node;
    });
  };

  // Load file content
  const loadFile = async (filePath: string) => {
    if (!window.electron) {
      toast.error('File viewing requires Electron mode');
      return;
    }

    setIsLoadingFile(true);
    setSelectedFile(filePath);

    try {
      const content = await window.electron.file.read(filePath);
      setFileContent(content);
    } catch (err) {
      logger.error('[Code] Failed to load file:', err);
      toast.error('Failed to load file');
      setFileContent('// Error loading file');
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Get file extension for syntax highlighting hint
  const getFileExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ext;
  };

  // Get language label from extension
  const getLanguageLabel = (ext: string): string => {
    const langMap: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript React',
      js: 'JavaScript',
      jsx: 'JavaScript React',
      json: 'JSON',
      md: 'Markdown',
      css: 'CSS',
      scss: 'SCSS',
      html: 'HTML',
      py: 'Python',
      rs: 'Rust',
      go: 'Go',
      yaml: 'YAML',
      yml: 'YAML',
      toml: 'TOML',
      sh: 'Shell',
      bash: 'Bash',
    };
    return langMap[ext] || ext.toUpperCase();
  };

  // Render file tree recursively
  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.path}>
        <div
          className={`code-tree-item ${node.isDirectory ? 'folder' : 'file'} ${
            selectedFile === node.path ? 'selected' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.isDirectory) {
              toggleDirectory(node);
            } else {
              loadFile(node.path);
            }
          }}
        >
          <span className="code-tree-icon">
            {node.isDirectory ? (node.isExpanded ? '▼' : '▶') : '📄'}
          </span>
          <span className="code-tree-name">{node.name}</span>
        </div>
        {node.isExpanded && node.children && (
          <div className="code-tree-children">
            {renderFileTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  // Get file info for context panel
  const selectedFileName = selectedFile ? selectedFile.split('/').pop() || '' : '';
  const selectedFileExt = selectedFileName ? getFileExtension(selectedFileName) : '';
  const lineCount = fileContent ? fileContent.split('\n').length : 0;

  return (
    <div className="screen code">
      <QuickActions />

      <div className="code-content">
        <div className="code-sidebar">
          <div className="code-sidebar-header">
            <SectionTitle>Files</SectionTitle>
            {currentProject && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setExpandedDirs(new Set());
                  loadFileTree(currentProject.path).then(setFileTree);
                }}
              >
                Refresh
              </Button>
            )}
          </div>

          <div className="code-file-tree">
            {!currentProject ? (
              <div className="code-tree-empty">Select a project to browse files</div>
            ) : isLoadingTree ? (
              <div className="code-tree-loading">Loading...</div>
            ) : fileTree.length === 0 ? (
              <div className="code-tree-empty">No files found</div>
            ) : (
              renderFileTree(fileTree)
            )}
          </div>
        </div>

        <div className="code-main">
          {!selectedFile ? (
            <EmptyState
              icon="code"
              title="Select a file"
              description="Choose a file from the sidebar to view its contents"
            />
          ) : isLoadingFile ? (
            <div className="code-loading">Loading file...</div>
          ) : (
            <div className="code-viewer">
              <div className="code-viewer-header">
                <span className="code-viewer-path">{selectedFile}</span>
                <Badge variant="info">{getLanguageLabel(selectedFileExt)}</Badge>
              </div>
              <pre className="code-viewer-content">
                <code>
                  {fileContent.split('\n').map((line, i) => (
                    <div key={i} className="code-line">
                      <span className="code-line-number">{i + 1}</span>
                      <span className="code-line-content">{line || ' '}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          )}
        </div>

        <div className="code-context">
          <SectionTitle>Context</SectionTitle>
          <div className="code-context-item">
            <span>Current file</span>
            <span>{selectedFileName || 'None'}</span>
          </div>
          <div className="code-context-item">
            <span>Language</span>
            <span>{selectedFileExt ? getLanguageLabel(selectedFileExt) : '-'}</span>
          </div>
          <div className="code-context-item">
            <span>Lines</span>
            <span>{lineCount || '-'}</span>
          </div>
          <div className="code-context-item">
            <span>Size</span>
            <span>{fileContent ? `${(fileContent.length / 1024).toFixed(1)} KB` : '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
