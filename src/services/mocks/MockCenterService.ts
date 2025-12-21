import type { CenterService } from '../CenterService';
import type { Center, CenterAdmin } from '../../types';
import type { CreateCenterData, UpdateCenterData, CreateAdminData } from '../CenterService';
import { mockState } from './MockState';

export class MockCenterService implements CenterService {
  async getCenterBySlug(slug: string): Promise<Center | null> {
    return mockState.centers.find(c => c.slug === slug) || null;
  }

  async getAllCenters(): Promise<Center[]> {
    return mockState.centers;
  }

  async createCenter(data: CreateCenterData): Promise<Center> {
    const center: Center = {
      id: Math.random().toString(36).substring(2),
      slug: data.slug,
      name: data.name,
      logoUrl: data.logoUrl,
    };
    mockState.centers.push(center);
    return center;
  }

  async updateCenter(id: string, data: UpdateCenterData): Promise<Center> {
    const center = mockState.centers.find(c => c.id === id);
    if (!center) throw new Error('Center not found');
    
    if (data.name !== undefined) center.name = data.name;
    if (data.slug !== undefined) center.slug = data.slug;
    if (data.logoUrl !== undefined) center.logoUrl = data.logoUrl;
    
    return center;
  }

  async deleteCenter(id: string): Promise<void> {
    const index = mockState.centers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Center not found');
    
    // Also delete associated admins
    mockState.centerAdmins = mockState.centerAdmins.filter(a => a.centerId !== id);
    mockState.centers.splice(index, 1);
  }

  async createCenterAdmin(centerId: string, adminData: CreateAdminData): Promise<CenterAdmin> {
    // Check if center exists
    const center = mockState.centers.find(c => c.id === centerId);
    if (!center) throw new Error('Center not found');

    // Password is required for new admins
    if (!adminData.password) {
      throw new Error('Password is required for new admins');
    }

    // Check if email already exists
    const existingAdmin = mockState.centerAdmins.find(a => a.email === adminData.email);
    if (existingAdmin) throw new Error('Admin with this email already exists');

    // Check if email already exists in users
    const existingUser = mockState.users.find(u => u.login === adminData.email);
    if (existingUser) throw new Error('User with this email already exists');

    // Create admin user in mock users
    const adminUser: CenterAdmin = {
      id: Math.random().toString(36).substring(2),
      email: adminData.email,
      centerId: centerId,
      fullName: adminData.fullName,
    };

    // Also add to users for authentication (password is stored in mock, but in real app it would be in auth system)
    mockState.users.push({
      id: adminUser.id,
      login: adminData.email,
      role: 'CENTER_ADMIN',
      centerSlug: center.slug,
      fullName: adminData.fullName,
    });

    mockState.centerAdmins.push(adminUser);
    return adminUser;
  }

  async getCenterAdmins(centerId: string): Promise<CenterAdmin[]> {
    return mockState.centerAdmins.filter(a => a.centerId === centerId);
  }

  async updateCenterAdmin(adminId: string, data: Partial<CreateAdminData>): Promise<CenterAdmin> {
    const admin = mockState.centerAdmins.find(a => a.id === adminId);
    if (!admin) throw new Error('Admin not found');

    if (data.email !== undefined) {
      // Check if email is already taken by another admin
      const existingAdmin = mockState.centerAdmins.find(a => a.email === data.email && a.id !== adminId);
      if (existingAdmin) throw new Error('Admin with this email already exists');
      
      admin.email = data.email;
      // Update user login as well
      const user = mockState.users.find(u => u.id === adminId);
      if (user) user.login = data.email;
    }

    if (data.fullName !== undefined) {
      admin.fullName = data.fullName;
      // Update user fullName as well
      const user = mockState.users.find(u => u.id === adminId);
      if (user) user.fullName = data.fullName;
    }

    return admin;
  }

  async deleteCenterAdmin(adminId: string): Promise<void> {
    const index = mockState.centerAdmins.findIndex(a => a.id === adminId);
    if (index === -1) throw new Error('Admin not found');
    
    // Also remove from users
    const userIndex = mockState.users.findIndex(u => u.id === adminId);
    if (userIndex !== -1) {
      mockState.users.splice(userIndex, 1);
    }
    
    mockState.centerAdmins.splice(index, 1);
  }
}

