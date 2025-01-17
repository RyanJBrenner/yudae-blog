// https://www.codeconcisely.com/posts/nextjs-storing-images-next-to-markdown/
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fsExtra from 'fs-extra';
import { getFilesRecursively } from './find-files-recusively.mjs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const allowedImageFileExtensions = /^((?!\.md).)*$/; // not markdown
const targetDir = process.env.NEXT_PUBLIC_MD_ASSET_DIR;
const postsDir = process.env.NEXT_PUBLIC_COMMON_MD_DIR;

// ... (existing imports)

function createPostImageFoldersForCopy() {
  const imgSlugs = getFilesRecursively(postsDir, allowedImageFileExtensions);

if (!Array.isArray(imgSlugs) || imgSlugs.length === 0) {
  console.error('Error: No image slugs found.');
  return;
}
  console.log('Image Slugs:', imgSlugs);

  for (const relSlug of imgSlugs) {
    const currSlug = path.join(postsDir, relSlug);
    const targetSlug = path.join(targetDir, relSlug);
    const slugDir = path.dirname(targetSlug);

    console.log('Current Slug:', currSlug);
    console.log('Target Slug:', targetSlug);

    // Ensure directory exists before copying
    fsExtra.ensureDirSync(slugDir);

    // Check if the current file exists before copying
    if (fs.existsSync(currSlug)) {
      try {
        fs.copyFileSync(currSlug, targetSlug);
        console.log(`Successfully copied: ${relSlug}`);
      } catch (error) {
        console.error(`Error copying ${relSlug}: ${error.message}`);
      }
    } else {
      console.error(`Error: Source file not found for ${relSlug}`);
    }
  }
}

// Call the function
createPostImageFoldersForCopy();
