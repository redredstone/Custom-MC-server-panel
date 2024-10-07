document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        loginUser(username, password);
    });
});

function loginUser(username, password) {
    fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
        .then(response => {
          if (response.ok) {
            // User logged in successfully
            console.log('User logged in successfully');
            if (username == "admin") {
                window.location.href = "/console"
            }
          } else {
            // Handle non-successful response
            return response.json().then(data => {
              throw new Error(data.message || 'Failed to login');
            });
          }
        })
        .catch(error => {
          console.error('Error logging in:', error);
          // Optionally, display an error message to the user
        });
}
