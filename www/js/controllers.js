(function() {
    'use strict';

    angular
        .module('controllers', [])
        .controller("ChatCtrl", ChatCtrl)
        .controller("ChatsCtrl", ChatsCtrl)
        .controller("LoginCtrl", LoginCtrl)
        .controller("UsersCtrl", UsersCtrl)
        .controller("SettingCtrl", SettingCtrl);

    LoginCtrl.$inject = ["$scope", "$ionicModal", "$state", "$firebaseAuth", "$ionicLoading", "$rootScope", "CONFIG", "UserService", "FacebookService"];

    function LoginCtrl($scope, $ionicModal, $state, $firebaseAuth, $ionicLoading, $rootScope, CONFIG, UserService, FacebookService) {

        var vm = $scope.vm = {};
        var ref = firebase.database().ref();

        angular.extend(vm, {
            user: {},
            patterns: {
                email: /^[a-z]+[a-z0-9._]+@[a-z]+\.[a-z.]{2,5}$/
            },
            createUser: createUser,
            login: login,
            // signInWithFaceBook: signInWithFaceBook
        });

        $ionicModal.fromTemplateUrl('templates/register.html', {
            scope: $scope
        }).then(function(modal) {
            vm.modal = modal;
        });

        function createUser() {
            UserService.createUser(vm.user).then(function() {
                vm.modal.hide();
            })
        }

        function login() {
            UserService.login(vm.user);
        }

        function signInWithFaceBook() {
            FacebookService.login().then(function(userData) {
                ref.child("users").child(userData.uid).set({
                    id: userData.uid,
                    email: userData.facebook.email,
                    username: userData.facebook.displayName
                });
                $state.go('tab.users');
            });
        }
        console.log("Login controller loading...");
    }

    ChatsCtrl.$inject = ['$scope', "$state", "Users"];

    function ChatsCtrl($scope, $state, Users) {
        var vm = $scope.vm = {};

        angular.extend(vm, {});
        console.log("Chats controller loading...");
    }

    UsersCtrl.$inject = ['$scope', "$state", "$timeout", "$ionicLoading", "Users"];

    function UsersCtrl($scope, $state, $timeout, $ionicLoading, Users) {
        var vm = $scope.vm = {};

        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            angular.extend(vm, {
                openChat: openChat,
                refresh: refresh,
                users: Users.getAllUsers()
            });
        });

        $scope.$on('$ionicView.afterEnter', function(event, viewData) {

        });

        function refresh() {
            vm.users = Users.getAllUsers();
            console.log("Refreshing");
            $timeout(function() {
                $scope.$broadcast('scroll.refreshComplete');
            }, 1000);
        }

        function openChat(id) {
            $state.go('chat', { id: id });
        }

        console.log("Users controller loading...");
    }

    ChatCtrl.$inject = ['$scope', '$state', 'UserService', 'Users', 'Message'];

    function ChatCtrl($scope, $state, UserService, Users, Message) {
        var vm = $scope.vm = {};

        // back button enable on this page
        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            viewData.enableBack = true;
        });

        angular.extend(vm, {
            newMessage: "",
            // messages: Message.get($state.params.roomId),
            // currentUser: UserService.getProfile(),
            sendMessage: sendMessage,
            remove: remove
        });

        function sendMessage(message) {
            Message.send(message).then(function() {
                $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom(true);
            });
            vm.newMessage = "";
        }

        function remove(chat) {
            Message.remove(chat);
        }
        UserService.getUserProfileById($state.params.id, function(data) {
            vm.user = data;
        });
        console.log("Chat controller loading...");
    }

    SettingCtrl.$inject = ['$scope', "$state"];

    function SettingCtrl($scope, $state) {
        var vm = $scope.vm = {};

        angular.extend(vm, {});
        console.log("Settings controller loading...");
    }

})();