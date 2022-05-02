const { Client, 
        Intents, 
        MessageEmbed, 
        VoiceState, 
        Message} = require('discord.js');
const { AudioPlayerStatus,
	    StreamType,
	    createAudioPlayer,
	    createAudioResource,
	    joinVoiceChannel,
        VoiceConnectionStatus } = require('@discordjs/voice');

//old youtube download library has issues
const ytdl = require('ytdl-core');

// new cooler one
const pdl = require('play-dl');

//searching youtube library
const ytsr = require('ytsr');

const fs = require('fs');




const bot = new Client({    intents: [  Intents.FLAGS.GUILDS, 
                                        Intents.FLAGS.GUILD_MESSAGES, 
                                        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
                                        Intents.FLAGS.GUILD_VOICE_STATES], 
                            partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

const token = 'replace_with_real_token!';

const prefix = ".";


const queue = new Map();


var killCount = 0;
var nevelCount = 0;

const nevel = "121031808593821697";

const bungis = "93518861994819584";
const jeremy = "109332895549632512";
const sahand = "115944181603631106";

const jeremyGuild = "115652772149460999";
const cessID = "753478309081382993";

//keep track of if the bot has been reinvited
var resetStatus = new Map();

// map alert messages to the guild they are from
var alertMap = new Map();



//music bot functions
async function play(guild, song) {

    //create base embed
    const musicEmbed = new MessageEmbed();

    //check song empty
    const sq = queue.get(guild.id);

    //TODO
    if (!song) {
        
        //sq.voiceChannel.leave();
        sq.connection.destroy();
        queue.delete(guild.id);

        return;
    }

    //djs13 update for audio
    //const stream = ytdl(song.url, { filter: "audioonly" });
    const stream = await pdl.stream(song.url);
    
    const resource = createAudioResource(stream.stream, {  inlineVolume: true,
                                                    inputType: StreamType.Arbitrary });
    resource.volume.setVolumeLogarithmic(sq.volume / 5);
    const player = createAudioPlayer();

    //player.
    player.play(resource);
    sq.connection.subscribe(player);

    /*
    const dispatcher = player;
    dispatcher.play(resource);
    dispatcher.on("finish", () => {
            sq.songs.shift();
            play(guild, sq.songs[0]);
        });
    dispatcher.on("error", error => console.error(error));
    
    sq.connection.subscribe(player);
    */

    //build embed
    musicEmbed.setColor('1a9cb6');
    musicEmbed.setTitle('Now playing');
    musicEmbed.setDescription(song.title);

    sq.textChannel.send({ embeds: [musicEmbed] });



    player.on(AudioPlayerStatus.Playing, () => {

        console.log('playing...');
    });

    player.on(AudioPlayerStatus.Idle, () => {

        console.log('Idle');
        sq.songs.shift();
        play(guild, sq.songs[0]);
    });

    player.on('error', error => {
        console.error(`Error: ${error.message} with resource ${song.title}`);
        //TODO weirld aborts
    });

    //for handleing abrupt disconnects
    sq.connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        try {
            await Promise.race([
                entersState(sq.connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(sq.connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
            // Seems to be reconnecting to a new channel - ignore disconnect
        } catch (error) {
            // Seems to be a real disconnect which SHOULDN'T be recovered from
            console.log('disconnecting...');

            sq.connection.destroy();

            //clear queue
            queue.delete(guild.id);
        }
    });

    //deafentest
    //guild.me.voice.setDeaf(false);

    //get song url
    /*
    const dispatcher = sq.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            sq.songs.shift();
            play(guild, sq.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(sq.volume / 5);
    sq.textChannel.send(`Start playing: **${song.title}**`);
    */
}








/**
 * @param {Message} msg skip message
 */
function skip(msg, sq) {

    const musicEmbed = new MessageEmbed();

    if(!msg.member.voice.channel){

        //build error embed
        musicEmbed.setColor('ffb032');
        musicEmbed.setDescription('You have to join a voice channel first.');

        msg.channel.send({ embeds: [musicEmbed] });

        return;
    }
    if(!sq){

        //build error embed
        musicEmbed.setColor('ffb032');
        musicEmbed.setDescription('There is no song that I could skip!');

        msg.channel.send({ embeds: [musicEmbed] });


        return;
    }

    sq.songs.shift();
    play(msg.guild, sq.songs[0]);

    msg.react('👌');
}






/**
 * @param {Message} msg skip message
 */
function stop(msg, sq){

    const musicEmbed = new MessageEmbed();

    if(!msg.member.voice.channel){

        //build error embed
        musicEmbed.setColor('ffb032');
        musicEmbed.setDescription('You have to join a voice channel first.');

        msg.channel.send({ embeds: [musicEmbed] });

        return;
    }
    if(!sq){

        //build error embed
        musicEmbed.setColor('ffb032');
        musicEmbed.setDescription('There is no song that I could stop!');

        msg.channel.send({ embeds: [musicEmbed] });


        return;
    }

    sq.songs = [];
    play(msg.guild, sq.songs[0]);

    msg.react('👌');
}





async function execute(msg, sq) {
    //const args = msg.content.split(" ");

    //splits on the first occurency of space
    const args = [  msg.content.substr(0,msg.content.indexOf(' ')), 
                    msg.content.substr(msg.content.indexOf(' ')+1) ];

    console.log(`1st arg: ${args[0]}`);
    console.log(`2nd arg: ${args[1]}`);

    //base emembed
    const musicEmbed = new MessageEmbed();

    const voiceChannel = msg.member.voice.channel;
    if (!voiceChannel) {

        //build error embed
        musicEmbed.setColor('ffb032');
        musicEmbed.setDescription('You have to join a voice channel first.');

        msg.channel.send({ embeds: [musicEmbed] });
        return;
    }  
    const permissions = voiceChannel.permissionsFor(msg.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {

        //build error embed
        musicEmbed.setColor('f0463a');
        musicEmbed.setDescription('I need the permissions to join and speak in your voice channel!');

        msg.channel.send({ embeds: [musicEmbed] });

        return;
    }
    if (args[0] === ""){

        //build error embed
        musicEmbed.setColor('f0463a');
        musicEmbed.setDescription('You need to enter a URL.');

        msg.channel.send({ embeds: [musicEmbed] });

        return;
    }
    if (!ytdl.validateURL(args[1])){


        //search the term on youtube if it cant validate
        const page1 = await ytsr(args[1], { pages: 1 });

        //make sure there is atleast 1 result
        if(page1.items.length > 0){

            if(!ytdl.validateURL(page1.items[0].url)){
            
                console.log(`${page1.items[0].url} fail result`);
    
                //build error embed
                musicEmbed.setColor('f0463a');
                musicEmbed.setDescription('Nothing found.');
    
                msg.channel.send({ embeds: [musicEmbed] });
    
                return;
            }
            else{
    
                //if the search is valid that becomes the video
                args[1] = page1.items[0].url; 
                console.log(`${page1.items[0].url} was found!`);
            }
        }
    }


    //create song object from youtube link
    const songInfo = await ytdl.getInfo(args[1]);

    //


    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    // create contract with queue
    if (!sq) {

        // Creating the contract for our queue
        const queueContruct = {
            textChannel: msg.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
        };
        // Setting the queue using our contract
        queue.set(msg.guild.id, queueContruct);
        // Pushing the song to our songs array
        queueContruct.songs.push(song);
        
        try {
            // Here we try to join the voicechat and save our connection into our object.
            //var connection = await voiceChannel.join();


            //use new djs13 function
            //CONNECTED
            var connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: msg.guild.id,
                adapterCreator: msg.guild.voiceAdapterCreator
            })

            //undeafen bot i guess
            //connection.voice.setDeaf(false);
            //msg.guild.me.voice.setDeaf(false);

            queueContruct.connection = connection;
            // Calling the play function to start a song
            play(msg.guild, queueContruct.songs[0]);
        } catch (err) {
            // Printing the error message if the bot fails to join the voicechat
            console.log(err);
            queue.delete(msg.guild.id);
            return msg.channel.send(err);
        }








    }else {
        sq.songs.push(song);
        console.log(sq.songs);

        //build embed
        musicEmbed.setColor('1a9cb6');
        musicEmbed.setTitle(`Track queued - Position ${sq.songs.length}`);
        musicEmbed.setDescription(song.title);
        
        msg.channel.send({ embeds: [musicEmbed] });

        return;
    }
}






//nevel int functions
async function tamperAlert(reason) {

    const tamperEmbed = new MessageEmbed();

    tamperEmbed.setColor('f0463a');
    tamperEmbed.setTitle('Tamper Alert!');
    tamperEmbed.setThumbnail('https://www.freeiconspng.com/uploads/alert-icon--free-icons-24.png');
    tamperEmbed.setDescription('There was a fatal change to my integration so you must reinvite me.');
    tamperEmbed.addField('Invite Link', 'https://discord.com/oauth2/authorize?client_id=926579854219047004&scope=bot&permissions=483287083097', false);
    tamperEmbed.setTimestamp();

    try {
        let user = await bot.users.fetch(jeremy);
        let msg = await user.send({ embeds: [tamperEmbed] });

        alertMap.set(msg, cessID);

        user = await bot.users.fetch(bungis);
        msg = user.send({ embeds: [tamperEmbed] });

        alertMap.set(msg, cessID);

        user = await bot.users.fetch(sahand);
        msg = user.send({ embeds: [tamperEmbed] });

        alertMap.set(msg, cessID);
    }
    catch(error){
        console.error("couldnt find user to send message");
    }
}





bot.on('ready', () =>{
    console.log('nevel bot online!');

    bot.user.setPresence({

        //status: 'invisible',
    });

    bot.user.setActivity('.Help', { type: 'LISTENING' });

    //setup variables from json
    //try loading map from json
    fs.readFile("./resetStatus.json", (err, data) => {
        if(err || data.length<=0) {
            return console.log(err);
        }
        console.log("reset status was loaded!");

        toLoad = JSON.parse(data);
        console.log(toLoad);

        resetStatus = new Map(Object.entries(toLoad));
    });
});

bot.on("messageCreate", async (msg) => {
    console.log(`${msg.author.username} said: ${msg.content}`);

    //test here

    //parse for command
    if (msg.author.bot) return;
    if (!msg.content.startsWith(prefix)) return;


    //build the baseline embed
    const musicEmbed = new MessageEmbed();

    const serverQueue = queue.get(msg.guild.id);

    if (msg.content.startsWith(`${prefix}play`)) {
        execute(msg, serverQueue);
        return;
    } else if (msg.content.startsWith(`${prefix}skip`) || msg.content.startsWith(`${prefix}next`)) {
        skip(msg, serverQueue);
        return;
    } else if (msg.content.startsWith(`${prefix}stop`)) {
        stop(msg, serverQueue);
        return;
    } else if (msg.content.startsWith(`${prefix}help`)) {

        //build embed
        musicEmbed.setColor('1a9cb6');
        musicEmbed.setAuthor({ name: 'Help Command', iconURL: 'https://i.imgur.com/tkOqk7H.png', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
        musicEmbed.addFields(
            { name: 'Everyone commands', value: '\`help\`, \`lyrics\`, \`ping\`, \`play\`, \`playlist\`, \`premiumstatus\`, \`queue\`, \`search\`, \`songinfo\`, \`voteskip\`' },
            { name: 'DJ commands', value: '\`clear\`, \`leave\`, \`loop\`, \`move\`, \`pause\`, \`remove\`, \`replay\`, \`resume\`, \`seek\`, \`shuffle\`, \`skip\`, \`stop\`' },
            { name: 'Admin commands', value: '\`announce\`, \`ban\`, \`cleanup\`, \`fix\`, \`language\`, \`limit\`, \`playlists\`, \`prefix\`, \`requester\`, \`setdj\`, \`setup\`, \`setvc\`, \`unban\`' },
            { name: 'Premium commands', value: '\`24/7\`, \`autoplay\`, \`bassboost\`, \`demon\`, \`filter\`, \`nightcore\`, \`speed\`, \`vaporwave\`, \`volume\`' },
            { name: 'Web Dashboard', value: '[View commands](https://www.youtube.com/watch?v=dQw4w9WgXcQ) | [Configure settings](https://www.youtube.com/watch?v=dQw4w9WgXcQ)' },
        );
        musicEmbed.setFooter('Type \'.help <CommandName>\' for details on a command');

        msg.channel.send({ embeds: [musicEmbed] });
    } else {

        //build error embed
        musicEmbed.setColor('f0463a');
        musicEmbed.setDescription('Get a list of commands by typing .help');

        msg.channel.send({ embeds: [musicEmbed] });
    }

    //if(msg.author.username === "Frostol"){
    //    msg.reply('listen to your king :star_struck:');
    //}

});

//catching bot changes
bot.on("guildCreate", (guild) => {



    console.log(`JOINED GUILD`);





    //try loading map from json
    fs.readFile("./resetStatus.json", (err, data) => {
        if(err || data.length<=0) {
            return console.log(err);
        }
        console.log("reset status was loaded!");

        toLoad = JSON.parse(data);
        console.log(toLoad);

        resetStatus = new Map(Object.entries(toLoad));
    });



    //before reseting status check if we were deactivated
    if(!resetStatus.get(guild.id)){

        //count reactions deleted while offline
        let scanCount = 0;
        let nevleCount = 0;
        let deleteCount = 0;

        //if we were deactivated. Crangle nevles messages that were recently liked
        guild.channels.cache.forEach(channel => {
            if( channel.type === "GUILD_TEXT"){

                console.log("getting text channel...");

                channel.messages.fetch({limit: 100}).then(messages => {

                    messages.forEach( message => {

                        scanCount++;

                        if( message.author.id === nevel ){

                            nevleCount++;

                            if( message.reactions.cache.size > 0 ){

                                deleteCount++;

                                console.log(`found ${message.reactions.cache.size}`)
                                console.log(`deleting reaction from message: ${message.content}`);
                                message.reactions.removeAll();
                            }
                        }
                    });
                });
            }
        });

        //go through messages and react to ones that are in that guild
        //this is delayed to get around issues with the above code being
        //async
        setTimeout(function() {
            alertMap.forEach((gid, msg, map) => {

                if(guild.id === gid){
    
                    console.log('reacting to msg!');
    
                    try{
                        const tamperEmbed = new MessageEmbed();
    
                        tamperEmbed.setColor('16c60c');
                        tamperEmbed.setTitle('Tamper Alert!');
                        tamperEmbed.setDescription('Invite successful.');
                        tamperEmbed.addField('Invite Link', '~~https://discord.com/oauth2/authorize?client_id=926579854219047004&scope=bot&permissions=483287083097~~', false);
                        tamperEmbed.addField('Reboot Summary', `messages scanned: ${scanCount}\nmessages that were Nevle's: ${nevleCount}\nreactions destroyed: ${deleteCount}`, false);
                        tamperEmbed.setTimestamp();
    
                        msg.edit({ embeds: [tamperEmbed] });
                    }
                    catch(error){
                        console.error('could not react to dm');
                    }
    
                    alertMap.delete('msg');
                }
            });
        }, 500);
    }

    //update map
    resetStatus.set(guild.id, true);



    //save updates to map
    let toSave = Object.fromEntries(resetStatus);

    fs.writeFile("./resetStatus.json", JSON.stringify(toSave), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("reset status was saved!");
    });
});

bot.on("guildDelete", async (guild) => {
    console.log(`KICKED`);

    if(!guild.me.permissions.has("ADMINISTRATOR") && resetStatus.get(guild.id)){

        resetStatus.set(guild.id, false);

        //saving change...
        let toSave = Object.fromEntries(resetStatus);

        fs.writeFile("./resetStatus.json", JSON.stringify(toSave), function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("reset status saved!");
        });



        console.log("We have lot admin! kicking self and dming mods...");

        guild.leave();

        tamperAlert("kicked");
    }
});

//doesnt work if the bot is kicked
bot.on("guildIntegrationsUpdate", (guild) => {
    console.log(`INTEGRATION UPDATED`);
});

bot.on("roleUpdate", async (oldRole, newRole) => {

    console.log(`ROLE UPDATED`);

    if(!newRole.guild.me.permissions.has("ADMINISTRATOR") && resetStatus.get(newRole.guild.id)){

        resetStatus.set(newRole.guild.id, false);

        //saving change...
        let toSave = Object.fromEntries(resetStatus);
        
        fs.writeFile("./resetStatus.json", JSON.stringify(toSave), function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("reset status saved!");
        });

        console.log("We have lost admin! kicking self and dming mods...");

        newRole.guild.leave();

        tamperAlert("role");
    }
});

bot.on("roleDelete", async (role) => {

    if(!role.guild.me.permissions.has("ADMINISTRATOR") && resetStatus.get(role.guild.id)){

        resetStatus.set(role.guild.id, false);

        //saving change...
        let toSave = Object.fromEntries(resetStatus);
        
        fs.writeFile("./resetStatus.json", JSON.stringify(toSave), function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("reset status saved!");
        });


        console.log("We have lost admin! kicking self and dming mods...");

        role.guild.leave();

        tamperAlert("role");
    }
});



bot.on("messageReactionAdd", async (re, user) => {


    //check if our admin roll has been removed
    if(!re.message.guild.me.permissions.has("ADMINISTRATOR") &&  resetStatus.get(re.message.guild.id)){

        resetStatus.set(re.message.guild.id, false);

        //saving change...
        let toSave = Object.fromEntries(resetStatus);
        
        fs.writeFile("./resetStatus.json", JSON.stringify(toSave), function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("reset status saved!");
        });



        console.log("We have lost admin! dming mods...");

        re.message.guild.leave();

        tamperAlert("react");
    }

    console.log(`${user.username} reacted with ${re.emoji.name}`);


    // When a reaction is received, check if the structure is partial
	if (re.partial) {
		// If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
		try {
			await re.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message:', error);
			// Return as `reaction.message.author` may be undefined/null
			return;
		}
	}

    console.log(user.id);
    console.log(re.message.author.id);

    if( user.id === nevel && re.message.author.id === nevel ){
        re.remove();

        nevelCount++;
        killCount++;

        console.log(`${user.username}'s reaction deleted!`);
        console.log(`${killCount} reaction(s) taken out since last bootup`);
        console.log(`${nevelCount} of them were Nevle.`);
    }
    else if( re.message.author.id === nevel && re.emoji.name === '👍'){
        re.remove();
        
        killCount++;


        console.log(`${user.username}'s reaction deleted!`);
        console.log(`${killCount} reaction(s) taken out since last bootup`);
        console.log(`${nevelCount} of them were Nevle.`);
    }
});




//music bot listeners
bot.once('reconnecting', () => {
    console.log('Reconnecting!');
});
bot.once('disconnect', () => {
    console.log('Disconnect!');
});









bot.login(token);



