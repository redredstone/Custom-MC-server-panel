var flyButton = document.getElementById('allow_flight')

function checkboxChanged(checkbox) {
    if (checkbox.checked) {
        console.log("Enabling " + checkbox.id)
        fetch('/server_properties', {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({content: checkbox.id + "=true"})
        })
    } else {
        fetch('/server_properties', {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({content: checkbox.id + "=false"})
        })
    }
}