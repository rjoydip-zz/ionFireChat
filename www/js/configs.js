(function() {
    'use strict';
    var firebaseConfig = {
        apiKey: "AIzaSyDGDQNOnLBbaAODwD0360jlZ7pTEAEcry8",
        authDomain: "ion1chat-51a98.firebaseapp.com",
        databaseURL: "https://ion1chat-51a98.firebaseio.com",
        projectId: "ion1chat-51a98",
        storageBucket: "",
        messagingSenderId: "917764795430"
    };
    // config firebase object 
    firebase.initializeApp(firebaseConfig);

    angular
        .module('configs', [])
        .config(['$ionicConfigProvider', function($ionicConfigProvider) {
            $ionicConfigProvider.tabs.position('bottom'); // other values: top
        }])
        .constant("CONFIG", {
            "FIREBASE_URL": firebaseConfig.databaseURL
        });
})();