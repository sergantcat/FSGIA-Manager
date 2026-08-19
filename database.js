const Database = require('better-sqlite3');
const path = require('node:path');

const db = new Database(path.join(__dirname, 'appeals.db'));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type_of_punishment TEXT NOT NULL,
    reason_for_punishment TEXT NOT NULL,
    appeal_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    message_id TEXT,
    channel_id TEXT
  );

  CREATE TABLE IF NOT EXISTS case_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    action TEXT NOT NULL,
    action_by TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id)
  );
`);

module.exports = {
  db,
  
  createCase(userId, punishmentType, reason, appealText) {
    const caseCount = db.prepare('SELECT COUNT(*) as count FROM cases').get().count;
    const caseId = `Case-${caseCount + 1}`;
    
    db.prepare(`
      INSERT INTO cases (id, user_id, type_of_punishment, reason_for_punishment, appeal_text, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(caseId, userId, punishmentType, reason, appealText, new Date().toISOString());
    
    return caseId;
  },

  getCase(caseId) {
    return db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId);
  },

  updateCaseStatus(caseId, status, messageId, channelId) {
    db.prepare('UPDATE cases SET status = ?, message_id = ?, channel_id = ? WHERE id = ?')
      .run(status, messageId, channelId, caseId);
  },

  addCaseAction(caseId, action, actionBy, reason) {
    db.prepare(`
      INSERT INTO case_actions (case_id, action, action_by, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(caseId, action, actionBy, reason, new Date().toISOString());
  },

  getCaseActions(caseId) {
    return db.prepare('SELECT * FROM case_actions WHERE case_id = ? ORDER BY created_at DESC').all(caseId);
  }
};
