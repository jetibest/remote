#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const child_process = require('child_process');
const easywebserver = require('./nodejs-easywebserver/'); // git clone https://github.com/jetibest/nodejs-easywebserver && cd nodejs-easywebserver && npm install

const nets = os.networkInterfaces();
const results = {};
for(const name of Object.keys(nets))
{
	for(const net of nets[name])
	{
		// Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
		// 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
		const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
		if(net.family === familyV4Value && !net.internal)
		{
			(results[name] = results[name] || []).push(net.address);
		}
	}
}

console.log('Network IP-addresses:', results);

(async function()
{
	try
	{
		var s = await easywebserver.create('websocket,jsml,html');
		
		var screengrabber = child_process.spawn('./screengrabber.sh', []);
		screengrabber.on('error', function()
		{
			console.log('Failed to spawn screengrabber.');
			process.exit(1);
		});
		screengrabber.on('exit', function(exitCode)
		{
			console.log('Screengrabber exited (' + exitCode + ').');
			
			if(exitCode !== 0) process.exit(1);
		});
		s.screengrabber = {
			path: '/tmp/screengrabber.sock'
		};
		
		var listen_port = parseInt(process.argv[2]) || 8080;
		var listen_host = '0.0.0.0';
		await s.listen(listen_port, listen_host);
		console.log('Remote listening at ' + listen_host + ':' + listen_port);
	}
	catch(err)
	{
		console.error(err);
		process.exit(1);
	}
})();
