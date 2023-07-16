// TODO: implement context menu

/* chrome.runtime.onInstalled.addListener(async () => {
    chrome.contextMenus.create({
        id: "vikunja-link",
        title: 'Add Link to Vikunja',
        type: 'normal',
        contexts: ['link']
    });
    chrome.contextMenus.create({
        id: "vikunja-text",
        title: 'Add seleted text to Vikunja',
        type: 'normal',
        contexts: ['selection']
    }
    );
});

// Open a new search tab when the user clicks a context menu
chrome.contextMenus.onClicked.addListener((item, tab) => {
    // switch on the item id
    switch (item.menuItemId) {
        case 'vikunja-link':
            // get the url of the link
            const linkUrl = item.linkUrl;
            // get the title of the link
            const linkTitle = item.selectionText;
            //new notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: '../images/icon_128.png',
                title: 'Vikunja Extension',
                message: 'Link added to Vikunja',
            });
            chrome.action.openPopup();
            console.log(linkUrl + " " + linkTitle);
            break;
        case 'vikunja-text':
            // get the title of the link
            const selectedText = item.selectionText;
            // get the title of the url
            const title = item.title;
            chrome.notifications.create({
                type: 'basic',
                iconUrl: '../images/icon_128.png',
                title: 'Vikunja Extension',
                message: 'Text added to Vikunja',
            });
            // open popup with text and current url
            chrome.action.openPopup();
            console.log(title + " " + selectedText);
            break;
    }

  }); */