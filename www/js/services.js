(function() {
    'use strict';

    angular
        .module('services', [])
        .factory("Auth", Auth)
        .factory("Rooms", Rooms)
        .factory("Invite", Invite)
        .factory("Message", Message)
        .service("UserService", UserService)
        .service("FirebaseChildEvent", FirebaseChildEvent);

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

        function getMessages(roomId) {
            return $firebaseArray(ref.child('/rooms/' + roomId + '/messages'));
        }

        function send(roomID, message) {
            var deferred = $q.defer();
            var currentUser = UserService.getProfile();
            if (message) {
                var chatMessage = {
                    sender_username: currentUser.username,
                    sender_email: currentUser.email,
                    content: message,
                    color_code: currentUser.color_code,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
                $firebaseArray(ref.child('/rooms/' + roomID).child('messages'))
                    .$add(chatMessage).then(function(data) {
                        deferred.resolve($firebaseArray(ref.child('/rooms/' + roomID).child('messages')));
                    });
                return deferred.promise;
            }
        }
    }

    Rooms.$inject = ["$firebaseArray", "firebase", "UserService"];

    function Rooms($firebaseArray, firebase, UserService) {
        var currentUser = UserService.getProfile();
        var ref = firebase.database().ref();

        return {
            create: function(addUserinfo, callback) {
                var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0,
                        v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });

                ref.child('rooms').child(uuid).set({
                    messages: ['Welcome'],
                    myId: addUserinfo.id,
                    friendId: currentUser.id,
                }).then(function() {
                    callback(uuid);
                });
            },
            getRoomId: function(friendId, callback) {
                var currentUser = UserService.getProfile();
                ref.child('rooms').once('value', function(snapshot) {
                    snapshot.forEach(function(item) {
                        if (
                            (item.val().friendId === friendId && item.val().myId === currentUser.id) ||
                            (item.val().friendId === currentUser.id && item.val().myId === friendId)
                        ) {
                            callback(item.key);
                        }
                    });
                });
            },
            removeRoom: function(roomId, callback) {
                ref.child('/rooms/' + roomId).remove(function(error) {
                    if (error) callback(false);
                    else callback(true);
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
        var userId = null;

        return {
            login: login,
            logout: logout,
            getUsers: getUsers,
            createUser: createUser,
            updateProfile: updateProfile,
            saveProfile: saveProfile,
            getProfile: getProfile,
            trackPresence: trackPresence,
            addToFriendList: addToFriendList,
            getUserProfile: getUserProfile,
            getUserNotificationNumber: getUserNotificationNumber,
            getUserNotifications: getUserNotifications,
            addNotificationToUserProfile: addNotificationToUserProfile,
            addedFriendInList: addedFriendInList,
            getFriendsId: getFriendsId,
            $unFriend: $unFriend
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
                    bio: user.bio,
                    email: user.email,
                    friends: [userData.uid],
                    username: user.username,
                    device_uuid: '', // for push notification
                    color_code: "#" + ((1 << 24) * Math.random() | 0).toString(16)
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
                userId = authData.uid;
                $ionicLoading.hide();
                localStorage.setItem('chat.current_user', JSON.stringify({ email: user.email, id: userId }));
                $state.go('tab.users');
            }).catch(function(error) {
                alert("Authentication failed:" + error.message);
                $ionicLoading.hide();
            });
        };

        function logout() {
            $ionicLoading.hide({
                template: 'Logging Out...'
            });
            this.trackPresence();
            localStorage.removeItem('chat.current_user');
            Auth.$signOut();
        };

        function updateProfile(user, callback) {
            var currentUser = this.getProfile();
            ref.child('/users/' + currentUser.id).update(user).then(function() {
                saveProfile(user);
                callback(true);
            });
        };

        function saveProfile(user) {
            localStorage.setItem("chat.current_user", JSON.stringify(user));
            return this;
        };

        function getProfile() {
            var user = localStorage.getItem("chat.current_user");
            return user && JSON.parse(user);
        };

        function getUserProfile(id, callback) {
            ref.child('/users/' + id).once('value', function(snapshot) {
                callback(snapshot.val());
            });
        };

        function getUsers() {
            return $firebaseArray(firebase.database().ref().child('users'));
        };

        function addedFriendInList(id, callback) {
            var currentUser = this.getProfile();

            ref.child('/users/' + currentUser.id + '/friends/').once('value', function(snapshot1) {
                var data1 = snapshot1.val();
                data1.push(id);
                ref.child('/users/' + currentUser.id + '/friends/').update(data1);

                ref.child('/users/' + id + '/friends/').once('value', function(snapshot2) {
                    var data2 = snapshot2.val();
                    data2.push(currentUser.id);
                    ref.child('/users/' + id + '/friends/').update(data2);

                    callback(true);
                });
            });
        };

        function getFriendsId(callback) {
            ref.child('/users/' + this.getProfile().id + '/friends/').on('value', function(snapshot) {
                callback(snapshot.val());
            });
        };

        function getUserNotificationNumber(callback) {
            var count = 0;
            ref.child('/users/' + this.getProfile().id + '/notification/').on("value", function(snapshot) {
                snapshot.forEach(function(item) {
                    if (!item.val().read) {
                        count++;
                    }
                });
                callback(count);
            });
        };

        function getUserNotifications(callback) {
            callback($firebaseArray(ref.child('/users/' + this.getProfile().id + '/notification/')));
        };

        function addNotificationToUserProfile(id, notiMessage) {
            ref.child('/users/' + this.getProfile().id).once('value', function(snapshot) {
                var updates = {},
                    newItemKey = ref.push().key;
                notiMessage.id = newItemKey;
                updates['/notification/' + newItemKey] = notiMessage;
                return ref.child('/users/' + id).update(updates);
            });
        };

        function $unFriend(user_id, callback) {
            var currentUser = this.getProfile();

            ref.child('/users/' + currentUser.id + '/friends/').once('value', function(snapshot1) {
                var data1 = snapshot1.val().filter(function(item) {
                    return item !== user_id;
                });
                ref.child('/users/' + user_id + '/friends/').once('value', function(snapshot2) {
                    var data2 = snapshot2.val().filter(function(item) {
                        return item !== currentUser.id;
                    });
                    ref.child('rooms').once('value', function(snapshot) {
                        snapshot.forEach(function(item) {
                            if (
                                (item.val().friendId === user_id && item.val().myId === currentUser.id) ||
                                (item.val().friendId === currentUser.id && item.val().myId === user_id)
                            ) {
                                ref.child('/rooms/' + item.key).remove(function(error) {
                                    if (error) callback(false);
                                    ref.child('/users/' + user_id + '/friends/').set(data2);
                                    ref.child('/users/' + currentUser.id + '/friends/').set(data1);
                                    var newKey = ref.child('/users/' + user_id + '/notification/').push().key;
                                    ref.child('/users/' + user_id + '/notification/' + newKey).set({
                                        invite_id: newKey,
                                        to_id: user_id,
                                        from_id: currentUser.id,
                                        type: 'Unfriend',
                                        color_code: currentUser.color_code,
                                        read: false,
                                        room_id: item.key,
                                        message: currentUser.username + ' unfriend you.'
                                    });
                                    callback(true);
                                });
                            }
                        });
                    });

                    callback(true);
                });
            });
        };

    };


    Invite.$inject = ["$firebaseArray", "firebase", "UserService", "Rooms"];

    function Invite($firebaseArray, firebase, UserService, Rooms) {
        var ref = firebase.database().ref();
        var currentUser = UserService.getProfile();
        var iniviteStatus = [];
        var color_code = "#" + ((1 << 24) * Math.random() | 0).toString(16);

        ref.child('invite').on('value', function(snapshot) {
            snapshot.forEach(function(item) {
                iniviteStatus[item.val().to] = item.val().read;
            });
        }, this);

        return {
            send: function(to) {
                Rooms.create(to, function(roomId) {
                    var newKey = ref.child('invite').push().key;
                    ref.child('/invite/' + newKey).set({
                        id: newKey,
                        from: currentUser.id,
                        to: to.id,
                        read: false,
                        color_code: color_code,
                        room_id: roomId
                    }).then(function() {
                        UserService.addNotificationToUserProfile(to.id, {
                            invite_id: newKey,
                            to_id: to.id,
                            from_id: currentUser.id,
                            type: 'Invite',
                            color_code: color_code,
                            read: false,
                            room_id: roomId,
                            message: currentUser.username + ' sends a invitation to you'
                        });
                    });
                });
            },
            getStatus: function(to_id) {
                return iniviteStatus[to_id] === undefined ? true : iniviteStatus[to_id];
            },
            $accept: function(noti_id, callback) {
                var currentuser = UserService.getProfile()
                ref.child('/users/' + currentuser.id + '/notification/' + noti_id).once('value', function(snapshot) {
                    var notiVal = snapshot.val();
                    ref.child('/invite/' + notiVal.invite_id).remove(function() {
                        ref.child('/users/' + currentuser.id + '/notification/' + noti_id).remove(function() {
                            UserService.addedFriendInList(notiVal.from_id, function(status) {
                                if (status) callback(true);
                                else callback(false);
                            });
                        });
                    });
                });
            },
            remove: function(noti_id, callback) {
                var currentuser = UserService.getProfile()
                ref.child('/users/' + currentuser.id + '/notification/' + noti_id).once('value', function(snapshot) {
                    var notiVal = snapshot.val();
                    ref.child('/invite/' + notiVal.invite_id).remove(function() {
                        ref.child('/rooms/' + notiVal.room_id).remove(function() {
                            ref.child('/users/' + currentuser.id + '/notification/' + noti_id).remove(function() {
                                callback(true);
                            });
                        });
                    });
                });
            },
            updateStatus: function(noti_id, callback) {
                var currentuser = UserService.getProfile()
                ref.child('/users/' + currentuser.id + '/notification/' + noti_id).once('value', function(snapshot) {
                    var notiVal = snapshot.val();
                    notiVal.read = true;
                    ref.child('/users/' + currentuser.id + '/notification/' + noti_id).set(notiVal);
                    callback(true);
                });
            }
        };
    };

    FirebaseChildEvent.$inject = ["firebase"];

    function FirebaseChildEvent(firebase) {
        var ref = firebase.database().ref();
        return {
            root: function(callback) {
                ref.child('users').on('child_changed', function(snapshot) {
                    if (snapshot.val()) callback(snapshot.val());
                    else callback(false);
                });
            }
        };
    };

})();