(function() {
    'use strict';
    var firebaseConfig = FIREBASE_CONFIG_OBJECT;
    // config firebase object 
    firebase.initializeApp(firebaseConfig);

    angular
        .module('configs', [])
        .config(['$ionicConfigProvider', function($ionicConfigProvider) {
            $ionicConfigProvider.tabs.position('bottom'); // other values: top
            $ionicConfigProvider.views.maxCache(0); // cache less view
        }])
        .constant("CONFIG", {
            "FIREBASE_URL": firebaseConfig.databaseURL
        });
})();