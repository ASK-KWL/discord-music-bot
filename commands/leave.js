const musicQueue = require('../music/queue');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Temporary directory for downloads
const TEMP_DIR = path.join(os.tmpdir(), 'discord-music-bot');

module.exports = {
  name: 'leave',
  aliases: ['disconnect', 'dc'],
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ You need to be in a voice channel!');
      }

      const queue = musicQueue.getQueueList(message.guild.id);
      
      if (!queue.current && queue.queue.length === 0) {
        return message.channel.send('❌ I\'m not connected to any voice channel!');
      }

      let leaveMessage = '👋 **Disconnected from voice channel!**';
      
      if (queue.current) {
        leaveMessage += `\n⏹️ Stopped: **${queue.current.title}**`;
      }
      
      if (queue.queue.length > 0) {
        leaveMessage += `\n📭 Cleared ${queue.queue.length} song${queue.queue.length > 1 ? 's' : ''} from queue`;
      }

      musicQueue.stop(message.guild.id);
      message.channel.send(leaveMessage);

    } catch (error) {
      console.error('Leave command error:', error);
      message.channel.send('❌ Error leaving voice channel!');
    }
  },
};

function cleanupTempFiles() {
  if (!fs.existsSync(TEMP_DIR)) return;
  
  try {
    const files = fs.readdirSync(TEMP_DIR);
    console.log(`Found ${files.length} temp files to clean up`);
    
    files.forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      attemptFileCleanup(filePath, file);
    });
  } catch (error) {
    console.error('Error reading temp directory:', error);
  }
}

function attemptFileCleanup(filePath, fileName, retryCount = 0) {
  const maxRetries = 5;
  const retryDelay = 2000 * (retryCount + 1);
  
  try {
    // Check if file is still locked by trying to read it
    const fd = fs.openSync(filePath, 'r+');
    fs.closeSync(fd);
    
    // If we can open it, it's safe to delete
    fs.unlinkSync(filePath);
    console.log(`✅ Cleaned up temp file: ${fileName}`);
  } catch (error) {
    if ((error.code === 'EBUSY' || error.code === 'ENOENT') && retryCount < maxRetries) {
      console.log(`⏳ File ${fileName} still in use, retry ${retryCount + 1}/${maxRetries} in ${retryDelay}ms...`);
      setTimeout(() => {
        attemptFileCleanup(filePath, fileName, retryCount + 1);
      }, retryDelay);
    } else if (error.code === 'ENOENT') {
      console.log(`✅ File ${fileName} already deleted`);
    } else {
      console.error(`❌ Could not delete ${fileName} after ${retryCount + 1} attempts:`, error.message);
    }
  }
}