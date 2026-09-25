class FakeDb {
  constructor() {
    this.roles = ['SuperAdmin', 'Admin', 'ReadOnly'];
    this.users = [];
    this.nextId = 1;
  }

  async countUsers() {
    return this.users.length;
  }

  async findUserByUsername(username) {
    return this.users.find((u) => u.username === username) || null;
  }

  async createUser({ username, password, role }) {
    const user = { id: this.nextId++, username, password, role, token: null };
    this.users.push(user);
    return user;
  }

  async listUsers() {
    return this.users.map(({ id, username, role }) => ({ id, username, role }));
  }

  async setToken(userId, token) {
    const user = this.users.find((u) => u.id === userId);
    if (user) user.token = token;
  }

  async findUserByToken(token) {
    return this.users.find((u) => u.token === token) || null;
  }
}

module.exports = { FakeDb };
