const { createAudioPlayer, createAudioResource, AudioPlayerStatus, joinVoiceChannel, NoSubscriberBehavior } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

function createStream(url) {
  return ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
}

function createAudioConnection(message) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) throw new Error('Join a voice channel first.');

  return joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
  });
}

function createPlayer(stream) {
  const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
  const resource = createAudioResource(stream);
  return { player, resource };
}

module.exports = { createStream, createAudioConnection, createPlayer };
