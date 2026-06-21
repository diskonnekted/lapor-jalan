import localforage from 'localforage';

const STORE_NAME = 'laporan_drafts';

const draftStore = localforage.createInstance({
  name: 'peta-jalan-banjarnegara',
  storeName: STORE_NAME,
});

export const offlineStore = {
  async addDraft(draft) {
    const id = Date.now().toString();
    await draftStore.setItem(id, { ...draft, id, synced: false, createdAt: new Date().toISOString() });
    return id;
  },

  async getAllDrafts() {
    const drafts = [];
    await draftStore.iterate((value) => {
      drafts.push(value);
    });
    return drafts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getUnsyncedDrafts() {
    const drafts = await this.getAllDrafts();
    return drafts.filter((d) => !d.synced);
  },

  async markSynced(id) {
    const draft = await draftStore.getItem(id);
    if (draft) {
      await draftStore.setItem(id, { ...draft, synced: true });
    }
  },

  async removeDraft(id) {
    await draftStore.removeItem(id);
  },

  async clearAll() {
    await draftStore.clear();
  },

  getPendingCount: async function () {
    const drafts = await this.getUnsyncedDrafts();
    return drafts.length;
  },
};

// Online/offline detection
export function onOnlineStatusChange(callback) {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
}

export function isOnline() {
  return navigator.onLine;
}
