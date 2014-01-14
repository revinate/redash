'use strict';

angular.module('highchart', [])
    .directive('chart', ['$timeout', function ($timeout) {
        return {
            restrict: 'E',
            template: '<div></div>',
            scope: {
                options: "=options",
                series: "=series"
            },
            transclude: true,
            replace: true,

            link: function (scope, element, attrs) {
                var chartsDefaults = {
                    chart: {
                        renderTo: element[0],
                        type: attrs.type || null,
                        height: attrs.height || null,
                        width: attrs.width || null
                    }
                };

                var deepCopy = true;
                var newSettings = {};
                $.extend(deepCopy, newSettings, chartsDefaults, scope.options);

                // Making sure that the DOM is ready before creating the chart element, so it gets proper width.
                $timeout(function(){
                    scope.chart = new Highcharts.Chart(newSettings);

                    //Update when charts data changes
                    scope.$watch(function () {
                        return (scope.series && scope.series.length) || 0;
                    }, function (length) {
                        if (!length || length == 0) {
                            scope.chart.showLoading();
                        } else {
                            while(scope.chart.series.length > 0) {
                                scope.chart.series[0].remove(true);
                            }

                            if (scope.series[0].type == 'column' &&
                                _.some(scope.series[0].data, function(p) { return angular.isString(p.x) })) {
                                scope.chart.xAxis[0].update({type: 'category'});

                                // We need to make sure that for each category, each series has a value.
                                var categories = _.union.apply(this, _.map(scope.series, function(s) { return _.pluck(s.data,'x')}));

                                _.each(scope.series, function(s) {
                                    // TODO: move this logic to Query#getChartData
                                    var yValues = _.groupBy(s.data, 'x');

                                    var newData = _.sortBy(_.map(categories, function(category) {
                                        return {
                                            name: category,
                                            y: yValues[category] && yValues[category][0].y
                                        }
                                    }), 'name');

                                    s.data = newData;
                                });
                            } else {
                                if (scope.series[0].type == 'area') {
                                    _.each(scope.series, function(s) {
                                        _.each(s.data, function(p) {
                                            // This is an insane hack: somewhere deep in HighChart's code,
                                            // when you stack areas, it tries to convert the string representation
                                            // of point's x into a number. With the default implementation of toString
                                            // it fails....
                                            p.x.toString = function() {
                                                return String(this.toDate().getTime());
                                            }
                                        })
                                    });
                                }
                                scope.chart.xAxis[0].update({type: 'datetime'});
                            }

                            scope.chart.counters.color = 0;

                            _.each(scope.series, function(s) {
                                scope.chart.addSeries(s);
                            })

                            scope.chart.redraw();
                            scope.chart.hideLoading();
                        };
                    }, true);
                });


            }
        };

    }]);