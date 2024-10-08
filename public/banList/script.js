async function fetchOnlinePlayers() {
    try {
        const response = await fetch('/banned_players');
        const data = await response.json();

        const ip_response = await fetch('/banned_ips');
        const ip_data = await ip_response.json();

        const playerList = document.getElementById('bannedPlayersList');
        const ipList = document.getElementById('bannedIPsList')
        playerList.innerHTML = '';

        if (data.players && data.players.length > 0) {
            data.players.forEach(player => {
                console.log(player)
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player';
                playerDiv.innerHTML = `<h2>${player.user}</h2>`;

                const banReasonDiv = document.createElement('div');
                banReasonDiv.className = 'ban-reason';
                banReasonDiv.innerHTML = `<h3>${player.banReason}</h3>`;
                
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'player-buttons';

                const opButton = document.createElement('button');
                opButton.className = 'playerButton';
                opButton.innerHTML = 'Remove Ban';
                opButton.style = "border-color: red;";
                opButton.onclick = () => removeUserBan(player.user);

                buttonsDiv.appendChild(opButton);
                playerDiv.appendChild(banReasonDiv)
                playerDiv.appendChild(buttonsDiv);

                playerList.appendChild(playerDiv);
            });
        } else {
            playerList.innerHTML = '<p>No players were banned.</p>';
        }

        if (ip_data.ips && ip_data.ips.length > 0) {
            ip_data.ips.forEach(ip => {
                console.log(ip)
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player';
                playerDiv.innerHTML = `<h2>${ip.ip_address}</h2>`;

                const banReasonDiv = document.createElement('div');
                banReasonDiv.className = 'ban-reason';
                banReasonDiv.innerHTML = `<h3>${ip.banReason}</h3>`;
                
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'player-buttons';

                const opButton = document.createElement('button');
                opButton.className = 'playerButton';
                opButton.innerHTML = 'Remove Ban';
                opButton.style = "border-color: red;";
                opButton.onclick = () => removeIpBan(ip.ip_address);

                buttonsDiv.appendChild(opButton);
                playerDiv.appendChild(banReasonDiv)
                playerDiv.appendChild(buttonsDiv);

                ipList.appendChild(playerDiv);
            });
        } else {
            ipList.innerHTML = '<p>No ips were banned.</p>';
        }
    } catch (error) {
        console.error('Error fetching bans:', error);
        document.getElementById('bannedPlayersList').innerHTML = '<p>Error fetching list.</p>';
    }
}

function removeUserBan(player) {
    fetch(`/unban_player/${player}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            alert(`${player} is now ${data.status}`)
            location.reload()
        })
        .catch(error => console.error('Error:', error));
}

function removeIpBan(ip) {
    fetch(`/unban_ip`, {
        method: 'POST',
        headers: {"Content-Type": "application/json"},
        body:JSON.stringify({ip_address: ip}) 
    })
    .then(response => response.json())
    .then(data => {
        alert(`${ip} is now ${data.status}`)
        location.reload()
    })
    .catch(error => console.error('Error:', error));
}

window.onload = fetchOnlinePlayers;
