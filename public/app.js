const socket = io.connect('http://127.0.0.1');
const consoleOutput = document.getElementById('console');
const serverStatus = document.getElementById('serverStatus');

function ansiToHtml(message) {
    // Define regex for matching ANSI color codes
    const ansiRegex = /\x1b\[([0-9;]*)m/g;

    const colorMap = {
        // Basic ANSI colors mapped to their HTML color equivalents
        30: 'black',
        31: 'red',
        32: 'green',
        33: 'yellow',
        34: 'blue',
        35: 'magenta',
        36: 'cyan',
        37: 'white',
        90: 'gray' // Bright black (gray)
    };

    let result = '';
    let currentStyle = 'color:white;';
    let lastIndex = 0;
    let match;

    while ((match = ansiRegex.exec(message)) !== null) {
        const ansiCodes = match[1].split(';');
        const index = match.index;

        // Append previous text without color
        result += `<span style="${currentStyle}">${message.slice(lastIndex, index)}</span>`;

        // Check for color codes and update style
        ansiCodes.forEach(code => {
            currentStyle = 'color:white;';
        });

        lastIndex = ansiRegex.lastIndex;
    }

    // Append any remaining text after the last match
    result += `<span style="${currentStyle}">${message.slice(lastIndex)}</span>`;

    return result;
}

function getServerStatus() {
    fetch('/status', {
        method: "GET",
        headers: { 'Content-Type': 'application/json' },
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
        serverStatus.textContent = "Server status: " + data['status']
        console.log('Data received:', data);
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
    });
}

// Listen for real-time console output
socket.on('console_output', (data) => {
    let messageElement = document.createElement('div');
    
    // Parse the ANSI codes and convert them to HTML
    messageElement.innerHTML = ansiToHtml(data.message);

    consoleOutput.appendChild(messageElement);

    // Auto-scroll to the bottom
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
});

// Start the Minecraft server
function startServer() {
    fetch('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })
        .then(response => response.json())
        .then(data => consoleOutput.innerHTML += `<div>${data.status}</div>`)
        .catch(error => consoleOutput.innerHTML += `<div style="color:red;">Error: ${error}</div>`);
}

// Restart the Minecraft server
function restartServer() {
    fetch('/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })
        .then(response => response.json())
        .then(data => consoleOutput.innerHTML += `<div>${data.status}</div>`)
        .catch(error => consoleOutput.innerHTML += `<div style="color:red;">Error: ${error}</div>`);
}

// Stop the Minecraft server
function stopServer() {
    fetch('/stop', { method: 'POST' })
        .then(response => response.json())
        .then(data => consoleOutput.innerHTML += `<div>${data.status}</div>`);
}

// Send a command to the Minecraft server
function sendCommand() {
    const command = document.getElementById('command').value;
    fetch('/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
    })
        .then(response => response.json())
        .then(data => consoleOutput.innerHTML += `<div>${data.status}</div>`);
}

setInterval(() => {
   getServerStatus(); 
}, 2000);
