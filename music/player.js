const { createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('ffmpeg-static');
const ytdl = require('youtube-dl-exec');
const os = require('os');

// Temporary directory for downloads
const TEMP_DIR = path.join(os.tmpdir(), 'discord-music-bot');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function createAudioConnection(message) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) throw new Error('Join a voice channel first.');

  console.log(`Creating voice connection to channel: ${voiceChannel.id}`);
  return joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
  });
}

async function downloadAndConvertAudio(videoUrl) {
  console.log(`Downloading and converting audio from: ${videoUrl}`);
  
  const timestamp = Date.now();
  const tempFile = path.join(TEMP_DIR, `audio-${timestamp}.mp3`);
  
  try {
    await ytdl(videoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: tempFile,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      // Remove the problematic --extractor option
      // Add proper headers
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ],
      // Remove extractor line - it's not needed and causing the error
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true,
      // Add retry options
      retries: 3,
      fragmentRetries: 3,
      // Remove the problematic options that cause ambiguity
      // forceIpv4: true,  // Remove this if it causes issues
      // sleepInterval: 1,  // Remove this if it causes issues
      // maxSleepInterval: 5  // Remove this if it causes issues
    });
    
    console.log(`Downloaded audio to: ${tempFile}`);
    return tempFile;
  } catch (error) {
    console.error('Error downloading audio:', error);
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

async function createPlayer(url) {
  console.log('Creating audio player from downloaded file');
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 'pause',
      maxMissedFrames: Math.round(5000 / 20), // Allow 5 seconds of missed frames
    }
  });

  // Download the file first for reliability
  const audioFile = await downloadAndConvertAudio(url);

  // Verify file exists and is readable
  if (!fs.existsSync(audioFile)) {
    throw new Error('Downloaded audio file not found');
  }

  // Create resource from the downloaded file
  const resource = createAudioResource(audioFile, {
    inputType: StreamType.Arbitrary,
    inlineVolume: true,
    metadata: {
      title: 'Audio Track',
      url: url,
      audioFile: audioFile // Store file path in metadata
    }
  });

  if (resource.volume) {
    resource.volume.setVolume(0.8);
  }

  // Better cleanup handling with proper waiting
  let cleanupScheduled = false;
  let playerReleased = false;
  let resourceReleased = false;
  
  const tryCleanup = () => {
    if (cleanupScheduled) return;
    
    // Only cleanup when both player and resource are released
    if (playerReleased && resourceReleased) {
      cleanupScheduled = true;
      console.log('All resources released, scheduling cleanup for:', path.basename(audioFile));
      
      // Wait a bit longer to ensure file handles are fully released
      setTimeout(() => {
        attemptFileCleanup(audioFile);
      }, 3000); // Increased wait time
    }
  };

  const attemptFileCleanup = (filePath, retryCount = 0) => {
    const maxRetries = 5;
    const retryDelay = 2000 * (retryCount + 1); // Exponential backoff
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('✅ Successfully cleaned up file:', path.basename(filePath));
      }
    } catch (error) {
      if (error.code === 'EBUSY' && retryCount < maxRetries) {
        console.log(`⏳ File still busy, retry ${retryCount + 1}/${maxRetries} in ${retryDelay}ms...`);
        setTimeout(() => {
          attemptFileCleanup(filePath, retryCount + 1);
        }, retryDelay);
      } else {
        console.error(`❌ Failed to cleanup file after ${retryCount + 1} attempts:`, error.message);
      }
    }
  };

  // Listen to player state changes
  player.on('stateChange', (oldState, newState) => {
    console.log(`Player state: ${oldState.status} -> ${newState.status}`);
    
    if (newState.status === 'Idle') {
      console.log('🎵 Player became idle');
      playerReleased = true;
      tryCleanup();
    }
  });

  // Listen to resource events
  resource.playStream.on('end', () => {
    console.log('🎵 Audio stream ended');
    resourceReleased = true;
    tryCleanup();
  });

  resource.playStream.on('error', (error) => {
    console.error('❌ Audio resource error:', error);
    resourceReleased = true;
    tryCleanup();
  });

  resource.playStream.on('close', () => {
    console.log('🎵 Audio stream closed');
    resourceReleased = true;
    tryCleanup();
  });

  // Cleanup on player destruction
  player.on('error', (error) => {
    console.error('❌ Player error:', error);
    playerReleased = true;
    tryCleanup();
  });

  return { player, resource, audioFile };
}

// Function to get song info
async function getSongInfo(url) {
  try {
    const info = await ytdl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      // Simplified headers - remove problematic options
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ],
      // Add basic retry
      retries: 2
    });
    
    return {
      title: info.title || 'Unknown Title',
      duration: info.duration || 0,
      uploader: info.uploader || 'Unknown',
      thumbnail: info.thumbnail || null
    };
  } catch (error) {
    console.error('Error getting song info:', error);
    // Return basic info instead of failing completely
    return {
      title: 'Audio Track',
      duration: 0,
      uploader: 'Unknown',
      thumbnail: null
    };
  }
}

// Function to get playlist info and videos
async function getPlaylistInfo(playlistUrl) {
  try {
    console.log(`Getting playlist info for: ${playlistUrl}`);
    
    const info = await ytdl(playlistUrl, {
      dumpSingleJson: true,
      flatPlaylist: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
    });
    
    // Extract video URLs from playlist
    const videos = [];
    
    if (info.entries && Array.isArray(info.entries)) {
      for (const entry of info.entries) {
        if (entry.id && entry.title) {
          videos.push({
            title: entry.title,
            url: `https://www.youtube.com/watch?v=${entry.id}`,
            duration: entry.duration || 0,
            uploader: entry.uploader || 'Unknown'
          });
        }
      }
    }
    
    return {
      title: info.title || 'Unknown Playlist',
      videos: videos,
      uploader: info.uploader || 'Unknown'
    };
  } catch (error) {
    console.error('Error getting playlist info:', error);
    throw new Error(`Failed to get playlist info: ${error.message}`);
  }
}

// Function to check if URL is a playlist
function isPlaylist(url) {
  return url.includes('playlist?list=') || url.includes('&list=');
}

module.exports = { 
  createAudioConnection, 
  createPlayer, 
  downloadAndConvertAudio,
  getSongInfo,
  getPlaylistInfo,
  isPlaylist
};