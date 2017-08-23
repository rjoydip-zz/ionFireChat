(function() {
    'use strict';

    angular
        .module('services', [])
        .factory("Auth", Auth)
        .factory("Rooms", Rooms)
        .factory("Invite", Invite)
        .factory("Message", Message)
        .service("UserService", UserService)
        .service("FacebookService", FacebookService);

    Auth.$inject = ["$firebaseAuth", "firebase"];

    function Auth($firebaseAuth, firebase) {
        return $firebaseAuth(firebase.auth());
    }

    Message.$inject = ["$firebaseArray", "UserService", "$q", "firebase"];

    function Message($firebaseArray, UserService, $q, firebase) {
        var selectedRoomId;
        var chatMessagesForRoom;
        var ref = firebase.database().ref();

        return {
            send: send,
            getMessages: getMessages
        }

        function getMessages(roomId, callback) {
            chatMessagesForRoom = $firebaseArray(ref.child('/rooms/' + roomId + '/messages'));
            ref.child('/rooms/' + roomId + '/messages').once('value', function(snaphot) {
                callback(snaphot.val());
            });
        }

        function send(message) {
            var deferred = $q.defer();
            var currentUser = UserService.getProfile();
            if (message) {
                var chatMessage = {
                    sender_username: currentUser.username,
                    sender_email: currentUser.email,
                    content: message,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
                chatMessagesForRoom.$add(chatMessage).then(function(data) {
                    deferred.resolve();
                });
                return deferred.promise;
            }
        }
    }

    Rooms.$inject = ["$firebaseArray", "firebase", "UserService"];

    function Rooms($firebaseArray, firebase, UserService) {
        var currentUser = UserService.getProfile();
        var ref = firebase.database().ref();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        return {
            create: function(addUserinfo) {
                ref.child('rooms').child(uuid).set({
                    messages: ['Welcome'],
                    myId: currentUser.id,
                    friendId: addUserinfo.id,
                });
                return uuid;
            },
            getRoomId: function(friendId, callback) {
                var currentUser = UserService.getProfile();
                var roomId = null;

                ref.child('rooms').once('value', function(snapshot) {
                    snapshot.forEach(function(item) {
                        if (item.val().friendId === friendId && item.val().myId === currentUser.id) {
                            callback(item.key);
                            return;
                        }
                    });
                });

            }
        }
    }

    UserService.$inject = ["Auth", "$q", "$state", "$ionicLoading", "$rootScope", "firebase", "$firebaseArray"];

    function UserService(Auth, $q, $state, $ionicLoading, $rootScope, firebase, $firebaseArray) {
        var ref = firebase.database().ref();
        // Get a reference to my own presence status.
        var connectedRef = ref.child('/.info/connected');
        var addedFriendsStatus = null;

        return {
            login: login,
            logout: logout,
            getUsers: getUsers,
            createUser: createUser,
            saveProfile: saveProfile,
            getProfile: getProfile,
            trackPresence: trackPresence,
            addToFriendList: addToFriendList,
            getUserProfileById: getUserProfileById,
            getFriendProfileById: getFriendProfileById,
            getAllMyFriendsId: getAllMyFriendsId,
            setAddedFriendStatus: setAddedFriendStatus,
            getAddedFriendStatus: getAddedFriendStatus,
            getUserNotificationNumber: getUserNotificationNumber,
            getUserNotifications: getUserNotifications,
            addNotificationToUserProfile: addNotificationToUserProfile
        }

        function trackPresence() {
            var currentUser = this.getProfile();
            // Get a reference to the presence data in Firebase.
            var myConnectionsRef = ref.child('/users/' + currentUser.id + '/connected');
            connectedRef.on('value', function(isOnline) {
                if (isOnline.val()) {
                    // If we lose our internet connection, we want ourselves removed from the list.
                    myConnectionsRef.onDisconnect().remove();
                    myConnectionsRef.set(true);
                }
            });
        }

        function addToFriendList(friendId, callback) {
            var currentUser = this.getProfile();
            var newDataSet = {},
                newFriendList = [];

            // Get a reference to the presence data in Firebase.
            ref.child('/users/' + currentUser.id).on('value', function(snapshot) {
                newDataSet = snapshot.val();
                snapshot.forEach(function(data) {
                    if (data.key === 'friends') {
                        newFriendList = data.val();
                        newFriendList.push(friendId);
                        newDataSet['friends'] = newFriendList;
                    }
                });
                return;
            });
            ref.child('/users/' + currentUser.id).set(newDataSet);
            if (callback) {
                callback(true);
            }
        }

        function createUser(user) {
            var deferred = $q.defer();
            var self = this;
            $ionicLoading.show({
                template: 'Signing Up...'
            });
            Auth.$createUserWithEmailAndPassword(user.email, user.password).then(function(userData) {
                ref.child("users").child(userData.uid).set({
                    id: userData.uid,
                    email: user.email,
                    friends: [userData.uid],
                    username: user.username,
                });
                $ionicLoading.hide();
                login.call(self, user);
                deferred.resolve();
            }).catch(function(error) {
                alert("Error: " + error);
                $ionicLoading.hide();
            });
            return deferred.promise;
        }

        function login(user) {
            var self = this;
            $ionicLoading.show({
                template: 'Signing In'
            });
            Auth.$signInWithEmailAndPassword(user.email, user.password).then(function(authData) {
                $ionicLoading.hide();
                $state.go('tab.users');
            }).catch(function(error) {
                alert("Authentication failed:" + error.message);
                $ionicLoading.hide();
            });
        }

        function logout() {
            $ionicLoading.hide({
                template: 'Logging Out...'
            });
            this.trackPresence();
            Auth.$signOut();
        }

        function saveProfile(user) {
            localStorage.setItem("chat.current_user", JSON.stringify(user));
        }

        function getProfile() {
            var user = localStorage.getItem("chat.current_user");
            return user && JSON.parse(user);
        }

        function getUserProfileById(id, callback) {
            ref.child('/users/' + id).once('value', function(snapshot) {
                callback(snapshot.val());
            });
        };

        function getFriendProfileById(id) {
            var friendProfile = null;
            ref.child('/users/' + id).once('value', function(snapshot) {
                friendProfile = snapshot.val();
            });
            return friendProfile;
        };

        function getUsers() {
            return $firebaseArray(firebase.database().ref().child('users'));
        };

        function getAllMyFriendsId(callback) {
            var currentuser = this.getProfile();
            var data = this.getProfile().friends.filter(function(item) {
                return item !== currentuser.id;
            });
            callback(data);
        };

        function setAddedFriendStatus(data) {
            this.addedFriendsStatus = data;
        };

        function getAddedFriendStatus(data) {
            return this.addedFriendsStatus;
        };

        function getUserNotificationNumber(callback) {
            var user = JSON.parse(localStorage.getItem("chat.current_user"));
            console.log(user);
            ref.child('/users/' + user.id + '/notification/').on("value", function(snapshot) {
                callback(snapshot.numChildren());
            });
            return;
        };

        function getUserNotifications(callback) {
            callback($firebaseArray(ref.child('/users/' + this.getProfile().id + '/notification/')));
        };

        function addNotificationToUserProfile(id, notiMessage) {
            var currentuser = this.getProfile()
            ref.child('/users/' + id).once('value', function(snapshot) {
                if (snapshot.hasChild('notification')) {
                    console.log(exists);
                } else {
                    var updates = {},
                        newItemKey = ref.push().key;
                    updates['/notification/' + newItemKey] = notiMessage;
                    return ref.child('/users/' + id).update(updates);
                }
            });
        };

    };


    Invite.$inject = ["$firebaseArray", "firebase", "UserService", "Rooms"];

    function Invite($firebaseArray, firebase, UserService, Rooms) {
        var ref = firebase.database().ref();
        var currentUser = UserService.getProfile();
        var iniviteStatus = [];

        ref.child('invite').on('value', function(snapshot) {
            snapshot.forEach(function(item) {
                iniviteStatus[item.val().to] = item.val().read;
            });
        }, this);

        return {
            send: function(to) {
                ref.child('invite').push().set({
                    from: currentUser.id,
                    to: to.id,
                    read: false,
                    roomId: Rooms.create(to)
                });
                UserService.addNotificationToUserProfile(to.id, {
                    to_id: currentUser.id,
                    type: 'accept',
                    read: false
                });
            },
            getStatus: function(to_id) {
                return iniviteStatus[to_id] === undefined ? true : iniviteStatus[to_id];
            }
        };
    }

    FacebookService.$inject = ["$q", "firebase"];

    function FacebookService($q, firebase) {
        var ref = firebase.database().ref();
        var deferred = $q.defer();
        return {
            login: function() {
                ref.signInWithPopup("facebook", function(error, authData) {
                    if (error) {
                        console.log("Login Failed!", error);
                        localStorage.clear();
                    } else {
                        // the access token will allow us to make Open Graph API calls
                        // console.log(authData.facebook.accessToken);
                        deferred.resolve(authData);
                    }
                }, {
                    scope: "email, public_profile" // the permissions requested
                });
                return deferred.promise;
            }
        }
    }
})();