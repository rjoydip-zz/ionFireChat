(function() {
    'use strict';

    angular
        .module('directives', [])
        .directive('userLogout', userLogout)
        .directive('userNotification', userNotification);

    userLogout.$inject = ["UserService"];

    function userLogout(UserService) {
        return {
            restrict: 'E',
            template: '<button style="font-size: 20px;" class="button button-ion ion-power" ng-click="logout()"></button>',
            link: function($scope, $element, $attrs) {
                var vm = $scope;

                angular.extend(vm, {
                    logout: logout
                });

                function logout() {
                    UserService.logout();
                }

                console.log("Logout directive working");
            }
        }
    }

    userNotification.$inject = ["$state", "UserService"];

    function userNotification($state, UserService) {
        return {
            restrict: 'EA',
            template: '<button style="font-size: 20px;" class="button button-ion ion-android-notifications notifi" ng-click="goNotification()"></button>' +
                ' <span class="noti_number">{{notificationNumber}}</span> ' +
                '<style>' +
                '.noti_number { position: absolute;margin-top: -32px;z-index: 10000;left: 19px;background-color: #6b4545;color: #00000;border-radius: 50%;' +
                'width: 20%;height: 45%;font-size: 0.9em;text-align: center;line-height: 0.9em;font-weight: bold;' +
                'button.button.button-ion.ion-android-notifications.notifi { color: #6b4545 !important; }' +
                '}' +
                '</style>',
            link: function($scope, $element, $attrs) {
                var vm = $scope;

                angular.extend(vm, {
                    notificationNumber: 0,
                    getNosNotification: getNosNotification,
                    goNotification: goNotification
                });

                function getNosNotification() {
                    UserService.getUserNotificationNumber(function(nos) {
                        vm.notificationNumber = nos;
                    });
                }

                function goNotification() {
                    $state.go('notification');
                }

                (function() {
                    vm.getNosNotification();
                })();

                console.log("Notification directive working");
            }
        }
    }


})();