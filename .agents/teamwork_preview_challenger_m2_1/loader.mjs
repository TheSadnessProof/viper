import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const parentURL = context.parentURL;
      if (parentURL) {
        const resolved = new URL(specifier, parentURL);
        const filePath = fileURLToPath(resolved);
        if (existsSync(filePath + '.ts')) {
          return nextResolve(pathToFileURL(filePath + '.ts').href, context);
        }
        if (existsSync(filePath + '.js')) {
          return nextResolve(pathToFileURL(filePath + '.js').href, context);
        }
      }
    }
    throw err;
  }
}
