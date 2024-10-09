function updateProperties(data) {
    fetch('/server_properties', {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({content: data})
    })
}

function fieldChanged(field) {
    updateProperties(field.id + "=" + field.value);
}

function selectionChanged(select) {
    updateProperties(select.id + "="+select.value);
}

function setupValues() {
    fetch('/server_properties', {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    })
    .then(response => response.json())
    .then(data => {
        var properties = data.properties
        for (const key in properties) {
            if (Object.prototype.hasOwnProperty.call(properties, key)) {
                const value = properties[key];
                const element = document.getElementById(key);
                if (document.getElementById(key)) {
                    if ( element.type == "checkbox") {
                        if (value.toLowerCase() === "true") {
                            element.checked = true;
                        } else {
                            element.checked = false;
                        }
                    } else if (element.type == "select-one") {
                        element.value = value
                    } else if (element.type == "number" || element.type == "text") {
                        element.value = value
                    }
                } else {
                    console.log("No element with id " + key)
                }
            }
        }
    })
}

setupValues();