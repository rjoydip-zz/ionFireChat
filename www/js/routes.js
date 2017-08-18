angular.module('routes', [])

.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider

    // State to represent Login View
        .state('login', {
            url: "/login",
            templateUrl: "templates/login.html",
            controller: 'LoginCtrl',
            resolve: {
                requireNoAuth: function($state, Auth) {
                    return Auth.$requireSignIn().then(function(auth) {
                        $state.go('tab.users');
                    }, function(error) {
                        return;
                    });
                }
            }
        })
        // setup an abstract state for the tabs directive
        .state('tab', {
            url: "/tab",
            abstract: true,
            templateUrl: "templates/tabs.html",
            resolve: {
                auth: function($state, Auth) {
                    return Auth.$requireSignIn().catch(function() {
                        $state.go('login');
                    });
                },
            }
        })

    // Each tab has its own nav history stack:

    .state('tab.users', {
        url: '/users',
        views: {
            'tab-users': {
                templateUrl: 'templates/tab-users.html',
                controller: 'UsersCtrl'
            }
        }
    })

    .state('tab.chats', {
        url: '/chats',
        views: {
            'tab-chats': {
                templateUrl: 'templates/tab-chats.html',
                controller: 'ChatsCtrl'
            }
        }
    })

    .state('tab.setting', {
        url: '/setting',
        views: {
            'tab-setting': {
                templateUrl: 'templates/tab-setting.html',
                controller: 'SettingCtrl'
            }
        }
    })

    .state('chat', {
        url: '/chat/:id',
        templateUrl: 'templates/chat.html',
        controller: 'ChatCtrl'
    })

    $urlRouterProvider.otherwise('/login');

});