import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Send, Home, Check, CheckCheck, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
}

interface PresenceState {
  user_id: string;
  typing: boolean;
  online_at: string;
}

interface ChatWindowProps {
  conversationId: string;
  propertyTitle?: string;
  propertyId?: string;
  otherUserName?: string;
}

export const ChatWindow = ({
  conversationId,
  propertyTitle,
  propertyId,
  otherUserName,
}: ChatWindowProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!conversationId || !user) return;

    fetchMessages();
    markAsRead();

    // Suscribirse a nuevos mensajes en tiempo real
    const messagesChannel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          // Marcar como leído si el mensaje es de otro usuario
          if (newMsg.sender_id !== user.id) {
            markAsRead();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          // Actualizar el mensaje en la lista cuando se marca como leído
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMsg.id ? updatedMsg : msg
            )
          );
        }
      )
      .subscribe();

    // Canal de presencia para estado de "escribiendo..."
    const presenceChannel = supabase.channel(`presence:${conversationId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceState>();
        
        // Buscar si el otro usuario está escribiendo
        const otherUsers = Object.keys(state).filter((key) => key !== user.id);
        const isTyping = otherUsers.some((userId) => {
          const userPresence = state[userId];
          return userPresence?.[0]?.typing === true;
        });
        
        setIsOtherUserTyping(isTyping);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(messagesChannel);
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, user]);

  // Auto-scroll al final cuando hay nuevos mensajes (solo si no hay búsqueda activa)
  useEffect(() => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, searchQuery]);

  // Buscar mensajes cuando cambia el query
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = messages
        .filter((msg) =>
          msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map((msg) => msg.id);
      
      setSearchResults(results);
      setCurrentSearchIndex(0);
      
      // Scroll al primer resultado
      if (results.length > 0) {
        scrollToMessage(results[0]);
      }
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(0);
    }
  }, [searchQuery, messages]);

  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    scrollToMessage(searchResults[nextIndex]);
  };

  const handlePreviousResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    scrollToMessage(searchResults[prevIndex]);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return (
          <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 rounded px-0.5">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Error al cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!user) return;

    try {
      // Llamar a la función de base de datos para marcar mensajes como leídos
      const { error } = await supabase.rpc('mark_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: user.id,
      });

      if (error) throw error;

      // También actualizar el contador de no leídos
      await supabase
        .from('conversation_participants')
        .update({
          unread_count: 0,
          last_read_at: new Date().toISOString(),
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Función para notificar que el usuario está escribiendo
  const notifyTyping = useCallback(async (isTyping: boolean) => {
    if (!user || !presenceChannelRef.current) return;

    try {
      await presenceChannelRef.current.track({
        user_id: user.id,
        typing: isTyping,
        online_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [user]);

  // Manejar cambios en el textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    // Notificar que está escribiendo
    notifyTyping(true);

    // Limpiar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Establecer nuevo timeout para dejar de notificar
    typingTimeoutRef.current = setTimeout(() => {
      notifyTyping(false);
    }, 2000); // Deja de notificar después de 2 segundos de inactividad
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    // Limpiar estado de "escribiendo"
    notifyTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando mensajes...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="p-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg">{otherUserName}</h2>
            {propertyTitle && (
              <p className="text-sm text-muted-foreground truncate">{propertyTitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className={showSearch ? 'bg-accent' : ''}
            >
              <Search className="w-4 h-4" />
            </Button>
            {propertyId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/propiedad/${propertyId}`)}
              >
                <Home className="w-4 h-4 mr-2" />
                Ver Propiedad
              </Button>
            )}
          </div>
        </div>

        {/* Barra de búsqueda */}
        {showSearch && (
          <div className="px-4 pb-4 border-t">
            <div className="flex items-center gap-2 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar en la conversación..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                  autoFocus
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {searchResults.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {currentSearchIndex + 1} de {searchResults.length}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePreviousResult}
                      disabled={searchResults.length === 0}
                      className="h-8 w-8"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNextResult}
                      disabled={searchResults.length === 0}
                      className="h-8 w-8"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {searchQuery && searchResults.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Sin resultados
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-center">
              No hay mensajes todavía.<br />
              ¡Envía el primero!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              const isRead = message.read_at !== null && message.read_at !== undefined;
              const isSearchResult = searchResults.includes(message.id);
              const isCurrentSearchResult = searchResults[currentSearchIndex] === message.id;
              
              return (
                <div
                  key={message.id}
                  ref={(el) => (messageRefs.current[message.id] = el)}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                    isCurrentSearchResult ? 'animate-pulse' : ''
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 transition-all ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    } ${
                      isCurrentSearchResult
                        ? 'ring-2 ring-yellow-400 ring-offset-2'
                        : isSearchResult
                        ? 'ring-1 ring-yellow-300'
                        : ''
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {searchQuery ? highlightText(message.content, searchQuery) : message.content}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p
                        className={`text-xs ${
                          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                      
                      {/* Confirmación de lectura - solo para mensajes propios */}
                      {isOwn && (
                        <div className="flex-shrink-0">
                          {isRead ? (
                            <CheckCheck 
                              className={`w-4 h-4 ${
                                isOwn ? 'text-blue-400' : 'text-muted-foreground'
                              }`}
                            />
                          ) : (
                            <Check 
                              className={`w-4 h-4 ${
                                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Indicador de "escribiendo..." */}
            {isOtherUserTyping && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-lg p-3 max-w-[70%]">
                  <div className="flex items-center gap-1">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">escribiendo...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-card p-4">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="min-h-[60px] max-h-[120px]"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
};
