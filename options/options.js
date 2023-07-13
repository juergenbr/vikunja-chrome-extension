// read UI elements from options.html
const button = document.getElementById('save');
const loginButton = document.getElementById('login');
const urlElement = document.getElementById('vikunjaUrl');
const tokenElement = document.getElementById('vikunjaToken');
const defaultListElement = document.getElementById('defaultList');

// onload event when options page is opened
window.onload = () => {
    // load stored settings for vikunja extension from chrome storage

    chrome.storage.local.get('vikunja', (result) => {
        // check if settings exist, if not log to console
        if (result.vikunja === undefined) {
            console.log('no settings found');
            return;
        }
        else {
            const vikunja = result.vikunja;
            // set the url and token in the options UI
            urlElement.value = vikunja.url;
            tokenElement.value = vikunja.token;
            validateToken(vikunja.token);
            loadListsOnStartup();
        }
    }
    );
};

//function to store values in settings for vikunja extension
function saveSettings() {
    // store the url and token in chrome storage
    console.log(defaultListElement.value)
    chrome.storage.local.set({
        vikunja: {
            url: urlElement.value,
            token: tokenElement.value,
            // set default list to currenty selected list element
            defaultList: defaultListElement.value
        }
    }
    );
} // saveSettings

function loadSettings() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('vikunja', (result) => {
            if (result.vikunja === undefined) {
                console.log('no settings found');
                reject();
            }
            const vikunja = result.vikunja;
            resolve(vikunja);
        });
    });
}

//onClick listener for the button
button.addEventListener('click', () => {
    // log to the console that the button was clicked
    console.log('button clicked');
    // save the settings
    saveSettings();
}
); // button.addEventListener

function checkToken() {
    loadSettings().then((settings) => {
        const validationResults = validateToken(settings.token);
        if (validationResults[0] === true) {
            console.log('token is valid for user ' + validationResults[1]);
            currentUser = validationResults[1];
        } else {
            console.log('token is invalid for user ' + validationResults[1]);
            // show notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: '../images/icon_128.png',
                title: 'Vikunja Extension',
                message: 'Vikunja Token is invalid. Please check your settings.',
            });
            // open options page
            chrome.runtime.openOptionsPage();

        }
    });
}

function decodeJWT(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    const decoded = JSON.parse(window.atob(base64));
    return decoded;
}

function validateToken(token) {
    console.log(token);
    if (token === undefined || token === '') {
        return [false, ''];
    }
    const decoded = decodeJWT(token);
    const now = Date.now() / 1000;
    // log token validity date as DD-MM-YYYY
    console.log("Token valid until " + new Date(decoded.exp * 1000).toLocaleDateString());
    if (decoded.exp < now) {
        return [false, decoded.username];
    }
    return [true, decoded.username];
}

function loadListsOnStartup() {
    loadSettings().then((settings) => {
        console.log(settings);
        //clear defaultListElement options
        defaultListElement.innerHTML = '';
        // get all Vikunja lists
        fetchLists(settings.url, settings.token).then((lists) => {
            // loop through the lists
            lists.forEach((list) => {
                // create an option element
                const option = document.createElement('option');
                // set the option's value to the list's id
                option.value = list.id;
                // set the option's text to the list's name
                option.text = list.title;
                // append the option to the list element
                console.log(option);
                defaultListElement.appendChild(option);
            });

            // set selected element in the options UI
            defaultListElement.value = settings.defaultList;
        });
    });
}

async function fetchLists(url, token) {
    const headers = new Headers();
    headers.append('Authorization', `Bearer ${token}`);
    headers.append('Content-Type', 'application/json');

    //pre 0.21.0
    //const response = await fetch(`${url}/api/v1/lists`, {
    const response = await fetch(`${url}/api/v1/projects`, {
        method: 'GET',
        headers: headers,
    })
    console.log(response);
    const jsonData = await response.json();
    console.log(jsonData);
    return jsonData;
}



//onClick listener for the login button
loginButton.addEventListener('click', () => {
    // log to the console that the button was clicked
    console.log('login button clicked');
    // get values from form
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const totp_passcode = document.getElementById('totp_passcode').value;
    // login
    login(username, password, totp_passcode).then((response) => {
        // log the response to the console
        console.log(response);
        // show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '../images/icon_128.png',
            title: 'Vikunja Extension',
            message: 'Login successful.',
        });
        // save the settings
        saveSettings();
    }
    ).catch((error) => {
        // log the error to the console
        console.log(error);
        // show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '../images/icon_128.png',
            title: 'Vikunja Extension',
            message: 'Login failed. Please check your settings.',
        });
    }
    );
}
); // loginButton.addEventListener


// login method, taking username, passowrd and 2FA code from options.html
function login(username, password, totp_passcode) {
    // create a new promise
    return new Promise((resolve, reject) => {
        // create a new XMLHttpRequest
        const xhr = new XMLHttpRequest();
        // set the request method to POST
        xhr.open('POST', urlElement.value + '/login');
        // set the request header to JSON
        xhr.setRequestHeader('Content-Type', 'application/json');
        // set the request body to username, password and 2FA code
        xhr.send(JSON.stringify({
            "long_token": true,
            username: username,
            password: password,
            totp_passcode: totp_passcode
        }
        ));
        // onload event
        xhr.onload = () => {
            // check if the response status is 200
            if (xhr.status === 200) {
                // resolve the promise with the response
                resolve(xhr.response);
                // set token setting in chrome storage
                chrome.storage.local.set({
                    vikunja: {
                        token: JSON.parse(xhr.response).token
                    }
                }
                );
            } else {
                // reject the promise with the response
                reject(xhr.response);
            }
        };
    }
    );
} // login