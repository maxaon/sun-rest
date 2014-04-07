/**
 * Created by maxaon on 14.01.14.
 */
/*jslint nomen: true*/
describe('Test BaseModel creation', function () {
  'use strict';
  // load the controller's module
  beforeEach(module('sun.rest'));

  var modelFactory;

  beforeEach(inject(function (_sunRestModelFactory_) {
    modelFactory = _sunRestModelFactory_;
  }));

  it('should create simple model', function () {
    var inst, NewModel;
    NewModel = modelFactory({name: 'new', properties: {login: {}, name: {}}});
    inst = new NewModel();
    expect(inst.mngr).toBeDefined();

    expect(inst.mngr.state).toBe(inst.mngr.NEW);
    expect(inst.mngr.isRemote).toBeFalsy();

    inst.mngr.populate({login: 'UserLogin', password: 'somePassword'});

    expect(inst.mngr.state).toBe(inst.mngr.LOADED);
    expect(inst.login).toBe('UserLogin');
    expect(inst._login).toBe('UserLogin');
    expect(inst.__login).toBe('UserLogin');
  });
  it('should substitute value', function () {
    var inst, NewModel;
    NewModel = modelFactory({
      properties: {
        choices: {
          getter: function () {
            return this._choices === 1 ? 'one' : 'not one';
          }
        }
      }
    });
    inst = new NewModel({choices: 1});
    expect(inst.__choices).toBe(1);
    expect(inst._choices).toBe(1);
    expect(inst.choices).toBe('one');
    inst.choices = 2;
    expect(inst._choices).toBe(2);
    expect(inst.choices).toBe('not one');
  });
  it('should correctly convert to JSON', function () {
    var inst, Model;
    Model = modelFactory({properties: {login: {}, password: {}}});
    inst = new Model();
    inst.login = 'login';
    inst.password = 'password';
    expect(JSON.stringify(inst)).toBe(JSON.stringify({login: 'login', password: 'password'}));
  });
  it('should serialize model', function () {
    var inst, NewModel;
    NewModel = modelFactory({
      properties: {
        choices: {
          getter: function () {
            return this._choices === 1 ? 'one' : 'not one';
          }
        }
      }
    });
    inst = new NewModel({choices: 1});
    expect(JSON.stringify(inst)).toBe(JSON.stringify({choices: 1}));
    expect(JSON.stringify({someOtherObject: inst})).toBe(JSON.stringify({someOtherObject: {choices: 1}}));
    inst.choices = 10;
    expect(JSON.stringify(inst)).toBe(JSON.stringify({choices: 10}));
  });
  it('should call custom modifications', function () {
    var inst, NewModel;
    NewModel = modelFactory({
      properties: {
        password: {
          toJson  : function (value) {
            return 'JSON:' + value;
          },
          toNative: function (value) {
            return 'NATIVE:' + value;
          }
        },
        date    : {
          toJson  : function (value) {
            return value.toJSON();
          },
          toNative: function (value) {
            return new Date(value);
          }
        }
      }
    });
    inst = new NewModel();
    inst.mngr.populate({password: 'psw', date: '2014-01-01T20:10:00.000Z'});
    expect(inst.password).toBe('NATIVE:psw');
    expect(inst.mngr.toJSON().password).toBe('JSON:NATIVE:psw');
    expect(inst.date).toBeInstanceOf(Date);
    expect(inst.date - new Date(Date.UTC(2014, 0, 1, 20, 10))).toBe(0);


  });
});
