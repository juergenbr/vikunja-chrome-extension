'use strict';

// the popup performs the following functions:
// 1. get the current tab
// 2. get the current tab's url
// 3. provide the URL to the Popup UI
// 4. listen for the user to click the button
// 5. send a message to the content script to create a new note
// 6. get all Vikunja lists

//get elements from the popup UI
const button = document.getElementById('createTask');
const listElement = document.getElementById('list');
const titleElement = document.getElementById('taskName');
const dueDateElement = document.getElementById('dueDate');

let currentUser = '';

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

// onload event when popup is opened
window.onload = () => {
  // get the current tab's url
  getTabTitle().then((title) => {
    // set the url in the popup UI
    console.log(title);
    //set text in the popup UI
    titleElement.value = title;
  });
  // get current date formated as yyyy-MM-ddThh:mm
  
  dueDateElement.value = new Date().toISOString().slice(0, 16);

  checkToken();

  loadListsOnStartup();

};

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
    //clear listElement options
    listElement.innerHTML = '';
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
        listElement.appendChild(option);
      });
      // set selected element in the options UI
      listElement.value = settings.defaultList;
    });
  });
}

// onClick listener for the button
button.addEventListener('click', () => {
  // log to the console that the button was clicked
  console.log('button clicked');
  loadSettings().then((settings) => {
    console.log(settings);
    createTask(settings.url, settings.token).then((task) => {
      // show notification
      console.log(task);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../images/icon_128.png',
        title: 'Vikunja Extension',
        message: 'Task created successfully.',
      });
    });
  });
});


function getTab() {
  return chrome.tabs.query({ active: true, currentWindow: true });
} // getTab

function getTabUrl() {
  return getTab().then((tabs) => {
    return tabs[0].url;
  });
} // getTabUrl

// get tab title
function getTabTitle() {
  return getTab().then((tabs) => {
    return tabs[0].title;
  });
} // getTabTitle

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

//function to create a new list entry
async function createTask(url, token) {
  const headers = new Headers();
  headers.append('Authorization', `Bearer ${token}`);
  headers.append('Content-Type', 'application/json');
  const listId = listElement.value;
  // get due date from the popup UI
  const reminderDate = dueDateElement.value;
  const reminderDateAsDate = new Date(reminderDate);
  const reminderDateFormatted = reminderDateAsDate.toISOString();

  // current url
  const tabUrl = await getTabUrl();
  console.log(dueDate);
  //pre 0.21.0
  //const response = await fetch(`${url}/api/v1/lists/${listId}`, {
  const response = await fetch(`${url}/api/v1/projects/${listId}`, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify(
      {
      list_id: parseInt(listElement.value),
      title: titleElement.value,
      description: tabUrl,
      reminder_dates: [reminderDateFormatted]
      }
    ),
  })
  console.log(response);
  const jsonData = await response.json();
  console.log(jsonData);
  return jsonData;
} // createTask

// function to get the user object from the API
async function getUser(url, token) {
  const headers = new Headers();
  headers.append('Authorization', `Bearer ${token}`);
  headers.append('Content-Type', 'application/json');

  const response = await fetch(`${url}/api/v1/user`, {
    method: 'GET',
    headers: headers,
  })
  console.log(response);
  const jsonData = await response.json();
  console.log(jsonData);
  return jsonData;
} // getUser