
var functions = require('firebase-functions');
var admin = require('firebase-admin');
var cors = require('cors')({origin: true});
var webpush = require('web-push');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

var serviceAccount = require("./pwagram-fb-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-d96a0.firebaseio.com/'
});

exports.storePostData = functions.https.onRequest(function(request, response) {
 cors(request, response, function() {
   admin.database().ref('posts').push({
     id: request.body.id,
     title: request.body.title,
     location: request.body.location,
     image: request.body.image
   })
     .then(function() {
       webpush.setVapidDetails('mailto:Kysluss@aol.com', 'BEGB3YZyhTFZ5evi6EA7gdnwWNfQFJPJwm2ZG8dJUAHoxnkh2ASQX0AFRk1U-Hz3s6Y2KgnJ0N0Hc5XIEA0D-iQ', 'wAHVKZHW9n26Es0FqsINhQOFm2tvKJHwNdwv3OxVnXA');

       return admin.database().ref('subscriptions').once('value');
     })
     .then(function(subscriptions) {
       // forEach is supplied by firebase because we used the database SDK
       subscriptions.forEach(function(sub) {
        var pushConfig = {
          endpoint: sub.val().endpoint, 
          keys: {
            auth: sub.val().keys.auth, 
            p256dh: sub.val().keys.p256dh
          }
        };
        webpush.sendNotification(pushConfig, JSON.stringify({
          title: 'New Post', 
          content: 'New Post added!', 
          // This URL can be a fully qualified URL
          // Otherwise, it can be a relative URL to your application
          openUrl: '/help'
        }))
          .catch(function(err) {
            console.log(err);
          });
       });

       response.status(201).json({message: 'Data stored', id: request.body.id});
     })
     .catch(function(err) {
       response.status(500).json({error: err});
     });
 });
});
