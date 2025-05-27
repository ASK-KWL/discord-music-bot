const { Collection } = require('discord.js');

// Create a Map to store server queues
const queue = new Collection();

module.exports = queue;
