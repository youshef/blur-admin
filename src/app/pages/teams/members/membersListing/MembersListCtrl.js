/**
 * @author a.demeshko
 * created on 28.12.2015
 */
(function () {
  'use strict';

  angular.module('BlurAdmin.pages.teams.members')
    .controller('MembersListCtrl', MembersListCtrl);

  /** @ngInject */
  function MembersListCtrl($scope, $stateParams,  membersList) {
    var vm = this;
    vm.members = ($stateParams.label == "listing") ? membersList.getAllMessages() : membersList.getMembersByLabel($stateParams.label);
    vm.label = $stateParams.label;


  }

})();
