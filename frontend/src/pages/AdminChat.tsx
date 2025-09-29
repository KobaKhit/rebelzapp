import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminChatApi, usersApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import {
  PlusIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  UserGroupIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: number;
  email: string;
  full_name?: string;
  roles: string[];
}

interface ChatGroup {
  id: number;
  name: string;
  description?: string;
  is_private: boolean;
  group_type: 'admin_managed' | 'instructor_managed';
  created_by_id: number;
  managed_by_id?: number;
  created_at: string;
  updated_at: string;
  created_by?: any;
  managed_by?: any;
  members: any[];
  member_count?: number;
}

const AdminChat: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<ChatGroup | null>(null);
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    is_private: true,
    group_type: 'instructor_managed' as 'admin_managed' | 'instructor_managed',
    member_ids: [] as number[],
  });

  // Check if user can access admin chat
  const isAdmin = user?.roles?.includes('admin');
  const isInstructor = user?.roles?.includes('instructor');
  const canAccessAdminChat = isAdmin || isInstructor;

  // Fetch managed groups
  const { data: managedGroups = [] } = useQuery({
    queryKey: ['admin-chat-groups'],
    queryFn: isAdmin ? adminChatApi.getAllManagedGroups : adminChatApi.getManagedGroups,
    enabled: canAccessAdminChat,
  });

  // Fetch all users for member selection
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: usersApi.getUsers,
    enabled: canAccessAdminChat,
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: adminChatApi.createManagedGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-groups'] });
      setShowCreateGroup(false);
      setNewGroupData({
        name: '',
        description: '',
        is_private: true,
        group_type: 'instructor_managed',
        member_ids: [],
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: adminChatApi.deleteManagedGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-groups'] });
      setShowDeleteGroup(false);
      setGroupToDelete(null);
    },
  });

  // Assign user mutation
  const assignUserMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) =>
      adminChatApi.assignUserToGroup(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-groups'] });
    },
  });

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) =>
      adminChatApi.removeUserFromGroup(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-groups'] });
    },
  });

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

  const handleManageMembers = (group: ChatGroup) => {
    setSelectedGroup(group);
    setShowManageMembers(true);
  };

  const handleAssignUser = (userId: number) => {
    if (selectedGroup) {
      assignUserMutation.mutate({ groupId: selectedGroup.id, userId });
    }
  };

  const handleRemoveUser = (userId: number) => {
    if (selectedGroup) {
      removeUserMutation.mutate({ groupId: selectedGroup.id, userId });
    }
  };

  const getGroupIcon = (group: ChatGroup) => {
    if (group.group_type === 'admin_managed') {
      return <ShieldCheckIcon className="h-5 w-5 text-red-500" />;
    } else {
      return <AcademicCapIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  if (!canAccessAdminChat) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="mt-2 text-gray-600">You need admin or instructor privileges to access this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UserGroupIcon className="h-6 w-6 text-indigo-500" />
                Group Management
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Create and manage chat groups for students
              </p>
            </div>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Group
            </button>
          </div>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managedGroups.map((group: ChatGroup) => (
            <div key={group.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getGroupIcon(group)}
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {group.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleManageMembers(group)}
                      className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                      title="Manage Members"
                    >
                      <UserPlusIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete Group"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {group.description && (
                  <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{group.member_count || group.members?.length || 0} members</span>
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {group.group_type === 'admin_managed' ? 'Admin' : 'Instructor'}
                  </span>
                </div>
                
                {group.managed_by && (
                  <p className="text-xs text-gray-500 mt-2">
                    Managed by {group.managed_by.full_name || group.managed_by.email}
                  </p>
                )}
              </div>
            </div>
          ))}
          
          {managedGroups.length === 0 && (
            <div className="col-span-full text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No managed groups</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new group for your students.
              </p>
            </div>
          )}
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Managed Group</h3>
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
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Group Type
                    </label>
                    <select
                      value={newGroupData.group_type}
                      onChange={(e) => setNewGroupData({ ...newGroupData, group_type: e.target.value as 'admin_managed' | 'instructor_managed' })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="instructor_managed">Instructor Managed</option>
                      <option value="admin_managed">Admin Managed</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Members
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md">
                    {allUsers.map((u: User) => (
                      <label key={u.id} className="flex items-center p-2 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={newGroupData.member_ids.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewGroupData({
                                ...newGroupData,
                                member_ids: [...newGroupData.member_ids, u.id]
                              });
                            } else {
                              setNewGroupData({
                                ...newGroupData,
                                member_ids: newGroupData.member_ids.filter(id => id !== u.id)
                              });
                            }
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {u.full_name || u.email}
                        </span>
                      </label>
                    ))}
                  </div>
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

        {/* Manage Members Modal */}
        {showManageMembers && selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Members - {selectedGroup.name}
                </h3>
                <button
                  onClick={() => setShowManageMembers(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Members */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Current Members</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedGroup.members?.map((member: any) => (
                      <div key={member.user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">
                          {member.user.full_name || member.user.email}
                        </span>
                        {member.user.id !== selectedGroup.managed_by_id && (
                          <button
                            onClick={() => handleRemoveUser(member.user.id)}
                            disabled={removeUserMutation.isPending}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <UserMinusIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Available Users */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Available Users</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allUsers
                      .filter((u: User) => !selectedGroup.members?.some((m: any) => m.user.id === u.id))
                      .map((u: User) => (
                        <div key={u.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">
                            {u.full_name || u.email}
                          </span>
                          <button
                            onClick={() => handleAssignUser(u.id)}
                            disabled={assignUserMutation.isPending}
                            className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                          >
                            <UserPlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                  </div>
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
      </div>
    </Layout>
  );
};

export default AdminChat;
