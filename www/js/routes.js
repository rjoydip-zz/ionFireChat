angular.module('routes', [])

.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider

    // State to represent Login View
        .state('login', {
            url: "/login",
            templateUrl: "templates/login.html",
            controller: 'LoginController as vm',
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
                controller: 'UsersController as vm'
            }
        }
    })

    .state('tab.friends', {
        url: '/friends',
        views: {
            'tab-friends': {
                templateUrl: 'templates/tab-friends.html',
                controller: 'FriendsController as vm'
            }
        }
    })

    .state('tab.accounts', {
        url: '/accounts',
        params: {
            id: null
        },
        views: {
            'tab-accounts': {
                templateUrl: 'templates/tab-accounts.html',
                controller: 'AccountsController as vm'
            }
        }
    })

    .state('chat', {
        url: '/chat/:id',
        templateUrl: 'templates/chat.html',
        controller: 'ChatController as vm'
    })

    .state('notification', {
        url: '/notification',
        templateUrl: 'templates/notification.html',
        controller: 'NotificationController as vm',
    })

    $urlRouterProvider.otherwise('/login');

});