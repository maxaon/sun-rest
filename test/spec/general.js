describe("Verify general work", function () {
  beforeEach(module('sun.rest'));
  var modelFactory;
  beforeEach(inject(function (_sunRestModelFactory_) {
    modelFactory = _sunRestModelFactory_;
  }));
  it("should copy object", function () {
    var NewModel = modelFactory({name: 'new', properties: {login: {}, name: {}}});
    var inst = new NewModel();
    inst.login = "login";
    var copy = angular.copy(inst);
    expect(angular.equals(inst, copy)).toBe(true);
  });

});