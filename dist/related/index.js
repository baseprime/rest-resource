"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var index_1 = tslib_1.__importDefault(require("../index"));
var lodash_1 = require("lodash");
var assert_1 = tslib_1.__importDefault(require("assert"));
var exceptions_1 = require("../exceptions");
var RelatedManager = /** @class */ (function () {
    function RelatedManager(to, value) {
        this.many = false;
        this.inflated = false;
        this._objects = {};
        this.to = to;
        this.value = value;
        this.many = Array.isArray(value);
        this.primaryKeys = this.getPrimaryKeys();
    }
    RelatedManager.prototype.getNodeContentType = function () {
        if (this.many) {
            var iterValue = this.value;
            var nodeCtor = lodash_1.first(iterValue).constructor;
            if (nodeCtor.prototype instanceof index_1.default) {
                return index_1.default;
            }
            else {
                return nodeCtor;
            }
        }
        else {
            var Ctor = this.value.constructor;
            if (Ctor.prototype instanceof index_1.default) {
                return index_1.default;
            }
            else {
                return Ctor;
            }
        }
    };
    RelatedManager.prototype.getPrimaryKeys = function () {
        var _this = this;
        var contentType = this.getNodeContentType();
        var iterValue = this.value;
        if (this.many) {
            if (contentType === index_1.default) {
                return iterValue.map(function (resource) { return _this.getIdFromResource(resource); });
            }
            else if (this.many && contentType === Object) {
                return iterValue.map(function (record) { return _this.getIdFromObject(record); });
            }
            else {
                return this.value;
            }
        }
        else {
            if (contentType === index_1.default) {
                return [this.getIdFromResource(this.value)];
            }
            else if (contentType === Object) {
                return [this.getIdFromObject(this.value)];
            }
            else {
                return [this.value];
            }
        }
    };
    RelatedManager.prototype.getIdFromObject = function (object) {
        return String(object[this.to.uniqueKey]);
    };
    RelatedManager.prototype.getIdFromResource = function (resource) {
        return resource.id;
    };
    RelatedManager.prototype.getOne = function (id) {
        var _this = this;
        return this.to.detail(id).then(function (resource) {
            assert_1.default(resource.getConstructor().toResourceName() == _this.to.toResourceName(), "Related class detail() returned invalid instance: " + resource.toResourceName() + " (returned) !== " + _this.to.toResourceName() + " (expected)");
            _this._objects[resource.id] = resource;
            return resource;
        });
    };
    RelatedManager.prototype.resolve = function () {
        var _this = this;
        return Promise.all(this.primaryKeys.map(function (id) { return _this.getOne(id); })).then(function () {
            _this.inflated = true;
            return Object.values(_this.objects);
        });
    };
    Object.defineProperty(RelatedManager.prototype, "objects", {
        get: function () {
            if (!this.inflated) {
                throw new exceptions_1.AttributeError("Can't read results of " + this.constructor.name + "[objects], " + this.to.toResourceName() + " must resolve() first");
            }
            var allObjects = Object.values(this._objects);
            return allObjects;
        },
        enumerable: true,
        configurable: true
    });
    RelatedManager.prototype.toJSON = function () {
        return this.value;
    };
    return RelatedManager;
}());
exports.default = RelatedManager;
//# sourceMappingURL=index.js.map