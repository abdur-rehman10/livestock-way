import { useState, useRef, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Send, 
  Paperclip, 
  X,
  Image as ImageIcon,
  File,
  Download,
  Check,
  CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'driver' | 'shipper' | 'ops' | 'system';
  content: string;
  timestamp: string;
  attachments?: Array<{
    type: 'image' | 'file';
    name: string;
    url: string;
    size?: string;
  }>;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isCurrentUser: boolean;
}

interface TripChatProps {
  tripId?: string;
  currentUserId?: string;
  currentUserRole?: 'driver' | 'shipper' | 'ops';
}

const mockMessages: Message[] = [
  {
    id: 'M001',
    senderId: 'ops1',
    senderName: 'Operations Team',
    senderRole: 'ops',
    content: 'Trip has been assigned. Please confirm you can start by 8:00 AM tomorrow.',
    timestamp: '2 hours ago',
    status: 'read',
    isCurrentUser: false,
  },
  {
    id: 'M002',
    senderId: 'driver1',
    senderName: 'You',
    senderRole: 'driver',
    content: 'Confirmed! I\'ll be at the pickup location by 7:45 AM.',
    timestamp: '2 hours ago',
    status: 'read',
    isCurrentUser: true,
  },
  {
    id: 'M003',
    senderId: 'shipper1',
    senderName: 'Green Valley Ranch',
    senderRole: 'shipper',
    content: 'Perfect. The livestock will be ready. Please call me when you arrive.',
    timestamp: '1 hour ago',
    status: 'delivered',
    isCurrentUser: false,
  },
  {
    id: 'M004',
    senderId: 'shipper1',
    senderName: 'Green Valley Ranch',
    senderRole: 'shipper',
    content: 'Here\'s the gate code for entry: 4582#',
    timestamp: '1 hour ago',
    attachments: [
      {
        type: 'image',
        name: 'gate-location.jpg',
        url: '#',
        size: '245 KB',
      },
    ],
    status: 'delivered',
    isCurrentUser: false,
  },
  {
    id: 'M005',
    senderId: 'driver1',
    senderName: 'You',
    senderRole: 'driver',
    content: 'Got it, thanks!',
    timestamp: '50 minutes ago',
    status: 'read',
    isCurrentUser: true,
  },
];

export function TripChat({
  tripId = 'T000',
  currentUserId = 'CURRENT_USER',
  currentUserRole = 'driver',
}: TripChatProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() && attachments.length === 0) {
      return;
    }

    if (!isOnline) {
      toast.info('Message will be sent when you\'re back online');
    }

    const newMessage: Message = {
      id: `M${Date.now()}`,
      senderId: currentUserId,
      senderName: 'You',
      senderRole: currentUserRole,
      content: inputValue.trim(),
      timestamp: 'Just now',
      attachments: attachments.map(file => ({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        url: URL.createObjectURL(file),
        size: `${(file.size / 1024).toFixed(0)} KB`,
      })),
      status: isOnline ? 'sent' : 'sending',
      isCurrentUser: true,
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
    setAttachments([]);

    // Simulate delivery status update
    if (isOnline) {
      setTimeout(() => {
        setMessages(prev => prev.map(m => 
          m.id === newMessage.id ? { ...m, status: 'delivered' } : m
        ));
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = [...attachments, ...files].slice(0, 3);
    
    if (newAttachments.length > 3) {
      toast.error('Maximum 3 attachments allowed');
    }
    
    setAttachments(newAttachments);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ops':
        return 'bg-blue-500';
      case 'shipper':
        return 'bg-[#F97316]';
      case 'driver':
        return 'bg-[#29CA8D]';
      case 'system':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-[#29CA8D]" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-[#172039]">Trip Chat</h3>
            <p className="text-sm text-gray-600">Trip #{tripId}</p>
          </div>
          <div className="flex items-center gap-2">
            {isTyping && (
              <Badge variant="outline" className="text-xs">
                Someone is typing...
              </Badge>
            )}
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] ${message.isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
              {/* Sender Info */}
              {!message.isCurrentUser && (
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`${getRoleColor(message.senderRole)} text-white text-xs`}>
                    {message.senderName}
                  </Badge>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-4 py-2 ${
                  message.isCurrentUser
                    ? 'bg-[#29CA8D] text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}
              >
                {message.content && (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                )}

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((attachment, index) => (
                      <div key={index}>
                        {attachment.type === 'image' ? (
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90"
                            onClick={() => window.open(attachment.url, '_blank')}
                          />
                        ) : (
                          <div className={`flex items-center gap-2 p-2 rounded-lg ${
                            message.isCurrentUser ? 'bg-white/20' : 'bg-white'
                          }`}>
                            <File className="w-4 h-4" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs truncate">{attachment.name}</p>
                              <p className="text-xs opacity-70">{attachment.size}</p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => toast.success('Download started')}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp and Status */}
              <div className="flex items-center gap-1 mt-1 px-1">
                <span className="text-xs text-gray-500">{message.timestamp}</span>
                {message.isCurrentUser && getStatusIcon(message.status)}
              </div>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
          <p className="text-sm text-yellow-800 text-center">
            You're offline. Messages will be sent when connection is restored.
          </p>
        </div>
      )}

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <div className="flex gap-2 overflow-x-auto">
            {attachments.map((file, index) => (
              <div key={index} className="relative flex-shrink-0">
                {file.type.startsWith('image/') ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="relative w-16 h-16 bg-gray-200 rounded-lg flex flex-col items-center justify-center">
                    <File className="w-6 h-6 text-gray-600" />
                    <p className="text-xs text-gray-600 truncate max-w-full px-1">
                      {file.name.split('.').pop()}
                    </p>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={attachments.length >= 3}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <div className="flex-1">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() && attachments.length === 0}
            className="bg-[#29CA8D] hover:bg-[#24b67d]"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
