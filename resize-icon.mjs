import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, 'public', 'logoHeader.png');
const dst = join(__dirname, '.claude', 'worktrees', 'wonderful-jemison', 'app', 'icon.png');

await sharp(src).resize(32, 32).toFile(dst);
console.log('done');
