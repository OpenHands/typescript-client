import { useState, useEffect } from 'react';
import { FiFolder, FiFolderPlus, FiFile, FiChevronRight, FiChevronDown, FiRefreshCw } from 'react-icons/fi';
import { cn } from '#/utils';
import { LoadingSpinner } from '#/components/shared';
import { useClient } from '#/context';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
}

interface FileTreeItemProps {
  item: FileItem;
  level: number;
  onSelect: (path: string) => void;
  selectedPath?: string;
}

function FileTreeItem({ item, level, onSelect, selectedPath }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedPath === item.path;
  const isDirectory = item.type === 'directory';

  const handleClick = () => {
    if (isDirectory) {
      setExpanded(!expanded);
    }
    onSelect(item.path);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md',
          'hover:bg-white/5 transition-colors text-left',
          isSelected && 'bg-white/10'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {isDirectory ? (
          expanded ? (
            <FiChevronDown className="w-4 h-4 text-basic flex-shrink-0" />
          ) : (
            <FiChevronRight className="w-4 h-4 text-basic flex-shrink-0" />
          )
        ) : (
          <span className="w-4" />
        )}
        {isDirectory ? (
          expanded ? (
            <FiFolderPlus className="w-4 h-4 text-primary flex-shrink-0" />
          ) : (
            <FiFolder className="w-4 h-4 text-primary flex-shrink-0" />
          )
        ) : (
          <FiFile className="w-4 h-4 text-basic flex-shrink-0" />
        )}
        <span className="truncate text-content">{item.name}</span>
      </button>
      {isDirectory && expanded && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.path}
              item={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileTreeProps {
  className?: string;
  onFileSelect?: (path: string) => void;
}

export function FileTree({ className, onFileSelect }: FileTreeProps) {
  const { workspace, isConnected } = useClient();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
    if (!workspace || !isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      // Execute ls command to get files
      const result = await workspace.executeCommand('find . -maxdepth 3 -type f -o -type d | head -100');
      
      if (result.exit_code === 0 && result.stdout) {
        // Parse the output into a file tree
        const paths = result.stdout.split('\n').filter(Boolean);
        const tree = buildFileTree(paths);
        setFiles(tree);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [workspace, isConnected]);

  const handleSelect = (path: string) => {
    setSelectedPath(path);
    onFileSelect?.(path);
  };

  return (
    <div className={cn('bg-base-secondary rounded-lg overflow-hidden', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700">
        <span className="text-sm font-medium text-content">Files</span>
        <button
          onClick={loadFiles}
          disabled={isLoading || !isConnected}
          className="p-1.5 rounded hover:bg-white/10 text-basic transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <FiRefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      <div className="h-[300px] overflow-y-auto custom-scrollbar p-2">
        {!isConnected && (
          <div className="flex items-center justify-center h-full text-basic text-sm">
            Not connected
          </div>
        )}

        {isConnected && isLoading && files.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="small" />
          </div>
        )}

        {isConnected && error && (
          <div className="flex items-center justify-center h-full text-danger text-sm">
            {error}
          </div>
        )}

        {isConnected && !isLoading && files.length === 0 && !error && (
          <div className="flex items-center justify-center h-full text-basic text-sm">
            No files found
          </div>
        )}

        {files.length > 0 && (
          <div>
            {files.map((item) => (
              <FileTreeItem
                key={item.path}
                item={item}
                level={0}
                onSelect={handleSelect}
                selectedPath={selectedPath}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FileItemNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: Record<string, FileItemNode>;
}

function buildFileTree(paths: string[]): FileItem[] {
  const root: Record<string, FileItemNode> = {};

  paths.forEach((path) => {
    const parts = path.replace(/^\.\//, '').split('/');
    let current = root;

    parts.forEach((part, index) => {
      if (!part) return;

      const fullPath = parts.slice(0, index + 1).join('/');
      const isLast = index === parts.length - 1;

      if (!current[part]) {
        current[part] = {
          name: part,
          path: fullPath,
          type: isLast && !path.endsWith('/') ? 'file' : 'directory',
          children: isLast ? undefined : {},
        };
      }

      if (!isLast && current[part].children) {
        current = current[part].children!;
      }
    });
  });

  const flatten = (items: Record<string, FileItemNode>): FileItem[] => {
    return Object.values(items)
      .map((item): FileItem => ({
        name: item.name,
        path: item.path,
        type: item.type,
        children: item.children ? flatten(item.children) : undefined,
      }))
      .sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  };

  return flatten(root);
}
