(function() {
    'use strict';

    angular
        .module('directives', [])
        .directive('userLogout', userLogoutDirective);

    userLogoutDirective.$inject = ["UserService"];

    function userLogoutDirective(UserService) {
        return {
            restrict: 'E',
            template: '<button style="font-size: 20px;" class="button button-ion ion-power" ng-click="vm.logout()"></button>',
            link: function($scope, $element, $attrs) {
                var vm = $scope.vm = {};
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
})();