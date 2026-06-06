import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Send, MessageSquare, ArrowLeft, Clock, User, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Conversation {
  id: string;
  rideId: string;
  route: string | null;
  departureTime?: string;
  otherParticipant: {
    id: string;
    name: string;
    profilePicture?: string;
    rating?: number;
  } | null;
  lastMessage: {
    content: string;
    sentAt: string;
    isOwn: boolean;
  } | null;
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  sentAt: string;
  isOwn: boolean;
  sender: {
    id: string;
    name: string;
    profilePicture?: string;
  } | null;
}

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parse query params to auto-select a conversation
  const queryParams = new URLSearchParams(location.search);
  const selectId = queryParams.get('select');

  const fetchConversations = async (autoSelectId?: string) => {
    try {
      const res = await api.get('/chat');
      const list: Conversation[] = res.data.conversations || [];
      setConversations(list);
      
      // Auto-select conversation if requested via query param
      const targetId = autoSelectId || selectId;
      if (targetId) {
        const found = list.find(c => c.id === targetId);
        if (found) {
          setActiveConversation(found);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const fetchMessages = async (convId: string, quiet = false) => {
    if (!quiet) setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/${convId}/messages`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      if (!quiet) setLoadingMessages(false);
    }
  };

  // Initial fetch of conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  // Poll for conversations and active messages
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(activeConversation?.id);
      if (activeConversation) {
        fetchMessages(activeConversation.id, true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeConversation]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      const content = newMessage.trim();
      setNewMessage('');
      const res = await api.post(`/chat/${activeConversation.id}/messages`, { content });
      setMessages(prev => [...prev, res.data]);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const colors = {
    primary: '#4F46E5',
    primaryLight: '#EEF2FF',
    border: '#E5E7EB',
    text: '#111827',
    textMuted: '#6B7280',
    bg: '#F3F4F6'
  };

  return (
    <DashboardLayout noPadding>
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 72px)',
        backgroundColor: '#ffffff',
      }}>
        {/* Sidebar / Conversation List */}
        <div style={{
          width: activeConversation ? '35%' : '100%',
          display: activeConversation && window.innerWidth < 768 ? 'none' : 'flex',
          flexDirection: 'column',
          borderRight: `1px solid ${colors.border}`,
          height: '100%'
        }}>
          <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border}` }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: colors.text }}>Inbox</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: colors.textMuted }}>Your conversations with drivers & riders</p>
          </div>

          <div className="dashboard-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {loadingConversations ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Loader2 className="animate-spin" style={{ color: colors.primary }} />
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: colors.textMuted }}>
                <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>No conversations yet.</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Start a chat with a driver from a ride details page.</p>
              </div>
            ) : (
              conversations.map(conv => {
                const isActive = activeConversation?.id === conv.id;
                const initials = conv.otherParticipant?.name
                  ? conv.otherParticipant.name.split(' ').map(n => n[0]).join('').toUpperCase()
                  : 'U';
                
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    style={{
                      padding: '16px 24px',
                      borderBottom: `1px solid ${colors.border}`,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      backgroundColor: isActive ? colors.primaryLight : 'transparent',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center'
                    }}
                    onMouseOver={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                    onMouseOut={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: isActive ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : '#E5E7EB',
                      color: isActive ? '#fff' : colors.text,
                      display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
                      fontWeight: 'bold', fontSize: '0.95rem', flexShrink: 0
                    }}>
                      {initials}
                    </div>

                    {/* Meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {conv.otherParticipant?.name || 'User'}
                        </span>
                        {conv.lastMessage && (
                          <span style={{ fontSize: '0.72rem', color: colors.textMuted }}>
                            {new Date(conv.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {conv.route && (
                        <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', fontWeight: 600, color: colors.primary }}>
                          {conv.route}
                        </p>
                      )}

                      <p style={{
                        margin: 0, fontSize: '0.82rem', color: colors.textMuted,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {conv.lastMessage ? conv.lastMessage.content : 'No messages yet'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message Pane */}
        <div style={{
          flex: 1,
          display: !activeConversation ? (window.innerWidth < 768 ? 'none' : 'flex') : 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#F9FAFB'
        }}>
          {activeConversation ? (
            <>
              {/* Header */}
              <div style={{
                padding: '16px 24px',
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <button
                  onClick={() => setActiveConversation(null)}
                  style={{
                    background: 'transparent', border: 'none', color: colors.textMuted,
                    cursor: 'pointer', display: 'flex', alignItems: 'center'
                  }}
                >
                  <ArrowLeft size={20} />
                </button>

                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: colors.text }}>
                    {activeConversation.otherParticipant?.name}
                  </h3>
                  {activeConversation.route && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.primary }}>
                      {activeConversation.route}
                    </span>
                  )}
                </div>
              </div>

              {/* Messages Body */}
              <div className="dashboard-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {loadingMessages ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <Loader2 className="animate-spin" style={{ color: colors.primary }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: colors.textMuted }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500, margin: 0 }}>Say hello!</p>
                    <p style={{ fontSize: '0.78rem', margin: '4px 0 0 0' }}>Type a message below to start chatting.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: msg.isOwn ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          alignSelf: msg.isOwn ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: msg.isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          backgroundColor: msg.isOwn ? colors.primary : '#ffffff',
                          color: msg.isOwn ? '#ffffff' : colors.text,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          fontSize: '0.9rem',
                          lineHeight: '1.4',
                          wordBreak: 'break-word'
                        }}>
                          {msg.content}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: colors.textMuted, marginTop: '4px', padding: '0 4px' }}>
                          {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '16px 24px',
                  backgroundColor: '#ffffff',
                  borderTop: `1px solid ${colors.border}`,
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}
              >
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: '24px',
                    border: `1px solid ${colors.border}`,
                    outline: 'none',
                    fontSize: '0.9rem',
                    backgroundColor: '#F9FAFB',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = colors.primary}
                  onBlur={e => e.currentTarget.style.borderColor = colors.border}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: colors.primary,
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                    opacity: !newMessage.trim() || sending ? 0.6 : 1
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: colors.textMuted
            }}>
              <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: colors.text }}>No Conversation Selected</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Select a conversation from the sidebar to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
