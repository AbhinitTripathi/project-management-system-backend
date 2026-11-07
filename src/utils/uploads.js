import fs from 'fs/promises';
export const removeUploads = async (files = []) => {
  await Promise.allSettled(files.map((file) => fs.unlink(file.path)));
};
