import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'profile-photos';

function getContainerClient() {
  const client = BlobServiceClient.fromConnectionString(connectionString);
  return client.getContainerClient(containerName);
}

export async function uploadProfilePhoto(
  buffer: Buffer,
  mimeType: string,
  folder: 'users' | 'practitioners'
): Promise<string> {
  const ext = mimeType.split('/')[1] || 'jpg';
  const blobName = `${folder}/${uuidv4()}.${ext}`;
  const containerClient = getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  return blockBlobClient.url;
}

export async function deleteProfilePhoto(url: string): Promise<void> {
  try {
    const containerClient = getContainerClient();
    const blobName = new URL(url).pathname.split(`/${containerName}/`)[1];
    if (blobName) await containerClient.deleteBlob(blobName);
  } catch {
    // non-fatal
  }
}
