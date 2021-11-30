const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8081 });

const users = new Set();
const recentMessages = [];

const sendMessage = (message) => {
	for (const user of users) {
		user.socket.send(JSON.stringify(message));
	}
};

server.on('connection', (socket) => {
	console.log('New user connected!');

	const userRef = {
		socket: socket,
		lastActiveAt: Date.now(),
	};
	users.add(userRef);

	socket.on('message', (message) => {
		try {
			const parsedMessage = JSON.parse(message);

			if (
				typeof parsedMessage.sender !== 'string' ||
				typeof parsedMessage.body !== 'string'
			) {
				console.error('Invalid message received!', message);
				return;
			}

			const numberOfRecentMessages = recentMessages
				.filter((message) => message.sender === parsedMessage.sender)
				.length;
			if (numberOfRecentMessages >= 30) {
				socket.close(4000, 'flooding the chat');
				return;
			}

			const verifiedMessage = {
				sender: parsedMessage.sender,
				body: parsedMessage.body,
				sentAt: Date.now(),
			}

			sendMessage(verifiedMessage);

			userRef.lastActiveAt = Date.now();

			recentMessages.push(verifiedMessage);
			setTimeout(() => recentMessages.shift(), 60000);
		} catch (error) {
			console.error('Error parsing message!', error);
		}
	});

	socket.on('close', (code, reason) => {
		console.log(`User disconnected with code ${code} and reason ${reason}!`);
		users.delete(userRef);
	});
});

setInterval(() => {
	const now = Date.now();

	for (const user of users) {
		if (user.lastActiveAt < now - 300000) {
			user.socket.close(4000, 'inactivity');
		}
	}
}, 10000);