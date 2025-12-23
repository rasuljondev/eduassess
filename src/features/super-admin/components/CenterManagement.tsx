import React, { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { useAlert } from '../../../shared/ui/AlertProvider';
import { ImageUploader } from '../../../shared/ui/ImageUploader';
import type { CreateCenterData, CreateAdminData } from '../../../services/CenterService';
import { X, Save, Edit2, Trash2, Plus, UserPlus } from 'lucide-react';

interface CenterFormProps {
  centerId?: string;
  initialData?: {
    name: string;
    slug: string;
    logoUrl?: string;
  };
  onSubmit: (data: CreateCenterData) => Promise<void>;
  onCancel: () => void;
}

export const CenterForm: React.FC<CenterFormProps> = ({
  centerId,
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({ name, slug, logoUrl: logoUrl || undefined });
      showSuccess(centerId ? 'Center updated successfully!' : 'Center created successfully!');
    } catch (err: any) {
      showError(err.message || 'Failed to save center');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!centerId && !slug) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Center Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="e.g., LSL Education Center"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Slug (URL identifier) *
        </label>
        <input
          type="text"
          value={slug}
          onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="e.g., lsl"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Used in URLs: exam.uz/{slug}/ielts
        </p>
      </div>

      <ImageUploader
        bucketName="center-logos"
        currentImageUrl={logoUrl}
        onUploadComplete={(url) => setLogoUrl(url)}
        onRemove={() => setLogoUrl('')}
        recommendedSize="200x200"
        maxSizeMB={2}
        accept="image/png,image/jpeg,image/webp"
      />

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" color="indigo" isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
          {centerId ? 'Update' : 'Create'} Center
        </Button>
      </div>
    </form>
  );
};

interface AdminFormProps {
  adminId?: string;
  initialData?: {
    email: string;
    fullName?: string;
    telegramId?: number;
  };
  onSubmit: (data: CreateAdminData) => Promise<void>;
  onCancel: () => void;
}

export const AdminForm: React.FC<AdminFormProps> = ({
  adminId,
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [telegramId, setTelegramId] = useState(initialData?.telegramId?.toString() || '');
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!adminId && !password) {
        showError('Password is required for new admins');
        setLoading(false);
        return;
      }
      
      await onSubmit({
        email,
        password: password || undefined,
        fullName: fullName || undefined,
        telegramId: telegramId ? parseInt(telegramId, 10) : undefined,
      } as CreateAdminData);
      showSuccess(adminId ? 'Admin updated successfully!' : 'Admin created successfully!');
      if (!adminId) {
        setEmail('');
        setPassword('');
        setFullName('');
        setTelegramId('');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email *
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="admin@center.com"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Password {adminId ? '(leave empty to keep current)' : '*'}
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required={!adminId}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Full Name (optional)
        </label>
        <input
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="John Doe"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Telegram ID (Optional)
        </label>
        <input
          type="number"
          value={telegramId}
          onChange={e => setTelegramId(e.target.value)}
          placeholder="123456789"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Optional: Telegram user ID for bot integration. Get it from @userinfobot on Telegram.
        </p>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" color="indigo" size="sm" isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
          {adminId ? 'Update' : 'Create'} Admin
        </Button>
      </div>
    </form>
  );
};

