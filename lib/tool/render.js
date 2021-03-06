/**
 * render.js
 * Render the template files.
 *
 * changelog
 * 2013/09/18:add engine setting.
 *
 * @author yinyong#sogou-inc.com
 * @version 0.0.2
 */
var config = require('../config'),
	utils = require('../utils'),
	sysPath = require('path'),
	fs = require('fs');

var _g_engine = {
	render: undefined,
	name: undefined
};

var _proto_ = {
	/**
	 * 获取模板引擎渲染函数。默认使用twig。
	 * @return {Function} 模板引擎的renderFile函数
	 */
	_getEngine: function() {
		if (_g_engine.render) {
			return _g_engine;
		}
		var engineName = config.get("engine") || "twig";

		if (!utils.isString(engineName)) {
			throw new Error("engine name MUST BE a string!");
		}

		var _engine = require(engineName) && require(engineName).__express || require(engineName).renderFile;
		if (!_engine || !typeof _engine === 'function') {
			throw new Error(engineName + "is not a valid engine!");
		}
		//禁止缓存
		switch (true) {
			case (/^twig$/i.test(engineName)):
				require(engineName).cache(false);
				break;
			default:
				;
		}

		_g_engine.name = engineName;
		_g_engine.render = _engine;
		return _g_engine;
	},
	/**
	 * 使用合适的模板引擎输出渲染后的文件。
	 * @param  {String}   file     文件路径
	 * @param  {Object}   data     模板数据，包括自定义的和json文件中定义的。
	 * @param  {Function} callback 渲染行为的回调函数。
	 */
	_renderFile: function(file, data, callback) {
		data.settings = {
			"views": config.templateDir,
			"view cache": false,
			'twig options': {
				strict_variables: false
			}
		};
		if (/^ejs$/i.test(_g_engine.name)) data.cache = false; //todo test
		try {
			return this._getEngine().render(file, data, function(err, content) {
				callback(err, content);
			});
		} catch (e) {
			return callback(e,null);
		}
	},
	/**
	 * 渲染指定模板文件。
	 *
	 * 函数将查找_data中合适的json数据，并渲染模板。
	 *
	 * @param  {String}   token    模板的标识：相对于./template，无前导“/”,无后缀
	 * @param  {String}   data     数据，将覆盖_data中json的定义
	 * @param  {Function} callback [description]
	 */
	render: function(token, data, callback) {
		//remove . / beside token
		token = (token || "").replace(/(^\.?\/*|[\.\/]+$)/g, "");
		var source = sysPath.join(this.sourceDir, token + "." + config.templateSuffix);

		if (!fs.existsSync(source)) {
			return callback(new Error(source + " does not exist"), null);
		}
		//_ursa.json文件为所有模板公用
		var commonDataFile = sysPath.join(config.dataDir, "_ursa.json");

		var commonData = {};
		try {
			commonData = JSON.parse(utils.rmComment(fs.readFileSync(commonDataFile, "utf-8")));
		} catch (e) {
			console.warn("Common data file %s read failed:%s".warn, dataFile, e);
		} finally {
			commonData = commonData || {};
		}

		var dataFile = sysPath.join(config.dataDir, token + ".json");
		var jsonData;
		
		try {
			jsonData = JSON.parse(utils.rmComment(fs.readFileSync(dataFile, "utf-8")));
		} catch (e) {
			console.warn("%s read failed:%s".warn, dataFile, e);
		} finally {
			jsonData = jsonData || {};
		}


		//补充_ursa.json的定义
		for (var e in commonData) {
			jsonData[e] = jsonData[e] || commonData[e];
		}
		//补充额外数据
		for (var e in data) {
			jsonData[e] = data[e];
		}
		//创建token
		var _token = token;
		var tokens = _token.split(/\//);
		var _folder = tokens[0];
		var _subtoken = tokens.length > 0 ? tokens[1] : "";
		jsonData._token = jsonData._token || _token.replace(/\//g, '_');
		jsonData._folder = jsonData._folder || _folder;
		jsonData._subtoken = jsonData._subtoken || _subtoken;

		//source=sysPath.relative("./template",source);
		return this._renderFile(source, jsonData, callback);
	}
};

var Render = function(sourceDir) {
	this.sourceDir = sourceDir;
};
Render.prototype = _proto_;
module.exports = Render;