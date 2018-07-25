const { resolve, join } = require('path');
const { userInfo } = require('os');
const { pathExists, readdir, lstat, realpath } = require('fs-extra');
const execa = require('execa');

function Symlink({ name, path }) {
  return { name, path };
}

async function traverse(directory, scope = null) {
  const context = resolve(directory);
  if (await pathExists(context)) {
    const files = await readdir(context);
    const result = [];
    for (const name of files) {
      const path = join(context, name);
      // Handle scoped packages
      if (name.startsWith('@')) {
        const [scopePrefix] = name.split('/', 1);
        const scoped = await traverse(path, scopePrefix);
        result.push(...scoped);
        continue;
      }
      // Check if file is symlinked
      const stats = await lstat(path);
      if (stats.isSymbolicLink()) {
        const possiblyScopedName = scope ? [scope, name].join('/') : name;
        const realPath = await realpath(path);
        result.push(
          Symlink({
            name: possiblyScopedName,
            path: realPath,
          }),
        );
        continue;
      }
    }
    return result;
  }
  return [];
}

async function getLocalSymlinks(root) {
  return await traverse(join(root, 'node_modules'));
}

async function getGlobalSymlinks(client) {
  const { shell, homedir } = userInfo();
  switch (client) {
    default:
    case 'npm': {
      const npmGlobalModules = await execa.stdout(
        'npm',
        ['root', '--global', '--no-update-notifier'],
        { cwd: homedir, shell },
      );
      return await traverse(npmGlobalModules);
    }
    case 'yarn': {
      const yarnLinksDir =
        process.platform === 'win32'
          ? 'AppData/Local/Yarn/config/link'
          : '.config/yarn/link';
      return await traverse(join(homedir, yarnLinksDir));
    }
  }
}

module.exports = {
  getLocalSymlinks,
  getGlobalSymlinks,
};
