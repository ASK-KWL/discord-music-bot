const { createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const ytdl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
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

async function downloadAudio(videoUrl) {
  console.log(`Downloading audio from: ${videoUrl}`);
  
  // Generate a unique filename based on timestamp
  const timestamp = Date.now();
  const outputFile = path.join(TEMP_DIR, `audio-${timestamp}.mp3`);
  
  try {
    // Use youtube-dl-exec to download audio only
    await ytdl(videoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0, // Best quality
      output: outputFile,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
    });
    
    console.log(`Downloaded audio to: ${outputFile}`);
    return outputFile;
  } catch (error) {
    console.error('Error downloading audio:', error);
    throw error;
  }
}

async function createPlayer(url) {
  console.log('Creating robust audio player');
  const player = createAudioPlayer();
  
  try {
    // Download the audio file first
    const audioFile = await downloadAudio(url);
    
    // Create a read stream from the downloaded file
    const audioStream = fs.createReadStream(audioFile);
    
    // Create an audio resource from the file stream
    const resource = createAudioResource(audioStream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true
    });
    
    // Set volume
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
    console.error('Error creating robust player:', error);
    throw error;
  }
}

module.exports = { createAudioConnection, createPlayer, downloadAudio };