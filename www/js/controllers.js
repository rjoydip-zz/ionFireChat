(function() {
    'use strict';

    angular
        .module('controllers', [])
        .controller("ChatCtrl", ChatCtrl)
        .controller("LoginCtrl", LoginCtrl)
        .controller("UsersCtrl", UsersCtrl)
        .controller("FriendsCtrl", FriendsCtrl)
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

    FriendsCtrl.$inject = ['$scope', "$timeout", "$state", "UserService"];

    function FriendsCtrl($scope, $timeout, $state, UserService) {
        var vm = $scope.vm = {};

        angular.extend(vm, {
            users: [],
            refresh: refresh,
            openChat: openChat,
            getMyFriends: getMyFriends,
            currentUser: UserService.getProfile()
        });

        $scope.$on('$ionicView.afterEnter', function() {
            vm.getMyFriends();
        });

        function getMyFriends() {
            vm.users = [];
            UserService.getAllMyFriends(function(ids) {
                ids.forEach(function(id) {
                    UserService.getUserProfileById(id, function(data) {
                        vm.users.push(data);
                    });
                });
            });

        };

        function openChat(user) {
            $state.go('chat', { id: user.id });
        }

        function refresh() {
            vm.getMyFriends();
            $timeout(function() {
                $scope.$broadcast('scroll.refreshComplete');
            }, 1000);
        }

        console.log("Friends controller loading...");
    }

    UsersCtrl.$inject = ['$scope', "$timeout", "Users", "UserService", "Rooms"];

    function UsersCtrl($scope, $timeout, Users, UserService, Rooms) {
        var vm = $scope.vm = {};

        angular.extend(vm, {
            refresh: refresh,
            addFriend: addFriend,
            users: Users.getUsers(),
            currentUser: UserService.getProfile()
        });

        function addFriend(addUserinfo) {
            Rooms.create(addUserinfo, function(status) {
                if (status) {
                    vm.users.splice(vm.users.indexOf(addUserinfo), 1);
                }
            });
        }

        function refresh() {
            vm.users = Users.getUsers();

            $timeout(function() {
                $scope.$broadcast('scroll.refreshComplete');
            }, 1000);
        }

        console.log("Users controller loading...");
    }

    ChatCtrl.$inject = ['$scope', '$state', 'Message', "UserService"];

    function ChatCtrl($scope, $state, Message, UserService) {
        var vm = $scope.vm = {};

        // back button enable on this page
        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            viewData.enableBack = true;
        });

        angular.extend(vm, {
            user: null,
            newMessage: "",
            sendMessage: sendMessage,
            remove: remove,
            chatUser: chatUser
        });

        $scope.$on('$ionicView.afterEnter', function() {
            vm.chatUser();
        });

        function chatUser() {
            UserService.getUserProfileById($state.params.id, function(data) {
                vm.user = data
                console.log(vm.user);
            });
        }

        function sendMessage(message) {
            Message.send(message).then(function() {
                $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom(true);
            });
            vm.newMessage = "";
        }

        function remove(chat) {
            Message.remove(chat);
        }

        console.log("Chat controller loading...");
    }

    SettingCtrl.$inject = ['$scope', "$state"];

    function SettingCtrl($scope, $state) {
        var vm = $scope.vm = {};

        angular.extend(vm, {});
        console.log("Settings controller loading...");
    }

})();