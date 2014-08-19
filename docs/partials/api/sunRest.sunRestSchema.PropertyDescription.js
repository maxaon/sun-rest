(function (angular) {
    'use strict';
    var module=angular.module("templateCache");
    module.run(['$templateCache', function($templateCache) {
		$templateCache.put('api/sunRest.sunRestSchema.PropertyDescription.html','<h1><code ng:non-bindable="">PropertyDescription</code>\n<div><span class="hint">sunRestSchema in module <code ng:non-bindable="">sunRest</code>\n</span>\n</div>\n</h1>\n<div><div class="member property"><h2 id="properties">Properties</h2>\n<ul class="properties"><li><h3 id="properties_setter">setter</h3>\n<div class="setter"><div class="sunrest-sunrestschema-page sunrest-sunrestschema-propertydescription-page"><p>Function to set value</p>\n</div></div>\n</li>\n<li><h3 id="properties_getter">getter</h3>\n<div class="getter"><div class="sunrest-sunrestschema-page sunrest-sunrestschema-propertydescription-page"><p>Function to get value</p>\n</div></div>\n</li>\n<li><h3 id="properties_remoteproperty">remoteProperty</h3>\n<div class="remoteproperty"><div class="sunrest-sunrestschema-page sunrest-sunrestschema-propertydescription-page"><p>Name of the remote property</p>\n</div></div>\n</li>\n</ul>\n</div>\n</div>\n');
    }]);
}(window.angular));
