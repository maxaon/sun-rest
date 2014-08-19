(function (angular) {
    'use strict';
    var module=angular.module("templateCache");
    module.run(['$templateCache', function($templateCache) {
		$templateCache.put('api/sunRest.sunRestConfig.html','<h1><code ng:non-bindable="">sunRestConfig</code>\n<div><span class="hint">service in module <code ng:non-bindable="">sunRest</code>\n</span>\n</div>\n</h1>\n<div><h2 id="description">Description</h2>\n<div class="description"><div class="sunrest-sunrestconfig-page"><p>Bla blas vlss</p>\n</div></div>\n</div>\n');
    }]);
}(window.angular));
