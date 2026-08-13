import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'profile-photos';
const isDev = !connectionString;
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

function getContainerClient() {
  const client = BlobServiceClient.fromConnectionString(connectionString!);
  return client.getContainerClient(containerName);
}

export async function uploadProfilePhoto(
  buffer: Buffer,
  mimeType: string,
  folder: 'users' | 'practitioners' | 'astrologer-photos' | 'astrologer-docs'
): Promise<string> {
  const ext = mimeType.split('/')[1] || 'jpg';
  const fileName = `${uuidv4()}.${ext}`;

  if (isDev) {
    const dir = path.join(LOCAL_UPLOAD_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, fileName), buffer);
    return `/uploads/${folder}/${fileName}`;
  }

  const blobName = `${folder}/${fileName}`;
  const containerClient = getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });
  return blockBlobClient.url;
}

export async function deleteProfilePhoto(url: string): Promise<void> {
  if (isDev) return;
  try {
    const containerClient = getContainerClient();
    const blobName = new URL(url).pathname.split(`/${containerName}/`)[1];
    if (blobName) await containerClient.deleteBlob(blobName);
  } catch {
    // non-fatal
  }
}
