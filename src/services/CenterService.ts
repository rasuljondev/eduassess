import type { Center } from '../types';

export interface CreateCenterData {
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface UpdateCenterData {
  name?: string;
  slug?: string;
  logoUrl?: string;
}

export interface CreateAdminData {
  email: string;
  password?: string; // Optional for updates, required for creation
  fullName?: string;
  telegramId?: number; // Optional Telegram ID for bot integration
}

export interface CenterAdmin {
  id: string;
  email: string;
  fullName?: string;
  centerId: string;
  telegramId?: number;
}

export interface CenterService {
  getCenterBySlug(slug: string): Promise<Center | null>;
  getAllCenters(): Promise<Center[]>;
  createCenter(data: CreateCenterData): Promise<Center>;
  updateCenter(id: string, data: UpdateCenterData): Promise<Center>;
  deleteCenter(id: string): Promise<void>;
  createCenterAdmin(centerId: string, adminData: CreateAdminData): Promise<CenterAdmin>;
  getCenterAdmins(centerId: string): Promise<CenterAdmin[]>;
  updateCenterAdmin(adminId: string, data: Partial<CreateAdminData>): Promise<CenterAdmin>;
  deleteCenterAdmin(adminId: string): Promise<void>;
}
