const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface InitUploadResponse {
  uploadUrl: string;
  imageId: string;
  gcsPath: string;
  contentType: string;
}

export interface CompleteUploadResponse {
  image: {
    id: string;
    url: string;
    thumbnailUrl: string;
    title: string;
    description: string;
    uploadedAt: string;
    uploaderId: string;
  };
  analysis: {
    title: string;
    description: string;
    attributes: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
  };
}

/**
 * Initialize upload - get signed GCS URL
 */
export async function initUpload(
  file: File,
  token: string
): Promise<InitUploadResponse> {
  const response = await fetch(`${API_BASE_URL}/uploads/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to initialize upload');
  }

  return response.json();
}

/**
 * Upload file to GCS using signed URL
 */
export async function uploadToGCS(
  file: File,
  signedUrl: string,
  contentType: string
): Promise<void> {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file to GCS');
  }
}

/**
 * Complete upload - trigger AI analysis and graph creation
 */
export async function completeUpload(
  imageId: string,
  gcsPath: string,
  token: string
): Promise<CompleteUploadResponse> {
  const response = await fetch(`${API_BASE_URL}/uploads/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      imageId,
      gcsPath,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to complete upload');
  }

  return response.json();
}
