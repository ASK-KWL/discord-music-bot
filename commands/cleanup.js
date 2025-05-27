const fs = require('fs');
const path = require('path');
const os = require('os');

// Temporary directory for downloads
const TEMP_DIR = path.join(os.tmpdir(), 'discord-music-bot');

module.exports = {
  name: 'cleanup',
  execute(message) {
    cleanupTempFiles();
    message.channel.send('🧹 Manual cleanup initiated!');
  },
};

function cleanupTempFiles() {
  if (!fs.existsSync(TEMP_DIR)) {
    console.log('No temp directory found');
    return;
  }
  
  try {
    const files = fs.readdirSync(TEMP_DIR);
    console.log(`🧹 Starting manual cleanup of ${files.length} files...`);
    
    files.forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      const stats = fs.statSync(filePath);
      const now = Date.now();
      const fileAge = now - stats.mtime.getTime();
      
      // Delete files older than 1 minute
      if (fileAge > 60 * 1000) {
        attemptFileCleanup(filePath, file);
      } else {
        console.log(`⏳ Skipping recent file: ${file} (${Math.round(fileAge/1000)}s old)`);
      }
    });
  } catch (error) {
    console.error('Error during manual cleanup:', error);
  }
}

function attemptFileCleanup(filePath, fileName, retryCount = 0) {
  const maxRetries = 3;
  
  try {
    fs.unlinkSync(filePath);
    console.log(`✅ Manually cleaned up: ${fileName}`);
  } catch (error) {
    if (error.code === 'EBUSY' && retryCount < maxRetries) {
      console.log(`⏳ File ${fileName} busy, retrying in 3 seconds...`);
      setTimeout(() => {
        attemptFileCleanup(filePath, fileName, retryCount + 1);
      }, 3000);
    } else if (error.code === 'ENOENT') {
      console.log(`✅ File ${fileName} already deleted`);
    } else {
      console.error(`❌ Manual cleanup failed for ${fileName}:`, error.message);
    }
  }
}