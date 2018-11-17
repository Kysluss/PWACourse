importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

var CACHE_STATIC_NAME = 'static-v18';
var CACHE_DYNAMIC_NAME = 'dynamic-v2';
var STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/js/app.js',
  '/src/js/feed.js',
  '/src/js/idb.js',
  '/src/js/promise.js',
  '/src/js/fetch.js',
  '/src/js/material.min.js',
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/images/main-image.jpg',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

// function trimCache(cacheName, maxItems) {
//   caches.open(cacheName)
//     .then(function(cache) {
//       return cache.keys()
//         .then(function(keys) {
//           if(keys.length > maxItems) {
//             cache.delete(keys[0])
//               .then(trimCache(cacheName, maxItems))
//           }
//         })
//     })
// }

self.addEventListener('install', function (event) {
  console.log('[Service Worker] Installing Service Worker ...', event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(function (cache) {
        console.log('[Service Worker] Precaching App Shell');
        cache.addAll(STATIC_FILES);
      })
  )
});

self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activating Service Worker ....', event);
  event.waitUntil(
    caches.keys()
      .then(function (keyList) {
        return Promise.all(keyList.map(function (key) {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] Removing old cache.', key);
            return caches.delete(key);
          }
        }));
      })
  );
  return self.clients.claim();
});

function isInArray(string, array) {
  for(var i = 0; i < array.length; i++) {
    if(array[i] === string) return true;
  }
  return false;
}

self.addEventListener('fetch', function(event) {
  var url = 'https://pwagram-d96a0.firebaseio.com/posts.json';

  // Cache first with network fallback
  if(event.request.url.indexOf(url) !== -1) {
    event.respondWith(
      fetch(event.request)
        .then(function(res) {
          var clonedRes = res.clone();
          clearAllData('posts')
            .then(function() {
              return clonedRes.json()
            })
            .then(function(data) {
              for(var key in data) {
                writeData('posts', data[key])
                  /*.then(function(data) {
                    deleteItemFromData('posts', data.id);
                  })*/;
              }
            });
          return res;
        })
    );
  }
  // Cache only
  else if (isInArray(event.request.url, STATIC_FILES)) {
    event.respondWith(caches.match(event.request.url));
  }
  // Cache first with network fallback
  else {
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          if (response) {
            return response;
          } else {
            return fetch(event.request)
              .then(function(res) {
                return caches.open(CACHE_DYNAMIC_NAME)
                  .then(function(cache) {
                    // trimCache(CACHE_DYNAMIC_NAME, 3);
                    cache.put(event.request.url, res.clone());
                    return res;
                  })
              })
              .catch(function(err) {
                return caches.open(CACHE_STATIC_NAME)
                  .then(function(cache) {
                    // If the request is for an HTML page, we can return the offline.html file
                    // This is better than keeping a list of all the pages
                    if(event.request.headers.get('accept').includes('text/html') !== -1) {
                      return cache.match('/offline.html');
                    }
                  });
              });
          }
        })
    );
  }
});

// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     caches.match(event.request)
//       .then(function(response) {
//         if (response) {
//           return response;
//         } else {
//           return fetch(event.request)
//             .then(function(res) {
//               return caches.open(CACHE_DYNAMIC_NAME)
//                 .then(function(cache) {
//                   cache.put(event.request.url, res.clone());
//                   return res;
//                 })
//             })
//             .catch(function(err) {
//               return caches.open(CACHE_STATIC_NAME)
//                 .then(function(cache) {
//                   return cache.match('/offline.html');
//                 });
//             });
//         }
//       })
//   );
// });

// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     fetch(event.request)
//       .then(function(res) {
//         return caches.open(CACHE_DYNAMIC_NAME)
//                 .then(function(cache) {
//                   cache.put(event.request.url, res.clone());
//                   return res;
//                 })
//       })
//       .catch(function(err) {
//         return caches.match(event.request);
//       })
//   );
// });

// Cache-only
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     caches.match(event.request)
//   );
// });

// Network-only
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     fetch(event.request)
//   );
// });

self.addEventListener('sync', function(event) {
  console.log('[Service Worker] Background syncing', event);

  if(event.tag === 'sync-new-post') {
    console.log('[Service Worker] Syncing new posts');

    event.waitUntil(
      readAllData('sync-posts')
        .then(function(posts) {
          for(var dt of posts) {
            fetch('https://us-central1-pwagram-d96a0.cloudfunctions.net/storePostData', {
              method: 'POST', 
              headers: {
                'Content-Type': 'application/json', 
                'Accept': 'application/json'
              }, 
              body: JSON.stringify({
                id: dt.id, 
                title: dt.title, 
                location: dt.location, 
                image: 'https://firebasestorage.googleapis.com/v0/b/pwagram-d96a0.appspot.com/o/sf-boat.jpg?alt=media&token=6ccea2d0-90d6-47b3-8d64-3e5ef903aa00'
              })
            })
            .then(function(res) {
              console.log('Sent data', res);

              if(res.ok) {
                res.json()
                  .then(function(data) {
                    deleteItemFromData('sync-posts', data.id);
                  });
              }
            })
            .catch(function(err) {
              console.log('Error while sending data', err);
            })
          }
        })
    );
  }
});

// An action on the notification was clicked
self.addEventListener('notificationclick', function(event) {
  var notification = event.notification;
  var action = event.action;

  console.log(notification);

  if(action === 'confirm') {
    console.log('Confirm was chosen');
    notification.close();
  }
  else {
    console.log(action);
    notification.close();
  }
});

// The notification was closed
// User did not click on it
// User did not click any action buttons
// User simply just got rid of the notification
self.addEventListener('notificationclose', function(event) {
  console.log('Notification was closed', event);
})