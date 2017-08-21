/**
 * @author ayoub
 */
(function () {
  'use strict';

  angular.module('BlurAdmin.pages.surveys')
    .factory('SurveyService',SurveyService);

  /** @ngInject */
  function SurveyService($http, $q) {
    var apiBaseUrl = "http://localhost:9000"
    var endpoint = apiBaseUrl + "/surveys";

    function list(params) {
      params = params || {};

			var deferred = $q.defer();
    	$http.get(endpoint)
       .success(function(data) { 
          deferred.resolve(data);
       }).error(function(msg, code) {
          deferred.reject(msg);
       });

     return deferred.promise;


      return $http.get(endpoint, params);
    }

    function create(survey) {
      return $http.post(endpoint, survey);
    }

    function edit(survery) {
     console.log("edit jSurvey Opject", survey);
    }

    function remove(survery) {
     console.log("remove Opject", survey);
    }

    return {
      list:list,
      create:create,
      edit:edit,
      remove:remove
    }
  }
})();