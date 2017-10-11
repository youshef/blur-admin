(function () {
  'use strict';

  angular.module('BlurAdmin.pages.surveys.list')
      .controller('list', list);

  /** @ngInject */
  function list( SurveyService, AnswerService, MemberService, $scope, $rootScope, $log, $state, toastr, baConfig, $q, $http, $sce, $filter, appConfig) {
    var vm = this;
    $rootScope.$state = $state;

    function loadSurveys() {
      SurveyService
        .list()
        .then(function (data){
					vm.surveys = data;
          getSurveyCompletion();
          groupElementsByTag();
					$log.info("Got the survey data",data);
        }, function (error){
          $log.error(error);
        });
    }

    function goToCreate() {
      $log.info("Go to create");
      $state.go('main.surveys.create');
    }

    function editSurvey(survey){
      $log.info("Edit");
      if(survey.status == 'Draft' )
        $state.go('main.surveys.edit', {'survey_id': survey.id})
      else
        toastr.error('You can only edit surveys in Draft status', 'Surveys', vm.errorToastrOptions)
    }; 

    function resendSurvey(survey){
      if (confirm("Are you sure you want to resend this survey ?"))
        SurveyService
                .send(survey)
                .then(
                  function (data){
                    console.log('Survey is being sent', data);
                    loadSurveys();
                    toastr.info('The survey is being resent :)', 'Surveys', vm.successToastrOptions)
                  },
                  function (error){
                    toastr.error('There were an error resending the survey', 'Surveys', vm.errorToastrOptions)
                  }
                );
    }; 

    function duplicateSurvey(survey){
      $log.info("Remove");
      var s = survey
      s.id = null;
      s.name = "COPY OF " + s.name
      s.status = "Draft"
      
      s.list = []
      s.respondents = []
      s.answers = []
      s.goupedElements = []
      s.sent = []
      s.notSent = []
            SurveyService
                .create(s)
                .then(
                  function (data){
                    console.log('Survey duplicated', data);
                    loadSurveys();
                    toastr.info('The survey was duplicated successfuly :)', 'Surveys', vm.successToastrOptions)
                  },
                  function (error){
                    toastr.error('There were an error duplicating the survey', 'Surveys', vm.errorToastrOptions)
                  }
                );
    }; 

    function removeSurvey(survey){
      if (confirm("Are you sure?"))
           {
            $log.info("Remove");
            SurveyService
                .remove(survey.id)
                .then(
                  function (data){
                    console.log('Survey deleted', data);
                    loadSurveys();
                    toastr.info('The survey was deleted successfuly :)', 'Surveys', vm.successToastrOptions)
                  },
                  function (error){
                    toastr.error('There were an error deleting the survey', 'Surveys', vm.errorToastrOptions)
                  }
                );
            }
    }; 

    function getSurveyCompletion() {
      angular.forEach(vm.surveys, function(survey, key) {
        var totalMembers = 0
        var totalAnswers = survey.answers.length
        var totalQuestions = survey.elements.length
        var completion = 0

        angular.forEach(survey.list, function(list, key) {
            totalMembers = totalMembers + list.members.length
          });

        totalQuestions = survey.type == "s_360" ? totalQuestions * totalMembers : totalQuestions;

        completion = (((totalAnswers) / (totalMembers * totalQuestions))*100).toFixed(0)

        survey.completion = completion;
        //console.log('totalAnswers / TOTAL', totalAnswers, totalMembers * totalQuestions);

      });

      //console.log('getSurveyCompletion', vm.surveys);
    }

    function printPdf(){
                console.log('printing pdf...');
                getFile('pdf').then(function(response){
                    //console.log(response);
                    window.open(response);
                },function(err){
                    console.log('Error: ' + err);
                });
            };

    function printExcel(){
                console.log('printing excel...');
                getFile('xlsx').then(function(response){
                    //console.log(response);
                    window.open(response);
                },function(err){
                    console.log('Error: ' + err);
                });
            };

     function getFile(type){
                vm.loading = true;
                var q = $q.defer();
                var contentType = (type == 'pdf') ? 'application/pdf' : 'application/vnd.ms-excel'
                var endpoint = appConfig.apiBaseUrl+'/files/'+type;
                $http.defaults.headers.common['content-type'] = contentType;

                var paramz = {}
                paramz.survey = vm.activeSurvey.id
                if (type == 'pdf') {
                   paramz.survey_type = vm.activeSurvey.type
                   paramz.survey_summary_labels = vm.activeSurvey.type == "s_360" ? vm.s360Analysis.overall.labels.join(', ') : vm.regularAnalysis.overall.labels.join(', ');
                   paramz.survey_summary_data = vm.activeSurvey.type == "s_360" ? vm.s360Analysis.overall.data.join(', ') : vm.regularAnalysis.overall.data.join(', ');
                }
               // paramz.lists_summary_labels = vm.activeSurvey.type == "s_360" ? vm.s360Analysis.lists.labels.join(', ') : vm.regularAnalysis.overall.labels.join(', ');
               // paramz.lists_summary_data = vm.activeSurvey.type == "s_360" ? vm.s360Analysis.lists.data.join(', ') : vm.regularAnalysis.overall.data.join(', ');

                $http.get(endpoint, {params : paramz, responseType : 'arraybuffer'})
                        .success(function (response) {
                            //console.log(response);
                            var file = new Blob([response], {type: contentType});
                            var fileURL = URL.createObjectURL(file);
                            vm.loading = false;
                            if (type == 'pdf')
                              q.resolve(fileURL);
                            else {
                              var anchor = document.createElement("a");
                              anchor.download = "report.xlsx";
                              anchor.href = fileURL;
                              anchor.click();
                            }
                             
                        })
                        .error(function(err){
                            vm.loading = false;
                            q.reject(err);
                        });
                return q.promise;
            };

    function analyzeSurvey(survey) {
      var params = {"survey":survey.id}
      if(survey.completion && survey.completion > 0) {
        AnswerService
        .analyze(params)
        .then(function (data){
          vm.analysis = data;
          vm.activeSurvey = survey;
          $log.info("Got answers analysis",data);
          getRespondents(survey);

          if(vm.activeSurvey.type != "s_360")
            getRegularAnalysis();
          else
            getS360Analysis();

        }, function (error){
          $log.error(error);
        });
      } else
        toastr.error('No enough data to analyse :(', 'Surveys', vm.errorToastrOptions)
      
    }

    function getRespondents(survey) {
      var members = vm.analysis.data.overall.respondents.join(', ')
      var params = {"ids":members}
      MemberService
        .list(params)
        .then(function (data){
          vm.members = data;

          $log.info("Got members",data);
          angular.forEach(vm.members, function(member, key) {
            if (survey.type == 's_incognito'){
              member.name = 'unknown'
              member.email = 'unknown'
            }
            member.answers = $filter('filter')(vm.analysis.answers, {'asked' : {'id' : member.id}})
          })
          vm.selectedMember = (vm.members.length > 0) ? vm.members[0] : [];
          console.log("getRespondents", vm.members);
        }, function (error){
          $log.error(error);
        });
    }

    function getS360Analysis(){
        vm.s360Analysis = {"lists" : {}, "overall": {}}
        //overall
        vm.s360Analysis.overall = gets360Data(vm.analysis.data.overall, vm.analysis.labels);
        //lists
        angular.forEach(vm.activeSurvey.list, function(list) {
            vm.s360Analysis.lists[list._id] = {}
            vm.s360Analysis.lists[list._id].labels = []
            vm.s360Analysis.lists[list._id] = gets360Data(vm.analysis.data.lists[list._id], vm.analysis.labels);
          });
        //individual
        vm.s360Analysis.individual = gets360IndividualData(vm.analysis.data.overall, vm.analysis.labels);
          console.log("s360Analysis", vm.s360Analysis)
          
      }

      function gets360Data(listData, labels){
          var data = {}
          data.labels = []
          data.data = []

          angular.forEach(vm.activeSurvey.goupedElements, function(elements) {
            var grouped = elements.length > 1 ? true : false;
            var tmpAvg = 0
            var tag = ''
            angular.forEach(elements, function(el) {
              tag = (el.tag) ? el.tag : el.text
              if (grouped == false)
                data.labels.push(tag)
              
              
              var elemSum = 0
              var i = 0
              angular.forEach(listData.data, function(asked, a) {
                var askedSum = 0
                angular.forEach(asked, function(evaluated, e) {
                  elemSum = elemSum + evaluated[el._id]
                  i++
                })

              })
              var avg = elemSum / i
              
              if (grouped == false)
                data.data.push(avg);
              else
                tmpAvg = tmpAvg + avg

            })
            if (grouped == true) {
              data.labels.push(tag)
              tmpAvg = tmpAvg / elements.length
              data.data.push(tmpAvg);
            }
          })

          //console.log("gets360Data, data",data)
          return data;

      }




      function gets360IndividualData(listData, labels){
          var data = {}
          data.labels = []
          data.data = []
          
          var tempAskedData = []
          var othersData = []


          angular.forEach(listData.data, function(askd, as) {
            tempAskedData[as] = []
            othersData[as] = []
            angular.forEach(vm.activeSurvey.goupedElements, function(elements) {
            var grouped = elements.length > 1 ? true : false;
            var tmpAvg = 0
            var tmpMyVal = 0
            var tag = ''
            angular.forEach(elements, function(el) {
                tag = (el.tag) ? el.tag : el.text
                if (grouped == false)
                  data.labels.push(tag)

                var elemSum = 0
                var myVal = 0
                var i = 0
                angular.forEach(listData.data, function(asked, a) {
                  var askedSum = 0
                  angular.forEach(asked, function(evaluated, e) {
                    //others evaluation
                    if(e == as) {
                      i++
                      elemSum = elemSum + evaluated[el._id]
                    } 
                    //auto evaluation
                    if (e == as && e == a)
                      myVal = evaluated[el._id]
                    
                  })

                })
                var avg = elemSum / i
                
                if (grouped == false) {
                  othersData[as].push(avg);
                  tempAskedData[as].push(myVal);
                } else {
                  tmpMyVal = tmpMyVal + myVal;
                  tmpAvg = tmpAvg + avg;
                }
                  

              })
              if (grouped == true) {
                data.labels.push(tag)
                tmpAvg = tmpAvg / elements.length
                tmpMyVal = tmpMyVal / elements.length
                othersData[as].push(tmpAvg);
                tempAskedData[as].push(tmpMyVal);
              }
            })



          })
          //merging all together
          //console.log("here",othersData)
          angular.forEach(listData.data, function(askd, as) {
            //console.log("asasasas",as)
            data.data[as] = [othersData[as], tempAskedData[as]]
          })
          data.labels = data.labels
          //console.log("othersData[as], tempAskedData[as]",othersData, tempAskedData, data)
          return data;
      }

      

      

      function getRegularAnalysis(){
        
        vm.regularAnalysis = {"lists" : {}, "overall": {}}
        //overall
        vm.regularAnalysis.overall = getRegularData(vm.analysis.data.overall, vm.analysis.labels);
        //lists
        angular.forEach(vm.activeSurvey.list, function(list) {
            vm.regularAnalysis.lists[list._id] = {}
            vm.regularAnalysis.lists[list._id].labels = []
            vm.regularAnalysis.lists[list._id] = getRegularData(vm.analysis.data.lists[list._id], vm.analysis.labels);
          });

        console.log("regularAnalysis", vm.regularAnalysis)
        
          
      }




      function getRegularData(listData, labels){
          var data = {}
          data.labels = []
          data.data = []

          angular.forEach(vm.activeSurvey.goupedElements, function(elements) {
            var grouped = elements.length > 1 ? true : false;
            var tmpPercent = 0
            var tag = ''
            angular.forEach(elements, function(element) {
              tag = (element.tag) ? element.tag : element.text
              if (grouped == false)
                data.labels.push(tag)
              
              var perfectScore = listData.respondents.length * element.items.length //totalParticip * nbrChoix
              // nobreReponseN * coeficientN + ...
              var totalScore = 0;
              for ( var i = 0, _len = listData.data[element._id].length; i < _len; i++ ) {
                    totalScore += listData.data[element._id][i] * (i+1)
              }
              var percent = totalScore * 100 / perfectScore
              if (grouped == false)
                data.data.push(percent);
              else 
                tmpPercent = tmpPercent + percent
            })
            if (grouped == true) {
              data.labels.push(tag)
              tmpPercent = tmpPercent / elements.length
              data.data.push(tmpPercent);
            }
          })
          
          console.log("getRegularData : ", data)
          
          return data;

      }

      function groupElementsByTag() {
        angular.forEach(vm.surveys, function(survey, key) {
            var goupedElements = []
            var groupedTag = []
            angular.forEach(survey.elements, function(element, key) {  
                var tmpGoupedElements = $filter('filter')(survey.elements, {'tag':element.tag})
                if (tmpGoupedElements.length > 1 && (groupedTag.indexOf(element.tag) == -1)) {
                    groupedTag.push(element.tag);
                    goupedElements.push(tmpGoupedElements);
                } else if (tmpGoupedElements.length < 2)
                    goupedElements.push(tmpGoupedElements);
            })

            survey.goupedElements = goupedElements;
        })
        
        //console.log("groupElementsByTag-groupedTag", groupedTag)
        //console.log("groupElementsByTag-goupedElements", goupedElements)
    }

    function activate(){
			vm.surveys = [];
      vm.activeSurvey = {};
      vm.members = [];
      vm.selectedMember = {};
      vm.goToCreate = goToCreate;
      vm.analyzeSurvey = analyzeSurvey;
      vm.editSurvey = editSurvey;
      vm.removeSurvey = removeSurvey;
      vm.printPdf = printPdf;
      vm.printExcel = printExcel;
      vm.duplicateSurvey = duplicateSurvey;
      vm.resendSurvey = resendSurvey;
      vm.graphType = 'bars';

      var s360Scales = {     
            yAxes: [{
              ticks: {
                   min: 0,
                   max: 10,
                   callback: function(value){return value}
                },  
                scaleLabel: {
                   display: false
                }
            }]
        };

      vm.s360IndividualBarChartOption = {
        scales: s360Scales,
        legend: {
                  display: true,
                  position:'bottom'
              }
      };
      vm.s360BarChartOption = {
        scales: s360Scales,
        legend: {
                  display: false
              }
      };

      vm.s360RadarChartOption = {
        scale: {
          ticks: {
            beginAtZero: true,
          },
          pointLabels: {
            fontSize: 13
          }
        },
        legend: {
          display: true,
          position: 'left'
        }
      };

      vm.errorToastrOptions = {
                      "autoDismiss": true,
                      "positionClass": "toast-bottom-right",
                      "type": "error",
                      "timeOut": "5000",
                      "extendedTimeOut": "2000"
                    };
      vm.successToastrOptions = {
                      "autoDismiss": true,
                      "positionClass": "toast-bottom-right",
                      "type": "success",
                      "timeOut": "5000",
                      "extendedTimeOut": "2000"
                    };

      vm.series = appConfig.series;

      loadSurveys();
    }

    activate();

  }

})();
