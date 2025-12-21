import React, { useState, useEffect } from 'react';
import { centerService } from '../../../services';
import { useAlert } from '../../../shared/ui/AlertProvider';
import { Button } from '../../../shared/ui/Button';
import { CenterForm, AdminForm } from './CenterManagement';
import type { Center, CenterAdmin } from '../../../types';
import type { CreateCenterData, CreateAdminData } from '../../../services/CenterService';
import { Building2, Edit2, Trash2, Plus, UserPlus, Users, X, ExternalLink, Copy } from 'lucide-react';

export const CenterManagementPanel: React.FC = () => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [admins, setAdmins] = useState<CenterAdmin[]>([]);
  const [showCenterForm, setShowCenterForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<CenterAdmin | null>(null);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useAlert();

  useEffect(() => {
    loadCenters();
  }, []);

  useEffect(() => {
    if (selectedCenter) {
      loadAdmins(selectedCenter.id);
    }
  }, [selectedCenter]);

  const loadCenters = async () => {
    try {
      const data = await centerService.getAllCenters();
      setCenters(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load centers');
    }
  };

  const loadAdmins = async (centerId: string) => {
    try {
      const data = await centerService.getCenterAdmins(centerId);
      setAdmins(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load admins');
    }
  };

  const handleCreateCenter = async (data: CreateCenterData) => {
    await centerService.createCenter(data);
    await loadCenters();
    setShowCenterForm(false);
  };

  const handleUpdateCenter = async (data: CreateCenterData) => {
    if (!editingCenter) return;
    await centerService.updateCenter(editingCenter.id, data);
    await loadCenters();
    setEditingCenter(null);
  };

  const handleDeleteCenter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this center? This will also delete all associated data.')) {
      return;
    }
    try {
      await centerService.deleteCenter(id);
      showSuccess('Center deleted successfully');
      await loadCenters();
      if (selectedCenter?.id === id) {
        setSelectedCenter(null);
        setAdmins([]);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to delete center');
    }
  };

  const handleCreateAdmin = async (data: CreateAdminData) => {
    if (!selectedCenter) return;
    await centerService.createCenterAdmin(selectedCenter.id, data);
    await loadAdmins(selectedCenter.id);
    setShowAdminForm(false);
  };

  const handleUpdateAdmin = async (data: CreateAdminData) => {
    if (!editingAdmin || !selectedCenter) return;
    await centerService.updateCenterAdmin(editingAdmin.id, data);
    await loadAdmins(selectedCenter.id);
    setEditingAdmin(null);
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this admin account?')) {
      return;
    }
    try {
      await centerService.deleteCenterAdmin(adminId);
      showSuccess('Admin deleted successfully');
      if (selectedCenter) {
        await loadAdmins(selectedCenter.id);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to delete admin');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-indigo-600" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Center Management</h3>
        </div>
        <Button
          color="indigo"
          onClick={() => {
            setEditingCenter(null);
            setShowCenterForm(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Center
        </Button>
      </div>

      {showCenterForm && (
        <CenterForm
          centerId={editingCenter?.id}
          initialData={editingCenter ? { name: editingCenter.name, slug: editingCenter.slug, logoUrl: editingCenter.logoUrl } : undefined}
          onSubmit={editingCenter ? handleUpdateCenter : handleCreateCenter}
          onCancel={() => {
            setShowCenterForm(false);
            setEditingCenter(null);
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Centers List */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">Centers</h4>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {centers.map(center => (
              <div
                key={center.id}
                className={`p-4 rounded-lg border cursor-pointer transition ${
                  selectedCenter?.id === center.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
                onClick={() => setSelectedCenter(center)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {center.logoUrl && (
                        <img src={center.logoUrl} alt={center.name} className="w-10 h-10 rounded object-cover" />
                      )}
                      <div>
                        <h5 className="font-bold text-gray-800 dark:text-gray-100">{center.name}</h5>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">/{center.slug}</p>
                          <div className="flex items-center gap-1 ml-2">
                            <a
                              href={`${window.location.origin}/${center.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" />
                              Landing Page
                            </a>
                            <button
                              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`${window.location.origin}/${center.slug}`);
                                showSuccess('URL copied to clipboard');
                              }}
                              title="Copy URL"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCenter(center);
                        setShowCenterForm(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCenter(center.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {centers.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No centers yet. Create your first center!</p>
              </div>
            )}
          </div>
        </div>

        {/* Admins List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Center Admins</h4>
            {selectedCenter && (
              <Button
                size="sm"
                color="indigo"
                onClick={() => {
                  setEditingAdmin(null);
                  setShowAdminForm(true);
                }}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Add Admin
              </Button>
            )}
          </div>

          {!selectedCenter ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Select a center to manage admins</p>
            </div>
          ) : (
            <>
              <div className="mb-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                  Managing: <span className="font-bold">{selectedCenter.name}</span>
                </p>
              </div>

              {showAdminForm && (
                <AdminForm
                  adminId={editingAdmin?.id}
                  initialData={editingAdmin ? { email: editingAdmin.email, fullName: editingAdmin.fullName } : undefined}
                  onSubmit={editingAdmin ? handleUpdateAdmin : handleCreateAdmin}
                  onCancel={() => {
                    setShowAdminForm(false);
                    setEditingAdmin(null);
                  }}
                />
              )}

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {admins.map(admin => (
                  <div
                    key={admin.id}
                    className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{admin.email}</p>
                        {admin.fullName && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{admin.fullName}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingAdmin(admin);
                            setShowAdminForm(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          color="red"
                          onClick={() => handleDeleteAdmin(admin.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {admins.length === 0 && !showAdminForm && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No admins for this center yet</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

