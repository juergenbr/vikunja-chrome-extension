// read UI elements from options.html
const loginButton = document.getElementById('login');
const urlElement = document.getElementById('vikunjaUrl');
const defaultListElement = document.getElementById('defaultList');
const usernameElement = document.getElementById('username');
const passwordElement = document.getElementById('password');
const totpPasscodeElement = document.getElementById('totp_passcode');
// login message element
const loginMessageElement = document.getElementById('loginMessage');

// onload event when options page is opened
window.onload = () => {
    // load stored settings for vikunja extension from chrome storage
    loadSettings().then((settings) => {
        if(settings !== undefined){
            console.log('Settings found');
        }
        if (settings.url === undefined || settings.url === '') {
            urlElement.value = '';
        }
        else {
            urlElement.value = settings.url;
        }
        if (settings.username === undefined || settings.username === '') {
            usernameElement.value = '';
        }
        else {
            usernameElement.value = settings.username;
        }
        if (settings.token === undefined || settings.token === '') {
            passwordElement.hidden = fale;
            totpPasscodeElement.hidden = false;
            loginMessageElement.style.color = 'red';
            loginMessageElement.innerHTML = 'Please login to Vikunja';
        } else {
            //if token expired, show login form
            const validUntilDate = new Date(decodeJWT(settings.token).exp * 1000);
            const now = new Date();
            if (validUntilDate < now) {
                passwordElement.hidden = false;
                totpPasscodeElement.hidden = false;
                loginMessageElement.style.color = 'red';
                loginMessageElement.innerHTML = 'Token expired, please login to Vikunja';
            }
            else{
                passwordElement.hidden = true;
                totpPasscodeElement.hidden = true;
                loginMessageElement.style.color = 'green';
                loginMessageElement.innerHTML = 'Token is valid for user ' + settings.username + '.' + '<br>' + 'Token valid until ' + new Date(decodeJWT(settings.token).exp * 1000).toLocaleDateString();  
                loadListsOnStartup();  
            }
        }
        if (settings.defaultList === undefined || settings.defaultList === '') {
            defaultListElement.innerHTML = '';
        }
        else {
            defaultListElement.innerHTML = settings.defaultList;
        }
    }).catch(() => {
        // if no settings are found, do nothing
    });
};

// onSelectionChanged event when defaultListElement is changed
defaultListElement.onchange = () => {
    // update existing settings with value from defaultListElement
    loadSettings().then((settings) => {
        settings.defaultList = defaultListElement.value;
        saveSettings(settings.token);
    });
};

//function to store values in settings for vikunja extension
function saveSettings(token) {
    // store the url and token in chrome storage
    console.log('Saving settings')
    chrome.storage.local.set({
        vikunja: {
            url: urlElement.value,
            username: usernameElement.value,
            token: token,
            // set default list to currenty selected list element
            defaultList: defaultListElement.value
        }
    }
    );
} // saveSettings

function loadSettings() {
    console.log('Loading settings');
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

function checkToken() {
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
    const url = urlElement.value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const totp_passcode = document.getElementById('totp_passcode').value;
    // login
    login(url, username, password, totp_passcode).then((response) => {
        // log the response to the console
        console.log(response);
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
function login(url, username, password, totp_passcode) {
    // create a new promise
    return new Promise((resolve, reject) => {
        // create a new XMLHttpRequest
        const xhr = new XMLHttpRequest();
        // set the request method to POST
        xhr.open('POST', url + '/api/v1/login');
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
                token = JSON.parse(xhr.response).token;
                //set login message in options page
                loginMessageElement.style.color = 'green';
                loginMessageElement.innerHTML = 'Login successful.<br>' + token;
                // show notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: '../images/icon_128.png',
                    title: 'Vikunja Extension',
                    message: 'Login successful.',
                });
                // save the settings
                saveSettings(token);
                loadListsOnStartup();
            } else {
                // reject the promise with the response
                reject(xhr.response);
                //set login message in options page
                loginMessageElement.style.color = 'red';
                loginMessageElement.innerHTML = 'Login failed: ' + xhr.response.message;
            }
        };
    }
    );
} // login