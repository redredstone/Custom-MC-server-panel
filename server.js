const express = require('express');
var session = require('express-session');
var hash = require('pbkdf2-password')()
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let mcProcess = null; // Will hold the Minecraft server process
let serverState = 'Offline'; // Initial state
const serverDir = __dirname + "/server"; // Directory the server is in

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }))
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'shhhh, very secret'
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

const users = [
  { name: 'admin' , salt: '' , hash: ''},
  { name: 'guest' , salt: '' , hash: ''}
];

hash({ password: 'admin' }, function (err, pass, salt, hash) {
  if (err) throw err;
  users[0].salt = salt;
  users[0].hash = hash;
});

hash({ password: '' }, function (err, pass, salt, hash) {
  if (err) throw err;
  users[1].salt = salt;
  users[1].hash = hash;
});

function authenticate(name, pass, ip, fn) {
  if (!module.parent) console.log('authenticating as %s: on ip %s', name, ip);

  const user = Object.values(users).find(user => user.name === name);
  if (!user) return fn(null, null);
  hash({ password: pass, salt: user.salt }, function (err, hashedPass, salt, hashedPassword) {
    if (err) return fn(err);
    if (hashedPassword === user.hash) return fn(null, user);
    fn(null, null);
  });
}


function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/403');
  }
}

function issueCommand(command) {
    mcProcess.stdin.write(command + "\n");
}

function updateServerState(newState) {
    serverState = newState
    io.emit('server_status', newState)
}

function startServer() {
    updateServerState("Starting");

    console.log(`Starting server....`);

    mcProcess = spawn('java', ['-Xmx1024M', '-Xms1024M', '-jar', 'server.jar', 'nogui'], { cwd: serverDir });

    mcProcess.stdout.on('data', async (data) => {
        const output = data.toString();
        console.log(output);
        io.emit('console_output', { message: output, type: 'info' });

        // Check if the server has started successfully (based on "Done" message)
        if (output.includes('Done')) {
            updateServerState("Running");
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
        updateServerState("Offline");
    });

}

function stopServer() {
    updateServerState("Stopping");

    console.log('Stopping Minecraft server...');
    issueCommand("stop\n");
    //mcProcess.stdin.write("stop\n");

    mcProcess.on('exit', async () => {
        mcProcess = null;
        updateServerState("Offline");
    });
}

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  if (!req.session.user) {
    res.sendFile(__dirname + "/public/login/login.html");
  } else {
    res.redirect("/console");
  }
});

app.post('/login', (req, res, next) => {
  authenticate(req.body.username, req.body.password, req.ip, function (err, user) {
    if (err) return next(err);
    if (user) {
      req.session.regenerate(function () {
        req.session.user = user;
        res.sendStatus(200);
      });
    } else {
      res.sendStatus(403);
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/status', restrict, (req, res) => {
    res.send({state: serverState});
})

app.get('/console', restrict, (req, res) => {
    res.sendFile(__dirname + "/public/console/console.html");
})

app.get('/404', (req, res) => {
    res.sendFile(__dirname + "/public/commonPages/404Page.html");
})

app.get('/403', (req, res) => {
    res.sendFile(__dirname + "/public/commonPages/403Page.html")
})

// Route to start the Minecraft server
app.post('/start', async (req, res) => {
    if (mcProcess === null) {
        startServer();
        res.json({ status: "Starting server..." });
    } else {
        res.json({ status: "Server is already running" });
    }
});

// Route to stop the Minecraft server
app.post('/stop', async (req, res) => {
    if (mcProcess !== null) {
        stopServer();
        res.json({ status: "Stopping server" });
    } else {
        res.json({ status: "Server is not running" });
    }
});

// Route to restart the Minecraft server
app.post('/restart', async (req, res) => {
    if (!serverDir) {
        return res.status(400).json({ status: "Minecraft server directory is not defined." });
    }

    if (mcProcess !== null) {
        updateServerState("Restarting");

        console.log('Restarting server...');
        stopServer();

        mcProcess.on('exit', async () => {
            console.log('Server stopped. Restarting...');
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

app.get('*', (req, res) => {
    res.redirect("/404");
})

// Start the server on port 80
server.listen(80, () => {
    console.log('Server running on port 80');
});
