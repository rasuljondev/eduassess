import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { useAlert } from '../ui/AlertProvider';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

export interface ImageUploaderProps {
  bucketName: string;
  folder?: string; // Optional folder within bucket
  currentImageUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  maxSizeMB?: number;
  recommendedSize?: string; // e.g., "100x100"
  accept?: string; // e.g., "image/png,image/jpeg"
  aspectRatio?: string; // e.g., "1/1" for square
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  bucketName,
  folder = '',
  currentImageUrl,
  onUploadComplete,
  onRemove,
  maxSizeMB = 2,
  recommendedSize = '100x100',
  accept = 'image/png,image/jpeg,image/webp',
  aspectRatio,
  className = '',
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showError, showSuccess } = useAlert();

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!accept.split(',').some(type => file.type.match(type.trim()))) {
      return `Invalid file type. Please upload: ${accept}`;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      showError(error);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        // Provide helpful error message for RLS issues
        if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
          throw new Error(
            'Permission denied: Storage bucket RLS policy is blocking upload. ' +
            'Please run STORAGE_RLS_POLICIES.sql in your Supabase SQL Editor to fix this.'
          );
        }
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      showSuccess('Image uploaded successfully!');
      onUploadComplete(urlData.publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      showError(err.message || 'Failed to upload image');
      setPreview(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleRemove = async () => {
    if (currentImageUrl) {
      // Extract file path from URL
      try {
        const url = new URL(currentImageUrl);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.findIndex(part => part === bucketName);
        if (bucketIndex !== -1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          await supabase.storage.from(bucketName).remove([filePath]);
        }
      } catch (err) {
        console.error('Error removing file:', err);
      }
    }

    setPreview(null);
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Logo Image
      </label>
      
      {/* Info Box */}
      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Recommended:</strong> Transparent PNG, {recommendedSize}px, max {maxSizeMB}MB
        </p>
      </div>

      {/* Preview */}
      {preview && (
        <div className="mb-3 relative inline-block">
          <div className="relative w-32 h-32 border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Upload Area */}
      {!preview && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileSelect(file);
              }
            }}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag and drop an image here, or
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Upload className="w-4 h-4" />}
                    className="mt-2"
                  >
                    Browse Files
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  PNG, JPEG, or WebP • Max {maxSizeMB}MB
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Change Image Button (when preview exists) */}
      {preview && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          leftIcon={<Upload className="w-4 h-4" />}
        >
          Change Image
        </Button>
      )}
    </div>
  );
};

