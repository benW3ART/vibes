import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useNavigationStore, useProjectStore, toast } from '@/stores';
import { Button } from '@/components/ui';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export function ChatPanel() {
  const { chatPanelOpen, toggleChatPanel } = useNavigationStore();
  const { currentProject } = useProjectStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to Claude output
  useEffect(() => {
    if (!window.electron) return;

    const unsubOutput = window.electron.claude.onOutput((data: unknown) => {
      const content = typeof data === 'string' ? data : JSON.stringify(data);

      setMessages(prev => {
        // Find if there's a streaming message to update
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.isStreaming) {
          return prev.map((msg, i) =>
            i === prev.length - 1
              ? { ...msg, content: msg.content + content }
              : msg
          );
        }
        // Create new streaming message
        return [...prev, {
          id: Date.now().toString(),
          role: 'assistant' as const,
          content,
          timestamp: new Date(),
          isStreaming: true,
        }];
      });
    });

    const unsubExit = window.electron.claude.onExit(() => {
      setIsWaiting(false);
      // Mark streaming message as complete
      setMessages(prev =>
        prev.map(msg => msg.isStreaming ? { ...msg, isStreaming: false } : msg)
      );
    });

    unsubscribeRef.current = () => {
      unsubOutput();
      unsubExit();
    };

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isWaiting) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = input;
    setInput('');
    setIsWaiting(true);

    try {
      if (window.electron && currentProject?.path) {
        // Send to real Claude via IPC
        const success = await window.electron.claude.send(messageToSend);
        if (!success) {
          // Claude might not be spawned yet, try to spawn it first
          const spawned = await window.electron.claude.spawn(currentProject.path);
          if (spawned) {
            await window.electron.claude.send(messageToSend);
          } else {
            throw new Error('Failed to start Claude');
          }
        }
      } else {
        // Demo mode fallback
        setTimeout(() => {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `[Demo Mode] I received your message: "${messageToSend}"\n\nTo use real Claude responses, run the app in Electron mode with a project selected.`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsWaiting(false);
        }, 500);
      }
    } catch (error) {
      console.error('[ChatPanel] Error sending message:', error);
      toast.error('Failed to send message to Claude');
      setIsWaiting(false);
    }
  }, [input, isWaiting, currentProject]);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className={`panel ${chatPanelOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <span className="panel-title">Chat</span>
        <Button variant="ghost" size="sm" onClick={toggleChatPanel}>X</Button>
      </div>

      <div className="panel-content chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>Start a conversation with Claude</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <div className="chat-message-content">{msg.content}</div>
              <div className="chat-message-time">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          placeholder={isWaiting ? "Waiting for response..." : "Ask Claude..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isWaiting}
        />
        <Button variant="primary" onClick={handleSend} disabled={isWaiting || !input.trim()}>
          {isWaiting ? '...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
