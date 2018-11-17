
var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');

if (!window.Promise) {
  window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(function () {
      console.log('Service worker registered!');
    })
    .catch(function(err) {
      console.log(err);
    });
}

window.addEventListener('beforeinstallprompt', function(event) {
  console.log('beforeinstallprompt fired');
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

function displayConfirmNotification() {
  if('serviceWorker' in navigator) {
    var options = {
      body: 'You successfully subscribed to our Notification service', 
      icon: '/src/images/icons/app-icon-96x96.png', 
      image: '/src/images/sf-boat.jpg', 
      dir: 'ltr', 
      // Must be a BCP 47 compliant code
      lang: 'en-US', 
      // vibrate, pause, vibrate, pause, etc
      vibrate: [100,50,200], 
      // What shows up in the top badge icon
      badge: '/src/images/icons/app-icon-96x96.png', 
      // Kind of like an ID for notifications
      // If there are multiple notifications with the same tag, the most recent will be displayed
      // If there are different tags, they will be displayed one under the other
      tag: 'confirm-notification', 
      // Works in conjunction with tag
      // true = the next notification with the same tag will vibrate the phone again
      // false = the next notification with the same tag will not vibrate thephone
      renotify: true, 
      // These are buttons at the bottom of your notification
      // Not supported by all devices, so don't put anything mission critical here
      // If the action button is clicked, we need to listen for that inside of the service worker
      // This is because the SW always runs even when the browser is closed
      actions: [
        // action = ID of action
        // title = title of the action that is displayed
        // icon = image to display
        { action: 'confirm', title: 'Okay', icon: '/src/images/icons/app-icon-96x96.png' }, 
        { action: 'cancel', title: 'Cancel', icon: '/src/images/icons/app-icon-96x96.png' }
      ]
    };

    navigator.serviceWorker.ready
      .then(function(swreg) {
        swreg.showNotification('Successfully subscribed', options);
      });
  }
}

function configurePushSub() {
  // If no service worker support, we can't use push notifications
  if(!('serviceWorker' in navigator)) return;

  var reg;

  navigator.serviceWorker.ready
    .then(function(swreg) {
      reg = swreg;
      // We want to check if there are existing subscriptions already
      // pushManager.getSubscription will return any subscriptions that have been reigstered
      // null will be returned if nothing has been registered yet
      return swreg.pushManager.getSubscription();
    })
    .then(function(sub) {
      if(sub === null) {
        // Create a new subscription
        // With subscribe, it will render the old subscription as useless
        // We only want to create a subscription of we don't already have one for this reason
        // That is why we checked for sub === null
        // 
        // We need to secure our subscription service
        // Without specifying this information, anyone that figures out our subscription endpoint can send notifications to our users
        // We will also secure this by specifying that our server is the only valid server that can send notifications
        // We will use a technology known as VAPID
        // This basically generates a public/private key pair
        // These are generated using JWT (JSON Web Tokens)
        var vapidPublicKey = 'BEGB3YZyhTFZ5evi6EA7gdnwWNfQFJPJwm2ZG8dJUAHoxnkh2ASQX0AFRk1U-Hz3s6Y2KgnJ0N0Hc5XIEA0D-iQ';
        var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);

        return reg.pushManager.subscribe({
          // Push notifications sent through this subscription are available to this user only
          userVisibleOnly: true, 
          // This is the public key for our VAPID setup
          // This helps secure our push notifications to only be sent via our backend server
          applicationServerKey: convertedVapidPublicKey
        });
      }
      else {
        // We have a subscription
      }
    })
    .then(function(newSub) {
      return fetch('https://pwagram-d96a0.firebaseio.com/subscriptions.json', {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json', 
          'Accept': 'application/json'
        }, 
        body: JSON.stringify(newSub)
      })
    })
    .then(function(res) {
      if(res.ok) {
        displayConfirmNotification();
      }
    })
    .catch(function(err) {
      console.log(err);
    });
}

function askForNotificationPermission() {
  Notification.requestPermission(function(result) {
    console.log('User Choice', result);
    if(result !== 'granted') {
      console.log('No notification permission granted');
    }
    else {
      // Hide Button
      configurePushSub();
      // displayConfirmNotification();
    }
  });
}

if('Notification' in window) {
  for(var i = 0; i < enableNotificationsButtons.length; i++) {
    enableNotificationsButtons[i].style.display = 'inline-block';
    enableNotificationsButtons[i].addEventListener('click', askForNotificationPermission)
  }
}