(function() {
    'use strict';

    angular
        .module('controllers', [])
        .controller("ChatCtrl", ChatCtrl)
        .controller("LoginCtrl", LoginCtrl)
        .controller("UsersCtrl", UsersCtrl)
        .controller("FriendsCtrl", FriendsCtrl)
        .controller("SettingCtrl", SettingCtrl)
        .controller("ProfileCtrl", ProfileCtrl);

    LoginCtrl.$inject = ["$scope", "$ionicModal", "$state", "$firebaseAuth", "$ionicLoading", "$rootScope", "CONFIG", "UserService", "FacebookService"];

    function LoginCtrl($scope, $ionicModal, $state, $firebaseAuth, $ionicLoading, $rootScope, CONFIG, UserService, FacebookService) {

        var vm = this;
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

    FriendsCtrl.$inject = ['$scope', "$timeout", "$state", "$rootScope", "UserService"];

    function FriendsCtrl($scope, $timeout, $state, $rootScope, UserService) {
        var vm = this;

        angular.extend(vm, {
            friendsId: [],
            refresh: refresh,
            openChat: openChat,
            openProfile: openProfile,
            setMyFriendId: setMyFriendId,
            currentUser: UserService.getProfile(),
            getFriendProfileById: UserService.getFriendProfileById
        });

        $scope.$on('$ionicView.afterEnter', function() {
            vm.setMyFriendId(function(status) {
                console.log(1, status);
            });

            if (UserService.getAddedFriendStatus()) {
                vm.setMyFriendId(function(status) {
                    console.log(2, status);
                });
            }
        });

        function setMyFriendId(callback) {
            UserService.getAllMyFriendsId(function(ids) {
                vm.friendsId = ids;
                callback(true);
            });
        };

        function openChat(user) {
            $state.go('chat', { id: user.id });
        }

        function refresh() {
            console.log(3);
            vm.setMyFriendId(function(status) {
                if (status)
                    $scope.$broadcast('scroll.refreshComplete');
                else
                    $scope.$broadcast('scroll.refreshComplete');
            });
        }

        function openProfile(user) {
            $state.go('profile', { id: user.id });
        };

        console.log("Friends controller loading...");
    }

    UsersCtrl.$inject = ['$scope', "$state", "$timeout", "$rootScope", "UserService", "Rooms"];

    function UsersCtrl($scope, $state, $timeout, $rootScope, UserService, Rooms) {
        var vm = this;

        angular.extend(vm, {
            refresh: refresh,
            addFriend: addFriend,
            users: [],
            getUsers: getUsers,
            openProfile: openProfile,
            currentUser: UserService.getProfile()
        });

        $scope.$on('$ionicView.afterEnter', function() {
            vm.getUsers(function(data) {
                if (data) {
                    vm.users.push(data);
                }
            });
        });

        function getUsers(callback) {
            vm.users = [];
            var users = UserService.getUsers();
            users.$ref().once('value', function(snapshot) {
                snapshot.forEach(function(item) {
                    var $item = item.val();
                    if (($item.id !== vm.currentUser.id) && !(vm.currentUser.friends.indexOf($item.id) > -1)) {
                        callback($item);
                    } else {
                        callback(null);
                    }
                });
            });

        };

        function addFriend(addUserinfo) {
            Rooms.create(addUserinfo, function(status) {
                if (status) {
                    vm.users.splice(vm.users.indexOf(addUserinfo), 1);
                    UserService.setAddedFriendStatus(addUserinfo);
                }
            });
        }

        function refresh() {
            vm.getUsers(function(data) {
                if (data) {
                    vm.users.push(data);
                    $scope.$broadcast('scroll.refreshComplete');
                } else {
                    $scope.$broadcast('scroll.refreshComplete');
                }
            });
        };

        function openProfile(user) {
            $state.go('profile', { id: user.id });
        };

        console.log("Users controller loading...");
    };

    ChatCtrl.$inject = ['$scope', '$state', '$ionicScrollDelegate', '$rootScope', 'Message', "UserService", "Rooms"];

    function ChatCtrl($scope, $state, $ionicScrollDelegate, $rootScope, Message, UserService, Rooms) {
        var vm = this;

        // back button enable on this page
        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            viewData.enableBack = true;
        });

        angular.extend(vm, {
            user: null,
            newMessage: "",
            messages: [],
            chatUser: chatUser,
            sendMessage: sendMessage
        });

        $scope.$on('$ionicView.afterEnter', function() {
            vm.chatUser();
            Rooms.getRoomId($state.params.id, function(roomId) {
                console.log("Room Id", roomId);
                Message.getMessages(roomId, function(messages) {
                    vm.messages = messages;
                });
            });
        });

        function chatUser() {
            UserService.getUserProfileById($state.params.id, function(data) {
                vm.user = data
            });
        }

        function sendMessage(message) {
            Message.send(message).then(function() {
                $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom(true);
            });
            vm.newMessage = "";
        }

        console.log("Chat controller loading...");
    }

    SettingCtrl.$inject = ['$scope', "$state", "UserService"];

    function SettingCtrl($scope, $state, UserService) {
        var vm = this;

        angular.extend(vm, {
            user: UserService.getProfile()
        });
        console.log("Settings controller loading...");
    }

    ProfileCtrl.$inject = ['$scope', "$state", "UserService"];

    function ProfileCtrl($scope, $state, UserService) {
        var vm = this;

        // back button enable on this page
        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            viewData.enableBack = true;
        });

        angular.extend(vm, {
            user: null
        });

        UserService.getUserProfileById($state.params.id, function(userData) {
            vm.user = userData;
        });

        console.log("Profile controller loading...");
    }

})();