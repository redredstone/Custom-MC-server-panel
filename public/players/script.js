async function fetchOnlinePlayers() {
    try {
        const response = await fetch('/online_players');
        const data = await response.json();

        const playerList = document.getElementById('playerList');
        playerList.innerHTML = '';

        if (data.players && data.players.length > 0) {
            data.players.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player';
                playerDiv.innerHTML = `<h2>${player}</h2>`;

                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'player-buttons';

                const opButton = document.createElement('button');
                opButton.className = 'playerButton';
                opButton.innerHTML = 'Op';
                opButton.style = "border-color: red;";
                opButton.onclick = () => opPlayer(player);

                const deopButton = document.createElement('button');
                deopButton.className = 'playerButton';
                deopButton.innerHTML = 'Deop';
                deopButton.style = "border-color: rgb(180, 180, 180);";
                deopButton.onclick = () => deopPlayer(player);

                const banButton = document.createElement('button');
                banButton.className = 'playerButton';
                banButton.innerHTML = 'Ban';
                banButton.style = "border-color: orange;";
                banButton.onclick = () => banPlayer(player);

                const kickButton = document.createElement('button');
                kickButton.className = 'playerButton';
                kickButton.innerHTML = 'Kick';
                kickButton.style = "border-color: yellow;";
                kickButton.onclick = () => kickPlayer(player);

                buttonsDiv.appendChild(opButton);
                buttonsDiv.appendChild(deopButton);
                buttonsDiv.appendChild(banButton);
                buttonsDiv.appendChild(kickButton);
                playerDiv.appendChild(buttonsDiv);

                playerList.appendChild(playerDiv);
            });
        } else {
            playerList.innerHTML = '<p>No players online.</p>';
        }
    } catch (error) {
        console.error('Error fetching online players:', error);
        document.getElementById('playerList').innerHTML = '<p>Error fetching player list.</p>';
    }
}

function opPlayer(player) {
    fetch(`/op_player/${player}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => alert(`${player} is now ${data.status}`))
        .catch(error => console.error('Error:', error));
}

function deopPlayer(player) {
    fetch(`/deop_player/${player}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => alert(`${player} is now ${data.status}`))
        .catch(error => console.error('Error:', error));
}

function banPlayer(player) {
    fetch(`/ban_player/${player}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => alert(`${player} has been banned.`))
        .catch(error => console.error('Error:', error));
}

function kickPlayer(player) {
    fetch(`/kick_player/${player}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => alert(`${player} has been kicked.`))
        .catch(error => console.error('Error:', error));
}

window.onload = fetchOnlinePlayers;
