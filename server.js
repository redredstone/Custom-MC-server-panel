const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let mcProcess = null; // Will hold the Minecraft server process
let serverState = 'Offline'; // Initial state

// Middleware to parse JSON in requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
const serverDir = __dirname + "/server"; // Directory the server is in

function issueCommand(command) {
    mcProcess.stdin.write(command + "\n");
}

function startServer() {
    serverState = 'Starting';

    console.log(`Starting server....`);

    mcProcess = spawn('java', ['-Xmx1024M', '-Xms1024M', '-jar', 'server.jar', 'nogui'], { cwd: serverDir });

    mcProcess.stdout.on('data', async (data) => {
        const output = data.toString();
        console.log(output);
        io.emit('console_output', { message: output, type: 'info' });

        // Check if the server has started successfully (based on "Done" message)
        if (output.includes('Done')) {
            serverState = 'Running';
        }
    });

    mcProcess.stderr.on('data', async (data) => {
        const error = data.toString();
        console.error(error);
        io.emit('console_output', { message: error, type: 'error' });
    });

    mcProcess.on('exit', async () => {
        console.log('Minecraft server has stopped.');
        mcProcess = null;
        serverState = 'Offline';
    });

}

function stopServer() {
    serverState = 'Stopping';

    console.log('Stopping Minecraft server...');
    issueCommand("stop\n");
    //mcProcess.stdin.write("stop\n");

    mcProcess.on('exit', async () => {
        mcProcess = null;
        serverState = 'Offline';
    });

}

app.get('/status', (req, res) => {
    res.send({status: serverState})
})

// Route to start the Minecraft server
app.post('/start', async (req, res) => {
    if (mcProcess === null) {
       startServer();
       res.json({ status: "Minecraft server starting..." });
    } else {
        res.json({ status: "Minecraft server is already running" });
    }
});

// Route to stop the Minecraft server
app.post('/stop', async (req, res) => {
    if (mcProcess !== null) {
        stopServer();
        res.json({ status: "Minecraft server stopping" });
    } else {
        res.json({ status: "Minecraft server is not running" });
    }
});

// Route to restart the Minecraft server
app.post('/restart', async (req, res) => {
    if (!serverDir) {
        return res.status(400).json({ status: "Minecraft server directory is not defined." });
    }

    if (mcProcess !== null) {
        serverState = 'Restarting';

        console.log('Restarting server...');
        stopServer();

        mcProcess.on('exit', async () => {
            console.log('Minecraft server stopped. Restarting...');
            startServer();

            mcProcess.stderr.on('data', async (data) => {
                const error = data.toString();
                io.emit('console_output', { message: error, type: 'error' });
            });
        });

        res.json({ status: "Restarting server..." });
    }
});

// Route to send a command to the Minecraft server console
app.post('/command', (req, res) => {
    const command = req.body.command;
    if (mcProcess !== null) {
        issueCommand(command);
        res.json({ status: `Server issued command: /${command}` });
    } else {
        res.json({ status: "Server is not running" });
    }
});

// Start the server on port 80
server.listen(80, () => {
    console.log('Server running on port 80');
});
