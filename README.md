## IonFireChat

IonFireChat is a sample chat widget using by Firebase. I created a simple authentication system with email and password using firebase in Ionic.

### Setup

1. Setting up a Firebase Account

In order to user Firebase, you need to have an account with them. Url: https://www.firebase.com/signup/

2. Copy config object

Copy firebase web app config object and put it into `js/configs.js` and initilize that into `firebaseConfig` variable.

3. Install the lib by bower

```
bower install firebase --save
bower install angularfire --save
bower install angular-md5 --save  // md5 for Angular.js and Gravatar filter
```

### Issue
  - Signup modal closing earlier.

