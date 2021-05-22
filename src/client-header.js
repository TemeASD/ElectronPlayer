/* This is injecting into remote webpages to add a
menubar which can be used to move the window around
and exit from frameless window on linux which were
the frameless window hides the settings menu.
*/

console.log('ElectronPlayer: Injected Header');

document.body.insertAdjacentHTML(
  'beforebegin',
  `
  <div id="ElectronPlayer-topbar">
  <span class="hidden-and-0 menu-button" onclick="ipc.send('exit-fullscreen')">
      <svg class="svg-icon" viewBox="0 0 20 20">
          <path d="M10.185,1.417c-4.741,0-8.583,3.842-8.583,8.583c0,4.74,3.842,8.582,8.583,8.582S18.768,14.74,18.768,10C18.768,5.259,14.926,1.417,10.185,1.417 M10.185,17.68c-4.235,0-7.679-3.445-7.679-7.68c0-4.235,3.444-7.679,7.679-7.679S17.864,5.765,17.864,10C17.864,14.234,14.42,17.68,10.185,17.68 M10.824,10l2.842-2.844c0.178-0.176,0.178-0.46,0-0.637c-0.177-0.178-0.461-0.178-0.637,0l-2.844,2.841L7.341,6.52c-0.176-0.178-0.46-0.178-0.637,0c-0.178,0.176-0.178,0.461,0,0.637L9.546,10l-2.841,2.844c-0.178,0.176-0.178,0.461,0,0.637c0.178,0.178,0.459,0.178,0.637,0l2.844-2.841l2.844,2.841c0.178,0.178,0.459,0.178,0.637,0c0.178-0.176,0.178-0.461,0-0.637L10.824,10z"></path>
      </svg></span>
  <span class="hidden-and-0 menu-button" onclick="ipc.send('go-mainmenu')">
      <svg class="svg-icon" viewBox="0 0 20 20">
          <path
              d="M18.121,9.88l-7.832-7.836c-0.155-0.158-0.428-0.155-0.584,0L1.842,9.913c-0.262,0.263-0.073,0.705,0.292,0.705h2.069v7.042c0,0.227,0.187,0.414,0.414,0.414h3.725c0.228,0,0.414-0.188,0.414-0.414v-3.313h2.483v3.313c0,0.227,0.187,0.414,0.413,0.414h3.726c0.229,0,0.414-0.188,0.414-0.414v-7.042h2.068h0.004C18.331,10.617,18.389,10.146,18.121,9.88 M14.963,17.245h-2.896v-3.313c0-0.229-0.186-0.415-0.414-0.415H8.342c-0.228,0-0.414,0.187-0.414,0.415v3.313H5.032v-6.628h9.931V17.245z M3.133,9.79l6.864-6.868l6.867,6.868H3.133z">
          </path>
      </svg></span>
</div>
<style>
  #ElectronPlayer-topbar {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 10px;
      opacity: 1;
      background: darkgray;
      transition: height 0.2s;
      z-index: 99999;
      cursor: -webkit-grab;
      cursor: grab;
      -webkit-user-drag: none;
      display: flex;
      flex-direction: row;
  }

  #ElectronPlayer-topbar:hover {
      opacity: 1;
      height: 12vh;
  }

  #ElectronPlayer-topbar:hover span,
  #ElectronPlayer-topbar:hover span *  {
      height: 8vh;
      width: 8vh;
      opacity: 1;
  }

  .svg-icon:hover * {
      color: white;
  }

  ::-webkit-scrollbar {
      display: none;
  }

  .menu-button {
      transition: height 1s;
      transition: opacity 1s;
      margin: 5px;
      color: rgba(255, 255, 255, 0.15);
  }
  .svg-icon:hover path,
  .svg-icon:hover polygon,
  .svg-icon:hover rect {
      fill: white;
  }
  .hidden-and-0 {
      width: 0px;
      height: 0px;
      opacity: 0;
  }
  .svg-icon path,
  .svg-icon polygon,
  .svg-icon rect {
      fill: #4691f6;
      transition: fill 0.25s;

  }
  .svg-icon {
      transition: fill 0.25s;

  }
  .svg-icon circle {
      stroke: #4691f6;
      stroke-width: 1;
      transition: stroke 0.25s;
  }

  svg * {
      width: 100%;
      height: 100%;
  }
</style>
`
);
