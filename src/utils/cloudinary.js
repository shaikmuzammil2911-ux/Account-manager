export const CLOUDINARY_CLOUD_NAME = 'f7nm8ylt';
export const CLOUDINARY_UPLOAD_PRESET = 'ml_default';

/**
 * Uploads an image file directly to Cloudinary using unsigned upload preset
 * @param {File|Blob} file 
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadToCloudinary(file) {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `Cloudinary upload failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    url: data.secure_url || data.url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format
  };
}
