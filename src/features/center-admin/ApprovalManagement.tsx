import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { SupabaseExamRequestService } from '../../services/supabase/SupabaseExamRequestService';
import { Button } from '../../shared/ui/Button';
import { useAlert } from '../../shared/ui/AlertProvider';
import { supabase } from '../../lib/supabase';
import type { ExamRequest } from '../../types';

const examRequestService = new SupabaseExamRequestService();

export const ApprovalManagement: React.FC = () => {
  const { user } = useAuthStore();
  const { showSuccess, showError } = useAlert();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [requests, setRequests] = useState<ExamRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    if (!user?.centerSlug) return;
    
    setLoading(true);
    try {
      // Get center ID from slug
      const { data: center } = await supabase
        .from('centers')
        .select('id')
        .eq('slug', user.centerSlug)
        .single();

      if (!center) return;

      const data = filter === 'pending' 
        ? await examRequestService.listPendingRequests(center.id)
        : await examRequestService.listAllRequests(center.id);
      
      setRequests(data);
    } catch (err: any) {
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await examRequestService.approveRequest(requestId);
      showSuccess('Request approved successfully');
      await loadRequests();
    } catch (err: any) {
      showError(err.message || 'Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await examRequestService.rejectRequest(requestId);
      showSuccess('Request rejected');
      await loadRequests();
    } catch (err: any) {
      showError(err.message || 'Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleSelect = (requestId: string) => {
    setSelectedRequests(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const pendingRequests = requests.filter(r => r.status === 'pending');
    if (selectedRequests.size === pendingRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(pendingRequests.map(r => r.id)));
    }
  };

  const handleApproveSelected = async () => {
    if (selectedRequests.size === 0) return;
    
    setBulkProcessing(true);
    const requestIds = Array.from(selectedRequests);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const requestId of requestIds) {
        try {
          await examRequestService.approveRequest(requestId);
          successCount++;
        } catch (err: any) {
          console.error(`Failed to approve ${requestId}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        showSuccess(`Successfully approved ${successCount} request${successCount > 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        showError(`Failed to approve ${failCount} request${failCount > 1 ? 's' : ''}`);
      }

      setSelectedRequests(new Set());
      await loadRequests();
    } catch (err: any) {
      showError(err.message || 'Failed to approve requests');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleApproveAll = async () => {
    const pendingRequests = requests.filter(r => r.status === 'pending');
    if (pendingRequests.length === 0) return;

    setBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const request of pendingRequests) {
        try {
          await examRequestService.approveRequest(request.id);
          successCount++;
        } catch (err: any) {
          console.error(`Failed to approve ${request.id}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        showSuccess(`Successfully approved ${successCount} request${successCount > 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        showError(`Failed to approve ${failCount} request${failCount > 1 ? 's' : ''}`);
      }

      setSelectedRequests(new Set());
      await loadRequests();
    } catch (err: any) {
      showError(err.message || 'Failed to approve requests');
    } finally {
      setBulkProcessing(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        Exam Requests
      </h1>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-4">
          <Button
            color={filter === 'pending' ? 'indigo' : 'gray'}
            onClick={() => setFilter('pending')}
          >
            Pending {pendingCount > 0 && `(${pendingCount})`}
          </Button>
          <Button
            color={filter === 'all' ? 'indigo' : 'gray'}
            onClick={() => setFilter('all')}
          >
            All Requests
          </Button>
        </div>
        {filter === 'pending' && pendingCount > 0 && (
          <div className="flex gap-2">
            <Button
              color="green"
              onClick={selectedRequests.size > 0 ? handleApproveSelected : handleApproveAll}
              disabled={bulkProcessing}
            >
              {selectedRequests.size > 0 ? `Approve Selected (${selectedRequests.size})` : 'Approve All'}
            </Button>
          </div>
        )}
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No requests found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {filter === 'pending' && (
                  <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 w-12">
                    <input
                      type="checkbox"
                      checked={pendingRequests.length > 0 && selectedRequests.size === pendingRequests.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                  </th>
                )}
                <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Student</th>
                <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Login</th>
                <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Exam Type</th>
                <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Test Name</th>
                <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Requested</th>
                <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-t border-gray-200 dark:border-gray-700">
                  {filter === 'pending' && (
                    <td className="py-3 px-4">
                      {req.status === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedRequests.has(req.id)}
                          onChange={() => handleToggleSelect(req.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                      )}
                    </td>
                  )}
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {req.user?.surname && req.user?.name 
                      ? `${req.user.surname} ${req.user.name}`
                      : req.user?.name || req.user?.login || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono">
                    {req.user?.login || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200 uppercase">
                    {req.exam_type || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {req.test?.name || (req.test_id ? `Test ID: ${req.test_id}` : 'Any Test')}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {new Date(req.requested_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 rounded text-sm ${
                      req.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {req.status === 'pending' ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          color="green"
                          onClick={() => handleApprove(req.id)}
                          disabled={processing === req.id}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          color="red"
                          onClick={() => handleReject(req.id)}
                          disabled={processing === req.id}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">
                        {req.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

