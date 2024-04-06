import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8');
const version = JSON.parse(data).version;

fs.writeFileSync(
  path.resolve(__dirname, '../src/version.ts'),
  `export default '${version}';
`,
  'utf8'
);
