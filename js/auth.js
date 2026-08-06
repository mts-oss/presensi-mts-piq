/* js/auth.js */

import { store } from './store.js';

export const auth = {
  login(kode, password) {
    const users = store.getUsers();
    const user = users.find(u =>
      u.kode.toLowerCase() === kode.trim().toLowerCase() &&
      u.password_hash === password
    );

    if (!user) {
      return { success: false, message: 'Kode atau kata sandi tidak valid.' };
    }

    store.setCurrentUser(user);
    return { success: true, user };
  },

  logout() {
    store.clearCurrentUser();
    window.location.hash = '';
    window.location.reload();
  },

  isAuthenticated() {
    return store.getCurrentUser() !== null;
  },

  getCurrentUser() {
    return store.getCurrentUser();
  }
};
