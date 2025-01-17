const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Initialize WebSocket connection
const socket = io();

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Display user's message
    addMessageToChat('You', message);

    // Clear input field
    userInput.value = '';

    // Send the message to the backend via WebSocket
    console.log('Sending message to server:', message);
    socket.emit('chat message', message);
}

// Handle WebSocket messages for chat updates
socket.on('chat message', (data) => {
    console.log('Received message from server:', data);
    addMessageToChat(data.sender, data.message);
});

function addMessageToChat(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}