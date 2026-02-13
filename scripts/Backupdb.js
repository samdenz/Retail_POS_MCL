// scripts/backup-db.js
require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const DB_NAME = process.env.DB_NAME || 'retail_pos_mcl';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';

// Create backups directory if it doesn't exist
const backupsDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir);
}

// Generate filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupFile = path.join(backupsDir, `backup_${DB_NAME}_${timestamp}.sql`);

console.log('Starting database backup...');
console.log(`Database: ${DB_NAME}`);
console.log(`Output file: ${backupFile}\n`);

// Build mysqldump command
const password = DB_PASSWORD ? `-p${DB_PASSWORD}` : '';
const command = `mysqldump -h ${DB_HOST} -u ${DB_USER} ${password} ${DB_NAME} > "${backupFile}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('✗ Backup failed:', error.message);
    return;
  }

  if (stderr) {
    console.error('⚠ Warning:', stderr);
  }

  // Check if file was created
  if (fs.existsSync(backupFile)) {
    const stats = fs.statSync(backupFile);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('✓ Backup completed successfully!');
    console.log(`  File: ${backupFile}`);
    console.log(`  Size: ${fileSizeInMB} MB`);
    console.log(`  Time: ${new Date().toLocaleString()}`);
    
    // Keep only last 10 backups
    cleanupOldBackups(backupsDir, 10);
  } else {
    console.error('✗ Backup file was not created');
  }
});

function cleanupOldBackups(directory, keepCount) {
  const files = fs.readdirSync(directory)
    .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
    .map(file => ({
      name: file,
      path: path.join(directory, file),
      time: fs.statSync(path.join(directory, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Sort by newest first

  if (files.length > keepCount) {
    console.log(`\nCleaning up old backups (keeping ${keepCount} most recent)...`);
    
    files.slice(keepCount).forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`  Deleted: ${file.name}`);
    });
  }
}