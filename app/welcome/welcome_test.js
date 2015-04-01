'use strict';

describe('myApp.welcome module', function() {

  beforeEach(module('myApp.welcome'));

  describe('welcome controller', function(){

    it('should ....', inject(function($controller) {
      //spec body
      var view1Ctrl = $controller('WelcomeCtrl');
      expect(view1Ctrl).toBeDefined();
    }));

  });
});
