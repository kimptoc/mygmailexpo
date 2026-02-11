import { buildFolderListItems } from './folder-list';

const makeFolders = (count: number) => (
  Array.from({ length: count }, (_, index) => ({
    id: `f${index + 1}`,
    name: `Folder ${index + 1}`,
  }))
);

describe('buildFolderListItems', () => {
  it('caps recent folders at the provided limit', () => {
    const folders = makeFolders(12);
    const recentFolderIds = folders.map(folder => folder.id);

    const items = buildFolderListItems({
      folders,
      recentFolderIds,
      columnCount: 1,
      recentLimit: 10,
    });

    const recentItems = items.filter(item => item.type === 'folder' && item.icon === 'clock');
    const allItems = items.filter(item => item.type === 'folder' && item.icon === 'folder');

    expect(recentItems).toHaveLength(10);
    expect(allItems).toHaveLength(2);
  });

  it('inserts a spacer so section headers start in the left column', () => {
    const folders = makeFolders(3);
    const recentFolderIds = [folders[0].id];

    const items = buildFolderListItems({
      folders,
      recentFolderIds,
      columnCount: 2,
      recentLimit: 10,
    });

    const spacerIndex = items.findIndex(
      item => item.type === 'spacer' && item.id === 'all-spacer-pre'
    );
    const headerIndex = items.findIndex(
      item => item.type === 'header' && item.id === 'all'
    );

    expect(spacerIndex).toBeGreaterThan(-1);
    expect(headerIndex).toBeGreaterThan(spacerIndex);
  });

  it('filters recent folders based on filtered folders when searching', () => {
    const folders = makeFolders(3);
    const recentFolderIds = [folders[0].id, folders[1].id];
    const filteredFolders = [folders[1]];

    const items = buildFolderListItems({
      folders,
      recentFolderIds,
      filteredFolders,
      searchQuery: 'folder 2',
      columnCount: 1,
      recentLimit: 10,
    });

    const recentItems = items.filter(item => item.type === 'folder' && item.icon === 'clock');
    const allItems = items.filter(item => item.type === 'folder' && item.icon === 'folder');

    expect(recentItems).toHaveLength(1);
    expect(recentItems[0]).toMatchObject({ id: folders[1].id });
    expect(allItems).toHaveLength(0);
  });
});
