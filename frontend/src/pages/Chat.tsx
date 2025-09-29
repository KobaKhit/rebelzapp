import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import {
  PaperAirplaneIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  EllipsisVerticalIcon,
  LockClosedIcon,
  GlobeAltIcon,
  TrashIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

interface ChatGroup {
  id: number;
  name: string;
  description?: string;
  is_private: boolean;
  group_type: 'user_created' | 'admin_managed' | 'instructor_managed';
  created_by_id: number;
  managed_by_id?: number;
  created_at: string;
  updated_at: string;
  created_by?: any;
  managed_by?: any;
  members: any[];
  member_count?: number;
}

interface ChatMessage {
  id: number;
  group_id: number;
  sender_id: number;
  content: string;
  message_type: string;
  created_at: string;
  sender?: any;
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Helper function to get group icon based on type
  const getGroupIcon = (group: ChatGroup) => {
    if (group.group_type === 'admin_managed') {
      return <ShieldCheckIcon className="h-4 w-4 text-red-500 flex-shrink-0" title="Admin Managed" />;
    } else if (group.group_type === 'instructor_managed') {
      return <AcademicCapIcon className="h-4 w-4 text-blue-500 flex-shrink-0" title="Instructor Managed" />;
    } else if (group.is_private) {
      return <LockClosedIcon className="h-4 w-4 text-gray-400 flex-shrink-0" title="Private Group" />;
    } else {
      return <GlobeAltIcon className="h-4 w-4 text-gray-400 flex-shrink-0" title="Public Group" />;
    }
  };

  // Helper function to check if user can manage a group
  const canManageGroup = (group: ChatGroup) => {
    if (group.group_type !== 'user_created') return false;
    return group.created_by_id === user?.id;
  };

  // Check if user can create groups (only admins and instructors)
  const canCreateGroups = user?.roles?.includes('admin') || user?.roles?.includes('instructor');

  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<ChatGroup | null>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    is_private: false,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Fetch user's groups
  const { data: groups = [] } = useQuery({
    queryKey: ['chat-groups'],
    queryFn: chatApi.getGroups,
  });

  // Fetch messages for selected group
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', selectedGroup?.id],
    queryFn: () => selectedGroup ? chatApi.getMessages(selectedGroup.id) : Promise.resolve([]),
    enabled: !!selectedGroup,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always consider data stale so it refetches
  });

  // Search public groups
  const { data: publicGroups = [] } = useQuery({
    queryKey: ['public-groups', searchQuery],
    queryFn: () => searchQuery ? chatApi.searchPublicGroups(searchQuery) : Promise.resolve([]),
    enabled: !!searchQuery && showJoinGroup,
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: chatApi.createGroup,
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
      setSelectedGroup(newGroup);
      setShowCreateGroup(false);
      setNewGroupData({ name: '', description: '', is_private: false });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ groupId, content }: { groupId: number; content: string }) =>
      chatApi.sendMessage(groupId, content),
    onSuccess: () => {
      // Force refetch messages to ensure we get the latest
      refetchMessages();
      setNewMessage('');
    },
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: chatApi.joinGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
      setShowJoinGroup(false);
      setSearchQuery('');
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: chatApi.deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
      setShowDeleteGroup(false);
      setGroupToDelete(null);
      // If the deleted group was selected, clear selection
      if (selectedGroup && groupToDelete && selectedGroup.id === groupToDelete.id) {
        setSelectedGroup(null);
      }
    },
  });

  // WebSocket connection
  useEffect(() => {
    if (selectedGroup && user) {
      const token = localStorage.getItem('token');
      if (token) {
        const wsUrl = `ws://localhost:8000/ws/chat/${selectedGroup.id}?token=${token}`;
        const websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
          setWs(websocket);
        };

        websocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message') {
            // Force refetch messages to ensure we get the latest
            refetchMessages();
          }
        };

        websocket.onclose = () => {
          setWs(null);
        };

        websocket.onerror = () => {
          // WebSocket error occurred
        };

        return () => {
          if (websocket.readyState === WebSocket.OPEN) {
            websocket.close();
          }
        };
      }
    }
  }, [selectedGroup, user, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside the dropdown
      if (showGroupMenu && !target.closest('.dropdown-menu')) {
        setShowGroupMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGroupMenu]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    // Send via WebSocket if connected, otherwise use REST API
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'message',
        content: newMessage.trim(),
        message_type: 'text',
      }));
      setNewMessage('');
      
      // Note: The message will be added to the UI when we receive it back via WebSocket
      // This ensures all users see messages in the same order
    } else {
      sendMessageMutation.mutate({
        groupId: selectedGroup.id,
        content: newMessage.trim(),
      });
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupData.name.trim()) return;
    createGroupMutation.mutate(newGroupData);
  };

  const handleDeleteGroup = (group: ChatGroup) => {
    setGroupToDelete(group);
    setShowDeleteGroup(true);
  };

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      deleteGroupMutation.mutate(groupToDelete.id);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] max-w-7xl mx-auto bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-indigo-500" />
                Chat Groups
              </h2>
               <div className="flex gap-2">
                 {canCreateGroups && (
                   <>
                     <button
                       onClick={() => setShowJoinGroup(true)}
                       className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                       title="Join Group"
                     >
                       <MagnifyingGlassIcon className="h-4 w-4" />
                     </button>
                     <button
                       onClick={() => setShowCreateGroup(true)}
                       className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                       title="Create Group"
                     >
                       <PlusIcon className="h-4 w-4" />
                     </button>
                   </>
                 )}
               </div>
            </div>
          </div>

          {/* Groups List */}
          <div className="flex-1 overflow-y-auto">
             {groups.length === 0 ? (
               <div className="p-4 text-center text-gray-500">
                 <UserGroupIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                 <p className="text-sm">No groups yet</p>
                 {canCreateGroups ? (
                   <p className="text-xs">Create or join a group to start chatting</p>
                 ) : (
                   <p className="text-xs">Wait to be added to a group by an admin or instructor</p>
                 )}
               </div>
             ) : (
              <div className="space-y-1 p-2">
                {groups.map((group: ChatGroup) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedGroup?.id === group.id
                        ? 'bg-indigo-100 border-indigo-200'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getGroupIcon(group)}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">{group.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{group.member_count || group.members?.length || 0} members</span>
                            {group.group_type !== 'user_created' && (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                                {group.group_type === 'admin_managed' ? 'Admin' : 'Instructor'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedGroup ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {getGroupIcon(selectedGroup)}
                      {selectedGroup.name}
                    </h3>
                    {selectedGroup.description && (
                      <p className="text-sm text-gray-600">{selectedGroup.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{selectedGroup.member_count || selectedGroup.members?.length || 0} members</span>
                      {selectedGroup.group_type !== 'user_created' && selectedGroup.managed_by && (
                        <span>
                          Managed by {selectedGroup.managed_by.full_name || selectedGroup.managed_by.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setShowGroupMenu(!showGroupMenu)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                    >
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </button>
                    
                    {showGroupMenu && (
                      <div className="dropdown-menu absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="py-1">
                          {/* Only show delete option if user is the creator of a user-created group */}
                          {canManageGroup(selectedGroup) && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteGroup(selectedGroup);
                                setShowGroupMenu(false);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Delete Group
                            </button>
                          )}
                          {selectedGroup.group_type !== 'user_created' && (
                            <div className="px-4 py-2 text-sm text-gray-500">
                              This group is managed by {selectedGroup.group_type === 'admin_managed' ? 'an admin' : 'an instructor'}
                            </div>
                          )}
                          {/* Add more menu items here in the future */}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start the conversation by sending a message.
                    </p>
                  </div>
                ) : (
                  messages.map((message: ChatMessage, index: number) => {
                    const isOwnMessage = message.sender_id === user?.id;
                    const showDate = index === 0 || 
                      formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="text-center py-2">
                            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              {formatDate(message.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                            {!isOwnMessage && (
                              <p className="text-xs text-gray-500 mb-1 px-3">
                                {message.sender?.full_name || message.sender?.email || 'Unknown User'}
                              </p>
                            )}
                            <div
                              className={`px-4 py-2 rounded-lg ${
                                isOwnMessage
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                isOwnMessage ? 'text-indigo-200' : 'text-gray-500'
                              }`}>
                                {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={sendMessageMutation.isPending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a group</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a group from the sidebar to start chatting.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

       {/* Create Group Modal - Only for admins/instructors */}
       {showCreateGroup && canCreateGroups && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Group</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroupData.name}
                  onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newGroupData.description}
                  onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_private"
                  checked={newGroupData.is_private}
                  onChange={(e) => setNewGroupData({ ...newGroupData, is_private: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is_private" className="ml-2 block text-sm text-gray-700">
                  Private group (invite only)
                </label>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

       {/* Join Group Modal - Only for admins/instructors */}
       {showJoinGroup && canCreateGroups && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Join Public Group</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Groups
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for public groups..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {publicGroups.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {publicGroups.map((group: ChatGroup) => (
                    <div key={group.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                      <div>
                        <p className="font-medium text-gray-900">{group.name}</p>
                        {group.description && (
                          <p className="text-sm text-gray-600">{group.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {group.member_count || group.members?.length || 0} members
                        </p>
                      </div>
                      <button
                        onClick={() => joinGroupMutation.mutate(group.id)}
                        disabled={joinGroupMutation.isPending}
                        className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowJoinGroup(false);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteGroup && groupToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Group</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete "<strong>{groupToDelete.name}</strong>"? 
              This action cannot be undone and will permanently delete all messages in this group.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteGroup(false);
                  setGroupToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteGroup}
                disabled={deleteGroupMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteGroupMutation.isPending ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Chat;
