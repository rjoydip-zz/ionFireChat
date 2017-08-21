(function() {
    'use strict';

    angular
        .module('services', [])
        .factory("Auth", Auth)
        .factory("Users", Users)
        .factory("Rooms", Rooms)
        .factory("Message", Message)
        .service("UserService", UserService)
        .service("FacebookService", FacebookService);

    Auth.$inject = ["$firebaseAuth", "firebase"];

    function Auth($firebaseAuth, firebase) {
        return $firebaseAuth(firebase.auth());
    }

    Message.$inject = ["$firebaseArray", "Users", "UserService", "md5", "$q", "firebase"];

    function Message($firebaseArray, Users, UserService, md5, $q, firebase) {
        var selectedRoomId;
        var chatMessagesForRoom;
        var ref = firebase.database().ref();

        return {
            get: get,
            remove: remove,
            send: send
        }

        function get(roomId) {
            chatMessagesForRoom = $firebaseArray(ref.child('messages').child(roomId).orderByChild("createdAt"));
            return chatMessagesForRoom;
        }

        function remove(chat) {
            chatMessagesForRoom.$remove(chat).then(function(ref) {
                ref.key() === chat.$id; // true item has been removed
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

    Users.$inject = ["$firebaseArray", "firebase", "UserService"];

    function Rooms($firebaseArray, firebase, UserService) {
        var currentUser = UserService.getProfile();
        var ref = firebase.database().ref();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        return {
            create: function(addUserinfo, callback) {
                ref.child('rooms').child(uuid).set({
                    message: null,
                    myId: currentUser.id,
                    friendId: addUserinfo.id,
                });
                UserService.addToFriendList(addUserinfo.id, function(status) {
                    if (status) {
                        callback(status);
                    }
                });
            }
        }
    }

    Users.$inject = ["$firebaseArray", "firebase"];

    function Users($firebaseArray, firebase) {
        var ref = firebase.database().ref();

        return {
            getAllUsers: function() {
                return $firebaseArray(ref.child('users'));
            }
        }
    }

    UserService.$inject = ["Auth", "$q", "$state", "$ionicLoading", "$rootScope", "firebase", "$firebaseArray"];

    function UserService(Auth, $q, $state, $ionicLoading, $rootScope, firebase, $firebaseArray) {
        var ref = firebase.database().ref();
        // Get a reference to my own presence status.
        var connectedRef = ref.child('/.info/connected');

        return {
            login: login,
            logout: logout,
            createUser: createUser,
            saveProfile: saveProfile,
            getProfile: getProfile,
            trackPresence: trackPresence,
            addToFriendList: addToFriendList,
            getUserProfileById: getUserProfileById
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
                        console.log(newFriendList);
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
            $firebaseArray(ref.child('users').child(id)).$ref().once('value', function(snapshort) {
                callback(snapshort.val());
            });
        }
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