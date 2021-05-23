// Modules to control application life and create native browser window
const fs = require('fs')
const path = require('path')
const { app, BrowserWindow, session, Menu, ipcMain } = require('electron')

const Store = require('electron-store')
const { ElectronBlocker, fullLists, Request } = require('@cliqz/adblocker-electron')
const fetch = require('node-fetch');
const { spawn } = require('child_process');
const headerScript = fs.readFileSync(
  path.join(__dirname, 'client-header.js'),
  'utf8'
);

// Create Global Varibles
let mainWindow; // Global Windows Object
const menu = require('./menu');
const { exec } = require('child_process')
const store = new Store();

// Analytics endpoint
let defaultUserAgent;

async function createWindow() {
  store.set('activeService', 'home');
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 890,
    height: 600,
    kiosk: true,
    webPreferences: {
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      enableRemoteModule: true,
      contextIsolation: false, // Must be disabled for preload script. I am not aware of a workaround but this *shouldn't* effect security
      plugins: true,
      preload: path.join(__dirname, 'client-preload.js')
    },

    // Window Styling
    transparent: false,
    vibrancy: 'ultra-dark',
    frame: store.get('options.pictureInPicture')
      ? false
      : !store.get('options.hideWindowFrame'),
    alwaysOnTop: store.get('options.alwaysOnTop'),
    toolbar: false,
    backgroundColor: '#00000000',
    fullscreen: store.get('options.launchFullscreen')
  });

  defaultUserAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36";

  // Connect Adblocker To Window if Enabled
  if (store.get('options.adblock')) {
    let engineCachePath = path.join(
      app.getPath('userData'),
      'adblock-engine-cache.txt'
    );

    if (fs.existsSync(engineCachePath)) {
      console.log('Adblock engine cache found. Loading it into app.');
      var engine = await ElectronBlocker.deserialize(
        fs.readFileSync(engineCachePath)
      );
    } else {
      var engine = await ElectronBlocker.fromLists(fetch, fullLists);
    }
    engine.enableBlockingInSession(session.defaultSession);

    // Backup Engine Cache to Disk
    fs.writeFile(engineCachePath, engine.serialize(), err => {
      if (err) throw err;
      console.log('Adblock Engine file cache has been updated!');
    });
  }

  // Reset The Windows Size and Location
  let windowDetails = store.get('options.windowDetails');
  let relaunchWindowDetails = store.get('relaunch.windowDetails');
  if (relaunchWindowDetails) {
    mainWindow.setSize(
      relaunchWindowDetails.size[0],
      relaunchWindowDetails.size[1]
    );
    mainWindow.setPosition(
      relaunchWindowDetails.position[0],
      relaunchWindowDetails.position[1]
    );
    store.delete('relaunch.windowDetails');
  } else if (windowDetails) {
    mainWindow.setSize(windowDetails.size[0], windowDetails.size[1]);
    mainWindow.setPosition(
      windowDetails.position[0],
      windowDetails.position[1]
    );
  }

  // Detect and update version
  if (!store.get('version')) {
    store.set('version', app.getVersion());
    store.set('services', []);
    console.log('Initialised Config!');
  }

  // Load the services and merge the users and default services
  let userServices = store.get('services') || [];
  global.services = userServices;

  require('./default-services').forEach(dservice => {
    let service = userServices.find(service => service.name == dservice.name);
    if (service) {
      global.services[userServices.indexOf(service)] = {
        name: service.name ? service.name : dservice.name,
        logo: service.logo ? service.logo : dservice.logo,
        url: service.url ? service.url : dservice.url,
        color: service.color ? service.color : dservice.color,
        style: service.style ? service.style : dservice.style,
        userAgent: service.userAgent ? service.userAgent : dservice.userAgent,
        permissions: service.permissions
          ? service.permissions
          : dservice.permissions,
        hidden: service.hidden != undefined ? service.hidden : dservice.hidden,
      };
    } else {
      dservice._defaultService = true;
      global.services.push(dservice);
    }
  });

  // Create The Menubar
  Menu.setApplicationMenu(menu(store, global.services, mainWindow, app, defaultUserAgent));
  console.log('Loading The Main Menu');
  mainWindow.loadFile('src/ui/index.html');


  // Emitted when the window is closing
  mainWindow.on('close', e => {
    // Save open service if lastOpenedPage is the default service
    if (store.get('options.defaultService') == 'lastOpenedPage') {
      store.set('options.lastOpenedPage', mainWindow.getURL());
    }

    // If enabled store the window details so they can be restored upon restart
    if (store.get('options.windowDetails')) {
      if (mainWindow) {
        store.set('options.windowDetails', {
          position: mainWindow.getPosition(),
          size: mainWindow.getSize()
        });
      } else {
        console.error(
          'Error window was not defined while trying to save windowDetails'
        );
        return;
      }
    }
  });

  // Inject Header Script On Page Load If In Frameless Window
  mainWindow.webContents.on('dom-ready', broswerWindowDomReady);

  // This method is called when the broswer window's dom is ready
  // it is used to inject the header if pictureInPicture mode and
  // hideWindowFrame are enabled.
  function broswerWindowDomReady() {
    //dirty hack
    if (store.get('activeService') !== 'home') {
      mainWindow.webContents.executeJavaScript(headerScript);
    }
  }
  // Emitted when the window is closed.
  mainWindow.on('closed', mainWindowClosed);

  // Emitted when website requests permissions - Electron default allows any permission this restricts websites
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      let websiteOrigin = new URL(webContents.getURL()).origin;
      let service = global.services.find(
        service => new URL(service.url).origin == websiteOrigin
      );

      if (
        (service &&
          service.permissions &&
          service.permissions.includes(permission)) ||
        permission == 'fullscreen'
      ) {
        console.log(
          `Allowed Requested Browser Permission '${permission}' For Site '${websiteOrigin}'`
        );
        return callback(true);
      }

      console.log(
        `Rejected Requested Browser Permission '${permission}' For Site '${websiteOrigin}'`
      );
      return callback(false);
    }
  );
}



// Run when window is closed. This cleans up the mainWindow object to save resources.
function mainWindowClosed() {
  mainWindow = null;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// The timeout fixes the trasparent background on Linux ???? why

// This is a custom event that is used to relaunch the application.
// It destroys and recreates the broswer window. This is used to apply
// settings that Electron doesn't allow to be changed on an active
// broswer window.
app.on('relaunch', () => {
  console.log('Relaunching The Application!');

  // Store details to remeber when relaunched
  if (mainWindow.getURL() != '') {
    store.set('relaunch.toPage', mainWindow.getURL());
  }
  store.set('relaunch.windowDetails', {
    position: mainWindow.getPosition(),
    size: mainWindow.getSize()
  });

  // Destory The BroswerWindow
  mainWindow.webContents.removeListener('dom-ready', broswerWindowDomReady);

  // Remove App Close Listener
  mainWindow.removeListener('closed', mainWindowClosed);

  // Close App
  mainWindow.close();
  mainWindow = undefined;

  // Create a New BroswerWindow
  createWindow();
});

/*
EVENTS
EVENTS
EVENTS
EVENTS
*/

app.on('widevine-ready', event => {
  console.log(event)
  setTimeout(createWindow, 500)
})

app.on('widevine-error', e => {
  console.log(e)
  console.log('widewine error)');
})

app.on('widevine-update-pending', (currentVersion, pendingVersion) => {
  console.log('Widevine ' + currentVersion + ' is ready to be upgraded to ' + pendingVersion + '!')
})

// Change the windows url when told to by the ui
ipcMain.on('open-url', (e, service) => {
  console.log('Openning Service ' + service.name);
  store.set('activeService', service.name)
  if (service.name === "Spotify") {
    const spotify = spawn('spotify');
    spotify.on('close', (code) => {
      console.log('Spotify is dead, long live Spotify')
      ipcMain.emit('go-mainmenu');
    })
  } else {
    mainWindow.webContents.userAgent = service.userAgent ? service.userAgent : defaultUserAgent;
    mainWindow.loadURL(service.url);
  }
});

// Disable fullscreen when button pressed
ipcMain.on('exit-fullscreen', e => {
  if (store.get('options.hideWindowFrame')) {
    store.delete('options.hideWindowFrame');
  }
  // Relaunch
  // app.emit('relaunch');
  // Die
  app.quit();

});

ipcMain.on('go-mainmenu', e => {
  store.set('activeService', 'home');
  mainWindow.loadFile('src/ui/index.html');
})
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS it's common to re-create a window in the app when the
// dock icon is clicked and there are no other windows open.
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/* Restrict Electrons APIs In Renderer Process For Security */

function rejectEvent(event) {
  event.preventDefault();
}

const allowedGlobals = new Set(['services']);
app.on('remote-get-global', (event, webContents, globalName) => {
  if (!allowedGlobals.has(globalName)) {
    event.preventDefault();
  }
});
app.on('remote-require', rejectEvent);
app.on('remote-get-builtin', rejectEvent);
app.on('remote-get-current-window', rejectEvent);
app.on('remote-get-current-web-contents', rejectEvent);
app.on('remote-get-guest-web-contents', rejectEvent);
