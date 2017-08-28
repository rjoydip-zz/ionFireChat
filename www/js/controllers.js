(function() {
    'use strict';

    angular
        .module('controllers', [])
        .controller("ChatCtrl", ChatCtrl)
        .controller("LoginCtrl", LoginCtrl)
        .controller("UsersCtrl", UsersCtrl)
        .controller("FriendsCtrl", FriendsCtrl)
        .controller("AccountsCtrl", AccountsCtrl)
        .controller("ProfileCtrl", ProfileCtrl)
        .controller("NotificationCtrl", NotificationCtrl);

    LoginCtrl.$inject = ["$scope", "$ionicModal", "$state", "$firebaseAuth", "$ionicLoading", "$rootScope", "CONFIG", "UserService"];

    function LoginCtrl($scope, $ionicModal, $state, $firebaseAuth, $ionicLoading, $rootScope, CONFIG, UserService) {

        var vm = this;
        var ref = firebase.database().ref();

        angular.extend(vm, {
            user: {},
            patterns: {
                email: /^[a-z]+[a-z0-9._]+@[a-z]+\.[a-z.]{2,5}$/
            },
            createUser: createUser,
            login: login
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

        console.log("Login controller loading...");
    }

    FriendsCtrl.$inject = ['$scope', "$timeout", "$state", "$rootScope", "UserService"];

    function FriendsCtrl($scope, $timeout, $state, $rootScope, UserService) {
        var vm = this;

        angular.extend(vm, {
            users: [],
            show: false,
            refresh: refresh,
            unfriend: unfriend,
            openChat: openChat,
            openProfile: openProfile,
            currentUser: UserService.getProfile()
        });


        $scope.$on('$ionicView.afterEnter', function() {
            vm.users = [];
            getFriends();
        });

        function getFriends() {
            UserService.getFriendsId(function(list) {
                list.forEach(function(item) {
                    UserService.getUserProfile(item, function(data) {
                        if (data.id !== vm.currentUser.id) {
                            vm.users.push(data);
                        }
                    });
                });
            });
        };

        function unfriend(user) {
            UserService.$unFriend(user.id, function(status) {
                if (status) {
                    vm.users.slice(vm.users.indexOf(user), 1);
                }
            });
        };

        function openChat(user) {
            $state.go('chat', { id: user.id });
        }

        function refresh() {
            $scope.$broadcast('scroll.refreshComplete');
        }

        function openProfile(user) {
            $state.go('profile', { id: user.id });
        };

        (function() {
            getFriends();
        })();

        console.log("Friends controller loading...");
    }

    UsersCtrl.$inject = ['$scope', "$state", "$timeout", "$rootScope", "UserService", "Rooms", "Invite", "FirebaseChildEvent"];

    function UsersCtrl($scope, $state, $timeout, $rootScope, UserService, Rooms, Invite, FirebaseChildEvent) {
        var vm = this;

        angular.extend(vm, {
            refresh: refresh,
            users: [],
            getUsers: getUsers,
            invite: invite,
            openProfile: openProfile,
            currentUser: null
        });

        function getUsers(callback) {
            vm.users = [];
            vm.currentUser = UserService.getProfile();

            UserService.getUsers().$ref().once('value', function(snapshot) {
                snapshot.forEach(function(item) {
                    var $item = item.val();
                    if (($item.id !== vm.currentUser.id) && !(vm.currentUser.friends.indexOf($item.id) > -1)) {
                        $item.invite_status = Invite.getStatus($item.id);
                        vm.users.push($item);
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
            });
        };

        function invite(addUserinfo) {
            Invite.send(addUserinfo);
            vm.users.map(function(item, key) {
                if (item.id === addUserinfo.id) {
                    vm.users[key].invite_status = false;
                }
            });
        };

        function refresh() {
            vm.getUsers(function(status) {
                $scope.$broadcast('scroll.refreshComplete');
            });
        };

        function openProfile(user) {
            $state.go('profile', { id: user.id });
        };

        FirebaseChildEvent.root(function(status) {
            console.log("Firebase reference update status -> " + status + " from users controller");
            vm.refresh();
        });

        console.log("Users controller loading...");
    };

    ChatCtrl.$inject = ['$scope', '$state', '$ionicScrollDelegate', '$rootScope', 'Message', "UserService", "Rooms", "FirebaseChildEvent"];

    function ChatCtrl($scope, $state, $ionicScrollDelegate, $rootScope, Message, UserService, Rooms, FirebaseChildEvent) {
        var vm = this;
        var $roomId = null;

        // back button enable on this page
        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            viewData.enableBack = true;
        });

        angular.extend(vm, {
            currentUser: null,
            newMessage: "",
            messages: [],
            sendMessage: sendMessage,
        });

        $scope.$on('$ionicView.afterEnter', function() {
            Rooms.getRoomId($state.params.id, function(roomId) {
                $roomId = roomId;
                vm.messages = Message.getMessages($roomId);
            });
        });

        function sendMessage(message) {
            if (message) {
                Message.send($roomId, message).then(function(message) {
                    vm.messages = message;
                    $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom(true);
                });
            }
            vm.newMessage = "";
        }

        (function() {
            UserService.getUserProfile($state.params.id, function(data) {
                vm.currentUser = data
            });
        })();

        FirebaseChildEvent.root(function(status) {
            console.log("Firebase reference update status -> " + status + " from chat controller");
        });

        console.log("Chat controller loading...");
    }

    AccountsCtrl.$inject = ['$scope', "$state", "$rootScope", "UserService", "FirebaseChildEvent"];

    function AccountsCtrl($scope, $state, $rootScope, UserService, FirebaseChildEvent) {
        var vm = this;

        angular.extend(vm, {
            refresh: refresh,
            user: null,
            update: update,
            getuserDetails: getuserDetails
        });

        $scope.$on('$ionicView.afterEnter', function() {
            vm.getuserDetails();
        });

        function update(user) {
            UserService.updateProfile(user, function(status) {
                console.log(status);
            });
        };

        function getuserDetails() {
            vm.user = null;
            vm.user = UserService.getProfile();
            return vm.user;
        };

        function refresh() {
            if (vm.getuserDetails()) {
                $scope.$broadcast('scroll.refreshComplete');
            }
        };

        (function() {
            vm.getuserDetails();
        })();

        FirebaseChildEvent.root(function(status) {
            console.log("Firebase reference update status -> " + status + " from settings controller");
            vm.user = status;
            $scope.$apply();
            console.log(status);
        });

        console.log("Settings controller loading...");
    }

    ProfileCtrl.$inject = ['$scope', "$state", "$rootScope", "UserService", "FirebaseChildEvent"];

    function ProfileCtrl($scope, $state, $rootScope, UserService, FirebaseChildEvent) {
        var vm = this;

        // back button enable on this page
        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            viewData.enableBack = true;
            vm.windowHeight = Math.floor((window.innerHeight / 2) + 25) + 'px';
        });

        angular.extend(vm, {
            user: null,
            show: true,
            windowHeight: 0,
            showContent: showContent
        });

        var preType = 0;

        function showContent(type) {
            if (preType > 0 && preType === type) {
                return;
            } else {
                vm.show = !vm.show;
                preType = type;
            }
        };

        function getProfileData() {
            vm.user = null;
            UserService.getUserProfile($state.params.id, function(userData) {
                vm.user = userData;
            });
            return this;
        };

        (function() {
            getProfileData();
        })();

        FirebaseChildEvent.root(function(status) {
            console.log("Firebase reference update status -> " + status + " from profile controller");
            getProfileData();
            $scope.$apply();
        });

        console.log("Profile controller loading...");
    }

    NotificationCtrl.$inject = ['$scope', "$state", "$rootScope", "UserService", "Invite", "FirebaseChildEvent"];

    function NotificationCtrl($scope, $state, $rootScope, UserService, Invite, FirebaseChildEvent) {
        var vm = this;

        // back button enable on this page
        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            viewData.enableBack = true;
        });

        angular.extend(vm, {
            showload: false,
            refresh: refresh,
            accept: accept,
            declain: declain,
            notifications: [],
            getNotifications: getNotifications
        });

        function accept(notifObj, type) {
            switch (type.toLowerCase()) {
                case 'invite':
                    Invite.$accept(notifObj.invite_id, function(status) {
                        if (status) {
                            vm.notifications = Object.keys(vm.notifications).filter(function(item) {
                                return item !== notifObj.invite_id
                            });
                        }
                        // show error message
                    });
                    break;
                case 'unfriend':
                    Invite.updateStatus(notifObj.invite_id, function(status) {
                        if (status) {
                            vm.notifications = Object.keys(vm.notifications).filter(function(item) {
                                return item !== notifObj.invite_id
                            });
                        }
                        // show error message
                    });
                    break;
                default:
                    break;
            }
        };

        function declain(notifObj, type) {
            switch (type.toLowerCase()) {
                case 'invite':
                    Invite.remove(notifObj.invite_id, function(status) {
                        if (status) {
                            vm.notifications = Object.keys(vm.notifications).filter(function(item) {
                                return item !== notifObj.invite_id
                            });
                            $scope.$apply(); // refreshing UI
                        }
                        // show error message
                    });
                    break;
                case 'unfriend':
                    Invite.updateStatus(notifObj.invite_id, function(status) {
                        if (status) {
                            vm.notifications = Object.keys(vm.notifications).filter(function(item) {
                                return item !== notifObj.invite_id
                            });
                        }
                        // show error message
                    });
                default:
                    break;
            }
        };

        function getNotifications() {
            UserService.getUserNotifications(function(notifications) {
                notifications.$ref().once('value', function(snapshot) {
                    vm.notifications = snapshot.val();
                });
            });
        };

        function refresh() {
            if (vm.getNotifications()) {
                $scope.$broadcast('scroll.refreshComplete');
            } else {
                $scope.$broadcast('scroll.refreshComplete');
            }
        };

        (function() {
            vm.getNotifications();
        })();

        FirebaseChildEvent.root(function(status) {
            console.log("Firebase reference update status -> " + status + " from notification controller");
        });

        console.log("Notification controller loading...");
    }
})();