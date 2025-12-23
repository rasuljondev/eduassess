import type { ExamRequest } from '../types';

export interface ExamRequestService {
  // Student creates request
  createRequest(data: {
    center_id: string;
    exam_type: string;
    test_id?: string;
  }): Promise<ExamRequest>;

  // Get user's requests for a center
  getUserRequests(centerId: string): Promise<ExamRequest[]>;
  
  // Get user's request status for a specific exam
  getUserRequestStatus(centerId: string, examType: string): Promise<ExamRequest | null>;

  // Admin: List pending requests for center
  listPendingRequests(centerId: string): Promise<ExamRequest[]>;
  
  // Admin: List all requests for center
  listAllRequests(centerId: string): Promise<ExamRequest[]>;

  // Admin: Approve request
  approveRequest(requestId: string): Promise<void>;

  // Admin: Reject request
  rejectRequest(requestId: string): Promise<void>;
}

