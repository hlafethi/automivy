import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';

interface McpChatModalProps {
  workflowId: string;
  workflowName: string;
  webhookPath?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const McpChatModal: React.FC<McpChatModalProps> = ({
  workflowId,
  workflowName,
  webhookPath,
  isOpen,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant MCP. Comment puis-je vous aider aujourd\'hui ?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      console.log('💬 [McpChatModal] Envoi du message:', userMessage.content);
      
      // Appeler l'API pour envoyer le message au workflow
      const response = await fetch('http://localhost:3004/api/mcp-chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          workflowId,
          webhookPath,
          message: userMessage.content,
          sessionId: `mcp-${workflowId}-${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du message');
      }

      const data = await response.json();
      console.log('✅ [McpChatModal] Réponse reçue:', data);

      // Ajouter la réponse de l'assistant
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.message || 'Message envoyé avec succès',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('❌ [McpChatModal] Erreur:', error);
      
      // Ajouter un message d'erreur
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Erreur: ${error.message || 'Impossible d\'envoyer le message. Veuillez réessayer.'}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#e0f4f6' }}>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6" style={{ color: '#046f78' }} />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{workflowName}</h3>
              <p className="text-sm" style={{ color: '#75ccd5' }}>Chat avec votre assistant MCP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition"
            style={{ 
              color: '#046f78'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#f8fafc' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'text-white'
                    : 'bg-white text-slate-900 border'
                }`}
                style={
                  message.role === 'user'
                    ? { backgroundColor: '#046f78' }
                    : { borderColor: '#e0f4f6' }
                }
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? '' : 'text-slate-500'
                  }`}
                  style={message.role === 'user' ? { color: '#d1eef1' } : {}}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-white text-slate-900 border rounded-lg p-3" style={{ borderColor: '#e0f4f6' }}>
                <p className="text-sm" style={{ color: '#75ccd5' }}>Envoi en cours...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white" style={{ borderColor: '#e0f4f6' }}>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tapez votre message..."
              disabled={isSending}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:cursor-not-allowed"
              style={{
                borderColor: '#a3dde3',
                '--tw-ring-color': '#046f78'
              } as React.CSSProperties & { '--tw-ring-color': string }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#046f78';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#a3dde3';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || isSending}
              className="p-2 text-white rounded-lg transition disabled:cursor-not-allowed"
              style={{
                backgroundColor: isSending || !inputMessage.trim() ? '#a3dde3' : '#046f78'
              }}
              onMouseEnter={(e) => {
                if (!isSending && inputMessage.trim()) {
                  e.currentTarget.style.backgroundColor = '#034a52';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSending && inputMessage.trim()) {
                  e.currentTarget.style.backgroundColor = '#046f78';
                }
              }}
              title="Envoyer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default McpChatModal;

