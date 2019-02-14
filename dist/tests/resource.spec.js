"use strict";
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var chai_1 = require("chai");
var index_1 = tslib_1.__importDefault(require("../index"));
var client_1 = require("../client");
var BaseTestingResource = /** @class */ (function (_super) {
    tslib_1.__extends(BaseTestingResource, _super);
    function BaseTestingResource() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    BaseTestingResource.getClient = function () {
        return new client_1.DefaultClient('https://jsonplaceholder.typicode.com');
    };
    return BaseTestingResource;
}(index_1.default));
exports.BaseTestingResource = BaseTestingResource;
var UserResource = /** @class */ (function (_super) {
    tslib_1.__extends(UserResource, _super);
    function UserResource() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UserResource.endpoint = '/users';
    return UserResource;
}(BaseTestingResource));
exports.UserResource = UserResource;
var PostResource = /** @class */ (function (_super) {
    tslib_1.__extends(PostResource, _super);
    function PostResource() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PostResource.endpoint = '/posts';
    PostResource.related = {
        userId: UserResource
    };
    return PostResource;
}(BaseTestingResource));
exports.PostResource = PostResource;
describe('Resource', function () {
    var post = undefined;
    it('correctly gets remote resource', function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, PostResource.detail('1')];
                case 1:
                    post = _a.sent();
                    chai_1.expect(post.get('userId')).to.exist;
                    return [2 /*return*/];
            }
        });
    }); });
    it('related key is a string', function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, PostResource.detail('1')];
                case 1:
                    post = _a.sent();
                    chai_1.expect(post.get('userId')).to.be.string;
                    return [2 /*return*/];
            }
        });
    }); });
    it('correctly gets related', function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, post.getRelated()];
                case 1:
                    _a.sent();
                    chai_1.expect(post.get('userId')).to.be.instanceOf(UserResource);
                    return [2 /*return*/];
            }
        });
    }); });
    it('correctly gets a cached related item', function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var cachedUser;
        return tslib_1.__generator(this, function (_a) {
            cachedUser = UserResource.getCached(post.get('userId.id'));
            chai_1.expect(cachedUser).to.exist;
            chai_1.expect(cachedUser.resource).to.be.instanceOf(UserResource);
            return [2 /*return*/];
        });
    }); });
    it('creates resources', function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var newUser;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    newUser = new UserResource({
                        name: 'Test User',
                        username: 'testing123321',
                        email: 'testuser@dsf.com'
                    });
                    return [4 /*yield*/, newUser.save()];
                case 1:
                    _a.sent();
                    chai_1.expect(newUser).to.have.property('id');
                    chai_1.expect(newUser.id).to.exist;
                    chai_1.expect(newUser._attributes.id).to.exist;
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=resource.spec.js.map