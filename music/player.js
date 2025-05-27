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
  
  // Generate unique filename
  const timestamp = Date.now();
  const tempFile = path.join(TEMP_DIR, `audio-${timestamp}.mp3`);
  
  try {
    // Download audio using youtube-dl-exec
    await ytdl(videoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0, // Best quality
      output: tempFile,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
    });
    
    console.log(`Downloaded audio to: ${tempFile}`);
    return tempFile;
  } catch (error) {
    console.error('Error downloading audio:', error);
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

async function createPlayer(url) {
  console.log('Creating audio player for YouTube song');
  const player = createAudioPlayer();
  
  try {
    // Download the audio file first
    const audioFile = await downloadAndConvertAudio(url);
    
    // Create a read stream from the downloaded file
    const fileStream = fs.createReadStream(audioFile);
    
    // Create audio resource
    const resource = createAudioResource(fileStream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true
    });
    
    // Set volume to a reasonable level
    if (resource.volume) {
      resource.volume.setVolume(0.8);
    }
    
    // Clean up the audio file when playback finishes
    player.on('stateChange', (oldState, newState) => {
      if (newState.status === 'idle') {
        console.log(`Cleaning up temp file: ${audioFile}`);
        fs.unlink(audioFile, (err) => {
          if (err) console.error('Error removing temp file:', err);
        });
      }
    });
    
    return { player, resource, audioFile };
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
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
    });
    
    return {
      title: info.title || 'Unknown Title',
      duration: info.duration || 0,
      uploader: info.uploader || 'Unknown',
      thumbnail: info.thumbnail || null
    };
  } catch (error) {
    console.error('Error getting song info:', error);
    return {
      title: 'Unknown Title',
      duration: 0,
      uploader: 'Unknown',
      thumbnail: null
    };
  }
}

// NEW: Function to get playlist info and videos
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

// NEW: Function to check if URL is a playlist
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