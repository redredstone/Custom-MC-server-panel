const express = require('express');
const session = require('express-session');
const hash = require('pbkdf2-password')()
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let mcProcess = null; // Will hold the Minecraft server process
let serverState = 'Offline'; // Initial state
const serverDir = __dirname + "/server"; // Directory the server is in

onlinePlayers = []

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
  { name: 'admin' , salt: '' , hash: ''}
];

// Change in future lol
hash({ password: 'admin' }, function (err, pass, salt, hash) {
  if (err) throw err;
  users[0].salt = salt;
  users[0].hash = hash;
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
    if (mcProcess !== null) {
        mcProcess.stdin.write(command + "\n");
    }
}

function updateServerState(newState) {
    serverState = newState
    io.emit('server_status', newState)
}

function getOnlinePlayers() {
    if (mcProcess !== null && serverState === "Running") {
        mcProcess.stdout.once('data', (data) => {
            const output = data.toString();
    
            const ansiRegex = /\u001b\[[0-9;]*m/g;
    
            if (output.includes('players online')) {
                const cleanedOutput = output.replace(ansiRegex, '');
    
                const playersText = cleanedOutput.split(": ")[2];
    
                if (playersText) {
                    onlinePlayers = [];
                    const allPlayers = playersText.split(', ').filter(player => player.trim().length > 0);
                    for (let index = 0; index < allPlayers.length; index++) {
                        let newElement = allPlayers[index].replace("\r\n", "").trim();
                        onlinePlayers.push(newElement);
                    }
    
                    return { players: onlinePlayers };
                } else {
                    return { players: [] };
                }
            }
        });
        issueCommand("list");
    }
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

app.get('/players', restrict, (req, res) => {
    res.sendFile(__dirname + "/public/players/players.html")
})

app.get('/console', restrict, (req, res) => {
    res.sendFile(__dirname + "/public/console/console.html");
})

app.get('/bans', restrict, (req, res) => {
    res.sendFile(__dirname + "/public/banList/banList.html")
})

app.get('/properties', restrict, (req, res) => {
    res.sendFile(__dirname + "/public/properties/serverProperties.html")
})

app.get('/404', (req, res) => {
    res.sendFile(__dirname + "/public/commonPages/404Page.html");
})

app.get('/403', (req, res) => {
    res.sendFile(__dirname + "/public/commonPages/403Page.html")
})


app.get('/status', restrict, (req, res) => {
    res.send({state: serverState});
})

app.get('/online_players', restrict, (req, res) => {
    getOnlinePlayers();
    res.send({players: onlinePlayers})
})

app.get('/banned_players', restrict, (req, res) => {
    playersFound = []

    fs.readFile(serverDir + "/banned-players.json", 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading banned-players.json:', err);
            return;
        }
        
        try {
            const bannedPlayers = JSON.parse(data);
            
            bannedPlayers.forEach(player => {
                playersFound.push({user:player.name, banReason: player.reason})
            });
            
            res.send({players: playersFound})
        } catch (parseErr) {
            console.error('Error parsing JSON:', parseErr);
        }
    });
})

app.get('/banned_ips', restrict, (req, res) => {
    ipsFound = []

    fs.readFile(serverDir + "/banned-ips.json", 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading banned-ips.json:', err);
            return;
        }
        
        try {
            const bannedIPs = JSON.parse(data);
            
            bannedIPs.forEach(ip => {
                ipsFound.push({ip_address:ip.ip, banReason: ip.reason})
            });
            
            res.send({ips: ipsFound})
        } catch (parseErr) {
            console.error('Error parsing JSON:', parseErr);
        }
    });
})

app.get('/server_properties', restrict, (req, res) => {
    fs.readFile(serverDir + "/server.properties", 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading file');
        } else {
            const newData = data.split("\n")
            var dataToSend = {}
            newData.forEach(line => {
                const newLine = line.split("=")
                if (newLine.length > 1 && newLine[1] !== undefined) {
                    dataToSend[newLine[0]] = newLine[1].replace('\r', "")
                }
            })
            res.send({properties: dataToSend});
        }
    });
});

app.post('/server_properties', restrict, (req, res) => {
    const newContent = req.body.content;
    const [key, newValue] = newContent.split('=');

    fs.readFile(serverDir + "/server.properties", 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading file');
        } else {
            // Split the content into lines
            const lines = data.split('\n');
            
            const updatedLines = lines.map(line => {
                if (line.startsWith(key + '=')) {
                    return `${key}=${newValue}`;
                }
                return line;
            });

            const updatedContent = updatedLines.join('\n');

            fs.writeFile(serverDir + "/server.properties", updatedContent, 'utf8', (err) => {
                if (err) {
                    res.status(500).send('Error saving file');
                } else {
                    res.status(200).send('File saved successfully');
                }
            });
        }
    });
});

app.post('/start', restrict, async (req, res) => {
    if (mcProcess === null) {
        startServer();
        res.json({ status: "Starting server..." });
    } else {
        res.json({ status: "Server is already running" });
    }
});

app.post('/stop', restrict, async (req, res) => {
    if (mcProcess !== null) {
        stopServer();
        res.json({ status: "Stopping server" });
    } else {
        res.json({ status: "Server is not running" });
    }
});

app.post('/restart', restrict, async (req, res) => {
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

app.post('/op_player/:player', restrict, (req, res) => {
    const player = req.params.player;
    issueCommand(`op ${player}`); // or `deop ${player}` based on the player's current status
    res.json({ status: 'opped' }); // respond with the updated status
});

app.post('/deop_player/:player', restrict, (req, res) => {
    const player = req.params.player;
    issueCommand(`deop ${player}`); // or `deop ${player}` based on the player's current status
    res.json({ status: 'deopped' }); // respond with the updated status
});

app.post('/kick_player/:player', restrict, (req, res) => {
    const player = req.params.player;
    issueCommand(`kick ${player}`);
    res.json({ status: 'kicked' });
});

app.post('/ban_player/:player', restrict, (req, res) => {
    const player = req.params.player;
    issueCommand(`ban ${player}`);
    res.json({ status: 'banned' });
});

app.post('/unban_player/:player', restrict, (req, res) => {
    const player = req.params.player;
    issueCommand(`pardon ${player}`);
    res.json({ status: 'unbanned' });
})

app.post('/unban_ip', restrict, (req, res) => {
    const ip = req.body.ip_address;
    console.log(req.body)
    console.log(req)
    console.log(ip)
    issueCommand(`pardon-ip ${ip}`);
    res.json({ status: 'unbanned' });
})

// Route to send a command to the Minecraft server console
app.post('/command', restrict, (req, res) => {
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
