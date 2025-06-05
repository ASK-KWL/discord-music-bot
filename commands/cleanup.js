const fs = require('fs');
const path = require('path');
const os = require('os');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// Temporary directory for downloads
const TEMP_DIR = path.join(os.tmpdir(), 'discord-music-bot');

module.exports = {
  name: 'cleanup',
  aliases: ['clear', 'clean', 'purge'],
  async execute(message, args) {
    try {
      // Check if user has manage messages permission
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Permission Denied')
          .setDescription('You need **Manage Messages** permission to use this command.')
          .setTimestamp();
        return message.channel.send({ embeds: [errorEmbed] });
      }

      // Parse arguments
      let limit = 50;
      let targetUserId = message.client.user.id;
      let deleteUserMessages = false;

      if (args.length > 0) {
        if (args.includes('--all') || args.includes('-a')) {
          deleteUserMessages = true;
          args = args.filter(arg => arg !== '--all' && arg !== '-a');
        }

        const numberArg = args.find(arg => !isNaN(parseInt(arg)));
        if (numberArg) {
          limit = Math.min(100, Math.max(1, parseInt(numberArg)));
        }

        const userMention = message.mentions.users.first();
        if (userMention) {
          targetUserId = userMention.id;
        }
      }

      // Send a temporary status message that we'll delete quickly
      const tempMessage = await message.channel.send('🧹 **Cleaning up messages...**');

      // Fetch messages
      let messages;
      try {
        messages = await message.channel.messages.fetch({ limit: Math.min(100, limit + 2) });
      } catch (fetchError) {
        console.error('Failed to fetch messages:', fetchError);
        await tempMessage.edit('❌ Failed to fetch messages. Try again later.');
        setTimeout(() => tempMessage.delete().catch(() => {}), 5000);
        return;
      }
      
      let messagesToDelete = [];

      if (deleteUserMessages) {
        messagesToDelete = messages.filter(msg => {
          return (msg.author.bot || 
                 msg.content.startsWith('!') || 
                 msg.content.startsWith(message.client.user.toString())) &&
                 (Date.now() - msg.createdTimestamp) < 14 * 24 * 60 * 60 * 1000;
        });
      } else {
        messagesToDelete = messages.filter(msg => {
          return msg.author.id === targetUserId &&
                 (Date.now() - msg.createdTimestamp) < 14 * 24 * 60 * 60 * 1000;
        });
      }

      // Filter out the status message from deletion
      messagesToDelete = messagesToDelete.filter(msg => msg.id !== tempMessage.id);

      if (messagesToDelete.size === 0) {
        await tempMessage.edit('📭 **No messages found to delete.**');
        setTimeout(() => tempMessage.delete().catch(() => {}), 5000);
        return;
      }

      // Delete messages
      let deletedCount = 0;
      const totalToDelete = messagesToDelete.size;
      
      try {
        if (messagesToDelete.size === 1) {
          await messagesToDelete.first().delete();
          deletedCount = 1;
        } else if (messagesToDelete.size <= 100) {
          try {
            await message.channel.bulkDelete(messagesToDelete, true);
            deletedCount = messagesToDelete.size;
          } catch (bulkError) {
            console.error('Bulk delete failed:', bulkError);
            
            // Update temp message to show progress
            await tempMessage.edit('🔄 **Bulk delete failed, deleting individually...**');
            
            for (const [index, msg] of Array.from(messagesToDelete.values()).entries()) {
              try {
                await msg.delete();
                deletedCount++;
                
                // Update progress every 10 deletions
                if ((index + 1) % 10 === 0) {
                  try {
                    await tempMessage.edit(`🔄 **Deleting... ${deletedCount}/${totalToDelete}**`);
                  } catch (editError) {
                    // Temp message was deleted, continue silently
                  }
                }
                
                await new Promise(resolve => setTimeout(resolve, 200));
              } catch (deleteError) {
                console.error(`Failed to delete message ${msg.id}:`, deleteError);
              }
            }
          }
        }
      } catch (deleteError) {
        console.error('Delete operation failed:', deleteError);
      }

      // Show final result briefly then delete
      const resultMessage = `✅ **Cleanup complete!** Deleted ${deletedCount} of ${totalToDelete} messages.`;
      
      try {
        await tempMessage.edit(resultMessage);
        
        // Delete the result message after 3 seconds
        setTimeout(() => {
          if (tempMessage && !tempMessage.deleted) {
            tempMessage.delete().catch(() => {});
          }
        }, 3000);
        
      } catch (editError) {
        // If we can't edit, send a new message
        try {
          const newResultMessage = await message.channel.send(resultMessage);
          setTimeout(() => {
            if (newResultMessage && !newResultMessage.deleted) {
              newResultMessage.delete().catch(() => {});
            }
          }, 3000);
        } catch (sendError) {
          console.error('Failed to send result message:', sendError);
        }
      }

    } catch (error) {
      console.error('Cleanup command error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Cleanup Failed')
        .setDescription(`An error occurred: ${error.message}`)
        .setTimestamp();

      try {
        const errorMessage = await message.channel.send({ embeds: [errorEmbed] });
        setTimeout(() => errorMessage.delete().catch(() => {}), 10000);
      } catch (sendError) {
        console.error('Failed to send error message:', sendError);
      }
    }
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