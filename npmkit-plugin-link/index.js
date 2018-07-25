const { remote } = require('electron');
const { join } = require('path');
const { getLocalSymlinks, getGlobalSymlinks } = require('./symlinks');

const icon = remote.nativeImage.createFromPath(
  join(__dirname, 'assets/icon.png'),
);

module.exports = {
  name: 'Symlink',
  async getProjectMenu({ project }) {
    const linkedGlobally = await getGlobalSymlinks(project.client);
    const linkedLocally = await getLocalSymlinks(project.path);
    const isLinked = Boolean(
      linkedGlobally.find(link => link.path === project.path),
    );
    console.log({ linkedGlobally });
    console.log({ linkedLocally });
    return new remote.MenuItem({
      label: '🔗 Symlink',
      icon: icon,
      submenu: [
        { label: `Using ${project.client}`, enabled: false },
        { type: 'separator' },
        {
          label: 'Link itself',
          type: 'checkbox',
          checked: isLinked,
          // TODO: toggle global link of module itself
          click() {},
        },
        ...linkedGlobally
          // Skip itself as it already a first option
          .filter(link => link.path !== project.path)
          .map(link => {
            const isLocallyLinked = Boolean(
              linkedLocally.find(localLink => localLink.path === link.path),
            );
            return {
              label: `Link ${link.name}`,
              type: 'checkbox',
              checked: isLocallyLinked,
              // TODO: toggle module link
              click() {},
            };
          }),
      ],
    });
  },
};
