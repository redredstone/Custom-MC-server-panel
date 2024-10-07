const socket = io.connect('http://127.0.0.1');
const consoleOutput = document.getElementById('console');
const serverStatus = document.getElementById('serverStatus');

function ansiToHtml(message) {
    const ansiRegex = /\x1b\[(\d{1,3}(;\d{1,3})*)?m/g;

    let result = '';
    let currentStyle = '';
    let lastIndex = 0;
    let match;

    while ((match = ansiRegex.exec(message)) !== null) {
        const ansiCodes = match[1].split(';');
        const index = match.index;

        result += `<span style="${currentStyle}">${message.slice(lastIndex, index)}</span>`;

        currentStyle = '';

        for (let i = 0; i < ansiCodes.length; i++) {
            const code = parseInt(ansiCodes[i]);

            switch (code) {
                case 0:
                    currentStyle = '';
                    break;
                case 1:
                    currentStyle += 'font-weight:bold;';
                    break;
                case 30: case 31: case 32: case 33: case 34: case 35: case 36: case 37:
                    currentStyle += `color:${ansiColor(code - 30)};`;
                    break;
                case 90: case 91: case 92: case 93: case 94: case 95: case 96: case 97:
                    currentStyle += `color:${ansiColor(code - 90, true)};`;
                    break;
                case 38:
                    if (ansiCodes[i + 1] === '2') {
                        const r = ansiCodes[i + 2];
                        const g = ansiCodes[i + 3];
                        const b = ansiCodes[i + 4];
                        currentStyle += `color:rgb(${r},${g},${b});`;
                        i += 4;
                    }
                    break;
            }
        }

        lastIndex = ansiRegex.lastIndex;
    }

    result += `<span style="${currentStyle}">${message.slice(lastIndex)}</span>`;

    result = result.replace(/\n/g, '<br>');

    return result;
}

function ansiColor(code, bright = false) {
    const colors = [
        'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'
    ];
    return bright ? `light${colors[code]}` : colors[code];
}

function escapeHtml(message) {
    return message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Listen for console output
socket.on('console_output', (data) => {
    let messageElement = document.createElement('div');
    
    let safeMessage = escapeHtml(data.message);

    // Parse the ANSI codes and convert them to HTML
    messageElement.innerHTML = ansiToHtml(safeMessage);

    console.log(data.message)

    consoleOutput.appendChild(messageElement);

    // Auto-scroll to the bottom
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
});

// Listen for server status
socket.on('server_status', (data) => {
    serverStatus.textContent = "Server status: " + data
    console.log('Data received:', data);
})

// Get server status on page refresh
function getServerStatus() {
    fetch('/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    })
    .then(response => response.json())
    .then(data => {
        serverStatus.textContent = "Server status: " + data['state']
        console.log('Data received:', data);
    })
    .catch(error => consoleOutput.innerHTML += `<div style="color:red;">Error: ${error}</div>`);
}

// Start the server
function startServer() {
    fetch('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })
        .then(response => response.json())
        .then(data => consoleOutput.innerHTML += `<div>${data.status}</div>`)
        .catch(error => consoleOutput.innerHTML += `<div style="color:red;">Error: ${error}</div>`);
}

// Restart the server
function restartServer() {
    fetch('/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })
        .then(response => response.json())
        .then(data => consoleOutput.innerHTML += `<div>${data.status}</div>`)
        .catch(error => consoleOutput.innerHTML += `<div style="color:red;">Error: ${error}</div>`);
}

// Stop the server
function stopServer() {
    fetch('/stop', { method: 'POST' })
        .then(response => response.json())
        .then(data => consoleOutput.innerHTML += `<div>${data.status}</div>`);
}

// Send a command to the server
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

getServerStatus()